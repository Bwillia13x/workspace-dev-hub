/**
 * Real-time Collaboration Service
 *
 * Handles real-time collaboration features including presence,
 * cursor tracking, live updates, and conflict resolution.
 */

import { getSupabaseClient } from './supabase';
import { auth } from './auth';
import type {
    UserPresence,
    RealtimeOperation,
    DesignReview,
    ReviewFeedback,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface CollaborationSession {
    designId: string;
    userId: string;
    connectedAt: Date;
    isActive: boolean;
    role: 'editor' | 'viewer';
}

export interface CursorPosition {
    x: number;
    y: number;
    tool?: string;
}

export interface Selection {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export interface CollaborationEvent {
    type:
    | 'user_joined'
    | 'user_left'
    | 'cursor_moved'
    | 'selection_changed'
    | 'design_updated'
    | 'comment_added'
    | 'review_started';
    userId: string;
    payload: unknown;
    timestamp: Date;
}

export type CollaborationEventHandler = (event: CollaborationEvent) => void;

// ============================================================================
// Constants
// ============================================================================

const PRESENCE_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
];

const PRESENCE_UPDATE_INTERVAL = 1000; // 1 second
const PRESENCE_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Real-time Collaboration Service Class
// ============================================================================

class RealtimeCollaborationService {
    private activeSessions: Map<string, CollaborationSession> = new Map();
    private presenceMap: Map<string, Map<string, UserPresence>> = new Map();
    private eventHandlers: Map<string, Set<CollaborationEventHandler>> = new Map();
    private presenceIntervals: Map<string, number> = new Map();
    private assignedColors: Map<string, string> = new Map();
    private colorIndex = 0;
    private channels: Map<string, { unsubscribe: () => void }> = new Map();

    /**
     * Join a design collaboration session
     */
    async joinSession(
        designId: string,
        role: 'editor' | 'viewer' = 'editor'
    ): Promise<{ session: CollaborationSession | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { session: null, error: 'Not authenticated' };
        }

        // Check if already in session
        const sessionKey = `${designId}:${user.id}`;
        if (this.activeSessions.has(sessionKey)) {
            return { session: this.activeSessions.get(sessionKey)!, error: null };
        }

        const client = getSupabaseClient();

        try {
            // Create session
            const session: CollaborationSession = {
                designId,
                userId: user.id,
                connectedAt: new Date(),
                isActive: true,
                role,
            };

            this.activeSessions.set(sessionKey, session);

            // Assign a cursor color
            const color = this.assignColor(user.id);

            // Initialize presence
            const presence: UserPresence = {
                odId: user.id,
                displayName: user.displayName || 'Anonymous',
                avatarUrl: user.avatarUrl,
                color,
                cursor: null,
                selection: null,
                lastSeen: new Date(),
                isActive: true,
            };

            // Add to presence map
            if (!this.presenceMap.has(designId)) {
                this.presenceMap.set(designId, new Map());
            }
            this.presenceMap.get(designId)!.set(user.id, presence);

            // Subscribe to real-time channel
            this.subscribeToChannel(designId);

            // Start presence heartbeat
            this.startPresenceHeartbeat(designId);

            // Notify others
            this.emitEvent(designId, {
                type: 'user_joined',
                userId: user.id,
                payload: { displayName: user.displayName, avatarUrl: user.avatarUrl, color },
                timestamp: new Date(),
            });

            return { session, error: null };
        } catch (error) {
            return {
                session: null,
                error: error instanceof Error ? error.message : 'Failed to join session',
            };
        }
    }

    /**
     * Leave a design collaboration session
     */
    async leaveSession(designId: string): Promise<void> {
        const user = auth.getUser();
        if (!user) return;

        const sessionKey = `${designId}:${user.id}`;
        const session = this.activeSessions.get(sessionKey);

        if (!session) return;

        // Remove from active sessions
        this.activeSessions.delete(sessionKey);

        // Remove from presence map
        const designPresence = this.presenceMap.get(designId);
        if (designPresence) {
            designPresence.delete(user.id);
            if (designPresence.size === 0) {
                this.presenceMap.delete(designId);
            }
        }

        // Stop presence heartbeat
        this.stopPresenceHeartbeat(designId);

        // Unsubscribe from channel if no more sessions for this design
        const hasOtherSessions = Array.from(this.activeSessions.values()).some(
            s => s.designId === designId
        );
        if (!hasOtherSessions) {
            this.unsubscribeFromChannel(designId);
        }

        // Notify others
        this.emitEvent(designId, {
            type: 'user_left',
            userId: user.id,
            payload: { displayName: user.displayName },
            timestamp: new Date(),
        });

        // Release color
        this.releaseColor(user.id);
    }

    /**
     * Update cursor position
     */
    updateCursor(designId: string, position: CursorPosition | null): void {
        const user = auth.getUser();
        if (!user) return;

        const designPresence = this.presenceMap.get(designId);
        if (!designPresence) return;

        const presence = designPresence.get(user.id);
        if (!presence) return;

        presence.cursor = position;
        presence.lastSeen = new Date();

        // Emit to other users
        this.emitEvent(designId, {
            type: 'cursor_moved',
            userId: user.id,
            payload: { cursor: position },
            timestamp: new Date(),
        });
    }

    /**
     * Update selection
     */
    updateSelection(designId: string, selection: Selection | null): void {
        const user = auth.getUser();
        if (!user) return;

        const designPresence = this.presenceMap.get(designId);
        if (!designPresence) return;

        const presence = designPresence.get(user.id);
        if (!presence) return;

        presence.selection = selection;
        presence.lastSeen = new Date();

        // Emit to other users
        this.emitEvent(designId, {
            type: 'selection_changed',
            userId: user.id,
            payload: { selection },
            timestamp: new Date(),
        });
    }

    /**
     * Get all active users in a design
     */
    getActiveUsers(designId: string): UserPresence[] {
        const designPresence = this.presenceMap.get(designId);
        if (!designPresence) return [];

        const now = Date.now();
        return Array.from(designPresence.values()).filter(
            p => p.isActive && now - p.lastSeen.getTime() < PRESENCE_TIMEOUT
        );
    }

    /**
     * Check if user is in session
     */
    isInSession(designId: string): boolean {
        const user = auth.getUser();
        if (!user) return false;

        const sessionKey = `${designId}:${user.id}`;
        return this.activeSessions.has(sessionKey);
    }

    /**
     * Subscribe to collaboration events
     */
    onEvent(designId: string, handler: CollaborationEventHandler): () => void {
        if (!this.eventHandlers.has(designId)) {
            this.eventHandlers.set(designId, new Set());
        }

        this.eventHandlers.get(designId)!.add(handler);

        return () => {
            const handlers = this.eventHandlers.get(designId);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.eventHandlers.delete(designId);
                }
            }
        };
    }

    /**
     * Broadcast design update to collaborators
     */
    broadcastUpdate(designId: string, operation: Partial<RealtimeOperation>): void {
        const user = auth.getUser();
        if (!user) return;

        this.emitEvent(designId, {
            type: 'design_updated',
            userId: user.id,
            payload: {
                ...operation,
                userId: user.id,
                timestamp: new Date(),
            },
            timestamp: new Date(),
        });
    }

    /**
     * Request a design review
     */
    async requestReview(
        designId: string,
        assignedTo: string[],
        notes?: string,
        dueDate?: Date
    ): Promise<{ review: DesignReview | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { review: null, error: 'Not authenticated' };
        }

        const review: DesignReview = {
            id: `review_${Date.now()}`,
            designId,
            requestedBy: user.id,
            assignedTo,
            status: 'pending',
            dueDate: dueDate || null,
            notes: notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
        };

        // In production, this would persist to design_reviews table
        this.emitEvent(designId, {
            type: 'review_started',
            userId: user.id,
            payload: { reviewId: review.id, assignedTo },
            timestamp: new Date(),
        });

        return { review, error: null };
    }

    /**
     * Submit review feedback
     */
    async submitReviewFeedback(
        reviewId: string,
        decision: 'approve' | 'reject' | 'request_changes',
        feedback?: string
    ): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // In production, this would persist to review_feedback table
        const reviewFeedback: ReviewFeedback = {
            id: `feedback_${Date.now()}`,
            reviewId,
            userId: user.id,
            decision,
            feedback: feedback || null,
            createdAt: new Date(),
        };

        return { success: true, error: null };
    }

    /**
     * Get active sessions for current user
     */
    getActiveSessions(): CollaborationSession[] {
        const user = auth.getUser();
        if (!user) return [];

        return Array.from(this.activeSessions.values()).filter(s => s.userId === user.id);
    }

    /**
     * Disconnect from all sessions
     */
    async disconnectAll(): Promise<void> {
        const sessions = this.getActiveSessions();

        for (const session of sessions) {
            await this.leaveSession(session.designId);
        }
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Subscribe to real-time channel for design
     */
    private subscribeToChannel(designId: string): void {
        if (this.channels.has(designId)) return;

        const client = getSupabaseClient();

        // Subscribe to the channel
        const channel = client
            .channel(`design:${designId}`)
            .on('broadcast', { event: 'presence' }, (payload: unknown) => {
                this.handlePresenceUpdate(designId, payload);
            })
            .on('broadcast', { event: 'cursor' }, (payload: unknown) => {
                this.handleCursorUpdate(designId, payload);
            });

        // Subscribe and store for cleanup
        const subscription = channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Realtime] Subscribed to design:${designId}`);
            }
        });

        this.channels.set(designId, subscription);
    }

    /**
     * Unsubscribe from real-time channel
     */
    private unsubscribeFromChannel(designId: string): void {
        const channel = this.channels.get(designId);
        if (channel) {
            channel.unsubscribe();
            this.channels.delete(designId);
            console.log(`[Realtime] Unsubscribed from design:${designId}`);
        }
    }

    /**
     * Handle presence update from channel
     */
    private handlePresenceUpdate(designId: string, payload: unknown): void {
        const data = payload as { userId: string; presence: Partial<UserPresence> };
        const designPresence = this.presenceMap.get(designId);

        if (designPresence && data.userId && data.presence) {
            const existing = designPresence.get(data.userId);
            if (existing) {
                Object.assign(existing, data.presence, { lastSeen: new Date() });
            }
        }
    }

    /**
     * Handle cursor update from channel
     */
    private handleCursorUpdate(designId: string, payload: unknown): void {
        const data = payload as { userId: string; cursor: CursorPosition | null };
        const designPresence = this.presenceMap.get(designId);
        const user = auth.getUser();

        if (designPresence && data.userId && data.userId !== user?.id) {
            const presence = designPresence.get(data.userId);
            if (presence) {
                presence.cursor = data.cursor;
                presence.lastSeen = new Date();

                // Notify local handlers
                this.emitEvent(designId, {
                    type: 'cursor_moved',
                    userId: data.userId,
                    payload: { cursor: data.cursor },
                    timestamp: new Date(),
                });
            }
        }
    }

    /**
     * Handle design update from channel
     */
    private handleDesignUpdate(designId: string, payload: unknown): void {
        const data = payload as { userId: string; operation: RealtimeOperation };
        const user = auth.getUser();

        if (data.userId && data.userId !== user?.id) {
            this.emitEvent(designId, {
                type: 'design_updated',
                userId: data.userId,
                payload: data.operation,
                timestamp: new Date(),
            });
        }
    }

    /**
     * Start presence heartbeat
     */
    private startPresenceHeartbeat(designId: string): void {
        if (this.presenceIntervals.has(designId)) return;

        const intervalId = window.setInterval(() => {
            this.sendPresenceHeartbeat(designId);
        }, PRESENCE_UPDATE_INTERVAL);

        this.presenceIntervals.set(designId, intervalId);
    }

    /**
     * Stop presence heartbeat
     */
    private stopPresenceHeartbeat(designId: string): void {
        const intervalId = this.presenceIntervals.get(designId);
        if (intervalId) {
            window.clearInterval(intervalId);
            this.presenceIntervals.delete(designId);
        }
    }

    /**
     * Send presence heartbeat
     */
    private sendPresenceHeartbeat(designId: string): void {
        const user = auth.getUser();
        if (!user) return;

        const designPresence = this.presenceMap.get(designId);
        if (!designPresence) return;

        const presence = designPresence.get(user.id);
        if (presence) {
            presence.lastSeen = new Date();
        }

        // Clean up stale presences
        const now = Date.now();
        for (const [userId, p] of designPresence) {
            if (now - p.lastSeen.getTime() > PRESENCE_TIMEOUT) {
                designPresence.delete(userId);
                this.emitEvent(designId, {
                    type: 'user_left',
                    userId,
                    payload: { reason: 'timeout' },
                    timestamp: new Date(),
                });
            }
        }
    }

    /**
     * Emit event to local handlers
     */
    private emitEvent(designId: string, event: CollaborationEvent): void {
        const handlers = this.eventHandlers.get(designId);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    console.error('[Realtime] Event handler error:', error);
                }
            });
        }
    }

    /**
     * Assign a cursor color to user
     */
    private assignColor(userId: string): string {
        if (this.assignedColors.has(userId)) {
            return this.assignedColors.get(userId)!;
        }

        const color = PRESENCE_COLORS[this.colorIndex % PRESENCE_COLORS.length];
        this.colorIndex++;
        this.assignedColors.set(userId, color);

        return color;
    }

    /**
     * Release a user's assigned color
     */
    private releaseColor(userId: string): void {
        this.assignedColors.delete(userId);
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const realtimeCollaborationService = new RealtimeCollaborationService();

// ============================================================================
// Convenience Functions
// ============================================================================

export const realtime = {
    join: (designId: string, role?: 'editor' | 'viewer') =>
        realtimeCollaborationService.joinSession(designId, role),
    leave: (designId: string) => realtimeCollaborationService.leaveSession(designId),
    updateCursor: (designId: string, position: CursorPosition | null) =>
        realtimeCollaborationService.updateCursor(designId, position),
    updateSelection: (designId: string, selection: Selection | null) =>
        realtimeCollaborationService.updateSelection(designId, selection),
    getActiveUsers: (designId: string) => realtimeCollaborationService.getActiveUsers(designId),
    isInSession: (designId: string) => realtimeCollaborationService.isInSession(designId),
    onEvent: (designId: string, handler: CollaborationEventHandler) =>
        realtimeCollaborationService.onEvent(designId, handler),
    broadcastUpdate: (designId: string, operation: Partial<RealtimeOperation>) =>
        realtimeCollaborationService.broadcastUpdate(designId, operation),
    requestReview: (
        designId: string,
        assignedTo: string[],
        notes?: string,
        dueDate?: Date
    ) => realtimeCollaborationService.requestReview(designId, assignedTo, notes, dueDate),
    submitFeedback: (
        reviewId: string,
        decision: 'approve' | 'reject' | 'request_changes',
        feedback?: string
    ) => realtimeCollaborationService.submitReviewFeedback(reviewId, decision, feedback),
    getActiveSessions: () => realtimeCollaborationService.getActiveSessions(),
    disconnectAll: () => realtimeCollaborationService.disconnectAll(),
};

export default realtime;

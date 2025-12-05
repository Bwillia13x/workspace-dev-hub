/**
 * Cloud Platform React Hooks
 *
 * Provides React hooks for authentication, designs, teams,
 * real-time collaboration, and assets.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, AuthState, AuthError, AuthEventType } from './auth';
import { designStorage, CreateDesignRequest, UpdateDesignRequest } from './design-storage';
import { teams, CreateTeamRequest, TeamPermissions } from './teams';
import { realtime, CollaborationEvent, CursorPosition, Selection } from './realtime';
import { assets, CreateAssetRequest } from './assets';
import { userProfile, UserSettings, UserStats } from './user-profile';
import type {
    UserProfile,
    AuthSession,
    CloudDesign,
    Team,
    TeamMember,
    Asset,
    UserPresence,
    SubscriptionTier,
    DesignFilters,
    AssetFilters,
} from './types';

// ============================================================================
// useAuth Hook
// ============================================================================

export interface UseAuthReturn {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserProfile | null;
    session: AuthSession | null;
    error: string | null;
    signUp: (email: string, password: string, displayName?: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        session: null,
        error: null,
    });

    useEffect(() => {
        // Initialize auth
        auth.initialize().then(initialState => {
            setState(initialState);
        });

        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChange((event, session) => {
            setState(prev => ({
                ...prev,
                isAuthenticated: !!session,
                user: session?.user || null,
                session,
                isLoading: false,
            }));
        });

        return unsubscribe;
    }, []);

    const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const { user, error } = await auth.signUp({ email, password, displayName });
        setState(prev => ({
            ...prev,
            isLoading: false,
            error: error || null,
            user,
            isAuthenticated: !!user,
        }));
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const { user, error } = await auth.signIn({ email, password });
        setState(prev => ({
            ...prev,
            isLoading: false,
            error: error || null,
        }));
    }, []);

    const signInWithGoogle = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const { error } = await auth.signInWithOAuth({ provider: 'google' });
        if (error) {
            setState(prev => ({ ...prev, isLoading: false, error }));
        }
    }, []);

    const signInWithGitHub = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const { error } = await auth.signInWithOAuth({ provider: 'github' });
        if (error) {
            setState(prev => ({ ...prev, isLoading: false, error }));
        }
    }, []);

    const signOut = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        await auth.signOut();
        setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            session: null,
            error: null,
        });
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const { error } = await auth.resetPassword(email);
        setState(prev => ({
            ...prev,
            isLoading: false,
            error: error || null,
        }));
    }, []);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const { user, error } = await auth.updateProfile(updates);
        setState(prev => ({
            ...prev,
            isLoading: false,
            user: user || prev.user,
            error: error || null,
        }));
    }, []);

    return {
        ...state,
        error: state.error?.toString() || null,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithGitHub,
        signOut,
        resetPassword,
        updateProfile,
    };
}

// ============================================================================
// useDesigns Hook
// ============================================================================

export interface UseDesignsReturn {
    designs: CloudDesign[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    totalCount: number;
    create: (request: CreateDesignRequest) => Promise<CloudDesign | null>;
    update: (designId: string, updates: UpdateDesignRequest) => Promise<CloudDesign | null>;
    delete: (designId: string) => Promise<boolean>;
    duplicate: (designId: string, newName?: string) => Promise<CloudDesign | null>;
    like: (designId: string) => Promise<boolean>;
    unlike: (designId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
}

export function useDesigns(filters?: DesignFilters): UseDesignsReturn {
    const [designs, setDesigns] = useState<CloudDesign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const loadDesigns = useCallback(
        async (pageNum: number, append = false) => {
            setIsLoading(true);
            setError(null);

            const result = await designStorage.getMyDesigns(filters, pageNum, 20);

            if (append) {
                setDesigns(prev => [...prev, ...result.data]);
            } else {
                setDesigns(result.data);
            }

            setTotalCount(result.total);
            setHasMore(result.hasMore);
            setIsLoading(false);
        },
        [filters]
    );

    useEffect(() => {
        loadDesigns(1);
    }, [loadDesigns]);

    const refresh = useCallback(async () => {
        setPage(1);
        await loadDesigns(1);
    }, [loadDesigns]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        await loadDesigns(nextPage, true);
    }, [hasMore, isLoading, page, loadDesigns]);

    const create = useCallback(async (request: CreateDesignRequest) => {
        const { design, error } = await designStorage.create(request);
        if (error) {
            setError(error);
            return null;
        }
        if (design) {
            setDesigns(prev => [design, ...prev]);
        }
        return design;
    }, []);

    const update = useCallback(async (designId: string, updates: UpdateDesignRequest) => {
        const { design, error } = await designStorage.update(designId, updates);
        if (error) {
            setError(error);
            return null;
        }
        if (design) {
            setDesigns(prev => prev.map(d => (d.id === designId ? design : d)));
        }
        return design;
    }, []);

    const deleteDesign = useCallback(async (designId: string) => {
        const { success, error } = await designStorage.delete(designId);
        if (error) {
            setError(error);
            return false;
        }
        if (success) {
            setDesigns(prev => prev.filter(d => d.id !== designId));
        }
        return success;
    }, []);

    const duplicate = useCallback(async (designId: string, newName?: string) => {
        const { design, error } = await designStorage.duplicate(designId, newName);
        if (error) {
            setError(error);
            return null;
        }
        if (design) {
            setDesigns(prev => [design, ...prev]);
        }
        return design;
    }, []);

    const like = useCallback(async (designId: string) => {
        const { success, error } = await designStorage.like(designId);
        if (error) {
            setError(error);
            return false;
        }
        if (success) {
            setDesigns(prev =>
                prev.map(d => (d.id === designId ? { ...d, likesCount: d.likesCount + 1 } : d))
            );
        }
        return success;
    }, []);

    const unlike = useCallback(async (designId: string) => {
        const { success, error } = await designStorage.unlike(designId);
        if (error) {
            setError(error);
            return false;
        }
        if (success) {
            setDesigns(prev =>
                prev.map(d =>
                    d.id === designId ? { ...d, likesCount: Math.max(0, d.likesCount - 1) } : d
                )
            );
        }
        return success;
    }, []);

    return {
        designs,
        isLoading,
        error,
        hasMore,
        totalCount,
        create,
        update,
        delete: deleteDesign,
        duplicate,
        like,
        unlike,
        refresh,
        loadMore,
    };
}

// ============================================================================
// useDesign Hook (single design)
// ============================================================================

export interface UseDesignReturn {
    design: CloudDesign | null;
    isLoading: boolean;
    error: string | null;
    update: (updates: UpdateDesignRequest) => Promise<CloudDesign | null>;
    refresh: () => Promise<void>;
}

export function useDesign(designId: string | null): UseDesignReturn {
    const [design, setDesign] = useState<CloudDesign | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDesign = useCallback(async () => {
        if (!designId) {
            setDesign(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await designStorage.get(designId);

        if (result) {
            setDesign(result);
            // Record view
            designStorage.recordView(designId);
        } else {
            setError('Design not found');
        }

        setIsLoading(false);
    }, [designId]);

    useEffect(() => {
        loadDesign();
    }, [loadDesign]);

    const update = useCallback(
        async (updates: UpdateDesignRequest) => {
            if (!designId) return null;

            const { design: updated, error } = await designStorage.update(designId, updates);
            if (error) {
                setError(error);
                return null;
            }
            if (updated) {
                setDesign(updated);
            }
            return updated;
        },
        [designId]
    );

    return {
        design,
        isLoading,
        error,
        update,
        refresh: loadDesign,
    };
}

// ============================================================================
// useTeam Hook
// ============================================================================

export interface UseTeamReturn {
    team: Team | null;
    members: TeamMember[];
    permissions: TeamPermissions;
    isLoading: boolean;
    error: string | null;
    update: (updates: { name?: string; description?: string }) => Promise<boolean>;
    invite: (email: string, role: 'admin' | 'designer' | 'viewer') => Promise<boolean>;
    removeMember: (userId: string) => Promise<boolean>;
    updateRole: (userId: string, role: 'admin' | 'designer' | 'viewer') => Promise<boolean>;
    leave: () => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useTeam(teamId: string | null): UseTeamReturn {
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [permissions, setPermissions] = useState<TeamPermissions>({
        canViewTeam: false,
        canEditTeam: false,
        canDeleteTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canManageRoles: false,
        canViewDesigns: false,
        canEditDesigns: false,
        canDeleteDesigns: false,
        canManageAssets: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTeam = useCallback(async () => {
        if (!teamId) {
            setTeam(null);
            setMembers([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const [teamData, membersData, perms] = await Promise.all([
            teams.get(teamId),
            teams.getMembers(teamId),
            teams.getPermissions(teamId),
        ]);

        setTeam(teamData);
        setMembers(membersData);
        setPermissions(perms);
        setIsLoading(false);
    }, [teamId]);

    useEffect(() => {
        loadTeam();
    }, [loadTeam]);

    const update = useCallback(
        async (updates: { name?: string; description?: string }) => {
            if (!teamId) return false;
            const { team: updated, error } = await teams.update(teamId, updates);
            if (error) {
                setError(error);
                return false;
            }
            if (updated) {
                setTeam(updated);
            }
            return true;
        },
        [teamId]
    );

    const invite = useCallback(
        async (email: string, role: 'admin' | 'designer' | 'viewer') => {
            if (!teamId) return false;
            const { error } = await teams.invite(teamId, { email, role });
            if (error) {
                setError(error);
                return false;
            }
            return true;
        },
        [teamId]
    );

    const removeMember = useCallback(
        async (userId: string) => {
            if (!teamId) return false;
            const { success, error } = await teams.removeMember(teamId, userId);
            if (error) {
                setError(error);
                return false;
            }
            if (success) {
                setMembers(prev => prev.filter(m => m.userId !== userId));
            }
            return success;
        },
        [teamId]
    );

    const updateRole = useCallback(
        async (userId: string, role: 'admin' | 'designer' | 'viewer') => {
            if (!teamId) return false;
            const { success, error } = await teams.updateRole(teamId, userId, role);
            if (error) {
                setError(error);
                return false;
            }
            if (success) {
                setMembers(prev => prev.map(m => (m.userId === userId ? { ...m, role } : m)));
            }
            return success;
        },
        [teamId]
    );

    const leave = useCallback(async () => {
        if (!teamId) return false;
        const user = auth.getUser();
        if (!user) return false;
        const { success, error } = await teams.removeMember(teamId, user.id);
        if (error) {
            setError(error);
            return false;
        }
        return success;
    }, [teamId]);

    return {
        team,
        members,
        permissions,
        isLoading,
        error,
        update,
        invite,
        removeMember,
        updateRole,
        leave,
        refresh: loadTeam,
    };
}

// ============================================================================
// useMyTeams Hook
// ============================================================================

export interface UseMyTeamsReturn {
    teams: Team[];
    isLoading: boolean;
    error: string | null;
    create: (name: string, description?: string) => Promise<Team | null>;
    refresh: () => Promise<void>;
}

export function useMyTeams(): UseMyTeamsReturn {
    const [teamList, setTeamList] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTeams = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const result = await teams.getMyTeams();
        setTeamList(result);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const create = useCallback(async (name: string, description?: string) => {
        const { team, error } = await teams.create({ name, description });
        if (error) {
            setError(error);
            return null;
        }
        if (team) {
            setTeamList(prev => [...prev, team]);
        }
        return team;
    }, []);

    return {
        teams: teamList,
        isLoading,
        error,
        create,
        refresh: loadTeams,
    };
}

// ============================================================================
// useRealtime Hook
// ============================================================================

export interface UseRealtimeReturn {
    isConnected: boolean;
    activeUsers: UserPresence[];
    updateCursor: (position: CursorPosition | null) => void;
    updateSelection: (selection: Selection | null) => void;
    onEvent: (handler: (event: CollaborationEvent) => void) => () => void;
}

export function useRealtime(designId: string | null): UseRealtimeReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
    const eventHandlersRef = useRef<Set<(event: CollaborationEvent) => void>>(new Set());

    useEffect(() => {
        if (!designId) {
            setIsConnected(false);
            setActiveUsers([]);
            return;
        }

        // Join session
        realtime.join(designId).then(({ session, error }) => {
            if (session && !error) {
                setIsConnected(true);
                setActiveUsers(realtime.getActiveUsers(designId));
            }
        });

        // Subscribe to events
        const unsubscribe = realtime.onEvent(designId, event => {
            // Update active users on join/leave
            if (event.type === 'user_joined' || event.type === 'user_left') {
                setActiveUsers(realtime.getActiveUsers(designId));
            }

            // Notify registered handlers
            eventHandlersRef.current.forEach(handler => handler(event));
        });

        // Cleanup
        return () => {
            unsubscribe();
            realtime.leave(designId);
            setIsConnected(false);
        };
    }, [designId]);

    const updateCursor = useCallback(
        (position: CursorPosition | null) => {
            if (designId) {
                realtime.updateCursor(designId, position);
            }
        },
        [designId]
    );

    const updateSelection = useCallback(
        (selection: Selection | null) => {
            if (designId) {
                realtime.updateSelection(designId, selection);
            }
        },
        [designId]
    );

    const onEvent = useCallback((handler: (event: CollaborationEvent) => void) => {
        eventHandlersRef.current.add(handler);
        return () => {
            eventHandlersRef.current.delete(handler);
        };
    }, []);

    return {
        isConnected,
        activeUsers,
        updateCursor,
        updateSelection,
        onEvent,
    };
}

// ============================================================================
// useAssets Hook
// ============================================================================

export interface UseAssetsReturn {
    assets: Asset[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    upload: (request: CreateAssetRequest) => Promise<Asset | null>;
    delete: (assetId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
}

export function useAssets(filters?: AssetFilters): UseAssetsReturn {
    const [assetList, setAssetList] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadAssets = useCallback(
        async (pageNum: number, append = false) => {
            setIsLoading(true);
            setError(null);

            const result = await assets.getMyAssets(filters, pageNum, 20);

            if (append) {
                setAssetList(prev => [...prev, ...result.data]);
            } else {
                setAssetList(result.data);
            }

            setHasMore(result.hasMore);
            setIsLoading(false);
        },
        [filters]
    );

    useEffect(() => {
        loadAssets(1);
    }, [loadAssets]);

    const refresh = useCallback(async () => {
        setPage(1);
        await loadAssets(1);
    }, [loadAssets]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        await loadAssets(nextPage, true);
    }, [hasMore, isLoading, page, loadAssets]);

    const upload = useCallback(async (request: CreateAssetRequest) => {
        const { asset, error } = await assets.create(request);
        if (error) {
            setError(error);
            return null;
        }
        if (asset) {
            setAssetList(prev => [asset, ...prev]);
        }
        return asset;
    }, []);

    const deleteAsset = useCallback(async (assetId: string) => {
        const { success, error } = await assets.delete(assetId);
        if (error) {
            setError(error);
            return false;
        }
        if (success) {
            setAssetList(prev => prev.filter(a => a.id !== assetId));
        }
        return success;
    }, []);

    return {
        assets: assetList,
        isLoading,
        error,
        hasMore,
        upload,
        delete: deleteAsset,
        refresh,
        loadMore,
    };
}

// ============================================================================
// useUserProfile Hook
// ============================================================================

export interface UseUserProfileReturn {
    profile: UserProfile | null;
    settings: UserSettings | null;
    stats: UserStats | null;
    isLoading: boolean;
    error: string | null;
    updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
    updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useUserProfile(userId?: string): UseUserProfileReturn {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const [profileData, settingsData, statsData] = await Promise.all([
            userId ? userProfile.get(userId) : userProfile.getCurrent(),
            userProfile.getSettings(userId),
            userProfile.getStats(userId),
        ]);

        setProfile(profileData);
        setSettings(settingsData);
        setStats(statsData);
        setIsLoading(false);
    }, [userId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        const { success, error } = await userProfile.update(updates);
        if (error) {
            setError(error);
            return false;
        }
        if (success) {
            setProfile(prev => (prev ? { ...prev, ...updates } : null));
        }
        return success;
    }, []);

    const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
        const { success, error } = await userProfile.updateSettings(updates);
        if (error) {
            setError(error);
            return false;
        }
        if (success) {
            setSettings(prev => (prev ? { ...prev, ...updates } : null));
        }
        return success;
    }, []);

    return {
        profile,
        settings,
        stats,
        isLoading,
        error,
        updateProfile,
        updateSettings,
        refresh: loadProfile,
    };
}

// ============================================================================
// useCredits Hook
// ============================================================================

export interface UseCreditsReturn {
    remaining: number;
    monthly: number;
    isLoading: boolean;
    useCredits: (amount: number, description: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
    const [remaining, setRemaining] = useState(0);
    const [monthly, setMonthly] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const loadCredits = useCallback(async () => {
        setIsLoading(true);
        const credits = await userProfile.getCredits();
        setRemaining(credits);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadCredits();

        // Also get monthly from user profile
        userProfile.getCurrent().then(profile => {
            if (profile) {
                setRemaining(profile.creditsRemaining);
                setMonthly(profile.creditsMonthly);
            }
        });
    }, [loadCredits]);

    const useCreditsAction = useCallback(async (amount: number, description: string) => {
        const { success, remaining: newRemaining, error } = await userProfile.useCredits(
            amount,
            description
        );
        if (success) {
            setRemaining(newRemaining);
        }
        return success;
    }, []);

    return {
        remaining,
        monthly,
        isLoading,
        useCredits: useCreditsAction,
        refresh: loadCredits,
    };
}

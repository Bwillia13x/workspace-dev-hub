/**
 * Authentication Service
 *
 * Handles user authentication including sign up, sign in, OAuth,
 * password reset, and session management.
 */

import { getSupabaseClient } from './supabase';
import type {
    AuthSession,
    UserProfile,
    SignUpRequest,
    SignInRequest,
    OAuthOptions,
    AuthProvider,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserProfile | null;
    session: AuthSession | null;
    error: AuthError | null;
}

export interface AuthError {
    code: string;
    message: string;
}

export type AuthEventType =
    | 'SIGNED_IN'
    | 'SIGNED_OUT'
    | 'TOKEN_REFRESHED'
    | 'USER_UPDATED'
    | 'PASSWORD_RECOVERY';

export type AuthEventListener = (event: AuthEventType, session: AuthSession | null) => void;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_AVATAR_URL = 'https://ui-avatars.com/api/?background=6366f1&color=fff&name=';

const SUBSCRIPTION_DEFAULTS = {
    free: { credits: 50, storage: 1 },
    pro: { credits: 500, storage: 50 },
    enterprise: { credits: 5000, storage: 500 },
} as const;

// ============================================================================
// Auth Service Class
// ============================================================================

class AuthService {
    private listeners: Set<AuthEventListener> = new Set();
    private currentSession: AuthSession | null = null;
    private currentUser: UserProfile | null = null;
    private initialized = false;

    /**
     * Initialize the auth service and restore session
     */
    async initialize(): Promise<AuthState> {
        if (this.initialized) {
            return this.getState();
        }

        const client = getSupabaseClient();

        try {
            // Get current session
            const { data: sessionData, error: sessionError } = await client.auth.getSession();

            if (sessionError) {
                console.error('[Auth] Session error:', sessionError);
                this.initialized = true;
                return this.getState();
            }

            if (sessionData.session) {
                // Load user profile
                const profile = await this.loadUserProfile(sessionData.session.user.id);

                this.currentSession = {
                    user: profile!,
                    accessToken: sessionData.session.access_token,
                    refreshToken: sessionData.session.refresh_token,
                    expiresAt: new Date(sessionData.session.expires_at! * 1000),
                    provider: 'email',
                };
                this.currentUser = profile;
            }

            // Listen for auth state changes
            client.auth.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event as AuthEventType, session);
            });

            this.initialized = true;
            return this.getState();
        } catch (error) {
            console.error('[Auth] Initialize error:', error);
            this.initialized = true;
            return this.getState();
        }
    }

    /**
     * Get current auth state
     */
    getState(): AuthState {
        return {
            isAuthenticated: !!this.currentSession,
            isLoading: !this.initialized,
            user: this.currentUser,
            session: this.currentSession,
            error: null,
        };
    }

    /**
     * Sign up with email and password
     */
    async signUp(request: SignUpRequest): Promise<{ user: UserProfile | null; error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { data, error } = await client.auth.signUp({
                email: request.email,
                password: request.password,
            });

            if (error) {
                return {
                    user: null,
                    error: { code: 'SIGNUP_ERROR', message: error.message },
                };
            }

            if (!data.user) {
                return {
                    user: null,
                    error: { code: 'SIGNUP_ERROR', message: 'Failed to create user' },
                };
            }

            // Create user profile
            const profile = await this.createUserProfile(data.user.id, request.email, request.displayName);

            return { user: profile, error: null };
        } catch (error) {
            return {
                user: null,
                error: {
                    code: 'SIGNUP_ERROR',
                    message: error instanceof Error ? error.message : 'Sign up failed',
                },
            };
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(request: SignInRequest): Promise<{ user: UserProfile | null; error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email: request.email,
                password: request.password,
            });

            if (error) {
                return {
                    user: null,
                    error: { code: 'SIGNIN_ERROR', message: error.message },
                };
            }

            if (!data.user || !data.session) {
                return {
                    user: null,
                    error: { code: 'SIGNIN_ERROR', message: 'Invalid credentials' },
                };
            }

            // Load user profile
            let profile = await this.loadUserProfile(data.user.id);

            // Create profile if it doesn't exist
            if (!profile) {
                profile = await this.createUserProfile(data.user.id, data.user.email!);
            }

            this.currentUser = profile;
            this.currentSession = {
                user: profile,
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: new Date(data.session.expires_at! * 1000),
                provider: 'email',
            };

            this.notifyListeners('SIGNED_IN', this.currentSession);
            return { user: profile, error: null };
        } catch (error) {
            return {
                user: null,
                error: {
                    code: 'SIGNIN_ERROR',
                    message: error instanceof Error ? error.message : 'Sign in failed',
                },
            };
        }
    }

    /**
     * Sign in with OAuth provider
     */
    async signInWithOAuth(
        options: OAuthOptions
    ): Promise<{ error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { error } = await client.auth.signInWithOAuth({
                provider: options.provider,
                options: {
                    redirectTo: options.redirectTo || window.location.origin,
                    scopes: options.scopes?.join(' '),
                },
            });

            if (error) {
                return {
                    error: { code: 'OAUTH_ERROR', message: error.message },
                };
            }

            return { error: null };
        } catch (error) {
            return {
                error: {
                    code: 'OAUTH_ERROR',
                    message: error instanceof Error ? error.message : 'OAuth sign in failed',
                },
            };
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<{ error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { error } = await client.auth.signOut();

            if (error) {
                return {
                    error: { code: 'SIGNOUT_ERROR', message: error.message },
                };
            }

            this.currentSession = null;
            this.currentUser = null;
            this.notifyListeners('SIGNED_OUT', null);

            return { error: null };
        } catch (error) {
            return {
                error: {
                    code: 'SIGNOUT_ERROR',
                    message: error instanceof Error ? error.message : 'Sign out failed',
                },
            };
        }
    }

    /**
     * Send password reset email
     */
    async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { error } = await client.auth.resetPasswordForEmail(email);

            if (error) {
                return {
                    error: { code: 'RESET_ERROR', message: error.message },
                };
            }

            return { error: null };
        } catch (error) {
            return {
                error: {
                    code: 'RESET_ERROR',
                    message: error instanceof Error ? error.message : 'Password reset failed',
                },
            };
        }
    }

    /**
     * Update password
     */
    async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { error } = await client.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                return {
                    error: { code: 'UPDATE_ERROR', message: error.message },
                };
            }

            return { error: null };
        } catch (error) {
            return {
                error: {
                    code: 'UPDATE_ERROR',
                    message: error instanceof Error ? error.message : 'Password update failed',
                },
            };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(
        updates: Partial<UserProfile>
    ): Promise<{ user: UserProfile | null; error: AuthError | null }> {
        if (!this.currentUser) {
            return {
                user: null,
                error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' },
            };
        }

        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('users')
                .update({
                    display_name: updates.displayName,
                    avatar_url: updates.avatarUrl,
                    bio: updates.bio,
                    website: updates.website,
                    social_links: updates.socialLinks,
                    interests: updates.interests,
                    skill_level: updates.skillLevel,
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) {
                return {
                    user: null,
                    error: { code: 'UPDATE_ERROR', message: error.message },
                };
            }

            const updatedProfile = this.mapUserRow(data);
            this.currentUser = updatedProfile;

            if (this.currentSession) {
                this.currentSession = { ...this.currentSession, user: updatedProfile };
                this.notifyListeners('USER_UPDATED', this.currentSession);
            }

            return { user: updatedProfile, error: null };
        } catch (error) {
            return {
                user: null,
                error: {
                    code: 'UPDATE_ERROR',
                    message: error instanceof Error ? error.message : 'Profile update failed',
                },
            };
        }
    }

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(listener: AuthEventListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get current user
     */
    getCurrentUser(): UserProfile | null {
        return this.currentUser;
    }

    /**
     * Get current session
     */
    getSession(): AuthSession | null {
        return this.currentSession;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.currentSession;
    }

    /**
     * Refresh the session token
     */
    async refreshSession(): Promise<{ error: AuthError | null }> {
        const client = getSupabaseClient();

        try {
            const { data, error } = await client.auth.getSession();

            if (error || !data.session) {
                this.currentSession = null;
                this.currentUser = null;
                return {
                    error: { code: 'REFRESH_ERROR', message: error?.message || 'Session expired' },
                };
            }

            if (this.currentUser) {
                this.currentSession = {
                    user: this.currentUser,
                    accessToken: data.session.access_token,
                    refreshToken: data.session.refresh_token,
                    expiresAt: new Date(data.session.expires_at! * 1000),
                    provider: this.currentSession?.provider || 'email',
                };
                this.notifyListeners('TOKEN_REFRESHED', this.currentSession);
            }

            return { error: null };
        } catch (error) {
            return {
                error: {
                    code: 'REFRESH_ERROR',
                    message: error instanceof Error ? error.message : 'Session refresh failed',
                },
            };
        }
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Handle auth state changes from Supabase
     */
    private handleAuthStateChange(event: AuthEventType, session: any): void {
        if (event === 'SIGNED_OUT') {
            this.currentSession = null;
            this.currentUser = null;
            this.notifyListeners('SIGNED_OUT', null);
        } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            // Reload user profile
            this.loadUserProfile(session.user.id).then(profile => {
                if (profile) {
                    this.currentUser = profile;
                    this.currentSession = {
                        user: profile,
                        accessToken: session.access_token,
                        refreshToken: session.refresh_token,
                        expiresAt: new Date(session.expires_at * 1000),
                        provider: session.user.app_metadata?.provider || 'email',
                    };
                    this.notifyListeners(event, this.currentSession);
                }
            });
        }
    }

    /**
     * Notify all listeners of auth state change
     */
    private notifyListeners(event: AuthEventType, session: AuthSession | null): void {
        this.listeners.forEach(listener => listener(event, session));
    }

    /**
     * Load user profile from database
     */
    private async loadUserProfile(userId: string): Promise<UserProfile | null> {
        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !data) {
                return null;
            }

            return this.mapUserRow(data);
        } catch {
            return null;
        }
    }

    /**
     * Create user profile in database
     */
    private async createUserProfile(
        userId: string,
        email: string,
        displayName?: string
    ): Promise<UserProfile> {
        const client = getSupabaseClient();

        const defaultName = displayName || email.split('@')[0];
        const avatarUrl = `${DEFAULT_AVATAR_URL}${encodeURIComponent(defaultName)}`;

        const userData = {
            id: userId,
            email,
            display_name: defaultName,
            avatar_url: avatarUrl,
            bio: null,
            website: null,
            social_links: {},
            subscription_tier: 'free' as const,
            credits_remaining: SUBSCRIPTION_DEFAULTS.free.credits,
            credits_monthly: SUBSCRIPTION_DEFAULTS.free.credits,
            is_verified: false,
            skill_level: 'beginner',
            interests: [],
            onboarding_completed: false,
        };

        const { data, error } = await client.from('users').insert(userData).select().single();

        if (error) {
            console.error('[Auth] Create profile error:', error);
            // Return a default profile on error
            return {
                id: userId,
                email,
                displayName: defaultName,
                avatarUrl,
                bio: null,
                website: null,
                socialLinks: {},
                subscriptionTier: 'free',
                creditsRemaining: SUBSCRIPTION_DEFAULTS.free.credits,
                creditsMonthly: SUBSCRIPTION_DEFAULTS.free.credits,
                isVerified: false,
                skillLevel: 'beginner',
                interests: [],
                onboardingCompleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        return this.mapUserRow(data);
    }

    /**
     * Map database row to UserProfile
     */
    private mapUserRow(row: any): UserProfile {
        return {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            bio: row.bio,
            website: row.website,
            socialLinks: row.social_links || {},
            subscriptionTier: row.subscription_tier,
            creditsRemaining: row.credits_remaining,
            creditsMonthly: row.credits_monthly,
            isVerified: row.is_verified,
            skillLevel: row.skill_level || 'beginner',
            interests: row.interests || [],
            onboardingCompleted: row.onboarding_completed,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const authService = new AuthService();

// ============================================================================
// Convenience Functions
// ============================================================================

export const auth = {
    initialize: () => authService.initialize(),
    signUp: (request: SignUpRequest) => authService.signUp(request),
    signIn: (request: SignInRequest) => authService.signIn(request),
    signInWithOAuth: (options: OAuthOptions) => authService.signInWithOAuth(options),
    signOut: () => authService.signOut(),
    resetPassword: (email: string) => authService.resetPassword(email),
    updatePassword: (password: string) => authService.updatePassword(password),
    updateProfile: (updates: Partial<UserProfile>) => authService.updateProfile(updates),
    getUser: () => authService.getCurrentUser(),
    getSession: () => authService.getSession(),
    isAuthenticated: () => authService.isAuthenticated(),
    refreshSession: () => authService.refreshSession(),
    onAuthStateChange: (listener: AuthEventListener) => authService.onAuthStateChange(listener),
};

export default auth;

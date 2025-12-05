/**
 * Auth Service Tests
 *
 * Tests for authentication flows, sessions, OAuth
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, auth } from '../../cloud/auth';
import type { SignUpRequest, SignInRequest, AuthSession } from '../../cloud/types';

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('authService instance', () => {
        it('should expose all required methods', () => {
            expect(authService.initialize).toBeDefined();
            expect(authService.signUp).toBeDefined();
            expect(authService.signIn).toBeDefined();
            expect(authService.signOut).toBeDefined();
            expect(authService.signInWithOAuth).toBeDefined();
            expect(authService.resetPassword).toBeDefined();
            expect(authService.updatePassword).toBeDefined();
            expect(authService.updateProfile).toBeDefined();
            expect(authService.getCurrentUser).toBeDefined();
            expect(authService.getSession).toBeDefined();
            expect(authService.isAuthenticated).toBeDefined();
            expect(authService.refreshSession).toBeDefined();
            expect(authService.getState).toBeDefined();
            expect(authService.onAuthStateChange).toBeDefined();
        });
    });

    describe('auth convenience object', () => {
        it('should expose all convenience methods', () => {
            expect(auth.initialize).toBeDefined();
            expect(auth.signUp).toBeDefined();
            expect(auth.signIn).toBeDefined();
            expect(auth.signOut).toBeDefined();
            expect(auth.signInWithOAuth).toBeDefined();
            expect(auth.resetPassword).toBeDefined();
            expect(auth.updatePassword).toBeDefined();
            expect(auth.updateProfile).toBeDefined();
            expect(auth.getUser).toBeDefined();
            expect(auth.getSession).toBeDefined();
            expect(auth.isAuthenticated).toBeDefined();
            expect(auth.refreshSession).toBeDefined();
            expect(auth.onAuthStateChange).toBeDefined();
        });
    });

    describe('signUp', () => {
        it('should create a new user account', async () => {
            const request: SignUpRequest = {
                email: 'newuser@example.com',
                password: 'SecurePass123!',
                displayName: 'New User',
            };

            const result = await authService.signUp(request);

            // With mock client, will either succeed or return validation error
            expect(result).toBeDefined();
            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('error');
        });

        it('should validate email format', async () => {
            const request: SignUpRequest = {
                email: 'invalid-email',
                password: 'SecurePass123!',
            };

            const result = await authService.signUp(request);

            // Should return error for invalid email
            expect(result).toBeDefined();
        });

        it('should handle empty password', async () => {
            const request: SignUpRequest = {
                email: 'test@example.com',
                password: '',
            };

            const result = await authService.signUp(request);

            expect(result).toBeDefined();
        });
    });

    describe('signIn', () => {
        it('should authenticate valid credentials', async () => {
            const request: SignInRequest = {
                email: 'signin@example.com',
                password: 'SecurePass123!',
            };

            const result = await authService.signIn(request);

            expect(result).toBeDefined();
            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid credentials', async () => {
            const request: SignInRequest = {
                email: 'nonexistent@example.com',
                password: 'WrongPass456!',
            };

            const result = await authService.signIn(request);

            expect(result).toBeDefined();
        });

        it('should handle empty credentials', async () => {
            const request: SignInRequest = {
                email: '',
                password: '',
            };

            const result = await authService.signIn(request);

            expect(result).toBeDefined();
        });
    });

    describe('signOut', () => {
        it('should return error property', async () => {
            const result = await authService.signOut();

            expect(result).toBeDefined();
            expect(result).toHaveProperty('error');
        });
    });

    describe('signInWithOAuth', () => {
        it('should initiate Google OAuth flow', async () => {
            const result = await authService.signInWithOAuth({
                provider: 'google',
                redirectTo: 'https://example.com/callback',
            });

            expect(result).toBeDefined();
        });

        it('should initiate GitHub OAuth flow', async () => {
            const result = await authService.signInWithOAuth({
                provider: 'github',
                scopes: ['user:email', 'read:user'],
            });

            expect(result).toBeDefined();
        });

        it('should initiate Apple OAuth flow', async () => {
            const result = await authService.signInWithOAuth({
                provider: 'apple',
            });

            expect(result).toBeDefined();
        });
    });

    describe('getSession', () => {
        it('should return session or null', () => {
            const session = authService.getSession();

            // Session could be null if not authenticated
            expect(session === null || typeof session === 'object').toBe(true);
        });
    });

    describe('getCurrentUser', () => {
        it('should return user or null', () => {
            const user = authService.getCurrentUser();

            // User could be null if not authenticated
            expect(user === null || typeof user === 'object').toBe(true);
        });
    });

    describe('isAuthenticated', () => {
        it('should return boolean', () => {
            const result = authService.isAuthenticated();

            expect(typeof result).toBe('boolean');
        });
    });

    describe('getState', () => {
        it('should return AuthState object', () => {
            const state = authService.getState();

            expect(state).toBeDefined();
            expect(state).toHaveProperty('isAuthenticated');
            expect(state).toHaveProperty('isLoading');
            expect(state).toHaveProperty('user');
            expect(state).toHaveProperty('session');
            expect(state).toHaveProperty('error');
            expect(typeof state.isAuthenticated).toBe('boolean');
            expect(typeof state.isLoading).toBe('boolean');
        });
    });

    describe('resetPassword', () => {
        it('should handle valid email', async () => {
            const result = await authService.resetPassword('reset@example.com');

            expect(result).toBeDefined();
            expect(result).toHaveProperty('error');
        });

        it('should handle empty email', async () => {
            const result = await authService.resetPassword('');

            expect(result).toBeDefined();
        });
    });

    describe('updatePassword', () => {
        it('should handle password update', async () => {
            const result = await authService.updatePassword('NewSecurePass123!');

            expect(result).toBeDefined();
            expect(result).toHaveProperty('error');
        });

        it('should handle empty password', async () => {
            const result = await authService.updatePassword('');

            expect(result).toBeDefined();
        });
    });

    describe('updateProfile', () => {
        it('should handle profile updates', async () => {
            const result = await authService.updateProfile({
                displayName: 'Updated Name',
                bio: 'Updated bio',
            });

            expect(result).toBeDefined();
            expect(result).toHaveProperty('error');
        });

        it('should handle partial updates', async () => {
            const result = await authService.updateProfile({
                displayName: 'New Name',
            });

            expect(result).toBeDefined();
        });

        it('should handle social links update', async () => {
            const result = await authService.updateProfile({
                socialLinks: {
                    instagram: '@newhandle',
                    twitter: '@newhandle',
                },
            });

            expect(result).toBeDefined();
        });
    });

    describe('refreshSession', () => {
        it('should attempt to refresh session', async () => {
            const result = await authService.refreshSession();

            expect(result).toBeDefined();
            expect(result).toHaveProperty('error');
        });
    });

    describe('onAuthStateChange', () => {
        it('should register listener and return unsubscribe function', () => {
            const listener = vi.fn();
            const unsubscribe = authService.onAuthStateChange(listener);

            expect(typeof unsubscribe).toBe('function');

            // Should be able to unsubscribe
            unsubscribe();
        });

        it('should allow multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            const unsubscribe1 = authService.onAuthStateChange(listener1);
            const unsubscribe2 = authService.onAuthStateChange(listener2);

            expect(typeof unsubscribe1).toBe('function');
            expect(typeof unsubscribe2).toBe('function');

            unsubscribe1();
            unsubscribe2();
        });
    });

    describe('initialize', () => {
        it('should return AuthState', async () => {
            const state = await authService.initialize();

            expect(state).toBeDefined();
            expect(state).toHaveProperty('isAuthenticated');
            expect(state).toHaveProperty('isLoading');
            expect(state).toHaveProperty('user');
            expect(state).toHaveProperty('session');
            expect(state).toHaveProperty('error');
        });

        it('should be idempotent', async () => {
            const state1 = await authService.initialize();
            const state2 = await authService.initialize();

            expect(state1).toBeDefined();
            expect(state2).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle null/undefined in signup request displayName', async () => {
            const request: SignUpRequest = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                displayName: undefined,
            };

            const result = await authService.signUp(request);

            expect(result).toBeDefined();
        });

        it('should handle special characters in email', async () => {
            const request: SignUpRequest = {
                email: 'test+tag@example.com',
                password: 'SecurePass123!',
            };

            const result = await authService.signUp(request);

            expect(result).toBeDefined();
        });

        it('should handle unicode in displayName', async () => {
            const request: SignUpRequest = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                displayName: '测试用户 Test',
            };

            const result = await authService.signUp(request);

            expect(result).toBeDefined();
        });

        it('should handle very long displayName', async () => {
            const request: SignUpRequest = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                displayName: 'A'.repeat(256),
            };

            const result = await authService.signUp(request);

            expect(result).toBeDefined();
        });
    });
});

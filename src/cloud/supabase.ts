/**
 * Supabase Client Configuration
 *
 * Configures and exports the Supabase client for cloud platform operations.
 * Handles authentication, database operations, and real-time subscriptions.
 */

// Database table names type
type TableName = 'users' | 'designs' | 'teams' | 'team_members' | 'assets';

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Supabase configuration from environment
 */
export interface SupabaseConfig {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
}

/**
 * Get Supabase configuration from environment
 */
export function getSupabaseConfig(): SupabaseConfig {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
        throw new Error(
            'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
        );
    }

    return { url, anonKey, serviceRoleKey };
}

// ============================================================================
// Mock Supabase Client (for development without Supabase)
// ============================================================================

/**
 * Mock auth state
 */
interface MockAuthState {
    user: MockUser | null;
    session: MockSession | null;
}

interface MockUser {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    created_at: string;
}

interface MockSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: MockUser;
}

/**
 * Mock storage for development
 */
const mockStorage: Map<string, Map<string, unknown>> = new Map();
const mockAuthState: MockAuthState = { user: null, session: null };
const mockListeners: Set<(event: string, session: MockSession | null) => void> = new Set();

/**
 * Create mock Supabase client for development
 */
function createMockClient() {
    return {
        auth: {
            getSession: async () => ({
                data: { session: mockAuthState.session },
                error: null,
            }),
            getUser: async () => ({
                data: { user: mockAuthState.user },
                error: null,
            }),
            signUp: async ({ email, password }: { email: string; password: string }) => {
                const user: MockUser = {
                    id: `mock_${Date.now()}`,
                    email,
                    user_metadata: {},
                    created_at: new Date().toISOString(),
                };
                const session: MockSession = {
                    access_token: `mock_token_${Date.now()}`,
                    refresh_token: `mock_refresh_${Date.now()}`,
                    expires_at: Date.now() + 3600000,
                    user,
                };
                mockAuthState.user = user;
                mockAuthState.session = session;
                mockListeners.forEach(cb => cb('SIGNED_IN', session));
                return { data: { user, session }, error: null };
            },
            signInWithPassword: async ({ email }: { email: string; password: string }) => {
                const user: MockUser = {
                    id: `mock_${Date.now()}`,
                    email,
                    user_metadata: {},
                    created_at: new Date().toISOString(),
                };
                const session: MockSession = {
                    access_token: `mock_token_${Date.now()}`,
                    refresh_token: `mock_refresh_${Date.now()}`,
                    expires_at: Date.now() + 3600000,
                    user,
                };
                mockAuthState.user = user;
                mockAuthState.session = session;
                mockListeners.forEach(cb => cb('SIGNED_IN', session));
                return { data: { user, session }, error: null };
            },
            signInWithOAuth: async ({ provider }: { provider: string; options?: unknown }) => {
                console.log(`[Mock] OAuth sign in with ${provider}`);
                return { data: { provider, url: '#' }, error: null };
            },
            signOut: async () => {
                mockAuthState.user = null;
                mockAuthState.session = null;
                mockListeners.forEach(cb => cb('SIGNED_OUT', null));
                return { error: null };
            },
            resetPasswordForEmail: async (email: string) => {
                console.log(`[Mock] Password reset email sent to ${email}`);
                return { data: {}, error: null };
            },
            updateUser: async (updates: Record<string, unknown>) => {
                if (mockAuthState.user) {
                    mockAuthState.user = { ...mockAuthState.user, ...updates };
                }
                return { data: { user: mockAuthState.user }, error: null };
            },
            onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
                mockListeners.add(callback);
                return {
                    data: {
                        subscription: {
                            unsubscribe: () => {
                                mockListeners.delete(callback);
                            },
                        },
                    },
                };
            },
        },
        from: (table: TableName) => {
            if (!mockStorage.has(table)) {
                mockStorage.set(table, new Map());
            }
            const tableStorage = mockStorage.get(table)!;

            return {
                select: (columns = '*') => ({
                    eq: (column: string, value: unknown) => ({
                        single: async () => {
                            const items = Array.from(tableStorage.values());
                            const item = items.find((i: any) => i[column] === value);
                            return { data: item || null, error: null };
                        },
                        maybeSingle: async () => {
                            const items = Array.from(tableStorage.values());
                            const item = items.find((i: any) => i[column] === value);
                            return { data: item || null, error: null };
                        },
                        then: async (resolve: (result: { data: unknown[]; error: null }) => void) => {
                            const items = Array.from(tableStorage.values()).filter(
                                (i: any) => i[column] === value
                            );
                            resolve({ data: items, error: null });
                        },
                        order: () => ({
                            range: () => ({
                                then: async (resolve: (result: { data: unknown[]; error: null; count: number }) => void) => {
                                    const items = Array.from(tableStorage.values()).filter(
                                        (i: any) => i[column] === value
                                    );
                                    resolve({ data: items, error: null, count: items.length });
                                },
                            }),
                        }),
                    }),
                    in: (column: string, values: unknown[]) => ({
                        then: async (resolve: (result: { data: unknown[]; error: null }) => void) => {
                            const items = Array.from(tableStorage.values()).filter((i: any) =>
                                values.includes(i[column])
                            );
                            resolve({ data: items, error: null });
                        },
                    }),
                    order: (column: string, options?: { ascending?: boolean }) => ({
                        range: (from: number, to: number) => ({
                            then: async (resolve: (result: { data: unknown[]; error: null; count: number }) => void) => {
                                let items = Array.from(tableStorage.values());
                                items.sort((a: any, b: any) => {
                                    const asc = options?.ascending ?? true;
                                    return asc
                                        ? String(a[column]).localeCompare(String(b[column]))
                                        : String(b[column]).localeCompare(String(a[column]));
                                });
                                items = items.slice(from, to + 1);
                                resolve({ data: items, error: null, count: tableStorage.size });
                            },
                        }),
                        limit: (count: number) => ({
                            then: async (resolve: (result: { data: unknown[]; error: null }) => void) => {
                                let items = Array.from(tableStorage.values());
                                items.sort((a: any, b: any) => {
                                    const asc = options?.ascending ?? true;
                                    return asc
                                        ? String(a[column]).localeCompare(String(b[column]))
                                        : String(b[column]).localeCompare(String(a[column]));
                                });
                                items = items.slice(0, count);
                                resolve({ data: items, error: null });
                            },
                        }),
                    }),
                    single: async () => {
                        const items = Array.from(tableStorage.values());
                        return { data: items[0] || null, error: null };
                    },
                    then: async (resolve: (result: { data: unknown[]; error: null; count: number }) => void) => {
                        resolve({
                            data: Array.from(tableStorage.values()),
                            error: null,
                            count: tableStorage.size,
                        });
                    },
                }),
                insert: (data: Record<string, unknown> | Record<string, unknown>[]) => ({
                    select: () => ({
                        single: async () => {
                            const items = Array.isArray(data) ? data : [data];
                            const inserted = items.map(item => {
                                const id = (item.id as string) || `${table}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                                const record = {
                                    ...item,
                                    id,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                };
                                tableStorage.set(id as string, record);
                                return record;
                            });
                            return { data: inserted[0], error: null };
                        },
                        then: async (resolve: (result: { data: unknown[]; error: null }) => void) => {
                            const items = Array.isArray(data) ? data : [data];
                            const inserted = items.map(item => {
                                const id = (item.id as string) || `${table}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                                const record = {
                                    ...item,
                                    id,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                };
                                tableStorage.set(id as string, record);
                                return record;
                            });
                            resolve({ data: inserted, error: null });
                        },
                    }),
                }),
                update: (data: Record<string, unknown>) => ({
                    eq: (column: string, value: unknown) => ({
                        select: () => ({
                            single: async () => {
                                const items = Array.from(tableStorage.entries());
                                const entry = items.find(([, item]: [string, any]) => item[column] === value);
                                if (entry) {
                                    const [id, existing] = entry;
                                    const updated = {
                                        ...(existing as Record<string, unknown>),
                                        ...data,
                                        updated_at: new Date().toISOString(),
                                    };
                                    tableStorage.set(id, updated);
                                    return { data: updated, error: null };
                                }
                                return { data: null, error: { message: 'Not found' } };
                            },
                        }),
                    }),
                }),
                delete: () => ({
                    eq: (column: string, value: unknown) => ({
                        then: async (resolve: (result: { error: null }) => void) => {
                            const items = Array.from(tableStorage.entries());
                            items.forEach(([id, item]: [string, any]) => {
                                if (item[column] === value) {
                                    tableStorage.delete(id);
                                }
                            });
                            resolve({ error: null });
                        },
                    }),
                }),
                upsert: (data: Record<string, unknown>) => ({
                    select: () => ({
                        single: async () => {
                            const id = (data.id as string) || `${table}_${Date.now()}`;
                            const existing = tableStorage.get(id);
                            const record = {
                                ...(existing as Record<string, unknown> || {}),
                                ...data,
                                id,
                                created_at: existing ? (existing as any).created_at : new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            tableStorage.set(id, record);
                            return { data: record, error: null };
                        },
                    }),
                }),
            };
        },
        storage: {
            from: (bucket: string) => ({
                upload: async (path: string, file: File | Blob) => {
                    console.log(`[Mock] Uploading to ${bucket}/${path}`);
                    return { data: { path }, error: null };
                },
                download: async (path: string) => {
                    console.log(`[Mock] Downloading from ${bucket}/${path}`);
                    return { data: new Blob(), error: null };
                },
                remove: async (paths: string[]) => {
                    console.log(`[Mock] Removing from ${bucket}:`, paths);
                    return { data: paths.map(p => ({ name: p })), error: null };
                },
                getPublicUrl: (path: string) => ({
                    data: { publicUrl: `https://mock-storage.example.com/${bucket}/${path}` },
                }),
                list: async (folder?: string) => {
                    console.log(`[Mock] Listing ${bucket}/${folder || ''}`);
                    return { data: [], error: null };
                },
            }),
        },
        channel: (name: string) => ({
            on: (
                event: string,
                filter: Record<string, unknown>,
                callback: (payload: unknown) => void
            ) => {
                console.log(`[Mock] Subscribing to ${name} for ${event}`);
                return {
                    on: (
                        event2: string,
                        filter2: Record<string, unknown>,
                        callback2: (payload: unknown) => void
                    ) => ({
                        subscribe: (statusCallback?: (status: string) => void) => {
                            if (statusCallback) statusCallback('SUBSCRIBED');
                            return { unsubscribe: () => { } };
                        },
                    }),
                    subscribe: (statusCallback?: (status: string) => void) => {
                        if (statusCallback) statusCallback('SUBSCRIBED');
                        return { unsubscribe: () => { } };
                    },
                };
            },
            subscribe: (statusCallback?: (status: string) => void) => {
                if (statusCallback) statusCallback('SUBSCRIBED');
                return { unsubscribe: () => { } };
            },
        }),
        removeChannel: async (channel: { unsubscribe: () => void }) => {
            channel.unsubscribe();
        },
        rpc: async (fn: string, params: Record<string, unknown>) => {
            console.log(`[Mock] RPC call: ${fn}`, params);
            return { data: null, error: null };
        },
    };
}

// ============================================================================
// Supabase Client Types
// ============================================================================

export type SupabaseClient = ReturnType<typeof createMockClient>;

// ============================================================================
// Client Instance
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
    if (supabaseClient) {
        return supabaseClient;
    }

    // Check if we have real Supabase configuration
    const hasRealConfig =
        import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (hasRealConfig) {
        // In a real implementation, we would use the actual Supabase client:
        // import { createClient } from '@supabase/supabase-js';
        // supabaseClient = createClient<Database>(config.url, config.anonKey, clientOptions);
        //
        // For now, we use the mock client until @supabase/supabase-js is installed
        console.warn(
            '[Supabase] Real configuration detected but using mock client. Install @supabase/supabase-js for production use.'
        );
        supabaseClient = createMockClient();
    } else {
        // Use mock client for development without Supabase
        console.info('[Supabase] Using mock client for development');
        supabaseClient = createMockClient();
    }

    return supabaseClient;
}

/**
 * Reset the Supabase client (useful for testing)
 */
export function resetSupabaseClient(): void {
    supabaseClient = null;
    mockStorage.clear();
    mockAuthState.user = null;
    mockAuthState.session = null;
    mockListeners.clear();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    return !!data.session;
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
    const client = getSupabaseClient();
    const { data } = await client.auth.getUser();
    return data.user?.id || null;
}

/**
 * Upload file to storage
 */
export async function uploadFile(
    bucket: string,
    path: string,
    file: File | Blob
): Promise<{ url: string | null; error: Error | null }> {
    const client = getSupabaseClient();
    const { data, error } = await client.storage.from(bucket).upload(path, file);

    if (error) {
        return { url: null, error: new Error(error.message) };
    }

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, error: null };
}

/**
 * Delete file from storage
 */
export async function deleteFile(
    bucket: string,
    paths: string[]
): Promise<{ error: Error | null }> {
    const client = getSupabaseClient();
    const { error } = await client.storage.from(bucket).remove(paths);
    return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// Exports
// ============================================================================

export const supabase = {
    get client() {
        return getSupabaseClient();
    },
    isAuthenticated,
    getCurrentUserId,
    uploadFile,
    deleteFile,
    reset: resetSupabaseClient,
};

export default supabase;

/**
 * History Manager - Phase 4 Professional Design Tools
 *
 * Comprehensive undo/redo system with unlimited history states,
 * state compression, branching history, and automatic snapshots.
 */

export interface HistoryState<T = unknown> {
    id: string;
    name: string;
    description?: string;
    timestamp: Date;
    data: T;
    thumbnail?: string;
    metadata?: StateMetadata;
    parentId?: string;
    branchId?: string;
}

export interface StateMetadata {
    tool?: string;
    layer?: string;
    action?: string;
    duration?: number;
    memoryUsage?: number;
    compressed?: boolean;
}

export interface HistoryBranch {
    id: string;
    name: string;
    parentStateId: string;
    createdAt: Date;
    states: string[]; // State IDs
    isActive: boolean;
}

export interface HistoryConfig {
    /** Maximum number of states to keep (0 = unlimited) */
    maxStates: number;
    /** Automatically create snapshots every N operations */
    snapshotInterval: number;
    /** Enable state compression */
    compression: boolean;
    /** Enable branching history */
    branching: boolean;
    /** Group rapid changes within this time window (ms) */
    coalesceWindow: number;
    /** Maximum memory usage in bytes (0 = unlimited) */
    maxMemory: number;
    /** Persist history to storage */
    persistent: boolean;
    /** Storage key for persistent history */
    storageKey: string;
}

export interface HistoryStats {
    totalStates: number;
    branches: number;
    currentIndex: number;
    memoryUsage: number;
    oldestState: Date | null;
    newestState: Date | null;
    canUndo: boolean;
    canRedo: boolean;
}

export type HistoryEvent =
    | { type: 'stateAdded'; state: HistoryState }
    | { type: 'stateRemoved'; stateId: string }
    | { type: 'undo'; state: HistoryState }
    | { type: 'redo'; state: HistoryState }
    | { type: 'branchCreated'; branch: HistoryBranch }
    | { type: 'branchSwitched'; branchId: string }
    | { type: 'cleared' }
    | { type: 'restored'; stateId: string };

type HistoryEventListener = (event: HistoryEvent) => void;

/**
 * Comprehensive History Manager
 */
export class HistoryManager<T = unknown> {
    private states: Map<string, HistoryState<T>> = new Map();
    private branches: Map<string, HistoryBranch> = new Map();
    private currentStateId: string | null = null;
    private activeBranchId: string;
    private config: HistoryConfig;
    private listeners: Set<HistoryEventListener> = new Set();
    private lastAddTime: number = 0;
    private pendingState: HistoryState<T> | null = null;
    private coalesceTimer: ReturnType<typeof setTimeout> | null = null;
    private operationCount: number = 0;
    private idCounter: number = 0;

    constructor(config: Partial<HistoryConfig> = {}) {
        this.config = {
            maxStates: 100,
            snapshotInterval: 10,
            compression: true,
            branching: true,
            coalesceWindow: 300,
            maxMemory: 100 * 1024 * 1024, // 100MB
            persistent: false,
            storageKey: 'design-history',
            ...config
        };

        // Create main branch
        this.activeBranchId = this.generateId();
        this.branches.set(this.activeBranchId, {
            id: this.activeBranchId,
            name: 'Main',
            parentStateId: '',
            createdAt: new Date(),
            states: [],
            isActive: true
        });

        // Load from storage if persistent
        if (this.config.persistent) {
            this.loadFromStorage();
        }
    }

    /**
     * Push a new state
     */
    push(name: string, data: T, options: Partial<StateMetadata> = {}): HistoryState<T> {
        const now = Date.now();

        // Coalesce rapid changes
        if (this.config.coalesceWindow > 0 && now - this.lastAddTime < this.config.coalesceWindow) {
            if (this.pendingState) {
                // Update pending state instead of creating new one
                this.pendingState.data = data;
                this.pendingState.timestamp = new Date();
                this.pendingState.metadata = { ...this.pendingState.metadata, ...options };
                this.resetCoalesceTimer();
                return this.pendingState;
            }
        }

        // Clear any pending coalesce
        this.clearCoalesceTimer();

        // Create new state
        const state: HistoryState<T> = {
            id: this.generateId(),
            name,
            timestamp: new Date(),
            data: this.config.compression ? this.compressState(data) : data,
            parentId: this.currentStateId || undefined,
            branchId: this.activeBranchId,
            metadata: {
                ...options,
                compressed: this.config.compression,
                memoryUsage: this.estimateMemory(data)
            }
        };

        // Handle branching
        if (this.config.branching && this.currentStateId) {
            const currentBranch = this.branches.get(this.activeBranchId);
            if (currentBranch) {
                const currentIndex = currentBranch.states.indexOf(this.currentStateId);

                // If not at the end of the branch, create a new branch
                if (currentIndex >= 0 && currentIndex < currentBranch.states.length - 1) {
                    this.createBranch(`Branch ${this.branches.size}`, this.currentStateId);
                }
            }
        } else if (!this.config.branching && this.currentStateId) {
            // Without branching, remove all states after current
            this.pruneForwardStates();
        }

        // Add state
        this.states.set(state.id, state);
        const branch = this.branches.get(this.activeBranchId)!;
        branch.states.push(state.id);
        this.currentStateId = state.id;

        // Track for coalescing
        this.pendingState = state;
        this.lastAddTime = now;
        this.startCoalesceTimer();

        // Increment operation count for snapshots
        this.operationCount++;
        if (this.config.snapshotInterval > 0 && this.operationCount % this.config.snapshotInterval === 0) {
            state.thumbnail = this.generateThumbnail(data);
        }

        // Prune old states if needed
        this.pruneStates();

        // Persist if enabled
        if (this.config.persistent) {
            this.saveToStorage();
        }

        this.emit({ type: 'stateAdded', state });
        return state;
    }

    /**
     * Undo - go to previous state
     */
    undo(): HistoryState<T> | null {
        this.clearCoalesceTimer();

        if (!this.canUndo()) {
            return null;
        }

        const branch = this.branches.get(this.activeBranchId);
        if (!branch || !this.currentStateId) {
            return null;
        }

        const currentIndex = branch.states.indexOf(this.currentStateId);
        if (currentIndex <= 0) {
            return null;
        }

        const previousStateId = branch.states[currentIndex - 1];
        const previousState = this.states.get(previousStateId);

        if (previousState) {
            this.currentStateId = previousStateId;
            this.emit({ type: 'undo', state: previousState });
            return this.decompressState(previousState);
        }

        return null;
    }

    /**
     * Redo - go to next state
     */
    redo(): HistoryState<T> | null {
        this.clearCoalesceTimer();

        if (!this.canRedo()) {
            return null;
        }

        const branch = this.branches.get(this.activeBranchId);
        if (!branch || !this.currentStateId) {
            return null;
        }

        const currentIndex = branch.states.indexOf(this.currentStateId);
        if (currentIndex >= branch.states.length - 1) {
            return null;
        }

        const nextStateId = branch.states[currentIndex + 1];
        const nextState = this.states.get(nextStateId);

        if (nextState) {
            this.currentStateId = nextStateId;
            this.emit({ type: 'redo', state: nextState });
            return this.decompressState(nextState);
        }

        return null;
    }

    /**
     * Can undo?
     */
    canUndo(): boolean {
        if (!this.currentStateId) return false;

        const branch = this.branches.get(this.activeBranchId);
        if (!branch) return false;

        const currentIndex = branch.states.indexOf(this.currentStateId);
        return currentIndex > 0;
    }

    /**
     * Can redo?
     */
    canRedo(): boolean {
        if (!this.currentStateId) return false;

        const branch = this.branches.get(this.activeBranchId);
        if (!branch) return false;

        const currentIndex = branch.states.indexOf(this.currentStateId);
        return currentIndex < branch.states.length - 1;
    }

    /**
     * Go to specific state
     */
    goToState(stateId: string): HistoryState<T> | null {
        this.clearCoalesceTimer();

        const state = this.states.get(stateId);
        if (!state) {
            return null;
        }

        // Switch branch if needed
        if (state.branchId && state.branchId !== this.activeBranchId) {
            this.switchBranch(state.branchId);
        }

        this.currentStateId = stateId;
        this.emit({ type: 'restored', stateId });
        return this.decompressState(state);
    }

    /**
     * Get current state
     */
    getCurrentState(): HistoryState<T> | null {
        if (!this.currentStateId) return null;
        const state = this.states.get(this.currentStateId);
        return state ? this.decompressState(state) : null;
    }

    /**
     * Get state by ID
     */
    getState(stateId: string): HistoryState<T> | null {
        const state = this.states.get(stateId);
        return state ? this.decompressState(state) : null;
    }

    /**
     * Get all states in current branch
     */
    getStates(): HistoryState<T>[] {
        const branch = this.branches.get(this.activeBranchId);
        if (!branch) return [];

        return branch.states
            .map(id => this.states.get(id))
            .filter((s): s is HistoryState<T> => s !== undefined)
            .map(s => this.decompressState(s));
    }

    /**
     * Get history stats
     */
    getStats(): HistoryStats {
        const allStates = Array.from(this.states.values());
        const timestamps = allStates.map(s => s.timestamp.getTime());

        return {
            totalStates: this.states.size,
            branches: this.branches.size,
            currentIndex: this.getCurrentIndex(),
            memoryUsage: this.calculateTotalMemory(),
            oldestState: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
            newestState: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    private getCurrentIndex(): number {
        if (!this.currentStateId) return -1;
        const branch = this.branches.get(this.activeBranchId);
        if (!branch) return -1;
        return branch.states.indexOf(this.currentStateId);
    }

    /**
     * Create a new branch
     */
    createBranch(name: string, fromStateId?: string): HistoryBranch {
        if (!this.config.branching) {
            throw new Error('Branching is disabled');
        }

        const parentStateId = fromStateId || this.currentStateId || '';
        const branch: HistoryBranch = {
            id: this.generateId(),
            name,
            parentStateId,
            createdAt: new Date(),
            states: [],
            isActive: false
        };

        // Copy states up to parent
        if (parentStateId) {
            const currentBranch = this.branches.get(this.activeBranchId);
            if (currentBranch) {
                const parentIndex = currentBranch.states.indexOf(parentStateId);
                if (parentIndex >= 0) {
                    branch.states = currentBranch.states.slice(0, parentIndex + 1);
                }
            }
        }

        this.branches.set(branch.id, branch);
        this.switchBranch(branch.id);

        this.emit({ type: 'branchCreated', branch });
        return branch;
    }

    /**
     * Switch to a branch
     */
    switchBranch(branchId: string): void {
        const branch = this.branches.get(branchId);
        if (!branch) {
            throw new Error(`Branch ${branchId} not found`);
        }

        // Deactivate current branch
        const currentBranch = this.branches.get(this.activeBranchId);
        if (currentBranch) {
            currentBranch.isActive = false;
        }

        // Activate new branch
        branch.isActive = true;
        this.activeBranchId = branchId;

        // Set current state to last state in branch
        if (branch.states.length > 0) {
            this.currentStateId = branch.states[branch.states.length - 1];
        }

        this.emit({ type: 'branchSwitched', branchId });
    }

    /**
     * Get all branches
     */
    getBranches(): HistoryBranch[] {
        return Array.from(this.branches.values());
    }

    /**
     * Get active branch
     */
    getActiveBranch(): HistoryBranch | null {
        return this.branches.get(this.activeBranchId) || null;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.clearCoalesceTimer();
        this.states.clear();
        this.currentStateId = null;

        // Reset to main branch
        this.branches.clear();
        this.activeBranchId = this.generateId();
        this.branches.set(this.activeBranchId, {
            id: this.activeBranchId,
            name: 'Main',
            parentStateId: '',
            createdAt: new Date(),
            states: [],
            isActive: true
        });

        this.operationCount = 0;

        if (this.config.persistent) {
            this.clearStorage();
        }

        this.emit({ type: 'cleared' });
    }

    /**
     * Batch multiple changes into single state
     */
    batch<R>(name: string, fn: () => R): R {
        // Store current coalesce window
        const originalWindow = this.config.coalesceWindow;

        // Set to infinity to coalesce all changes
        this.config.coalesceWindow = Infinity;

        try {
            const result = fn();

            // Commit the batched state
            this.commitPending();

            return result;
        } finally {
            this.config.coalesceWindow = originalWindow;
        }
    }

    /**
     * Create a transaction that can be committed or rolled back
     */
    transaction(name: string): Transaction<T> {
        const startStateId = this.currentStateId;
        const transactionStates: string[] = [];

        return {
            push: (data: T, description?: string) => {
                const state = this.push(description || name, data);
                transactionStates.push(state.id);
                return state;
            },

            commit: () => {
                // All states are already added, nothing to do
                return transactionStates.length;
            },

            rollback: () => {
                // Remove all transaction states
                for (const stateId of transactionStates.reverse()) {
                    this.removeState(stateId);
                }

                // Restore to start state
                if (startStateId) {
                    this.goToState(startStateId);
                }

                return transactionStates.length;
            }
        };
    }

    /**
     * Remove a specific state
     */
    private removeState(stateId: string): void {
        const state = this.states.get(stateId);
        if (!state) return;

        // Remove from branch
        if (state.branchId) {
            const branch = this.branches.get(state.branchId);
            if (branch) {
                const index = branch.states.indexOf(stateId);
                if (index >= 0) {
                    branch.states.splice(index, 1);
                }
            }
        }

        // Remove state
        this.states.delete(stateId);

        // Update current state if needed
        if (this.currentStateId === stateId) {
            const branch = this.branches.get(this.activeBranchId);
            if (branch && branch.states.length > 0) {
                this.currentStateId = branch.states[branch.states.length - 1];
            } else {
                this.currentStateId = null;
            }
        }

        this.emit({ type: 'stateRemoved', stateId });
    }

    /**
     * Prune states when limits are exceeded
     */
    private pruneStates(): void {
        const branch = this.branches.get(this.activeBranchId);
        if (!branch) return;

        // Check max states
        if (this.config.maxStates > 0 && branch.states.length > this.config.maxStates) {
            const toRemove = branch.states.length - this.config.maxStates;
            const removedIds = branch.states.splice(0, toRemove);

            for (const id of removedIds) {
                this.states.delete(id);
                this.emit({ type: 'stateRemoved', stateId: id });
            }
        }

        // Check memory limit
        if (this.config.maxMemory > 0) {
            while (this.calculateTotalMemory() > this.config.maxMemory && branch.states.length > 1) {
                const oldestId = branch.states.shift();
                if (oldestId) {
                    this.states.delete(oldestId);
                    this.emit({ type: 'stateRemoved', stateId: oldestId });
                }
            }
        }
    }

    /**
     * Remove all states after current (for non-branching mode)
     */
    private pruneForwardStates(): void {
        if (!this.currentStateId) return;

        const branch = this.branches.get(this.activeBranchId);
        if (!branch) return;

        const currentIndex = branch.states.indexOf(this.currentStateId);
        if (currentIndex < 0) return;

        const forwardIds = branch.states.slice(currentIndex + 1);
        branch.states = branch.states.slice(0, currentIndex + 1);

        for (const id of forwardIds) {
            this.states.delete(id);
            this.emit({ type: 'stateRemoved', stateId: id });
        }
    }

    /**
     * State compression (simplified)
     */
    private compressState(data: T): T {
        // In a real implementation, this would use proper compression
        // For now, just return the data as-is
        return data;
    }

    /**
     * State decompression
     */
    private decompressState(state: HistoryState<T>): HistoryState<T> {
        // In a real implementation, this would decompress if needed
        return { ...state };
    }

    /**
     * Estimate memory usage
     */
    private estimateMemory(data: T): number {
        // Rough estimate based on JSON serialization
        try {
            return JSON.stringify(data).length * 2; // UTF-16
        } catch {
            return 0;
        }
    }

    /**
     * Calculate total memory usage
     */
    private calculateTotalMemory(): number {
        let total = 0;
        for (const state of this.states.values()) {
            total += state.metadata?.memoryUsage || 0;
        }
        return total;
    }

    /**
     * Generate thumbnail (placeholder)
     */
    private generateThumbnail(_data: T): string {
        // In a real implementation, this would generate an actual thumbnail
        return '';
    }

    /**
     * Coalesce timer management
     */
    private startCoalesceTimer(): void {
        if (this.config.coalesceWindow <= 0) return;

        this.coalesceTimer = setTimeout(() => {
            this.commitPending();
        }, this.config.coalesceWindow);
    }

    private resetCoalesceTimer(): void {
        this.clearCoalesceTimer();
        this.startCoalesceTimer();
    }

    private clearCoalesceTimer(): void {
        if (this.coalesceTimer) {
            clearTimeout(this.coalesceTimer);
            this.coalesceTimer = null;
        }
    }

    private commitPending(): void {
        this.pendingState = null;
        this.clearCoalesceTimer();
    }

    /**
     * Persistence
     */
    private saveToStorage(): void {
        if (typeof localStorage === 'undefined') return;

        try {
            const data = {
                states: Array.from(this.states.entries()),
                branches: Array.from(this.branches.entries()),
                currentStateId: this.currentStateId,
                activeBranchId: this.activeBranchId
            };

            localStorage.setItem(this.config.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save history to storage:', error);
        }
    }

    private loadFromStorage(): void {
        if (typeof localStorage === 'undefined') return;

        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (!stored) return;

            const data = JSON.parse(stored);

            this.states = new Map(data.states.map((entry: [string, HistoryState<T>]) => {
                // Restore Date objects
                entry[1].timestamp = new Date(entry[1].timestamp);
                return entry;
            }));

            this.branches = new Map(data.branches.map((entry: [string, HistoryBranch]) => {
                entry[1].createdAt = new Date(entry[1].createdAt);
                return entry;
            }));

            this.currentStateId = data.currentStateId;
            this.activeBranchId = data.activeBranchId;
        } catch (error) {
            console.warn('Failed to load history from storage:', error);
        }
    }

    private clearStorage(): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(this.config.storageKey);
    }

    /**
     * Event handling
     */
    addEventListener(listener: HistoryEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: HistoryEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${this.idCounter++}`;
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.clearCoalesceTimer();
        this.listeners.clear();
        this.clear();
    }
}

/**
 * Transaction interface
 */
export interface Transaction<T> {
    push: (data: T, description?: string) => HistoryState<T>;
    commit: () => number;
    rollback: () => number;
}

/**
 * Create a simple document history manager
 */
export function createDocumentHistory<T>(maxStates: number = 50): HistoryManager<T> {
    return new HistoryManager<T>({
        maxStates,
        compression: false,
        branching: false,
        coalesceWindow: 500,
        persistent: false
    });
}

/**
 * Create a full-featured design history manager
 */
export function createDesignHistory<T>(): HistoryManager<T> {
    return new HistoryManager<T>({
        maxStates: 0, // Unlimited
        snapshotInterval: 10,
        compression: true,
        branching: true,
        coalesceWindow: 300,
        maxMemory: 200 * 1024 * 1024, // 200MB
        persistent: true,
        storageKey: 'nanodesign-history'
    });
}

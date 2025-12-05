/**
 * Layer History Manager
 *
 * Manages undo/redo history for layer operations with efficient state snapshots.
 */

import { Layer } from '../types';
import { LayerManager, LayerManagerState } from './layer-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface HistoryAction {
    id: string;
    type: HistoryActionType;
    name: string;
    timestamp: number;
    before: HistorySnapshot;
    after: HistorySnapshot;
}

export type HistoryActionType =
    | 'layer-add'
    | 'layer-remove'
    | 'layer-update'
    | 'layer-reorder'
    | 'layer-group'
    | 'layer-ungroup'
    | 'layer-merge'
    | 'selection-change'
    | 'batch-operation'
    | 'canvas-resize'
    | 'import'
    | 'custom';

export interface HistorySnapshot {
    layers: Layer[];
    order: string[];
    selectedIds: string[];
    activeLayerId: string | null;
}

export interface HistoryOptions {
    maxHistorySize: number;
    debounceMs: number;
    groupSimilarActions: boolean;
}

// ============================================================================
// LAYER HISTORY CLASS
// ============================================================================

export class LayerHistory {
    private history: HistoryAction[] = [];
    private currentIndex: number = -1;
    private layerManager: LayerManager;
    private options: HistoryOptions;
    private isRecording: boolean = true;
    private pendingAction: Partial<HistoryAction> | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private actionCounter: number = 0;

    constructor(layerManager: LayerManager, options: Partial<HistoryOptions> = {}) {
        this.layerManager = layerManager;
        this.options = {
            maxHistorySize: 100,
            debounceMs: 300,
            groupSimilarActions: true,
            ...options,
        };

        this.setupListeners();
    }

    // ========================================================================
    // SETUP
    // ========================================================================

    private setupListeners(): void {
        this.layerManager.on('onLayerAdd', (layer) => {
            this.recordAction('layer-add', `Add ${layer.name}`);
        });

        this.layerManager.on('onLayerRemove', (layerId) => {
            this.recordAction('layer-remove', 'Remove Layer');
        });

        this.layerManager.on('onLayerUpdate', (layer) => {
            this.recordDebouncedAction('layer-update', `Update ${layer.name}`);
        });

        this.layerManager.on('onLayerReorder', () => {
            this.recordAction('layer-reorder', 'Reorder Layers');
        });

        this.layerManager.on('onSelectionChange', () => {
            // Selection changes don't need history by default
        });
    }

    // ========================================================================
    // RECORDING
    // ========================================================================

    private createSnapshot(): HistorySnapshot {
        const state = this.layerManager.getState();
        return {
            layers: JSON.parse(JSON.stringify(state.layers)),
            order: [...state.layers.map(l => l.id)],
            selectedIds: [...state.selectedIds],
            activeLayerId: state.activeLayerId,
        };
    }

    private recordAction(type: HistoryActionType, name: string): void {
        if (!this.isRecording) return;

        const afterSnapshot = this.createSnapshot();
        const beforeSnapshot = this.pendingAction?.before || this.getLastSnapshot();

        const action: HistoryAction = {
            id: `action_${Date.now()}_${++this.actionCounter}`,
            type,
            name,
            timestamp: Date.now(),
            before: beforeSnapshot,
            after: afterSnapshot,
        };

        this.pushAction(action);
        this.pendingAction = null;
    }

    private recordDebouncedAction(type: HistoryActionType, name: string): void {
        if (!this.isRecording) return;

        // Store the before snapshot if this is the first in a series
        if (!this.pendingAction) {
            this.pendingAction = {
                type,
                name,
                before: this.getLastSnapshot(),
            };
        }

        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new timer
        this.debounceTimer = setTimeout(() => {
            this.recordAction(type, name);
        }, this.options.debounceMs);
    }

    private pushAction(action: HistoryAction): void {
        // Remove any future history if we're not at the end
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Check if we should group with previous action
        if (this.options.groupSimilarActions && this.history.length > 0) {
            const lastAction = this.history[this.history.length - 1];
            const timeDiff = action.timestamp - lastAction.timestamp;

            if (
                lastAction.type === action.type &&
                timeDiff < 1000 // Within 1 second
            ) {
                // Update last action's 'after' instead of creating new
                lastAction.after = action.after;
                lastAction.timestamp = action.timestamp;
                return;
            }
        }

        this.history.push(action);
        this.currentIndex = this.history.length - 1;

        // Trim history if too long
        if (this.history.length > this.options.maxHistorySize) {
            const excess = this.history.length - this.options.maxHistorySize;
            this.history = this.history.slice(excess);
            this.currentIndex -= excess;
        }
    }

    private getLastSnapshot(): HistorySnapshot {
        if (this.history.length > 0 && this.currentIndex >= 0) {
            return this.history[this.currentIndex].after;
        }
        return this.createSnapshot();
    }

    // ========================================================================
    // UNDO/REDO
    // ========================================================================

    canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    undo(): boolean {
        if (!this.canUndo()) return false;

        // Flush any pending debounced action
        this.flushPendingAction();

        const action = this.history[this.currentIndex];
        this.applySnapshot(action.before);
        this.currentIndex--;

        return true;
    }

    redo(): boolean {
        if (!this.canRedo()) return false;

        this.currentIndex++;
        const action = this.history[this.currentIndex];
        this.applySnapshot(action.after);

        return true;
    }

    private applySnapshot(snapshot: HistorySnapshot): void {
        this.isRecording = false;

        // Clear and rebuild layer manager state
        this.layerManager.clear();

        snapshot.layers.forEach((layer, index) => {
            this.layerManager.addLayer(layer, index);
        });

        if (snapshot.order.length > 0) {
            this.layerManager.reorderLayers(snapshot.order);
        }

        this.layerManager.selectLayers(snapshot.selectedIds);

        this.isRecording = true;
    }

    // ========================================================================
    // MANUAL RECORDING
    // ========================================================================

    /**
     * Begin a manual history action. Call endAction() when done.
     */
    beginAction(name: string): void {
        this.pendingAction = {
            type: 'custom',
            name,
            before: this.createSnapshot(),
        };
    }

    /**
     * End a manual history action started with beginAction().
     */
    endAction(): void {
        if (!this.pendingAction || !this.pendingAction.name) return;
        this.recordAction(
            this.pendingAction.type as HistoryActionType || 'custom',
            this.pendingAction.name
        );
    }

    /**
     * Cancel a pending manual action without recording.
     */
    cancelAction(): void {
        this.pendingAction = null;
    }

    /**
     * Execute a function as a single history action.
     */
    batch<T>(name: string, fn: () => T): T {
        this.beginAction(name);
        try {
            const result = fn();
            this.endAction();
            return result;
        } catch (error) {
            this.cancelAction();
            throw error;
        }
    }

    // ========================================================================
    // PAUSE/RESUME
    // ========================================================================

    pause(): void {
        this.flushPendingAction();
        this.isRecording = false;
    }

    resume(): void {
        this.isRecording = true;
    }

    isPaused(): boolean {
        return !this.isRecording;
    }

    private flushPendingAction(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        if (this.pendingAction && this.pendingAction.name) {
            this.recordAction(
                this.pendingAction.type as HistoryActionType || 'layer-update',
                this.pendingAction.name
            );
        }
    }

    // ========================================================================
    // HISTORY INFO
    // ========================================================================

    getHistory(): HistoryAction[] {
        return [...this.history];
    }

    getCurrentIndex(): number {
        return this.currentIndex;
    }

    getUndoStack(): HistoryAction[] {
        return this.history.slice(0, this.currentIndex + 1);
    }

    getRedoStack(): HistoryAction[] {
        return this.history.slice(this.currentIndex + 1);
    }

    getLastAction(): HistoryAction | null {
        return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
    }

    // ========================================================================
    // CLEAR
    // ========================================================================

    clear(): void {
        this.flushPendingAction();
        this.history = [];
        this.currentIndex = -1;
    }

    /**
     * Jump to a specific point in history.
     */
    goTo(index: number): boolean {
        if (index < 0 || index >= this.history.length) return false;
        if (index === this.currentIndex) return true;

        const targetSnapshot = index >= 0
            ? this.history[index].after
            : this.history[0].before;

        this.applySnapshot(targetSnapshot);
        this.currentIndex = index;

        return true;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createLayerHistory(
    layerManager: LayerManager,
    options?: Partial<HistoryOptions>
): LayerHistory {
    return new LayerHistory(layerManager, options);
}

/**
 * Layer Manager
 *
 * Core service for managing design layers - creation, manipulation,
 * ordering, grouping, and effects.
 */

import {
    Layer,
    LayerType,
    LayerData,
    LayerTransform,
    LayerEffects,
    BlendMode,
    ImageLayerData,
    ShapeLayerData,
    TextLayerData,
    GroupLayerData,
    MaskLayerData,
    VectorLayerData,
    DEFAULT_LAYER_TRANSFORM,
    DEFAULT_LAYER_EFFECTS,
} from '../types';

// ============================================================================
// LAYER CREATION
// ============================================================================

export function createLayer(
    type: LayerType,
    data: LayerData,
    options: Partial<Layer> = {}
): Layer {
    const now = Date.now();
    return {
        id: generateLayerId(),
        name: options.name || getDefaultLayerName(type),
        type,
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        transform: { ...DEFAULT_LAYER_TRANSFORM },
        effects: { ...DEFAULT_LAYER_EFFECTS },
        data,
        createdAt: now,
        updatedAt: now,
        ...options,
    };
}

export function createImageLayer(
    src: string,
    width: number,
    height: number,
    options: Partial<Layer> = {}
): Layer {
    const data: ImageLayerData = {
        type: 'image',
        src,
        width,
        height,
        filters: [],
    };
    return createLayer('image', data, options);
}

export function createShapeLayer(
    shapeType: ShapeLayerData['shapeType'],
    options: Partial<Layer> = {}
): Layer {
    const data: ShapeLayerData = {
        type: 'shape',
        shapeType,
        fill: { type: 'solid', color: '#cccccc' },
        stroke: { color: '#000000', width: 1, lineCap: 'round', lineJoin: 'round', miterLimit: 10 },
    };
    return createLayer('shape', data, { name: `${capitalizeFirst(shapeType)} 1`, ...options });
}

export function createTextLayer(
    text: string,
    options: Partial<Layer> = {}
): Layer {
    const data: TextLayerData = {
        type: 'text',
        text,
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        fill: { type: 'solid', color: '#000000' },
        editable: true,
    };
    return createLayer('text', data, { name: text.slice(0, 20) || 'Text Layer', ...options });
}

export function createGroupLayer(
    childIds: string[],
    options: Partial<Layer> = {}
): Layer {
    const data: GroupLayerData = {
        type: 'group',
        childIds,
        clipContent: false,
    };
    return createLayer('group', data, { name: 'Group 1', ...options });
}

export function createMaskLayer(
    maskType: 'raster' | 'vector',
    options: Partial<Layer> = {}
): Layer {
    const data: MaskLayerData = {
        type: 'mask',
        maskType,
        inverted: false,
        feather: 0,
        density: 100,
    };
    return createLayer('mask', data, { name: `${capitalizeFirst(maskType)} Mask`, ...options });
}

export function createVectorLayer(
    pathData: string,
    options: Partial<Layer> = {}
): Layer {
    const data: VectorLayerData = {
        type: 'vector',
        pathData,
        fill: { type: 'solid', color: '#cccccc' },
        stroke: { color: '#000000', width: 1, lineCap: 'round', lineJoin: 'round', miterLimit: 10 },
        fillRule: 'nonzero',
    };
    return createLayer('vector', data, { name: 'Vector 1', ...options });
}

// ============================================================================
// LAYER MANAGER CLASS
// ============================================================================

export interface LayerManagerState {
    layers: Layer[];
    selectedIds: string[];
    activeLayerId: string | null;
}

export interface LayerManagerEvents {
    onLayerAdd: (layer: Layer) => void;
    onLayerRemove: (layerId: string) => void;
    onLayerUpdate: (layer: Layer) => void;
    onLayerReorder: (layers: Layer[]) => void;
    onSelectionChange: (selectedIds: string[]) => void;
}

export class LayerManager {
    private layers: Map<string, Layer> = new Map();
    private order: string[] = [];
    private selectedIds: Set<string> = new Set();
    private activeLayerId: string | null = null;
    private listeners: Partial<LayerManagerEvents> = {};
    private layerCounter: Map<LayerType, number> = new Map();

    constructor(initialLayers: Layer[] = []) {
        initialLayers.forEach(layer => this.addLayerInternal(layer));
    }

    // ========================================================================
    // STATE GETTERS
    // ========================================================================

    getState(): LayerManagerState {
        return {
            layers: this.getOrderedLayers(),
            selectedIds: Array.from(this.selectedIds),
            activeLayerId: this.activeLayerId,
        };
    }

    getLayers(): Layer[] {
        return this.getOrderedLayers();
    }

    getLayer(id: string): Layer | undefined {
        return this.layers.get(id);
    }

    getOrderedLayers(): Layer[] {
        return this.order.map(id => this.layers.get(id)!).filter(Boolean);
    }

    getSelectedLayers(): Layer[] {
        return Array.from(this.selectedIds)
            .map(id => this.layers.get(id)!)
            .filter(Boolean);
    }

    getActiveLayer(): Layer | null {
        return this.activeLayerId ? this.layers.get(this.activeLayerId) || null : null;
    }

    getLayerIndex(id: string): number {
        return this.order.indexOf(id);
    }

    getLayerCount(): number {
        return this.layers.size;
    }

    // ========================================================================
    // LAYER OPERATIONS
    // ========================================================================

    addLayer(layer: Layer, index?: number): Layer {
        this.addLayerInternal(layer, index);
        this.emit('onLayerAdd', layer);
        return layer;
    }

    private addLayerInternal(layer: Layer, index?: number): void {
        this.layers.set(layer.id, layer);
        if (index !== undefined && index >= 0 && index <= this.order.length) {
            this.order.splice(index, 0, layer.id);
        } else {
            this.order.push(layer.id);
        }
    }

    removeLayer(id: string): boolean {
        const layer = this.layers.get(id);
        if (!layer) return false;

        // Remove from groups if part of one
        if (layer.parentId) {
            const parent = this.layers.get(layer.parentId);
            if (parent && parent.data.type === 'group') {
                const groupData = parent.data as GroupLayerData;
                groupData.childIds = groupData.childIds.filter(childId => childId !== id);
                this.updateLayer(layer.parentId, { data: groupData });
            }
        }

        // Remove children if group
        if (layer.type === 'group') {
            const groupData = layer.data as GroupLayerData;
            groupData.childIds.forEach(childId => this.removeLayer(childId));
        }

        this.layers.delete(id);
        this.order = this.order.filter(layerId => layerId !== id);
        this.selectedIds.delete(id);

        if (this.activeLayerId === id) {
            this.activeLayerId = this.order.length > 0 ? this.order[this.order.length - 1] : null;
        }

        this.emit('onLayerRemove', id);
        return true;
    }

    updateLayer(id: string, updates: Partial<Layer>): Layer | null {
        const layer = this.layers.get(id);
        if (!layer) return null;

        const updatedLayer: Layer = {
            ...layer,
            ...updates,
            updatedAt: Date.now(),
        };

        this.layers.set(id, updatedLayer);
        this.emit('onLayerUpdate', updatedLayer);
        return updatedLayer;
    }

    duplicateLayer(id: string): Layer | null {
        const layer = this.layers.get(id);
        if (!layer) return null;

        const newLayer = createLayer(layer.type, { ...layer.data } as LayerData, {
            name: `${layer.name} Copy`,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            transform: { ...layer.transform },
            effects: { ...layer.effects },
        });

        const index = this.getLayerIndex(id);
        this.addLayer(newLayer, index + 1);
        return newLayer;
    }

    // ========================================================================
    // LAYER PROPERTIES
    // ========================================================================

    setLayerVisibility(id: string, visible: boolean): Layer | null {
        return this.updateLayer(id, { visible });
    }

    toggleLayerVisibility(id: string): Layer | null {
        const layer = this.layers.get(id);
        if (!layer) return null;
        return this.updateLayer(id, { visible: !layer.visible });
    }

    setLayerLocked(id: string, locked: boolean): Layer | null {
        return this.updateLayer(id, { locked });
    }

    toggleLayerLocked(id: string): Layer | null {
        const layer = this.layers.get(id);
        if (!layer) return null;
        return this.updateLayer(id, { locked: !layer.locked });
    }

    setLayerOpacity(id: string, opacity: number): Layer | null {
        return this.updateLayer(id, { opacity: Math.max(0, Math.min(100, opacity)) });
    }

    setLayerBlendMode(id: string, blendMode: BlendMode): Layer | null {
        return this.updateLayer(id, { blendMode });
    }

    setLayerName(id: string, name: string): Layer | null {
        return this.updateLayer(id, { name });
    }

    setLayerTransform(id: string, transform: Partial<LayerTransform>): Layer | null {
        const layer = this.layers.get(id);
        if (!layer) return null;
        return this.updateLayer(id, {
            transform: { ...layer.transform, ...transform },
        });
    }

    setLayerEffects(id: string, effects: Partial<LayerEffects>): Layer | null {
        const layer = this.layers.get(id);
        if (!layer) return null;
        return this.updateLayer(id, {
            effects: { ...layer.effects, ...effects },
        });
    }

    // ========================================================================
    // LAYER ORDERING
    // ========================================================================

    moveLayer(id: string, newIndex: number): boolean {
        const currentIndex = this.order.indexOf(id);
        if (currentIndex === -1) return false;

        const targetIndex = Math.max(0, Math.min(this.order.length - 1, newIndex));
        if (currentIndex === targetIndex) return false;

        this.order.splice(currentIndex, 1);
        this.order.splice(targetIndex, 0, id);
        this.emit('onLayerReorder', this.getOrderedLayers());
        return true;
    }

    moveLayerUp(id: string): boolean {
        const index = this.order.indexOf(id);
        if (index === -1 || index === this.order.length - 1) return false;
        return this.moveLayer(id, index + 1);
    }

    moveLayerDown(id: string): boolean {
        const index = this.order.indexOf(id);
        if (index === -1 || index === 0) return false;
        return this.moveLayer(id, index - 1);
    }

    moveLayerToTop(id: string): boolean {
        return this.moveLayer(id, this.order.length - 1);
    }

    moveLayerToBottom(id: string): boolean {
        return this.moveLayer(id, 0);
    }

    reorderLayers(newOrder: string[]): boolean {
        // Validate that all IDs exist
        if (newOrder.length !== this.order.length) return false;
        if (!newOrder.every(id => this.layers.has(id))) return false;

        this.order = [...newOrder];
        this.emit('onLayerReorder', this.getOrderedLayers());
        return true;
    }

    // ========================================================================
    // SELECTION
    // ========================================================================

    selectLayer(id: string, addToSelection = false): void {
        if (!this.layers.has(id)) return;

        if (!addToSelection) {
            this.selectedIds.clear();
        }
        this.selectedIds.add(id);
        this.activeLayerId = id;
        this.emit('onSelectionChange', Array.from(this.selectedIds));
    }

    deselectLayer(id: string): void {
        this.selectedIds.delete(id);
        if (this.activeLayerId === id) {
            this.activeLayerId = this.selectedIds.size > 0
                ? Array.from(this.selectedIds)[this.selectedIds.size - 1]
                : null;
        }
        this.emit('onSelectionChange', Array.from(this.selectedIds));
    }

    selectLayers(ids: string[]): void {
        this.selectedIds.clear();
        ids.forEach(id => {
            if (this.layers.has(id)) {
                this.selectedIds.add(id);
            }
        });
        this.activeLayerId = ids.length > 0 ? ids[ids.length - 1] : null;
        this.emit('onSelectionChange', Array.from(this.selectedIds));
    }

    selectAllLayers(): void {
        this.selectedIds = new Set(this.order);
        this.activeLayerId = this.order.length > 0 ? this.order[this.order.length - 1] : null;
        this.emit('onSelectionChange', Array.from(this.selectedIds));
    }

    deselectAllLayers(): void {
        this.selectedIds.clear();
        this.activeLayerId = null;
        this.emit('onSelectionChange', []);
    }

    isLayerSelected(id: string): boolean {
        return this.selectedIds.has(id);
    }

    // ========================================================================
    // GROUPING
    // ========================================================================

    groupLayers(ids: string[]): Layer | null {
        if (ids.length < 2) return null;

        // Validate all layers exist
        if (!ids.every(id => this.layers.has(id))) return null;

        // Get the highest index of selected layers for group position
        const indices = ids.map(id => this.getLayerIndex(id));
        const highestIndex = Math.max(...indices);

        // Create group
        const group = createGroupLayer(ids, { name: 'Group' });

        // Update children to reference parent
        ids.forEach(id => {
            this.updateLayer(id, { parentId: group.id });
        });

        // Add group at highest position
        this.addLayer(group, highestIndex);

        // Remove children from top-level order (they're now in group)
        this.order = this.order.filter(id => !ids.includes(id) || id === group.id);

        return group;
    }

    ungroupLayer(groupId: string): string[] | null {
        const group = this.layers.get(groupId);
        if (!group || group.type !== 'group') return null;

        const groupData = group.data as GroupLayerData;
        const childIds = [...groupData.childIds];

        // Get group position
        const groupIndex = this.getLayerIndex(groupId);

        // Remove parent reference from children
        childIds.forEach(id => {
            this.updateLayer(id, { parentId: undefined });
        });

        // Insert children at group position
        this.order.splice(groupIndex, 0, ...childIds);

        // Remove group
        this.removeLayer(groupId);

        return childIds;
    }

    // ========================================================================
    // MASKING
    // ========================================================================

    addMaskToLayer(layerId: string, maskType: 'raster' | 'vector'): Layer | null {
        const layer = this.layers.get(layerId);
        if (!layer) return null;

        const mask = createMaskLayer(maskType);
        this.addLayer(mask);
        this.updateLayer(layerId, { maskId: mask.id });

        return mask;
    }

    removeMaskFromLayer(layerId: string): boolean {
        const layer = this.layers.get(layerId);
        if (!layer || !layer.maskId) return false;

        this.removeLayer(layer.maskId);
        this.updateLayer(layerId, { maskId: undefined });
        return true;
    }

    // ========================================================================
    // FLATTEN & MERGE
    // ========================================================================

    flattenLayers(ids: string[]): Layer | null {
        if (ids.length < 2) return null;

        // For now, return null - actual implementation would composite images
        // This requires canvas rendering which we'll implement in the canvas wrapper
        console.warn('Layer flattening requires canvas implementation');
        return null;
    }

    mergeDown(id: string): Layer | null {
        const index = this.getLayerIndex(id);
        if (index === -1 || index === 0) return null;

        const belowId = this.order[index - 1];
        return this.flattenLayers([belowId, id]);
    }

    mergeVisible(): Layer | null {
        const visibleIds = this.order.filter(id => this.layers.get(id)?.visible);
        if (visibleIds.length < 2) return null;
        return this.flattenLayers(visibleIds);
    }

    // ========================================================================
    // BATCH OPERATIONS
    // ========================================================================

    setMultipleLayersVisibility(ids: string[], visible: boolean): void {
        ids.forEach(id => this.setLayerVisibility(id, visible));
    }

    setMultipleLayersLocked(ids: string[], locked: boolean): void {
        ids.forEach(id => this.setLayerLocked(id, locked));
    }

    deleteSelectedLayers(): void {
        const selectedIds = Array.from(this.selectedIds);
        selectedIds.forEach(id => this.removeLayer(id));
    }

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    on<K extends keyof LayerManagerEvents>(
        event: K,
        callback: LayerManagerEvents[K]
    ): void {
        this.listeners[event] = callback;
    }

    off<K extends keyof LayerManagerEvents>(event: K): void {
        delete this.listeners[event];
    }

    private emit<K extends keyof LayerManagerEvents>(
        event: K,
        ...args: Parameters<NonNullable<LayerManagerEvents[K]>>
    ): void {
        const callback = this.listeners[event];
        if (callback) {
            (callback as (...args: unknown[]) => void)(...args);
        }
    }

    // ========================================================================
    // SERIALIZATION
    // ========================================================================

    toJSON(): { layers: Layer[]; order: string[] } {
        return {
            layers: Array.from(this.layers.values()),
            order: [...this.order],
        };
    }

    static fromJSON(data: { layers: Layer[]; order: string[] }): LayerManager {
        const manager = new LayerManager();
        data.layers.forEach(layer => manager.layers.set(layer.id, layer));
        manager.order = data.order;
        return manager;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    clear(): void {
        this.layers.clear();
        this.order = [];
        this.selectedIds.clear();
        this.activeLayerId = null;
        this.layerCounter.clear();
    }

    getNextLayerNumber(type: LayerType): number {
        const count = (this.layerCounter.get(type) || 0) + 1;
        this.layerCounter.set(type, count);
        return count;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

let layerIdCounter = 0;

function generateLayerId(): string {
    return `layer_${Date.now()}_${++layerIdCounter}`;
}

function getDefaultLayerName(type: LayerType): string {
    const names: Record<LayerType, string> = {
        image: 'Image',
        shape: 'Shape',
        text: 'Text',
        group: 'Group',
        mask: 'Mask',
        adjustment: 'Adjustment',
        pattern: 'Pattern',
        vector: 'Vector',
    };
    return names[type] || 'Layer';
}

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const layerManager = new LayerManager();

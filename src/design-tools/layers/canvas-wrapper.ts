/**
 * Fabric.js Canvas Wrapper
 *
 * Integrates Fabric.js with our layer system for professional design editing.
 */

import {
    Layer,
    LayerType,
    LayerTransform,
    BlendMode,
    FillStyle,
    StrokeStyle,
    ImageLayerData,
    ShapeLayerData,
    TextLayerData,
    VectorLayerData,
    CanvasSettings,
    DEFAULT_CANVAS_SETTINGS,
} from '../types';
import { LayerManager, createImageLayer, createShapeLayer, createTextLayer, createVectorLayer } from './layer-manager';
import { LayerHistory, createLayerHistory } from './layer-history';

// ============================================================================
// TYPES
// ============================================================================

// Fabric.js type stubs for when the library isn't loaded
interface FabricCanvas {
    add: (...objects: FabricObject[]) => FabricCanvas;
    remove: (...objects: FabricObject[]) => FabricCanvas;
    renderAll: () => FabricCanvas;
    clear: () => FabricCanvas;
    getObjects: () => FabricObject[];
    setWidth: (width: number) => FabricCanvas;
    setHeight: (height: number) => FabricCanvas;
    setBackgroundColor: (color: string, callback?: () => void) => FabricCanvas;
    setZoom: (zoom: number) => FabricCanvas;
    getZoom: () => number;
    absolutePan: (point: { x: number; y: number }) => void;
    relativePan: (point: { x: number; y: number }) => void;
    viewportTransform: number[];
    toJSON: () => object;
    toDataURL: (options?: DataURLOptions) => string;
    toBlob: (callback: (blob: Blob | null) => void, format?: string, quality?: number) => void;
    loadFromJSON: (json: object, callback?: () => void) => FabricCanvas;
    dispose: () => void;
    on: (event: string, handler: (e: FabricEvent) => void) => FabricCanvas;
    off: (event: string, handler?: (e: FabricEvent) => void) => FabricCanvas;
    setActiveObject: (object: FabricObject) => FabricCanvas;
    discardActiveObject: () => FabricCanvas;
    getActiveObject: () => FabricObject | null;
    getActiveObjects: () => FabricObject[];
    bringForward: (object: FabricObject) => FabricCanvas;
    sendBackwards: (object: FabricObject) => FabricCanvas;
    bringToFront: (object: FabricObject) => FabricCanvas;
    sendToBack: (object: FabricObject) => FabricCanvas;
    requestRenderAll: () => void;
    isDrawingMode: boolean;
    freeDrawingBrush: FabricBrush;
    selection: boolean;
}

interface FabricObject {
    id?: string;
    type: string;
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    opacity: number;
    visible: boolean;
    selectable: boolean;
    evented: boolean;
    lockMovementX: boolean;
    lockMovementY: boolean;
    lockRotation: boolean;
    lockScalingX: boolean;
    lockScalingY: boolean;
    set: (key: string | object, value?: unknown) => FabricObject;
    get: (key: string) => unknown;
    toJSON: () => object;
    clone: (callback: (clone: FabricObject) => void) => void;
    setCoords: () => FabricObject;
    getBoundingRect: () => { left: number; top: number; width: number; height: number };
    globalCompositeOperation?: string;
}

interface FabricBrush {
    color: string;
    width: number;
    shadow?: FabricShadow;
}

interface FabricShadow {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
}

interface FabricEvent {
    target?: FabricObject;
    e?: Event;
    transform?: unknown;
    pointer?: { x: number; y: number };
}

interface DataURLOptions {
    format?: string;
    quality?: number;
    multiplier?: number;
    left?: number;
    top?: number;
    width?: number;
    height?: number;
}

// Declare fabric as a global that might exist
declare const fabric: {
    Canvas: new (el: HTMLCanvasElement | string, options?: object) => FabricCanvas;
    Image: {
        fromURL: (url: string, callback: (img: FabricObject) => void, options?: object) => void;
    };
    Rect: new (options?: object) => FabricObject;
    Circle: new (options?: object) => FabricObject;
    Ellipse: new (options?: object) => FabricObject;
    Triangle: new (options?: object) => FabricObject;
    Polygon: new (points: Array<{ x: number; y: number }>, options?: object) => FabricObject;
    Line: new (points: number[], options?: object) => FabricObject;
    Path: new (path: string, options?: object) => FabricObject;
    Text: new (text: string, options?: object) => FabricObject;
    IText: new (text: string, options?: object) => FabricObject;
    Textbox: new (text: string, options?: object) => FabricObject;
    Group: new (objects: FabricObject[], options?: object) => FabricObject;
    ActiveSelection: new (objects: FabricObject[], options?: object) => FabricObject;
    PencilBrush: new (canvas: FabricCanvas) => FabricBrush;
    Point: new (x: number, y: number) => { x: number; y: number };
} | undefined;

export interface CanvasWrapperOptions {
    container: HTMLCanvasElement | string;
    settings?: Partial<CanvasSettings>;
    enableHistory?: boolean;
    historySize?: number;
}

export interface CanvasWrapperEvents {
    onLayerSelect: (layerIds: string[]) => void;
    onLayerModified: (layerId: string, changes: Partial<Layer>) => void;
    onCanvasModified: () => void;
    onZoomChange: (zoom: number) => void;
    onPanChange: (pan: { x: number; y: number }) => void;
    onError: (error: Error) => void;
}

// ============================================================================
// CANVAS WRAPPER CLASS
// ============================================================================

export class CanvasWrapper {
    private canvas: FabricCanvas | null = null;
    private layerManager: LayerManager;
    private history: LayerHistory | null = null;
    private settings: CanvasSettings;
    private objectLayerMap: Map<FabricObject, string> = new Map();
    private layerObjectMap: Map<string, FabricObject> = new Map();
    private listeners: Partial<CanvasWrapperEvents> = {};
    private isInitialized: boolean = false;
    private isFabricAvailable: boolean = false;

    constructor(options: CanvasWrapperOptions) {
        this.settings = { ...DEFAULT_CANVAS_SETTINGS, ...options.settings };
        this.layerManager = new LayerManager();

        if (options.enableHistory !== false) {
            this.history = createLayerHistory(this.layerManager, {
                maxHistorySize: options.historySize || 100,
            });
        }

        this.checkFabricAvailability();

        if (this.isFabricAvailable) {
            this.initializeFabricCanvas(options.container);
        }
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    private checkFabricAvailability(): void {
        this.isFabricAvailable = typeof fabric !== 'undefined' && fabric !== null;
        if (!this.isFabricAvailable) {
            console.warn('[CanvasWrapper] Fabric.js not loaded. Running in mock mode.');
        }
    }

    private initializeFabricCanvas(container: HTMLCanvasElement | string): void {
        if (!this.isFabricAvailable || !fabric) return;

        try {
            this.canvas = new fabric.Canvas(container, {
                width: this.settings.size.width,
                height: this.settings.size.height,
                backgroundColor: this.settings.backgroundTransparent
                    ? 'transparent'
                    : this.settings.backgroundColor,
                preserveObjectStacking: true,
                selection: true,
                renderOnAddRemove: true,
            });

            this.setupCanvasEvents();
            this.isInitialized = true;
        } catch (error) {
            console.error('[CanvasWrapper] Failed to initialize Fabric.js canvas:', error);
            this.emit('onError', error as Error);
        }
    }

    private setupCanvasEvents(): void {
        if (!this.canvas) return;

        this.canvas.on('selection:created', (e) => {
            this.handleSelectionChange(e);
        });

        this.canvas.on('selection:updated', (e) => {
            this.handleSelectionChange(e);
        });

        this.canvas.on('selection:cleared', () => {
            this.layerManager.deselectAllLayers();
            this.emit('onLayerSelect', []);
        });

        this.canvas.on('object:modified', (e) => {
            if (e.target) {
                this.syncObjectToLayer(e.target);
            }
            this.emit('onCanvasModified');
        });

        this.canvas.on('object:moving', (e) => {
            if (e.target) {
                this.syncObjectToLayer(e.target);
            }
        });

        this.canvas.on('object:scaling', (e) => {
            if (e.target) {
                this.syncObjectToLayer(e.target);
            }
        });

        this.canvas.on('object:rotating', (e) => {
            if (e.target) {
                this.syncObjectToLayer(e.target);
            }
        });
    }

    private handleSelectionChange(e: FabricEvent): void {
        const activeObjects = this.canvas?.getActiveObjects() || [];
        const selectedLayerIds = activeObjects
            .map(obj => this.objectLayerMap.get(obj))
            .filter((id): id is string => id !== undefined);

        selectedLayerIds.forEach((id, index) => {
            this.layerManager.selectLayer(id, index > 0);
        });

        this.emit('onLayerSelect', selectedLayerIds);
    }

    // ========================================================================
    // LAYER OPERATIONS
    // ========================================================================

    addImageLayer(src: string, options: { x?: number; y?: number; name?: string } = {}): Promise<Layer> {
        return new Promise((resolve, reject) => {
            const layer = createImageLayer(src, 0, 0, {
                name: options.name || 'Image',
                transform: {
                    ...this.layerManager.getLayer('')?.transform || {
                        x: options.x || 0,
                        y: options.y || 0,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                        skewX: 0,
                        skewY: 0,
                        originX: 'center',
                        originY: 'center',
                    },
                },
            });

            if (this.isFabricAvailable && fabric && this.canvas) {
                fabric.Image.fromURL(src, (img) => {
                    if (!img || !this.canvas) {
                        reject(new Error('Failed to load image'));
                        return;
                    }

                    img.set({
                        left: options.x || this.settings.size.width / 2,
                        top: options.y || this.settings.size.height / 2,
                        originX: 'center',
                        originY: 'center',
                    });

                    // Update layer with actual dimensions
                    const imageData = layer.data as ImageLayerData;
                    imageData.width = img.width || 0;
                    imageData.height = img.height || 0;

                    this.linkObjectToLayer(img, layer);
                    this.canvas.add(img);
                    this.layerManager.addLayer(layer);
                    this.canvas.renderAll();

                    resolve(layer);
                }, { crossOrigin: 'anonymous' });
            } else {
                // Mock mode - just add layer to manager
                this.layerManager.addLayer(layer);
                resolve(layer);
            }
        });
    }

    addShapeLayer(
        shapeType: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line',
        options: { x?: number; y?: number; width?: number; height?: number; name?: string } = {}
    ): Layer {
        const layer = createShapeLayer(shapeType, {
            name: options.name || capitalizeFirst(shapeType),
            transform: {
                x: options.x || this.settings.size.width / 2,
                y: options.y || this.settings.size.height / 2,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                skewX: 0,
                skewY: 0,
                originX: 'center',
                originY: 'center',
            },
        });

        if (this.isFabricAvailable && fabric && this.canvas) {
            const fabricObject = this.createFabricShape(shapeType, {
                left: options.x || this.settings.size.width / 2,
                top: options.y || this.settings.size.height / 2,
                width: options.width || 100,
                height: options.height || 100,
            });

            if (fabricObject) {
                this.linkObjectToLayer(fabricObject, layer);
                this.canvas.add(fabricObject);
                this.canvas.renderAll();
            }
        }

        this.layerManager.addLayer(layer);
        return layer;
    }

    addTextLayer(text: string, options: { x?: number; y?: number; fontSize?: number; fontFamily?: string } = {}): Layer {
        const layer = createTextLayer(text, {
            transform: {
                x: options.x || this.settings.size.width / 2,
                y: options.y || this.settings.size.height / 2,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                skewX: 0,
                skewY: 0,
                originX: 'center',
                originY: 'center',
            },
        });

        if (this.isFabricAvailable && fabric && this.canvas) {
            const textObject = new fabric.IText(text, {
                left: options.x || this.settings.size.width / 2,
                top: options.y || this.settings.size.height / 2,
                fontSize: options.fontSize || 24,
                fontFamily: options.fontFamily || 'Inter',
                originX: 'center',
                originY: 'center',
            });

            this.linkObjectToLayer(textObject, layer);
            this.canvas.add(textObject);
            this.canvas.renderAll();
        }

        this.layerManager.addLayer(layer);
        return layer;
    }

    addVectorLayer(pathData: string, options: { x?: number; y?: number; name?: string } = {}): Layer {
        const layer = createVectorLayer(pathData, {
            name: options.name || 'Vector',
            transform: {
                x: options.x || 0,
                y: options.y || 0,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                skewX: 0,
                skewY: 0,
                originX: 'center',
                originY: 'center',
            },
        });

        if (this.isFabricAvailable && fabric && this.canvas) {
            const pathObject = new fabric.Path(pathData, {
                left: options.x || this.settings.size.width / 2,
                top: options.y || this.settings.size.height / 2,
                fill: '#cccccc',
                stroke: '#000000',
                strokeWidth: 1,
                originX: 'center',
                originY: 'center',
            });

            this.linkObjectToLayer(pathObject, layer);
            this.canvas.add(pathObject);
            this.canvas.renderAll();
        }

        this.layerManager.addLayer(layer);
        return layer;
    }

    removeLayer(layerId: string): boolean {
        const fabricObject = this.layerObjectMap.get(layerId);

        if (fabricObject && this.canvas) {
            this.canvas.remove(fabricObject);
            this.objectLayerMap.delete(fabricObject);
            this.layerObjectMap.delete(layerId);
            this.canvas.renderAll();
        }

        return this.layerManager.removeLayer(layerId);
    }

    // ========================================================================
    // LAYER PROPERTY UPDATES
    // ========================================================================

    setLayerVisibility(layerId: string, visible: boolean): void {
        this.layerManager.setLayerVisibility(layerId, visible);
        const fabricObject = this.layerObjectMap.get(layerId);
        if (fabricObject) {
            fabricObject.set('visible', visible);
            this.canvas?.renderAll();
        }
    }

    setLayerOpacity(layerId: string, opacity: number): void {
        this.layerManager.setLayerOpacity(layerId, opacity);
        const fabricObject = this.layerObjectMap.get(layerId);
        if (fabricObject) {
            fabricObject.set('opacity', opacity / 100);
            this.canvas?.renderAll();
        }
    }

    setLayerLocked(layerId: string, locked: boolean): void {
        this.layerManager.setLayerLocked(layerId, locked);
        const fabricObject = this.layerObjectMap.get(layerId);
        if (fabricObject) {
            fabricObject.set({
                selectable: !locked,
                evented: !locked,
                lockMovementX: locked,
                lockMovementY: locked,
                lockRotation: locked,
                lockScalingX: locked,
                lockScalingY: locked,
            } as object);
            this.canvas?.renderAll();
        }
    }

    setLayerBlendMode(layerId: string, blendMode: BlendMode): void {
        this.layerManager.setLayerBlendMode(layerId, blendMode);
        const fabricObject = this.layerObjectMap.get(layerId);
        if (fabricObject) {
            // Map blend modes to canvas composite operations
            const compositeMap: Record<BlendMode, string> = {
                'normal': 'source-over',
                'multiply': 'multiply',
                'screen': 'screen',
                'overlay': 'overlay',
                'darken': 'darken',
                'lighten': 'lighten',
                'color-dodge': 'color-dodge',
                'color-burn': 'color-burn',
                'hard-light': 'hard-light',
                'soft-light': 'soft-light',
                'difference': 'difference',
                'exclusion': 'exclusion',
                'hue': 'hue',
                'saturation': 'saturation',
                'color': 'color',
                'luminosity': 'luminosity',
            };
            fabricObject.globalCompositeOperation = compositeMap[blendMode];
            this.canvas?.renderAll();
        }
    }

    // ========================================================================
    // LAYER ORDERING
    // ========================================================================

    moveLayerUp(layerId: string): void {
        if (this.layerManager.moveLayerUp(layerId)) {
            const fabricObject = this.layerObjectMap.get(layerId);
            if (fabricObject && this.canvas) {
                this.canvas.bringForward(fabricObject);
            }
        }
    }

    moveLayerDown(layerId: string): void {
        if (this.layerManager.moveLayerDown(layerId)) {
            const fabricObject = this.layerObjectMap.get(layerId);
            if (fabricObject && this.canvas) {
                this.canvas.sendBackwards(fabricObject);
            }
        }
    }

    moveLayerToTop(layerId: string): void {
        if (this.layerManager.moveLayerToTop(layerId)) {
            const fabricObject = this.layerObjectMap.get(layerId);
            if (fabricObject && this.canvas) {
                this.canvas.bringToFront(fabricObject);
            }
        }
    }

    moveLayerToBottom(layerId: string): void {
        if (this.layerManager.moveLayerToBottom(layerId)) {
            const fabricObject = this.layerObjectMap.get(layerId);
            if (fabricObject && this.canvas) {
                this.canvas.sendToBack(fabricObject);
            }
        }
    }

    // ========================================================================
    // SELECTION
    // ========================================================================

    selectLayer(layerId: string, addToSelection = false): void {
        this.layerManager.selectLayer(layerId, addToSelection);
        const fabricObject = this.layerObjectMap.get(layerId);
        if (fabricObject && this.canvas) {
            this.canvas.setActiveObject(fabricObject);
            this.canvas.renderAll();
        }
    }

    deselectAll(): void {
        this.layerManager.deselectAllLayers();
        this.canvas?.discardActiveObject();
        this.canvas?.renderAll();
    }

    // ========================================================================
    // ZOOM & PAN
    // ========================================================================

    setZoom(zoom: number): void {
        const clampedZoom = Math.max(0.1, Math.min(10, zoom));
        this.canvas?.setZoom(clampedZoom);
        this.canvas?.renderAll();
        this.emit('onZoomChange', clampedZoom);
    }

    getZoom(): number {
        return this.canvas?.getZoom() || 1;
    }

    zoomIn(factor = 1.2): void {
        this.setZoom(this.getZoom() * factor);
    }

    zoomOut(factor = 1.2): void {
        this.setZoom(this.getZoom() / factor);
    }

    zoomToFit(): void {
        if (!this.canvas) return;

        const canvasWidth = this.settings.size.width;
        const canvasHeight = this.settings.size.height;

        // This would need the viewport dimensions
        // For now, just reset to 100%
        this.setZoom(1);
    }

    pan(deltaX: number, deltaY: number): void {
        if (!this.canvas || !fabric) return;
        const point = new fabric.Point(deltaX, deltaY);
        this.canvas.relativePan(point);

        const vpt = this.canvas.viewportTransform;
        this.emit('onPanChange', { x: vpt[4], y: vpt[5] });
    }

    resetPan(): void {
        if (!this.canvas || !fabric) return;
        const vpt = this.canvas.viewportTransform;
        this.canvas.absolutePan(new fabric.Point(-vpt[4], -vpt[5]));
        this.emit('onPanChange', { x: 0, y: 0 });
    }

    // ========================================================================
    // HISTORY
    // ========================================================================

    undo(): boolean {
        return this.history?.undo() || false;
    }

    redo(): boolean {
        return this.history?.redo() || false;
    }

    canUndo(): boolean {
        return this.history?.canUndo() || false;
    }

    canRedo(): boolean {
        return this.history?.canRedo() || false;
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    toDataURL(format: 'png' | 'jpeg' | 'webp' = 'png', quality = 1): string {
        if (!this.canvas) return '';
        return this.canvas.toDataURL({
            format,
            quality,
            multiplier: 1,
        });
    }

    toBlob(format: 'png' | 'jpeg' | 'webp' = 'png', quality = 1): Promise<Blob | null> {
        return new Promise((resolve) => {
            if (!this.canvas) {
                resolve(null);
                return;
            }

            // Fabric.js toBlob
            this.canvas.toBlob((blob) => {
                resolve(blob);
            }, `image/${format}`, quality);
        });
    }

    toJSON(): object {
        return {
            settings: this.settings,
            layers: this.layerManager.toJSON(),
            canvas: this.canvas?.toJSON() || null,
        };
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    getLayers(): Layer[] {
        return this.layerManager.getLayers();
    }

    getSelectedLayers(): Layer[] {
        return this.layerManager.getSelectedLayers();
    }

    getActiveLayer(): Layer | null {
        return this.layerManager.getActiveLayer();
    }

    getSettings(): CanvasSettings {
        return { ...this.settings };
    }

    getFabricCanvas(): FabricCanvas | null {
        return this.canvas;
    }

    getLayerManager(): LayerManager {
        return this.layerManager;
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private createFabricShape(
        shapeType: string,
        options: { left: number; top: number; width: number; height: number }
    ): FabricObject | null {
        if (!fabric) return null;

        const baseOptions = {
            ...options,
            fill: '#cccccc',
            stroke: '#000000',
            strokeWidth: 1,
            originX: 'center' as const,
            originY: 'center' as const,
        };

        switch (shapeType) {
            case 'rectangle':
                return new fabric.Rect(baseOptions);
            case 'ellipse':
                return new fabric.Ellipse({
                    ...baseOptions,
                    rx: options.width / 2,
                    ry: options.height / 2,
                });
            case 'polygon':
                // Create a hexagon by default
                const sides = 6;
                const radius = Math.min(options.width, options.height) / 2;
                const points = [];
                for (let i = 0; i < sides; i++) {
                    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                    points.push({
                        x: radius * Math.cos(angle),
                        y: radius * Math.sin(angle),
                    });
                }
                return new fabric.Polygon(points, baseOptions);
            case 'line':
                return new fabric.Line(
                    [0, 0, options.width, options.height],
                    { ...baseOptions, fill: undefined }
                );
            default:
                return new fabric.Rect(baseOptions);
        }
    }

    private linkObjectToLayer(obj: FabricObject, layer: Layer): void {
        obj.id = layer.id;
        this.objectLayerMap.set(obj, layer.id);
        this.layerObjectMap.set(layer.id, obj);
    }

    private syncObjectToLayer(obj: FabricObject): void {
        const layerId = this.objectLayerMap.get(obj);
        if (!layerId) return;

        const transform: Partial<LayerTransform> = {
            x: obj.left,
            y: obj.top,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            rotation: obj.angle,
        };

        this.layerManager.setLayerTransform(layerId, transform);

        const layer = this.layerManager.getLayer(layerId);
        if (layer) {
            this.emit('onLayerModified', layerId, { transform: layer.transform });
        }
    }

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    on<K extends keyof CanvasWrapperEvents>(
        event: K,
        callback: CanvasWrapperEvents[K]
    ): void {
        this.listeners[event] = callback;
    }

    off<K extends keyof CanvasWrapperEvents>(event: K): void {
        delete this.listeners[event];
    }

    private emit<K extends keyof CanvasWrapperEvents>(
        event: K,
        ...args: Parameters<NonNullable<CanvasWrapperEvents[K]>>
    ): void {
        const callback = this.listeners[event];
        if (callback) {
            (callback as (...args: unknown[]) => void)(...args);
        }
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    dispose(): void {
        this.canvas?.dispose();
        this.canvas = null;
        this.objectLayerMap.clear();
        this.layerObjectMap.clear();
        this.layerManager.clear();
        this.history?.clear();
        this.isInitialized = false;
    }
}

// ============================================================================
// UTILITY
// ============================================================================

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// FACTORY
// ============================================================================

export function createCanvasWrapper(options: CanvasWrapperOptions): CanvasWrapper {
    return new CanvasWrapper(options);
}

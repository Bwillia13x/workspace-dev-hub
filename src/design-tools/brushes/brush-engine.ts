/**
 * Brush Engine - Professional brush system for digital painting
 *
 * Provides:
 * - Customizable brush presets
 * - Pressure sensitivity support
 * - Texture brushes
 * - Brush dynamics (jitter, scatter, rotation)
 * - Custom brush creation
 * - Stroke smoothing
 */

import {
    Point,
    BlendMode,
} from '../types';

// ============================================================================
// Brush Types
// ============================================================================

export interface BrushSettings {
    id: string;
    name: string;
    category: BrushCategory;

    // Size
    size: number;
    sizeMin: number;
    sizeMax: number;

    // Shape
    hardness: number;       // 0-100
    roundness: number;      // 0-100
    angle: number;          // 0-360
    spacing: number;        // 1-500% of brush size

    // Color
    opacity: number;        // 0-100
    flow: number;           // 0-100
    blendMode: BlendMode;

    // Dynamics
    dynamics: BrushDynamics;

    // Texture
    texture?: BrushTexture;

    // Smoothing
    smoothing: number;      // 0-100
    lazyRadius: number;     // Lazy mouse radius

    // Advanced
    transfer?: BrushTransfer;
    dualBrush?: DualBrushSettings;
}

export type BrushCategory =
    | 'basic'
    | 'artistic'
    | 'texture'
    | 'sketch'
    | 'ink'
    | 'watercolor'
    | 'chalk'
    | 'pencil'
    | 'marker'
    | 'airbrush'
    | 'special'
    | 'custom';

export interface BrushDynamics {
    // Size dynamics
    sizePressure: boolean;
    sizeJitter: number;         // 0-100 random variation
    sizeMinimum: number;        // 0-100 minimum size

    // Opacity dynamics
    opacityPressure: boolean;
    opacityJitter: number;
    opacityMinimum: number;

    // Flow dynamics
    flowPressure: boolean;
    flowJitter: number;
    flowMinimum: number;

    // Angle dynamics
    anglePressure: boolean;
    angleJitter: number;
    angleInitial: boolean;      // Use initial direction
    angleDirection: boolean;    // Follow stroke direction

    // Roundness dynamics
    roundnessPressure: boolean;
    roundnessJitter: number;
    roundnessMinimum: number;

    // Scatter
    scatterBoth: boolean;
    scatterAmount: number;      // 0-1000%
    scatterCount: number;       // 1-16
    scatterPressure: boolean;
}

export interface BrushTexture {
    id: string;
    name: string;
    imageData: string;          // Base64 image
    width: number;
    height: number;
    scale: number;              // 1-1000%
    brightness: number;         // -100 to 100
    contrast: number;           // -100 to 100
    mode: TextureMode;
    depth: number;              // 0-100
    invert: boolean;
    textureTile: boolean;
}

export type TextureMode =
    | 'multiply'
    | 'subtract'
    | 'darken'
    | 'lighten'
    | 'color-burn'
    | 'color-dodge'
    | 'overlay'
    | 'soft-light'
    | 'hard-light';

export interface BrushTransfer {
    // Build-up behavior
    buildUp: boolean;

    // Wetness simulation
    wetEdges: boolean;
    wetEdgesAmount: number;

    // Noise
    noise: boolean;
    noiseAmount: number;

    // Protect texture
    protectTexture: boolean;
}

export interface DualBrushSettings {
    enabled: boolean;
    brushId: string;
    mode: BlendMode;
    size: number;
    spacing: number;
    scatter: number;
    count: number;
}

// ============================================================================
// Stroke Types
// ============================================================================

export interface StrokePoint {
    x: number;
    y: number;
    pressure: number;           // 0-1
    tiltX?: number;             // -90 to 90
    tiltY?: number;             // -90 to 90
    timestamp: number;
}

export interface Stroke {
    id: string;
    brushId: string;
    color: string;
    points: StrokePoint[];
    blendMode: BlendMode;
    opacity: number;
}

export interface StrokeRenderOptions {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    color: string;
    brush: BrushSettings;
}

// ============================================================================
// Brush Engine Events
// ============================================================================

export interface BrushEngineEvents {
    'brush:selected': { brush: BrushSettings };
    'brush:updated': { brush: BrushSettings };
    'brush:created': { brush: BrushSettings };
    'brush:deleted': { brushId: string };
    'stroke:started': { stroke: Stroke };
    'stroke:updated': { stroke: Stroke; point: StrokePoint };
    'stroke:ended': { stroke: Stroke };
}

type BrushEventCallback<K extends keyof BrushEngineEvents> = (data: BrushEngineEvents[K]) => void;

// ============================================================================
// Default Brush Presets
// ============================================================================

export const DEFAULT_DYNAMICS: BrushDynamics = {
    sizePressure: true,
    sizeJitter: 0,
    sizeMinimum: 20,
    opacityPressure: false,
    opacityJitter: 0,
    opacityMinimum: 0,
    flowPressure: true,
    flowJitter: 0,
    flowMinimum: 20,
    anglePressure: false,
    angleJitter: 0,
    angleInitial: false,
    angleDirection: false,
    roundnessPressure: false,
    roundnessJitter: 0,
    roundnessMinimum: 25,
    scatterBoth: true,
    scatterAmount: 0,
    scatterCount: 1,
    scatterPressure: false,
};

const BRUSH_PRESETS: BrushSettings[] = [
    // Basic brushes
    {
        id: 'basic-round-soft',
        name: 'Soft Round',
        category: 'basic',
        size: 30,
        sizeMin: 1,
        sizeMax: 500,
        hardness: 0,
        roundness: 100,
        angle: 0,
        spacing: 25,
        opacity: 100,
        flow: 100,
        blendMode: 'normal',
        dynamics: { ...DEFAULT_DYNAMICS },
        smoothing: 50,
        lazyRadius: 0,
    },
    {
        id: 'basic-round-hard',
        name: 'Hard Round',
        category: 'basic',
        size: 30,
        sizeMin: 1,
        sizeMax: 500,
        hardness: 100,
        roundness: 100,
        angle: 0,
        spacing: 25,
        opacity: 100,
        flow: 100,
        blendMode: 'normal',
        dynamics: { ...DEFAULT_DYNAMICS },
        smoothing: 50,
        lazyRadius: 0,
    },

    // Sketch brushes
    {
        id: 'pencil-hb',
        name: 'HB Pencil',
        category: 'pencil',
        size: 4,
        sizeMin: 1,
        sizeMax: 20,
        hardness: 80,
        roundness: 100,
        angle: 0,
        spacing: 15,
        opacity: 90,
        flow: 80,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            sizeMinimum: 10,
            opacityPressure: true,
            opacityMinimum: 30,
        },
        smoothing: 30,
        lazyRadius: 0,
        transfer: {
            buildUp: true,
            wetEdges: false,
            wetEdgesAmount: 0,
            noise: true,
            noiseAmount: 20,
            protectTexture: false,
        },
    },
    {
        id: 'pencil-sketch',
        name: 'Sketch Pencil',
        category: 'sketch',
        size: 3,
        sizeMin: 1,
        sizeMax: 15,
        hardness: 90,
        roundness: 80,
        angle: 45,
        spacing: 10,
        opacity: 85,
        flow: 90,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            sizeMinimum: 20,
            angleJitter: 5,
        },
        smoothing: 20,
        lazyRadius: 0,
    },

    // Ink brushes
    {
        id: 'ink-pen',
        name: 'Ink Pen',
        category: 'ink',
        size: 3,
        sizeMin: 1,
        sizeMax: 20,
        hardness: 100,
        roundness: 100,
        angle: 0,
        spacing: 5,
        opacity: 100,
        flow: 100,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            sizeMinimum: 30,
        },
        smoothing: 60,
        lazyRadius: 0,
    },
    {
        id: 'ink-brush',
        name: 'Ink Brush',
        category: 'ink',
        size: 15,
        sizeMin: 1,
        sizeMax: 100,
        hardness: 100,
        roundness: 100,
        angle: 0,
        spacing: 8,
        opacity: 100,
        flow: 100,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            sizeMinimum: 5,
            opacityPressure: true,
            opacityMinimum: 50,
        },
        smoothing: 40,
        lazyRadius: 0,
    },

    // Marker brushes
    {
        id: 'marker-chisel',
        name: 'Chisel Marker',
        category: 'marker',
        size: 20,
        sizeMin: 5,
        sizeMax: 100,
        hardness: 100,
        roundness: 30,
        angle: 45,
        spacing: 20,
        opacity: 70,
        flow: 100,
        blendMode: 'multiply',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: false,
            angleDirection: true,
        },
        smoothing: 30,
        lazyRadius: 0,
    },
    {
        id: 'marker-round',
        name: 'Round Marker',
        category: 'marker',
        size: 12,
        sizeMin: 3,
        sizeMax: 50,
        hardness: 100,
        roundness: 100,
        angle: 0,
        spacing: 15,
        opacity: 60,
        flow: 100,
        blendMode: 'multiply',
        dynamics: { ...DEFAULT_DYNAMICS, sizePressure: false },
        smoothing: 30,
        lazyRadius: 0,
    },

    // Artistic brushes
    {
        id: 'watercolor-wet',
        name: 'Wet Watercolor',
        category: 'watercolor',
        size: 40,
        sizeMin: 10,
        sizeMax: 200,
        hardness: 0,
        roundness: 100,
        angle: 0,
        spacing: 25,
        opacity: 30,
        flow: 50,
        blendMode: 'multiply',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            sizeJitter: 10,
            opacityPressure: true,
            opacityJitter: 15,
        },
        smoothing: 60,
        lazyRadius: 0,
        transfer: {
            buildUp: true,
            wetEdges: true,
            wetEdgesAmount: 50,
            noise: false,
            noiseAmount: 0,
            protectTexture: false,
        },
    },
    {
        id: 'chalk',
        name: 'Chalk',
        category: 'chalk',
        size: 25,
        sizeMin: 5,
        sizeMax: 100,
        hardness: 30,
        roundness: 80,
        angle: 0,
        spacing: 30,
        opacity: 80,
        flow: 70,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            opacityPressure: true,
            angleJitter: 10,
        },
        smoothing: 20,
        lazyRadius: 0,
    },

    // Airbrush
    {
        id: 'airbrush-soft',
        name: 'Soft Airbrush',
        category: 'airbrush',
        size: 100,
        sizeMin: 20,
        sizeMax: 500,
        hardness: 0,
        roundness: 100,
        angle: 0,
        spacing: 5,
        opacity: 15,
        flow: 30,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            flowPressure: true,
        },
        smoothing: 80,
        lazyRadius: 0,
        transfer: {
            buildUp: true,
            wetEdges: false,
            wetEdgesAmount: 0,
            noise: false,
            noiseAmount: 0,
            protectTexture: false,
        },
    },

    // Fashion-specific brushes
    {
        id: 'fashion-sketch',
        name: 'Fashion Sketch',
        category: 'sketch',
        size: 2,
        sizeMin: 1,
        sizeMax: 10,
        hardness: 95,
        roundness: 100,
        angle: 0,
        spacing: 5,
        opacity: 95,
        flow: 100,
        blendMode: 'normal',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            sizeMinimum: 40,
        },
        smoothing: 70,
        lazyRadius: 5,
    },
    {
        id: 'fabric-texture',
        name: 'Fabric Texture',
        category: 'texture',
        size: 50,
        sizeMin: 20,
        sizeMax: 200,
        hardness: 50,
        roundness: 100,
        angle: 0,
        spacing: 40,
        opacity: 40,
        flow: 60,
        blendMode: 'multiply',
        dynamics: {
            ...DEFAULT_DYNAMICS,
            sizePressure: true,
            angleJitter: 5,
            scatterAmount: 20,
        },
        smoothing: 30,
        lazyRadius: 0,
    },
];

// ============================================================================
// Brush Engine Class
// ============================================================================

export class BrushEngine {
    private brushes: Map<string, BrushSettings> = new Map();
    private currentBrush: BrushSettings;
    private currentStroke: Stroke | null = null;
    private eventListeners: Map<string, Set<BrushEventCallback<keyof BrushEngineEvents>>> = new Map();
    private smoothingBuffer: StrokePoint[] = [];

    constructor() {
        // Load presets
        for (const brush of BRUSH_PRESETS) {
            this.brushes.set(brush.id, brush);
        }
        this.currentBrush = BRUSH_PRESETS[0];
    }

    // ========================================================================
    // Event System
    // ========================================================================

    on<K extends keyof BrushEngineEvents>(
        event: K,
        callback: BrushEventCallback<K>
    ): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback as BrushEventCallback<keyof BrushEngineEvents>);
        return () => this.off(event, callback);
    }

    off<K extends keyof BrushEngineEvents>(
        event: K,
        callback: BrushEventCallback<K>
    ): void {
        this.eventListeners.get(event)?.delete(callback as BrushEventCallback<keyof BrushEngineEvents>);
    }

    private emit<K extends keyof BrushEngineEvents>(
        event: K,
        data: BrushEngineEvents[K]
    ): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in brush engine event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Map BlendMode to canvas GlobalCompositeOperation
     */
    private mapBlendModeToCompositeOperation(blendMode: BlendMode): GlobalCompositeOperation {
        const mapping: Record<BlendMode, GlobalCompositeOperation> = {
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
        return mapping[blendMode] || 'source-over';
    }

    // ========================================================================
    // Brush Management
    // ========================================================================

    /**
     * Get all brushes
     */
    getAllBrushes(): BrushSettings[] {
        return Array.from(this.brushes.values());
    }

    /**
     * Get brushes by category
     */
    getBrushesByCategory(category: BrushCategory): BrushSettings[] {
        return this.getAllBrushes().filter(b => b.category === category);
    }

    /**
     * Get a specific brush
     */
    getBrush(id: string): BrushSettings | undefined {
        return this.brushes.get(id);
    }

    /**
     * Get current brush
     */
    getCurrentBrush(): BrushSettings {
        return this.currentBrush;
    }

    /**
     * Select a brush
     */
    selectBrush(id: string): boolean {
        const brush = this.brushes.get(id);
        if (brush) {
            this.currentBrush = brush;
            this.emit('brush:selected', { brush });
            return true;
        }
        return false;
    }

    /**
     * Update current brush settings
     */
    updateCurrentBrush(changes: Partial<BrushSettings>): void {
        this.currentBrush = { ...this.currentBrush, ...changes };
        this.brushes.set(this.currentBrush.id, this.currentBrush);
        this.emit('brush:updated', { brush: this.currentBrush });
    }

    /**
     * Create a custom brush
     */
    createBrush(brush: Omit<BrushSettings, 'id'>): BrushSettings {
        const newBrush: BrushSettings = {
            ...brush,
            id: this.generateId(),
        };
        this.brushes.set(newBrush.id, newBrush);
        this.emit('brush:created', { brush: newBrush });
        return newBrush;
    }

    /**
     * Duplicate a brush
     */
    duplicateBrush(id: string): BrushSettings | null {
        const original = this.brushes.get(id);
        if (!original) return null;

        const newBrush: BrushSettings = {
            ...JSON.parse(JSON.stringify(original)),
            id: this.generateId(),
            name: `${original.name} Copy`,
            category: 'custom',
        };

        this.brushes.set(newBrush.id, newBrush);
        this.emit('brush:created', { brush: newBrush });
        return newBrush;
    }

    /**
     * Delete a brush
     */
    deleteBrush(id: string): boolean {
        // Don't allow deleting preset brushes
        if (BRUSH_PRESETS.some(b => b.id === id)) {
            return false;
        }

        if (this.brushes.has(id)) {
            this.brushes.delete(id);
            this.emit('brush:deleted', { brushId: id });
            return true;
        }
        return false;
    }

    // ========================================================================
    // Stroke Operations
    // ========================================================================

    /**
     * Start a new stroke
     */
    startStroke(point: StrokePoint, color: string): Stroke {
        this.smoothingBuffer = [point];

        this.currentStroke = {
            id: this.generateId(),
            brushId: this.currentBrush.id,
            color,
            points: [point],
            blendMode: this.currentBrush.blendMode,
            opacity: this.currentBrush.opacity,
        };

        this.emit('stroke:started', { stroke: this.currentStroke });
        return this.currentStroke;
    }

    /**
     * Add a point to current stroke
     */
    addPoint(point: StrokePoint): StrokePoint | null {
        if (!this.currentStroke) return null;

        // Apply smoothing
        this.smoothingBuffer.push(point);
        const smoothedPoint = this.applySmoothingToPoint(point);

        this.currentStroke.points.push(smoothedPoint);
        this.emit('stroke:updated', { stroke: this.currentStroke, point: smoothedPoint });

        return smoothedPoint;
    }

    /**
     * End current stroke
     */
    endStroke(): Stroke | null {
        if (!this.currentStroke) return null;

        const stroke = this.currentStroke;
        this.currentStroke = null;
        this.smoothingBuffer = [];

        this.emit('stroke:ended', { stroke });
        return stroke;
    }

    /**
     * Cancel current stroke
     */
    cancelStroke(): void {
        this.currentStroke = null;
        this.smoothingBuffer = [];
    }

    // ========================================================================
    // Stroke Rendering
    // ========================================================================

    /**
     * Render a stroke to a canvas
     */
    renderStroke(stroke: Stroke, ctx: CanvasRenderingContext2D): void {
        const brush = this.brushes.get(stroke.brushId) ?? this.currentBrush;

        if (stroke.points.length < 2) {
            // Single point - just draw a dot
            this.renderBrushDab(ctx, stroke.points[0], brush, stroke.color);
            return;
        }

        // Render each segment
        for (let i = 1; i < stroke.points.length; i++) {
            const prev = stroke.points[i - 1];
            const curr = stroke.points[i];

            // Calculate spacing
            const dist = this.distance(prev, curr);
            const spacingPx = (brush.spacing / 100) * brush.size;
            const steps = Math.max(1, Math.floor(dist / spacingPx));

            // Interpolate points
            for (let j = 0; j <= steps; j++) {
                const t = j / steps;
                const point = this.lerpPoint(prev, curr, t);
                this.renderBrushDab(ctx, point, brush, stroke.color);
            }
        }
    }

    /**
     * Render a single brush dab
     */
    renderBrushDab(
        ctx: CanvasRenderingContext2D,
        point: StrokePoint,
        brush: BrushSettings,
        color: string
    ): void {
        ctx.save();

        // Calculate dynamic values
        let size = brush.size;
        let opacity = brush.opacity / 100;
        let flow = brush.flow / 100;
        let angle = brush.angle;
        let roundness = brush.roundness / 100;

        const dynamics = brush.dynamics;

        // Apply pressure dynamics
        if (dynamics.sizePressure) {
            const minSize = brush.size * (dynamics.sizeMinimum / 100);
            size = minSize + (brush.size - minSize) * point.pressure;
        }

        if (dynamics.opacityPressure) {
            const minOpacity = dynamics.opacityMinimum / 100;
            opacity = minOpacity + (opacity - minOpacity) * point.pressure;
        }

        if (dynamics.flowPressure) {
            const minFlow = dynamics.flowMinimum / 100;
            flow = minFlow + (flow - minFlow) * point.pressure;
        }

        // Apply jitter
        size += (Math.random() - 0.5) * 2 * (dynamics.sizeJitter / 100) * brush.size;
        opacity += (Math.random() - 0.5) * 2 * (dynamics.opacityJitter / 100);
        angle += (Math.random() - 0.5) * 2 * dynamics.angleJitter;
        roundness += (Math.random() - 0.5) * 2 * (dynamics.roundnessJitter / 100);

        // Clamp values
        size = Math.max(1, size);
        opacity = Math.max(0, Math.min(1, opacity));
        flow = Math.max(0, Math.min(1, flow));
        roundness = Math.max(0.1, Math.min(1, roundness));

        // Apply scatter
        let dabX = point.x;
        let dabY = point.y;

        if (dynamics.scatterAmount > 0) {
            const scatter = (dynamics.scatterAmount / 100) * size;
            if (dynamics.scatterBoth) {
                dabX += (Math.random() - 0.5) * 2 * scatter;
                dabY += (Math.random() - 0.5) * 2 * scatter;
            } else {
                dabY += (Math.random() - 0.5) * 2 * scatter;
            }
        }

        // Set context properties
        ctx.globalAlpha = opacity * flow;
        ctx.globalCompositeOperation = this.mapBlendModeToCompositeOperation(brush.blendMode);

        // Transform for angle and roundness
        ctx.translate(dabX, dabY);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.scale(1, roundness);

        // Draw the brush shape
        ctx.beginPath();

        if (brush.hardness >= 100) {
            // Hard round brush
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            // Soft round brush with gradient
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
            const hardnessStop = brush.hardness / 100;

            gradient.addColorStop(0, color);
            gradient.addColorStop(hardnessStop, color);
            gradient.addColorStop(1, this.hexToRgba(color, 0));

            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Get brush preview canvas
     */
    getBrushPreview(brush: BrushSettings, size: number = 100): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Draw a sample stroke
        const points: StrokePoint[] = [];
        const centerY = size / 2;
        const startX = size * 0.15;
        const endX = size * 0.85;

        for (let x = startX; x <= endX; x += 2) {
            const t = (x - startX) / (endX - startX);
            const pressure = Math.sin(t * Math.PI);
            points.push({
                x,
                y: centerY + Math.sin(t * Math.PI * 2) * size * 0.1,
                pressure,
                timestamp: Date.now(),
            });
        }

        const stroke: Stroke = {
            id: 'preview',
            brushId: brush.id,
            color: '#000000',
            points,
            blendMode: brush.blendMode,
            opacity: brush.opacity,
        };

        // Temporarily set this brush
        const prevBrush = this.currentBrush;
        this.brushes.set(brush.id, brush);

        this.renderStroke(stroke, ctx);

        // Restore
        this.currentBrush = prevBrush;

        return canvas;
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Get all brush categories
     */
    getCategories(): BrushCategory[] {
        return [
            'basic',
            'artistic',
            'texture',
            'sketch',
            'ink',
            'watercolor',
            'chalk',
            'pencil',
            'marker',
            'airbrush',
            'special',
            'custom',
        ];
    }

    /**
     * Export brush settings
     */
    exportBrush(id: string): string | null {
        const brush = this.brushes.get(id);
        if (!brush) return null;
        return JSON.stringify(brush);
    }

    /**
     * Import brush settings
     */
    importBrush(json: string): BrushSettings | null {
        try {
            const brush = JSON.parse(json) as BrushSettings;
            brush.id = this.generateId();
            brush.category = 'custom';
            this.brushes.set(brush.id, brush);
            this.emit('brush:created', { brush });
            return brush;
        } catch {
            return null;
        }
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    private generateId(): string {
        return `brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private distance(p1: Point, p2: Point): number {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    private lerpPoint(p1: StrokePoint, p2: StrokePoint, t: number): StrokePoint {
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
            pressure: p1.pressure + (p2.pressure - p1.pressure) * t,
            timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
        };
    }

    private applySmoothingToPoint(point: StrokePoint): StrokePoint {
        const smoothing = this.currentBrush.smoothing / 100;
        if (smoothing === 0 || this.smoothingBuffer.length < 2) {
            return point;
        }

        // Weighted average of recent points
        const windowSize = Math.min(5, this.smoothingBuffer.length);
        let sumX = 0;
        let sumY = 0;
        let sumWeight = 0;

        for (let i = 0; i < windowSize; i++) {
            const idx = this.smoothingBuffer.length - 1 - i;
            const weight = Math.pow(1 - smoothing, i);
            sumX += this.smoothingBuffer[idx].x * weight;
            sumY += this.smoothingBuffer[idx].y * weight;
            sumWeight += weight;
        }

        return {
            ...point,
            x: sumX / sumWeight,
            y: sumY / sumWeight,
        };
    }

    private hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBrushEngine(): BrushEngine {
    return new BrushEngine();
}

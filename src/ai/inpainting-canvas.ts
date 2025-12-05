/**
 * Inpainting Canvas Manager
 *
 * Provides region-specific editing capabilities with brush tool support
 * for targeted AI-powered image modifications.
 */

/**
 * Brush settings for the inpainting tool
 */
export interface BrushSettings {
    /** Brush size in pixels */
    size: number;
    /** Brush hardness (0-1, where 1 is hard edge) */
    hardness: number;
    /** Brush opacity (0-1) */
    opacity: number;
    /** Brush shape */
    shape: 'round' | 'square' | 'soft';
}

/**
 * A point on the canvas
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * A stroke drawn on the mask
 */
export interface MaskStroke {
    /** Unique stroke ID */
    id: string;
    /** Points along the stroke path */
    points: Point[];
    /** Brush settings used for this stroke */
    brush: BrushSettings;
    /** Timestamp of stroke */
    timestamp: number;
}

/**
 * Inpainting region definition
 */
export interface InpaintingRegion {
    /** Region ID */
    id: string;
    /** Human-readable name */
    name: string;
    /** Mask as base64 PNG (white = edit area, black = preserve) */
    mask: string;
    /** Strokes that make up this region */
    strokes: MaskStroke[];
    /** Edit instruction for this region */
    instruction: string;
    /** Creation timestamp */
    createdAt: number;
}

/**
 * Canvas state for undo/redo
 */
interface CanvasState {
    maskData: ImageData | null;
    strokes: MaskStroke[];
}

/**
 * Inpainting Canvas Manager
 *
 * Handles mask creation, brush drawing, and region management
 * for targeted image editing.
 */
export class InpaintingCanvasManager {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private maskCanvas: HTMLCanvasElement | null = null;
    private maskCtx: CanvasRenderingContext2D | null = null;

    private isDrawing = false;
    private currentStroke: MaskStroke | null = null;
    private strokes: MaskStroke[] = [];
    private undoStack: CanvasState[] = [];
    private redoStack: CanvasState[] = [];

    private brushSettings: BrushSettings = {
        size: 30,
        hardness: 0.8,
        opacity: 1.0,
        shape: 'round',
    };

    private regions: Map<string, InpaintingRegion> = new Map();

    /**
     * Initialize the canvas manager with a canvas element
     */
    initialize(
        canvas: HTMLCanvasElement,
        width: number,
        height: number
    ): void {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Create mask canvas (same size, for the actual mask)
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
        this.maskCtx = this.maskCanvas.getContext('2d');

        // Initialize mask as black (preserve all)
        if (this.maskCtx) {
            this.maskCtx.fillStyle = 'black';
            this.maskCtx.fillRect(0, 0, width, height);
        }

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up canvas event listeners for drawing
     */
    private setupEventListeners(): void {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        // Touch support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    /**
     * Remove event listeners
     */
    destroy(): void {
        if (!this.canvas) return;

        this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    /**
     * Get canvas-relative coordinates from mouse event
     */
    private getCanvasCoords(e: MouseEvent | Touch): Point {
        if (!this.canvas) return { x: 0, y: 0 };

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    /**
     * Handle mouse down - start drawing
     */
    private handleMouseDown(e: MouseEvent): void {
        this.saveState();
        this.isDrawing = true;
        const point = this.getCanvasCoords(e);

        this.currentStroke = {
            id: this.generateId(),
            points: [point],
            brush: { ...this.brushSettings },
            timestamp: Date.now(),
        };

        this.drawPoint(point);
    }

    /**
     * Handle mouse move - continue drawing
     */
    private handleMouseMove(e: MouseEvent): void {
        if (!this.isDrawing || !this.currentStroke) return;

        const point = this.getCanvasCoords(e);
        this.currentStroke.points.push(point);
        this.drawLine(
            this.currentStroke.points[this.currentStroke.points.length - 2],
            point
        );
    }

    /**
     * Handle mouse up - end drawing
     */
    private handleMouseUp(): void {
        if (this.currentStroke && this.currentStroke.points.length > 0) {
            this.strokes.push(this.currentStroke);
        }
        this.isDrawing = false;
        this.currentStroke = null;
    }

    /**
     * Handle touch start
     */
    private handleTouchStart(e: TouchEvent): void {
        e.preventDefault();
        if (e.touches.length === 1) {
            this.saveState();
            this.isDrawing = true;
            const point = this.getCanvasCoords(e.touches[0]);

            this.currentStroke = {
                id: this.generateId(),
                points: [point],
                brush: { ...this.brushSettings },
                timestamp: Date.now(),
            };

            this.drawPoint(point);
        }
    }

    /**
     * Handle touch move
     */
    private handleTouchMove(e: TouchEvent): void {
        e.preventDefault();
        if (!this.isDrawing || !this.currentStroke || e.touches.length !== 1) return;

        const point = this.getCanvasCoords(e.touches[0]);
        this.currentStroke.points.push(point);
        this.drawLine(
            this.currentStroke.points[this.currentStroke.points.length - 2],
            point
        );
    }

    /**
     * Handle touch end
     */
    private handleTouchEnd(e: TouchEvent): void {
        e.preventDefault();
        this.handleMouseUp();
    }

    /**
     * Draw a single point (brush dab)
     */
    private drawPoint(point: Point): void {
        if (!this.ctx || !this.maskCtx) return;

        const { size, hardness, opacity, shape } = this.brushSettings;

        // Draw on both display canvas and mask canvas
        [this.ctx, this.maskCtx].forEach((ctx, index) => {
            ctx.save();
            ctx.globalAlpha = opacity;

            // Display canvas: red overlay, Mask canvas: white
            ctx.fillStyle = index === 0 ? 'rgba(255, 0, 0, 0.5)' : 'white';

            if (shape === 'round' || shape === 'soft') {
                // Create radial gradient for soft brush
                if (shape === 'soft' && hardness < 1) {
                    const gradient = ctx.createRadialGradient(
                        point.x,
                        point.y,
                        0,
                        point.x,
                        point.y,
                        size / 2
                    );
                    gradient.addColorStop(0, index === 0 ? 'rgba(255, 0, 0, 0.5)' : 'white');
                    gradient.addColorStop(
                        hardness,
                        index === 0 ? 'rgba(255, 0, 0, 0.5)' : 'white'
                    );
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                }

                ctx.beginPath();
                ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape === 'square') {
                ctx.fillRect(
                    point.x - size / 2,
                    point.y - size / 2,
                    size,
                    size
                );
            }

            ctx.restore();
        });
    }

    /**
     * Draw a line between two points (for smooth strokes)
     */
    private drawLine(from: Point, to: Point): void {
        if (!this.ctx || !this.maskCtx) return;

        const { size, opacity } = this.brushSettings;

        // Calculate distance and steps for smooth line
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(distance / (size / 4)));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point: Point = {
                x: from.x + dx * t,
                y: from.y + dy * t,
            };
            this.drawPoint(point);
        }
    }

    /**
     * Set brush settings
     */
    setBrushSettings(settings: Partial<BrushSettings>): void {
        this.brushSettings = { ...this.brushSettings, ...settings };
    }

    /**
     * Get current brush settings
     */
    getBrushSettings(): BrushSettings {
        return { ...this.brushSettings };
    }

    /**
     * Clear the mask completely
     */
    clearMask(): void {
        this.saveState();

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (this.maskCtx && this.maskCanvas) {
            this.maskCtx.fillStyle = 'black';
            this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        }

        this.strokes = [];
    }

    /**
     * Invert the mask (swap edit/preserve areas)
     */
    invertMask(): void {
        if (!this.maskCtx || !this.maskCanvas) return;

        this.saveState();

        const imageData = this.maskCtx.getImageData(
            0,
            0,
            this.maskCanvas.width,
            this.maskCanvas.height
        );
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i]; // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
        }

        this.maskCtx.putImageData(imageData, 0, 0);
        this.updateDisplayFromMask();
    }

    /**
     * Update the display canvas from the mask canvas
     */
    private updateDisplayFromMask(): void {
        if (!this.ctx || !this.canvas || !this.maskCtx || !this.maskCanvas) return;

        const maskData = this.maskCtx.getImageData(
            0,
            0,
            this.maskCanvas.width,
            this.maskCanvas.height
        );

        // Clear display canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw red overlay where mask is white
        const displayData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
        for (let i = 0; i < maskData.data.length; i += 4) {
            if (maskData.data[i] > 128) {
                // White in mask = red in display
                displayData.data[i] = 255; // R
                displayData.data[i + 1] = 0; // G
                displayData.data[i + 2] = 0; // B
                displayData.data[i + 3] = 128; // A (semi-transparent)
            }
        }

        this.ctx.putImageData(displayData, 0, 0);
    }

    /**
     * Get the mask as base64 PNG
     */
    getMaskBase64(): string | null {
        if (!this.maskCanvas) return null;
        return this.maskCanvas.toDataURL('image/png').split(',')[1];
    }

    /**
     * Load a mask from base64
     */
    async loadMask(base64: string): Promise<void> {
        if (!this.maskCtx || !this.maskCanvas) return;

        this.saveState();

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.maskCtx!.drawImage(img, 0, 0);
                this.updateDisplayFromMask();
                resolve();
            };
            img.onerror = reject;
            img.src = `data:image/png;base64,${base64}`;
        });
    }

    /**
     * Save current state for undo
     */
    private saveState(): void {
        if (!this.maskCtx || !this.maskCanvas) return;

        const state: CanvasState = {
            maskData: this.maskCtx.getImageData(
                0,
                0,
                this.maskCanvas.width,
                this.maskCanvas.height
            ),
            strokes: [...this.strokes],
        };

        this.undoStack.push(state);
        this.redoStack = []; // Clear redo stack on new action

        // Limit undo stack size
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo last action
     */
    undo(): boolean {
        if (this.undoStack.length === 0 || !this.maskCtx) return false;

        // Save current state to redo stack
        const currentState: CanvasState = {
            maskData: this.maskCtx.getImageData(
                0,
                0,
                this.maskCanvas!.width,
                this.maskCanvas!.height
            ),
            strokes: [...this.strokes],
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const prevState = this.undoStack.pop()!;
        if (prevState.maskData) {
            this.maskCtx.putImageData(prevState.maskData, 0, 0);
        }
        this.strokes = prevState.strokes;
        this.updateDisplayFromMask();

        return true;
    }

    /**
     * Redo previously undone action
     */
    redo(): boolean {
        if (this.redoStack.length === 0 || !this.maskCtx) return false;

        // Save current state to undo stack
        const currentState: CanvasState = {
            maskData: this.maskCtx.getImageData(
                0,
                0,
                this.maskCanvas!.width,
                this.maskCanvas!.height
            ),
            strokes: [...this.strokes],
        };
        this.undoStack.push(currentState);

        // Restore redo state
        const nextState = this.redoStack.pop()!;
        if (nextState.maskData) {
            this.maskCtx.putImageData(nextState.maskData, 0, 0);
        }
        this.strokes = nextState.strokes;
        this.updateDisplayFromMask();

        return true;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Save current mask as a named region
     */
    saveRegion(name: string, instruction: string): InpaintingRegion {
        const mask = this.getMaskBase64();
        if (!mask) throw new Error('No mask to save');

        const region: InpaintingRegion = {
            id: this.generateId(),
            name,
            mask,
            strokes: [...this.strokes],
            instruction,
            createdAt: Date.now(),
        };

        this.regions.set(region.id, region);
        return region;
    }

    /**
     * Load a saved region
     */
    async loadRegion(regionId: string): Promise<void> {
        const region = this.regions.get(regionId);
        if (!region) throw new Error(`Region ${regionId} not found`);

        await this.loadMask(region.mask);
        this.strokes = [...region.strokes];
    }

    /**
     * Get all saved regions
     */
    getRegions(): InpaintingRegion[] {
        return Array.from(this.regions.values());
    }

    /**
     * Delete a saved region
     */
    deleteRegion(regionId: string): boolean {
        return this.regions.delete(regionId);
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Fill entire canvas (select all for editing)
     */
    fillAll(): void {
        this.saveState();

        if (this.maskCtx && this.maskCanvas) {
            this.maskCtx.fillStyle = 'white';
            this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        }

        this.updateDisplayFromMask();
    }

    /**
     * Draw a rectangular selection
     */
    drawRect(x: number, y: number, width: number, height: number): void {
        this.saveState();

        if (this.maskCtx) {
            this.maskCtx.fillStyle = 'white';
            this.maskCtx.fillRect(x, y, width, height);
        }

        if (this.ctx) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillRect(x, y, width, height);
        }
    }

    /**
     * Draw an elliptical selection
     */
    drawEllipse(
        cx: number,
        cy: number,
        radiusX: number,
        radiusY: number
    ): void {
        this.saveState();

        [this.maskCtx, this.ctx].forEach((ctx, index) => {
            if (!ctx) return;
            ctx.fillStyle = index === 0 ? 'white' : 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Feather/blur the mask edges
     */
    featherMask(radius: number): void {
        if (!this.maskCtx || !this.maskCanvas) return;

        this.saveState();

        // Apply a simple box blur for feathering
        const imageData = this.maskCtx.getImageData(
            0,
            0,
            this.maskCanvas.width,
            this.maskCanvas.height
        );
        const blurred = this.boxBlur(imageData, radius);
        this.maskCtx.putImageData(blurred, 0, 0);
        this.updateDisplayFromMask();
    }

    /**
     * Simple box blur implementation
     */
    private boxBlur(imageData: ImageData, radius: number): ImageData {
        const { width, height, data } = imageData;
        const output = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            sum += data[idx];
                            count++;
                        }
                    }
                }

                const idx = (y * width + x) * 4;
                const avg = Math.round(sum / count);
                output[idx] = avg;
                output[idx + 1] = avg;
                output[idx + 2] = avg;
                output[idx + 3] = 255;
            }
        }

        return new ImageData(output, width, height);
    }
}

/**
 * Export singleton instance
 */
export const inpaintingCanvas = new InpaintingCanvasManager();

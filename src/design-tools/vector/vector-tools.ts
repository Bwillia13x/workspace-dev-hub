/**
 * Vector Tools - Professional vector editing tools
 *
 * Provides:
 * - Pen tool for path creation
 * - Path editing and manipulation
 * - Anchor point operations
 * - Bezier curve handling
 * - SVG import/export
 */

import {
    Point,
    VectorPath,
    PathSegment,
    PathSegmentType,
    FillStyle,
    StrokeStyle,
} from '../types';

// ============================================================================
// Vector Types
// ============================================================================

export interface AnchorPoint {
    id: string;
    position: Point;
    type: 'corner' | 'smooth' | 'symmetric';
    handleIn?: Point;  // Control point for incoming curve
    handleOut?: Point; // Control point for outgoing curve
}

export interface VectorShape {
    id: string;
    name: string;
    path: VectorPath;
    anchors: AnchorPoint[];
    fill: FillStyle;
    stroke: StrokeStyle;
    closed: boolean;
    selected: boolean;
}

export interface PathHitTestResult {
    type: 'anchor' | 'handle-in' | 'handle-out' | 'segment' | 'fill' | 'stroke' | 'none';
    anchorIndex?: number;
    segmentIndex?: number;
    t?: number; // Parameter along segment (0-1)
    point: Point;
    distance: number;
}

export type PenToolMode = 'add' | 'delete' | 'convert' | 'select';

// ============================================================================
// Vector Tool Events
// ============================================================================

export interface VectorToolEvents {
    'path:created': { shape: VectorShape };
    'path:updated': { shape: VectorShape };
    'path:deleted': { shapeId: string };
    'anchor:added': { shapeId: string; anchor: AnchorPoint; index: number };
    'anchor:deleted': { shapeId: string; anchorId: string };
    'anchor:moved': { shapeId: string; anchorId: string; position: Point };
    'handle:moved': { shapeId: string; anchorId: string; handleType: 'in' | 'out'; position: Point };
    'selection:changed': { selectedIds: string[] };
}

type VectorEventCallback<K extends keyof VectorToolEvents> = (data: VectorToolEvents[K]) => void;

// ============================================================================
// Vector Tools Manager
// ============================================================================

export class VectorToolsManager {
    private shapes: Map<string, VectorShape> = new Map();
    private selectedShapeIds: Set<string> = new Set();
    private selectedAnchorIds: Set<string> = new Set();
    private currentPath: VectorShape | null = null;
    private mode: PenToolMode = 'add';
    private eventListeners: Map<string, Set<VectorEventCallback<keyof VectorToolEvents>>> = new Map();

    // Hit test tolerance in pixels
    private hitTolerance: number = 8;

    // ========================================================================
    // Event System
    // ========================================================================

    on<K extends keyof VectorToolEvents>(
        event: K,
        callback: VectorEventCallback<K>
    ): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback as VectorEventCallback<keyof VectorToolEvents>);
        return () => this.off(event, callback);
    }

    off<K extends keyof VectorToolEvents>(
        event: K,
        callback: VectorEventCallback<K>
    ): void {
        this.eventListeners.get(event)?.delete(callback as VectorEventCallback<keyof VectorToolEvents>);
    }

    private emit<K extends keyof VectorToolEvents>(
        event: K,
        data: VectorToolEvents[K]
    ): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in vector tool event listener for ${event}:`, error);
            }
        });
    }

    // ========================================================================
    // Path Creation
    // ========================================================================

    /**
     * Start a new path
     */
    startPath(
        startPoint: Point,
        options: { fill?: FillStyle; stroke?: StrokeStyle; name?: string } = {}
    ): VectorShape {
        const anchor = this.createAnchor(startPoint, 'corner');

        const shape: VectorShape = {
            id: this.generateId(),
            name: options.name ?? 'Path',
            path: {
                id: this.generateId(),
                segments: [{ type: PathSegmentType.MOVE, points: [startPoint] }],
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            },
            anchors: [anchor],
            fill: options.fill ?? { type: 'none' },
            stroke: options.stroke ?? {
                color: '#000000',
                width: 2,
                lineCap: 'round',
                lineJoin: 'round',
                miterLimit: 10,
            },
            closed: false,
            selected: true,
        };

        this.currentPath = shape;
        this.shapes.set(shape.id, shape);

        return shape;
    }

    /**
     * Add a point to the current path
     */
    addPoint(
        point: Point,
        handleOut?: Point,
        handleIn?: Point
    ): AnchorPoint | null {
        if (!this.currentPath) return null;

        const prevAnchor = this.currentPath.anchors[this.currentPath.anchors.length - 1];
        const anchor = this.createAnchor(point, handleIn || handleOut ? 'smooth' : 'corner');

        if (handleIn) {
            anchor.handleIn = handleIn;
        }
        if (handleOut) {
            anchor.handleOut = handleOut;
        }

        // Update previous anchor's handle out if this is a curve
        if (handleIn && prevAnchor) {
            prevAnchor.handleOut = this.reflectPoint(handleIn, point);
        }

        // Add appropriate path segment
        let segment: PathSegment;
        if (prevAnchor?.handleOut || handleIn) {
            // Bezier curve
            segment = {
                type: PathSegmentType.BEZIER,
                points: [
                    prevAnchor?.handleOut ?? prevAnchor?.position ?? point,
                    handleIn ?? point,
                    point,
                ],
            };
        } else {
            // Straight line
            segment = {
                type: PathSegmentType.LINE,
                points: [point],
            };
        }

        this.currentPath.anchors.push(anchor);
        this.currentPath.path.segments.push(segment);

        this.emit('anchor:added', {
            shapeId: this.currentPath.id,
            anchor,
            index: this.currentPath.anchors.length - 1,
        });

        return anchor;
    }

    /**
     * Close the current path
     */
    closePath(): VectorShape | null {
        if (!this.currentPath || this.currentPath.anchors.length < 2) return null;

        const firstAnchor = this.currentPath.anchors[0];
        const lastAnchor = this.currentPath.anchors[this.currentPath.anchors.length - 1];

        // Add closing segment
        let segment: PathSegment;
        if (lastAnchor.handleOut || firstAnchor.handleIn) {
            segment = {
                type: PathSegmentType.BEZIER,
                points: [
                    lastAnchor.handleOut ?? lastAnchor.position,
                    firstAnchor.handleIn ?? firstAnchor.position,
                    firstAnchor.position,
                ],
            };
        } else {
            segment = { type: PathSegmentType.LINE, points: [firstAnchor.position] };
        }

        this.currentPath.path.segments.push(segment);
        this.currentPath.path.segments.push({ type: PathSegmentType.CLOSE, points: [] });
        this.currentPath.path.closed = true;
        this.currentPath.closed = true;

        const completedPath = this.currentPath;
        this.emit('path:created', { shape: completedPath });
        this.currentPath = null;

        return completedPath;
    }

    /**
     * Cancel the current path
     */
    cancelPath(): void {
        if (this.currentPath) {
            this.shapes.delete(this.currentPath.id);
            this.currentPath = null;
        }
    }

    /**
     * Finish path without closing
     */
    finishPath(): VectorShape | null {
        if (!this.currentPath) return null;

        const completedPath = this.currentPath;
        this.emit('path:created', { shape: completedPath });
        this.currentPath = null;

        return completedPath;
    }

    // ========================================================================
    // Anchor Point Operations
    // ========================================================================

    /**
     * Move an anchor point
     */
    moveAnchor(shapeId: string, anchorId: string, newPosition: Point): void {
        const shape = this.shapes.get(shapeId);
        if (!shape) return;

        const anchorIndex = shape.anchors.findIndex(a => a.id === anchorId);
        if (anchorIndex === -1) return;

        const anchor = shape.anchors[anchorIndex];
        const delta = {
            x: newPosition.x - anchor.position.x,
            y: newPosition.y - anchor.position.y,
        };

        // Move anchor
        anchor.position = newPosition;

        // Move handles along with anchor
        if (anchor.handleIn) {
            anchor.handleIn = {
                x: anchor.handleIn.x + delta.x,
                y: anchor.handleIn.y + delta.y,
            };
        }
        if (anchor.handleOut) {
            anchor.handleOut = {
                x: anchor.handleOut.x + delta.x,
                y: anchor.handleOut.y + delta.y,
            };
        }

        // Update path segments
        this.updatePathFromAnchors(shape);
        this.emit('anchor:moved', { shapeId, anchorId, position: newPosition });
    }

    /**
     * Move a control handle
     */
    moveHandle(
        shapeId: string,
        anchorId: string,
        handleType: 'in' | 'out',
        newPosition: Point
    ): void {
        const shape = this.shapes.get(shapeId);
        if (!shape) return;

        const anchor = shape.anchors.find(a => a.id === anchorId);
        if (!anchor) return;

        if (handleType === 'in') {
            anchor.handleIn = newPosition;
            // Mirror for smooth/symmetric anchors
            if (anchor.type === 'symmetric') {
                anchor.handleOut = this.reflectPoint(newPosition, anchor.position);
            } else if (anchor.type === 'smooth' && anchor.handleOut) {
                const dist = this.distance(anchor.handleOut, anchor.position);
                anchor.handleOut = this.pointAtDistance(
                    anchor.position,
                    this.reflectPoint(newPosition, anchor.position),
                    dist
                );
            }
        } else {
            anchor.handleOut = newPosition;
            if (anchor.type === 'symmetric') {
                anchor.handleIn = this.reflectPoint(newPosition, anchor.position);
            } else if (anchor.type === 'smooth' && anchor.handleIn) {
                const dist = this.distance(anchor.handleIn, anchor.position);
                anchor.handleIn = this.pointAtDistance(
                    anchor.position,
                    this.reflectPoint(newPosition, anchor.position),
                    dist
                );
            }
        }

        this.updatePathFromAnchors(shape);
        this.emit('handle:moved', { shapeId, anchorId, handleType, position: newPosition });
    }

    /**
     * Convert anchor type
     */
    convertAnchor(shapeId: string, anchorId: string, newType: 'corner' | 'smooth' | 'symmetric'): void {
        const shape = this.shapes.get(shapeId);
        if (!shape) return;

        const anchor = shape.anchors.find(a => a.id === anchorId);
        if (!anchor) return;

        const prevType = anchor.type;
        anchor.type = newType;

        if (newType === 'corner') {
            // Remove handles for corner
            anchor.handleIn = undefined;
            anchor.handleOut = undefined;
        } else if (prevType === 'corner' && (newType === 'smooth' || newType === 'symmetric')) {
            // Create handles based on adjacent points
            const anchorIndex = shape.anchors.findIndex(a => a.id === anchorId);
            const prevAnchor = shape.anchors[anchorIndex - 1];
            const nextAnchor = shape.anchors[anchorIndex + 1];

            if (prevAnchor && nextAnchor) {
                const direction = this.normalize({
                    x: nextAnchor.position.x - prevAnchor.position.x,
                    y: nextAnchor.position.y - prevAnchor.position.y,
                });
                const handleLength = 30;

                anchor.handleIn = {
                    x: anchor.position.x - direction.x * handleLength,
                    y: anchor.position.y - direction.y * handleLength,
                };
                anchor.handleOut = {
                    x: anchor.position.x + direction.x * handleLength,
                    y: anchor.position.y + direction.y * handleLength,
                };
            }
        }

        this.updatePathFromAnchors(shape);
        this.emit('path:updated', { shape });
    }

    /**
     * Add anchor point to path segment
     */
    addAnchorToSegment(shapeId: string, segmentIndex: number, t: number): AnchorPoint | null {
        const shape = this.shapes.get(shapeId);
        if (!shape) return null;

        const segment = shape.path.segments[segmentIndex];
        if (!segment || segment.type === PathSegmentType.MOVE || segment.type === PathSegmentType.CLOSE) {
            return null;
        }

        // Get the point at parameter t along the segment
        const newPoint = this.getPointOnSegment(shape, segmentIndex, t);
        if (!newPoint) return null;

        // Create new anchor
        const anchor = this.createAnchor(newPoint, 'smooth');

        // Insert anchor at correct position
        const anchorIndex = segmentIndex; // Segments are offset by 1 from anchors
        shape.anchors.splice(anchorIndex, 0, anchor);

        // Rebuild path from anchors
        this.updatePathFromAnchors(shape);

        this.emit('anchor:added', { shapeId, anchor, index: anchorIndex });
        return anchor;
    }

    /**
     * Delete anchor point
     */
    deleteAnchor(shapeId: string, anchorId: string): boolean {
        const shape = this.shapes.get(shapeId);
        if (!shape) return false;

        if (shape.anchors.length <= 2) {
            // Can't delete if only 2 or fewer anchors
            return false;
        }

        const anchorIndex = shape.anchors.findIndex(a => a.id === anchorId);
        if (anchorIndex === -1) return false;

        shape.anchors.splice(anchorIndex, 1);
        this.updatePathFromAnchors(shape);

        this.emit('anchor:deleted', { shapeId, anchorId });
        return true;
    }

    // ========================================================================
    // Path Operations
    // ========================================================================

    /**
     * Get a shape by ID
     */
    getShape(shapeId: string): VectorShape | undefined {
        return this.shapes.get(shapeId);
    }

    /**
     * Get all shapes
     */
    getAllShapes(): VectorShape[] {
        return Array.from(this.shapes.values());
    }

    /**
     * Delete a shape
     */
    deleteShape(shapeId: string): boolean {
        if (this.shapes.has(shapeId)) {
            this.shapes.delete(shapeId);
            this.selectedShapeIds.delete(shapeId);
            this.emit('path:deleted', { shapeId });
            return true;
        }
        return false;
    }

    /**
     * Duplicate a shape
     */
    duplicateShape(shapeId: string, offset: Point = { x: 20, y: 20 }): VectorShape | null {
        const shape = this.shapes.get(shapeId);
        if (!shape) return null;

        const newShape: VectorShape = JSON.parse(JSON.stringify(shape));
        newShape.id = this.generateId();
        newShape.path.id = this.generateId();
        newShape.name = `${shape.name} copy`;

        // Offset position
        newShape.anchors.forEach(anchor => {
            anchor.id = this.generateId();
            anchor.position.x += offset.x;
            anchor.position.y += offset.y;
            if (anchor.handleIn) {
                anchor.handleIn.x += offset.x;
                anchor.handleIn.y += offset.y;
            }
            if (anchor.handleOut) {
                anchor.handleOut.x += offset.x;
                anchor.handleOut.y += offset.y;
            }
        });

        this.updatePathFromAnchors(newShape);
        this.shapes.set(newShape.id, newShape);
        this.emit('path:created', { shape: newShape });

        return newShape;
    }

    /**
     * Reverse path direction
     */
    reversePath(shapeId: string): void {
        const shape = this.shapes.get(shapeId);
        if (!shape) return;

        shape.anchors.reverse();
        shape.anchors.forEach(anchor => {
            const temp = anchor.handleIn;
            anchor.handleIn = anchor.handleOut;
            anchor.handleOut = temp;
        });

        this.updatePathFromAnchors(shape);
        this.emit('path:updated', { shape });
    }

    /**
     * Simplify path by reducing anchor points
     */
    simplifyPath(shapeId: string, tolerance: number = 5): void {
        const shape = this.shapes.get(shapeId);
        if (!shape || shape.anchors.length <= 2) return;

        // Douglas-Peucker simplification
        const points = shape.anchors.map(a => a.position);
        const simplified = this.douglasPeucker(points, tolerance);

        // Rebuild anchors
        shape.anchors = simplified.map(p => this.createAnchor(p, 'corner'));
        this.updatePathFromAnchors(shape);
        this.emit('path:updated', { shape });
    }

    /**
     * Smooth path with bezier curves
     */
    smoothPath(shapeId: string, smoothness: number = 0.5): void {
        const shape = this.shapes.get(shapeId);
        if (!shape || shape.anchors.length < 3) return;

        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];
            const prev = shape.anchors[(i - 1 + shape.anchors.length) % shape.anchors.length];
            const next = shape.anchors[(i + 1) % shape.anchors.length];

            if (shape.closed || (i > 0 && i < shape.anchors.length - 1)) {
                anchor.type = 'smooth';

                const direction = this.normalize({
                    x: next.position.x - prev.position.x,
                    y: next.position.y - prev.position.y,
                });

                const distPrev = this.distance(anchor.position, prev.position) * smoothness;
                const distNext = this.distance(anchor.position, next.position) * smoothness;

                anchor.handleIn = {
                    x: anchor.position.x - direction.x * distPrev,
                    y: anchor.position.y - direction.y * distPrev,
                };
                anchor.handleOut = {
                    x: anchor.position.x + direction.x * distNext,
                    y: anchor.position.y + direction.y * distNext,
                };
            }
        }

        this.updatePathFromAnchors(shape);
        this.emit('path:updated', { shape });
    }

    // ========================================================================
    // Hit Testing
    // ========================================================================

    /**
     * Hit test a point against all shapes
     */
    hitTest(point: Point): PathHitTestResult {
        let bestResult: PathHitTestResult = {
            type: 'none',
            point,
            distance: Infinity,
        };

        for (const shape of this.shapes.values()) {
            const result = this.hitTestShape(shape, point);
            if (result.distance < bestResult.distance) {
                bestResult = result;
            }
        }

        return bestResult;
    }

    /**
     * Hit test a point against a specific shape
     */
    hitTestShape(shape: VectorShape, point: Point): PathHitTestResult {
        let bestResult: PathHitTestResult = {
            type: 'none',
            point,
            distance: Infinity,
        };

        // Test anchors first (highest priority)
        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];

            // Test anchor point
            const anchorDist = this.distance(point, anchor.position);
            if (anchorDist < this.hitTolerance && anchorDist < bestResult.distance) {
                bestResult = {
                    type: 'anchor',
                    anchorIndex: i,
                    point: anchor.position,
                    distance: anchorDist,
                };
            }

            // Test handles
            if (anchor.handleIn) {
                const handleDist = this.distance(point, anchor.handleIn);
                if (handleDist < this.hitTolerance && handleDist < bestResult.distance) {
                    bestResult = {
                        type: 'handle-in',
                        anchorIndex: i,
                        point: anchor.handleIn,
                        distance: handleDist,
                    };
                }
            }
            if (anchor.handleOut) {
                const handleDist = this.distance(point, anchor.handleOut);
                if (handleDist < this.hitTolerance && handleDist < bestResult.distance) {
                    bestResult = {
                        type: 'handle-out',
                        anchorIndex: i,
                        point: anchor.handleOut,
                        distance: handleDist,
                    };
                }
            }
        }

        // Test path segments
        if (bestResult.type === 'none') {
            const segmentResult = this.hitTestPathSegments(shape, point);
            if (segmentResult.distance < bestResult.distance) {
                bestResult = segmentResult;
            }
        }

        return bestResult;
    }

    private hitTestPathSegments(shape: VectorShape, point: Point): PathHitTestResult {
        let bestResult: PathHitTestResult = {
            type: 'none',
            point,
            distance: Infinity,
        };

        for (let i = 1; i < shape.path.segments.length; i++) {
            const segment = shape.path.segments[i];
            if (segment.type === PathSegmentType.CLOSE) continue;

            const prevAnchor = shape.anchors[i - 1];
            const currAnchor = shape.anchors[i % shape.anchors.length];

            // Find closest point on segment
            const result = this.closestPointOnSegment(
                prevAnchor.position,
                prevAnchor.handleOut,
                currAnchor.handleIn,
                currAnchor.position,
                segment.type,
                point
            );

            if (result.distance < this.hitTolerance && result.distance < bestResult.distance) {
                bestResult = {
                    type: 'segment',
                    segmentIndex: i,
                    t: result.t,
                    point: result.point,
                    distance: result.distance,
                };
            }
        }

        return bestResult;
    }

    // ========================================================================
    // Selection
    // ========================================================================

    selectShape(shapeId: string, addToSelection: boolean = false): void {
        if (!addToSelection) {
            this.selectedShapeIds.clear();
        }
        this.selectedShapeIds.add(shapeId);
        this.emit('selection:changed', { selectedIds: Array.from(this.selectedShapeIds) });
    }

    deselectShape(shapeId: string): void {
        this.selectedShapeIds.delete(shapeId);
        this.emit('selection:changed', { selectedIds: Array.from(this.selectedShapeIds) });
    }

    clearSelection(): void {
        this.selectedShapeIds.clear();
        this.selectedAnchorIds.clear();
        this.emit('selection:changed', { selectedIds: [] });
    }

    getSelectedShapes(): VectorShape[] {
        return Array.from(this.selectedShapeIds)
            .map(id => this.shapes.get(id))
            .filter((s): s is VectorShape => s !== undefined);
    }

    // ========================================================================
    // SVG Import/Export
    // ========================================================================

    /**
     * Export shape to SVG path data (d attribute)
     */
    toSVGPathData(shapeId: string): string {
        const shape = this.shapes.get(shapeId);
        if (!shape) return '';

        const parts: string[] = [];

        for (const segment of shape.path.segments) {
            switch (segment.type) {
                case PathSegmentType.MOVE:
                    parts.push(`M ${segment.points[0].x} ${segment.points[0].y}`);
                    break;
                case PathSegmentType.LINE:
                    parts.push(`L ${segment.points[0].x} ${segment.points[0].y}`);
                    break;
                case PathSegmentType.QUADRATIC:
                    parts.push(`Q ${segment.points[0].x} ${segment.points[0].y} ${segment.points[1].x} ${segment.points[1].y}`);
                    break;
                case PathSegmentType.BEZIER:
                    parts.push(`C ${segment.points[0].x} ${segment.points[0].y} ${segment.points[1].x} ${segment.points[1].y} ${segment.points[2].x} ${segment.points[2].y}`);
                    break;
                case PathSegmentType.ARC:
                    // Simplified arc export
                    parts.push(`L ${segment.points[segment.points.length - 1].x} ${segment.points[segment.points.length - 1].y}`);
                    break;
                case PathSegmentType.CLOSE:
                    parts.push('Z');
                    break;
            }
        }

        return parts.join(' ');
    }

    /**
     * Export shape to full SVG element
     */
    toSVG(shapeId: string): string {
        const shape = this.shapes.get(shapeId);
        if (!shape) return '';

        const pathData = this.toSVGPathData(shapeId);
        const fill = shape.fill.type === 'solid' ? (shape.fill as { color: string }).color : 'none';
        const stroke = shape.stroke.color;
        const strokeWidth = shape.stroke.width;

        return `<path d="${pathData}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    /**
     * Export all shapes to SVG
     */
    toSVGDocument(width: number = 800, height: number = 600): string {
        const paths = Array.from(this.shapes.keys())
            .map(id => this.toSVG(id))
            .join('\n  ');

        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${paths}
</svg>`;
    }

    /**
     * Import from SVG path data
     */
    importFromSVGPath(
        pathData: string,
        options: { fill?: FillStyle; stroke?: StrokeStyle; name?: string } = {}
    ): VectorShape | null {
        const anchors = this.parseSVGPath(pathData);
        if (anchors.length === 0) return null;

        const shape: VectorShape = {
            id: this.generateId(),
            name: options.name ?? 'Imported Path',
            path: {
                id: this.generateId(),
                segments: [],
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            },
            anchors,
            fill: options.fill ?? { type: 'none' },
            stroke: options.stroke ?? {
                color: '#000000',
                width: 2,
                lineCap: 'round',
                lineJoin: 'round',
                miterLimit: 10,
            },
            closed: pathData.toUpperCase().includes('Z'),
            selected: false,
        };

        this.updatePathFromAnchors(shape);
        this.shapes.set(shape.id, shape);
        this.emit('path:created', { shape });

        return shape;
    }

    // ========================================================================
    // Shape Primitives
    // ========================================================================

    /**
     * Create a rectangle shape
     */
    createRectangle(
        x: number,
        y: number,
        width: number,
        height: number,
        cornerRadius: number = 0,
        options: { fill?: FillStyle; stroke?: StrokeStyle; name?: string } = {}
    ): VectorShape {
        const anchors: AnchorPoint[] = [];
        const k = 0.5522847498; // Bezier approximation for quarter circles

        if (cornerRadius <= 0) {
            // Simple rectangle
            anchors.push(
                this.createAnchor({ x, y }, 'corner'),
                this.createAnchor({ x: x + width, y }, 'corner'),
                this.createAnchor({ x: x + width, y: y + height }, 'corner'),
                this.createAnchor({ x, y: y + height }, 'corner')
            );
        } else {
            // Rounded rectangle
            const r = Math.min(cornerRadius, width / 2, height / 2);

            // Top-left corner
            anchors.push({
                id: this.generateId(),
                position: { x: x + r, y },
                type: 'smooth',
                handleIn: { x: x + r - r * k, y },
                handleOut: undefined,
            });

            // Top-right corner
            anchors.push({
                id: this.generateId(),
                position: { x: x + width - r, y },
                type: 'smooth',
                handleIn: undefined,
                handleOut: { x: x + width - r + r * k, y },
            });
            anchors.push({
                id: this.generateId(),
                position: { x: x + width, y: y + r },
                type: 'smooth',
                handleIn: { x: x + width, y: y + r - r * k },
                handleOut: undefined,
            });

            // Bottom-right corner
            anchors.push({
                id: this.generateId(),
                position: { x: x + width, y: y + height - r },
                type: 'smooth',
                handleIn: undefined,
                handleOut: { x: x + width, y: y + height - r + r * k },
            });
            anchors.push({
                id: this.generateId(),
                position: { x: x + width - r, y: y + height },
                type: 'smooth',
                handleIn: { x: x + width - r + r * k, y: y + height },
                handleOut: undefined,
            });

            // Bottom-left corner
            anchors.push({
                id: this.generateId(),
                position: { x: x + r, y: y + height },
                type: 'smooth',
                handleIn: undefined,
                handleOut: { x: x + r - r * k, y: y + height },
            });
            anchors.push({
                id: this.generateId(),
                position: { x, y: y + height - r },
                type: 'smooth',
                handleIn: { x, y: y + height - r + r * k },
                handleOut: undefined,
            });

            // Back to top-left
            anchors.push({
                id: this.generateId(),
                position: { x, y: y + r },
                type: 'smooth',
                handleIn: undefined,
                handleOut: { x, y: y + r - r * k },
            });
        }

        const shape: VectorShape = {
            id: this.generateId(),
            name: options.name ?? 'Rectangle',
            path: {
                id: this.generateId(),
                segments: [],
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            },
            anchors,
            fill: options.fill ?? { type: 'solid', color: '#ffffff' },
            stroke: options.stroke ?? {
                color: '#000000',
                width: 2,
                lineCap: 'round',
                lineJoin: 'round',
                miterLimit: 10,
            },
            closed: true,
            selected: false,
        };

        this.updatePathFromAnchors(shape);
        this.shapes.set(shape.id, shape);
        this.emit('path:created', { shape });

        return shape;
    }

    /**
     * Create an ellipse shape
     */
    createEllipse(
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        options: { fill?: FillStyle; stroke?: StrokeStyle; name?: string } = {}
    ): VectorShape {
        const k = 0.5522847498;

        const anchors: AnchorPoint[] = [
            {
                id: this.generateId(),
                position: { x: cx, y: cy - ry },
                type: 'smooth',
                handleIn: { x: cx - rx * k, y: cy - ry },
                handleOut: { x: cx + rx * k, y: cy - ry },
            },
            {
                id: this.generateId(),
                position: { x: cx + rx, y: cy },
                type: 'smooth',
                handleIn: { x: cx + rx, y: cy - ry * k },
                handleOut: { x: cx + rx, y: cy + ry * k },
            },
            {
                id: this.generateId(),
                position: { x: cx, y: cy + ry },
                type: 'smooth',
                handleIn: { x: cx + rx * k, y: cy + ry },
                handleOut: { x: cx - rx * k, y: cy + ry },
            },
            {
                id: this.generateId(),
                position: { x: cx - rx, y: cy },
                type: 'smooth',
                handleIn: { x: cx - rx, y: cy + ry * k },
                handleOut: { x: cx - rx, y: cy - ry * k },
            },
        ];

        const shape: VectorShape = {
            id: this.generateId(),
            name: options.name ?? 'Ellipse',
            path: {
                id: this.generateId(),
                segments: [],
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            },
            anchors,
            fill: options.fill ?? { type: 'solid', color: '#ffffff' },
            stroke: options.stroke ?? {
                color: '#000000',
                width: 2,
                lineCap: 'round',
                lineJoin: 'round',
                miterLimit: 10,
            },
            closed: true,
            selected: false,
        };

        this.updatePathFromAnchors(shape);
        this.shapes.set(shape.id, shape);
        this.emit('path:created', { shape });

        return shape;
    }

    /**
     * Create a polygon shape
     */
    createPolygon(
        cx: number,
        cy: number,
        radius: number,
        sides: number,
        options: { fill?: FillStyle; stroke?: StrokeStyle; name?: string; rotation?: number } = {}
    ): VectorShape {
        const anchors: AnchorPoint[] = [];
        const startAngle = (options.rotation ?? -90) * Math.PI / 180;

        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (i * 2 * Math.PI) / sides;
            anchors.push(this.createAnchor({
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle),
            }, 'corner'));
        }

        const shape: VectorShape = {
            id: this.generateId(),
            name: options.name ?? `${sides}-gon`,
            path: {
                id: this.generateId(),
                segments: [],
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            },
            anchors,
            fill: options.fill ?? { type: 'solid', color: '#ffffff' },
            stroke: options.stroke ?? {
                color: '#000000',
                width: 2,
                lineCap: 'round',
                lineJoin: 'round',
                miterLimit: 10,
            },
            closed: true,
            selected: false,
        };

        this.updatePathFromAnchors(shape);
        this.shapes.set(shape.id, shape);
        this.emit('path:created', { shape });

        return shape;
    }

    /**
     * Create a star shape
     */
    createStar(
        cx: number,
        cy: number,
        outerRadius: number,
        innerRadius: number,
        points: number,
        options: { fill?: FillStyle; stroke?: StrokeStyle; name?: string; rotation?: number } = {}
    ): VectorShape {
        const anchors: AnchorPoint[] = [];
        const startAngle = (options.rotation ?? -90) * Math.PI / 180;

        for (let i = 0; i < points * 2; i++) {
            const angle = startAngle + (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            anchors.push(this.createAnchor({
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle),
            }, 'corner'));
        }

        const shape: VectorShape = {
            id: this.generateId(),
            name: options.name ?? `${points}-point Star`,
            path: {
                id: this.generateId(),
                segments: [],
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            },
            anchors,
            fill: options.fill ?? { type: 'solid', color: '#ffffff' },
            stroke: options.stroke ?? {
                color: '#000000',
                width: 2,
                lineCap: 'round',
                lineJoin: 'round',
                miterLimit: 10,
            },
            closed: true,
            selected: false,
        };

        this.updatePathFromAnchors(shape);
        this.shapes.set(shape.id, shape);
        this.emit('path:created', { shape });

        return shape;
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    setMode(mode: PenToolMode): void {
        this.mode = mode;
    }

    getMode(): PenToolMode {
        return this.mode;
    }

    setHitTolerance(tolerance: number): void {
        this.hitTolerance = tolerance;
    }

    clear(): void {
        this.shapes.clear();
        this.selectedShapeIds.clear();
        this.selectedAnchorIds.clear();
        this.currentPath = null;
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    private generateId(): string {
        return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private createAnchor(position: Point, type: 'corner' | 'smooth' | 'symmetric'): AnchorPoint {
        return {
            id: this.generateId(),
            position: { ...position },
            type,
        };
    }

    private updatePathFromAnchors(shape: VectorShape): void {
        const segments: PathSegment[] = [];

        if (shape.anchors.length === 0) {
            shape.path.segments = segments;
            return;
        }

        // Move to first point
        segments.push({
            type: PathSegmentType.MOVE,
            points: [shape.anchors[0].position],
        });

        // Create segments
        const numAnchors = shape.closed ? shape.anchors.length : shape.anchors.length - 1;
        for (let i = 0; i < numAnchors; i++) {
            const current = shape.anchors[i];
            const next = shape.anchors[(i + 1) % shape.anchors.length];

            if (current.handleOut || next.handleIn) {
                // Bezier curve
                segments.push({
                    type: PathSegmentType.BEZIER,
                    points: [
                        current.handleOut ?? current.position,
                        next.handleIn ?? next.position,
                        next.position,
                    ],
                });
            } else {
                // Line
                segments.push({
                    type: PathSegmentType.LINE,
                    points: [next.position],
                });
            }
        }

        // Close path if needed
        if (shape.closed) {
            segments.push({ type: PathSegmentType.CLOSE, points: [] });
        }

        shape.path.segments = segments;
    }

    private distance(p1: Point, p2: Point): number {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    private reflectPoint(point: Point, center: Point): Point {
        return {
            x: 2 * center.x - point.x,
            y: 2 * center.y - point.y,
        };
    }

    private normalize(v: Point): Point {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    }

    private pointAtDistance(from: Point, direction: Point, dist: number): Point {
        const norm = this.normalize({ x: direction.x - from.x, y: direction.y - from.y });
        return {
            x: from.x + norm.x * dist,
            y: from.y + norm.y * dist,
        };
    }

    private getPointOnSegment(shape: VectorShape, segmentIndex: number, t: number): Point | null {
        if (segmentIndex < 1 || segmentIndex >= shape.path.segments.length) return null;

        const segment = shape.path.segments[segmentIndex];
        const prevAnchor = shape.anchors[segmentIndex - 1];
        const currAnchor = shape.anchors[segmentIndex % shape.anchors.length];

        if (segment.type === PathSegmentType.LINE) {
            return {
                x: prevAnchor.position.x + t * (currAnchor.position.x - prevAnchor.position.x),
                y: prevAnchor.position.y + t * (currAnchor.position.y - prevAnchor.position.y),
            };
        } else if (segment.type === PathSegmentType.BEZIER) {
            return this.cubicBezierPoint(
                prevAnchor.position,
                prevAnchor.handleOut ?? prevAnchor.position,
                currAnchor.handleIn ?? currAnchor.position,
                currAnchor.position,
                t
            );
        }

        return null;
    }

    private cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        return {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
        };
    }

    private closestPointOnSegment(
        p0: Point,
        p1: Point | undefined,
        p2: Point | undefined,
        p3: Point,
        _segmentType: PathSegmentType,
        point: Point
    ): { point: Point; t: number; distance: number } {
        // Simplified: sample points along the curve
        let bestT = 0;
        let bestDist = Infinity;
        let bestPoint = p0;

        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let pt: Point;

            if (p1 && p2) {
                pt = this.cubicBezierPoint(p0, p1, p2, p3, t);
            } else {
                pt = {
                    x: p0.x + t * (p3.x - p0.x),
                    y: p0.y + t * (p3.y - p0.y),
                };
            }

            const dist = this.distance(pt, point);
            if (dist < bestDist) {
                bestDist = dist;
                bestT = t;
                bestPoint = pt;
            }
        }

        return { point: bestPoint, t: bestT, distance: bestDist };
    }

    private douglasPeucker(points: Point[], tolerance: number): Point[] {
        if (points.length <= 2) return points;

        let maxDist = 0;
        let maxIndex = 0;

        const start = points[0];
        const end = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.perpendicularDistance(points[i], start, end);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }

        if (maxDist > tolerance) {
            const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
            return [...left.slice(0, -1), ...right];
        }

        return [start, end];
    }

    private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return this.distance(point, lineStart);

        const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)));
        const proj = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy,
        };

        return this.distance(point, proj);
    }

    private parseSVGPath(pathData: string): AnchorPoint[] {
        const anchors: AnchorPoint[] = [];
        const commands = pathData.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) || [];

        let currentX = 0;
        let currentY = 0;

        for (const cmd of commands) {
            const type = cmd[0];
            const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

            switch (type.toUpperCase()) {
                case 'M':
                    currentX = type === 'M' ? args[0] : currentX + args[0];
                    currentY = type === 'M' ? args[1] : currentY + args[1];
                    anchors.push(this.createAnchor({ x: currentX, y: currentY }, 'corner'));
                    break;

                case 'L':
                    currentX = type === 'L' ? args[0] : currentX + args[0];
                    currentY = type === 'L' ? args[1] : currentY + args[1];
                    anchors.push(this.createAnchor({ x: currentX, y: currentY }, 'corner'));
                    break;

                case 'H':
                    currentX = type === 'H' ? args[0] : currentX + args[0];
                    anchors.push(this.createAnchor({ x: currentX, y: currentY }, 'corner'));
                    break;

                case 'V':
                    currentY = type === 'V' ? args[0] : currentY + args[0];
                    anchors.push(this.createAnchor({ x: currentX, y: currentY }, 'corner'));
                    break;

                case 'C':
                    // Cubic bezier
                    if (anchors.length > 0) {
                        anchors[anchors.length - 1].handleOut = {
                            x: type === 'C' ? args[0] : currentX + args[0],
                            y: type === 'C' ? args[1] : currentY + args[1],
                        };
                    }
                    currentX = type === 'C' ? args[4] : currentX + args[4];
                    currentY = type === 'C' ? args[5] : currentY + args[5];
                    anchors.push({
                        id: this.generateId(),
                        position: { x: currentX, y: currentY },
                        type: 'smooth',
                        handleIn: {
                            x: type === 'C' ? args[2] : currentX + args[2] - args[4],
                            y: type === 'C' ? args[3] : currentY + args[3] - args[5],
                        },
                    });
                    break;

                case 'Q':
                    // Quadratic bezier - convert to smooth anchor
                    currentX = type === 'Q' ? args[2] : currentX + args[2];
                    currentY = type === 'Q' ? args[3] : currentY + args[3];
                    anchors.push(this.createAnchor({ x: currentX, y: currentY }, 'smooth'));
                    break;

                case 'Z':
                    // Close path - handled by caller
                    break;
            }
        }

        return anchors;
    }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createVectorToolsManager(): VectorToolsManager {
    return new VectorToolsManager();
}

/**
 * Pattern Maker - Phase 4 Professional Design Tools
 *
 * Pattern piece creation and manipulation for fashion design.
 * Supports seam allowances, grading, notches, and dart manipulation.
 */

import type { Point } from '../types';

export interface PatternPiece {
    id: string;
    name: string;
    description?: string;
    outline: PatternPoint[];
    seamAllowance: number;
    grainline?: Grainline;
    notches: Notch[];
    darts: Dart[];
    internalLines: InternalLine[];
    labels: PatternLabel[];
    mirrorAxis?: MirrorAxis;
    placementInfo?: PlacementInfo;
    metadata: PatternMetadata;
}

export interface PatternPoint {
    x: number;
    y: number;
    type: PatternPointType;
    curveControl1?: Point;
    curveControl2?: Point;
    label?: string;
}

export type PatternPointType =
    | 'corner'
    | 'curve'
    | 'smooth'
    | 'symmetric';

export interface Grainline {
    start: Point;
    end: Point;
    type: GrainlineType;
}

export type GrainlineType = 'straight' | 'bias' | 'crossgrain';

export interface Notch {
    id: string;
    position: number; // 0-1 along the outline
    type: NotchType;
    label?: string;
    matchingPieceId?: string;
    matchingNotchId?: string;
}

export type NotchType = 'single' | 'double' | 'triple' | 'diamond' | 'circle';

export interface Dart {
    id: string;
    apex: Point;
    leftLeg: Point;
    rightLeg: Point;
    width: number;
    length: number;
    foldDirection: 'left' | 'right' | 'none';
    type: DartType;
}

export type DartType = 'straight' | 'curved' | 'double-ended';

export interface InternalLine {
    id: string;
    points: Point[];
    type: InternalLineType;
    label?: string;
}

export type InternalLineType =
    | 'foldline'
    | 'placement'
    | 'buttonhole'
    | 'pocket'
    | 'ease'
    | 'construction';

export interface PatternLabel {
    id: string;
    position: Point;
    text: string;
    type: PatternLabelType;
    rotation?: number;
    fontSize?: number;
}

export type PatternLabelType =
    | 'piece-name'
    | 'size'
    | 'quantity'
    | 'grainline'
    | 'instruction'
    | 'custom';

export interface MirrorAxis {
    start: Point;
    end: Point;
    cutOnFold: boolean;
}

export interface PlacementInfo {
    fabricLayer: 'single' | 'double' | 'fold';
    quantity: number;
    rightSide: 'up' | 'down';
    interfacing: boolean;
    lining: boolean;
}

export interface PatternMetadata {
    createdAt: Date;
    modifiedAt: Date;
    version: string;
    author?: string;
    garmentType?: string;
    size?: string;
    units: 'cm' | 'inches';
}

export interface GradingRule {
    id: string;
    pointIndex: number;
    xGrade: number;
    yGrade: number;
    perSize: boolean;
}

export interface GradedSize {
    name: string;
    grade: number; // Steps from base size
    measurements: Map<string, number>;
}

export interface Pattern {
    id: string;
    name: string;
    description?: string;
    pieces: Map<string, PatternPiece>;
    baseSize: string;
    sizes: GradedSize[];
    gradingRules: GradingRule[];
    metadata: PatternMetadata;
}

export type PatternEvent =
    | { type: 'pieceAdded'; piece: PatternPiece }
    | { type: 'pieceRemoved'; pieceId: string }
    | { type: 'pieceUpdated'; piece: PatternPiece }
    | { type: 'graded'; sizes: GradedSize[] }
    | { type: 'exported'; format: string };

type PatternEventListener = (event: PatternEvent) => void;

/**
 * Pattern Maker for fashion design
 */
export class PatternMaker {
    private pattern: Pattern | null = null;
    private listeners: Set<PatternEventListener> = new Set();
    private idCounter: number = 0;

    constructor() { }

    /**
     * Create a new pattern
     */
    createPattern(
        name: string,
        baseSize: string = 'M',
        units: 'cm' | 'inches' = 'cm'
    ): Pattern {
        this.pattern = {
            id: this.generateId(),
            name,
            pieces: new Map(),
            baseSize,
            sizes: [{ name: baseSize, grade: 0, measurements: new Map() }],
            gradingRules: [],
            metadata: {
                createdAt: new Date(),
                modifiedAt: new Date(),
                version: '1.0.0',
                units
            }
        };

        return this.pattern;
    }

    /**
     * Get current pattern
     */
    getPattern(): Pattern | null {
        return this.pattern;
    }

    /**
     * Create a pattern piece
     */
    createPiece(
        name: string,
        outline: PatternPoint[],
        options: Partial<PatternPiece> = {}
    ): PatternPiece {
        const piece: PatternPiece = {
            id: this.generateId(),
            name,
            outline,
            seamAllowance: options.seamAllowance ?? 1, // 1cm default
            grainline: options.grainline,
            notches: options.notches ?? [],
            darts: options.darts ?? [],
            internalLines: options.internalLines ?? [],
            labels: options.labels ?? [],
            mirrorAxis: options.mirrorAxis,
            placementInfo: options.placementInfo ?? {
                fabricLayer: 'single',
                quantity: 1,
                rightSide: 'up',
                interfacing: false,
                lining: false
            },
            metadata: {
                createdAt: new Date(),
                modifiedAt: new Date(),
                version: '1.0.0',
                units: this.pattern?.metadata.units ?? 'cm'
            }
        };

        // Add default piece name label
        if (!piece.labels.some(l => l.type === 'piece-name')) {
            const center = this.calculatePieceCenter(outline);
            piece.labels.push({
                id: this.generateId(),
                position: center,
                text: name,
                type: 'piece-name'
            });
        }

        return piece;
    }

    /**
     * Add piece to pattern
     */
    addPiece(piece: PatternPiece): void {
        if (!this.pattern) {
            throw new Error('No pattern created');
        }

        this.pattern.pieces.set(piece.id, piece);
        this.pattern.metadata.modifiedAt = new Date();
        this.emit({ type: 'pieceAdded', piece });
    }

    /**
     * Remove piece from pattern
     */
    removePiece(pieceId: string): boolean {
        if (!this.pattern) return false;

        const result = this.pattern.pieces.delete(pieceId);
        if (result) {
            this.pattern.metadata.modifiedAt = new Date();
            this.emit({ type: 'pieceRemoved', pieceId });
        }
        return result;
    }

    /**
     * Get piece by ID
     */
    getPiece(pieceId: string): PatternPiece | undefined {
        return this.pattern?.pieces.get(pieceId);
    }

    /**
     * Update piece
     */
    updatePiece(piece: PatternPiece): void {
        if (!this.pattern) {
            throw new Error('No pattern created');
        }

        if (!this.pattern.pieces.has(piece.id)) {
            throw new Error(`Piece ${piece.id} not found`);
        }

        piece.metadata.modifiedAt = new Date();
        this.pattern.pieces.set(piece.id, piece);
        this.pattern.metadata.modifiedAt = new Date();
        this.emit({ type: 'pieceUpdated', piece });
    }

    /**
     * Create basic bodice front
     */
    createBasicBodiceFront(
        bustCircumference: number,
        waistCircumference: number,
        hipCircumference: number,
        shoulderWidth: number,
        centerFrontLength: number
    ): PatternPiece {
        const halfBust = bustCircumference / 4;
        const halfWaist = waistCircumference / 4;
        const ease = 2; // cm ease

        const outline: PatternPoint[] = [
            // Start at neckline
            { x: 0, y: 0, type: 'corner', label: 'CF Neck' },
            // Shoulder point
            { x: shoulderWidth / 2, y: -2, type: 'curve' },
            // Armhole
            { x: halfBust + ease - 4, y: 5, type: 'curve' },
            { x: halfBust + ease, y: centerFrontLength / 2, type: 'smooth' },
            // Side seam at bust
            { x: halfBust + ease, y: centerFrontLength * 0.7, type: 'curve' },
            // Side seam at waist
            { x: halfWaist + ease + 2, y: centerFrontLength, type: 'corner', label: 'Side Waist' },
            // Center front waist
            { x: 0, y: centerFrontLength, type: 'corner', label: 'CF Waist' }
        ];

        const piece = this.createPiece('Bodice Front', outline, {
            seamAllowance: 1.5,
            grainline: {
                start: { x: halfBust / 2, y: 5 },
                end: { x: halfBust / 2, y: centerFrontLength - 5 },
                type: 'straight'
            },
            placementInfo: {
                fabricLayer: 'fold',
                quantity: 1,
                rightSide: 'up',
                interfacing: false,
                lining: false
            },
            mirrorAxis: {
                start: { x: 0, y: 0 },
                end: { x: 0, y: centerFrontLength },
                cutOnFold: true
            }
        });

        // Add bust dart
        piece.darts.push({
            id: this.generateId(),
            apex: { x: halfBust / 2, y: centerFrontLength * 0.5 },
            leftLeg: { x: halfWaist / 2 - 1, y: centerFrontLength },
            rightLeg: { x: halfWaist / 2 + 1, y: centerFrontLength },
            width: 2,
            length: centerFrontLength * 0.3,
            foldDirection: 'right',
            type: 'straight'
        });

        return piece;
    }

    /**
     * Create basic bodice back
     */
    createBasicBodiceBack(
        bustCircumference: number,
        waistCircumference: number,
        shoulderWidth: number,
        centerBackLength: number
    ): PatternPiece {
        const halfBust = bustCircumference / 4;
        const halfWaist = waistCircumference / 4;
        const ease = 2;

        const outline: PatternPoint[] = [
            { x: 0, y: 0, type: 'corner', label: 'CB Neck' },
            { x: shoulderWidth / 2, y: -1.5, type: 'curve' },
            { x: halfBust + ease - 5, y: 4, type: 'curve' },
            { x: halfBust + ease, y: centerBackLength / 2, type: 'smooth' },
            { x: halfBust + ease, y: centerBackLength * 0.7, type: 'curve' },
            { x: halfWaist + ease + 2, y: centerBackLength, type: 'corner' },
            { x: 0, y: centerBackLength, type: 'corner', label: 'CB Waist' }
        ];

        return this.createPiece('Bodice Back', outline, {
            seamAllowance: 1.5,
            grainline: {
                start: { x: halfBust / 2, y: 5 },
                end: { x: halfBust / 2, y: centerBackLength - 5 },
                type: 'straight'
            },
            mirrorAxis: {
                start: { x: 0, y: 0 },
                end: { x: 0, y: centerBackLength },
                cutOnFold: true
            }
        });
    }

    /**
     * Create basic sleeve
     */
    createBasicSleeve(
        armholeCircumference: number,
        sleeveLength: number,
        wristCircumference: number
    ): PatternPiece {
        const halfArmhole = armholeCircumference / 2;
        const halfWrist = wristCircumference / 2;
        const capHeight = halfArmhole / 3;

        const outline: PatternPoint[] = [
            // Underarm seam start
            { x: -halfArmhole / 2, y: capHeight, type: 'corner' },
            // Cap curve - back
            { x: -halfArmhole / 2, y: capHeight / 2, type: 'curve' },
            // Cap peak
            { x: 0, y: 0, type: 'smooth', label: 'Sleeve Cap' },
            // Cap curve - front
            { x: halfArmhole / 2, y: capHeight / 2, type: 'curve' },
            // Underarm seam
            { x: halfArmhole / 2, y: capHeight, type: 'corner' },
            // Wrist - outer
            { x: halfWrist + 2, y: sleeveLength, type: 'corner' },
            // Wrist - inner
            { x: -halfWrist - 2, y: sleeveLength, type: 'corner' }
        ];

        const piece = this.createPiece('Sleeve', outline, {
            seamAllowance: 1.5,
            grainline: {
                start: { x: 0, y: capHeight + 5 },
                end: { x: 0, y: sleeveLength - 5 },
                type: 'straight'
            },
            placementInfo: {
                fabricLayer: 'single',
                quantity: 2,
                rightSide: 'up',
                interfacing: false,
                lining: false
            }
        });

        // Add notches for matching
        piece.notches.push(
            { id: this.generateId(), position: 0.15, type: 'single', label: 'Back' },
            { id: this.generateId(), position: 0.35, type: 'double', label: 'Front' }
        );

        return piece;
    }

    /**
     * Create basic skirt front
     */
    createBasicSkirtFront(
        waistCircumference: number,
        hipCircumference: number,
        hipDepth: number,
        skirtLength: number
    ): PatternPiece {
        const halfWaist = waistCircumference / 4;
        const halfHip = hipCircumference / 4;
        const ease = 1.5;

        const outline: PatternPoint[] = [
            // Center front waist
            { x: 0, y: 0, type: 'corner', label: 'CF Waist' },
            // Side waist
            { x: halfWaist + ease + 1, y: 0, type: 'corner' },
            // Side hip
            { x: halfHip + ease, y: hipDepth, type: 'curve' },
            // Side hem
            { x: halfHip + ease + 2, y: skirtLength, type: 'corner' },
            // Center front hem
            { x: 0, y: skirtLength, type: 'corner', label: 'CF Hem' }
        ];

        const piece = this.createPiece('Skirt Front', outline, {
            seamAllowance: 1.5,
            grainline: {
                start: { x: halfHip / 2, y: 5 },
                end: { x: halfHip / 2, y: skirtLength - 5 },
                type: 'straight'
            },
            mirrorAxis: {
                start: { x: 0, y: 0 },
                end: { x: 0, y: skirtLength },
                cutOnFold: true
            }
        });

        // Add waist dart
        piece.darts.push({
            id: this.generateId(),
            apex: { x: halfWaist / 2, y: hipDepth - 2 },
            leftLeg: { x: halfWaist / 2 - 1, y: 0 },
            rightLeg: { x: halfWaist / 2 + 1, y: 0 },
            width: 2,
            length: hipDepth - 4,
            foldDirection: 'right',
            type: 'straight'
        });

        return piece;
    }

    /**
     * Add seam allowance to piece
     */
    addSeamAllowance(piece: PatternPiece, allowance: number): PatternPoint[] {
        const outline = piece.outline;
        const offset: PatternPoint[] = [];

        for (let i = 0; i < outline.length; i++) {
            const prev = outline[(i - 1 + outline.length) % outline.length];
            const curr = outline[i];
            const next = outline[(i + 1) % outline.length];

            // Calculate normals for both edges
            const normal1 = this.calculateNormal(prev, curr);
            const normal2 = this.calculateNormal(curr, next);

            // Average the normals for the corner
            const avgNormal = {
                x: (normal1.x + normal2.x) / 2,
                y: (normal1.y + normal2.y) / 2
            };

            // Normalize
            const len = Math.sqrt(avgNormal.x ** 2 + avgNormal.y ** 2);
            if (len > 0) {
                avgNormal.x /= len;
                avgNormal.y /= len;
            }

            // Offset point
            offset.push({
                x: curr.x + avgNormal.x * allowance,
                y: curr.y + avgNormal.y * allowance,
                type: curr.type,
                curveControl1: curr.curveControl1
                    ? {
                        x: curr.curveControl1.x + avgNormal.x * allowance,
                        y: curr.curveControl1.y + avgNormal.y * allowance
                    }
                    : undefined,
                curveControl2: curr.curveControl2
                    ? {
                        x: curr.curveControl2.x + avgNormal.x * allowance,
                        y: curr.curveControl2.y + avgNormal.y * allowance
                    }
                    : undefined,
                label: curr.label
            });
        }

        return offset;
    }

    private calculateNormal(p1: Point, p2: Point): Point {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return { x: 0, y: -1 };

        // Perpendicular (rotate 90 degrees)
        return {
            x: -dy / len,
            y: dx / len
        };
    }

    /**
     * Add notch to piece
     */
    addNotch(
        pieceId: string,
        position: number,
        type: NotchType = 'single',
        label?: string
    ): Notch {
        const piece = this.getPiece(pieceId);
        if (!piece) {
            throw new Error(`Piece ${pieceId} not found`);
        }

        const notch: Notch = {
            id: this.generateId(),
            position: Math.max(0, Math.min(1, position)),
            type,
            label
        };

        piece.notches.push(notch);
        this.updatePiece(piece);
        return notch;
    }

    /**
     * Add dart to piece
     */
    addDart(pieceId: string, dart: Omit<Dart, 'id'>): Dart {
        const piece = this.getPiece(pieceId);
        if (!piece) {
            throw new Error(`Piece ${pieceId} not found`);
        }

        const newDart: Dart = {
            id: this.generateId(),
            ...dart
        };

        piece.darts.push(newDart);
        this.updatePiece(piece);
        return newDart;
    }

    /**
     * Add grainline to piece
     */
    setGrainline(
        pieceId: string,
        start: Point,
        end: Point,
        type: GrainlineType = 'straight'
    ): void {
        const piece = this.getPiece(pieceId);
        if (!piece) {
            throw new Error(`Piece ${pieceId} not found`);
        }

        piece.grainline = { start, end, type };
        this.updatePiece(piece);
    }

    /**
     * Add grading rule
     */
    addGradingRule(
        pieceId: string,
        pointIndex: number,
        xGrade: number,
        yGrade: number,
        perSize: boolean = true
    ): GradingRule {
        if (!this.pattern) {
            throw new Error('No pattern created');
        }

        const rule: GradingRule = {
            id: `${pieceId}-${pointIndex}`,
            pointIndex,
            xGrade,
            yGrade,
            perSize
        };

        this.pattern.gradingRules.push(rule);
        return rule;
    }

    /**
     * Grade pattern to different sizes
     */
    gradePattern(sizes: GradedSize[]): Map<string, Map<string, PatternPiece>> {
        if (!this.pattern) {
            throw new Error('No pattern created');
        }

        const gradedPieces = new Map<string, Map<string, PatternPiece>>();

        for (const size of sizes) {
            const sizePieces = new Map<string, PatternPiece>();

            for (const [pieceId, piece] of this.pattern.pieces) {
                const gradedPiece = this.gradePiece(piece, size.grade);
                sizePieces.set(pieceId, gradedPiece);
            }

            gradedPieces.set(size.name, sizePieces);
        }

        this.pattern.sizes = sizes;
        this.emit({ type: 'graded', sizes });

        return gradedPieces;
    }

    private gradePiece(piece: PatternPiece, gradeSteps: number): PatternPiece {
        if (!this.pattern) {
            throw new Error('No pattern created');
        }

        const gradedOutline: PatternPoint[] = [];

        for (let i = 0; i < piece.outline.length; i++) {
            const point = piece.outline[i];
            const rule = this.pattern.gradingRules.find(
                r => r.id === `${piece.id}-${i}`
            );

            if (rule) {
                const multiplier = rule.perSize ? gradeSteps : 1;
                gradedOutline.push({
                    ...point,
                    x: point.x + rule.xGrade * multiplier,
                    y: point.y + rule.yGrade * multiplier
                });
            } else {
                gradedOutline.push({ ...point });
            }
        }

        return {
            ...piece,
            id: `${piece.id}-graded`,
            outline: gradedOutline,
            metadata: {
                ...piece.metadata,
                modifiedAt: new Date()
            }
        };
    }

    /**
     * Mirror piece along axis
     */
    mirrorPiece(piece: PatternPiece): PatternPiece {
        if (!piece.mirrorAxis) {
            throw new Error('Piece has no mirror axis defined');
        }

        const axis = piece.mirrorAxis;
        const mirroredOutline: PatternPoint[] = [];

        // Mirror each point across the axis
        for (const point of piece.outline) {
            mirroredOutline.push(this.mirrorPoint(point, axis));
        }

        // Combine original and mirrored (in reverse order)
        const fullOutline = [
            ...piece.outline,
            ...mirroredOutline.slice(1, -1).reverse()
        ];

        return {
            ...piece,
            id: `${piece.id}-mirrored`,
            outline: fullOutline,
            mirrorAxis: undefined
        };
    }

    private mirrorPoint(point: PatternPoint, axis: MirrorAxis): PatternPoint {
        // Axis vector
        const ax = axis.end.x - axis.start.x;
        const ay = axis.end.y - axis.start.y;
        const len = Math.sqrt(ax * ax + ay * ay);

        if (len === 0) return { ...point };

        // Normalized axis
        const nx = ax / len;
        const ny = ay / len;

        // Vector from axis start to point
        const px = point.x - axis.start.x;
        const py = point.y - axis.start.y;

        // Project onto axis
        const dot = px * nx + py * ny;

        // Mirror point
        return {
            ...point,
            x: 2 * (axis.start.x + dot * nx) - point.x,
            y: 2 * (axis.start.y + dot * ny) - point.y
        };
    }

    /**
     * Calculate piece area
     */
    calculatePieceArea(piece: PatternPiece): number {
        const outline = piece.outline;
        let area = 0;

        for (let i = 0; i < outline.length; i++) {
            const j = (i + 1) % outline.length;
            area += outline[i].x * outline[j].y;
            area -= outline[j].x * outline[i].y;
        }

        return Math.abs(area) / 2;
    }

    /**
     * Calculate piece perimeter
     */
    calculatePiecePerimeter(piece: PatternPiece): number {
        const outline = piece.outline;
        let perimeter = 0;

        for (let i = 0; i < outline.length; i++) {
            const j = (i + 1) % outline.length;
            const dx = outline[j].x - outline[i].x;
            const dy = outline[j].y - outline[i].y;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }

        return perimeter;
    }

    private calculatePieceCenter(outline: PatternPoint[]): Point {
        let cx = 0, cy = 0;

        for (const point of outline) {
            cx += point.x;
            cy += point.y;
        }

        return {
            x: cx / outline.length,
            y: cy / outline.length
        };
    }

    /**
     * Export piece to SVG
     */
    exportPieceToSVG(piece: PatternPiece, includeSeamAllowance: boolean = true): string {
        const outline = piece.outline;
        const seamAllowanceOutline = includeSeamAllowance
            ? this.addSeamAllowance(piece, piece.seamAllowance)
            : null;

        // Calculate bounds
        const allPoints = [...outline, ...(seamAllowanceOutline || [])];
        const minX = Math.min(...allPoints.map(p => p.x)) - 10;
        const minY = Math.min(...allPoints.map(p => p.y)) - 10;
        const maxX = Math.max(...allPoints.map(p => p.x)) + 10;
        const maxY = Math.max(...allPoints.map(p => p.y)) + 10;
        const width = maxX - minX;
        const height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}mm" height="${height}mm">`;
        svg += '<style>.outline { fill: none; stroke: black; stroke-width: 0.5mm; }';
        svg += '.seam-allowance { fill: none; stroke: gray; stroke-width: 0.25mm; stroke-dasharray: 5,5; }';
        svg += '.grainline { fill: none; stroke: black; stroke-width: 0.3mm; marker-end: url(#arrow); }';
        svg += '.notch { fill: black; stroke: none; }';
        svg += '.dart { fill: none; stroke: black; stroke-width: 0.3mm; }';
        svg += '.label { font-family: Arial; font-size: 4mm; fill: black; }</style>';

        // Arrow marker for grainline
        svg += '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">';
        svg += '<path d="M0,0 L0,6 L9,3 z" fill="black"/></marker></defs>';

        // Draw seam allowance
        if (seamAllowanceOutline) {
            svg += `<path class="seam-allowance" d="${this.pointsToSVGPath(seamAllowanceOutline)}"/>`;
        }

        // Draw outline
        svg += `<path class="outline" d="${this.pointsToSVGPath(outline)}"/>`;

        // Draw grainline
        if (piece.grainline) {
            const gl = piece.grainline;
            svg += `<line class="grainline" x1="${gl.start.x}" y1="${gl.start.y}" x2="${gl.end.x}" y2="${gl.end.y}"/>`;
        }

        // Draw notches
        for (const notch of piece.notches) {
            const pos = this.getPointAtPosition(outline, notch.position);
            if (pos) {
                switch (notch.type) {
                    case 'single':
                        svg += `<path class="notch" d="M${pos.x - 1},${pos.y} L${pos.x},${pos.y + 5} L${pos.x + 1},${pos.y} Z"/>`;
                        break;
                    case 'double':
                        svg += `<path class="notch" d="M${pos.x - 2},${pos.y} L${pos.x - 1},${pos.y + 5} L${pos.x},${pos.y} Z"/>`;
                        svg += `<path class="notch" d="M${pos.x},${pos.y} L${pos.x + 1},${pos.y + 5} L${pos.x + 2},${pos.y} Z"/>`;
                        break;
                    case 'diamond':
                        svg += `<path class="notch" d="M${pos.x},${pos.y - 2} L${pos.x + 2},${pos.y} L${pos.x},${pos.y + 2} L${pos.x - 2},${pos.y} Z"/>`;
                        break;
                }
            }
        }

        // Draw darts
        for (const dart of piece.darts) {
            svg += `<path class="dart" d="M${dart.leftLeg.x},${dart.leftLeg.y} L${dart.apex.x},${dart.apex.y} L${dart.rightLeg.x},${dart.rightLeg.y}"/>`;
        }

        // Draw labels
        for (const label of piece.labels) {
            const transform = label.rotation ? ` transform="rotate(${label.rotation} ${label.position.x} ${label.position.y})"` : '';
            svg += `<text class="label" x="${label.position.x}" y="${label.position.y}"${transform}>${label.text}</text>`;
        }

        svg += '</svg>';
        return svg;
    }

    private pointsToSVGPath(points: PatternPoint[]): string {
        if (points.length === 0) return '';

        let d = `M${points[0].x},${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            const prevPoint = points[i - 1];

            if (point.type === 'curve' && point.curveControl1) {
                if (point.curveControl2) {
                    d += ` C${point.curveControl1.x},${point.curveControl1.y} ${point.curveControl2.x},${point.curveControl2.y} ${point.x},${point.y}`;
                } else {
                    d += ` Q${point.curveControl1.x},${point.curveControl1.y} ${point.x},${point.y}`;
                }
            } else {
                d += ` L${point.x},${point.y}`;
            }
        }

        d += ' Z';
        return d;
    }

    private getPointAtPosition(outline: PatternPoint[], position: number): Point | null {
        if (outline.length < 2) return null;

        let totalLength = 0;
        const lengths: number[] = [0];

        for (let i = 1; i < outline.length; i++) {
            const dx = outline[i].x - outline[i - 1].x;
            const dy = outline[i].y - outline[i - 1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
            lengths.push(totalLength);
        }

        // Add closing segment
        const dx = outline[0].x - outline[outline.length - 1].x;
        const dy = outline[0].y - outline[outline.length - 1].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
        lengths.push(totalLength);

        const targetLength = position * totalLength;

        for (let i = 1; i < lengths.length; i++) {
            if (targetLength <= lengths[i]) {
                const segmentStart = lengths[i - 1];
                const segmentLength = lengths[i] - lengths[i - 1];
                const t = (targetLength - segmentStart) / segmentLength;

                const p1 = outline[(i - 1) % outline.length];
                const p2 = outline[i % outline.length];

                return {
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                };
            }
        }

        return outline[0];
    }

    /**
     * Event handling
     */
    addEventListener(listener: PatternEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: PatternEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${this.idCounter++}`;
    }
}

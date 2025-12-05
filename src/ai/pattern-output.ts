/**
 * Pattern Output Generator
 *
 * Generates printable pattern files (PDF, DXF) for manufacturing.
 * Includes seam allowances, grain lines, notches, and cutting instructions.
 */

/**
 * Pattern piece types
 */
export enum PatternPieceType {
    FRONT_BODICE = 'front_bodice',
    BACK_BODICE = 'back_bodice',
    SLEEVE = 'sleeve',
    COLLAR = 'collar',
    CUFF = 'cuff',
    POCKET = 'pocket',
    WAISTBAND = 'waistband',
    FRONT_PANEL = 'front_panel',
    BACK_PANEL = 'back_panel',
    SIDE_PANEL = 'side_panel',
    YOKE = 'yoke',
    FACING = 'facing',
    LINING = 'lining',
    HOOD = 'hood',
    GUSSET = 'gusset',
    FLY = 'fly',
    BELT_LOOP = 'belt_loop',
    CUSTOM = 'custom',
}

/**
 * Point coordinate
 */
export interface PatternPoint {
    x: number;
    y: number;
}

/**
 * Curve definition for pattern edges
 */
export interface PatternCurve {
    /** Curve type */
    type: 'line' | 'bezier' | 'arc';
    /** Start point */
    start: PatternPoint;
    /** End point */
    end: PatternPoint;
    /** Control points for bezier */
    controlPoints?: PatternPoint[];
    /** Center and radius for arc */
    arc?: {
        center: PatternPoint;
        radius: number;
        startAngle: number;
        endAngle: number;
    };
}

/**
 * Notch mark on pattern
 */
export interface PatternNotch {
    /** Position on pattern edge */
    position: PatternPoint;
    /** Notch type */
    type: 'single' | 'double' | 'triple' | 'diamond';
    /** Notch angle */
    angle: number;
    /** Notch size in mm */
    size: number;
    /** Matching notch ID */
    matchId?: string;
}

/**
 * Grain line marker
 */
export interface GrainLine {
    /** Start point */
    start: PatternPoint;
    /** End point */
    end: PatternPoint;
    /** Label */
    label: string;
    /** Arrow style */
    arrowStyle: 'single' | 'double' | 'none';
}

/**
 * Dart definition
 */
export interface PatternDart {
    /** Dart apex position */
    apex: PatternPoint;
    /** Dart legs */
    legs: [PatternPoint, PatternPoint];
    /** Dart depth in cm */
    depth: number;
    /** Dart type */
    type: 'single' | 'double' | 'french';
}

/**
 * Pattern annotation
 */
export interface PatternAnnotation {
    /** Position */
    position: PatternPoint;
    /** Text content */
    text: string;
    /** Font size in points */
    fontSize: number;
    /** Rotation angle in degrees */
    rotation: number;
    /** Annotation type */
    type: 'label' | 'measurement' | 'instruction' | 'size';
}

/**
 * Pattern piece definition
 */
export interface PatternPiece {
    /** Unique ID */
    id: string;
    /** Piece type */
    type: PatternPieceType;
    /** Display name */
    name: string;
    /** Outline curves */
    outline: PatternCurve[];
    /** Seam allowance in cm */
    seamAllowance: number;
    /** Seam allowance line (offset from outline) */
    seamAllowanceLine?: PatternCurve[];
    /** Grain line */
    grainLine?: GrainLine;
    /** Notches */
    notches: PatternNotch[];
    /** Darts */
    darts: PatternDart[];
    /** Internal lines (fold lines, topstitch guides) */
    internalLines: PatternCurve[];
    /** Annotations */
    annotations: PatternAnnotation[];
    /** Cut quantity */
    cutQuantity: number;
    /** Mirror cut (cut on fold) */
    cutOnFold: boolean;
    /** Fold line if cut on fold */
    foldLine?: PatternCurve;
    /** Fabric type (self, lining, interfacing) */
    fabricType: 'self' | 'lining' | 'interfacing' | 'contrast';
    /** Piece area in cm² */
    area?: number;
}

/**
 * Pattern layout for cutting
 */
export interface PatternLayout {
    /** Layout name */
    name: string;
    /** Fabric width in cm */
    fabricWidth: number;
    /** Total fabric length needed in cm */
    fabricLength: number;
    /** Placed pieces */
    pieces: {
        pieceId: string;
        position: PatternPoint;
        rotation: number;
        mirrored: boolean;
    }[];
    /** Layout efficiency percentage */
    efficiency: number;
}

/**
 * Export settings
 */
export interface ExportSettings {
    /** Scale (1 = actual size) */
    scale: number;
    /** Paper size for PDF */
    paperSize: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'LETTER' | 'TABLOID' | 'CUSTOM';
    /** Custom paper dimensions in mm */
    customPaper?: { width: number; height: number };
    /** Include seam allowance */
    includeSeamAllowance: boolean;
    /** Show seam allowance line */
    showSeamAllowanceLine: boolean;
    /** Show notches */
    showNotches: boolean;
    /** Show grain lines */
    showGrainLines: boolean;
    /** Show annotations */
    showAnnotations: boolean;
    /** Show measurements */
    showMeasurements: boolean;
    /** Line weight in mm */
    lineWeight: number;
    /** Units for dimensions */
    units: 'cm' | 'inches';
    /** Include tile marks for home printing */
    includeTileMarks: boolean;
    /** Tile overlap in mm */
    tileOverlap: number;
}

/**
 * Paper size dimensions in mm
 */
const PAPER_SIZES: Record<string, { width: number; height: number }> = {
    A0: { width: 841, height: 1189 },
    A1: { width: 594, height: 841 },
    A2: { width: 420, height: 594 },
    A3: { width: 297, height: 420 },
    A4: { width: 210, height: 297 },
    LETTER: { width: 216, height: 279 },
    TABLOID: { width: 279, height: 432 },
};

/**
 * Pattern Output Generator class
 */
export class PatternOutputGenerator {
    private pieces: Map<string, PatternPiece> = new Map();
    private layouts: PatternLayout[] = [];
    private exportSettings: ExportSettings = {
        scale: 1,
        paperSize: 'A1',
        includeSeamAllowance: true,
        showSeamAllowanceLine: true,
        showNotches: true,
        showGrainLines: true,
        showAnnotations: true,
        showMeasurements: true,
        lineWeight: 0.5,
        units: 'cm',
        includeTileMarks: false,
        tileOverlap: 20,
    };

    /**
     * Add a pattern piece
     */
    addPiece(piece: PatternPiece): void {
        // Calculate seam allowance line if not provided
        if (!piece.seamAllowanceLine && piece.seamAllowance > 0) {
            piece.seamAllowanceLine = this.generateSeamAllowanceLine(
                piece.outline,
                piece.seamAllowance
            );
        }

        // Calculate area
        piece.area = this.calculatePieceArea(piece.outline);

        this.pieces.set(piece.id, piece);
    }

    /**
     * Remove a pattern piece
     */
    removePiece(pieceId: string): void {
        this.pieces.delete(pieceId);
    }

    /**
     * Get all pieces
     */
    getPieces(): PatternPiece[] {
        return Array.from(this.pieces.values());
    }

    /**
     * Get piece by ID
     */
    getPiece(pieceId: string): PatternPiece | undefined {
        return this.pieces.get(pieceId);
    }

    /**
     * Update export settings
     */
    updateExportSettings(settings: Partial<ExportSettings>): void {
        this.exportSettings = { ...this.exportSettings, ...settings };
    }

    /**
     * Get current export settings
     */
    getExportSettings(): ExportSettings {
        return { ...this.exportSettings };
    }

    /**
     * Generate seam allowance line by offsetting outline
     */
    private generateSeamAllowanceLine(
        outline: PatternCurve[],
        allowance: number
    ): PatternCurve[] {
        // Simplified offset - in production would use proper polygon offset algorithm
        return outline.map((curve) => {
            const dx =
                curve.end.y - curve.start.y !== 0
                    ? allowance * Math.sign(curve.end.y - curve.start.y)
                    : 0;
            const dy =
                curve.end.x - curve.start.x !== 0
                    ? -allowance * Math.sign(curve.end.x - curve.start.x)
                    : 0;

            return {
                ...curve,
                start: { x: curve.start.x + dx, y: curve.start.y + dy },
                end: { x: curve.end.x + dx, y: curve.end.y + dy },
                controlPoints: curve.controlPoints?.map((cp) => ({
                    x: cp.x + dx,
                    y: cp.y + dy,
                })),
            };
        });
    }

    /**
     * Calculate piece area using shoelace formula
     */
    private calculatePieceArea(outline: PatternCurve[]): number {
        const points: PatternPoint[] = [];

        for (const curve of outline) {
            points.push(curve.start);
        }

        let area = 0;
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }

        return Math.abs(area / 2);
    }

    /**
     * Generate cutting layout
     */
    generateLayout(fabricWidth: number): PatternLayout {
        const pieces = this.getPieces();
        const placedPieces: PatternLayout['pieces'] = [];
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;
        let totalArea = 0;
        let usedArea = 0;

        // Simple row-based layout algorithm
        for (const piece of pieces) {
            const bounds = this.getPieceBounds(piece);
            const pieceWidth = bounds.maxX - bounds.minX;
            const pieceHeight = bounds.maxY - bounds.minY;

            // Check if piece fits in current row
            if (currentX + pieceWidth > fabricWidth) {
                // Move to next row
                currentX = 0;
                currentY += rowHeight + 2; // 2cm gap between rows
                rowHeight = 0;
            }

            placedPieces.push({
                pieceId: piece.id,
                position: { x: currentX, y: currentY },
                rotation: 0,
                mirrored: false,
            });

            usedArea += piece.area || 0;
            currentX += pieceWidth + 2; // 2cm gap between pieces
            rowHeight = Math.max(rowHeight, pieceHeight);

            // Add mirrored cut if needed
            if (piece.cutQuantity === 2 && !piece.cutOnFold) {
                if (currentX + pieceWidth > fabricWidth) {
                    currentX = 0;
                    currentY += rowHeight + 2;
                    rowHeight = 0;
                }

                placedPieces.push({
                    pieceId: piece.id,
                    position: { x: currentX, y: currentY },
                    rotation: 0,
                    mirrored: true,
                });

                usedArea += piece.area || 0;
                currentX += pieceWidth + 2;
                rowHeight = Math.max(rowHeight, pieceHeight);
            }
        }

        const fabricLength = currentY + rowHeight;
        totalArea = fabricWidth * fabricLength;

        const layout: PatternLayout = {
            name: `Layout - ${fabricWidth}cm width`,
            fabricWidth,
            fabricLength,
            pieces: placedPieces,
            efficiency: (usedArea / totalArea) * 100,
        };

        this.layouts.push(layout);
        return layout;
    }

    /**
     * Get piece bounding box
     */
    private getPieceBounds(piece: PatternPiece): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    } {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const addPoint = (p: PatternPoint) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        };

        for (const curve of piece.outline) {
            addPoint(curve.start);
            addPoint(curve.end);
            if (curve.controlPoints) {
                curve.controlPoints.forEach(addPoint);
            }
        }

        // Include seam allowance
        const sa = piece.seamAllowance;
        return {
            minX: minX - sa,
            minY: minY - sa,
            maxX: maxX + sa,
            maxY: maxY + sa,
        };
    }

    /**
     * Export to SVG format
     */
    exportToSVG(pieceIds?: string[]): string {
        const pieces = pieceIds
            ? pieceIds.map((id) => this.pieces.get(id)).filter(Boolean)
            : this.getPieces();

        if (pieces.length === 0) {
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
        }

        // Calculate total bounds
        let globalMinX = Infinity;
        let globalMinY = Infinity;
        let globalMaxX = -Infinity;
        let globalMaxY = -Infinity;

        for (const piece of pieces as PatternPiece[]) {
            const bounds = this.getPieceBounds(piece);
            globalMinX = Math.min(globalMinX, bounds.minX);
            globalMinY = Math.min(globalMinY, bounds.minY);
            globalMaxX = Math.max(globalMaxX, bounds.maxX);
            globalMaxY = Math.max(globalMaxY, bounds.maxY);
        }

        const padding = 5;
        const width = globalMaxX - globalMinX + padding * 2;
        const height = globalMaxY - globalMinY + padding * 2;
        const offsetX = -globalMinX + padding;
        const offsetY = -globalMinY + padding;

        const settings = this.exportSettings;
        const lineWeight = settings.lineWeight;

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 ${width} ${height}"
     width="${width}cm" 
     height="${height}cm">
  <defs>
    <style>
      .outline { stroke: #000; fill: none; stroke-width: ${lineWeight}; }
      .seam-allowance { stroke: #888; fill: none; stroke-width: ${lineWeight / 2}; stroke-dasharray: 5,3; }
      .grain-line { stroke: #000; fill: none; stroke-width: ${lineWeight}; marker-end: url(#arrowhead); }
      .internal-line { stroke: #666; fill: none; stroke-width: ${lineWeight / 2}; stroke-dasharray: 10,5; }
      .notch { fill: #000; }
      .annotation { font-family: Arial, sans-serif; font-size: 3px; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
    </marker>
  </defs>
`;

        for (const piece of pieces as PatternPiece[]) {
            svg += `  <g id="${piece.id}" data-name="${piece.name}">
`;

            // Outline
            svg += `    <path class="outline" d="${this.curvesToSVGPath(piece.outline, offsetX, offsetY)}" />
`;

            // Seam allowance line
            if (settings.showSeamAllowanceLine && piece.seamAllowanceLine) {
                svg += `    <path class="seam-allowance" d="${this.curvesToSVGPath(piece.seamAllowanceLine, offsetX, offsetY)}" />
`;
            }

            // Grain line
            if (settings.showGrainLines && piece.grainLine) {
                const gl = piece.grainLine;
                svg += `    <line class="grain-line" 
           x1="${gl.start.x + offsetX}" y1="${gl.start.y + offsetY}" 
           x2="${gl.end.x + offsetX}" y2="${gl.end.y + offsetY}" />
`;
            }

            // Internal lines
            for (const line of piece.internalLines) {
                svg += `    <path class="internal-line" d="${this.curveToSVGPath(line, offsetX, offsetY)}" />
`;
            }

            // Notches
            if (settings.showNotches) {
                for (const notch of piece.notches) {
                    svg += this.generateNotchSVG(notch, offsetX, offsetY);
                }
            }

            // Annotations
            if (settings.showAnnotations) {
                for (const annotation of piece.annotations) {
                    svg += `    <text class="annotation" 
             x="${annotation.position.x + offsetX}" 
             y="${annotation.position.y + offsetY}"
             transform="rotate(${annotation.rotation}, ${annotation.position.x + offsetX}, ${annotation.position.y + offsetY})"
             font-size="${annotation.fontSize}px">${annotation.text}</text>
`;
                }
            }

            // Cut quantity and fabric type annotation
            svg += `    <text class="annotation" x="${offsetX + 2}" y="${offsetY + 5}">
      ${piece.name} - Cut ${piece.cutQuantity}${piece.cutOnFold ? ' (on fold)' : ''} - ${piece.fabricType}
    </text>
`;

            svg += `  </g>
`;
        }

        svg += `</svg>`;
        return svg;
    }

    /**
     * Convert curves to SVG path data
     */
    private curvesToSVGPath(
        curves: PatternCurve[],
        offsetX: number,
        offsetY: number
    ): string {
        if (curves.length === 0) return '';

        let path = `M ${curves[0].start.x + offsetX} ${curves[0].start.y + offsetY}`;

        for (const curve of curves) {
            path += ' ' + this.curveToSVGPath(curve, offsetX, offsetY, false);
        }

        path += ' Z'; // Close path
        return path;
    }

    /**
     * Convert single curve to SVG path segment
     */
    private curveToSVGPath(
        curve: PatternCurve,
        offsetX: number,
        offsetY: number,
        includeMove = true
    ): string {
        let path = '';

        if (includeMove) {
            path = `M ${curve.start.x + offsetX} ${curve.start.y + offsetY} `;
        }

        switch (curve.type) {
            case 'line':
                path += `L ${curve.end.x + offsetX} ${curve.end.y + offsetY}`;
                break;

            case 'bezier':
                if (curve.controlPoints && curve.controlPoints.length === 2) {
                    path += `C ${curve.controlPoints[0].x + offsetX} ${curve.controlPoints[0].y + offsetY}, ${curve.controlPoints[1].x + offsetX} ${curve.controlPoints[1].y + offsetY}, ${curve.end.x + offsetX} ${curve.end.y + offsetY}`;
                } else if (curve.controlPoints && curve.controlPoints.length === 1) {
                    path += `Q ${curve.controlPoints[0].x + offsetX} ${curve.controlPoints[0].y + offsetY}, ${curve.end.x + offsetX} ${curve.end.y + offsetY}`;
                }
                break;

            case 'arc':
                if (curve.arc) {
                    const sweepFlag = curve.arc.endAngle > curve.arc.startAngle ? 1 : 0;
                    path += `A ${curve.arc.radius} ${curve.arc.radius} 0 0 ${sweepFlag} ${curve.end.x + offsetX} ${curve.end.y + offsetY}`;
                }
                break;
        }

        return path;
    }

    /**
     * Generate notch SVG
     */
    private generateNotchSVG(
        notch: PatternNotch,
        offsetX: number,
        offsetY: number
    ): string {
        const x = notch.position.x + offsetX;
        const y = notch.position.y + offsetY;
        const size = notch.size / 10; // Convert mm to cm

        switch (notch.type) {
            case 'single':
                return `    <line class="notch" x1="${x}" y1="${y}" x2="${x}" y2="${y - size}" stroke="#000" stroke-width="0.3" />
`;

            case 'double':
                return `    <line class="notch" x1="${x - 0.2}" y1="${y}" x2="${x - 0.2}" y2="${y - size}" stroke="#000" stroke-width="0.3" />
    <line class="notch" x1="${x + 0.2}" y1="${y}" x2="${x + 0.2}" y2="${y - size}" stroke="#000" stroke-width="0.3" />
`;

            case 'triple':
                return `    <line class="notch" x1="${x - 0.3}" y1="${y}" x2="${x - 0.3}" y2="${y - size}" stroke="#000" stroke-width="0.3" />
    <line class="notch" x1="${x}" y1="${y}" x2="${x}" y2="${y - size}" stroke="#000" stroke-width="0.3" />
    <line class="notch" x1="${x + 0.3}" y1="${y}" x2="${x + 0.3}" y2="${y - size}" stroke="#000" stroke-width="0.3" />
`;

            case 'diamond':
                return `    <polygon class="notch" points="${x},${y} ${x - size / 2},${y - size / 2} ${x},${y - size} ${x + size / 2},${y - size / 2}" />
`;

            default:
                return '';
        }
    }

    /**
     * Export to DXF format (AutoCAD compatible)
     */
    exportToDXF(pieceIds?: string[]): string {
        const pieces = pieceIds
            ? pieceIds.map((id) => this.pieces.get(id)).filter(Boolean)
            : this.getPieces();

        let dxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LTYPE
0
LTYPE
2
CONTINUOUS
70
0
3
Solid line
72
65
73
0
40
0.0
0
LTYPE
2
DASHED
70
0
3
Dashed line
72
65
73
2
40
0.5
49
0.25
49
-0.25
0
ENDTAB
0
TABLE
2
LAYER
0
LAYER
2
OUTLINE
70
0
62
7
6
CONTINUOUS
0
LAYER
2
SEAM_ALLOWANCE
70
0
62
8
6
DASHED
0
LAYER
2
GRAIN_LINE
70
0
62
1
6
CONTINUOUS
0
LAYER
2
NOTCHES
70
0
62
3
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

        for (const piece of pieces as PatternPiece[]) {
            // Outline
            for (const curve of piece.outline) {
                dxf += this.curveToDXF(curve, 'OUTLINE');
            }

            // Seam allowance
            if (this.exportSettings.showSeamAllowanceLine && piece.seamAllowanceLine) {
                for (const curve of piece.seamAllowanceLine) {
                    dxf += this.curveToDXF(curve, 'SEAM_ALLOWANCE');
                }
            }

            // Grain line
            if (this.exportSettings.showGrainLines && piece.grainLine) {
                const gl = piece.grainLine;
                dxf += `0
LINE
8
GRAIN_LINE
10
${gl.start.x}
20
${gl.start.y}
11
${gl.end.x}
21
${gl.end.y}
`;
            }

            // Internal lines
            for (const line of piece.internalLines) {
                dxf += this.curveToDXF(line, 'OUTLINE');
            }

            // Notches
            if (this.exportSettings.showNotches) {
                for (const notch of piece.notches) {
                    dxf += `0
POINT
8
NOTCHES
10
${notch.position.x}
20
${notch.position.y}
`;
                }
            }
        }

        dxf += `0
ENDSEC
0
EOF
`;

        return dxf;
    }

    /**
     * Convert curve to DXF format
     */
    private curveToDXF(curve: PatternCurve, layer: string): string {
        switch (curve.type) {
            case 'line':
                return `0
LINE
8
${layer}
10
${curve.start.x}
20
${curve.start.y}
11
${curve.end.x}
21
${curve.end.y}
`;

            case 'arc':
                if (curve.arc) {
                    return `0
ARC
8
${layer}
10
${curve.arc.center.x}
20
${curve.arc.center.y}
40
${curve.arc.radius}
50
${(curve.arc.startAngle * 180) / Math.PI}
51
${(curve.arc.endAngle * 180) / Math.PI}
`;
                }
                return '';

            case 'bezier':
                // DXF doesn't support bezier directly, approximate with polyline
                return `0
LINE
8
${layer}
10
${curve.start.x}
20
${curve.start.y}
11
${curve.end.x}
21
${curve.end.y}
`;

            default:
                return '';
        }
    }

    /**
     * Get paper dimensions
     */
    getPaperDimensions(): { width: number; height: number } {
        if (
            this.exportSettings.paperSize === 'CUSTOM' &&
            this.exportSettings.customPaper
        ) {
            return this.exportSettings.customPaper;
        }
        return PAPER_SIZES[this.exportSettings.paperSize] || PAPER_SIZES.A1;
    }

    /**
     * Calculate tile count for home printing
     */
    calculateTileCount(piece: PatternPiece): { rows: number; cols: number } {
        const bounds = this.getPieceBounds(piece);
        const pieceWidth = (bounds.maxX - bounds.minX) * 10; // Convert cm to mm
        const pieceHeight = (bounds.maxY - bounds.minY) * 10;

        const paper = this.getPaperDimensions();
        const overlap = this.exportSettings.tileOverlap;
        const printableWidth = paper.width - 20; // 10mm margins
        const printableHeight = paper.height - 20;

        const effectiveWidth = printableWidth - overlap;
        const effectiveHeight = printableHeight - overlap;

        return {
            cols: Math.ceil(pieceWidth / effectiveWidth),
            rows: Math.ceil(pieceHeight / effectiveHeight),
        };
    }

    /**
     * Export metadata as JSON
     */
    exportMetadata(): string {
        const pieces = this.getPieces();
        const metadata = {
            pieceCount: pieces.length,
            pieces: pieces.map((p) => ({
                id: p.id,
                name: p.name,
                type: p.type,
                cutQuantity: p.cutQuantity,
                cutOnFold: p.cutOnFold,
                fabricType: p.fabricType,
                seamAllowance: p.seamAllowance,
                areaCm2: p.area,
                notchCount: p.notches.length,
                dartCount: p.darts.length,
            })),
            layouts: this.layouts.map((l) => ({
                name: l.name,
                fabricWidth: l.fabricWidth,
                fabricLength: l.fabricLength,
                efficiency: l.efficiency,
            })),
            exportSettings: this.exportSettings,
            totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
        };

        return JSON.stringify(metadata, null, 2);
    }

    /**
     * Clear all pieces and layouts
     */
    clear(): void {
        this.pieces.clear();
        this.layouts = [];
    }
}

/**
 * Export singleton instance
 */
export const patternOutput = new PatternOutputGenerator();

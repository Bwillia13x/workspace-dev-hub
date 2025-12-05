/**
 * Manufacturing Formats Exporter
 *
 * Exports pattern data to industry-standard manufacturing formats
 * including Gerber, Optitex, and Clo3D compatibility.
 */

import type { PatternPiece, PatternCurve, PatternPoint } from './pattern-output';

/**
 * Manufacturing format types
 */
export type ManufacturingFormat =
    | 'gerber'
    | 'optitex'
    | 'clo3d'
    | 'lectra'
    | 'aama-dxf'
    | 'astm-dxf';

/**
 * Gerber file options
 */
export interface GerberOptions {
    /** Gerber version */
    version: '8.0' | '9.0' | '10.0';
    /** Include piece annotations */
    includeAnnotations: boolean;
    /** Include internal lines */
    includeInternalLines: boolean;
    /** Layer configuration */
    layers: {
        outline: string;
        seamAllowance: string;
        grainLine: string;
        notches: string;
        internalLines: string;
        annotations: string;
    };
}

/**
 * Optitex file options
 */
export interface OptitexOptions {
    /** PDS version */
    version: '12' | '15' | '17' | '19';
    /** Include 3D metadata */
    include3DData: boolean;
    /** Fabric stretch data */
    includeFabricData: boolean;
}

/**
 * Clo3D file options
 */
export interface Clo3DOptions {
    /** Include seam properties */
    includeSeamProperties: boolean;
    /** Include fabric presets */
    includeFabricPresets: boolean;
    /** Avatar size */
    avatarSize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
}

/**
 * Export result
 */
export interface ExportResult {
    /** Format name */
    format: ManufacturingFormat;
    /** Main file content */
    mainFile: string;
    /** Main file extension */
    mainExtension: string;
    /** Additional files (e.g., annotation files) */
    additionalFiles?: { name: string; content: string }[];
    /** Export metadata */
    metadata: {
        pieceCount: number;
        totalArea: number;
        exportDate: string;
        version: string;
    };
}

/**
 * Gerber layer codes
 */
const GERBER_LAYERS = {
    perimeter: '1',
    grainLine: '2',
    notches: '3',
    internalLines: '4',
    text: '5',
    seamAllowance: '6',
    drillHoles: '7',
    mirrorLine: '8',
};

/**
 * Manufacturing Formats Exporter class
 */
export class ManufacturingFormatsExporter {
    private gerberOptions: GerberOptions = {
        version: '10.0',
        includeAnnotations: true,
        includeInternalLines: true,
        layers: {
            outline: GERBER_LAYERS.perimeter,
            seamAllowance: GERBER_LAYERS.seamAllowance,
            grainLine: GERBER_LAYERS.grainLine,
            notches: GERBER_LAYERS.notches,
            internalLines: GERBER_LAYERS.internalLines,
            annotations: GERBER_LAYERS.text,
        },
    };

    private optitexOptions: OptitexOptions = {
        version: '19',
        include3DData: true,
        includeFabricData: true,
    };

    private clo3DOptions: Clo3DOptions = {
        includeSeamProperties: true,
        includeFabricPresets: true,
        avatarSize: 'M',
    };

    /**
     * Update Gerber options
     */
    setGerberOptions(options: Partial<GerberOptions>): void {
        this.gerberOptions = { ...this.gerberOptions, ...options };
    }

    /**
     * Update Optitex options
     */
    setOptitexOptions(options: Partial<OptitexOptions>): void {
        this.optitexOptions = { ...this.optitexOptions, ...options };
    }

    /**
     * Update Clo3D options
     */
    setClo3DOptions(options: Partial<Clo3DOptions>): void {
        this.clo3DOptions = { ...this.clo3DOptions, ...options };
    }

    /**
     * Export to specified format
     */
    export(pieces: PatternPiece[], format: ManufacturingFormat): ExportResult {
        switch (format) {
            case 'gerber':
                return this.exportToGerber(pieces);
            case 'optitex':
                return this.exportToOptitex(pieces);
            case 'clo3d':
                return this.exportToClo3D(pieces);
            case 'lectra':
                return this.exportToLectra(pieces);
            case 'aama-dxf':
                return this.exportToAAMA(pieces);
            case 'astm-dxf':
                return this.exportToASTM(pieces);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Export to Gerber format (AccuMark)
     */
    private exportToGerber(pieces: PatternPiece[]): ExportResult {
        const options = this.gerberOptions;
        let content = this.generateGerberHeader(options.version);

        for (const piece of pieces) {
            content += this.generateGerberPiece(piece);
        }

        content += this.generateGerberFooter();

        return {
            format: 'gerber',
            mainFile: content,
            mainExtension: '.zip',
            metadata: {
                pieceCount: pieces.length,
                totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
                exportDate: new Date().toISOString(),
                version: options.version,
            },
        };
    }

    /**
     * Generate Gerber file header
     */
    private generateGerberHeader(version: string): string {
        return `*GERBER V${version}*
*UNITS=METRIC*
*SCALE=1*
BEGIN PIECE DATA
`;
    }

    /**
     * Generate Gerber piece data
     */
    private generateGerberPiece(piece: PatternPiece): string {
        const layers = this.gerberOptions.layers;
        let data = `
PIECE: ${piece.id}
NAME: ${piece.name}
CUT_QTY: ${piece.cutQuantity}
FABRIC: ${piece.fabricType.toUpperCase()}
${piece.cutOnFold ? 'FOLD: YES' : 'FOLD: NO'}
SEAM_ALLOWANCE: ${piece.seamAllowance}cm
`;

        // Outline layer
        data += `LAYER: ${layers.outline}
TYPE: PERIMETER
`;
        for (const curve of piece.outline) {
            data += this.curveToGerber(curve);
        }
        data += 'END_LAYER\n';

        // Seam allowance layer
        if (piece.seamAllowanceLine) {
            data += `LAYER: ${layers.seamAllowance}
TYPE: SEAM_ALLOWANCE
`;
            for (const curve of piece.seamAllowanceLine) {
                data += this.curveToGerber(curve);
            }
            data += 'END_LAYER\n';
        }

        // Grain line layer
        if (piece.grainLine) {
            data += `LAYER: ${layers.grainLine}
TYPE: GRAIN_LINE
LINE: ${piece.grainLine.start.x},${piece.grainLine.start.y} TO ${piece.grainLine.end.x},${piece.grainLine.end.y}
END_LAYER
`;
        }

        // Notches layer
        if (piece.notches.length > 0) {
            data += `LAYER: ${layers.notches}
TYPE: NOTCHES
`;
            for (const notch of piece.notches) {
                data += `NOTCH: ${notch.position.x},${notch.position.y} TYPE:${notch.type.toUpperCase()} SIZE:${notch.size}mm\n`;
            }
            data += 'END_LAYER\n';
        }

        // Internal lines layer
        if (this.gerberOptions.includeInternalLines && piece.internalLines.length > 0) {
            data += `LAYER: ${layers.internalLines}
TYPE: INTERNAL_LINES
`;
            for (const line of piece.internalLines) {
                data += this.curveToGerber(line);
            }
            data += 'END_LAYER\n';
        }

        // Annotations layer
        if (this.gerberOptions.includeAnnotations && piece.annotations.length > 0) {
            data += `LAYER: ${layers.annotations}
TYPE: TEXT
`;
            for (const annotation of piece.annotations) {
                data += `TEXT: "${annotation.text}" AT ${annotation.position.x},${annotation.position.y} SIZE:${annotation.fontSize}pt ROTATE:${annotation.rotation}deg\n`;
            }
            data += 'END_LAYER\n';
        }

        data += 'END_PIECE\n';
        return data;
    }

    /**
     * Convert curve to Gerber format
     */
    private curveToGerber(curve: PatternCurve): string {
        switch (curve.type) {
            case 'line':
                return `LINE: ${curve.start.x},${curve.start.y} TO ${curve.end.x},${curve.end.y}\n`;
            case 'arc':
                if (curve.arc) {
                    return `ARC: CENTER ${curve.arc.center.x},${curve.arc.center.y} RADIUS ${curve.arc.radius} FROM ${(curve.arc.startAngle * 180) / Math.PI}deg TO ${(curve.arc.endAngle * 180) / Math.PI}deg\n`;
                }
                return '';
            case 'bezier':
                if (curve.controlPoints && curve.controlPoints.length >= 2) {
                    return `CURVE: ${curve.start.x},${curve.start.y} CP1:${curve.controlPoints[0].x},${curve.controlPoints[0].y} CP2:${curve.controlPoints[1].x},${curve.controlPoints[1].y} TO ${curve.end.x},${curve.end.y}\n`;
                } else if (curve.controlPoints && curve.controlPoints.length === 1) {
                    return `QCURVE: ${curve.start.x},${curve.start.y} CP:${curve.controlPoints[0].x},${curve.controlPoints[0].y} TO ${curve.end.x},${curve.end.y}\n`;
                }
                return `LINE: ${curve.start.x},${curve.start.y} TO ${curve.end.x},${curve.end.y}\n`;
            default:
                return '';
        }
    }

    /**
     * Generate Gerber file footer
     */
    private generateGerberFooter(): string {
        return `END PIECE DATA
*END GERBER*
`;
    }

    /**
     * Export to Optitex PDS format
     */
    private exportToOptitex(pieces: PatternPiece[]): ExportResult {
        const options = this.optitexOptions;

        let content = `<?xml version="1.0" encoding="UTF-8"?>
<OptitexPDS version="${options.version}">
  <Header>
    <Created>${new Date().toISOString()}</Created>
    <Application>NanoFashion Studio</Application>
    <Units>cm</Units>
  </Header>
  <Pieces count="${pieces.length}">
`;

        for (const piece of pieces) {
            content += this.generateOptitexPiece(piece);
        }

        content += `  </Pieces>
`;

        if (options.includeFabricData) {
            content += `  <FabricData>
    <DefaultStretch>5</DefaultStretch>
    <DefaultWeight>150</DefaultWeight>
  </FabricData>
`;
        }

        if (options.include3DData) {
            content += `  <ThreeDData>
    <AvatarSize>M</AvatarSize>
    <SimulationQuality>High</SimulationQuality>
  </ThreeDData>
`;
        }

        content += `</OptitexPDS>`;

        return {
            format: 'optitex',
            mainFile: content,
            mainExtension: '.opx',
            metadata: {
                pieceCount: pieces.length,
                totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
                exportDate: new Date().toISOString(),
                version: options.version,
            },
        };
    }

    /**
     * Generate Optitex piece XML
     */
    private generateOptitexPiece(piece: PatternPiece): string {
        let xml = `    <Piece id="${piece.id}">
      <Name>${piece.name}</Name>
      <Type>${piece.type}</Type>
      <CutQuantity>${piece.cutQuantity}</CutQuantity>
      <FabricType>${piece.fabricType}</FabricType>
      <CutOnFold>${piece.cutOnFold}</CutOnFold>
      <SeamAllowance>${piece.seamAllowance}</SeamAllowance>
      <Outline>
`;

        for (const curve of piece.outline) {
            xml += this.curveToOptitex(curve);
        }

        xml += `      </Outline>
`;

        if (piece.grainLine) {
            xml += `      <GrainLine>
        <Start x="${piece.grainLine.start.x}" y="${piece.grainLine.start.y}" />
        <End x="${piece.grainLine.end.x}" y="${piece.grainLine.end.y}" />
      </GrainLine>
`;
        }

        if (piece.notches.length > 0) {
            xml += `      <Notches>
`;
            for (const notch of piece.notches) {
                xml += `        <Notch x="${notch.position.x}" y="${notch.position.y}" type="${notch.type}" size="${notch.size}" />
`;
            }
            xml += `      </Notches>
`;
        }

        if (piece.darts.length > 0) {
            xml += `      <Darts>
`;
            for (const dart of piece.darts) {
                xml += `        <Dart type="${dart.type}" depth="${dart.depth}">
          <Apex x="${dart.apex.x}" y="${dart.apex.y}" />
          <Leg1 x="${dart.legs[0].x}" y="${dart.legs[0].y}" />
          <Leg2 x="${dart.legs[1].x}" y="${dart.legs[1].y}" />
        </Dart>
`;
            }
            xml += `      </Darts>
`;
        }

        xml += `    </Piece>
`;

        return xml;
    }

    /**
     * Convert curve to Optitex XML
     */
    private curveToOptitex(curve: PatternCurve): string {
        switch (curve.type) {
            case 'line':
                return `        <Line>
          <Start x="${curve.start.x}" y="${curve.start.y}" />
          <End x="${curve.end.x}" y="${curve.end.y}" />
        </Line>
`;
            case 'arc':
                if (curve.arc) {
                    return `        <Arc>
          <Center x="${curve.arc.center.x}" y="${curve.arc.center.y}" />
          <Radius>${curve.arc.radius}</Radius>
          <StartAngle>${curve.arc.startAngle}</StartAngle>
          <EndAngle>${curve.arc.endAngle}</EndAngle>
        </Arc>
`;
                }
                return '';
            case 'bezier':
                let bezierXml = `        <Bezier>
          <Start x="${curve.start.x}" y="${curve.start.y}" />
`;
                if (curve.controlPoints) {
                    for (let i = 0; i < curve.controlPoints.length; i++) {
                        bezierXml += `          <ControlPoint${i + 1} x="${curve.controlPoints[i].x}" y="${curve.controlPoints[i].y}" />
`;
                    }
                }
                bezierXml += `          <End x="${curve.end.x}" y="${curve.end.y}" />
        </Bezier>
`;
                return bezierXml;
            default:
                return '';
        }
    }

    /**
     * Export to Clo3D format
     */
    private exportToClo3D(pieces: PatternPiece[]): ExportResult {
        const options = this.clo3DOptions;

        let content = `<?xml version="1.0" encoding="UTF-8"?>
<Clo3DProject version="2.0">
  <Header>
    <Application>NanoFashion Studio</Application>
    <Created>${new Date().toISOString()}</Created>
  </Header>
  <AvatarSettings>
    <Size>${options.avatarSize}</Size>
  </AvatarSettings>
  <Patterns count="${pieces.length}">
`;

        for (const piece of pieces) {
            content += this.generateClo3DPiece(piece);
        }

        content += `  </Patterns>
`;

        if (options.includeSeamProperties) {
            content += `  <SeamProperties>
    <DefaultType>Normal</DefaultType>
    <DefaultStrength>1.0</DefaultStrength>
    <AutoSew>true</AutoSew>
  </SeamProperties>
`;
        }

        if (options.includeFabricPresets) {
            content += `  <FabricLibrary>
    <Fabric name="Cotton" stretch="0.05" weight="150" friction="0.5" />
    <Fabric name="Silk" stretch="0.02" weight="80" friction="0.3" />
    <Fabric name="Denim" stretch="0.03" weight="340" friction="0.6" />
    <Fabric name="Jersey" stretch="0.30" weight="180" friction="0.4" />
  </FabricLibrary>
`;
        }

        content += `</Clo3DProject>`;

        return {
            format: 'clo3d',
            mainFile: content,
            mainExtension: '.zpac',
            metadata: {
                pieceCount: pieces.length,
                totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
                exportDate: new Date().toISOString(),
                version: '2.0',
            },
        };
    }

    /**
     * Generate Clo3D piece data
     */
    private generateClo3DPiece(piece: PatternPiece): string {
        return `    <Pattern id="${piece.id}">
      <Name>${piece.name}</Name>
      <Type>${piece.type}</Type>
      <Quantity>${piece.cutQuantity}</Quantity>
      <Fold>${piece.cutOnFold}</Fold>
      <SeamAllowance value="${piece.seamAllowance}" unit="cm" />
      <Geometry>
        ${piece.outline.map((c) => this.curveToPoints(c)).join(' ')}
      </Geometry>
      ${piece.grainLine ? `<GrainLine x1="${piece.grainLine.start.x}" y1="${piece.grainLine.start.y}" x2="${piece.grainLine.end.x}" y2="${piece.grainLine.end.y}" />` : ''}
      <Placement layer="${piece.fabricType}" />
    </Pattern>
`;
    }

    /**
     * Convert curve to point string
     */
    private curveToPoints(curve: PatternCurve): string {
        return `${curve.start.x},${curve.start.y} ${curve.end.x},${curve.end.y}`;
    }

    /**
     * Export to Lectra Modaris format
     */
    private exportToLectra(pieces: PatternPiece[]): ExportResult {
        let content = `# Lectra Modaris Export
# Generated by NanoFashion Studio
# Date: ${new Date().toISOString()}

HEADER
VERSION=V8R2
UNITS=CM
PIECE_COUNT=${pieces.length}
END_HEADER

`;

        for (const piece of pieces) {
            content += `PIECE ${piece.id}
NAME=${piece.name}
TYPE=${piece.type}
QTY=${piece.cutQuantity}
FOLD=${piece.cutOnFold ? 'YES' : 'NO'}
SEAM=${piece.seamAllowance}
GEOMETRY
`;
            for (const curve of piece.outline) {
                if (curve.type === 'line') {
                    content += `L ${curve.start.x} ${curve.start.y} ${curve.end.x} ${curve.end.y}\n`;
                } else if (curve.type === 'arc' && curve.arc) {
                    content += `A ${curve.arc.center.x} ${curve.arc.center.y} ${curve.arc.radius} ${curve.arc.startAngle} ${curve.arc.endAngle}\n`;
                } else if (curve.type === 'bezier' && curve.controlPoints) {
                    content += `B ${curve.start.x} ${curve.start.y} ${curve.controlPoints.map((cp) => `${cp.x} ${cp.y}`).join(' ')} ${curve.end.x} ${curve.end.y}\n`;
                }
            }
            content += `END_GEOMETRY
END_PIECE

`;
        }

        content += 'END_FILE';

        return {
            format: 'lectra',
            mainFile: content,
            mainExtension: '.mdl',
            metadata: {
                pieceCount: pieces.length,
                totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
                exportDate: new Date().toISOString(),
                version: 'V8R2',
            },
        };
    }

    /**
     * Export to AAMA/RUL DXF format
     */
    private exportToAAMA(pieces: PatternPiece[]): ExportResult {
        const content = this.generateAAMDXF(pieces, 'AAMA');

        return {
            format: 'aama-dxf',
            mainFile: content,
            mainExtension: '.dxf',
            metadata: {
                pieceCount: pieces.length,
                totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
                exportDate: new Date().toISOString(),
                version: 'AAMA-DXF-1.0',
            },
        };
    }

    /**
     * Export to ASTM DXF format
     */
    private exportToASTM(pieces: PatternPiece[]): ExportResult {
        const content = this.generateAAMDXF(pieces, 'ASTM');

        return {
            format: 'astm-dxf',
            mainFile: content,
            mainExtension: '.dxf',
            metadata: {
                pieceCount: pieces.length,
                totalArea: pieces.reduce((sum, p) => sum + (p.area || 0), 0),
                exportDate: new Date().toISOString(),
                version: 'ASTM-D6673',
            },
        };
    }

    /**
     * Generate AAMA/ASTM compliant DXF
     */
    private generateAAMDXF(
        pieces: PatternPiece[],
        standard: 'AAMA' | 'ASTM'
    ): string {
        const layerCodes = standard === 'AAMA'
            ? { outline: '1', internalLine: '4', grainLine: '2', notch: '3', text: '5' }
            : { outline: '1', internalLine: '84', grainLine: '8', notch: '4', text: '13' };

        let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$MEASUREMENT
70
1
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
6
`;

        // Define layers
        for (const [name, code] of Object.entries(layerCodes)) {
            dxf += `0
LAYER
2
${code}
70
0
62
7
6
CONTINUOUS
`;
        }

        dxf += `0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

        // Add pieces
        for (const piece of pieces) {
            // Outline on layer 1
            for (const curve of piece.outline) {
                dxf += this.curveToStandardDXF(curve, layerCodes.outline);
            }

            // Internal lines
            for (const line of piece.internalLines) {
                dxf += this.curveToStandardDXF(line, layerCodes.internalLine);
            }

            // Grain line
            if (piece.grainLine) {
                dxf += `0
LINE
8
${layerCodes.grainLine}
10
${piece.grainLine.start.x}
20
${piece.grainLine.start.y}
30
0
11
${piece.grainLine.end.x}
21
${piece.grainLine.end.y}
31
0
`;
            }

            // Notches
            for (const notch of piece.notches) {
                const size = notch.size / 10; // mm to cm
                dxf += `0
LINE
8
${layerCodes.notch}
10
${notch.position.x}
20
${notch.position.y}
30
0
11
${notch.position.x}
21
${notch.position.y - size}
31
0
`;
            }

            // Piece name annotation
            dxf += `0
TEXT
8
${layerCodes.text}
10
${piece.outline[0]?.start.x || 0}
20
${(piece.outline[0]?.start.y || 0) + 2}
30
0
40
1.0
1
${piece.name}
`;
        }

        dxf += `0
ENDSEC
0
EOF
`;

        return dxf;
    }

    /**
     * Convert curve to standard DXF format
     */
    private curveToStandardDXF(curve: PatternCurve, layer: string): string {
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
30
0
11
${curve.end.x}
21
${curve.end.y}
31
0
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
30
0
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
                // Approximate bezier as line for basic DXF
                return `0
LINE
8
${layer}
10
${curve.start.x}
20
${curve.start.y}
30
0
11
${curve.end.x}
21
${curve.end.y}
31
0
`;
            default:
                return '';
        }
    }

    /**
     * Get supported formats list
     */
    getSupportedFormats(): { format: ManufacturingFormat; description: string }[] {
        return [
            { format: 'gerber', description: 'Gerber AccuMark - Industry standard for pattern making' },
            { format: 'optitex', description: 'Optitex PDS - 2D/3D pattern design software' },
            { format: 'clo3d', description: 'Clo3D - 3D fashion design simulation' },
            { format: 'lectra', description: 'Lectra Modaris - Professional pattern CAD' },
            { format: 'aama-dxf', description: 'AAMA DXF - American Apparel standard' },
            { format: 'astm-dxf', description: 'ASTM DXF - International pattern standard' },
        ];
    }

    /**
     * Validate pieces before export
     */
    validateForExport(pieces: PatternPiece[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (pieces.length === 0) {
            errors.push('No pattern pieces to export');
        }

        for (const piece of pieces) {
            if (!piece.id) {
                errors.push(`Piece missing ID`);
            }
            if (!piece.name) {
                errors.push(`Piece ${piece.id} missing name`);
            }
            if (!piece.outline || piece.outline.length === 0) {
                errors.push(`Piece ${piece.id} has no outline`);
            }
            if (piece.cutQuantity < 1) {
                errors.push(`Piece ${piece.id} has invalid cut quantity`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

/**
 * Export singleton instance
 */
export const manufacturingFormats = new ManufacturingFormatsExporter();

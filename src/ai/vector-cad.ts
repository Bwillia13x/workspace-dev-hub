/**
 * Vector CAD Generator
 *
 * Generates vector-based CAD outputs (SVG) instead of raster images,
 * including measurement extraction and technical annotations.
 */

/**
 * Measurement unit types
 */
export type MeasurementUnit = 'cm' | 'inches' | 'mm';

/**
 * A single measurement annotation
 */
export interface Measurement {
    /** Measurement ID */
    id: string;
    /** Measurement name (e.g., "Bust", "Waist", "Length") */
    name: string;
    /** Value in the specified unit */
    value: number;
    /** Unit of measurement */
    unit: MeasurementUnit;
    /** Start point (normalized 0-1) */
    startPoint: { x: number; y: number };
    /** End point (normalized 0-1) */
    endPoint: { x: number; y: number };
    /** Optional notes */
    notes?: string;
}

/**
 * Annotation callout
 */
export interface Annotation {
    /** Annotation ID */
    id: string;
    /** Label text */
    label: string;
    /** Description */
    description?: string;
    /** Position (normalized 0-1) */
    position: { x: number; y: number };
    /** Pointer direction */
    pointerDirection?: 'left' | 'right' | 'up' | 'down';
    /** Category */
    category:
    | 'construction'
    | 'material'
    | 'finish'
    | 'detail'
    | 'measurement';
}

/**
 * CAD layer definition
 */
export interface CADLayer {
    /** Layer ID */
    id: string;
    /** Layer name */
    name: string;
    /** Layer visibility */
    visible: boolean;
    /** Layer color (hex) */
    color: string;
    /** Layer type */
    type:
    | 'outline'
    | 'construction'
    | 'measurements'
    | 'annotations'
    | 'details'
    | 'stitching';
    /** Layer content (paths, shapes) */
    content: SVGElement[];
    /** Layer opacity */
    opacity: number;
}

/**
 * Complete CAD document
 */
export interface CADDocument {
    /** Document ID */
    id: string;
    /** Document name */
    name: string;
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
    /** Layers */
    layers: CADLayer[];
    /** Measurements */
    measurements: Measurement[];
    /** Annotations */
    annotations: Annotation[];
    /** Reference scale (pixels per unit) */
    scale: {
        pixelsPerUnit: number;
        unit: MeasurementUnit;
    };
    /** Metadata */
    metadata: {
        createdAt: number;
        updatedAt: number;
        version: string;
        garmentType?: string;
        designer?: string;
    };
}

/**
 * SVG export options
 */
export interface SVGExportOptions {
    /** Include measurements layer */
    includeMeasurements: boolean;
    /** Include annotations layer */
    includeAnnotations: boolean;
    /** Background color (transparent if not specified) */
    backgroundColor?: string;
    /** Stroke width */
    strokeWidth: number;
    /** Primary color */
    primaryColor: string;
    /** Secondary color (for construction lines) */
    secondaryColor: string;
    /** Font family for text */
    fontFamily: string;
    /** Font size for annotations */
    fontSize: number;
}

/**
 * Standard garment measurements by type
 */
const GARMENT_MEASUREMENTS: Record<string, string[]> = {
    top: [
        'Shoulder Width',
        'Chest/Bust',
        'Waist',
        'Hip',
        'Length',
        'Sleeve Length',
        'Armhole',
        'Neck Opening',
    ],
    bottom: [
        'Waist',
        'Hip',
        'Inseam',
        'Outseam',
        'Thigh',
        'Knee',
        'Leg Opening',
        'Rise',
    ],
    dress: [
        'Shoulder Width',
        'Bust',
        'Waist',
        'Hip',
        'Length',
        'Sleeve Length',
        'Armhole',
        'Neck Opening',
        'Hem Width',
    ],
    outerwear: [
        'Shoulder Width',
        'Chest',
        'Waist',
        'Hip',
        'Length',
        'Sleeve Length',
        'Armhole',
        'Neck Opening',
        'Lapel Width',
    ],
    skirt: ['Waist', 'Hip', 'Length', 'Hem Width', 'Slit Length'],
};

/**
 * Default SVG export options
 */
const DEFAULT_SVG_OPTIONS: SVGExportOptions = {
    includeMeasurements: true,
    includeAnnotations: true,
    strokeWidth: 2,
    primaryColor: '#1a1a1a',
    secondaryColor: '#666666',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
};

/**
 * Vector CAD Generator class
 */
export class VectorCADGenerator {
    private documents: Map<string, CADDocument> = new Map();

    /**
     * Create a new CAD document
     */
    createDocument(
        name: string,
        width: number,
        height: number,
        garmentType?: string
    ): CADDocument {
        const doc: CADDocument = {
            id: this.generateId(),
            name,
            width,
            height,
            layers: this.createDefaultLayers(),
            measurements: [],
            annotations: [],
            scale: {
                pixelsPerUnit: 10, // Default: 10 pixels = 1 cm
                unit: 'cm',
            },
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: '1.0',
                garmentType,
            },
        };

        this.documents.set(doc.id, doc);
        return doc;
    }

    /**
     * Create default layer structure
     */
    private createDefaultLayers(): CADLayer[] {
        return [
            {
                id: 'outline',
                name: 'Garment Outline',
                visible: true,
                color: '#1a1a1a',
                type: 'outline',
                content: [],
                opacity: 1,
            },
            {
                id: 'construction',
                name: 'Construction Lines',
                visible: true,
                color: '#3b82f6',
                type: 'construction',
                content: [],
                opacity: 0.7,
            },
            {
                id: 'stitching',
                name: 'Stitching Lines',
                visible: true,
                color: '#6366f1',
                type: 'stitching',
                content: [],
                opacity: 0.8,
            },
            {
                id: 'details',
                name: 'Details',
                visible: true,
                color: '#8b5cf6',
                type: 'details',
                content: [],
                opacity: 1,
            },
            {
                id: 'measurements',
                name: 'Measurements',
                visible: true,
                color: '#ef4444',
                type: 'measurements',
                content: [],
                opacity: 1,
            },
            {
                id: 'annotations',
                name: 'Annotations',
                visible: true,
                color: '#f59e0b',
                type: 'annotations',
                content: [],
                opacity: 1,
            },
        ];
    }

    /**
     * Add a measurement to the document
     */
    addMeasurement(
        docId: string,
        measurement: Omit<Measurement, 'id'>
    ): Measurement {
        const doc = this.documents.get(docId);
        if (!doc) throw new Error(`Document ${docId} not found`);

        const newMeasurement: Measurement = {
            ...measurement,
            id: this.generateId(),
        };

        doc.measurements.push(newMeasurement);
        doc.metadata.updatedAt = Date.now();

        return newMeasurement;
    }

    /**
     * Add an annotation to the document
     */
    addAnnotation(
        docId: string,
        annotation: Omit<Annotation, 'id'>
    ): Annotation {
        const doc = this.documents.get(docId);
        if (!doc) throw new Error(`Document ${docId} not found`);

        const newAnnotation: Annotation = {
            ...annotation,
            id: this.generateId(),
        };

        doc.annotations.push(newAnnotation);
        doc.metadata.updatedAt = Date.now();

        return newAnnotation;
    }

    /**
     * Get suggested measurements for a garment type
     */
    getSuggestedMeasurements(garmentType: string): string[] {
        const normalized = garmentType.toLowerCase();

        // Find matching category
        for (const [category, measurements] of Object.entries(
            GARMENT_MEASUREMENTS
        )) {
            if (
                normalized.includes(category) ||
                category.includes(normalized)
            ) {
                return measurements;
            }
        }

        // Default to top measurements
        return GARMENT_MEASUREMENTS.top;
    }

    /**
     * Convert pixel measurement to unit
     */
    pixelsToUnit(
        pixels: number,
        doc: CADDocument,
        targetUnit?: MeasurementUnit
    ): number {
        const unit = targetUnit || doc.scale.unit;
        let valueInCm = pixels / doc.scale.pixelsPerUnit;

        switch (unit) {
            case 'inches':
                return valueInCm / 2.54;
            case 'mm':
                return valueInCm * 10;
            default:
                return valueInCm;
        }
    }

    /**
     * Convert unit measurement to pixels
     */
    unitToPixels(value: number, doc: CADDocument, unit?: MeasurementUnit): number {
        const sourceUnit = unit || doc.scale.unit;
        let valueInCm: number;

        switch (sourceUnit) {
            case 'inches':
                valueInCm = value * 2.54;
                break;
            case 'mm':
                valueInCm = value / 10;
                break;
            default:
                valueInCm = value;
        }

        return valueInCm * doc.scale.pixelsPerUnit;
    }

    /**
     * Generate SVG from CAD document
     */
    generateSVG(
        docId: string,
        options: Partial<SVGExportOptions> = {}
    ): string {
        const doc = this.documents.get(docId);
        if (!doc) throw new Error(`Document ${docId} not found`);

        const opts = { ...DEFAULT_SVG_OPTIONS, ...options };

        const svgParts: string[] = [];

        // SVG header
        svgParts.push(
            `<svg xmlns="http://www.w3.org/2000/svg" ` +
            `width="${doc.width}" height="${doc.height}" ` +
            `viewBox="0 0 ${doc.width} ${doc.height}">`
        );

        // Defs for patterns and markers
        svgParts.push(this.generateSVGDefs(opts));

        // Background
        if (opts.backgroundColor) {
            svgParts.push(
                `<rect width="100%" height="100%" fill="${opts.backgroundColor}"/>`
            );
        }

        // Render each visible layer
        for (const layer of doc.layers) {
            if (!layer.visible) continue;

            // Skip measurements/annotations layers if not included
            if (layer.type === 'measurements' && !opts.includeMeasurements)
                continue;
            if (layer.type === 'annotations' && !opts.includeAnnotations) continue;

            svgParts.push(
                `<g id="${layer.id}" opacity="${layer.opacity}" ` +
                `stroke="${layer.color}" fill="none" stroke-width="${opts.strokeWidth}">`
            );

            // Layer content would be rendered here
            // (In real implementation, would convert layer.content to SVG strings)

            svgParts.push('</g>');
        }

        // Render measurements
        if (opts.includeMeasurements && doc.measurements.length > 0) {
            svgParts.push(this.renderMeasurements(doc, opts));
        }

        // Render annotations
        if (opts.includeAnnotations && doc.annotations.length > 0) {
            svgParts.push(this.renderAnnotations(doc, opts));
        }

        svgParts.push('</svg>');

        return svgParts.join('\n');
    }

    /**
     * Generate SVG defs (patterns, markers, etc.)
     */
    private generateSVGDefs(opts: SVGExportOptions): string {
        return `
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="${opts.primaryColor}"/>
        </marker>
        <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
          <path d="M9,0 L9,6 L0,3 z" fill="${opts.primaryColor}"/>
        </marker>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="${opts.secondaryColor}" stroke-width="0.5"/>
        </pattern>
      </defs>
    `;
    }

    /**
     * Render measurements as SVG
     */
    private renderMeasurements(
        doc: CADDocument,
        opts: SVGExportOptions
    ): string {
        const parts: string[] = ['<g id="measurement-lines" class="measurements">'];

        for (const m of doc.measurements) {
            const x1 = m.startPoint.x * doc.width;
            const y1 = m.startPoint.y * doc.height;
            const x2 = m.endPoint.x * doc.width;
            const y2 = m.endPoint.y * doc.height;

            // Measurement line with arrows
            parts.push(
                `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
                `stroke="#ef4444" stroke-width="1" ` +
                `marker-start="url(#arrow-start)" marker-end="url(#arrow)"/>`
            );

            // Measurement label
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const label = `${m.name}: ${m.value} ${m.unit}`;

            parts.push(
                `<text x="${midX}" y="${midY - 5}" ` +
                `font-family="${opts.fontFamily}" font-size="${opts.fontSize}" ` +
                `fill="#ef4444" text-anchor="middle">${label}</text>`
            );
        }

        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * Render annotations as SVG
     */
    private renderAnnotations(
        doc: CADDocument,
        opts: SVGExportOptions
    ): string {
        const parts: string[] = ['<g id="annotation-callouts" class="annotations">'];

        for (const a of doc.annotations) {
            const x = a.position.x * doc.width;
            const y = a.position.y * doc.height;

            // Annotation marker
            parts.push(
                `<circle cx="${x}" cy="${y}" r="4" fill="#f59e0b" stroke="white" stroke-width="1"/>`
            );

            // Leader line offset based on direction
            let textX = x;
            let textY = y;
            let anchor = 'start';

            switch (a.pointerDirection) {
                case 'left':
                    textX = x - 60;
                    anchor = 'end';
                    break;
                case 'right':
                    textX = x + 15;
                    break;
                case 'up':
                    textY = y - 20;
                    anchor = 'middle';
                    textX = x;
                    break;
                case 'down':
                default:
                    textY = y + 20;
                    anchor = 'middle';
                    textX = x;
            }

            // Leader line
            parts.push(
                `<line x1="${x}" y1="${y}" x2="${textX}" y2="${textY}" ` +
                `stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2"/>`
            );

            // Label text
            parts.push(
                `<text x="${textX}" y="${textY}" ` +
                `font-family="${opts.fontFamily}" font-size="${opts.fontSize}" ` +
                `fill="#f59e0b" text-anchor="${anchor}" font-weight="bold">${a.label}</text>`
            );

            // Description if present
            if (a.description) {
                parts.push(
                    `<text x="${textX}" y="${textY + opts.fontSize + 2}" ` +
                    `font-family="${opts.fontFamily}" font-size="${opts.fontSize - 2}" ` +
                    `fill="#666" text-anchor="${anchor}">${a.description}</text>`
                );
            }
        }

        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * Export to different formats
     */
    exportToFormat(
        docId: string,
        format: 'svg' | 'ai' | 'dxf',
        options?: Partial<SVGExportOptions>
    ): string {
        switch (format) {
            case 'svg':
                return this.generateSVG(docId, options);
            case 'ai':
                // Adobe Illustrator format (SVG-based with AI metadata)
                return this.generateAIFormat(docId, options);
            case 'dxf':
                // AutoCAD DXF format
                return this.generateDXF(docId);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Generate Adobe Illustrator compatible format
     */
    private generateAIFormat(
        docId: string,
        options?: Partial<SVGExportOptions>
    ): string {
        // AI format is SVG with specific namespace and metadata
        const svg = this.generateSVG(docId, options);

        // Add AI-specific namespaces and metadata
        return svg.replace(
            '<svg',
            '<svg xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/" ' +
            'xmlns:x="http://ns.adobe.com/Extensibility/1.0/" ' +
            'i:viewOrigin="0 841.89" i:rulerOrigin="0 0" i:pageBounds="0 841.89 595.28 0"'
        );
    }

    /**
     * Generate DXF format (basic implementation)
     */
    private generateDXF(docId: string): string {
        const doc = this.documents.get(docId);
        if (!doc) throw new Error(`Document ${docId} not found`);

        const dxfParts: string[] = [];

        // DXF Header
        dxfParts.push('0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC');

        // DXF Tables
        dxfParts.push('0', 'SECTION', '2', 'TABLES', '0', 'ENDSEC');

        // DXF Blocks
        dxfParts.push('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC');

        // DXF Entities
        dxfParts.push('0', 'SECTION', '2', 'ENTITIES');

        // Add measurement lines
        for (const m of doc.measurements) {
            const x1 = m.startPoint.x * doc.width;
            const y1 = m.startPoint.y * doc.height;
            const x2 = m.endPoint.x * doc.width;
            const y2 = m.endPoint.y * doc.height;

            dxfParts.push(
                '0',
                'LINE',
                '8',
                'Measurements',
                '10',
                String(x1),
                '20',
                String(y1),
                '11',
                String(x2),
                '21',
                String(y2)
            );
        }

        dxfParts.push('0', 'ENDSEC');

        // DXF EOF
        dxfParts.push('0', 'EOF');

        return dxfParts.join('\n');
    }

    /**
     * Get document by ID
     */
    getDocument(docId: string): CADDocument | undefined {
        return this.documents.get(docId);
    }

    /**
     * Update document
     */
    updateDocument(docId: string, updates: Partial<CADDocument>): void {
        const doc = this.documents.get(docId);
        if (!doc) throw new Error(`Document ${docId} not found`);

        Object.assign(doc, updates, {
            metadata: {
                ...doc.metadata,
                updatedAt: Date.now(),
            },
        });
    }

    /**
     * Delete document
     */
    deleteDocument(docId: string): boolean {
        return this.documents.delete(docId);
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
}

/**
 * Export singleton instance
 */
export const vectorCAD = new VectorCADGenerator();

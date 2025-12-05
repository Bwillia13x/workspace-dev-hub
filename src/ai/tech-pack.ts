/**
 * Tech Pack Generator
 *
 * Generates comprehensive technical specification packages (tech packs)
 * for manufacturing, including all garment details, measurements, materials,
 * and construction specifications.
 */

import type { Measurement, Annotation, MeasurementUnit } from './vector-cad';

/**
 * Size specification
 */
export interface SizeSpec {
    /** Size label (XS, S, M, L, XL, etc.) */
    label: string;
    /** Measurements for this size */
    measurements: Record<string, number>;
    /** Whether this is the base/sample size */
    isBase?: boolean;
}

/**
 * Size grading rules
 */
export interface GradingRule {
    /** Measurement name */
    measurement: string;
    /** Increment per size (e.g., +2cm per size up) */
    increment: number;
    /** Unit */
    unit: MeasurementUnit;
}

/**
 * Color specification
 */
export interface ColorSpec {
    /** Color name */
    name: string;
    /** Hex code */
    hex: string;
    /** Pantone code if available */
    pantone?: string;
    /** Is this the main/primary color */
    isPrimary?: boolean;
    /** Usage notes */
    notes?: string;
}

/**
 * Material/fabric specification
 */
export interface MaterialSpec {
    /** Material name */
    name: string;
    /** Composition (e.g., "100% Cotton", "95% Polyester, 5% Spandex") */
    composition: string;
    /** Weight (GSM) */
    weight?: number;
    /** Width in cm */
    width?: number;
    /** Supplier name */
    supplier?: string;
    /** Supplier code/reference */
    supplierCode?: string;
    /** Care instructions */
    careInstructions?: string[];
    /** Usage in garment */
    usage: string;
    /** Color availability */
    colorOptions?: string[];
}

/**
 * Trim specification (buttons, zippers, labels, etc.)
 */
export interface TrimSpec {
    /** Trim name */
    name: string;
    /** Type of trim */
    type:
    | 'button'
    | 'zipper'
    | 'thread'
    | 'label'
    | 'elastic'
    | 'interfacing'
    | 'lining'
    | 'hardware'
    | 'other';
    /** Quantity needed */
    quantity?: number;
    /** Size/dimensions */
    size?: string;
    /** Color */
    color?: string;
    /** Supplier */
    supplier?: string;
    /** Supplier code */
    supplierCode?: string;
    /** Placement notes */
    placement?: string;
}

/**
 * Construction/sewing specification
 */
export interface ConstructionSpec {
    /** Step name */
    step: string;
    /** Detailed instruction */
    instruction: string;
    /** Seam type */
    seamType?:
    | 'plain'
    | 'french'
    | 'flat-felled'
    | 'overlock'
    | 'blind-hem'
    | 'topstitch'
    | 'zigzag';
    /** Seam allowance in cm */
    seamAllowance?: number;
    /** Stitch type */
    stitchType?:
    | 'straight'
    | 'zigzag'
    | 'overlock'
    | 'chainstitch'
    | 'coverstitch';
    /** Stitches per inch */
    spi?: number;
    /** Thread color */
    threadColor?: string;
    /** Quality check points */
    qualityChecks?: string[];
}

/**
 * Print/embroidery specification
 */
export interface ArtworkSpec {
    /** Artwork name */
    name: string;
    /** Type */
    type: 'print' | 'embroidery' | 'applique' | 'patch' | 'beading';
    /** Placement */
    placement: string;
    /** Dimensions (WxH in cm) */
    dimensions: { width: number; height: number };
    /** Colors used */
    colors: string[];
    /** Artwork file reference */
    fileReference?: string;
    /** Special instructions */
    instructions?: string;
}

/**
 * Packaging specification
 */
export interface PackagingSpec {
    /** Folding method */
    foldingMethod?: string;
    /** Packaging type */
    packagingType: 'polybag' | 'box' | 'hanger' | 'tissue' | 'custom';
    /** Hang tag details */
    hangTag?: {
        design: string;
        content: string;
        attachment: string;
    };
    /** Care label content */
    careLabel?: string[];
    /** Size label placement */
    sizeLabelPlacement?: string;
    /** Additional packaging notes */
    notes?: string;
}

/**
 * Complete Tech Pack document
 */
export interface TechPack {
    /** Tech pack ID */
    id: string;
    /** Style number */
    styleNumber: string;
    /** Style name */
    styleName: string;
    /** Season */
    season?: string;
    /** Designer/brand */
    designer: string;
    /** Date created */
    createdAt: number;
    /** Date updated */
    updatedAt: number;
    /** Version number */
    version: string;

    /** Garment description */
    description: string;
    /** Garment category */
    category: string;
    /** Target market */
    targetMarket?: string;

    /** Technical sketches (CAD images - base64) */
    sketches: {
        front?: string;
        back?: string;
        side?: string;
        detail?: string[];
    };

    /** Size specifications */
    sizes: SizeSpec[];
    /** Base size */
    baseSize: string;
    /** Grading rules */
    gradingRules: GradingRule[];
    /** Measurement unit */
    measurementUnit: MeasurementUnit;

    /** Color specifications */
    colors: ColorSpec[];

    /** Materials */
    materials: MaterialSpec[];

    /** Trims */
    trims: TrimSpec[];

    /** Construction details */
    construction: ConstructionSpec[];

    /** Artwork/prints */
    artwork: ArtworkSpec[];

    /** Packaging */
    packaging: PackagingSpec;

    /** Additional annotations */
    annotations: Annotation[];

    /** Comments/notes */
    notes: string[];

    /** Approval status */
    status: 'draft' | 'review' | 'approved' | 'production';

    /** Approvals */
    approvals?: {
        designer?: { name: string; date: number };
        technical?: { name: string; date: number };
        quality?: { name: string; date: number };
    };
}

/**
 * Standard size charts
 */
const SIZE_CHARTS: Record<string, SizeSpec[]> = {
    womenswear: [
        {
            label: 'XS',
            measurements: { bust: 81, waist: 63, hip: 89, length: 64 },
        },
        {
            label: 'S',
            measurements: { bust: 86, waist: 68, hip: 94, length: 65 },
        },
        {
            label: 'M',
            measurements: { bust: 91, waist: 73, hip: 99, length: 66 },
            isBase: true,
        },
        {
            label: 'L',
            measurements: { bust: 96, waist: 78, hip: 104, length: 67 },
        },
        {
            label: 'XL',
            measurements: { bust: 101, waist: 83, hip: 109, length: 68 },
        },
    ],
    menswear: [
        {
            label: 'S',
            measurements: { chest: 91, waist: 76, hip: 94, length: 70 },
        },
        {
            label: 'M',
            measurements: { chest: 96, waist: 81, hip: 99, length: 72 },
            isBase: true,
        },
        {
            label: 'L',
            measurements: { chest: 101, waist: 86, hip: 104, length: 74 },
        },
        {
            label: 'XL',
            measurements: { chest: 106, waist: 91, hip: 109, length: 76 },
        },
        {
            label: 'XXL',
            measurements: { chest: 111, waist: 96, hip: 114, length: 78 },
        },
    ],
};

/**
 * Standard care instruction codes
 */
const CARE_INSTRUCTIONS = {
    machineWashCold: 'Machine wash cold',
    machineWashWarm: 'Machine wash warm',
    handWash: 'Hand wash only',
    dryCleanOnly: 'Dry clean only',
    doNotBleach: 'Do not bleach',
    tumbleDryLow: 'Tumble dry low',
    lineHang: 'Line dry / Hang dry',
    ironLow: 'Iron low heat',
    ironMedium: 'Iron medium heat',
    doNotIron: 'Do not iron',
    doNotWring: 'Do not wring',
};

/**
 * Tech Pack Generator class
 */
export class TechPackGenerator {
    private techPacks: Map<string, TechPack> = new Map();

    /**
     * Create a new tech pack
     */
    createTechPack(
        styleName: string,
        styleNumber: string,
        designer: string,
        category: string
    ): TechPack {
        const techPack: TechPack = {
            id: this.generateId(),
            styleNumber,
            styleName,
            designer,
            category,
            description: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0',
            sketches: {},
            sizes: [],
            baseSize: 'M',
            gradingRules: [],
            measurementUnit: 'cm',
            colors: [],
            materials: [],
            trims: [],
            construction: [],
            artwork: [],
            packaging: {
                packagingType: 'polybag',
            },
            annotations: [],
            notes: [],
            status: 'draft',
        };

        this.techPacks.set(techPack.id, techPack);
        return techPack;
    }

    /**
     * Get standard size chart
     */
    getStandardSizeChart(category: 'womenswear' | 'menswear'): SizeSpec[] {
        return SIZE_CHARTS[category] || SIZE_CHARTS.womenswear;
    }

    /**
     * Apply standard size chart to tech pack
     */
    applyStandardSizes(
        techPackId: string,
        category: 'womenswear' | 'menswear'
    ): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.sizes = [...this.getStandardSizeChart(category)];
        techPack.baseSize = techPack.sizes.find((s) => s.isBase)?.label || 'M';
        techPack.updatedAt = Date.now();
    }

    /**
     * Add custom size to tech pack
     */
    addCustomSize(techPackId: string, size: SizeSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.sizes.push(size);
        techPack.updatedAt = Date.now();
    }

    /**
     * Add grading rule
     */
    addGradingRule(techPackId: string, rule: GradingRule): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.gradingRules.push(rule);
        techPack.updatedAt = Date.now();
    }

    /**
     * Add color specification
     */
    addColor(techPackId: string, color: ColorSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.colors.push(color);
        techPack.updatedAt = Date.now();
    }

    /**
     * Add material specification
     */
    addMaterial(techPackId: string, material: MaterialSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.materials.push(material);
        techPack.updatedAt = Date.now();
    }

    /**
     * Add trim specification
     */
    addTrim(techPackId: string, trim: TrimSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.trims.push(trim);
        techPack.updatedAt = Date.now();
    }

    /**
     * Add construction step
     */
    addConstructionStep(techPackId: string, step: ConstructionSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.construction.push(step);
        techPack.updatedAt = Date.now();
    }

    /**
     * Add artwork specification
     */
    addArtwork(techPackId: string, artwork: ArtworkSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.artwork.push(artwork);
        techPack.updatedAt = Date.now();
    }

    /**
     * Set sketches
     */
    setSketches(
        techPackId: string,
        sketches: Partial<TechPack['sketches']>
    ): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.sketches = { ...techPack.sketches, ...sketches };
        techPack.updatedAt = Date.now();
    }

    /**
     * Set packaging specification
     */
    setPackaging(techPackId: string, packaging: PackagingSpec): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.packaging = packaging;
        techPack.updatedAt = Date.now();
    }

    /**
     * Get standard care instructions
     */
    getCareInstructions(): Record<string, string> {
        return CARE_INSTRUCTIONS;
    }

    /**
     * Generate care instructions for a material
     */
    generateCareInstructions(composition: string): string[] {
        const instructions: string[] = [];
        const comp = composition.toLowerCase();

        // Determine care based on composition
        if (comp.includes('silk') || comp.includes('wool')) {
            instructions.push(
                CARE_INSTRUCTIONS.handWash,
                CARE_INSTRUCTIONS.doNotBleach,
                CARE_INSTRUCTIONS.lineHang,
                CARE_INSTRUCTIONS.ironLow
            );
        } else if (comp.includes('polyester') || comp.includes('nylon')) {
            instructions.push(
                CARE_INSTRUCTIONS.machineWashCold,
                CARE_INSTRUCTIONS.doNotBleach,
                CARE_INSTRUCTIONS.tumbleDryLow,
                CARE_INSTRUCTIONS.ironLow
            );
        } else if (comp.includes('cotton') || comp.includes('linen')) {
            instructions.push(
                CARE_INSTRUCTIONS.machineWashWarm,
                CARE_INSTRUCTIONS.tumbleDryLow,
                CARE_INSTRUCTIONS.ironMedium
            );
        } else if (comp.includes('leather') || comp.includes('suede')) {
            instructions.push(CARE_INSTRUCTIONS.dryCleanOnly);
        } else {
            // Default
            instructions.push(
                CARE_INSTRUCTIONS.machineWashCold,
                CARE_INSTRUCTIONS.doNotBleach,
                CARE_INSTRUCTIONS.tumbleDryLow
            );
        }

        return instructions;
    }

    /**
     * Update tech pack status
     */
    updateStatus(
        techPackId: string,
        status: TechPack['status'],
        approver?: { role: 'designer' | 'technical' | 'quality'; name: string }
    ): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.status = status;
        techPack.updatedAt = Date.now();

        if (approver && status === 'approved') {
            if (!techPack.approvals) techPack.approvals = {};
            techPack.approvals[approver.role] = {
                name: approver.name,
                date: Date.now(),
            };
        }
    }

    /**
     * Add note to tech pack
     */
    addNote(techPackId: string, note: string): void {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        techPack.notes.push(note);
        techPack.updatedAt = Date.now();
    }

    /**
     * Generate tech pack summary
     */
    generateSummary(techPackId: string): string {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        const lines: string[] = [
            `# Tech Pack: ${techPack.styleName}`,
            `Style Number: ${techPack.styleNumber}`,
            `Designer: ${techPack.designer}`,
            `Category: ${techPack.category}`,
            `Status: ${techPack.status.toUpperCase()}`,
            `Version: ${techPack.version}`,
            '',
            '## Description',
            techPack.description || 'No description provided',
            '',
            '## Sizes',
            techPack.sizes.map((s) => `- ${s.label}${s.isBase ? ' (Base)' : ''}`).join('\n'),
            '',
            '## Colors',
            techPack.colors.map((c) => `- ${c.name} (${c.hex})${c.pantone ? ` / ${c.pantone}` : ''}`).join('\n'),
            '',
            '## Materials',
            techPack.materials
                .map((m) => `- ${m.name}: ${m.composition} (${m.usage})`)
                .join('\n'),
            '',
            '## Trims',
            techPack.trims.map((t) => `- ${t.name} (${t.type})`).join('\n'),
            '',
            '## Construction',
            techPack.construction.map((c, i) => `${i + 1}. ${c.step}`).join('\n'),
        ];

        return lines.join('\n');
    }

    /**
     * Export tech pack to JSON
     */
    exportToJSON(techPackId: string): string {
        const techPack = this.techPacks.get(techPackId);
        if (!techPack) throw new Error(`Tech pack ${techPackId} not found`);

        return JSON.stringify(techPack, null, 2);
    }

    /**
     * Import tech pack from JSON
     */
    importFromJSON(json: string): TechPack {
        const techPack = JSON.parse(json) as TechPack;
        techPack.id = this.generateId();
        techPack.updatedAt = Date.now();

        this.techPacks.set(techPack.id, techPack);
        return techPack;
    }

    /**
     * Clone tech pack
     */
    cloneTechPack(techPackId: string, newStyleNumber: string): TechPack {
        const original = this.techPacks.get(techPackId);
        if (!original) throw new Error(`Tech pack ${techPackId} not found`);

        const clone: TechPack = {
            ...JSON.parse(JSON.stringify(original)),
            id: this.generateId(),
            styleNumber: newStyleNumber,
            styleName: `${original.styleName} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0',
            status: 'draft',
            approvals: undefined,
        };

        this.techPacks.set(clone.id, clone);
        return clone;
    }

    /**
     * Get tech pack by ID
     */
    getTechPack(techPackId: string): TechPack | undefined {
        return this.techPacks.get(techPackId);
    }

    /**
     * Get all tech packs
     */
    getAllTechPacks(): TechPack[] {
        return Array.from(this.techPacks.values());
    }

    /**
     * Delete tech pack
     */
    deleteTechPack(techPackId: string): boolean {
        return this.techPacks.delete(techPackId);
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `TP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }
}

/**
 * Export singleton instance
 */
export const techPackGenerator = new TechPackGenerator();

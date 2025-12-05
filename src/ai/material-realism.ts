/**
 * Material Realism System
 *
 * Enhanced fabric texture generation with detailed material properties,
 * displacement maps, and realistic rendering instructions.
 */

/**
 * Material categories
 */
export type MaterialCategory =
    | 'natural'
    | 'synthetic'
    | 'blended'
    | 'luxury'
    | 'technical';

/**
 * Fabric weight classifications
 */
export type FabricWeight =
    | 'sheer'
    | 'lightweight'
    | 'medium'
    | 'heavyweight'
    | 'structured';

/**
 * Surface finish types
 */
export type SurfaceFinish =
    | 'matte'
    | 'satin'
    | 'glossy'
    | 'textured'
    | 'brushed'
    | 'metallic'
    | 'iridescent';

/**
 * Detailed material definition
 */
export interface MaterialDefinition {
    /** Material name */
    name: string;
    /** Material category */
    category: MaterialCategory;
    /** Fabric weight */
    weight: FabricWeight;
    /** Surface finish */
    finish: SurfaceFinish;
    /** Texture description for AI */
    textureDescription: string;
    /** How light interacts */
    lightBehavior: string;
    /** Drape characteristics */
    drapeDescription: string;
    /** Opacity level 0-1 */
    opacity: number;
    /** Reflectivity 0-1 */
    reflectivity: number;
    /** Common uses */
    commonUses: string[];
    /** Visual keywords for generation */
    visualKeywords: string[];
    /** Typical colors this material works well with */
    typicalColors?: string[];
}

/**
 * Material texture properties for rendering
 */
export interface MaterialTexture {
    /** Base color modulation */
    colorModulation: 'vibrant' | 'muted' | 'rich' | 'subtle';
    /** Pattern visibility */
    patternVisibility: 'high' | 'medium' | 'low';
    /** Wrinkle tendency */
    wrinkleTendency: 'high' | 'medium' | 'low' | 'none';
    /** Stretch characteristics */
    stretch: 'none' | 'one-way' | 'two-way' | 'four-way';
    /** Recovery after stretching */
    recovery: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Complete material with all properties
 */
export interface Material {
    /** Unique identifier */
    id: string;
    /** Material definition */
    definition: MaterialDefinition;
    /** Texture properties */
    texture: MaterialTexture;
    /** Custom modifications */
    customProperties?: Record<string, string>;
}

/**
 * Comprehensive material library
 */
export const MATERIAL_LIBRARY: Record<string, MaterialDefinition> = {
    // Natural Fabrics
    silk: {
        name: 'Silk',
        category: 'natural',
        weight: 'lightweight',
        finish: 'satin',
        textureDescription:
            'smooth, lustrous natural fiber with subtle sheen and fluid drape',
        lightBehavior: 'soft light reflection with subtle iridescence',
        drapeDescription: 'fluid, flowing drape that catches light beautifully',
        opacity: 0.9,
        reflectivity: 0.6,
        commonUses: ['evening wear', 'blouses', 'lingerie', 'scarves'],
        visualKeywords: [
            'lustrous',
            'flowing',
            'elegant',
            'smooth',
            'luxurious sheen',
        ],
    },

    cotton: {
        name: 'Cotton',
        category: 'natural',
        weight: 'medium',
        finish: 'matte',
        textureDescription: 'soft, breathable natural fiber with subtle texture',
        lightBehavior: 'absorbs light evenly with minimal reflection',
        drapeDescription: 'relaxed drape with natural body',
        opacity: 1.0,
        reflectivity: 0.1,
        commonUses: ['casual wear', 'shirts', 't-shirts', 'dresses'],
        visualKeywords: ['soft', 'natural', 'breathable', 'comfortable', 'crisp'],
    },

    linen: {
        name: 'Linen',
        category: 'natural',
        weight: 'medium',
        finish: 'textured',
        textureDescription:
            'natural fiber with characteristic slubs and organic texture',
        lightBehavior: 'soft light absorption with visible weave texture',
        drapeDescription: 'relaxed, slightly stiff drape with natural wrinkles',
        opacity: 1.0,
        reflectivity: 0.15,
        commonUses: ['summer wear', 'resort wear', 'blazers', 'pants'],
        visualKeywords: [
            'textured',
            'organic',
            'breathable',
            'natural wrinkles',
            'relaxed',
        ],
    },

    wool: {
        name: 'Wool',
        category: 'natural',
        weight: 'medium',
        finish: 'matte',
        textureDescription:
            'warm natural fiber with subtle surface texture and depth',
        lightBehavior: 'absorbs light with soft, warm appearance',
        drapeDescription: 'structured drape with body and warmth',
        opacity: 1.0,
        reflectivity: 0.1,
        commonUses: ['coats', 'suits', 'sweaters', 'winter wear'],
        visualKeywords: ['warm', 'cozy', 'textured', 'structured', 'luxurious'],
    },

    cashmere: {
        name: 'Cashmere',
        category: 'luxury',
        weight: 'lightweight',
        finish: 'brushed',
        textureDescription:
            'ultra-soft luxury fiber with fine, downy texture',
        lightBehavior: 'soft light absorption with gentle surface fuzz',
        drapeDescription: 'soft, fluid drape with luxurious hand feel',
        opacity: 1.0,
        reflectivity: 0.05,
        commonUses: ['sweaters', 'scarves', 'luxury coats'],
        visualKeywords: ['ultra-soft', 'luxurious', 'fine', 'delicate', 'premium'],
    },

    // Luxury Fabrics
    velvet: {
        name: 'Velvet',
        category: 'luxury',
        weight: 'medium',
        finish: 'textured',
        textureDescription:
            'plush pile fabric with deep, rich surface and light-absorbing depth',
        lightBehavior: 'absorbs light deeply, creates rich shadows and highlights',
        drapeDescription: 'heavy, luxurious drape with dimensional surface',
        opacity: 1.0,
        reflectivity: 0.3,
        commonUses: ['evening wear', 'formal jackets', 'dresses'],
        visualKeywords: [
            'plush',
            'rich',
            'deep',
            'luxurious',
            'dramatic',
            'pile texture',
        ],
    },

    satin: {
        name: 'Satin',
        category: 'luxury',
        weight: 'lightweight',
        finish: 'glossy',
        textureDescription:
            'high-shine fabric with smooth, reflective surface',
        lightBehavior: 'high light reflection with bright highlights',
        drapeDescription: 'fluid, liquid-like drape with elegant movement',
        opacity: 0.95,
        reflectivity: 0.8,
        commonUses: ['evening gowns', 'lingerie', 'bridalwear', 'linings'],
        visualKeywords: ['glossy', 'luminous', 'sleek', 'elegant', 'reflective'],
    },

    brocade: {
        name: 'Brocade',
        category: 'luxury',
        weight: 'heavyweight',
        finish: 'textured',
        textureDescription:
            'richly woven fabric with raised patterns and metallic threads',
        lightBehavior: 'complex light interaction with pattern highlights',
        drapeDescription: 'structured, stiff drape with dimensional patterns',
        opacity: 1.0,
        reflectivity: 0.4,
        commonUses: ['formal wear', 'jackets', 'evening wear', 'accessories'],
        visualKeywords: ['ornate', 'raised pattern', 'metallic accents', 'opulent'],
    },

    // Sheer Fabrics
    chiffon: {
        name: 'Chiffon',
        category: 'natural',
        weight: 'sheer',
        finish: 'matte',
        textureDescription:
            'delicate, sheer fabric with soft, floating quality',
        lightBehavior: 'allows light to pass through, creates soft shadows',
        drapeDescription: 'ethereal, floating drape with graceful movement',
        opacity: 0.3,
        reflectivity: 0.15,
        commonUses: ['overlay', 'sleeves', 'scarves', 'evening wear'],
        visualKeywords: ['sheer', 'ethereal', 'floating', 'delicate', 'airy'],
    },

    organza: {
        name: 'Organza',
        category: 'synthetic',
        weight: 'sheer',
        finish: 'glossy',
        textureDescription:
            'crisp, sheer fabric with structured transparency',
        lightBehavior: 'light passes through with slight shimmer',
        drapeDescription: 'crisp, structured drape that holds shape',
        opacity: 0.4,
        reflectivity: 0.35,
        commonUses: ['overlays', 'sleeves', 'bridalwear', 'formal wear'],
        visualKeywords: ['crisp', 'transparent', 'structured', 'shimmer'],
    },

    tulle: {
        name: 'Tulle',
        category: 'synthetic',
        weight: 'sheer',
        finish: 'matte',
        textureDescription: 'fine mesh fabric with open weave structure',
        lightBehavior: 'diffuses light through mesh pattern',
        drapeDescription: 'soft, voluminous drape, can be layered',
        opacity: 0.2,
        reflectivity: 0.1,
        commonUses: ['skirts', 'veils', 'overlays', 'bridalwear'],
        visualKeywords: ['mesh', 'layered', 'voluminous', 'romantic', 'ethereal'],
    },

    lace: {
        name: 'Lace',
        category: 'luxury',
        weight: 'lightweight',
        finish: 'textured',
        textureDescription:
            'intricate openwork fabric with decorative patterns',
        lightBehavior: 'creates shadow patterns, reveals layers beneath',
        drapeDescription: 'delicate drape following body contours',
        opacity: 0.5,
        reflectivity: 0.2,
        commonUses: ['overlays', 'trim', 'evening wear', 'bridalwear'],
        visualKeywords: ['intricate', 'romantic', 'delicate', 'patterned', 'feminine'],
    },

    // Synthetic Fabrics
    polyester: {
        name: 'Polyester',
        category: 'synthetic',
        weight: 'medium',
        finish: 'satin',
        textureDescription: 'durable synthetic with smooth, consistent surface',
        lightBehavior: 'moderate reflection with uniform appearance',
        drapeDescription: 'consistent drape with good shape retention',
        opacity: 1.0,
        reflectivity: 0.4,
        commonUses: ['everyday wear', 'activewear', 'linings'],
        visualKeywords: ['smooth', 'durable', 'consistent', 'versatile'],
    },

    nylon: {
        name: 'Nylon',
        category: 'synthetic',
        weight: 'lightweight',
        finish: 'glossy',
        textureDescription: 'smooth, strong synthetic with slight sheen',
        lightBehavior: 'reflects light with clean highlights',
        drapeDescription: 'smooth, flowing drape',
        opacity: 0.95,
        reflectivity: 0.5,
        commonUses: ['activewear', 'outerwear', 'hosiery'],
        visualKeywords: ['sleek', 'smooth', 'performance', 'sporty'],
    },

    spandex: {
        name: 'Spandex/Elastane',
        category: 'synthetic',
        weight: 'lightweight',
        finish: 'matte',
        textureDescription:
            'highly elastic fabric that hugs and shapes',
        lightBehavior: 'matte appearance with subtle sheen when stretched',
        drapeDescription: 'body-hugging, second-skin fit',
        opacity: 1.0,
        reflectivity: 0.25,
        commonUses: ['activewear', 'swimwear', 'bodycon', 'athleisure'],
        visualKeywords: [
            'stretchy',
            'body-hugging',
            'sleek',
            'athletic',
            'form-fitting',
        ],
    },

    // Technical Fabrics
    neoprene: {
        name: 'Neoprene',
        category: 'technical',
        weight: 'heavyweight',
        finish: 'matte',
        textureDescription:
            'thick, structured synthetic with rubber-like texture',
        lightBehavior: 'absorbs light with minimal reflection',
        drapeDescription: 'structured, holds sculptural shapes',
        opacity: 1.0,
        reflectivity: 0.1,
        commonUses: ['structured garments', 'activewear', 'modern silhouettes'],
        visualKeywords: ['structured', 'modern', 'sculptural', 'technical'],
    },

    mesh: {
        name: 'Mesh',
        category: 'technical',
        weight: 'lightweight',
        finish: 'matte',
        textureDescription: 'open-weave breathable fabric with visible holes',
        lightBehavior: 'allows light through, creates grid pattern',
        drapeDescription: 'flexible drape with some structure',
        opacity: 0.4,
        reflectivity: 0.15,
        commonUses: ['activewear', 'details', 'layering'],
        visualKeywords: ['breathable', 'sporty', 'open-weave', 'modern'],
    },

    // Denim & Workwear
    denim: {
        name: 'Denim',
        category: 'natural',
        weight: 'heavyweight',
        finish: 'textured',
        textureDescription:
            'twill-woven cotton with characteristic diagonal weave',
        lightBehavior: 'absorbs light with subtle weave visible',
        drapeDescription: 'stiff, structured drape that softens with wear',
        opacity: 1.0,
        reflectivity: 0.1,
        commonUses: ['jeans', 'jackets', 'skirts', 'casual wear'],
        visualKeywords: ['rugged', 'textured', 'classic', 'indigo', 'twill'],
        typicalColors: ['indigo', 'light wash', 'dark wash', 'black', 'white'],
    },

    leather: {
        name: 'Leather',
        category: 'luxury',
        weight: 'heavyweight',
        finish: 'glossy',
        textureDescription:
            'natural hide with characteristic grain and supple texture',
        lightBehavior: 'reflects light with natural grain visible',
        drapeDescription: 'stiff to supple depending on treatment',
        opacity: 1.0,
        reflectivity: 0.5,
        commonUses: ['jackets', 'pants', 'accessories', 'outerwear'],
        visualKeywords: [
            'luxurious',
            'supple',
            'grain texture',
            'premium',
            'edgy',
        ],
    },

    suede: {
        name: 'Suede',
        category: 'luxury',
        weight: 'medium',
        finish: 'brushed',
        textureDescription:
            'napped leather with soft, velvety surface',
        lightBehavior: 'absorbs light, creates soft shadows',
        drapeDescription: 'soft drape with some structure',
        opacity: 1.0,
        reflectivity: 0.1,
        commonUses: ['jackets', 'skirts', 'boots', 'accessories'],
        visualKeywords: ['soft', 'velvety', 'tactile', 'luxurious', 'textured'],
    },

    // Embellished
    sequin: {
        name: 'Sequin Fabric',
        category: 'luxury',
        weight: 'heavyweight',
        finish: 'metallic',
        textureDescription:
            'base fabric covered with reflective sequin discs',
        lightBehavior: 'high sparkle and light reflection, disco-ball effect',
        drapeDescription: 'heavy drape due to sequin weight',
        opacity: 1.0,
        reflectivity: 0.95,
        commonUses: ['evening wear', 'party dresses', 'performance'],
        visualKeywords: ['sparkly', 'glamorous', 'disco', 'festive', 'eye-catching'],
    },

    metallic: {
        name: 'Metallic Fabric',
        category: 'synthetic',
        weight: 'medium',
        finish: 'metallic',
        textureDescription:
            'fabric with metallic coating or woven metallic threads',
        lightBehavior: 'high reflectivity with metallic sheen',
        drapeDescription: 'varies from stiff to fluid depending on base',
        opacity: 1.0,
        reflectivity: 0.85,
        commonUses: ['evening wear', 'party wear', 'accessories'],
        visualKeywords: ['shiny', 'metallic', 'futuristic', 'glamorous'],
    },
};

/**
 * Material Realism Manager
 */
export class MaterialRealismManager {
    private materials: Map<string, Material> = new Map();

    /**
     * Get a material definition by name
     */
    getMaterial(name: string): MaterialDefinition | undefined {
        return MATERIAL_LIBRARY[name.toLowerCase()];
    }

    /**
     * Get all available materials
     */
    getAllMaterials(): MaterialDefinition[] {
        return Object.values(MATERIAL_LIBRARY);
    }

    /**
     * Get materials by category
     */
    getMaterialsByCategory(category: MaterialCategory): MaterialDefinition[] {
        return Object.values(MATERIAL_LIBRARY).filter(
            (m) => m.category === category
        );
    }

    /**
     * Get materials by weight
     */
    getMaterialsByWeight(weight: FabricWeight): MaterialDefinition[] {
        return Object.values(MATERIAL_LIBRARY).filter((m) => m.weight === weight);
    }

    /**
     * Get materials by finish
     */
    getMaterialsByFinish(finish: SurfaceFinish): MaterialDefinition[] {
        return Object.values(MATERIAL_LIBRARY).filter((m) => m.finish === finish);
    }

    /**
     * Build a detailed prompt addition for a specific material
     */
    buildMaterialPrompt(materialName: string): string {
        const material = this.getMaterial(materialName);
        if (!material) {
            return `made of ${materialName}`;
        }

        const parts: string[] = [];

        // Material name and core description
        parts.push(`made of ${material.name.toLowerCase()}`);
        parts.push(material.textureDescription);

        // Visual keywords
        if (material.visualKeywords.length > 0) {
            parts.push(material.visualKeywords.slice(0, 3).join(', ') + ' appearance');
        }

        // Light behavior
        parts.push(material.lightBehavior);

        // Drape
        parts.push(material.drapeDescription);

        return parts.join(', ');
    }

    /**
     * Get rendering instructions for a material
     */
    getRenderingInstructions(materialName: string): string {
        const material = this.getMaterial(materialName);
        if (!material) {
            return '';
        }

        const instructions: string[] = [];

        // Opacity guidance
        if (material.opacity < 0.5) {
            instructions.push(
                'render with visible transparency, show layers beneath'
            );
        } else if (material.opacity < 0.9) {
            instructions.push('subtle translucency in thin areas');
        }

        // Reflectivity guidance
        if (material.reflectivity > 0.7) {
            instructions.push('render with bright highlights and strong reflections');
        } else if (material.reflectivity > 0.4) {
            instructions.push('moderate light reflection with soft highlights');
        } else {
            instructions.push('matte appearance with minimal highlights');
        }

        // Weight guidance
        switch (material.weight) {
            case 'sheer':
                instructions.push('ethereal, weightless appearance');
                break;
            case 'lightweight':
                instructions.push('light, airy movement');
                break;
            case 'heavyweight':
                instructions.push('structured, substantial fabric weight visible');
                break;
        }

        return instructions.join('. ');
    }

    /**
     * Suggest complementary materials for a design
     */
    suggestComplementaryMaterials(
        primaryMaterial: string,
        count: number = 3
    ): MaterialDefinition[] {
        const primary = this.getMaterial(primaryMaterial);
        if (!primary) return [];

        const allMaterials = this.getAllMaterials();

        // Score materials based on complementary properties
        const scored = allMaterials
            .filter((m) => m.name.toLowerCase() !== primaryMaterial.toLowerCase())
            .map((m) => {
                let score = 0;

                // Contrast in weight is interesting
                if (m.weight !== primary.weight) score += 2;

                // Same category can work well
                if (m.category === primary.category) score += 1;

                // Contrasting finish adds visual interest
                if (m.finish !== primary.finish) score += 2;

                // Similar opacity works for layering
                if (Math.abs(m.opacity - primary.opacity) < 0.3) score += 1;

                return { material: m, score };
            })
            .sort((a, b) => b.score - a.score);

        return scored.slice(0, count).map((s) => s.material);
    }

    /**
     * Create a custom material combination
     */
    createMaterialCombination(
        materials: string[],
        name: string
    ): string {
        const descriptions = materials
            .map((m) => this.getMaterial(m))
            .filter(Boolean) as MaterialDefinition[];

        if (descriptions.length === 0) {
            return `${name} fabric blend`;
        }

        // Combine visual keywords
        const allKeywords = descriptions.flatMap((d) => d.visualKeywords);
        const uniqueKeywords = [...new Set(allKeywords)].slice(0, 5);

        return `${name} (${materials.join(' and ')}) - ${uniqueKeywords.join(', ')} blend`;
    }

    /**
     * Get texture properties for a material
     */
    getTextureProperties(materialName: string): MaterialTexture {
        const material = this.getMaterial(materialName);

        // Default texture properties
        const defaults: MaterialTexture = {
            colorModulation: 'vibrant',
            patternVisibility: 'medium',
            wrinkleTendency: 'medium',
            stretch: 'none',
            recovery: 'good',
        };

        if (!material) return defaults;

        // Derive texture properties from material characteristics
        return {
            colorModulation:
                material.reflectivity > 0.5
                    ? 'rich'
                    : material.category === 'natural'
                        ? 'muted'
                        : 'vibrant',
            patternVisibility:
                material.finish === 'textured'
                    ? 'high'
                    : material.opacity < 0.5
                        ? 'low'
                        : 'medium',
            wrinkleTendency:
                material.name.toLowerCase() === 'linen'
                    ? 'high'
                    : material.weight === 'heavyweight'
                        ? 'low'
                        : 'medium',
            stretch:
                material.name.toLowerCase().includes('spandex') ||
                    material.name.toLowerCase().includes('elastane')
                    ? 'four-way'
                    : material.category === 'technical'
                        ? 'two-way'
                        : 'none',
            recovery:
                material.category === 'synthetic' ? 'excellent' : 'good',
        };
    }

    /**
     * Generate a complete material specification for AI generation
     */
    generateMaterialSpec(materialName: string): string {
        const material = this.getMaterial(materialName);
        if (!material) {
            return `fabric: ${materialName}`;
        }

        const prompt = this.buildMaterialPrompt(materialName);
        const rendering = this.getRenderingInstructions(materialName);

        return `${prompt}. Rendering: ${rendering}`;
    }
}

/**
 * Export singleton instance
 */
export const materialRealism = new MaterialRealismManager();

/**
 * Export material categories for UI
 */
export const MATERIAL_CATEGORIES: MaterialCategory[] = [
    'natural',
    'synthetic',
    'blended',
    'luxury',
    'technical',
];

/**
 * Export fabric weights for UI
 */
export const FABRIC_WEIGHTS: FabricWeight[] = [
    'sheer',
    'lightweight',
    'medium',
    'heavyweight',
    'structured',
];

/**
 * Export surface finishes for UI
 */
export const SURFACE_FINISHES: SurfaceFinish[] = [
    'matte',
    'satin',
    'glossy',
    'textured',
    'brushed',
    'metallic',
    'iridescent',
];

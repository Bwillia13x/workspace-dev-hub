/**
 * Multi-Garment Collection Generator
 *
 * Generates complete fashion collections (3-5 pieces) with style consistency
 * across all garments. Maintains cohesive design language, color palette,
 * and aesthetic throughout the collection.
 */

import {
    ImageStyle,
} from './types';

import type {
    GenerationOptions,
    GenerationResult,
} from './types';

/**
 * Types of garments that can be in a collection
 */
export type GarmentType =
    | 'top'
    | 'bottom'
    | 'dress'
    | 'outerwear'
    | 'jumpsuit'
    | 'accessory'
    | 'footwear';

/**
 * A single garment in a collection
 */
export interface CollectionGarment {
    /** Unique identifier */
    id: string;
    /** Type of garment */
    type: GarmentType;
    /** Specific garment description */
    description: string;
    /** Generated image base64 */
    imageBase64?: string;
    /** Generation status */
    status: 'pending' | 'generating' | 'complete' | 'failed';
    /** Error message if failed */
    error?: string;
    /** Generation options used */
    options?: GenerationOptions;
}

/**
 * Collection theme/style definition
 */
export interface CollectionTheme {
    /** Theme name */
    name: string;
    /** Style keywords */
    styleKeywords: string[];
    /** Color palette (hex) */
    colorPalette: string[];
    /** Season/occasion */
    season?: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round';
    /** Target occasion */
    occasion?:
    | 'casual'
    | 'business'
    | 'evening'
    | 'weekend'
    | 'resort'
    | 'athleisure';
    /** Materials to use */
    materials?: string[];
    /** Design details to incorporate */
    details?: string[];
}

/**
 * A complete fashion collection
 */
export interface FashionCollection {
    /** Collection ID */
    id: string;
    /** Collection name */
    name: string;
    /** Collection description */
    description: string;
    /** Theme definition */
    theme: CollectionTheme;
    /** Garments in the collection */
    garments: CollectionGarment[];
    /** Style reference image (base64) */
    styleReference?: string;
    /** Creation timestamp */
    createdAt: number;
    /** Last modified timestamp */
    updatedAt: number;
    /** Overall generation status */
    status: 'draft' | 'generating' | 'complete' | 'partial';
}

/**
 * Collection template for quick starts
 */
export interface CollectionTemplate {
    /** Template ID */
    id: string;
    /** Template name */
    name: string;
    /** Description */
    description: string;
    /** Garment types included */
    garmentTypes: GarmentType[];
    /** Default theme */
    defaultTheme: Partial<CollectionTheme>;
    /** Preview image */
    previewImage?: string;
}

/**
 * Pre-defined collection templates
 */
export const COLLECTION_TEMPLATES: CollectionTemplate[] = [
    {
        id: 'capsule-casual',
        name: 'Casual Capsule',
        description: 'Essential everyday pieces that mix and match',
        garmentTypes: ['top', 'top', 'bottom', 'bottom', 'outerwear'],
        defaultTheme: {
            styleKeywords: ['casual', 'comfortable', 'versatile', 'modern'],
            colorPalette: ['#F5F5F5', '#2C3E50', '#95A5A6', '#E74C3C', '#3498DB'],
            season: 'year-round',
            occasion: 'casual',
            materials: ['cotton', 'denim', 'jersey'],
        },
    },
    {
        id: 'office-essentials',
        name: 'Office Essentials',
        description: 'Professional workwear collection',
        garmentTypes: ['top', 'bottom', 'dress', 'outerwear', 'accessory'],
        defaultTheme: {
            styleKeywords: ['professional', 'polished', 'sophisticated', 'tailored'],
            colorPalette: ['#1A1A2E', '#16213E', '#E8E8E8', '#C9B037', '#F5F5F5'],
            season: 'year-round',
            occasion: 'business',
            materials: ['wool', 'silk', 'cotton blend', 'crepe'],
        },
    },
    {
        id: 'evening-glamour',
        name: 'Evening Glamour',
        description: 'Elegant pieces for special occasions',
        garmentTypes: ['dress', 'top', 'bottom', 'outerwear', 'accessory'],
        defaultTheme: {
            styleKeywords: ['elegant', 'glamorous', 'luxurious', 'dramatic'],
            colorPalette: ['#0D0D0D', '#B8860B', '#8B0000', '#F5F5F5', '#C0C0C0'],
            season: 'year-round',
            occasion: 'evening',
            materials: ['silk', 'velvet', 'satin', 'chiffon', 'sequin'],
        },
    },
    {
        id: 'resort-collection',
        name: 'Resort Getaway',
        description: 'Vacation-ready resort wear',
        garmentTypes: ['dress', 'top', 'bottom', 'jumpsuit', 'accessory'],
        defaultTheme: {
            styleKeywords: ['breezy', 'tropical', 'relaxed', 'vibrant'],
            colorPalette: ['#FFFFFF', '#00CED1', '#FF6B6B', '#98D8C8', '#F7DC6F'],
            season: 'summer',
            occasion: 'resort',
            materials: ['linen', 'cotton', 'silk blend', 'crochet'],
        },
    },
    {
        id: 'athleisure-set',
        name: 'Athleisure Set',
        description: 'Sport-inspired lifestyle pieces',
        garmentTypes: ['top', 'top', 'bottom', 'outerwear', 'accessory'],
        defaultTheme: {
            styleKeywords: ['sporty', 'modern', 'comfortable', 'sleek'],
            colorPalette: ['#2D3436', '#636E72', '#00B894', '#FDCB6E', '#FFFFFF'],
            season: 'year-round',
            occasion: 'athleisure',
            materials: ['performance fabric', 'jersey', 'mesh', 'neoprene'],
        },
    },
];

/**
 * Garment type descriptions for prompt generation
 */
const GARMENT_TYPE_DESCRIPTIONS: Record<GarmentType, string[]> = {
    top: [
        'blouse',
        'shirt',
        'sweater',
        'tank top',
        't-shirt',
        'camisole',
        'bodysuit',
        'crop top',
        'turtleneck',
        'polo',
    ],
    bottom: [
        'trousers',
        'pants',
        'skirt',
        'jeans',
        'shorts',
        'culottes',
        'wide-leg pants',
        'pencil skirt',
        'midi skirt',
        'maxi skirt',
    ],
    dress: [
        'midi dress',
        'maxi dress',
        'mini dress',
        'shift dress',
        'wrap dress',
        'sheath dress',
        'A-line dress',
        'slip dress',
        'shirt dress',
        'cocktail dress',
    ],
    outerwear: [
        'blazer',
        'jacket',
        'coat',
        'cardigan',
        'trench coat',
        'bomber jacket',
        'leather jacket',
        'denim jacket',
        'cape',
        'poncho',
    ],
    jumpsuit: [
        'jumpsuit',
        'romper',
        'one-piece',
        'playsuit',
        'wide-leg jumpsuit',
        'tailored jumpsuit',
        'casual romper',
    ],
    accessory: [
        'scarf',
        'belt',
        'hat',
        'bag',
        'jewelry set',
        'sunglasses',
        'watch',
        'headband',
    ],
    footwear: [
        'heels',
        'flats',
        'boots',
        'sneakers',
        'sandals',
        'loafers',
        'mules',
        'espadrilles',
    ],
};

/**
 * Multi-Garment Collection Generator
 */
export class CollectionGenerator {
    private collections: Map<string, FashionCollection> = new Map();
    private generateFn: (
        prompt: string,
        options?: GenerationOptions
    ) => Promise<GenerationResult>;

    constructor(
        generateFunction: (
            prompt: string,
            options?: GenerationOptions
        ) => Promise<GenerationResult>
    ) {
        this.generateFn = generateFunction;
    }

    /**
     * Create a new collection from a template
     */
    createFromTemplate(
        template: CollectionTemplate,
        customTheme?: Partial<CollectionTheme>
    ): FashionCollection {
        const theme: CollectionTheme = {
            name: template.name,
            styleKeywords: [],
            colorPalette: [],
            ...template.defaultTheme,
            ...customTheme,
        };

        const garments: CollectionGarment[] = template.garmentTypes.map(
            (type, index) => ({
                id: this.generateId(),
                type,
                description: this.getRandomGarmentDescription(type),
                status: 'pending' as const,
            })
        );

        const collection: FashionCollection = {
            id: this.generateId(),
            name: template.name,
            description: template.description,
            theme,
            garments,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'draft',
        };

        this.collections.set(collection.id, collection);
        return collection;
    }

    /**
     * Create a custom collection
     */
    createCustomCollection(
        name: string,
        description: string,
        theme: CollectionTheme,
        garmentTypes: GarmentType[]
    ): FashionCollection {
        const garments: CollectionGarment[] = garmentTypes.map((type) => ({
            id: this.generateId(),
            type,
            description: this.getRandomGarmentDescription(type),
            status: 'pending' as const,
        }));

        const collection: FashionCollection = {
            id: this.generateId(),
            name,
            description,
            theme,
            garments,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'draft',
        };

        this.collections.set(collection.id, collection);
        return collection;
    }

    /**
     * Generate all garments in a collection
     */
    async generateCollection(
        collectionId: string,
        onProgress?: (garmentIndex: number, total: number) => void
    ): Promise<FashionCollection> {
        const collection = this.collections.get(collectionId);
        if (!collection) throw new Error(`Collection ${collectionId} not found`);

        collection.status = 'generating';
        collection.updatedAt = Date.now();

        let successCount = 0;

        for (let i = 0; i < collection.garments.length; i++) {
            const garment = collection.garments[i];

            if (onProgress) {
                onProgress(i, collection.garments.length);
            }

            try {
                garment.status = 'generating';

                // Build the prompt with collection theme context
                const prompt = this.buildGarmentPrompt(garment, collection.theme);

                // Build options with style consistency
                const options: GenerationOptions = {
                    style: ImageStyle.PHOTOREALISTIC,
                    colorPalette: collection.theme.colorPalette,
                    quality: 'standard',
                };

                // Use style reference from first successful garment if available
                if (collection.styleReference) {
                    options.styleReference = collection.styleReference;
                }

                // Generate the garment
                const result = await this.generateFn(prompt, options);

                if (result.images && result.images.length > 0) {
                    garment.imageBase64 = result.images[0];
                    garment.status = 'complete';
                    garment.options = options;
                    successCount++;

                    // Use first successful generation as style reference
                    if (!collection.styleReference && garment.imageBase64) {
                        collection.styleReference = garment.imageBase64;
                    }
                } else {
                    garment.status = 'failed';
                    garment.error = 'No image generated';
                }
            } catch (error) {
                garment.status = 'failed';
                garment.error =
                    error instanceof Error ? error.message : 'Generation failed';
            }
        }

        // Update collection status
        if (successCount === collection.garments.length) {
            collection.status = 'complete';
        } else if (successCount > 0) {
            collection.status = 'partial';
        } else {
            collection.status = 'draft';
        }

        collection.updatedAt = Date.now();
        return collection;
    }

    /**
     * Regenerate a single garment in a collection
     */
    async regenerateGarment(
        collectionId: string,
        garmentId: string,
        customDescription?: string
    ): Promise<CollectionGarment> {
        const collection = this.collections.get(collectionId);
        if (!collection) throw new Error(`Collection ${collectionId} not found`);

        const garment = collection.garments.find((g) => g.id === garmentId);
        if (!garment) throw new Error(`Garment ${garmentId} not found`);

        if (customDescription) {
            garment.description = customDescription;
        }

        garment.status = 'generating';
        garment.error = undefined;

        try {
            const prompt = this.buildGarmentPrompt(garment, collection.theme);
            const options: GenerationOptions = {
                style: ImageStyle.PHOTOREALISTIC,
                colorPalette: collection.theme.colorPalette,
                quality: 'standard',
                styleReference: collection.styleReference,
            };

            const result = await this.generateFn(prompt, options);

            if (result.images && result.images.length > 0) {
                garment.imageBase64 = result.images[0];
                garment.status = 'complete';
                garment.options = options;
            } else {
                garment.status = 'failed';
                garment.error = 'No image generated';
            }
        } catch (error) {
            garment.status = 'failed';
            garment.error =
                error instanceof Error ? error.message : 'Generation failed';
        }

        collection.updatedAt = Date.now();
        return garment;
    }

    /**
     * Build a prompt for a specific garment with theme context
     */
    private buildGarmentPrompt(
        garment: CollectionGarment,
        theme: CollectionTheme
    ): string {
        const parts: string[] = [];

        // Add style keywords
        if (theme.styleKeywords.length > 0) {
            parts.push(theme.styleKeywords.join(', '));
        }

        // Add garment description
        parts.push(garment.description);

        // Add materials if specified
        if (theme.materials && theme.materials.length > 0) {
            parts.push(`in ${theme.materials.slice(0, 2).join(' or ')}`);
        }

        // Add color context
        if (theme.colorPalette.length > 0) {
            // Convert hex to descriptive colors for better AI understanding
            const colorDescriptions = theme.colorPalette
                .slice(0, 3)
                .map((hex) => this.hexToColorName(hex));
            parts.push(`featuring ${colorDescriptions.join(', ')} tones`);
        }

        // Add season context
        if (theme.season && theme.season !== 'year-round') {
            parts.push(`${theme.season} collection piece`);
        }

        // Add occasion context
        if (theme.occasion) {
            parts.push(`suitable for ${theme.occasion}`);
        }

        // Add design details
        if (theme.details && theme.details.length > 0) {
            parts.push(`with ${theme.details.slice(0, 2).join(' and ')} details`);
        }

        // Add photography style
        parts.push('photorealistic fashion photography, studio lighting, neutral background');

        return parts.join(', ');
    }

    /**
     * Convert hex color to approximate color name
     */
    private hexToColorName(hex: string): string {
        // Simple hex to color name mapping
        const colorMap: Record<string, string[]> = {
            neutral: ['F5F5F5', 'E8E8E8', 'D3D3D3', 'C0C0C0', 'A9A9A9', '808080'],
            black: ['000000', '0D0D0D', '1A1A1A', '2D3436', '2C3E50', '1A1A2E'],
            white: ['FFFFFF', 'FAFAFA', 'F8F8F8'],
            navy: ['16213E', '1B2631', '2C3E50', '34495E'],
            red: ['E74C3C', '8B0000', 'DC143C', 'B22222', 'FF6B6B'],
            blue: ['3498DB', '2980B9', '1ABC9C', '00CED1'],
            green: ['00B894', '27AE60', '2ECC71', '98D8C8'],
            gold: ['C9B037', 'B8860B', 'FFD700', 'F7DC6F', 'FDCB6E'],
            burgundy: ['8B0000', '800020', '722F37'],
        };

        const normalizedHex = hex.replace('#', '').toUpperCase();

        for (const [name, hexes] of Object.entries(colorMap)) {
            if (hexes.some((h) => h.toUpperCase() === normalizedHex)) {
                return name;
            }
        }

        // Fallback to generic based on brightness
        const r = parseInt(normalizedHex.slice(0, 2), 16);
        const g = parseInt(normalizedHex.slice(2, 4), 16);
        const b = parseInt(normalizedHex.slice(4, 6), 16);
        const brightness = (r + g + b) / 3;

        if (brightness > 200) return 'light';
        if (brightness < 50) return 'dark';
        return 'muted';
    }

    /**
     * Get a random description for a garment type
     */
    private getRandomGarmentDescription(type: GarmentType): string {
        const descriptions = GARMENT_TYPE_DESCRIPTIONS[type];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    /**
     * Update garment description
     */
    updateGarmentDescription(
        collectionId: string,
        garmentId: string,
        description: string
    ): void {
        const collection = this.collections.get(collectionId);
        if (!collection) throw new Error(`Collection ${collectionId} not found`);

        const garment = collection.garments.find((g) => g.id === garmentId);
        if (!garment) throw new Error(`Garment ${garmentId} not found`);

        garment.description = description;
        collection.updatedAt = Date.now();
    }

    /**
     * Add a garment to a collection
     */
    addGarment(collectionId: string, type: GarmentType): CollectionGarment {
        const collection = this.collections.get(collectionId);
        if (!collection) throw new Error(`Collection ${collectionId} not found`);

        const garment: CollectionGarment = {
            id: this.generateId(),
            type,
            description: this.getRandomGarmentDescription(type),
            status: 'pending',
        };

        collection.garments.push(garment);
        collection.updatedAt = Date.now();

        return garment;
    }

    /**
     * Remove a garment from a collection
     */
    removeGarment(collectionId: string, garmentId: string): boolean {
        const collection = this.collections.get(collectionId);
        if (!collection) return false;

        const index = collection.garments.findIndex((g) => g.id === garmentId);
        if (index === -1) return false;

        collection.garments.splice(index, 1);
        collection.updatedAt = Date.now();

        return true;
    }

    /**
     * Update collection theme
     */
    updateTheme(
        collectionId: string,
        themeUpdates: Partial<CollectionTheme>
    ): void {
        const collection = this.collections.get(collectionId);
        if (!collection) throw new Error(`Collection ${collectionId} not found`);

        collection.theme = { ...collection.theme, ...themeUpdates };
        collection.updatedAt = Date.now();
    }

    /**
     * Get a collection by ID
     */
    getCollection(collectionId: string): FashionCollection | undefined {
        return this.collections.get(collectionId);
    }

    /**
     * Get all collections
     */
    getAllCollections(): FashionCollection[] {
        return Array.from(this.collections.values());
    }

    /**
     * Delete a collection
     */
    deleteCollection(collectionId: string): boolean {
        return this.collections.delete(collectionId);
    }

    /**
     * Export collection data
     */
    exportCollection(collectionId: string): string {
        const collection = this.collections.get(collectionId);
        if (!collection) throw new Error(`Collection ${collectionId} not found`);

        return JSON.stringify(collection, null, 2);
    }

    /**
     * Import collection data
     */
    importCollection(data: string): FashionCollection {
        const collection = JSON.parse(data) as FashionCollection;
        collection.id = this.generateId(); // Generate new ID to avoid conflicts
        collection.updatedAt = Date.now();

        this.collections.set(collection.id, collection);
        return collection;
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
}

/**
 * Get available collection templates
 */
export function getCollectionTemplates(): CollectionTemplate[] {
    return COLLECTION_TEMPLATES;
}

/**
 * Get available garment types with descriptions
 */
export function getGarmentTypes(): Record<GarmentType, string[]> {
    return GARMENT_TYPE_DESCRIPTIONS;
}

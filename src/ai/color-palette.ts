/**
 * Color Palette Manager
 * 
 * Extracts and manages color palettes from images.
 * Enables designers to maintain color consistency across designs
 * and extract palettes from mood boards.
 */

/**
 * A color palette with named colors
 */
export interface ColorPalette {
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** Colors in hex format */
    colors: string[];
    /** Optional descriptions for each color */
    colorNames?: string[];
    /** Source image if extracted */
    sourceImage?: string;
    /** Creation timestamp */
    createdAt: number;
    /** Tags for organization */
    tags: string[];
}

/**
 * Result from color extraction
 */
export interface ExtractedColors {
    /** Dominant colors (most prominent) */
    dominant: string[];
    /** Accent colors (supporting colors) */
    accents: string[];
    /** Background color if detected */
    background?: string;
    /** Color temperature (warm/cool/neutral) */
    temperature: 'warm' | 'cool' | 'neutral';
    /** Overall brightness */
    brightness: 'light' | 'medium' | 'dark';
}

/**
 * Color harmony types
 */
export type ColorHarmony =
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'split-complementary'
    | 'tetradic'
    | 'monochromatic';

/**
 * Manages color palettes and extraction
 */
export class ColorPaletteManager {
    private palettes: Map<string, ColorPalette> = new Map();
    private readonly storageKey = 'nanofashion_color_palettes';

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Create a new palette manually
     */
    createPalette(
        name: string,
        colors: string[],
        options?: {
            colorNames?: string[];
            tags?: string[];
        }
    ): ColorPalette {
        const id = this.generateId();
        const palette: ColorPalette = {
            id,
            name,
            colors: colors.map(c => this.normalizeColor(c)),
            colorNames: options?.colorNames,
            createdAt: Date.now(),
            tags: options?.tags || [],
        };

        this.palettes.set(id, palette);
        this.saveToStorage();

        return palette;
    }

    /**
     * Create palette from extracted colors
     */
    createFromExtraction(
        name: string,
        extracted: ExtractedColors,
        sourceImage?: string
    ): ColorPalette {
        const colors = [
            ...extracted.dominant,
            ...extracted.accents,
        ];

        if (extracted.background) {
            colors.push(extracted.background);
        }

        const id = this.generateId();
        const palette: ColorPalette = {
            id,
            name,
            colors: [...new Set(colors)].slice(0, 8),
            sourceImage,
            createdAt: Date.now(),
            tags: [extracted.temperature, extracted.brightness],
        };

        this.palettes.set(id, palette);
        this.saveToStorage();

        return palette;
    }

    /**
     * Get a palette by ID
     */
    getPalette(id: string): ColorPalette | undefined {
        return this.palettes.get(id);
    }

    /**
     * Get all palettes
     */
    getAllPalettes(): ColorPalette[] {
        return Array.from(this.palettes.values())
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Search palettes by tag
     */
    getPalettesByTag(tag: string): ColorPalette[] {
        return this.getAllPalettes()
            .filter(p => p.tags.includes(tag.toLowerCase()));
    }

    /**
     * Update a palette
     */
    updatePalette(
        id: string,
        updates: Partial<Omit<ColorPalette, 'id' | 'createdAt'>>
    ): ColorPalette | null {
        const palette = this.palettes.get(id);
        if (!palette) return null;

        const updated: ColorPalette = {
            ...palette,
            ...updates,
            colors: updates.colors
                ? updates.colors.map(c => this.normalizeColor(c))
                : palette.colors,
        };

        this.palettes.set(id, updated);
        this.saveToStorage();

        return updated;
    }

    /**
     * Delete a palette
     */
    deletePalette(id: string): boolean {
        const deleted = this.palettes.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }

    /**
     * Generate color variations based on a base color
     */
    generateVariations(baseColor: string, count: number = 5): string[] {
        const hsl = this.hexToHsl(baseColor);
        const variations: string[] = [baseColor];

        // Generate lighter and darker variations
        for (let i = 1; i < count; i++) {
            const factor = i / count;

            // Lighter variation
            const lighter = this.hslToHex({
                h: hsl.h,
                s: Math.max(0, hsl.s - factor * 20),
                l: Math.min(95, hsl.l + factor * 30),
            });

            // Darker variation
            const darker = this.hslToHex({
                h: hsl.h,
                s: Math.min(100, hsl.s + factor * 10),
                l: Math.max(5, hsl.l - factor * 30),
            });

            if (i % 2 === 0) {
                variations.push(lighter);
            } else {
                variations.push(darker);
            }
        }

        return variations.slice(0, count);
    }

    /**
     * Generate harmonious colors based on color theory
     */
    generateHarmony(baseColor: string, harmony: ColorHarmony): string[] {
        const hsl = this.hexToHsl(baseColor);
        const colors: string[] = [baseColor];

        switch (harmony) {
            case 'complementary':
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 180) % 360 }));
                break;

            case 'analogous':
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 30) % 360 }));
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 330) % 360 }));
                break;

            case 'triadic':
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 120) % 360 }));
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 240) % 360 }));
                break;

            case 'split-complementary':
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 150) % 360 }));
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 210) % 360 }));
                break;

            case 'tetradic':
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 90) % 360 }));
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 180) % 360 }));
                colors.push(this.hslToHex({ ...hsl, h: (hsl.h + 270) % 360 }));
                break;

            case 'monochromatic':
                colors.push(...this.generateVariations(baseColor, 4).slice(1));
                break;
        }

        return colors;
    }

    /**
     * Format palette for use in prompts
     */
    formatForPrompt(paletteId: string): string {
        const palette = this.palettes.get(paletteId);
        if (!palette) return '';

        const colorDescriptions = palette.colors.map((color, i) => {
            const name = palette.colorNames?.[i] || this.describeColor(color);
            return `${name} (${color})`;
        });

        return `Color palette: ${colorDescriptions.join(', ')}`;
    }

    /**
     * Get colors as an array for generation options
     */
    getColorsArray(paletteId: string): string[] {
        return this.palettes.get(paletteId)?.colors || [];
    }

    /**
     * Describe a color in natural language
     */
    private describeColor(hex: string): string {
        const hsl = this.hexToHsl(hex);

        // Determine hue name
        const hueNames: Array<[number, string]> = [
            [15, 'red'],
            [45, 'orange'],
            [75, 'yellow'],
            [150, 'green'],
            [210, 'cyan'],
            [270, 'blue'],
            [330, 'purple'],
            [360, 'red'],
        ];

        let hueName = 'gray';
        if (hsl.s > 10) {
            for (const [threshold, name] of hueNames) {
                if (hsl.h <= threshold) {
                    hueName = name;
                    break;
                }
            }
        }

        // Determine lightness modifier
        let lightnessModifier = '';
        if (hsl.l < 25) lightnessModifier = 'dark ';
        else if (hsl.l > 75) lightnessModifier = 'light ';

        // Determine saturation modifier
        if (hsl.s < 10) {
            if (hsl.l < 25) return 'black';
            if (hsl.l > 75) return 'white';
            return 'gray';
        }

        return `${lightnessModifier}${hueName}`;
    }

    /**
     * Normalize color to hex format
     */
    private normalizeColor(color: string): string {
        // If already hex, ensure it's lowercase with #
        if (color.match(/^#?[0-9a-fA-F]{6}$/)) {
            return color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`;
        }

        // Handle rgb format
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const [, r, g, b] = rgbMatch;
            return this.rgbToHex(parseInt(r), parseInt(g), parseInt(b));
        }

        return color.toLowerCase();
    }

    /**
     * Convert RGB to Hex
     */
    private rgbToHex(r: number, g: number, b: number): string {
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Convert Hex to HSL
     */
    private hexToHsl(hex: string): { h: number; s: number; l: number } {
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
        const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
        const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    }

    /**
     * Convert HSL to Hex
     */
    private hslToHex(hsl: { h: number; s: number; l: number }): string {
        const { h, s, l } = hsl;
        const sNorm = s / 100;
        const lNorm = l / 100;

        const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = lNorm - c / 2;

        let r = 0, g = 0, b = 0;

        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return this.rgbToHex(
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        );
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `palette_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = Array.from(this.palettes.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save color palettes:', error);
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const entries: Array<[string, ColorPalette]> = JSON.parse(data);
                this.palettes = new Map(entries);
            }
        } catch (error) {
            console.warn('Failed to load color palettes:', error);
        }
    }

    /**
     * Clear all palettes
     */
    clear(): void {
        this.palettes.clear();
        localStorage.removeItem(this.storageKey);
    }
}

/**
 * Preset fashion color palettes
 */
export const PRESET_PALETTES: Array<Omit<ColorPalette, 'id' | 'createdAt'>> = [
    {
        name: 'Classic Neutrals',
        colors: ['#000000', '#FFFFFF', '#808080', '#D3D3D3', '#F5F5DC'],
        colorNames: ['Black', 'White', 'Gray', 'Light Gray', 'Beige'],
        tags: ['classic', 'neutral', 'professional'],
    },
    {
        name: 'Earth Tones',
        colors: ['#8B4513', '#D2691E', '#A0522D', '#DEB887', '#F4A460'],
        colorNames: ['Saddle Brown', 'Chocolate', 'Sienna', 'Burlywood', 'Sandy Brown'],
        tags: ['natural', 'earthy', 'autumn'],
    },
    {
        name: 'Pastels',
        colors: ['#FFB6C1', '#E6E6FA', '#B0E0E6', '#FAFAD2', '#D8BFD8'],
        colorNames: ['Light Pink', 'Lavender', 'Powder Blue', 'Light Goldenrod', 'Thistle'],
        tags: ['soft', 'spring', 'romantic'],
    },
    {
        name: 'Bold Primary',
        colors: ['#FF0000', '#0000FF', '#FFFF00', '#000000', '#FFFFFF'],
        colorNames: ['Red', 'Blue', 'Yellow', 'Black', 'White'],
        tags: ['bold', 'primary', 'vibrant'],
    },
    {
        name: 'Ocean Blues',
        colors: ['#000080', '#0066CC', '#4169E1', '#87CEEB', '#E0FFFF'],
        colorNames: ['Navy', 'Azure', 'Royal Blue', 'Sky Blue', 'Light Cyan'],
        tags: ['cool', 'water', 'summer'],
    },
    {
        name: 'Sunset Warm',
        colors: ['#FF6B35', '#F7931E', '#FFD700', '#FF4500', '#8B0000'],
        colorNames: ['Coral', 'Orange', 'Gold', 'Orange Red', 'Dark Red'],
        tags: ['warm', 'sunset', 'vibrant'],
    },
];

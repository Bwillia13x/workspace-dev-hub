/**
 * Color Manager - Phase 4 Professional Design Tools
 *
 * Professional color management with color spaces, Pantone integration,
 * color harmony, and palette management for fashion design.
 */

export interface RGBColor {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
    a?: number; // 0-1
}

export interface HSLColor {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100
    a?: number; // 0-1
}

export interface HSVColor {
    h: number; // 0-360
    s: number; // 0-100
    v: number; // 0-100
    a?: number; // 0-1
}

export interface CMYKColor {
    c: number; // 0-100
    m: number; // 0-100
    y: number; // 0-100
    k: number; // 0-100
}

export interface LABColor {
    l: number; // 0-100
    a: number; // -128 to 127
    b: number; // -128 to 127
}

export interface XYZColor {
    x: number;
    y: number;
    z: number;
}

export type ColorSpace = 'rgb' | 'hsl' | 'hsv' | 'cmyk' | 'lab' | 'xyz' | 'hex';

export interface Color {
    id: string;
    name?: string;
    rgb: RGBColor;
    hex: string;
    hsl: HSLColor;
    hsv: HSVColor;
    cmyk: CMYKColor;
    lab: LABColor;
    pantone?: string;
    tags?: string[];
}

export interface ColorSwatch {
    id: string;
    name: string;
    color: Color;
    category?: string;
    description?: string;
}

export interface ColorPalette {
    id: string;
    name: string;
    description?: string;
    colors: ColorSwatch[];
    createdAt: Date;
    modifiedAt: Date;
    tags?: string[];
    season?: 'spring' | 'summer' | 'fall' | 'winter';
    mood?: string;
}

export type HarmonyType =
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'split-complementary'
    | 'tetradic'
    | 'square'
    | 'monochromatic';

export interface PantoneColor {
    code: string;
    name: string;
    rgb: RGBColor;
    cmyk: CMYKColor;
    category: PantoneCategory;
    year?: number;
}

export type PantoneCategory =
    | 'fashion'
    | 'textile'
    | 'solid-coated'
    | 'solid-uncoated'
    | 'metallic'
    | 'pastels-neons';

export interface ColorProfile {
    name: string;
    type: 'rgb' | 'cmyk';
    gamut: 'srgb' | 'adobe-rgb' | 'prophoto' | 'cmyk-fogra39';
    whitePoint: XYZColor;
    primaries?: XYZColor[];
}

export type ColorEvent =
    | { type: 'colorCreated'; color: Color }
    | { type: 'paletteCreated'; palette: ColorPalette }
    | { type: 'paletteUpdated'; palette: ColorPalette }
    | { type: 'harmonyGenerated'; colors: Color[] };

type ColorEventListener = (event: ColorEvent) => void;

/**
 * Color Manager for professional color handling
 */
export class ColorManager {
    private palettes: Map<string, ColorPalette> = new Map();
    private pantoneLibrary: Map<string, PantoneColor> = new Map();
    private listeners: Set<ColorEventListener> = new Set();
    private idCounter: number = 0;

    // Standard color profiles
    private readonly profiles: Map<string, ColorProfile> = new Map([
        ['srgb', {
            name: 'sRGB IEC61966-2.1',
            type: 'rgb',
            gamut: 'srgb',
            whitePoint: { x: 0.95047, y: 1.0, z: 1.08883 } // D65
        }],
        ['adobe-rgb', {
            name: 'Adobe RGB (1998)',
            type: 'rgb',
            gamut: 'adobe-rgb',
            whitePoint: { x: 0.95047, y: 1.0, z: 1.08883 }
        }],
        ['cmyk-fogra39', {
            name: 'Fogra39 (ISO Coated v2)',
            type: 'cmyk',
            gamut: 'cmyk-fogra39',
            whitePoint: { x: 0.95047, y: 1.0, z: 1.08883 }
        }]
    ]);

    constructor() {
        this.initializePantoneLibrary();
    }

    /**
     * Create color from various inputs
     */
    createColor(input: string | RGBColor | HSLColor | HSVColor | CMYKColor): Color {
        let rgb: RGBColor;

        if (typeof input === 'string') {
            rgb = this.hexToRgb(input);
        } else if ('r' in input) {
            rgb = input as RGBColor;
        } else if ('l' in input && 's' in input) {
            rgb = this.hslToRgb(input as HSLColor);
        } else if ('v' in input) {
            rgb = this.hsvToRgb(input as HSVColor);
        } else if ('c' in input) {
            rgb = this.cmykToRgb(input as CMYKColor);
        } else {
            throw new Error('Invalid color input');
        }

        const color: Color = {
            id: this.generateId(),
            rgb,
            hex: this.rgbToHex(rgb),
            hsl: this.rgbToHsl(rgb),
            hsv: this.rgbToHsv(rgb),
            cmyk: this.rgbToCmyk(rgb),
            lab: this.rgbToLab(rgb)
        };

        this.emit({ type: 'colorCreated', color });
        return color;
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex: string): RGBColor {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
        if (!result) {
            throw new Error(`Invalid hex color: ${hex}`);
        }

        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: result[4] ? parseInt(result[4], 16) / 255 : 1
        };
    }

    /**
     * Convert RGB to hex
     */
    rgbToHex(rgb: RGBColor): string {
        const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
        let hex = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
        if (rgb.a !== undefined && rgb.a < 1) {
            hex += toHex(rgb.a * 255);
        }
        return hex;
    }

    /**
     * Convert RGB to HSL
     */
    rgbToHsl(rgb: RGBColor): HSLColor {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

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
            a: rgb.a
        };
    }

    /**
     * Convert HSL to RGB
     */
    hslToRgb(hsl: HSLColor): RGBColor {
        const h = hsl.h / 360;
        const s = hsl.s / 100;
        const l = hsl.l / 100;

        let r: number, g: number, b: number;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a: hsl.a
        };
    }

    /**
     * Convert RGB to HSV
     */
    rgbToHsv(rgb: RGBColor): HSVColor {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        const v = max;
        const d = max - min;
        const s = max === 0 ? 0 : d / max;

        if (max !== min) {
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
            v: Math.round(v * 100),
            a: rgb.a
        };
    }

    /**
     * Convert HSV to RGB
     */
    hsvToRgb(hsv: HSVColor): RGBColor {
        const h = hsv.h / 360;
        const s = hsv.s / 100;
        const v = hsv.v / 100;

        let r: number, g: number, b: number;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v; g = t; b = p;
                break;
            case 1:
                r = q; g = v; b = p;
                break;
            case 2:
                r = p; g = v; b = t;
                break;
            case 3:
                r = p; g = q; b = v;
                break;
            case 4:
                r = t; g = p; b = v;
                break;
            case 5:
            default:
                r = v; g = p; b = q;
                break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a: hsv.a
        };
    }

    /**
     * Convert RGB to CMYK
     */
    rgbToCmyk(rgb: RGBColor): CMYKColor {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const k = 1 - Math.max(r, g, b);
        const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
        const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
        const y = k === 1 ? 0 : (1 - b - k) / (1 - k);

        return {
            c: Math.round(c * 100),
            m: Math.round(m * 100),
            y: Math.round(y * 100),
            k: Math.round(k * 100)
        };
    }

    /**
     * Convert CMYK to RGB
     */
    cmykToRgb(cmyk: CMYKColor): RGBColor {
        const c = cmyk.c / 100;
        const m = cmyk.m / 100;
        const y = cmyk.y / 100;
        const k = cmyk.k / 100;

        return {
            r: Math.round(255 * (1 - c) * (1 - k)),
            g: Math.round(255 * (1 - m) * (1 - k)),
            b: Math.round(255 * (1 - y) * (1 - k))
        };
    }

    /**
     * Convert RGB to LAB
     */
    rgbToLab(rgb: RGBColor): LABColor {
        const xyz = this.rgbToXyz(rgb);
        return this.xyzToLab(xyz);
    }

    /**
     * Convert LAB to RGB
     */
    labToRgb(lab: LABColor): RGBColor {
        const xyz = this.labToXyz(lab);
        return this.xyzToRgb(xyz);
    }

    /**
     * Convert RGB to XYZ
     */
    rgbToXyz(rgb: RGBColor): XYZColor {
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;

        // sRGB to linear RGB
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        r *= 100;
        g *= 100;
        b *= 100;

        return {
            x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
            y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
            z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041
        };
    }

    /**
     * Convert XYZ to RGB
     */
    xyzToRgb(xyz: XYZColor): RGBColor {
        const x = xyz.x / 100;
        const y = xyz.y / 100;
        const z = xyz.z / 100;

        let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
        let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

        // Linear RGB to sRGB
        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

        return {
            r: Math.round(Math.max(0, Math.min(255, r * 255))),
            g: Math.round(Math.max(0, Math.min(255, g * 255))),
            b: Math.round(Math.max(0, Math.min(255, b * 255)))
        };
    }

    /**
     * Convert XYZ to LAB
     */
    xyzToLab(xyz: XYZColor): LABColor {
        // D65 white point
        let x = xyz.x / 95.047;
        let y = xyz.y / 100.000;
        let z = xyz.z / 108.883;

        x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
        y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
        z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    /**
     * Convert LAB to XYZ
     */
    labToXyz(lab: LABColor): XYZColor {
        let y = (lab.l + 16) / 116;
        let x = lab.a / 500 + y;
        let z = y - lab.b / 200;

        const y3 = Math.pow(y, 3);
        const x3 = Math.pow(x, 3);
        const z3 = Math.pow(z, 3);

        y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
        x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
        z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;

        return {
            x: x * 95.047,
            y: y * 100.000,
            z: z * 108.883
        };
    }

    /**
     * Calculate color difference (Delta E 2000)
     */
    colorDifference(color1: Color, color2: Color): number {
        const lab1 = color1.lab;
        const lab2 = color2.lab;

        // Simplified Delta E calculation (CIE76)
        const dL = lab1.l - lab2.l;
        const dA = lab1.a - lab2.a;
        const dB = lab1.b - lab2.b;

        return Math.sqrt(dL * dL + dA * dA + dB * dB);
    }

    /**
     * Generate color harmony
     */
    generateHarmony(baseColor: Color, type: HarmonyType, count?: number): Color[] {
        const hsl = baseColor.hsl;
        const colors: Color[] = [baseColor];

        switch (type) {
            case 'complementary':
                colors.push(this.createColor({
                    h: (hsl.h + 180) % 360,
                    s: hsl.s,
                    l: hsl.l
                }));
                break;

            case 'analogous':
                colors.push(
                    this.createColor({ h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: hsl.l })
                );
                break;

            case 'triadic':
                colors.push(
                    this.createColor({ h: (hsl.h + 120) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h + 240) % 360, s: hsl.s, l: hsl.l })
                );
                break;

            case 'split-complementary':
                colors.push(
                    this.createColor({ h: (hsl.h + 150) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h + 210) % 360, s: hsl.s, l: hsl.l })
                );
                break;

            case 'tetradic':
                colors.push(
                    this.createColor({ h: (hsl.h + 90) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h + 270) % 360, s: hsl.s, l: hsl.l })
                );
                break;

            case 'square':
                colors.push(
                    this.createColor({ h: (hsl.h + 90) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l }),
                    this.createColor({ h: (hsl.h + 270) % 360, s: hsl.s, l: hsl.l })
                );
                break;

            case 'monochromatic':
                const variations = count || 5;
                for (let i = 1; i < variations; i++) {
                    const lightness = Math.max(10, Math.min(90, hsl.l + (i - Math.floor(variations / 2)) * 15));
                    colors.push(this.createColor({ h: hsl.h, s: hsl.s, l: lightness }));
                }
                break;
        }

        this.emit({ type: 'harmonyGenerated', colors });
        return colors;
    }

    /**
     * Mix two colors
     */
    mixColors(color1: Color, color2: Color, ratio: number = 0.5): Color {
        const r = Math.round(color1.rgb.r * (1 - ratio) + color2.rgb.r * ratio);
        const g = Math.round(color1.rgb.g * (1 - ratio) + color2.rgb.g * ratio);
        const b = Math.round(color1.rgb.b * (1 - ratio) + color2.rgb.b * ratio);

        return this.createColor({ r, g, b });
    }

    /**
     * Lighten color
     */
    lighten(color: Color, amount: number = 10): Color {
        const hsl = { ...color.hsl };
        hsl.l = Math.min(100, hsl.l + amount);
        return this.createColor(hsl);
    }

    /**
     * Darken color
     */
    darken(color: Color, amount: number = 10): Color {
        const hsl = { ...color.hsl };
        hsl.l = Math.max(0, hsl.l - amount);
        return this.createColor(hsl);
    }

    /**
     * Saturate color
     */
    saturate(color: Color, amount: number = 10): Color {
        const hsl = { ...color.hsl };
        hsl.s = Math.min(100, hsl.s + amount);
        return this.createColor(hsl);
    }

    /**
     * Desaturate color
     */
    desaturate(color: Color, amount: number = 10): Color {
        const hsl = { ...color.hsl };
        hsl.s = Math.max(0, hsl.s - amount);
        return this.createColor(hsl);
    }

    /**
     * Invert color
     */
    invert(color: Color): Color {
        return this.createColor({
            r: 255 - color.rgb.r,
            g: 255 - color.rgb.g,
            b: 255 - color.rgb.b
        });
    }

    /**
     * Get contrast ratio (WCAG)
     */
    getContrastRatio(color1: Color, color2: Color): number {
        const lum1 = this.getRelativeLuminance(color1.rgb);
        const lum2 = this.getRelativeLuminance(color2.rgb);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    private getRelativeLuminance(rgb: RGBColor): number {
        const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
        const linear = sRGB.map(c =>
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    }

    /**
     * Check if color is accessible (WCAG AA)
     */
    isAccessible(foreground: Color, background: Color, level: 'AA' | 'AAA' = 'AA'): boolean {
        const ratio = this.getContrastRatio(foreground, background);
        return level === 'AAA' ? ratio >= 7 : ratio >= 4.5;
    }

    /**
     * Create a color palette
     */
    createPalette(name: string, colors?: ColorSwatch[]): ColorPalette {
        const palette: ColorPalette = {
            id: this.generateId(),
            name,
            colors: colors || [],
            createdAt: new Date(),
            modifiedAt: new Date()
        };

        this.palettes.set(palette.id, palette);
        this.emit({ type: 'paletteCreated', palette });
        return palette;
    }

    /**
     * Add color to palette
     */
    addToPalette(paletteId: string, color: Color, name?: string): ColorSwatch {
        const palette = this.palettes.get(paletteId);
        if (!palette) {
            throw new Error(`Palette ${paletteId} not found`);
        }

        const swatch: ColorSwatch = {
            id: this.generateId(),
            name: name || `Color ${palette.colors.length + 1}`,
            color
        };

        palette.colors.push(swatch);
        palette.modifiedAt = new Date();
        this.emit({ type: 'paletteUpdated', palette });
        return swatch;
    }

    /**
     * Get palette
     */
    getPalette(paletteId: string): ColorPalette | undefined {
        return this.palettes.get(paletteId);
    }

    /**
     * Get all palettes
     */
    getAllPalettes(): ColorPalette[] {
        return Array.from(this.palettes.values());
    }

    /**
     * Find closest Pantone color
     */
    findClosestPantone(color: Color): PantoneColor | null {
        let closest: PantoneColor | null = null;
        let minDiff = Infinity;

        for (const pantone of this.pantoneLibrary.values()) {
            const pantoneColor = this.createColor(pantone.rgb);
            const diff = this.colorDifference(color, pantoneColor);

            if (diff < minDiff) {
                minDiff = diff;
                closest = pantone;
            }
        }

        return closest;
    }

    /**
     * Get Pantone color by code
     */
    getPantone(code: string): PantoneColor | undefined {
        return this.pantoneLibrary.get(code);
    }

    /**
     * Generate gradient
     */
    generateGradient(color1: Color, color2: Color, steps: number): Color[] {
        const colors: Color[] = [];

        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            colors.push(this.mixColors(color1, color2, ratio));
        }

        return colors;
    }

    /**
     * Generate fashion season palette
     */
    generateSeasonPalette(season: 'spring' | 'summer' | 'fall' | 'winter'): ColorPalette {
        const colors: ColorSwatch[] = [];

        switch (season) {
            case 'spring':
                colors.push(
                    { id: this.generateId(), name: 'Fresh Green', color: this.createColor('#7CB342') },
                    { id: this.generateId(), name: 'Peach', color: this.createColor('#FFAB91') },
                    { id: this.generateId(), name: 'Sky Blue', color: this.createColor('#81D4FA') },
                    { id: this.generateId(), name: 'Daffodil', color: this.createColor('#FFF176') },
                    { id: this.generateId(), name: 'Blush', color: this.createColor('#F8BBD9') }
                );
                break;

            case 'summer':
                colors.push(
                    { id: this.generateId(), name: 'Ocean Blue', color: this.createColor('#0288D1') },
                    { id: this.generateId(), name: 'Coral', color: this.createColor('#FF7043') },
                    { id: this.generateId(), name: 'Sand', color: this.createColor('#D4C19C') },
                    { id: this.generateId(), name: 'Tropical', color: this.createColor('#00BFA5') },
                    { id: this.generateId(), name: 'White', color: this.createColor('#FAFAFA') }
                );
                break;

            case 'fall':
                colors.push(
                    { id: this.generateId(), name: 'Burnt Orange', color: this.createColor('#E64A19') },
                    { id: this.generateId(), name: 'Olive', color: this.createColor('#827717') },
                    { id: this.generateId(), name: 'Burgundy', color: this.createColor('#880E4F') },
                    { id: this.generateId(), name: 'Mustard', color: this.createColor('#F9A825') },
                    { id: this.generateId(), name: 'Chocolate', color: this.createColor('#4E342E') }
                );
                break;

            case 'winter':
                colors.push(
                    { id: this.generateId(), name: 'Navy', color: this.createColor('#1A237E') },
                    { id: this.generateId(), name: 'Evergreen', color: this.createColor('#1B5E20') },
                    { id: this.generateId(), name: 'Crimson', color: this.createColor('#B71C1C') },
                    { id: this.generateId(), name: 'Silver', color: this.createColor('#9E9E9E') },
                    { id: this.generateId(), name: 'Black', color: this.createColor('#212121') }
                );
                break;
        }

        const palette = this.createPalette(`${season.charAt(0).toUpperCase() + season.slice(1)} Collection`, colors);
        palette.season = season;
        return palette;
    }

    /**
     * Initialize Pantone library with common fashion colors
     */
    private initializePantoneLibrary(): void {
        const pantoneColors: PantoneColor[] = [
            { code: '19-4052', name: 'Classic Blue', rgb: { r: 15, g: 76, b: 129 }, cmyk: { c: 100, m: 71, y: 22, k: 6 }, category: 'fashion', year: 2020 },
            { code: '17-5104', name: 'Ultimate Gray', rgb: { r: 147, g: 149, b: 151 }, cmyk: { c: 35, m: 28, y: 26, k: 0 }, category: 'fashion', year: 2021 },
            { code: '13-0647', name: 'Illuminating', rgb: { r: 245, g: 223, b: 77 }, cmyk: { c: 2, m: 5, y: 79, k: 0 }, category: 'fashion', year: 2021 },
            { code: '17-3938', name: 'Very Peri', rgb: { r: 102, g: 103, b: 171 }, cmyk: { c: 64, m: 58, y: 0, k: 0 }, category: 'fashion', year: 2022 },
            { code: '18-1750', name: 'Viva Magenta', rgb: { r: 190, g: 52, b: 85 }, cmyk: { c: 18, m: 100, y: 45, k: 0 }, category: 'fashion', year: 2023 },
            { code: '13-1023', name: 'Peach Fuzz', rgb: { r: 255, g: 190, b: 152 }, cmyk: { c: 0, m: 30, y: 38, k: 0 }, category: 'fashion', year: 2024 },

            // Core fashion colors
            { code: '19-3911', name: 'Black Beauty', rgb: { r: 38, g: 38, b: 38 }, cmyk: { c: 70, m: 65, y: 64, k: 74 }, category: 'fashion' },
            { code: '11-0601', name: 'Bright White', rgb: { r: 255, g: 255, b: 255 }, cmyk: { c: 0, m: 0, y: 0, k: 0 }, category: 'fashion' },
            { code: '19-4013', name: 'Dark Navy', rgb: { r: 48, g: 52, b: 63 }, cmyk: { c: 84, m: 74, y: 51, k: 44 }, category: 'fashion' },
            { code: '18-1662', name: 'Fiery Red', rgb: { r: 205, g: 33, b: 42 }, cmyk: { c: 10, m: 100, y: 90, k: 0 }, category: 'fashion' },

            // Textile colors
            { code: '14-0756', name: 'Empire Yellow', rgb: { r: 253, g: 193, b: 1 }, cmyk: { c: 0, m: 26, y: 100, k: 0 }, category: 'textile' },
            { code: '17-4540', name: 'Diva Blue', rgb: { r: 0, g: 137, b: 182 }, cmyk: { c: 86, m: 29, y: 18, k: 0 }, category: 'textile' },
            { code: '18-2043', name: 'Pink Peacock', rgb: { r: 198, g: 36, b: 102 }, cmyk: { c: 16, m: 100, y: 35, k: 1 }, category: 'textile' }
        ];

        for (const color of pantoneColors) {
            this.pantoneLibrary.set(color.code, color);
        }
    }

    /**
     * Export palette to CSS variables
     */
    exportToCSSVariables(palette: ColorPalette): string {
        let css = ':root {\n';

        for (const swatch of palette.colors) {
            const varName = swatch.name.toLowerCase().replace(/\s+/g, '-');
            css += `  --color-${varName}: ${swatch.color.hex};\n`;
            css += `  --color-${varName}-rgb: ${swatch.color.rgb.r}, ${swatch.color.rgb.g}, ${swatch.color.rgb.b};\n`;
        }

        css += '}';
        return css;
    }

    /**
     * Export palette to SCSS variables
     */
    exportToSCSS(palette: ColorPalette): string {
        let scss = '';

        for (const swatch of palette.colors) {
            const varName = swatch.name.toLowerCase().replace(/\s+/g, '-');
            scss += `$color-${varName}: ${swatch.color.hex};\n`;
        }

        return scss;
    }

    /**
     * Export palette to ASE (Adobe Swatch Exchange)
     */
    exportToASE(palette: ColorPalette): ArrayBuffer {
        // Simplified ASE export (real implementation would be more complete)
        const encoder = new TextEncoder();
        const header = new Uint8Array([0x41, 0x53, 0x45, 0x46, 0x00, 0x01, 0x00, 0x00]); // ASEF header
        const colorData = encoder.encode(JSON.stringify(palette.colors.map(s => ({
            name: s.name,
            rgb: s.color.rgb
        }))));

        const buffer = new ArrayBuffer(header.length + colorData.length);
        const view = new Uint8Array(buffer);
        view.set(header);
        view.set(colorData, header.length);

        return buffer;
    }

    /**
     * Event handling
     */
    addEventListener(listener: ColorEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: ColorEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${this.idCounter++}`;
    }
}

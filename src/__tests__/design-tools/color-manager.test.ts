/**
 * Color Manager Tests
 * Phase 4: Professional Design Tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ColorManager, type RGBColor, type HSLColor } from '../../design-tools/colors';

describe('ColorManager', () => {
    let colorManager: ColorManager;

    beforeEach(() => {
        colorManager = new ColorManager();
    });

    describe('initialization', () => {
        it('should create a color manager instance', () => {
            expect(colorManager).toBeInstanceOf(ColorManager);
        });
    });

    describe('color conversion', () => {
        it('should convert RGB to HSL', () => {
            const rgb: RGBColor = { r: 255, g: 0, b: 0 };
            const hsl = colorManager.rgbToHsl(rgb);

            expect(hsl.h).toBeCloseTo(0, 1);
            expect(hsl.s).toBeCloseTo(100, 1);
            expect(hsl.l).toBeCloseTo(50, 1);
        });

        it('should convert HSL to RGB', () => {
            const hsl: HSLColor = { h: 0, s: 100, l: 50 };
            const rgb = colorManager.hslToRgb(hsl);

            expect(rgb.r).toBe(255);
            expect(rgb.g).toBe(0);
            expect(rgb.b).toBe(0);
        });

        it('should convert RGB to hex', () => {
            const rgb: RGBColor = { r: 255, g: 128, b: 0 };
            const hex = colorManager.rgbToHex(rgb);

            expect(hex).toBe('#ff8000');
        });

        it('should convert hex to RGB', () => {
            const rgb = colorManager.hexToRgb('#ff8000');

            expect(rgb.r).toBe(255);
            expect(rgb.g).toBe(128);
            expect(rgb.b).toBe(0);
        });
    });

    describe('color palettes', () => {
        it('should create a color palette', () => {
            const palette = colorManager.createPalette('My Palette');

            expect(palette).toBeDefined();
            expect(palette.name).toBe('My Palette');
            expect(palette.colors).toEqual([]);
        });

        it('should add colors to palette', () => {
            const palette = colorManager.createPalette('Brand Colors');
            const color = colorManager.createColor({ r: 255, g: 0, b: 0 });
            colorManager.addToPalette(palette.id, color, 'Primary Red');

            const updated = colorManager.getPalette(palette.id);
            expect(updated?.colors.length).toBe(1);
        });
    });

    describe('color harmony', () => {
        it('should generate complementary colors', () => {
            const rgbColor: RGBColor = { r: 255, g: 0, b: 0 };
            const baseColor = colorManager.createColor(rgbColor);
            const colors = colorManager.generateHarmony(baseColor, 'complementary');

            expect(colors.length).toBe(2);
            // First should be base, second should be complement (cyan)
            expect(colors[0].rgb.r).toBe(255);
        });

        it('should generate analogous colors', () => {
            const rgbColor: RGBColor = { r: 255, g: 0, b: 0 };
            const baseColor = colorManager.createColor(rgbColor);
            const colors = colorManager.generateHarmony(baseColor, 'analogous');

            expect(colors.length).toBeGreaterThan(2);
        });

        it('should generate triadic colors', () => {
            const rgbColor: RGBColor = { r: 255, g: 0, b: 0 };
            const baseColor = colorManager.createColor(rgbColor);
            const colors = colorManager.generateHarmony(baseColor, 'triadic');

            expect(colors.length).toBe(3);
        });
    });
});

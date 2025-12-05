/**
 * Tests for Color Palette Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    ColorPaletteManager,
    PRESET_PALETTES,
    type ColorPalette,
    type ExtractedColors,
} from '../../ai/color-palette';

describe('ColorPaletteManager', () => {
    let manager: ColorPaletteManager;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        manager = new ColorPaletteManager();
    });

    describe('createPalette', () => {
        it('should create a new palette', () => {
            const palette = manager.createPalette('Test Palette', [
                '#FF0000',
                '#00FF00',
                '#0000FF',
            ]);

            expect(palette.id).toBeTruthy();
            expect(palette.name).toBe('Test Palette');
            expect(palette.colors).toHaveLength(3);
            expect(palette.colors[0]).toBe('#ff0000');
        });

        it('should normalize colors to lowercase hex', () => {
            const palette = manager.createPalette('Test', ['#AABBCC', 'DDEEFF']);

            expect(palette.colors[0]).toBe('#aabbcc');
            expect(palette.colors[1]).toBe('#ddeeff');
        });

        it('should store color names if provided', () => {
            const palette = manager.createPalette(
                'Named Colors',
                ['#FF0000', '#00FF00'],
                { colorNames: ['Red', 'Green'] }
            );

            expect(palette.colorNames).toEqual(['Red', 'Green']);
        });

        it('should store tags if provided', () => {
            const palette = manager.createPalette(
                'Tagged',
                ['#000000'],
                { tags: ['dark', 'minimal'] }
            );

            expect(palette.tags).toEqual(['dark', 'minimal']);
        });
    });

    describe('createFromExtraction', () => {
        it('should create palette from extracted colors', () => {
            const extracted: ExtractedColors = {
                dominant: ['#FF0000', '#00FF00'],
                accents: ['#0000FF'],
                background: '#FFFFFF',
                temperature: 'warm',
                brightness: 'medium',
            };

            const palette = manager.createFromExtraction('Extracted', extracted);

            // Colors should be preserved (not normalized in createFromExtraction)
            expect(palette.colors).toContain('#FF0000');
            expect(palette.colors).toContain('#00FF00');
            expect(palette.colors).toContain('#0000FF');
            expect(palette.colors).toContain('#FFFFFF');
            expect(palette.tags).toContain('warm');
            expect(palette.tags).toContain('medium');
        });

        it('should limit colors to 8', () => {
            const extracted: ExtractedColors = {
                dominant: ['#111111', '#222222', '#333333', '#444444', '#555555'],
                accents: ['#666666', '#777777', '#888888', '#999999'],
                temperature: 'neutral',
                brightness: 'dark',
            };

            const palette = manager.createFromExtraction('Many Colors', extracted);

            expect(palette.colors.length).toBeLessThanOrEqual(8);
        });
    });

    describe('getPalette', () => {
        it('should retrieve a palette by ID', () => {
            const created = manager.createPalette('Test', ['#000000']);
            const retrieved = manager.getPalette(created.id);

            expect(retrieved).toEqual(created);
        });

        it('should return undefined for non-existent ID', () => {
            const result = manager.getPalette('non-existent-id');

            expect(result).toBeUndefined();
        });
    });

    describe('getAllPalettes', () => {
        it('should return all palettes', () => {
            manager.createPalette('First', ['#111111']);
            manager.createPalette('Second', ['#222222']);
            manager.createPalette('Third', ['#333333']);

            const all = manager.getAllPalettes();

            expect(all).toHaveLength(3);
            // Verify all palettes are returned
            const names = all.map(p => p.name);
            expect(names).toContain('First');
            expect(names).toContain('Second');
            expect(names).toContain('Third');
        });

        it('should return empty array when no palettes exist', () => {
            const all = manager.getAllPalettes();

            expect(all).toEqual([]);
        });
    });

    describe('getPalettesByTag', () => {
        it('should filter palettes by tag', () => {
            manager.createPalette('Warm 1', ['#FF0000'], { tags: ['warm'] });
            manager.createPalette('Cool 1', ['#0000FF'], { tags: ['cool'] });
            manager.createPalette('Warm 2', ['#FF6600'], { tags: ['warm', 'sunset'] });

            const warmPalettes = manager.getPalettesByTag('warm');

            expect(warmPalettes).toHaveLength(2);
            expect(warmPalettes.every(p => p.tags.includes('warm'))).toBe(true);
        });
    });

    describe('updatePalette', () => {
        it('should update palette properties', () => {
            const palette = manager.createPalette('Original', ['#000000']);
            const updated = manager.updatePalette(palette.id, {
                name: 'Updated',
                colors: ['#FFFFFF'],
            });

            expect(updated?.name).toBe('Updated');
            expect(updated?.colors).toEqual(['#ffffff']);
        });

        it('should return null for non-existent palette', () => {
            const result = manager.updatePalette('fake-id', { name: 'New Name' });

            expect(result).toBeNull();
        });
    });

    describe('deletePalette', () => {
        it('should remove a palette', () => {
            const palette = manager.createPalette('To Delete', ['#000000']);

            const deleted = manager.deletePalette(palette.id);
            const retrieved = manager.getPalette(palette.id);

            expect(deleted).toBe(true);
            expect(retrieved).toBeUndefined();
        });

        it('should return false for non-existent palette', () => {
            const result = manager.deletePalette('fake-id');

            expect(result).toBe(false);
        });
    });

    describe('generateVariations', () => {
        it('should generate color variations', () => {
            const variations = manager.generateVariations('#3366CC', 5);

            expect(variations).toHaveLength(5);
            expect(variations[0]).toBe('#3366CC'); // Original color first
        });

        it('should handle edge cases', () => {
            const darkVariations = manager.generateVariations('#000000', 3);
            const lightVariations = manager.generateVariations('#FFFFFF', 3);

            expect(darkVariations).toHaveLength(3);
            expect(lightVariations).toHaveLength(3);
        });
    });

    describe('generateHarmony', () => {
        it('should generate complementary colors', () => {
            const colors = manager.generateHarmony('#FF0000', 'complementary');

            expect(colors).toHaveLength(2);
            expect(colors[0]).toBe('#FF0000');
        });

        it('should generate analogous colors', () => {
            const colors = manager.generateHarmony('#FF0000', 'analogous');

            expect(colors).toHaveLength(3);
        });

        it('should generate triadic colors', () => {
            const colors = manager.generateHarmony('#FF0000', 'triadic');

            expect(colors).toHaveLength(3);
        });

        it('should generate split-complementary colors', () => {
            const colors = manager.generateHarmony('#FF0000', 'split-complementary');

            expect(colors).toHaveLength(3);
        });

        it('should generate tetradic colors', () => {
            const colors = manager.generateHarmony('#FF0000', 'tetradic');

            expect(colors).toHaveLength(4);
        });

        it('should generate monochromatic variations', () => {
            const colors = manager.generateHarmony('#FF0000', 'monochromatic');

            expect(colors.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('formatForPrompt', () => {
        it('should format palette for AI prompts', () => {
            const palette = manager.createPalette('Fashion', ['#FF0000', '#000000'], {
                colorNames: ['Vibrant Red', 'Deep Black'],
            });

            const prompt = manager.formatForPrompt(palette.id);

            expect(prompt).toContain('Color palette:');
            expect(prompt).toContain('Vibrant Red');
            expect(prompt).toContain('#ff0000');
        });

        it('should return empty string for non-existent palette', () => {
            const result = manager.formatForPrompt('fake-id');

            expect(result).toBe('');
        });
    });

    describe('getColorsArray', () => {
        it('should return colors array', () => {
            const palette = manager.createPalette('Test', ['#FF0000', '#00FF00']);
            const colors = manager.getColorsArray(palette.id);

            expect(colors).toEqual(['#ff0000', '#00ff00']);
        });

        it('should return empty array for non-existent palette', () => {
            const colors = manager.getColorsArray('fake-id');

            expect(colors).toEqual([]);
        });
    });

    describe('persistence', () => {
        it('should attempt to save palettes to localStorage', () => {
            // localStorage is mocked in test setup
            const setItemSpy = vi.spyOn(localStorage, 'setItem');

            manager.createPalette('Persistent', ['#123456']);

            // Verify setItem was called with the right key
            expect(setItemSpy).toHaveBeenCalledWith(
                'nanofashion_color_palettes',
                expect.any(String)
            );
        });
    });

    describe('clear', () => {
        it('should remove all palettes', () => {
            manager.createPalette('One', ['#111111']);
            manager.createPalette('Two', ['#222222']);

            manager.clear();

            expect(manager.getAllPalettes()).toHaveLength(0);
        });
    });
});

describe('PRESET_PALETTES', () => {
    it('should have valid preset palettes', () => {
        expect(PRESET_PALETTES.length).toBeGreaterThan(0);

        for (const preset of PRESET_PALETTES) {
            expect(preset.name).toBeTruthy();
            expect(preset.colors.length).toBeGreaterThan(0);
            expect(preset.tags.length).toBeGreaterThan(0);
        }
    });

    it('should have valid hex colors', () => {
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;

        for (const preset of PRESET_PALETTES) {
            for (const color of preset.colors) {
                expect(color).toMatch(hexRegex);
            }
        }
    });
});

/**
 * Tests for Style Consistency Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    StyleConsistencyManager,
    type StyleReference,
    type StyleAnalysis,
    type StyleProfile,
} from '../../ai/style-consistency';
import { ImageStyle } from '../../ai/types';

describe('StyleConsistencyManager', () => {
    let manager: StyleConsistencyManager;

    // Mock base64 image data
    const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    beforeEach(() => {
        localStorage.clear();
        manager = new StyleConsistencyManager();
    });

    describe('addReference', () => {
        it('should add a new style reference', () => {
            const ref = manager.addReference('Test Style', mockImageBase64);

            expect(ref.id).toBeTruthy();
            expect(ref.name).toBe('Test Style');
            expect(ref.imageBase64).toBe(mockImageBase64);
            expect(ref.createdAt).toBeTruthy();
            expect(ref.usageCount).toBe(0);
        });

        it('should generate unique IDs', () => {
            const ref1 = manager.addReference('Style 1', mockImageBase64);
            const ref2 = manager.addReference('Style 2', mockImageBase64);

            expect(ref1.id).not.toBe(ref2.id);
        });

        it('should accept style analysis', () => {
            const analysis: StyleAnalysis = {
                dominantColors: ['#FF0000', '#000000'],
                styleCategory: ImageStyle.PHOTOREALISTIC,
                visualElements: ['flowing fabric', 'structured shoulders'],
                textures: ['silk', 'velvet'],
                mood: ['elegant', 'sophisticated'],
                suggestedPrompts: ['luxurious evening gown'],
            };

            const ref = manager.addReference('Analyzed Style', mockImageBase64, analysis);

            expect(ref.analysis).toEqual(analysis);
        });

        it('should create a thumbnail', () => {
            const ref = manager.addReference('With Thumbnail', mockImageBase64);

            expect(ref.thumbnail).toBeTruthy();
        });
    });

    describe('getReference', () => {
        it('should retrieve a reference by ID', () => {
            const created = manager.addReference('Test', mockImageBase64);
            const retrieved = manager.getReference(created.id);

            expect(retrieved).toEqual(created);
        });

        it('should return undefined for non-existent ID', () => {
            const result = manager.getReference('non-existent');

            expect(result).toBeUndefined();
        });
    });

    describe('getAllReferences', () => {
        it('should return all references', () => {
            manager.addReference('First', mockImageBase64);
            manager.addReference('Second', mockImageBase64);
            manager.addReference('Third', mockImageBase64);

            const all = manager.getAllReferences();

            expect(all).toHaveLength(3);
            // Verify all references are returned
            const names = all.map(r => r.name);
            expect(names).toContain('First');
            expect(names).toContain('Second');
            expect(names).toContain('Third');
        });

        it('should return empty array when no references exist', () => {
            const all = manager.getAllReferences();

            expect(all).toEqual([]);
        });
    });

    describe('removeReference', () => {
        it('should remove a reference', () => {
            const ref = manager.addReference('To Remove', mockImageBase64);

            const deleted = manager.removeReference(ref.id);
            const retrieved = manager.getReference(ref.id);

            expect(deleted).toBe(true);
            expect(retrieved).toBeUndefined();
        });

        it('should return false for non-existent reference', () => {
            const result = manager.removeReference('fake-id');

            expect(result).toBe(false);
        });
    });

    describe('incrementUsage', () => {
        it('should increment usage count', () => {
            const ref = manager.addReference('Test', mockImageBase64);

            manager.incrementUsage(ref.id);
            manager.incrementUsage(ref.id);

            const updated = manager.getReference(ref.id);
            expect(updated?.usageCount).toBe(2);
        });

        it('should handle non-existent reference gracefully', () => {
            // Should not throw
            manager.incrementUsage('fake-id');
        });
    });

    describe('createProfile', () => {
        it('should create a style profile from references', () => {
            const ref1 = manager.addReference('Ref 1', mockImageBase64, {
                dominantColors: ['#FF0000', '#00FF00'],
                styleCategory: ImageStyle.PHOTOREALISTIC,
                visualElements: ['element1'],
                textures: ['texture1'],
                mood: ['mood1'],
                suggestedPrompts: [],
            });
            const ref2 = manager.addReference('Ref 2', mockImageBase64, {
                dominantColors: ['#0000FF'],
                styleCategory: ImageStyle.PHOTOREALISTIC,
                visualElements: ['element2'],
                textures: ['texture2'],
                mood: ['mood2'],
                suggestedPrompts: [],
            });

            const profile = manager.createProfile(
                'Test Profile',
                'A test style profile',
                [ref1.id, ref2.id]
            );

            expect(profile).not.toBeNull();
            expect(profile?.name).toBe('Test Profile');
            expect(profile?.references).toHaveLength(2);
            expect(profile?.colorPalette).toContain('#FF0000');
            expect(profile?.colorPalette).toContain('#0000FF');
        });

        it('should return null for empty reference list', () => {
            const profile = manager.createProfile('Empty', 'No refs', []);

            expect(profile).toBeNull();
        });

        it('should return null for non-existent references', () => {
            const profile = manager.createProfile('Bad Refs', 'Missing', ['fake-id']);

            expect(profile).toBeNull();
        });

        it('should limit color palette to 6 colors', () => {
            const refs: StyleReference[] = [];
            for (let i = 0; i < 5; i++) {
                refs.push(manager.addReference(`Ref ${i}`, mockImageBase64, {
                    dominantColors: [`#${i}${i}${i}${i}${i}${i}`, `#${i + 1}${i + 1}${i + 1}${i + 1}${i + 1}${i + 1}`],
                    styleCategory: ImageStyle.PHOTOREALISTIC,
                    visualElements: [],
                    textures: [],
                    mood: [],
                    suggestedPrompts: [],
                }));
            }

            const profile = manager.createProfile('Many Colors', 'Test', refs.map(r => r.id));

            expect(profile?.colorPalette.length).toBeLessThanOrEqual(6);
        });
    });

    describe('getProfile', () => {
        it('should retrieve a profile by name', () => {
            const ref = manager.addReference('Ref', mockImageBase64);
            manager.createProfile('My Profile', 'Description', [ref.id]);

            const profile = manager.getProfile('My Profile');

            expect(profile?.name).toBe('My Profile');
        });

        it('should return undefined for non-existent profile', () => {
            const result = manager.getProfile('Non-existent');

            expect(result).toBeUndefined();
        });
    });

    describe('getAllProfiles', () => {
        it('should return all profiles', () => {
            const ref = manager.addReference('Ref', mockImageBase64);
            manager.createProfile('Profile 1', 'Desc 1', [ref.id]);
            manager.createProfile('Profile 2', 'Desc 2', [ref.id]);

            const profiles = manager.getAllProfiles();

            expect(profiles).toHaveLength(2);
        });
    });

    describe('removeProfile', () => {
        it('should remove a profile', () => {
            const ref = manager.addReference('Ref', mockImageBase64);
            manager.createProfile('To Delete', 'Desc', [ref.id]);

            const deleted = manager.removeProfile('To Delete');
            const retrieved = manager.getProfile('To Delete');

            expect(deleted).toBe(true);
            expect(retrieved).toBeUndefined();
        });

        it('should return false for non-existent profile', () => {
            const result = manager.removeProfile('Fake');

            expect(result).toBe(false);
        });
    });

    describe('buildOptionsFromReference', () => {
        it('should build generation options from reference', () => {
            const ref = manager.addReference('Style', mockImageBase64, {
                dominantColors: ['#FF0000', '#000000'],
                styleCategory: ImageStyle.VINTAGE,
                visualElements: [],
                textures: [],
                mood: [],
                suggestedPrompts: [],
            });

            const options = manager.buildOptionsFromReference(ref.id);

            expect(options.styleReference).toBe(mockImageBase64);
            expect(options.colorPalette).toEqual(['#FF0000', '#000000']);
            expect(options.style).toBe(ImageStyle.VINTAGE);
        });

        it('should merge with base options', () => {
            const ref = manager.addReference('Style', mockImageBase64);
            const baseOptions = { quality: 'high' as const, count: 2 };

            const options = manager.buildOptionsFromReference(ref.id, baseOptions);

            expect(options.quality).toBe('high');
            expect(options.count).toBe(2);
        });

        it('should increment usage count', () => {
            const ref = manager.addReference('Style', mockImageBase64);

            manager.buildOptionsFromReference(ref.id);
            manager.buildOptionsFromReference(ref.id);

            const updated = manager.getReference(ref.id);
            expect(updated?.usageCount).toBe(2);
        });

        it('should return empty options for non-existent reference', () => {
            const options = manager.buildOptionsFromReference('fake-id');

            expect(options).toEqual({});
        });
    });

    describe('buildOptionsFromProfile', () => {
        it('should build options from profile', () => {
            const ref = manager.addReference('Ref', mockImageBase64, {
                dominantColors: ['#FF0000'],
                styleCategory: ImageStyle.ARTISTIC,
                visualElements: [],
                textures: [],
                mood: [],
                suggestedPrompts: [],
            });
            manager.createProfile('Brand Style', 'Corporate look', [ref.id]);

            const options = manager.buildOptionsFromProfile('Brand Style');

            expect(options.styleReference).toBeTruthy();
            expect(options.colorPalette).toContain('#FF0000');
        });

        it('should return empty options for non-existent profile', () => {
            const options = manager.buildOptionsFromProfile('Fake Profile');

            expect(options).toEqual({});
        });
    });

    describe('generateStylePrompt', () => {
        it('should generate style prompt from reference', () => {
            const ref = manager.addReference('Style', mockImageBase64, {
                dominantColors: ['#FF0000', '#000000'],
                styleCategory: ImageStyle.VINTAGE,
                visualElements: [],
                textures: ['silk', 'velvet'],
                mood: ['elegant', 'sophisticated'],
                suggestedPrompts: [],
            });

            const prompt = manager.generateStylePrompt(ref.id);

            expect(prompt).toContain('Style: vintage');
            expect(prompt).toContain('Colors:');
            expect(prompt).toContain('Textures:');
            expect(prompt).toContain('Mood:');
        });

        it('should return empty string for non-existent reference', () => {
            const prompt = manager.generateStylePrompt('fake-id');

            expect(prompt).toBe('');
        });

        it('should return empty string for reference without analysis', () => {
            const ref = manager.addReference('No Analysis', mockImageBase64);
            const prompt = manager.generateStylePrompt(ref.id);

            expect(prompt).toBe('');
        });
    });

    describe('persistence', () => {
        it('should attempt to save references to localStorage', () => {
            // localStorage is mocked in test setup
            const setItemSpy = vi.spyOn(localStorage, 'setItem');

            manager.addReference('Persistent', mockImageBase64);

            // Verify setItem was called with the right key
            expect(setItemSpy).toHaveBeenCalledWith(
                'nanofashion_style_refs',
                expect.any(String)
            );
        });

        it('should attempt to save profiles to localStorage', () => {
            const setItemSpy = vi.spyOn(localStorage, 'setItem');

            const ref = manager.addReference('Ref', mockImageBase64);
            manager.createProfile('Persistent Profile', 'Desc', [ref.id]);

            // Verify setItem was called with the profiles key
            expect(setItemSpy).toHaveBeenCalledWith(
                'nanofashion_style_profiles',
                expect.any(String)
            );
        });
    });

    describe('clear', () => {
        it('should remove all references and profiles', () => {
            const ref = manager.addReference('Ref', mockImageBase64);
            manager.createProfile('Profile', 'Desc', [ref.id]);

            manager.clear();

            expect(manager.getAllReferences()).toHaveLength(0);
            expect(manager.getAllProfiles()).toHaveLength(0);
        });
    });
});

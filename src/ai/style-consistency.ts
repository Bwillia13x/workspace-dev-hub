/**
 * Style Consistency Manager
 * 
 * Manages style references and consistency across design generations.
 * Allows users to maintain brand consistency by extracting and applying
 * visual styles from reference images.
 */

import { ImageStyle, GenerationOptions } from './types';

/**
 * Style reference image data
 */
export interface StyleReference {
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** Reference image as base64 */
    imageBase64: string;
    /** Thumbnail for display (smaller base64) */
    thumbnail?: string;
    /** Extracted style analysis */
    analysis?: StyleAnalysis;
    /** Creation timestamp */
    createdAt: number;
    /** Usage count */
    usageCount: number;
}

/**
 * Analysis of a style reference
 */
export interface StyleAnalysis {
    /** Dominant colors extracted */
    dominantColors: string[];
    /** Detected style category */
    styleCategory: ImageStyle;
    /** Key visual elements */
    visualElements: string[];
    /** Texture descriptors */
    textures: string[];
    /** Mood/atmosphere */
    mood: string[];
    /** Suggested prompts based on style */
    suggestedPrompts: string[];
}

/**
 * Style profile combining multiple references
 */
export interface StyleProfile {
    /** Profile name */
    name: string;
    /** Description */
    description: string;
    /** Associated references */
    references: StyleReference[];
    /** Combined color palette */
    colorPalette: string[];
    /** Combined style elements */
    styleElements: string[];
    /** Generation preset */
    preset: Partial<GenerationOptions>;
}

/**
 * Manages style consistency across generations
 */
export class StyleConsistencyManager {
    private references: Map<string, StyleReference> = new Map();
    private profiles: Map<string, StyleProfile> = new Map();
    private readonly storageKey = 'nanofashion_style_refs';
    private readonly profilesKey = 'nanofashion_style_profiles';

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Add a new style reference
     */
    addReference(
        name: string,
        imageBase64: string,
        analysis?: StyleAnalysis
    ): StyleReference {
        const id = this.generateId();
        const reference: StyleReference = {
            id,
            name,
            imageBase64,
            thumbnail: this.createThumbnail(imageBase64),
            analysis,
            createdAt: Date.now(),
            usageCount: 0,
        };

        this.references.set(id, reference);
        this.saveToStorage();

        return reference;
    }

    /**
     * Get a style reference by ID
     */
    getReference(id: string): StyleReference | undefined {
        return this.references.get(id);
    }

    /**
     * Get all style references
     */
    getAllReferences(): StyleReference[] {
        return Array.from(this.references.values())
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Remove a style reference
     */
    removeReference(id: string): boolean {
        const deleted = this.references.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }

    /**
     * Update reference usage count
     */
    incrementUsage(id: string): void {
        const ref = this.references.get(id);
        if (ref) {
            ref.usageCount++;
            this.saveToStorage();
        }
    }

    /**
     * Create a style profile from multiple references
     */
    createProfile(
        name: string,
        description: string,
        referenceIds: string[]
    ): StyleProfile | null {
        const references = referenceIds
            .map(id => this.references.get(id))
            .filter((ref): ref is StyleReference => ref !== undefined);

        if (references.length === 0) {
            return null;
        }

        // Combine color palettes
        const allColors = references
            .flatMap(ref => ref.analysis?.dominantColors || []);
        const colorPalette = [...new Set(allColors)].slice(0, 6);

        // Combine style elements
        const allElements = references
            .flatMap(ref => [
                ...(ref.analysis?.visualElements || []),
                ...(ref.analysis?.textures || []),
            ]);
        const styleElements = [...new Set(allElements)].slice(0, 10);

        const profile: StyleProfile = {
            name,
            description,
            references,
            colorPalette,
            styleElements,
            preset: {
                colorPalette,
                style: this.inferDominantStyle(references),
            },
        };

        this.profiles.set(name, profile);
        this.saveProfilesToStorage();

        return profile;
    }

    /**
     * Get a style profile
     */
    getProfile(name: string): StyleProfile | undefined {
        return this.profiles.get(name);
    }

    /**
     * Get all profiles
     */
    getAllProfiles(): StyleProfile[] {
        return Array.from(this.profiles.values());
    }

    /**
     * Delete a profile
     */
    removeProfile(name: string): boolean {
        const deleted = this.profiles.delete(name);
        if (deleted) {
            this.saveProfilesToStorage();
        }
        return deleted;
    }

    /**
     * Build generation options from a style reference
     */
    buildOptionsFromReference(
        referenceId: string,
        baseOptions?: GenerationOptions
    ): GenerationOptions {
        const ref = this.references.get(referenceId);

        if (!ref) {
            return baseOptions || {};
        }

        this.incrementUsage(referenceId);

        return {
            ...baseOptions,
            styleReference: ref.imageBase64,
            colorPalette: ref.analysis?.dominantColors || baseOptions?.colorPalette,
            style: ref.analysis?.styleCategory || baseOptions?.style,
        };
    }

    /**
     * Build generation options from a profile
     */
    buildOptionsFromProfile(
        profileName: string,
        baseOptions?: GenerationOptions
    ): GenerationOptions {
        const profile = this.profiles.get(profileName);

        if (!profile) {
            return baseOptions || {};
        }

        // Increment usage for all references in the profile
        profile.references.forEach(ref => {
            this.incrementUsage(ref.id);
        });

        return {
            ...baseOptions,
            ...profile.preset,
            // Use the first reference as the style reference
            styleReference: profile.references[0]?.imageBase64,
        };
    }

    /**
     * Generate style prompt enhancement
     */
    generateStylePrompt(referenceId: string): string {
        const ref = this.references.get(referenceId);

        if (!ref?.analysis) {
            return '';
        }

        const parts: string[] = [];

        if (ref.analysis.styleCategory) {
            parts.push(`Style: ${ref.analysis.styleCategory}`);
        }

        if (ref.analysis.dominantColors.length > 0) {
            parts.push(`Colors: ${ref.analysis.dominantColors.slice(0, 4).join(', ')}`);
        }

        if (ref.analysis.textures.length > 0) {
            parts.push(`Textures: ${ref.analysis.textures.slice(0, 3).join(', ')}`);
        }

        if (ref.analysis.mood.length > 0) {
            parts.push(`Mood: ${ref.analysis.mood.slice(0, 2).join(', ')}`);
        }

        return parts.join('. ');
    }

    /**
     * Infer dominant style from multiple references
     */
    private inferDominantStyle(references: StyleReference[]): ImageStyle {
        const styleCounts = new Map<ImageStyle, number>();

        for (const ref of references) {
            if (ref.analysis?.styleCategory) {
                const count = styleCounts.get(ref.analysis.styleCategory) || 0;
                styleCounts.set(ref.analysis.styleCategory, count + 1);
            }
        }

        let maxCount = 0;
        let dominantStyle = ImageStyle.PHOTOREALISTIC;

        for (const [style, count] of styleCounts) {
            if (count > maxCount) {
                maxCount = count;
                dominantStyle = style;
            }
        }

        return dominantStyle;
    }

    /**
     * Create a thumbnail from base64 image
     * Note: This is a placeholder - actual implementation would resize the image
     */
    private createThumbnail(imageBase64: string): string {
        // In a real implementation, this would resize the image
        // For now, we'll just return the first part of the image data
        // to indicate this is meant to be a smaller version
        return imageBase64.slice(0, 1000) + '...';
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return `style_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Save references to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = Array.from(this.references.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save style references:', error);
        }
    }

    /**
     * Save profiles to localStorage
     */
    private saveProfilesToStorage(): void {
        try {
            const data = Array.from(this.profiles.entries());
            localStorage.setItem(this.profilesKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save style profiles:', error);
        }
    }

    /**
     * Load references from localStorage
     */
    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const entries: Array<[string, StyleReference]> = JSON.parse(data);
                this.references = new Map(entries);
            }

            const profilesData = localStorage.getItem(this.profilesKey);
            if (profilesData) {
                const entries: Array<[string, StyleProfile]> = JSON.parse(profilesData);
                this.profiles = new Map(entries);
            }
        } catch (error) {
            console.warn('Failed to load style references:', error);
        }
    }

    /**
     * Clear all data
     */
    clear(): void {
        this.references.clear();
        this.profiles.clear();
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.profilesKey);
    }
}

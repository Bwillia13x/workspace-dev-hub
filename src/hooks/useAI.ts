/**
 * React Hooks for AI Module
 * 
 * Provides easy integration of AI functionality into React components.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    ModelRouter,
    getDefaultRouter,
    AIProvider,
    TaskType,
    GenerationResult,
    CADResult,
    TrendResult,
    GenerationOptions,
    EditOptions,
    CADOptions,
    ProviderHealth,
} from '../ai';
import { StyleConsistencyManager, StyleReference, StyleProfile } from '../ai/style-consistency';
import { ColorPaletteManager, ColorPalette, ExtractedColors } from '../ai/color-palette';

/**
 * AI operation state
 */
export interface AIOperationState<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    duration?: number;
}

/**
 * useAI Hook
 * 
 * Main hook for AI generation operations with automatic provider selection.
 */
export function useAI(apiKey?: string) {
    const routerRef = useRef<ModelRouter | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [health, setHealth] = useState<Map<AIProvider, ProviderHealth>>(new Map());

    // Generation states
    const [conceptState, setConceptState] = useState<AIOperationState<GenerationResult>>({
        data: null,
        isLoading: false,
        error: null,
    });

    const [editState, setEditState] = useState<AIOperationState<GenerationResult>>({
        data: null,
        isLoading: false,
        error: null,
    });

    const [cadState, setCadState] = useState<AIOperationState<CADResult>>({
        data: null,
        isLoading: false,
        error: null,
    });

    const [trendState, setTrendState] = useState<AIOperationState<TrendResult>>({
        data: null,
        isLoading: false,
        error: null,
    });

    // Initialize router
    useEffect(() => {
        const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
        if (key) {
            try {
                routerRef.current = getDefaultRouter(key);
                setIsInitialized(true);

                // Initial health check
                routerRef.current.checkAllHealth().then(setHealth);
            } catch (error) {
                console.error('Failed to initialize AI router:', error);
            }
        }
    }, [apiKey]);

    /**
     * Generate a fashion concept from a prompt
     */
    const generateConcept = useCallback(async (
        prompt: string,
        options?: GenerationOptions
    ): Promise<GenerationResult | null> => {
        if (!routerRef.current) {
            setConceptState(prev => ({
                ...prev,
                error: new Error('AI not initialized'),
            }));
            return null;
        }

        setConceptState({ data: null, isLoading: true, error: null });

        try {
            const result = await routerRef.current.generateConcept(prompt, options);
            setConceptState({ data: result, isLoading: false, error: null, duration: result.duration });
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setConceptState({ data: null, isLoading: false, error: err });
            return null;
        }
    }, []);

    /**
     * Edit an existing concept
     */
    const editConcept = useCallback(async (
        imageBase64: string,
        instruction: string,
        options?: EditOptions
    ): Promise<GenerationResult | null> => {
        if (!routerRef.current) {
            setEditState(prev => ({
                ...prev,
                error: new Error('AI not initialized'),
            }));
            return null;
        }

        setEditState({ data: null, isLoading: true, error: null });

        try {
            const result = await routerRef.current.editConcept(imageBase64, instruction, options);
            setEditState({ data: result, isLoading: false, error: null, duration: result.duration });
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setEditState({ data: null, isLoading: false, error: err });
            return null;
        }
    }, []);

    /**
     * Generate CAD/engineering pack
     */
    const generateCAD = useCallback(async (
        imageBase64: string,
        options?: CADOptions
    ): Promise<CADResult | null> => {
        if (!routerRef.current) {
            setCadState(prev => ({
                ...prev,
                error: new Error('AI not initialized'),
            }));
            return null;
        }

        setCadState({ data: null, isLoading: true, error: null });

        try {
            const result = await routerRef.current.generateCAD(imageBase64, options);
            setCadState({ data: result, isLoading: false, error: null, duration: result.duration });
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setCadState({ data: null, isLoading: false, error: err });
            return null;
        }
    }, []);

    /**
     * Get fashion trends
     */
    const getFashionTrends = useCallback(async (
        topic: string
    ): Promise<TrendResult | null> => {
        if (!routerRef.current) {
            setTrendState(prev => ({
                ...prev,
                error: new Error('AI not initialized'),
            }));
            return null;
        }

        setTrendState({ data: null, isLoading: true, error: null });

        try {
            const result = await routerRef.current.getFashionTrends(topic);
            setTrendState({ data: result, isLoading: false, error: null });
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setTrendState({ data: null, isLoading: false, error: err });
            return null;
        }
    }, []);

    /**
     * Check provider health
     */
    const checkHealth = useCallback(async () => {
        if (!routerRef.current) return;
        const health = await routerRef.current.checkAllHealth();
        setHealth(health);
        return health;
    }, []);

    /**
     * Get available providers
     */
    const getProviders = useCallback(() => {
        return routerRef.current?.getProviders() || [];
    }, []);

    return {
        // State
        isInitialized,
        health,
        concept: conceptState,
        edit: editState,
        cad: cadState,
        trends: trendState,

        // Actions
        generateConcept,
        editConcept,
        generateCAD,
        getFashionTrends,
        checkHealth,
        getProviders,

        // Convenience
        isLoading: conceptState.isLoading || editState.isLoading || cadState.isLoading || trendState.isLoading,
    };
}

/**
 * useStyleConsistency Hook
 * 
 * Hook for managing style references and profiles.
 */
export function useStyleConsistency() {
    const managerRef = useRef<StyleConsistencyManager | null>(null);
    const [references, setReferences] = useState<StyleReference[]>([]);
    const [profiles, setProfiles] = useState<StyleProfile[]>([]);
    const [selectedReference, setSelectedReference] = useState<StyleReference | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<StyleProfile | null>(null);

    // Initialize manager
    useEffect(() => {
        managerRef.current = new StyleConsistencyManager();
        refreshData();
    }, []);

    const refreshData = useCallback(() => {
        if (!managerRef.current) return;
        setReferences(managerRef.current.getAllReferences());
        setProfiles(managerRef.current.getAllProfiles());
    }, []);

    /**
     * Add a new style reference
     */
    const addReference = useCallback((
        name: string,
        imageBase64: string
    ): StyleReference | null => {
        if (!managerRef.current) return null;
        const ref = managerRef.current.addReference(name, imageBase64);
        refreshData();
        return ref;
    }, [refreshData]);

    /**
     * Remove a style reference
     */
    const removeReference = useCallback((id: string): boolean => {
        if (!managerRef.current) return false;
        const success = managerRef.current.removeReference(id);
        if (success) {
            refreshData();
            if (selectedReference?.id === id) {
                setSelectedReference(null);
            }
        }
        return success;
    }, [refreshData, selectedReference]);

    /**
     * Create a style profile
     */
    const createProfile = useCallback((
        name: string,
        description: string,
        referenceIds: string[]
    ): StyleProfile | null => {
        if (!managerRef.current) return null;
        const profile = managerRef.current.createProfile(name, description, referenceIds);
        if (profile) {
            refreshData();
        }
        return profile;
    }, [refreshData]);

    /**
     * Remove a profile
     */
    const removeProfile = useCallback((name: string): boolean => {
        if (!managerRef.current) return false;
        const success = managerRef.current.removeProfile(name);
        if (success) {
            refreshData();
            if (selectedProfile?.name === name) {
                setSelectedProfile(null);
            }
        }
        return success;
    }, [refreshData, selectedProfile]);

    /**
     * Get generation options from selected reference or profile
     */
    const getGenerationOptions = useCallback((baseOptions?: GenerationOptions): GenerationOptions => {
        if (!managerRef.current) return baseOptions || {};

        if (selectedProfile) {
            return managerRef.current.buildOptionsFromProfile(selectedProfile.name, baseOptions);
        }

        if (selectedReference) {
            return managerRef.current.buildOptionsFromReference(selectedReference.id, baseOptions);
        }

        return baseOptions || {};
    }, [selectedReference, selectedProfile]);

    /**
     * Generate style prompt enhancement
     */
    const getStylePrompt = useCallback((): string => {
        if (!managerRef.current || !selectedReference) return '';
        return managerRef.current.generateStylePrompt(selectedReference.id);
    }, [selectedReference]);

    return {
        // Data
        references,
        profiles,
        selectedReference,
        selectedProfile,

        // Actions
        addReference,
        removeReference,
        createProfile,
        removeProfile,
        setSelectedReference,
        setSelectedProfile,
        getGenerationOptions,
        getStylePrompt,
        refreshData,
    };
}

/**
 * useColorPalette Hook
 * 
 * Hook for managing color palettes.
 */
export function useColorPalette() {
    const managerRef = useRef<ColorPaletteManager | null>(null);
    const [palettes, setPalettes] = useState<ColorPalette[]>([]);
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);

    // Initialize manager
    useEffect(() => {
        managerRef.current = new ColorPaletteManager();
        refreshData();
    }, []);

    const refreshData = useCallback(() => {
        if (!managerRef.current) return;
        setPalettes(managerRef.current.getAllPalettes());
    }, []);

    /**
     * Create a new palette
     */
    const createPalette = useCallback((
        name: string,
        colors: string[],
        options?: { colorNames?: string[]; tags?: string[] }
    ): ColorPalette | null => {
        if (!managerRef.current) return null;
        const palette = managerRef.current.createPalette(name, colors, options);
        refreshData();
        return palette;
    }, [refreshData]);

    /**
     * Create palette from extracted colors
     */
    const createFromExtraction = useCallback((
        name: string,
        extracted: ExtractedColors,
        sourceImage?: string
    ): ColorPalette | null => {
        if (!managerRef.current) return null;
        const palette = managerRef.current.createFromExtraction(name, extracted, sourceImage);
        refreshData();
        return palette;
    }, [refreshData]);

    /**
     * Delete a palette
     */
    const deletePalette = useCallback((id: string): boolean => {
        if (!managerRef.current) return false;
        const success = managerRef.current.deletePalette(id);
        if (success) {
            refreshData();
            if (selectedPalette?.id === id) {
                setSelectedPalette(null);
            }
        }
        return success;
    }, [refreshData, selectedPalette]);

    /**
     * Generate color harmony
     */
    const generateHarmony = useCallback((
        baseColor: string,
        harmony: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic'
    ): string[] => {
        if (!managerRef.current) return [];
        return managerRef.current.generateHarmony(baseColor, harmony);
    }, []);

    /**
     * Generate color variations
     */
    const generateVariations = useCallback((baseColor: string, count?: number): string[] => {
        if (!managerRef.current) return [];
        return managerRef.current.generateVariations(baseColor, count);
    }, []);

    /**
     * Get colors for generation options
     */
    const getColorsForGeneration = useCallback((): string[] | undefined => {
        if (!selectedPalette) return undefined;
        return selectedPalette.colors;
    }, [selectedPalette]);

    /**
     * Format palette for prompt
     */
    const formatForPrompt = useCallback((): string => {
        if (!managerRef.current || !selectedPalette) return '';
        return managerRef.current.formatForPrompt(selectedPalette.id);
    }, [selectedPalette]);

    return {
        // Data
        palettes,
        selectedPalette,

        // Actions
        createPalette,
        createFromExtraction,
        deletePalette,
        setSelectedPalette,
        generateHarmony,
        generateVariations,
        getColorsForGeneration,
        formatForPrompt,
        refreshData,
    };
}

/**
 * useGenerationOptions Hook
 * 
 * Combines style and color options into unified generation options.
 */
export function useGenerationOptions() {
    const style = useStyleConsistency();
    const color = useColorPalette();

    const [quality, setQuality] = useState<'draft' | 'standard' | 'high'>('standard');
    const [negativePrompt, setNegativePrompt] = useState('');

    /**
     * Build combined generation options
     */
    const buildOptions = useCallback((baseOptions?: GenerationOptions): GenerationOptions => {
        let options = style.getGenerationOptions(baseOptions);

        // Add color palette
        const colors = color.getColorsForGeneration();
        if (colors) {
            options = { ...options, colorPalette: colors };
        }

        // Add quality
        options = { ...options, quality };

        // Add negative prompt
        if (negativePrompt.trim()) {
            options = { ...options, negativePrompt };
        }

        return options;
    }, [style, color, quality, negativePrompt]);

    /**
     * Build enhanced prompt with style and color context
     */
    const enhancePrompt = useCallback((basePrompt: string): string => {
        const parts = [basePrompt];

        const stylePrompt = style.getStylePrompt();
        if (stylePrompt) {
            parts.push(stylePrompt);
        }

        const colorPrompt = color.formatForPrompt();
        if (colorPrompt) {
            parts.push(colorPrompt);
        }

        return parts.join('\n\n');
    }, [style, color]);

    return {
        // Style
        ...style,

        // Color
        palettes: color.palettes,
        selectedPalette: color.selectedPalette,
        setSelectedPalette: color.setSelectedPalette,
        createPalette: color.createPalette,
        deletePalette: color.deletePalette,
        generateHarmony: color.generateHarmony,

        // Options
        quality,
        setQuality,
        negativePrompt,
        setNegativePrompt,

        // Combined
        buildOptions,
        enhancePrompt,
    };
}

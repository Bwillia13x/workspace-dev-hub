/**
 * AI Provider Types and Interfaces
 * 
 * Defines the abstract interfaces for multi-model AI architecture,
 * enabling support for Gemini, Stable Diffusion, Flux.1, and future providers.
 */

/**
 * Supported AI model providers
 */
export enum AIProvider {
    GEMINI = 'gemini',
    STABLE_DIFFUSION = 'stable-diffusion',
    FLUX = 'flux',
    MIDJOURNEY = 'midjourney',
}

/**
 * Model tiers for routing decisions
 */
export enum ModelTier {
    /** Free/basic tier - cost-effective models */
    BASIC = 'basic',
    /** Standard tier - balanced quality/cost */
    STANDARD = 'standard',
    /** Premium tier - highest quality */
    PREMIUM = 'premium',
}

/**
 * Generation task types for model routing
 */
export enum TaskType {
    /** Initial concept generation from text */
    CONCEPT_GENERATION = 'concept_generation',
    /** Editing existing images */
    IMAGE_EDITING = 'image_editing',
    /** Technical CAD/sketch generation */
    CAD_GENERATION = 'cad_generation',
    /** Style transfer operations */
    STYLE_TRANSFER = 'style_transfer',
    /** Upscaling/enhancement */
    UPSCALE = 'upscale',
}

/**
 * Image style presets
 */
export enum ImageStyle {
    PHOTOREALISTIC = 'photorealistic',
    SKETCH = 'sketch',
    TECHNICAL = 'technical',
    ARTISTIC = 'artistic',
    VINTAGE = 'vintage',
    MINIMALIST = 'minimalist',
}

/**
 * Options for concept generation
 */
export interface GenerationOptions {
    /** Desired image style */
    style?: ImageStyle;
    /** Style reference image for consistency */
    styleReference?: string;
    /** Color palette to use (hex codes) */
    colorPalette?: string[];
    /** Negative prompt - things to avoid */
    negativePrompt?: string;
    /** Number of images to generate */
    count?: number;
    /** Image dimensions */
    width?: number;
    height?: number;
    /** Generation quality/steps */
    quality?: 'draft' | 'standard' | 'high';
    /** Seed for reproducibility */
    seed?: number;
    /** Guidance scale (how closely to follow prompt) */
    guidanceScale?: number;
}

/**
 * Options for image editing
 */
export interface EditOptions {
    /** Mask for inpainting (base64) */
    mask?: string;
    /** Strength of the edit (0-1) */
    strength?: number;
    /** Preserve specific elements */
    preserve?: ('colors' | 'composition' | 'style')[];
}

/**
 * Options for CAD generation
 */
export interface CADOptions {
    /** Include front view */
    frontView?: boolean;
    /** Include back view */
    backView?: boolean;
    /** Include side view */
    sideView?: boolean;
    /** Annotation detail level */
    annotationLevel?: 'minimal' | 'standard' | 'detailed';
    /** Include measurements */
    includeMeasurements?: boolean;
    /** Output format preference */
    format?: 'raster' | 'vector';
}

/**
 * Result from concept generation
 */
export interface GenerationResult {
    /** Generated image(s) as base64 */
    images: string[];
    /** Time taken in milliseconds */
    duration: number;
    /** Provider used */
    provider: AIProvider;
    /** Model version used */
    model: string;
    /** Seed used (if available) */
    seed?: number;
    /** Generation metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Result from CAD generation
 */
export interface CADResult {
    /** CAD image as base64 */
    cadImage: string | null;
    /** Bill of Materials markdown */
    materials: string;
    /** Additional views if generated */
    additionalViews?: {
        front?: string;
        back?: string;
        side?: string;
    };
    /** Extracted measurements */
    measurements?: Record<string, string>;
    /** Provider used */
    provider: AIProvider;
    /** Duration in milliseconds */
    duration: number;
}

/**
 * Result from trend analysis
 */
export interface TrendResult {
    /** Trend summary text */
    text: string;
    /** Source URLs */
    sources: Array<{
        title: string;
        uri: string;
    }>;
    /** Key colors identified */
    colors?: string[];
    /** Key materials identified */
    materials?: string[];
    /** Related search terms */
    relatedTerms?: string[];
}

/**
 * Provider health status
 */
export interface ProviderHealth {
    /** Provider identifier */
    provider: AIProvider;
    /** Whether the provider is available */
    available: boolean;
    /** Current latency in ms */
    latency?: number;
    /** Rate limit remaining */
    rateLimitRemaining?: number;
    /** Last error if any */
    lastError?: string;
    /** Last checked timestamp */
    lastChecked: number;
}

/**
 * Abstract interface for AI providers
 * All providers must implement these methods
 */
export interface IAIProvider {
    /** Provider identifier */
    readonly provider: AIProvider;

    /** Provider display name */
    readonly name: string;

    /** Check if provider is available */
    checkHealth(): Promise<ProviderHealth>;

    /** Generate concept from text prompt */
    generateConcept(
        prompt: string,
        options?: GenerationOptions
    ): Promise<GenerationResult>;

    /** Edit existing image with instruction */
    editConcept(
        imageBase64: string,
        instruction: string,
        options?: EditOptions
    ): Promise<GenerationResult>;

    /** Generate CAD/technical drawing */
    generateCAD(
        imageBase64: string,
        options?: CADOptions
    ): Promise<CADResult>;

    /** Check if provider supports a specific task */
    supportsTask(task: TaskType): boolean;

    /** Get estimated cost per generation */
    getEstimatedCost(task: TaskType, options?: GenerationOptions): number;
}

/**
 * Model router configuration
 */
export interface RouterConfig {
    /** Default provider to use */
    defaultProvider: AIProvider;
    /** Fallback providers in order of preference */
    fallbackProviders: AIProvider[];
    /** Maximum retry attempts */
    maxRetries: number;
    /** Timeout per provider in milliseconds */
    timeout: number;
    /** Enable automatic failover */
    enableFailover: boolean;
    /** Cost optimization mode */
    costOptimization: boolean;
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
    /** Selected provider */
    provider: AIProvider;
    /** Reason for selection */
    reason: string;
    /** Estimated cost */
    estimatedCost: number;
    /** Fallback providers if this fails */
    fallbacks: AIProvider[];
}

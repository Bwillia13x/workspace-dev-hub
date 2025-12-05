/**
 * Gemini AI Provider
 * 
 * Implementation of IAIProvider for Google's Gemini models.
 * Supports concept generation, image editing, and CAD generation.
 */

import { GoogleGenAI } from '@google/genai';
import { BaseAIProvider, BaseProviderConfig } from './base';
import {
    AIProvider,
    TaskType,
    GenerationOptions,
    EditOptions,
    CADOptions,
    GenerationResult,
    CADResult,
    ProviderHealth,
    TrendResult,
} from '../types';
import { ErrorCategory } from '../../core/errors';
import { sanitizePrompt, validateRawBase64, ValidationError } from '../../core/validation';

/**
 * Gemini-specific configuration
 */
export interface GeminiProviderConfig extends BaseProviderConfig {
    /** Model to use for concept generation */
    conceptModel?: string;
    /** Model to use for image editing */
    editModel?: string;
    /** Model to use for trend analysis */
    trendModel?: string;
}

/**
 * Default model versions
 */
const DEFAULT_MODELS = {
    concept: 'gemini-2.5-flash-image',
    edit: 'gemini-2.5-flash-image',
    cad: 'gemini-2.5-flash-image',
    trend: 'gemini-2.5-flash',
};

/**
 * Gemini AI Provider implementation
 */
export class GeminiProvider extends BaseAIProvider {
    readonly provider = AIProvider.GEMINI;
    readonly name = 'Google Gemini';

    protected supportedTasks = new Set([
        TaskType.CONCEPT_GENERATION,
        TaskType.IMAGE_EDITING,
        TaskType.CAD_GENERATION,
    ]);

    private readonly ai: GoogleGenAI;
    private readonly models: {
        concept: string;
        edit: string;
        cad: string;
        trend: string;
    };

    constructor(config: GeminiProviderConfig) {
        super(config);
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
        this.models = {
            concept: config.conceptModel || DEFAULT_MODELS.concept,
            edit: config.editModel || DEFAULT_MODELS.edit,
            cad: DEFAULT_MODELS.cad,
            trend: config.trendModel || DEFAULT_MODELS.trend,
        };
    }

    /**
     * Check if Gemini API is available
     */
    async checkHealth(): Promise<ProviderHealth> {
        const start = performance.now();

        try {
            // Simple health check - list models
            // Note: Gemini doesn't have a dedicated health endpoint,
            // so we'll just verify the SDK is configured
            const latency = Math.round(performance.now() - start);

            return {
                provider: this.provider,
                available: !!this.apiKey,
                latency,
                lastChecked: Date.now(),
            };
        } catch (error) {
            return {
                provider: this.provider,
                available: false,
                lastError: error instanceof Error ? error.message : 'Unknown error',
                lastChecked: Date.now(),
            };
        }
    }

    /**
     * Generate a fashion concept from a text prompt
     */
    async generateConcept(
        prompt: string,
        options?: GenerationOptions
    ): Promise<GenerationResult> {
        const sanitizedPrompt = sanitizePrompt(prompt);

        const { result, duration } = await this.withTiming(async () => {
            return this.executeWithRetry(async () => {
                const enhancedPrompt = this.buildConceptPrompt(sanitizedPrompt, options);

                const response = await this.ai.models.generateContent({
                    model: this.models.concept,
                    contents: {
                        parts: [{ text: enhancedPrompt }]
                    }
                });

                const base64 = this.extractImage(response);
                if (!base64) {
                    throw this.createError(
                        'No image generated. The AI may be experiencing high load.',
                        ErrorCategory.AI_GENERATION
                    );
                }

                if (!validateRawBase64(base64)) {
                    throw this.createError(
                        'Generated image data is invalid',
                        ErrorCategory.AI_GENERATION
                    );
                }

                return base64;
            }, 'generateConcept');
        });

        return {
            images: [result],
            duration,
            provider: this.provider,
            model: this.models.concept,
            seed: options?.seed,
        };
    }

    /**
     * Edit an existing image with instructions
     */
    async editConcept(
        imageBase64: string,
        instruction: string,
        options?: EditOptions
    ): Promise<GenerationResult> {
        // Validate input image
        if (!validateRawBase64(imageBase64)) {
            throw new ValidationError('Invalid image data provided', 'imageBase64');
        }

        const sanitizedInstruction = sanitizePrompt(instruction);

        const { result, duration } = await this.withTiming(async () => {
            return this.executeWithRetry(async () => {
                const enhancedInstruction = this.buildEditPrompt(sanitizedInstruction, options);

                const response = await this.ai.models.generateContent({
                    model: this.models.edit,
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: this.extractBase64(imageBase64)
                                }
                            },
                            { text: enhancedInstruction }
                        ]
                    }
                });

                const base64 = this.extractImage(response);
                if (!base64) {
                    throw this.createError(
                        'No edited image generated. Please try a different instruction.',
                        ErrorCategory.AI_GENERATION
                    );
                }

                if (!validateRawBase64(base64)) {
                    throw this.createError(
                        'Generated image data is invalid',
                        ErrorCategory.AI_GENERATION
                    );
                }

                return base64;
            }, 'editConcept');
        });

        return {
            images: [result],
            duration,
            provider: this.provider,
            model: this.models.edit,
        };
    }

    /**
     * Generate CAD/technical drawing from concept image
     */
    async generateCAD(
        imageBase64: string,
        options?: CADOptions
    ): Promise<CADResult> {
        // Validate input image
        if (!validateRawBase64(imageBase64)) {
            throw new ValidationError('Invalid image data provided', 'imageBase64');
        }

        const { result, duration } = await this.withTiming(async () => {
            return this.executeWithRetry(async () => {
                const prompt = this.buildCADPrompt(options);

                const response = await this.ai.models.generateContent({
                    model: this.models.cad,
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: this.extractBase64(imageBase64)
                                }
                            },
                            { text: prompt }
                        ]
                    }
                });

                const cadImage = this.extractImage(response);
                const materials = this.extractText(response);

                // Warn but don't fail if CAD image is invalid
                if (cadImage && !validateRawBase64(cadImage)) {
                    console.warn('Generated CAD image data appears invalid');
                }

                return { cadImage, materials };
            }, 'generateCAD');
        });

        return {
            cadImage: result.cadImage,
            materials: result.materials,
            provider: this.provider,
            duration,
        };
    }

    /**
     * Get fashion trends using Google Search grounding
     */
    async getFashionTrends(topic: string): Promise<TrendResult> {
        const sanitizedTopic = sanitizePrompt(topic);

        const { result, duration } = await this.withTiming(async () => {
            return this.executeWithRetry(async () => {
                const response = await this.ai.models.generateContent({
                    model: this.models.trend,
                    contents: this.buildTrendPrompt(sanitizedTopic),
                    config: {
                        tools: [{ googleSearch: {} }],
                    }
                });

                const text = response.text || 'No trend data found.';
                const sources = this.extractGroundingSources(response);

                return { text, sources };
            }, 'getFashionTrends');
        });

        return result;
    }

    /**
     * Build enhanced concept generation prompt
     */
    private buildConceptPrompt(prompt: string, options?: GenerationOptions): string {
        const parts = [
            `Create a professional fashion design concept for: "${prompt}".`,
            'Style: Photorealistic, high-fashion studio photography.',
            'Lighting: Soft, neutral studio lighting.',
            'Background: Clean, neutral grey or white background to focus on the garment.',
            'Details: Ensure high fidelity on fabric textures (denim, silk, wool, etc.) and construction details.',
        ];

        if (options?.style) {
            parts.push(`Visual Style: ${options.style}`);
        }

        if (options?.colorPalette?.length) {
            parts.push(`Color Palette: Use these colors: ${options.colorPalette.join(', ')}`);
        }

        if (options?.negativePrompt) {
            parts.push(`Avoid: ${options.negativePrompt}`);
        }

        return parts.join('\n');
    }

    /**
     * Build enhanced edit prompt
     */
    private buildEditPrompt(instruction: string, options?: EditOptions): string {
        const parts = [
            `Task: Edit the input image based on this instruction: "${instruction}".`,
            'Role: Act as an expert photo editor and fashion designer.',
            'Constraints:',
            '- If the instruction is about style (e.g., "retro filter", "sketch style"), apply the visual effect while keeping the subject.',
            '- If the instruction is about content (e.g., "remove background", "change color to red"), modify the subject accordingly.',
            '- Maintain photorealism unless asked otherwise.',
        ];

        if (options?.strength !== undefined) {
            parts.push(`Edit Strength: ${Math.round(options.strength * 100)}% modification`);
        }

        if (options?.preserve?.length) {
            parts.push(`Preserve these elements: ${options.preserve.join(', ')}`);
        }

        return parts.join('\n');
    }

    /**
     * Build CAD generation prompt
     */
    private buildCADPrompt(options?: CADOptions): string {
        const viewParts = [];
        if (options?.frontView !== false) viewParts.push('front');
        if (options?.backView) viewParts.push('back');
        if (options?.sideView) viewParts.push('side');

        const views = viewParts.length > 0
            ? viewParts.join(' and ') + ' view(s)'
            : 'front and back views if possible';

        return `Analyze the provided fashion concept image and generate a production-ready engineering package.

Task 1 (Visual Output): Generate a highly detailed technical flat-lay engineering sketch (CAD) of this garment.
- Style: Professional black and white technical line drawing. Vector style. High contrast.
- Perspective: ${views}, or detailed front view flattened.
- Features: Clearly visible stitching (e.g., topstitch, overlock), accurate seam lines, and structural details (darts, pleats).
- Annotations: You MUST include technical callouts with arrows indicating:
    - Stitch Types: Label specific stitches (e.g., "Single Needle Topstitch", "ISO 504 Overlock", "Blind Hem").
    - Seam Allowances: Indicate specific widths (e.g., "1cm S.A.", "1/4\" Edge Stitch", "Bound Seam").
    - Material Callouts: Label fabric types for different panels (e.g., "Rib Knit", "Self Fabric", "Contrast Lining").
    - Hardware: Label buttons, zippers (e.g., "YKK #5 Vislon"), and rivets.
    ${options?.includeMeasurements !== false ? '- Key Measurements: Indicate measurement lines for "Center Back Length", "Chest Width", and "Sleeve Length".' : ''}
- Background: Pure white.

Task 2 (Text Output): Provide a comprehensive Bill of Materials (BOM) and production notes.
- Format: Use strict Markdown. Start with a header "## Bill of Materials".
- Content: 
    - Detailed fabric composition suggestions (gsm, fiber content).
    - Hardware details (zippers, buttons, rivets).
    - Stitching instructions corresponding to the CAD.
    - Estimated yardage per unit.
    - Assembly instructions or critical construction notes.
- Tone: Technical, precise, and ready for a manufacturer.

Return both the annotated CAD image and the text analysis.`;
    }

    /**
     * Build trend analysis prompt
     */
    private buildTrendPrompt(topic: string): string {
        return `Act as a professional fashion trend forecaster.
      
User Query: "${topic}"

Task:
1. Use Google Search to find the latest, real-world fashion trends, emerging aesthetics, and material innovations related to the query.
2. Provide a concise, high-impact summary of the key visual elements, color palettes, and fabrics.
3. Focus on actionable design details that can be used in a generative AI prompt.

Output:
- A short, dense paragraph summarizing the trend.`;
    }

    /**
     * Extract image from Gemini response
     */
    private extractImage(response: any): string | null {
        if (!response.candidates?.[0]?.content?.parts) return null;

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
                return part.inlineData.data;
            }
        }
        return null;
    }

    /**
     * Extract text from Gemini response
     */
    private extractText(response: any): string {
        if (!response.candidates?.[0]?.content?.parts) return '';
        return response.candidates[0].content.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('');
    }

    /**
     * Extract grounding sources from response
     */
    private extractGroundingSources(response: any): Array<{ title: string; uri: string }> {
        const sources: Array<{ title: string; uri: string }> = [];

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
                if (chunk.web) {
                    sources.push({
                        title: chunk.web.title,
                        uri: chunk.web.uri,
                    });
                }
            }
        }

        return sources;
    }

    /**
     * Get estimated cost for Gemini operations
     * Note: These are approximate values and may change
     */
    getEstimatedCost(task: TaskType, options?: GenerationOptions): number {
        const baseCosts = {
            [TaskType.CONCEPT_GENERATION]: 0.002,
            [TaskType.IMAGE_EDITING]: 0.003,
            [TaskType.CAD_GENERATION]: 0.004,
            [TaskType.STYLE_TRANSFER]: 0.003,
            [TaskType.UPSCALE]: 0.001,
        };

        const base = baseCosts[task] || 0.002;
        const count = options?.count || 1;

        // Adjust for quality
        const qualityMultiplier = {
            draft: 0.5,
            standard: 1.0,
            high: 1.5,
        };
        const quality = qualityMultiplier[options?.quality || 'standard'];

        return base * count * quality;
    }
}

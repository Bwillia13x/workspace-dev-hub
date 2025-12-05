/**
 * Tests for AI Provider Types
 */

import { describe, it, expect } from 'vitest';
import {
    AIProvider,
    ModelTier,
    TaskType,
    ImageStyle,
} from '../../ai/types';

describe('AI Types', () => {
    describe('AIProvider enum', () => {
        it('should have all expected providers', () => {
            expect(AIProvider.GEMINI).toBe('gemini');
            expect(AIProvider.STABLE_DIFFUSION).toBe('stable-diffusion');
            expect(AIProvider.FLUX).toBe('flux');
            expect(AIProvider.MIDJOURNEY).toBe('midjourney');
        });
    });

    describe('ModelTier enum', () => {
        it('should have all tiers', () => {
            expect(ModelTier.BASIC).toBe('basic');
            expect(ModelTier.STANDARD).toBe('standard');
            expect(ModelTier.PREMIUM).toBe('premium');
        });
    });

    describe('TaskType enum', () => {
        it('should have all task types', () => {
            expect(TaskType.CONCEPT_GENERATION).toBe('concept_generation');
            expect(TaskType.IMAGE_EDITING).toBe('image_editing');
            expect(TaskType.CAD_GENERATION).toBe('cad_generation');
            expect(TaskType.STYLE_TRANSFER).toBe('style_transfer');
            expect(TaskType.UPSCALE).toBe('upscale');
        });
    });

    describe('ImageStyle enum', () => {
        it('should have all style options', () => {
            expect(ImageStyle.PHOTOREALISTIC).toBe('photorealistic');
            expect(ImageStyle.SKETCH).toBe('sketch');
            expect(ImageStyle.TECHNICAL).toBe('technical');
            expect(ImageStyle.ARTISTIC).toBe('artistic');
            expect(ImageStyle.VINTAGE).toBe('vintage');
            expect(ImageStyle.MINIMALIST).toBe('minimalist');
        });
    });
});

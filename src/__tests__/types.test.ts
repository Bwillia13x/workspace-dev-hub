import { describe, it, expect } from 'vitest';
import { AppView } from '../../types';
import type { Product, DesignDraft, SavedDraft, Notification, NotificationType, GenerationState } from '../../types';

describe('Type Safety Tests', () => {
    describe('Product interface', () => {
        it('should validate a complete Product object', () => {
            const product: Product = {
                id: '12345',
                name: 'Test Product',
                description: 'Test description',
                price: 100,
                imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                creator: 'Test Creator',
                likes: 10,
            };

            expect(product).toBeDefined();
            expect(product.id).toBeTypeOf('string');
            expect(product.name).toBeTypeOf('string');
            expect(product.description).toBeTypeOf('string');
            expect(product.price).toBeTypeOf('number');
            expect(product.imageUrl).toBeTypeOf('string');
            expect(product.creator).toBeTypeOf('string');
            expect(product.likes).toBeTypeOf('number');
            expect(product.likes).toBeGreaterThanOrEqual(0);
        });

        it('should allow optional cadImageUrl and materials', () => {
            const productWithOptionals: Product = {
                id: '12345',
                name: 'Test Product',
                description: 'Test description',
                price: 100,
                imageUrl: 'data:image/png;base64,test',
                cadImageUrl: 'data:image/png;base64,cadtest',
                materials: ['cotton', 'polyester'],
                creator: 'Test Creator',
                likes: 5,
            };

            expect(productWithOptionals.cadImageUrl).toBeDefined();
            expect(productWithOptionals.materials).toBeDefined();
            expect(productWithOptionals.materials).toBeInstanceOf(Array);
            expect(productWithOptionals.materials).toHaveLength(2);
        });

        it('should handle products without optional fields', () => {
            const minimalProduct: Product = {
                id: 'minimal-1',
                name: 'Minimal Product',
                description: 'Minimal description',
                price: 50,
                imageUrl: 'data:image/png;base64,minimal',
                creator: 'Creator',
                likes: 0,
            };

            expect(minimalProduct.cadImageUrl).toBeUndefined();
            expect(minimalProduct.materials).toBeUndefined();
        });
    });

    describe('DesignDraft interface', () => {
        it('should validate a DesignDraft with null images', () => {
            const draft: DesignDraft = {
                conceptImage: null,
                cadImage: null,
                materials: '',
                history: [],
            };

            expect(draft).toBeDefined();
            expect(draft.conceptImage).toBeNull();
            expect(draft.cadImage).toBeNull();
            expect(draft.materials).toBe('');
            expect(draft.history).toBeInstanceOf(Array);
            expect(draft.history).toHaveLength(0);
        });

        it('should validate a DesignDraft with images and history', () => {
            const draft: DesignDraft = {
                conceptImage: 'base64-concept-image',
                cadImage: 'base64-cad-image',
                materials: 'Cotton, Silk, Linen',
                history: ['image1', 'image2', 'image3'],
            };

            expect(draft.conceptImage).toBeTypeOf('string');
            expect(draft.cadImage).toBeTypeOf('string');
            expect(draft.materials).toContain('Cotton');
            expect(draft.history).toHaveLength(3);
        });
    });

    describe('SavedDraft interface', () => {
        it('should validate a SavedDraft object', () => {
            const savedDraft: SavedDraft = {
                id: '123',
                name: 'Draft Name',
                timestamp: Date.now(),
                data: {
                    conceptImage: 'base64-string',
                    cadImage: null,
                    materials: 'materials',
                    history: ['base64-string'],
                },
                prompt: 'Test prompt for fashion design',
            };

            expect(savedDraft).toBeDefined();
            expect(savedDraft.id).toBeTypeOf('string');
            expect(savedDraft.name).toBeTypeOf('string');
            expect(savedDraft.timestamp).toBeTypeOf('number');
            expect(savedDraft.timestamp).toBeGreaterThan(0);
            expect(savedDraft.data).toBeDefined();
            expect(savedDraft.prompt).toBeTypeOf('string');
        });

        it('should have timestamp as a valid Unix timestamp', () => {
            const now = Date.now();
            const savedDraft: SavedDraft = {
                id: 'test-id',
                name: 'Test',
                timestamp: now,
                data: {
                    conceptImage: null,
                    cadImage: null,
                    materials: '',
                    history: [],
                },
                prompt: '',
            };

            // Timestamp should be recent (within last 24 hours)
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            expect(savedDraft.timestamp).toBeGreaterThan(oneDayAgo);
            expect(savedDraft.timestamp).toBeLessThanOrEqual(now);
        });
    });

    describe('Notification interface', () => {
        it('should validate success notification', () => {
            const notification: Notification = {
                id: '123',
                type: 'success',
                message: 'Operation completed successfully',
            };

            expect(notification).toBeDefined();
            expect(notification.id).toBeTypeOf('string');
            expect(notification.type).toBe('success');
            expect(notification.message).toBeTypeOf('string');
        });

        it('should validate error notification', () => {
            const notification: Notification = {
                id: '456',
                type: 'error',
                message: 'An error occurred',
            };

            expect(notification.type).toBe('error');
        });

        it('should validate info notification', () => {
            const notification: Notification = {
                id: '789',
                type: 'info',
                message: 'Information message',
            };

            expect(notification.type).toBe('info');
        });

        it('should only allow valid notification types', () => {
            const validTypes: NotificationType[] = ['success', 'error', 'info'];

            validTypes.forEach((type) => {
                const notification: Notification = {
                    id: `id-${type}`,
                    type,
                    message: `${type} message`,
                };
                expect(['success', 'error', 'info']).toContain(notification.type);
            });
        });
    });

    describe('AppView enum', () => {
        it('should have STUDIO view', () => {
            expect(AppView.STUDIO).toBe('STUDIO');
        });

        it('should have MARKETPLACE view', () => {
            expect(AppView.MARKETPLACE).toBe('MARKETPLACE');
        });

        it('should only have two views', () => {
            const viewValues = Object.values(AppView);
            expect(viewValues).toHaveLength(2);
            expect(viewValues).toContain('STUDIO');
            expect(viewValues).toContain('MARKETPLACE');
        });
    });

    describe('GenerationState interface', () => {
        it('should validate idle state', () => {
            const state: GenerationState = {
                isGenerating: false,
                stage: 'idle',
                error: null,
            };

            expect(state.isGenerating).toBe(false);
            expect(state.stage).toBe('idle');
            expect(state.error).toBeNull();
        });

        it('should validate generating state', () => {
            const state: GenerationState = {
                isGenerating: true,
                stage: 'concept',
                error: null,
            };

            expect(state.isGenerating).toBe(true);
            expect(state.stage).toBe('concept');
        });

        it('should validate error state', () => {
            const state: GenerationState = {
                isGenerating: false,
                stage: 'idle',
                error: 'Generation failed: API rate limit exceeded',
            };

            expect(state.error).toBeTypeOf('string');
            expect(state.error).toContain('rate limit');
        });

        it('should validate all stage values', () => {
            const validStages: GenerationState['stage'][] = [
                'idle',
                'concept',
                'editing',
                'engineering',
                'publishing',
            ];

            validStages.forEach((stage) => {
                const state: GenerationState = {
                    isGenerating: stage !== 'idle',
                    stage,
                    error: null,
                };
                expect(validStages).toContain(state.stage);
            });
        });
    });
});

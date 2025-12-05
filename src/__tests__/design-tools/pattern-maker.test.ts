/**
 * Pattern Maker Tests
 * Phase 4: Professional Design Tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    PatternMaker,
    type PatternPiece,
    type PatternPoint,
} from '../../design-tools/patterns';

describe('PatternMaker', () => {
    let patternMaker: PatternMaker;

    beforeEach(() => {
        patternMaker = new PatternMaker();
    });

    describe('initialization', () => {
        it('should create a pattern maker instance', () => {
            expect(patternMaker).toBeInstanceOf(PatternMaker);
        });

        it('should have no pattern initially', () => {
            const pattern = patternMaker.getPattern();
            expect(pattern).toBeNull();
        });
    });

    describe('pattern creation', () => {
        it('should create a pattern with default values', () => {
            const pattern = patternMaker.createPattern('Summer Dress');

            expect(pattern).toBeDefined();
            expect(pattern.name).toBe('Summer Dress');
            expect(pattern.baseSize).toBe('M');
            expect(pattern.metadata.units).toBe('cm');
        });

        it('should create a pattern with custom values', () => {
            const pattern = patternMaker.createPattern('Jacket', 'L', 'inches');

            expect(pattern.name).toBe('Jacket');
            expect(pattern.baseSize).toBe('L');
            expect(pattern.metadata.units).toBe('inches');
        });

        it('should get the current pattern', () => {
            patternMaker.createPattern('My Pattern');
            const pattern = patternMaker.getPattern();
            expect(pattern).toBeDefined();
            expect(pattern?.name).toBe('My Pattern');
        });
    });

    describe('piece creation', () => {
        beforeEach(() => {
            patternMaker.createPattern('Test Pattern');
        });

        it('should create a pattern piece with outline', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
                { x: 100, y: 150, type: 'corner' },
                { x: 0, y: 150, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Bodice Front', outline);

            expect(piece).toBeDefined();
            expect(piece.id).toBeDefined();
            expect(piece.name).toBe('Bodice Front');
            expect(piece.outline.length).toBe(4);
        });

        it('should create a piece with options', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Collar', outline, {
                seamAllowance: 0.5,
            });

            expect(piece.seamAllowance).toBe(0.5);
        });

        it('should add piece to pattern', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
                { x: 100, y: 100, type: 'corner' },
                { x: 0, y: 100, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Sleeve', outline);
            patternMaker.addPiece(piece);

            const retrieved = patternMaker.getPiece(piece.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('Sleeve');
        });

        it('should update a piece', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Collar', outline);
            patternMaker.addPiece(piece);

            piece.name = 'Stand Collar';
            patternMaker.updatePiece(piece);

            const updated = patternMaker.getPiece(piece.id);
            expect(updated?.name).toBe('Stand Collar');
        });
    });

    describe('basic pattern blocks', () => {
        beforeEach(() => {
            patternMaker.createPattern('Block Pattern');
        });

        it('should create basic bodice front', () => {
            const piece = patternMaker.createBasicBodiceFront(
                88,  // bust
                70,  // waist
                94,  // hip
                38,  // shoulder
                40   // CF length
            );

            expect(piece).toBeDefined();
            expect(piece.name).toBe('Bodice Front');
            expect(piece.outline.length).toBeGreaterThan(3);
        });

        it('should create basic bodice back', () => {
            const piece = patternMaker.createBasicBodiceBack(
                88,  // bust
                70,  // waist
                38,  // shoulder
                40   // CB length
            );

            expect(piece).toBeDefined();
            expect(piece.name).toBe('Bodice Back');
        });

        it('should create basic sleeve', () => {
            const piece = patternMaker.createBasicSleeve(
                40,  // armhole
                58,  // length
                16   // wrist
            );

            expect(piece).toBeDefined();
            expect(piece.name).toBe('Sleeve');
        });

        it('should create basic skirt front', () => {
            const piece = patternMaker.createBasicSkirtFront(
                70,  // waist
                94,  // hip
                60,  // length
                20   // waist to hip
            );

            expect(piece).toBeDefined();
            expect(piece.name).toBe('Skirt Front');
        });
    });

    describe('seam allowance', () => {
        beforeEach(() => {
            patternMaker.createPattern('Test Pattern');
        });

        it('should add seam allowance to piece', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
                { x: 100, y: 100, type: 'corner' },
                { x: 0, y: 100, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Test', outline);
            const withSeam = patternMaker.addSeamAllowance(piece, 1.5);

            expect(withSeam).toBeDefined();
            expect(withSeam.length).toBeGreaterThan(0);
        });
    });

    describe('notch management', () => {
        beforeEach(() => {
            patternMaker.createPattern('Test Pattern');
        });

        it('should add notches to a piece', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Bodice', outline);
            patternMaker.addPiece(piece);

            // addNotch takes pieceId, position (0-1), type
            const notch = patternMaker.addNotch(piece.id, 0.5, 'single');

            expect(notch).toBeDefined();
            expect(notch.id).toBeDefined();
        });
    });

    describe('dart management', () => {
        beforeEach(() => {
            patternMaker.createPattern('Test Pattern');
        });

        it('should add darts to a piece', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
                { x: 100, y: 100, type: 'corner' },
                { x: 0, y: 100, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Bodice', outline);
            patternMaker.addPiece(piece);

            const dart = patternMaker.addDart(piece.id, {
                apex: { x: 50, y: 75 },
                leftLeg: { x: 45, y: 0 },
                rightLeg: { x: 55, y: 0 },
                width: 2,
                length: 10,
                foldDirection: 'right',
                type: 'straight',
            });

            expect(dart).toBeDefined();
            expect(dart.id).toBeDefined();
            expect(dart.type).toBe('straight');
        });
    });

    describe('grainline', () => {
        beforeEach(() => {
            patternMaker.createPattern('Test Pattern');
        });

        it('should set grainline for a piece', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
                { x: 100, y: 150, type: 'corner' },
                { x: 0, y: 150, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Bodice', outline);
            patternMaker.addPiece(piece);

            patternMaker.setGrainline(
                piece.id,
                { x: 50, y: 10 },
                { x: 50, y: 140 },
                'straight'
            );

            const updated = patternMaker.getPiece(piece.id);
            expect(updated?.grainline).toBeDefined();
            expect(updated?.grainline?.type).toBe('straight');
        });
    });

    describe('grading', () => {
        beforeEach(() => {
            patternMaker.createPattern('Test Pattern');
        });

        it('should add grading rules', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Test', outline);
            patternMaker.addPiece(piece);

            const rule = patternMaker.addGradingRule(
                piece.id,
                0,      // point index
                0.5,    // x grade
                0.25    // y grade
            );

            expect(rule).toBeDefined();
            expect(rule.id).toBeDefined();
        });

        it('should grade a pattern to different sizes', () => {
            const outline: PatternPoint[] = [
                { x: 0, y: 0, type: 'corner' },
                { x: 100, y: 0, type: 'corner' },
                { x: 100, y: 100, type: 'corner' },
                { x: 0, y: 100, type: 'corner' },
            ];

            const piece = patternMaker.createPiece('Test', outline);
            patternMaker.addPiece(piece);

            patternMaker.addGradingRule(piece.id, 1, 2, 0);

            const sizes = [
                { name: 'S', grade: -1, measurements: new Map() },
                { name: 'M', grade: 0, measurements: new Map() },
                { name: 'L', grade: 1, measurements: new Map() },
            ];

            const graded = patternMaker.gradePattern(sizes);
            expect(graded).toBeDefined();
            expect(graded.size).toBe(3);
        });
    });
});

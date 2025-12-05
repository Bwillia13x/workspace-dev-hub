/**
 * Vector Tools Module - Professional vector editing tools
 *
 * Provides:
 * - Pen tool for path creation
 * - Path editing and manipulation
 * - Anchor point operations
 * - Bezier curve handling
 * - SVG import/export
 * - Shape primitives (rectangle, ellipse, polygon, star)
 */

export {
    VectorToolsManager,
    createVectorToolsManager,
} from './vector-tools';

export type {
    AnchorPoint,
    VectorShape,
    PathHitTestResult,
    PenToolMode,
    VectorToolEvents,
} from './vector-tools';

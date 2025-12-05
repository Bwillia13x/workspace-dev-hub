/**
 * Layers Module - Professional layer management for design editing
 *
 * This module provides:
 * - Layer types and data structures
 * - Layer manager for state management
 * - History/undo-redo system
 * - Fabric.js canvas integration
 * - React UI components (LayersPanel)
 */

// Types
export * from '../types';

// Layer Manager
export { LayerManager } from './layer-manager';
export type { LayerManagerState, LayerManagerEvents } from './layer-manager';
export {
    createImageLayer,
    createShapeLayer,
    createTextLayer,
    createVectorLayer,
    createGroupLayer,
    createMaskLayer,
} from './layer-manager';

// Layer History
export { LayerHistory, createLayerHistory } from './layer-history';
export type {
    HistoryAction,
    HistoryActionType,
    HistorySnapshot,
    HistoryOptions,
} from './layer-history';

// Canvas Wrapper (Fabric.js integration)
export { CanvasWrapper, createCanvasWrapper } from './canvas-wrapper';
export type { CanvasWrapperOptions, CanvasWrapperEvents } from './canvas-wrapper';

// React Components
export { LayersPanel, layersPanelStyles } from './LayersPanel';
export type { LayersPanelProps } from './LayersPanel';

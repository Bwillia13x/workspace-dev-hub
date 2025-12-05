/**
 * Design Tools - Professional Fashion Design Toolkit
 *
 * Phase 4 implementation of ROADMAP.md
 * Complete suite of professional design tools including:
 * - Layer-based editing
 * - Advanced masking
 * - Vector drawing
 * - Typography
 * - Shape libraries
 * - Brush engine
 * - 3D viewer and fabric simulation
 * - Pattern making
 * - Color management
 * - Comprehensive history system
 */

// ============================================================================
// Core Types
// ============================================================================

export * from './types';

// ============================================================================
// Layer System - Photoshop-style layer management
// ============================================================================

export {
    LayerManager,
    LayerHistory,
    createLayerHistory,
    CanvasWrapper,
    createCanvasWrapper,
    LayersPanel,
    layersPanelStyles,
    createImageLayer,
    createShapeLayer,
    createTextLayer,
    createVectorLayer,
    createGroupLayer,
    createMaskLayer,
    type LayerManagerState,
    type LayerManagerEvents,
    type HistoryAction,
    type HistoryActionType,
    type HistorySnapshot,
    type HistoryOptions,
    type CanvasWrapperOptions,
    type CanvasWrapperEvents,
    type LayersPanelProps,
} from './layers';

// ============================================================================
// Masking System - Vector and raster masks
// ============================================================================

export {
    MaskManager,
    createMaskManager,
    type BaseMask,
    type VectorMask,
    type RasterMask,
    type ClippingMask,
    type QuickMask,
    type Mask,
    type MaskOperation,
    type MaskCombineOptions,
    type MaskManagerEvents,
} from './masking';

// ============================================================================
// Vector Tools - Professional pen tool and path editing
// ============================================================================

export {
    VectorToolsManager,
    createVectorToolsManager,
    type AnchorPoint,
    type VectorShape,
    type PathHitTestResult,
    type PenToolMode,
    type VectorToolEvents,
} from './vector';

// ============================================================================
// Text Tools - Typography with Google Fonts
// ============================================================================

export {
    TextToolsManager,
    createTextToolsManager,
    FASHION_FONTS,
    DEFAULT_CHARACTER_STYLE,
    DEFAULT_PARAGRAPH_STYLE,
    DEFAULT_TEXT_EFFECTS,
    type GoogleFontInfo,
    type LoadedFont,
    type CharacterStyle,
    type ParagraphStyle,
    type TextRange,
    type TextBox,
    type TextEffects,
    type TextWarpType,
    type TextWarp,
    type TextOnPath,
    type TextToolsEvents,
} from './text';

// ============================================================================
// Shape Library - Fashion-specific design elements
// ============================================================================

export {
    ShapeLibraryManager,
    createShapeLibraryManager,
    type ShapeCategory,
    type ShapeDefinition,
    type ShapeOptions,
    type ShapeInstance,
    type ShapeLibraryEvents,
} from './shapes';

// ============================================================================
// Brush Engine - Professional brush system
// ============================================================================

export {
    BrushEngine,
    createBrushEngine,
    DEFAULT_DYNAMICS,
    type BrushSettings,
    type BrushCategory,
    type BrushDynamics,
    type BrushTexture,
    type TextureMode,
    type BrushTransfer,
    type DualBrushSettings,
    type StrokePoint,
    type Stroke,
    type StrokeRenderOptions,
    type BrushEngineEvents,
} from './brushes';

// ============================================================================
// 3D Viewer - WebGL-based 3D garment visualization
// ============================================================================

export {
    SceneManager,
    type Vector3D,
    type Quaternion,
    type Transform3D,
    type BoundingBox3D,
    type Material3D,
    type MaterialType,
    type Mesh3D,
    type Geometry3D,
    type GeometryType,
    type Light3D,
    type LightType,
    type Camera3D,
    type CameraType,
    type Scene3D,
    type SceneBackground,
    type EnvironmentMap,
    type SceneFog,
    type RenderSettings,
    type ToneMappingType,
    type CameraOrbitControls,
    type SceneManagerConfig,
    type SceneEvent,
} from './3d';

export {
    FabricSimulator,
    type FabricProperties,
    type FabricPreset,
    type Particle,
    type Spring,
    type Constraint,
    type CollisionBody,
    type SimulationSettings,
    type SimulationEvent,
} from './3d';

export {
    ModelLoader,
    type ModelFormat,
    type ModelLoadOptions,
    type LoadedModel,
    type ModelMetadata,
    type LoaderEvent,
} from './3d';

// ============================================================================
// Pattern Making - Professional pattern drafting
// ============================================================================

export {
    PatternMaker,
    type PatternPiece,
    type PatternPoint,
    type PatternPointType,
    type Grainline,
    type GrainlineType,
    type Notch,
    type NotchType,
    type Dart,
    type DartType,
    type InternalLine,
    type InternalLineType,
    type PatternLabel,
    type PatternLabelType,
    type MirrorAxis,
    type PlacementInfo,
    type PatternMetadata,
    type GradingRule,
    type GradedSize,
    type Pattern,
    type PatternEvent,
} from './patterns';

// ============================================================================
// Color Management - Professional color workflows
// ============================================================================

export {
    ColorManager,
    type RGBColor,
    type HSLColor,
    type HSVColor,
    type CMYKColor,
    type LABColor,
    type XYZColor,
    type ColorSpace,
    type Color,
    type ColorSwatch,
    type ColorPalette,
    type HarmonyType,
    type PantoneColor,
    type PantoneCategory,
    type ColorProfile,
    type ColorEvent,
} from './colors';

// ============================================================================
// History System - Undo/redo with branching
// ============================================================================

export {
    HistoryManager,
    createDocumentHistory,
    createDesignHistory,
    type HistoryState,
    type StateMetadata,
    type HistoryBranch,
    type HistoryConfig,
    type HistoryStats,
    type HistoryEvent,
    type Transaction,
} from './history';

// ============================================================================
// Version Information
// ============================================================================

export const DESIGN_TOOLS_VERSION = '1.0.0';
export const DESIGN_TOOLS_BUILD_DATE = new Date().toISOString().split('T')[0];

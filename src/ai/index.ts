/**
 * AI Module Exports
 *
 * Central export point for all AI-related functionality.
 */

// Types and Enums
export {
    AIProvider,
    ModelTier,
    TaskType,
    ImageStyle,
} from './types';

export type {
    GenerationOptions,
    EditOptions,
    CADOptions,
    GenerationResult,
    CADResult,
    TrendResult,
    ProviderHealth,
    IAIProvider,
    RouterConfig,
    RoutingDecision,
} from './types';

// Providers
export { BaseAIProvider } from './providers/base';
export type { BaseProviderConfig } from './providers/base';
export { GeminiProvider } from './providers/gemini';
export type { GeminiProviderConfig } from './providers/gemini';

// Router
export { ModelRouter, getDefaultRouter, resetDefaultRouter } from './router';

// Style Consistency
export {
    StyleConsistencyManager,
} from './style-consistency';

export type {
    StyleReference,
    StyleProfile,
    StyleAnalysis,
} from './style-consistency';

// Color Palette
export {
    ColorPaletteManager,
} from './color-palette';

export type {
    ColorPalette,
    ExtractedColors,
} from './color-palette';

// Prompt Engineering Assistant
export {
    PromptAssistant,
    promptAssistant,
} from './prompt-assistant';

export type {
    PromptScore,
    PromptSuggestion,
    EnhancedPrompt,
    PromptAnalysis,
} from './prompt-assistant';

// Inpainting Canvas
export {
    InpaintingCanvasManager,
    inpaintingCanvas,
} from './inpainting-canvas';

export type {
    BrushSettings,
    Point,
    MaskStroke,
    InpaintingRegion,
} from './inpainting-canvas';

// Collection Generator (Multi-Garment)
export {
    CollectionGenerator,
    getCollectionTemplates,
    getGarmentTypes,
    COLLECTION_TEMPLATES,
    type GarmentType,
    type CollectionGarment,
    type CollectionTheme,
    type FashionCollection,
    type CollectionTemplate,
} from './collection-generator';

// Material Realism
export {
    MaterialRealismManager,
    materialRealism,
    MATERIAL_LIBRARY,
    MATERIAL_CATEGORIES,
    FABRIC_WEIGHTS,
    SURFACE_FINISHES,
    type MaterialCategory,
    type FabricWeight,
    type SurfaceFinish,
    type MaterialDefinition,
    type MaterialTexture,
    type Material,
} from './material-realism';

// Pose Control
export {
    PoseControlManager,
    poseControl,
    POSE_PRESETS,
    POSE_CATEGORIES,
    type JointName,
    type Point2D,
    type BodyPose,
    type PoseCategory,
    type PosePreset,
    type ModelCharacteristics,
} from './pose-control';

// === Phase 2.3: Engineering & Tech Pack v2.0 ===

// Vector CAD Generator
export {
    VectorCADGenerator,
    vectorCAD,
    type MeasurementUnit,
    type Measurement,
    type Annotation,
    type CADLayer,
    type CADDocument,
    type SVGExportOptions,
} from './vector-cad';

// Tech Pack Generator
export {
    TechPackGenerator,
    techPackGenerator,
    type SizeSpec,
    type GradingRule,
    type ColorSpec,
    type MaterialSpec,
    type TrimSpec,
    type ConstructionSpec,
    type ArtworkSpec,
    type PackagingSpec,
    type TechPack,
} from './tech-pack';

// 3D Preview Manager
export {
    Preview3DManager,
    preview3D,
    type FabricPhysics,
    type FabricVisual,
    type FabricMaterial,
    type LightingPreset,
    type CameraPreset,
    type SimulationSettings,
    type Preview3DConfig,
} from './preview-3d';

// Pattern Output Generator
export {
    PatternOutputGenerator,
    patternOutput,
    PatternPieceType,
    type PatternPoint,
    type PatternCurve,
    type PatternNotch,
    type GrainLine,
    type PatternDart,
    type PatternAnnotation,
    type PatternPiece,
    type PatternLayout,
    type ExportSettings,
} from './pattern-output';

// Manufacturing Formats Exporter
export {
    ManufacturingFormatsExporter,
    manufacturingFormats,
    type ManufacturingFormat,
    type GerberOptions,
    type OptitexOptions,
    type Clo3DOptions,
    type ExportResult,
} from './manufacturing-formats';

// === Phase 2.4: Trend Analysis v2.0 ===

// Trend Analysis
export {
    TrendAnalyzer,
    trendAnalyzer,
    type TrendSource,
    type FashionCategory,
    type TrendRegion,
    type Season,
    type TrendStage,
    type TrendItem,
    type SourceTrendData,
    type TrendPrediction,
    type RegionalAnalysis,
    type MoodBoardItem,
    type VisualMoodBoard,
    type TrendAnalysisConfig,
    type TrendReport,
} from './trend-analysis';

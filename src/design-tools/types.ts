/**
 * Design Tools Type Definitions
 *
 * Types for professional design tools including layers, canvas, shapes,
 * brushes, colors, and typography.
 */

// ============================================================================
// BASIC GEOMETRY TYPES
// ============================================================================

export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Rect extends Point, Size { }

// ============================================================================
// MASK TYPES
// ============================================================================

export enum MaskType {
    VECTOR = 'vector',
    RASTER = 'raster',
    CLIPPING = 'clipping',
}

// ============================================================================
// VECTOR PATH TYPES
// ============================================================================

export enum PathSegmentType {
    MOVE = 'M',
    LINE = 'L',
    QUADRATIC = 'Q',
    BEZIER = 'C',
    ARC = 'A',
    CLOSE = 'Z',
}

export interface PathSegment {
    type: PathSegmentType;
    points: Point[];
}

export interface VectorPath {
    id: string;
    segments: PathSegment[];
    closed: boolean;
    fillColor: string | null;
    strokeColor: string | null;
    strokeWidth: number;
}

// ============================================================================
// LAYER TYPES
// ============================================================================

export type LayerType =
    | 'image'
    | 'shape'
    | 'text'
    | 'group'
    | 'mask'
    | 'adjustment'
    | 'pattern'
    | 'vector';

export type BlendMode =
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity';

export interface LayerTransform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
    originX: 'left' | 'center' | 'right';
    originY: 'top' | 'center' | 'bottom';
}

export interface LayerEffects {
    dropShadow?: {
        enabled: boolean;
        color: string;
        blur: number;
        offsetX: number;
        offsetY: number;
        spread: number;
        opacity: number;
    };
    innerShadow?: {
        enabled: boolean;
        color: string;
        blur: number;
        offsetX: number;
        offsetY: number;
        opacity: number;
    };
    outerGlow?: {
        enabled: boolean;
        color: string;
        blur: number;
        spread: number;
        opacity: number;
    };
    innerGlow?: {
        enabled: boolean;
        color: string;
        blur: number;
        opacity: number;
    };
    bevelEmboss?: {
        enabled: boolean;
        style: 'outer' | 'inner' | 'emboss' | 'pillow';
        depth: number;
        size: number;
        soften: number;
        angle: number;
        altitude: number;
        highlightColor: string;
        shadowColor: string;
        highlightOpacity: number;
        shadowOpacity: number;
    };
    stroke?: {
        enabled: boolean;
        color: string;
        size: number;
        position: 'outside' | 'inside' | 'center';
        opacity: number;
    };
    gradientOverlay?: {
        enabled: boolean;
        gradient: GradientDefinition;
        blendMode: BlendMode;
        opacity: number;
    };
    patternOverlay?: {
        enabled: boolean;
        patternId: string;
        scale: number;
        opacity: number;
    };
}

export interface Layer {
    id: string;
    name: string;
    type: LayerType;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: BlendMode;
    transform: LayerTransform;
    effects: LayerEffects;
    maskId?: string;
    parentId?: string;
    children?: string[];
    data: LayerData;
    createdAt: number;
    updatedAt: number;
}

export type LayerData =
    | ImageLayerData
    | ShapeLayerData
    | TextLayerData
    | GroupLayerData
    | MaskLayerData
    | AdjustmentLayerData
    | PatternLayerData
    | VectorLayerData;

export interface ImageLayerData {
    type: 'image';
    src: string;
    width: number;
    height: number;
    cropX?: number;
    cropY?: number;
    cropWidth?: number;
    cropHeight?: number;
    filters?: ImageFilter[];
}

export interface ShapeLayerData {
    type: 'shape';
    shapeType: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line' | 'arrow';
    fill?: FillStyle;
    stroke?: StrokeStyle;
    points?: number;
    innerRadius?: number;
    cornerRadius?: number;
}

export interface TextLayerData {
    type: 'text';
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic' | 'oblique';
    textDecoration: 'none' | 'underline' | 'line-through' | 'overline';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;
    letterSpacing: number;
    fill: FillStyle;
    stroke?: StrokeStyle;
    charSpacing?: number;
    editable?: boolean;
}

export interface GroupLayerData {
    type: 'group';
    childIds: string[];
    clipContent: boolean;
}

export interface MaskLayerData {
    type: 'mask';
    maskType: 'raster' | 'vector';
    inverted: boolean;
    feather: number;
    density: number;
    imageData?: string;
    pathData?: string;
}

export interface AdjustmentLayerData {
    type: 'adjustment';
    adjustmentType: AdjustmentType;
    settings: AdjustmentSettings;
}

export interface PatternLayerData {
    type: 'pattern';
    patternId: string;
    repeatX: number;
    repeatY: number;
    offsetX: number;
    offsetY: number;
    scale: number;
    rotation: number;
}

export interface VectorLayerData {
    type: 'vector';
    pathData: string;
    fill?: FillStyle;
    stroke?: StrokeStyle;
    fillRule: 'nonzero' | 'evenodd';
}

// ============================================================================
// FILL & STROKE TYPES
// ============================================================================

export type FillType = 'solid' | 'gradient' | 'pattern' | 'none';

export interface SolidFill {
    type: 'solid';
    color: string;
}

export interface GradientFill {
    type: 'gradient';
    gradient: GradientDefinition;
}

export interface PatternFill {
    type: 'pattern';
    patternId: string;
    scale: number;
    rotation: number;
}

export interface NoFill {
    type: 'none';
}

export type FillStyle = SolidFill | GradientFill | PatternFill | NoFill;

export interface StrokeStyle {
    color: string;
    width: number;
    lineCap: 'butt' | 'round' | 'square';
    lineJoin: 'miter' | 'round' | 'bevel';
    miterLimit: number;
    dashArray?: number[];
    dashOffset?: number;
}

export type GradientType = 'linear' | 'radial' | 'conic';

export interface GradientStop {
    offset: number;
    color: string;
}

export interface GradientDefinition {
    type: GradientType;
    stops: GradientStop[];
    angle?: number;
    centerX?: number;
    centerY?: number;
    radius?: number;
    focalX?: number;
    focalY?: number;
}

// ============================================================================
// IMAGE FILTER TYPES
// ============================================================================

export type FilterType =
    | 'brightness'
    | 'contrast'
    | 'saturation'
    | 'hue'
    | 'grayscale'
    | 'sepia'
    | 'invert'
    | 'blur'
    | 'sharpen'
    | 'noise'
    | 'pixelate'
    | 'removeColor'
    | 'gamma'
    | 'vibrance'
    | 'tint'
    | 'blendColor';

export interface ImageFilter {
    type: FilterType;
    enabled: boolean;
    value: number | Record<string, unknown>;
}

// ============================================================================
// ADJUSTMENT TYPES
// ============================================================================

export type AdjustmentType =
    | 'levels'
    | 'curves'
    | 'brightness-contrast'
    | 'hue-saturation'
    | 'color-balance'
    | 'black-white'
    | 'photo-filter'
    | 'channel-mixer'
    | 'gradient-map'
    | 'posterize'
    | 'threshold'
    | 'selective-color'
    | 'vibrance'
    | 'exposure';

export interface LevelsSettings {
    type: 'levels';
    inputBlack: number;
    inputWhite: number;
    gamma: number;
    outputBlack: number;
    outputWhite: number;
    channel: 'rgb' | 'red' | 'green' | 'blue';
}

export interface CurvesSettings {
    type: 'curves';
    points: Array<{ x: number; y: number }>;
    channel: 'rgb' | 'red' | 'green' | 'blue';
}

export interface BrightnessContrastSettings {
    type: 'brightness-contrast';
    brightness: number;
    contrast: number;
    useLegacy: boolean;
}

export interface HueSaturationSettings {
    type: 'hue-saturation';
    hue: number;
    saturation: number;
    lightness: number;
    colorize: boolean;
}

export interface ColorBalanceSettings {
    type: 'color-balance';
    shadows: { cyan: number; magenta: number; yellow: number };
    midtones: { cyan: number; magenta: number; yellow: number };
    highlights: { cyan: number; magenta: number; yellow: number };
    preserveLuminosity: boolean;
}

export type AdjustmentSettings =
    | LevelsSettings
    | CurvesSettings
    | BrightnessContrastSettings
    | HueSaturationSettings
    | ColorBalanceSettings;

// ============================================================================
// CANVAS TYPES
// ============================================================================

export interface CanvasSize {
    width: number;
    height: number;
    unit: 'px' | 'in' | 'cm' | 'mm';
    dpi: number;
}

export interface CanvasSettings {
    size: CanvasSize;
    backgroundColor: string;
    backgroundTransparent: boolean;
    gridEnabled: boolean;
    gridSize: number;
    gridColor: string;
    rulersEnabled: boolean;
    guidesEnabled: boolean;
    snapToGrid: boolean;
    snapToGuides: boolean;
    snapToObjects: boolean;
}

export interface Guide {
    id: string;
    orientation: 'horizontal' | 'vertical';
    position: number;
    color?: string;
}

export interface CanvasState {
    settings: CanvasSettings;
    layers: Layer[];
    guides: Guide[];
    selectedLayerIds: string[];
    zoom: number;
    pan: { x: number; y: number };
    history: HistoryEntry[];
    historyIndex: number;
}

export interface HistoryEntry {
    id: string;
    type: string;
    name: string;
    timestamp: number;
    before: Partial<CanvasState>;
    after: Partial<CanvasState>;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export type ToolType =
    | 'select'
    | 'move'
    | 'pen'
    | 'brush'
    | 'eraser'
    | 'text'
    | 'rectangle'
    | 'ellipse'
    | 'polygon'
    | 'line'
    | 'gradient'
    | 'eyedropper'
    | 'fill'
    | 'zoom'
    | 'hand'
    | 'crop'
    | 'slice'
    | 'heal'
    | 'clone'
    | 'blur-sharpen'
    | 'dodge-burn';

export interface ToolOptions {
    select?: SelectToolOptions;
    brush?: BrushToolOptions;
    eraser?: EraserToolOptions;
    pen?: PenToolOptions;
    text?: TextToolOptions;
    shape?: ShapeToolOptions;
    gradient?: GradientToolOptions;
}

export interface SelectToolOptions {
    mode: 'object' | 'path' | 'pixel';
    addToSelection: boolean;
    subtractFromSelection: boolean;
}

export interface BrushToolOptions {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    spacing: number;
    smoothing: number;
    pressureSensitivity: boolean;
    blendMode: BlendMode;
    brushPreset?: string;
}

export interface EraserToolOptions {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    mode: 'brush' | 'pencil' | 'block';
    eraseToTransparent: boolean;
    eraseToBackground: boolean;
}

export interface PenToolOptions {
    mode: 'path' | 'shape';
    fill: FillStyle;
    stroke: StrokeStyle;
    autoClose: boolean;
    rubberBand: boolean;
}

export interface TextToolOptions {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;
    letterSpacing: number;
    fill: FillStyle;
    stroke?: StrokeStyle;
}

export interface ShapeToolOptions {
    shapeType: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line';
    fill: FillStyle;
    stroke: StrokeStyle;
    cornerRadius?: number;
    sides?: number;
    starPoints?: number;
    innerRadius?: number;
    fromCenter: boolean;
    proportional: boolean;
}

export interface GradientToolOptions {
    gradientType: GradientType;
    stops: GradientStop[];
    reverse: boolean;
    dither: boolean;
}

// ============================================================================
// BRUSH PRESETS
// ============================================================================

export interface BrushPreset {
    id: string;
    name: string;
    category: 'basic' | 'artistic' | 'special' | 'custom';
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    spacing: number;
    roundness: number;
    angle: number;
    scatter: number;
    texture?: string;
    dynamics?: BrushDynamics;
    preview?: string;
}

export interface BrushDynamics {
    sizeJitter: number;
    sizeMinimum: number;
    sizePressure: boolean;
    opacityJitter: number;
    opacityMinimum: number;
    opacityPressure: boolean;
    flowJitter: number;
    flowMinimum: number;
    flowPressure: boolean;
    scatterBoth: boolean;
    scatterCount: number;
    angleJitter: number;
    roundnessJitter: number;
}

// ============================================================================
// COLOR TYPES
// ============================================================================

export interface ColorRGB {
    r: number;
    g: number;
    b: number;
}

export interface ColorRGBA extends ColorRGB {
    a: number;
}

export interface ColorHSL {
    h: number;
    s: number;
    l: number;
}

export interface ColorHSV {
    h: number;
    s: number;
    v: number;
}

export interface ColorCMYK {
    c: number;
    m: number;
    y: number;
    k: number;
}

export interface ColorLab {
    l: number;
    a: number;
    b: number;
}

export interface PantoneColor {
    id: string;
    name: string;
    hex: string;
    rgb: ColorRGB;
    cmyk: ColorCMYK;
    lab: ColorLab;
    category: string;
    year?: number;
}

export interface ColorSwatch {
    id: string;
    name: string;
    color: string;
    source?: 'custom' | 'pantone' | 'picker' | 'imported';
}

export interface ColorPalette {
    id: string;
    name: string;
    description?: string;
    colors: ColorSwatch[];
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// TYPOGRAPHY TYPES
// ============================================================================

export interface FontInfo {
    family: string;
    displayName: string;
    category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
    weights: number[];
    styles: Array<'normal' | 'italic'>;
    source: 'google' | 'system' | 'custom';
    preview?: string;
}

export interface TextStyle {
    id: string;
    name: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    lineHeight: number;
    letterSpacing: number;
    textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    textDecoration: 'none' | 'underline' | 'line-through';
    fill: FillStyle;
    stroke?: StrokeStyle;
}

// ============================================================================
// PATTERN TYPES
// ============================================================================

export interface Pattern {
    id: string;
    name: string;
    category: 'geometric' | 'floral' | 'abstract' | 'fabric' | 'custom';
    imageData: string;
    width: number;
    height: number;
    seamless: boolean;
    repeatType: 'tile' | 'brick' | 'mirror';
    preview?: string;
    tags?: string[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'psd';

export interface ExportOptions {
    format: ExportFormat;
    quality?: number;
    scale?: number;
    width?: number;
    height?: number;
    backgroundColor?: string;
    includeMetadata?: boolean;
    embedProfile?: boolean;
    preserveLayers?: boolean;
}

export interface ExportResult {
    success: boolean;
    data?: Blob | string;
    url?: string;
    error?: string;
    filename?: string;
    size?: number;
}

// ============================================================================
// SELECTION TYPES
// ============================================================================

export type SelectionType = 'rectangle' | 'ellipse' | 'lasso' | 'polygon' | 'magic-wand' | 'color-range';

export interface Selection {
    id: string;
    type: SelectionType;
    path?: string;
    imageData?: ImageData;
    bounds: { x: number; y: number; width: number; height: number };
    feather: number;
    antiAlias: boolean;
}

// ============================================================================
// TRANSFORM TYPES
// ============================================================================

export type TransformMode = 'free' | 'scale' | 'rotate' | 'skew' | 'distort' | 'perspective' | 'warp';

export interface TransformOptions {
    mode: TransformMode;
    maintainAspectRatio: boolean;
    transformFromCenter: boolean;
    interpolation: 'nearest' | 'bilinear' | 'bicubic';
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface CanvasEvent {
    type: string;
    target?: Layer | null;
    point?: { x: number; y: number };
    delta?: { x: number; y: number };
    originalEvent?: MouseEvent | TouchEvent | KeyboardEvent;
}

export interface LayerChangeEvent {
    type: 'add' | 'remove' | 'update' | 'reorder';
    layers: Layer[];
    previousState?: Layer[];
}

export interface SelectionChangeEvent {
    type: 'change' | 'clear';
    selectedIds: string[];
    previousIds: string[];
}

// ============================================================================
// CANVAS PRESETS
// ============================================================================

export interface CanvasPreset {
    id: string;
    name: string;
    category: 'fashion' | 'print' | 'web' | 'social' | 'custom';
    width: number;
    height: number;
    unit: 'px' | 'in' | 'cm' | 'mm';
    dpi: number;
    description?: string;
}

export const FASHION_PRESETS: CanvasPreset[] = [
    { id: 'tech-pack-a4', name: 'Tech Pack A4', category: 'fashion', width: 210, height: 297, unit: 'mm', dpi: 300, description: 'Standard A4 tech pack layout' },
    { id: 'tech-pack-letter', name: 'Tech Pack Letter', category: 'fashion', width: 8.5, height: 11, unit: 'in', dpi: 300, description: 'US Letter tech pack layout' },
    { id: 'fashion-sketch', name: 'Fashion Sketch', category: 'fashion', width: 2000, height: 3000, unit: 'px', dpi: 300, description: 'Vertical fashion illustration' },
    { id: 'flat-sketch', name: 'Flat Sketch', category: 'fashion', width: 1500, height: 1500, unit: 'px', dpi: 300, description: 'Square flat technical drawing' },
    { id: 'mood-board', name: 'Mood Board', category: 'fashion', width: 3000, height: 2000, unit: 'px', dpi: 150, description: 'Horizontal mood board layout' },
    { id: 'fabric-swatch', name: 'Fabric Swatch', category: 'fashion', width: 500, height: 500, unit: 'px', dpi: 300, description: 'Square fabric swatch tile' },
    { id: 'pattern-repeat', name: 'Pattern Repeat', category: 'fashion', width: 1000, height: 1000, unit: 'px', dpi: 300, description: 'Seamless pattern tile' },
    { id: 'lookbook-page', name: 'Lookbook Page', category: 'fashion', width: 8.5, height: 11, unit: 'in', dpi: 300, description: 'Lookbook spread page' },
];

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
    size: {
        width: 2000,
        height: 2000,
        unit: 'px',
        dpi: 300,
    },
    backgroundColor: '#ffffff',
    backgroundTransparent: false,
    gridEnabled: false,
    gridSize: 50,
    gridColor: '#e0e0e0',
    rulersEnabled: true,
    guidesEnabled: true,
    snapToGrid: false,
    snapToGuides: true,
    snapToObjects: true,
};

export const DEFAULT_LAYER_TRANSFORM: LayerTransform = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    originX: 'center',
    originY: 'center',
};

export const DEFAULT_LAYER_EFFECTS: LayerEffects = {};

export const DEFAULT_STROKE_STYLE: StrokeStyle = {
    color: '#000000',
    width: 1,
    lineCap: 'round',
    lineJoin: 'round',
    miterLimit: 10,
};

export const DEFAULT_BRUSH_OPTIONS: BrushToolOptions = {
    size: 20,
    hardness: 100,
    opacity: 100,
    flow: 100,
    spacing: 25,
    smoothing: 50,
    pressureSensitivity: true,
    blendMode: 'normal',
};

export const DEFAULT_TEXT_OPTIONS: TextToolOptions = {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textAlign: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    fill: { type: 'solid', color: '#000000' },
};

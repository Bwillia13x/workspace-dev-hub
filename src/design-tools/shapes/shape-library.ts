/**
 * Shape Library - Fashion-specific shapes and trim library
 *
 * Provides:
 * - Button shapes (2-hole, 4-hole, shank, snap)
 * - Zipper components (teeth, slider, pull tab)
 * - Fasteners (hooks, eyes, buckles)
 * - Trim elements (ribbon, lace, piping)
 * - Garment construction shapes
 * - Technical flat sketch symbols
 */

import {
    Point,
    FillStyle,
    StrokeStyle,
    VectorPath,
    PathSegment,
    PathSegmentType,
} from '../types';

// ============================================================================
// Shape Category Types
// ============================================================================

export type ShapeCategory =
    | 'buttons'
    | 'zippers'
    | 'fasteners'
    | 'trim'
    | 'construction'
    | 'annotations'
    | 'basic';

export interface ShapeDefinition {
    id: string;
    name: string;
    category: ShapeCategory;
    description: string;
    tags: string[];
    defaultWidth: number;
    defaultHeight: number;
    generatePath: (width: number, height: number, options?: ShapeOptions) => VectorPath;
    previewPath?: string; // SVG path for preview
}

export interface ShapeOptions {
    fill?: FillStyle;
    stroke?: StrokeStyle;
    cornerRadius?: number;
    holes?: number;
    teethCount?: number;
    rotation?: number;
    variant?: string;
}

export interface ShapeInstance {
    id: string;
    definitionId: string;
    position: Point;
    width: number;
    height: number;
    rotation: number;
    fill: FillStyle;
    stroke: StrokeStyle;
    options: ShapeOptions;
    path: VectorPath;
}

// ============================================================================
// Shape Library Events
// ============================================================================

export interface ShapeLibraryEvents {
    'shape:created': { instance: ShapeInstance };
    'shape:updated': { instance: ShapeInstance };
    'shape:deleted': { instanceId: string };
    'definition:added': { definition: ShapeDefinition };
}

type ShapeEventCallback<K extends keyof ShapeLibraryEvents> = (data: ShapeLibraryEvents[K]) => void;

// ============================================================================
// Built-in Shape Definitions
// ============================================================================

const BUTTON_SHAPES: ShapeDefinition[] = [
    {
        id: 'button-2hole',
        name: '2-Hole Button',
        category: 'buttons',
        description: 'Classic 2-hole sew-through button',
        tags: ['button', 'fastener', 'sew-through'],
        defaultWidth: 40,
        defaultHeight: 40,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.min(width, height) / 2;
            const holeRadius = r * 0.15;
            const holeSpacing = r * 0.35;

            return createCircleWithHoles(cx, cy, r, [
                { x: cx - holeSpacing, y: cy, radius: holeRadius },
                { x: cx + holeSpacing, y: cy, radius: holeRadius },
            ]);
        },
    },
    {
        id: 'button-4hole',
        name: '4-Hole Button',
        category: 'buttons',
        description: 'Classic 4-hole sew-through button',
        tags: ['button', 'fastener', 'sew-through'],
        defaultWidth: 40,
        defaultHeight: 40,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.min(width, height) / 2;
            const holeRadius = r * 0.12;
            const holeSpacing = r * 0.3;

            return createCircleWithHoles(cx, cy, r, [
                { x: cx - holeSpacing, y: cy - holeSpacing, radius: holeRadius },
                { x: cx + holeSpacing, y: cy - holeSpacing, radius: holeRadius },
                { x: cx - holeSpacing, y: cy + holeSpacing, radius: holeRadius },
                { x: cx + holeSpacing, y: cy + holeSpacing, radius: holeRadius },
            ]);
        },
    },
    {
        id: 'button-shank',
        name: 'Shank Button',
        category: 'buttons',
        description: 'Button with back shank for attachment',
        tags: ['button', 'fastener', 'shank'],
        defaultWidth: 40,
        defaultHeight: 40,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.min(width, height) / 2;

            return createCircle(cx, cy, r);
        },
    },
    {
        id: 'button-snap-male',
        name: 'Snap Button (Male)',
        category: 'buttons',
        description: 'Male side of snap fastener',
        tags: ['button', 'fastener', 'snap', 'male'],
        defaultWidth: 30,
        defaultHeight: 30,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const outerR = Math.min(width, height) / 2;
            const innerR = outerR * 0.5;

            const segments: PathSegment[] = [
                ...createCircleSegments(cx, cy, outerR),
                ...createCircleSegments(cx, cy, innerR),
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'button-snap-female',
        name: 'Snap Button (Female)',
        category: 'buttons',
        description: 'Female side of snap fastener',
        tags: ['button', 'fastener', 'snap', 'female'],
        defaultWidth: 30,
        defaultHeight: 30,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const outerR = Math.min(width, height) / 2;
            const innerR = outerR * 0.6;

            const segments: PathSegment[] = [
                ...createCircleSegments(cx, cy, outerR),
                ...createCircleSegments(cx, cy, innerR),
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'button-toggle',
        name: 'Toggle Button',
        category: 'buttons',
        description: 'Elongated toggle/duffle coat button',
        tags: ['button', 'fastener', 'toggle', 'duffle'],
        defaultWidth: 60,
        defaultHeight: 20,
        generatePath: (width, height) => {
            return createRoundedRect(0, 0, width, height, height / 2);
        },
    },
];

const ZIPPER_SHAPES: ShapeDefinition[] = [
    {
        id: 'zipper-pull',
        name: 'Zipper Pull Tab',
        category: 'zippers',
        description: 'Zipper slider pull tab',
        tags: ['zipper', 'pull', 'slider'],
        defaultWidth: 15,
        defaultHeight: 30,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: width * 0.2, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.8, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.3 }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.7, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.3, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height * 0.3 }] },
                { type: PathSegmentType.CLOSE, points: [] },
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'zipper-teeth',
        name: 'Zipper Teeth',
        category: 'zippers',
        description: 'Section of zipper teeth',
        tags: ['zipper', 'teeth'],
        defaultWidth: 30,
        defaultHeight: 100,
        generatePath: (width, height, options) => {
            const teethCount = options?.teethCount ?? 10;
            const toothHeight = height / teethCount;
            const toothWidth = width * 0.3;
            const segments: PathSegment[] = [];

            // Left teeth
            segments.push({ type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] });
            for (let i = 0; i < teethCount; i++) {
                const y = i * toothHeight;
                segments.push(
                    { type: PathSegmentType.LINE, points: [{ x: toothWidth, y: y + toothHeight * 0.2 }] },
                    { type: PathSegmentType.LINE, points: [{ x: toothWidth, y: y + toothHeight * 0.8 }] },
                    { type: PathSegmentType.LINE, points: [{ x: 0, y: y + toothHeight }] }
                );
            }

            // Right teeth
            segments.push({ type: PathSegmentType.MOVE, points: [{ x: width, y: 0 }] });
            for (let i = 0; i < teethCount; i++) {
                const y = i * toothHeight;
                segments.push(
                    { type: PathSegmentType.LINE, points: [{ x: width - toothWidth, y: y + toothHeight * 0.2 }] },
                    { type: PathSegmentType.LINE, points: [{ x: width - toothWidth, y: y + toothHeight * 0.8 }] },
                    { type: PathSegmentType.LINE, points: [{ x: width, y: y + toothHeight }] }
                );
            }

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'zipper-slider',
        name: 'Zipper Slider',
        category: 'zippers',
        description: 'Zipper slider body',
        tags: ['zipper', 'slider'],
        defaultWidth: 20,
        defaultHeight: 25,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height * 0.3 }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.3, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.7, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.3 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.8 }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.5, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height * 0.8 }] },
                { type: PathSegmentType.CLOSE, points: [] },
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
];

const FASTENER_SHAPES: ShapeDefinition[] = [
    {
        id: 'hook-eye-hook',
        name: 'Hook (Hook & Eye)',
        category: 'fasteners',
        description: 'Hook part of hook and eye closure',
        tags: ['hook', 'fastener', 'closure'],
        defaultWidth: 20,
        defaultHeight: 30,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: width * 0.2, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.2, y: height * 0.6 }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: width * 0.2, y: height * 0.9 },
                        { x: width * 0.8, y: height * 0.9 },
                        { x: width * 0.8, y: height * 0.7 },
                    ],
                },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: width * 0.8, y: height * 0.5 },
                        { x: width * 0.5, y: height * 0.5 },
                        { x: width * 0.5, y: height * 0.6 },
                    ],
                },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 2,
            };
        },
    },
    {
        id: 'hook-eye-eye',
        name: 'Eye (Hook & Eye)',
        category: 'fasteners',
        description: 'Eye part of hook and eye closure',
        tags: ['eye', 'fastener', 'closure'],
        defaultWidth: 15,
        defaultHeight: 20,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const rx = width * 0.4;
            const ry = height * 0.35;

            return createEllipse(cx, cy, rx, ry);
        },
    },
    {
        id: 'buckle-rectangle',
        name: 'Rectangle Buckle',
        category: 'fasteners',
        description: 'Classic rectangular belt buckle',
        tags: ['buckle', 'belt', 'fastener'],
        defaultWidth: 50,
        defaultHeight: 35,
        generatePath: (width, height) => {
            const borderWidth = 5;
            const segments: PathSegment[] = [
                // Outer rectangle
                ...createRectSegments(0, 0, width, height),
                // Inner rectangle (hole)
                ...createRectSegments(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2),
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'buckle-d-ring',
        name: 'D-Ring Buckle',
        category: 'fasteners',
        description: 'D-shaped ring buckle',
        tags: ['d-ring', 'buckle', 'belt', 'fastener'],
        defaultWidth: 40,
        defaultHeight: 30,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: width * 0.3, y: height }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: width, y: height },
                        { x: width, y: 0 },
                        { x: width * 0.3, y: 0 },
                    ],
                },
                { type: PathSegmentType.CLOSE, points: [] },
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 2,
            };
        },
    },
    {
        id: 'grommet',
        name: 'Grommet/Eyelet',
        category: 'fasteners',
        description: 'Metal eyelet for lacing',
        tags: ['grommet', 'eyelet', 'lacing'],
        defaultWidth: 20,
        defaultHeight: 20,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const outerR = Math.min(width, height) / 2;
            const innerR = outerR * 0.5;

            const segments: PathSegment[] = [
                ...createCircleSegments(cx, cy, outerR),
                ...createCircleSegments(cx, cy, innerR),
            ];

            return {
                id: generateId(),
                segments,
                closed: true,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'velcro-loop',
        name: 'Velcro (Loop Side)',
        category: 'fasteners',
        description: 'Velcro loop/soft side symbol',
        tags: ['velcro', 'hook-loop', 'fastener'],
        defaultWidth: 60,
        defaultHeight: 20,
        generatePath: (width, height) => {
            const segments: PathSegment[] = createRectSegments(0, 0, width, height);

            // Add loop pattern
            const loopCount = 6;
            const loopWidth = width / loopCount;
            for (let i = 0; i < loopCount; i++) {
                const x = i * loopWidth + loopWidth * 0.5;
                segments.push(
                    { type: PathSegmentType.MOVE, points: [{ x, y: height * 0.3 }] },
                    {
                        type: PathSegmentType.BEZIER,
                        points: [
                            { x: x - loopWidth * 0.2, y: height * 0.7 },
                            { x: x + loopWidth * 0.2, y: height * 0.7 },
                            { x, y: height * 0.3 },
                        ],
                    }
                );
            }

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
];

const TRIM_SHAPES: ShapeDefinition[] = [
    {
        id: 'ribbon-bow',
        name: 'Ribbon Bow',
        category: 'trim',
        description: 'Decorative ribbon bow',
        tags: ['ribbon', 'bow', 'decoration'],
        defaultWidth: 60,
        defaultHeight: 40,
        generatePath: (width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const loopW = width * 0.35;
            const loopH = height * 0.4;

            const segments: PathSegment[] = [
                // Left loop
                { type: PathSegmentType.MOVE, points: [{ x: cx, y: cy }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: cx - loopW, y: cy - loopH },
                        { x: cx - loopW * 1.5, y: cy + loopH },
                        { x: cx, y: cy },
                    ],
                },
                // Right loop
                { type: PathSegmentType.MOVE, points: [{ x: cx, y: cy }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: cx + loopW, y: cy - loopH },
                        { x: cx + loopW * 1.5, y: cy + loopH },
                        { x: cx, y: cy },
                    ],
                },
                // Center knot
                ...createCircleSegments(cx, cy, width * 0.08),
                // Tails
                { type: PathSegmentType.MOVE, points: [{ x: cx - 5, y: cy + 5 }] },
                { type: PathSegmentType.LINE, points: [{ x: cx - 10, y: height }] },
                { type: PathSegmentType.MOVE, points: [{ x: cx + 5, y: cy + 5 }] },
                { type: PathSegmentType.LINE, points: [{ x: cx + 10, y: height }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1.5,
            };
        },
    },
    {
        id: 'lace-edge',
        name: 'Lace Edge',
        category: 'trim',
        description: 'Scalloped lace edge pattern',
        tags: ['lace', 'trim', 'edge', 'scallop'],
        defaultWidth: 100,
        defaultHeight: 20,
        generatePath: (width, height) => {
            const scallops = 5;
            const scallopWidth = width / scallops;
            const segments: PathSegment[] = [];

            segments.push({ type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] });
            segments.push({ type: PathSegmentType.LINE, points: [{ x: 0, y: height * 0.3 }] });

            for (let i = 0; i < scallops; i++) {
                const x1 = i * scallopWidth;
                const x2 = (i + 0.5) * scallopWidth;
                const x3 = (i + 1) * scallopWidth;

                segments.push({
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: x1 + scallopWidth * 0.1, y: height },
                        { x: x2, y: height },
                        { x: x3 - scallopWidth * 0.1, y: height * 0.3 },
                    ],
                });
            }

            segments.push({ type: PathSegmentType.LINE, points: [{ x: width, y: 0 }] });

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'piping',
        name: 'Piping',
        category: 'trim',
        description: 'Piping/welt cord section',
        tags: ['piping', 'welt', 'cord', 'trim'],
        defaultWidth: 100,
        defaultHeight: 10,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height * 0.3 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.3 }] },
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height * 0.7 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.7 }] },
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height * 0.5 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.5 }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
];

const CONSTRUCTION_SHAPES: ShapeDefinition[] = [
    {
        id: 'dart',
        name: 'Dart',
        category: 'construction',
        description: 'Sewing dart symbol',
        tags: ['dart', 'sewing', 'construction'],
        defaultWidth: 30,
        defaultHeight: 80,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width / 2, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: 0 }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'pleat',
        name: 'Pleat',
        category: 'construction',
        description: 'Pleat fold symbol',
        tags: ['pleat', 'fold', 'construction'],
        defaultWidth: 40,
        defaultHeight: 60,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                // Outer lines
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height }] },
                { type: PathSegmentType.MOVE, points: [{ x: width, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height }] },
                // Fold indicators
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height * 0.3 }] },
                { type: PathSegmentType.LINE, points: [{ x: width / 2, y: height * 0.5 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height * 0.3 }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'grain-line',
        name: 'Grain Line',
        category: 'construction',
        description: 'Fabric grain direction indicator',
        tags: ['grain', 'direction', 'pattern'],
        defaultWidth: 10,
        defaultHeight: 100,
        generatePath: (width, height) => {
            const arrowSize = 10;
            const segments: PathSegment[] = [
                // Main line
                { type: PathSegmentType.MOVE, points: [{ x: width / 2, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width / 2, y: height }] },
                // Top arrow
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: arrowSize }] },
                { type: PathSegmentType.LINE, points: [{ x: width / 2, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: arrowSize }] },
                // Bottom arrow
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height - arrowSize }] },
                { type: PathSegmentType.LINE, points: [{ x: width / 2, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height - arrowSize }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1.5,
            };
        },
    },
    {
        id: 'notch',
        name: 'Notch',
        category: 'construction',
        description: 'Pattern matching notch',
        tags: ['notch', 'pattern', 'matching'],
        defaultWidth: 10,
        defaultHeight: 15,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width / 2, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: 0 }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'seam-allowance',
        name: 'Seam Allowance',
        category: 'construction',
        description: 'Seam allowance indicator',
        tags: ['seam', 'allowance', 'construction'],
        defaultWidth: 80,
        defaultHeight: 20,
        generatePath: (width, height) => {
            const segments: PathSegment[] = [
                // Main seam line (solid)
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height }] },
                // Cut line (dashed - represented as dots)
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: 0 }] },
                // Connection lines
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height }] },
                { type: PathSegmentType.MOVE, points: [{ x: width, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
];

const ANNOTATION_SHAPES: ShapeDefinition[] = [
    {
        id: 'dimension-horizontal',
        name: 'Horizontal Dimension',
        category: 'annotations',
        description: 'Horizontal measurement annotation',
        tags: ['dimension', 'measurement', 'horizontal'],
        defaultWidth: 100,
        defaultHeight: 20,
        generatePath: (width, height) => {
            const arrowSize = 8;
            const segments: PathSegment[] = [
                // Main line
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height / 2 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height / 2 }] },
                // Left arrow
                { type: PathSegmentType.MOVE, points: [{ x: arrowSize, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height / 2 }] },
                { type: PathSegmentType.LINE, points: [{ x: arrowSize, y: height }] },
                // Right arrow
                { type: PathSegmentType.MOVE, points: [{ x: width - arrowSize, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height / 2 }] },
                { type: PathSegmentType.LINE, points: [{ x: width - arrowSize, y: height }] },
                // Extension lines
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: 0, y: height }] },
                { type: PathSegmentType.MOVE, points: [{ x: width, y: 0 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
    {
        id: 'callout-arrow',
        name: 'Callout Arrow',
        category: 'annotations',
        description: 'Annotation callout with arrow',
        tags: ['callout', 'arrow', 'annotation'],
        defaultWidth: 60,
        defaultHeight: 40,
        generatePath: (width, height) => {
            const arrowSize = 10;
            const segments: PathSegment[] = [
                // Arrow
                { type: PathSegmentType.MOVE, points: [{ x: 0, y: height / 2 }] },
                { type: PathSegmentType.LINE, points: [{ x: arrowSize, y: height / 2 - arrowSize / 2 }] },
                { type: PathSegmentType.LINE, points: [{ x: arrowSize, y: height / 2 + arrowSize / 2 }] },
                { type: PathSegmentType.CLOSE, points: [] },
                // Line
                { type: PathSegmentType.MOVE, points: [{ x: arrowSize, y: height / 2 }] },
                { type: PathSegmentType.LINE, points: [{ x: width, y: height / 2 }] },
            ];

            return {
                id: generateId(),
                segments,
                closed: false,
                fillColor: null,
                strokeColor: '#000000',
                strokeWidth: 1,
            };
        },
    },
];

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createCircle(cx: number, cy: number, r: number): VectorPath {
    return {
        id: generateId(),
        segments: createCircleSegments(cx, cy, r),
        closed: true,
        fillColor: null,
        strokeColor: '#000000',
        strokeWidth: 1,
    };
}

function createCircleSegments(cx: number, cy: number, r: number): PathSegment[] {
    const k = 0.5522847498;
    return [
        { type: PathSegmentType.MOVE, points: [{ x: cx, y: cy - r }] },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx + r * k, y: cy - r },
                { x: cx + r, y: cy - r * k },
                { x: cx + r, y: cy },
            ],
        },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx + r, y: cy + r * k },
                { x: cx + r * k, y: cy + r },
                { x: cx, y: cy + r },
            ],
        },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx - r * k, y: cy + r },
                { x: cx - r, y: cy + r * k },
                { x: cx - r, y: cy },
            ],
        },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx - r, y: cy - r * k },
                { x: cx - r * k, y: cy - r },
                { x: cx, y: cy - r },
            ],
        },
        { type: PathSegmentType.CLOSE, points: [] },
    ];
}

function createCircleWithHoles(
    cx: number,
    cy: number,
    r: number,
    holes: Array<{ x: number; y: number; radius: number }>
): VectorPath {
    const segments: PathSegment[] = [
        ...createCircleSegments(cx, cy, r),
        ...holes.flatMap(hole => createCircleSegments(hole.x, hole.y, hole.radius)),
    ];

    return {
        id: generateId(),
        segments,
        closed: true,
        fillColor: null,
        strokeColor: '#000000',
        strokeWidth: 1,
    };
}

function createEllipse(cx: number, cy: number, rx: number, ry: number): VectorPath {
    const k = 0.5522847498;
    const segments: PathSegment[] = [
        { type: PathSegmentType.MOVE, points: [{ x: cx, y: cy - ry }] },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx + rx * k, y: cy - ry },
                { x: cx + rx, y: cy - ry * k },
                { x: cx + rx, y: cy },
            ],
        },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx + rx, y: cy + ry * k },
                { x: cx + rx * k, y: cy + ry },
                { x: cx, y: cy + ry },
            ],
        },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx - rx * k, y: cy + ry },
                { x: cx - rx, y: cy + ry * k },
                { x: cx - rx, y: cy },
            ],
        },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: cx - rx, y: cy - ry * k },
                { x: cx - rx * k, y: cy - ry },
                { x: cx, y: cy - ry },
            ],
        },
        { type: PathSegmentType.CLOSE, points: [] },
    ];

    return {
        id: generateId(),
        segments,
        closed: true,
        fillColor: null,
        strokeColor: '#000000',
        strokeWidth: 1,
    };
}

function createRectSegments(x: number, y: number, width: number, height: number): PathSegment[] {
    return [
        { type: PathSegmentType.MOVE, points: [{ x, y }] },
        { type: PathSegmentType.LINE, points: [{ x: x + width, y }] },
        { type: PathSegmentType.LINE, points: [{ x: x + width, y: y + height }] },
        { type: PathSegmentType.LINE, points: [{ x, y: y + height }] },
        { type: PathSegmentType.CLOSE, points: [] },
    ];
}

function createRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): VectorPath {
    const r = Math.min(radius, width / 2, height / 2);
    const k = 0.5522847498;

    const segments: PathSegment[] = [
        { type: PathSegmentType.MOVE, points: [{ x: x + r, y }] },
        { type: PathSegmentType.LINE, points: [{ x: x + width - r, y }] },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: x + width - r + r * k, y },
                { x: x + width, y: y + r - r * k },
                { x: x + width, y: y + r },
            ],
        },
        { type: PathSegmentType.LINE, points: [{ x: x + width, y: y + height - r }] },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: x + width, y: y + height - r + r * k },
                { x: x + width - r + r * k, y: y + height },
                { x: x + width - r, y: y + height },
            ],
        },
        { type: PathSegmentType.LINE, points: [{ x: x + r, y: y + height }] },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x: x + r - r * k, y: y + height },
                { x, y: y + height - r + r * k },
                { x, y: y + height - r },
            ],
        },
        { type: PathSegmentType.LINE, points: [{ x, y: y + r }] },
        {
            type: PathSegmentType.BEZIER,
            points: [
                { x, y: y + r - r * k },
                { x: x + r - r * k, y },
                { x: x + r, y },
            ],
        },
        { type: PathSegmentType.CLOSE, points: [] },
    ];

    return {
        id: generateId(),
        segments,
        closed: true,
        fillColor: null,
        strokeColor: '#000000',
        strokeWidth: 1,
    };
}

// ============================================================================
// Shape Library Manager
// ============================================================================

export class ShapeLibraryManager {
    private definitions: Map<string, ShapeDefinition> = new Map();
    private instances: Map<string, ShapeInstance> = new Map();
    private eventListeners: Map<string, Set<ShapeEventCallback<keyof ShapeLibraryEvents>>> = new Map();

    constructor() {
        // Load built-in shapes
        this.loadBuiltInShapes();
    }

    // ========================================================================
    // Event System
    // ========================================================================

    on<K extends keyof ShapeLibraryEvents>(
        event: K,
        callback: ShapeEventCallback<K>
    ): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback as ShapeEventCallback<keyof ShapeLibraryEvents>);
        return () => this.off(event, callback);
    }

    off<K extends keyof ShapeLibraryEvents>(
        event: K,
        callback: ShapeEventCallback<K>
    ): void {
        this.eventListeners.get(event)?.delete(callback as ShapeEventCallback<keyof ShapeLibraryEvents>);
    }

    private emit<K extends keyof ShapeLibraryEvents>(
        event: K,
        data: ShapeLibraryEvents[K]
    ): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in shape library event listener for ${event}:`, error);
            }
        });
    }

    // ========================================================================
    // Shape Definition Management
    // ========================================================================

    private loadBuiltInShapes(): void {
        const allShapes = [
            ...BUTTON_SHAPES,
            ...ZIPPER_SHAPES,
            ...FASTENER_SHAPES,
            ...TRIM_SHAPES,
            ...CONSTRUCTION_SHAPES,
            ...ANNOTATION_SHAPES,
        ];

        for (const shape of allShapes) {
            this.definitions.set(shape.id, shape);
        }
    }

    /**
     * Get all shape definitions
     */
    getAllDefinitions(): ShapeDefinition[] {
        return Array.from(this.definitions.values());
    }

    /**
     * Get definitions by category
     */
    getDefinitionsByCategory(category: ShapeCategory): ShapeDefinition[] {
        return this.getAllDefinitions().filter(d => d.category === category);
    }

    /**
     * Search definitions by tag
     */
    searchDefinitions(query: string): ShapeDefinition[] {
        const lowerQuery = query.toLowerCase();
        return this.getAllDefinitions().filter(
            d =>
                d.name.toLowerCase().includes(lowerQuery) ||
                d.description.toLowerCase().includes(lowerQuery) ||
                d.tags.some(t => t.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Get a specific definition
     */
    getDefinition(id: string): ShapeDefinition | undefined {
        return this.definitions.get(id);
    }

    /**
     * Add a custom shape definition
     */
    addCustomDefinition(definition: ShapeDefinition): void {
        this.definitions.set(definition.id, definition);
        this.emit('definition:added', { definition });
    }

    // ========================================================================
    // Shape Instance Management
    // ========================================================================

    /**
     * Create a shape instance from a definition
     */
    createInstance(
        definitionId: string,
        position: Point,
        options: {
            width?: number;
            height?: number;
            fill?: FillStyle;
            stroke?: StrokeStyle;
            rotation?: number;
            shapeOptions?: ShapeOptions;
        } = {}
    ): ShapeInstance | null {
        const definition = this.definitions.get(definitionId);
        if (!definition) return null;

        const width = options.width ?? definition.defaultWidth;
        const height = options.height ?? definition.defaultHeight;

        const fill = options.fill ?? { type: 'none' as const };
        const stroke = options.stroke ?? {
            color: '#000000',
            width: 1,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            miterLimit: 10,
        };

        const path = definition.generatePath(width, height, options.shapeOptions);

        const instance: ShapeInstance = {
            id: generateId(),
            definitionId,
            position,
            width,
            height,
            rotation: options.rotation ?? 0,
            fill,
            stroke,
            options: options.shapeOptions ?? {},
            path,
        };

        this.instances.set(instance.id, instance);
        this.emit('shape:created', { instance });

        return instance;
    }

    /**
     * Get a shape instance
     */
    getInstance(id: string): ShapeInstance | undefined {
        return this.instances.get(id);
    }

    /**
     * Get all shape instances
     */
    getAllInstances(): ShapeInstance[] {
        return Array.from(this.instances.values());
    }

    /**
     * Update a shape instance
     */
    updateInstance(
        id: string,
        changes: Partial<Omit<ShapeInstance, 'id' | 'definitionId' | 'path'>>
    ): void {
        const instance = this.instances.get(id);
        if (!instance) return;

        // Update properties
        if (changes.position) instance.position = changes.position;
        if (changes.width !== undefined) instance.width = changes.width;
        if (changes.height !== undefined) instance.height = changes.height;
        if (changes.rotation !== undefined) instance.rotation = changes.rotation;
        if (changes.fill) instance.fill = changes.fill;
        if (changes.stroke) instance.stroke = changes.stroke;
        if (changes.options) instance.options = { ...instance.options, ...changes.options };

        // Regenerate path if size changed
        if (changes.width !== undefined || changes.height !== undefined || changes.options) {
            const definition = this.definitions.get(instance.definitionId);
            if (definition) {
                instance.path = definition.generatePath(instance.width, instance.height, instance.options);
            }
        }

        this.emit('shape:updated', { instance });
    }

    /**
     * Delete a shape instance
     */
    deleteInstance(id: string): boolean {
        if (this.instances.has(id)) {
            this.instances.delete(id);
            this.emit('shape:deleted', { instanceId: id });
            return true;
        }
        return false;
    }

    /**
     * Duplicate a shape instance
     */
    duplicateInstance(id: string, offset: Point = { x: 20, y: 20 }): ShapeInstance | null {
        const original = this.instances.get(id);
        if (!original) return null;

        return this.createInstance(original.definitionId, {
            x: original.position.x + offset.x,
            y: original.position.y + offset.y,
        }, {
            width: original.width,
            height: original.height,
            fill: original.fill,
            stroke: original.stroke,
            rotation: original.rotation,
            shapeOptions: original.options,
        });
    }

    /**
     * Clear all instances
     */
    clearInstances(): void {
        for (const id of this.instances.keys()) {
            this.emit('shape:deleted', { instanceId: id });
        }
        this.instances.clear();
    }

    /**
     * Get all categories
     */
    getCategories(): ShapeCategory[] {
        return ['buttons', 'zippers', 'fasteners', 'trim', 'construction', 'annotations', 'basic'];
    }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createShapeLibraryManager(): ShapeLibraryManager {
    return new ShapeLibraryManager();
}

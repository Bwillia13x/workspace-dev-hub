/**
 * Pose Control System
 *
 * Generate garments on specific model poses with OpenPose-style
 * pose definitions and natural language pose descriptions.
 */

/**
 * Body joint definitions (OpenPose-compatible)
 */
export type JointName =
    | 'nose'
    | 'neck'
    | 'right_shoulder'
    | 'right_elbow'
    | 'right_wrist'
    | 'left_shoulder'
    | 'left_elbow'
    | 'left_wrist'
    | 'right_hip'
    | 'right_knee'
    | 'right_ankle'
    | 'left_hip'
    | 'left_knee'
    | 'left_ankle'
    | 'right_eye'
    | 'left_eye'
    | 'right_ear'
    | 'left_ear';

/**
 * 2D point with optional confidence
 */
export interface Point2D {
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
    confidence?: number; // 0-1
}

/**
 * Full body pose definition
 */
export interface BodyPose {
    /** Pose identifier */
    id: string;
    /** Pose name */
    name: string;
    /** Joint positions */
    joints: Partial<Record<JointName, Point2D>>;
    /** View angle */
    viewAngle: 'front' | 'back' | 'side' | 'three-quarter';
    /** Description for AI */
    description: string;
}

/**
 * Pose category
 */
export type PoseCategory =
    | 'standing'
    | 'walking'
    | 'sitting'
    | 'dynamic'
    | 'editorial'
    | 'runway';

/**
 * Pre-defined pose preset
 */
export interface PosePreset {
    /** Preset ID */
    id: string;
    /** Preset name */
    name: string;
    /** Category */
    category: PoseCategory;
    /** Full pose definition */
    pose: BodyPose;
    /** Preview thumbnail (base64 or URL) */
    thumbnail?: string;
    /** Best for these garment types */
    bestFor: string[];
}

/**
 * Model characteristics
 */
export interface ModelCharacteristics {
    /** Body type description */
    bodyType?: 'slim' | 'athletic' | 'curvy' | 'petite' | 'plus-size';
    /** Height description */
    height?: 'petite' | 'average' | 'tall';
    /** Skin tone */
    skinTone?: string;
    /** Hair style */
    hairStyle?: string;
    /** Hair color */
    hairColor?: string;
    /** Age range */
    ageRange?: 'young' | 'adult' | 'mature';
    /** Gender presentation */
    gender?: 'feminine' | 'masculine' | 'androgynous';
}

/**
 * Pre-defined pose presets
 */
export const POSE_PRESETS: PosePreset[] = [
    // Standing poses
    {
        id: 'standing-front',
        name: 'Standing Front',
        category: 'standing',
        pose: {
            id: 'standing-front',
            name: 'Standing Front',
            joints: {
                nose: { x: 0.5, y: 0.1 },
                neck: { x: 0.5, y: 0.15 },
                right_shoulder: { x: 0.35, y: 0.2 },
                left_shoulder: { x: 0.65, y: 0.2 },
                right_elbow: { x: 0.3, y: 0.35 },
                left_elbow: { x: 0.7, y: 0.35 },
                right_wrist: { x: 0.3, y: 0.5 },
                left_wrist: { x: 0.7, y: 0.5 },
                right_hip: { x: 0.4, y: 0.5 },
                left_hip: { x: 0.6, y: 0.5 },
                right_knee: { x: 0.4, y: 0.7 },
                left_knee: { x: 0.6, y: 0.7 },
                right_ankle: { x: 0.4, y: 0.9 },
                left_ankle: { x: 0.6, y: 0.9 },
            },
            viewAngle: 'front',
            description:
                'model standing straight, facing camera, arms relaxed at sides',
        },
        bestFor: ['all garments', 'full-length', 'product shots'],
    },
    {
        id: 'standing-three-quarter',
        name: 'Three-Quarter View',
        category: 'standing',
        pose: {
            id: 'standing-three-quarter',
            name: 'Three-Quarter View',
            joints: {
                nose: { x: 0.45, y: 0.1 },
                neck: { x: 0.48, y: 0.15 },
                right_shoulder: { x: 0.3, y: 0.2 },
                left_shoulder: { x: 0.6, y: 0.22 },
                right_elbow: { x: 0.25, y: 0.35 },
                left_elbow: { x: 0.65, y: 0.38 },
                right_wrist: { x: 0.28, y: 0.5 },
                left_wrist: { x: 0.62, y: 0.52 },
                right_hip: { x: 0.38, y: 0.5 },
                left_hip: { x: 0.58, y: 0.52 },
                right_knee: { x: 0.38, y: 0.7 },
                left_knee: { x: 0.58, y: 0.72 },
                right_ankle: { x: 0.38, y: 0.9 },
                left_ankle: { x: 0.58, y: 0.92 },
            },
            viewAngle: 'three-quarter',
            description:
                'model at three-quarter angle, body slightly turned, elegant stance',
        },
        bestFor: ['dresses', 'coats', 'blazers', 'editorial'],
    },
    {
        id: 'standing-back',
        name: 'Back View',
        category: 'standing',
        pose: {
            id: 'standing-back',
            name: 'Back View',
            joints: {
                neck: { x: 0.5, y: 0.15 },
                right_shoulder: { x: 0.65, y: 0.2 },
                left_shoulder: { x: 0.35, y: 0.2 },
                right_hip: { x: 0.6, y: 0.5 },
                left_hip: { x: 0.4, y: 0.5 },
                right_ankle: { x: 0.6, y: 0.9 },
                left_ankle: { x: 0.4, y: 0.9 },
            },
            viewAngle: 'back',
            description:
                'model from behind, showing back of garment, shoulders squared',
        },
        bestFor: ['back details', 'dresses with back interest', 'gowns'],
    },
    // Walking poses
    {
        id: 'walking-runway',
        name: 'Runway Walk',
        category: 'runway',
        pose: {
            id: 'walking-runway',
            name: 'Runway Walk',
            joints: {
                nose: { x: 0.5, y: 0.1 },
                neck: { x: 0.5, y: 0.15 },
                right_shoulder: { x: 0.38, y: 0.2 },
                left_shoulder: { x: 0.62, y: 0.2 },
                right_elbow: { x: 0.32, y: 0.32 },
                left_elbow: { x: 0.68, y: 0.35 },
                right_wrist: { x: 0.35, y: 0.45 },
                left_wrist: { x: 0.68, y: 0.48 },
                right_hip: { x: 0.42, y: 0.5 },
                left_hip: { x: 0.58, y: 0.52 },
                right_knee: { x: 0.38, y: 0.68 },
                left_knee: { x: 0.55, y: 0.72 },
                right_ankle: { x: 0.35, y: 0.88 },
                left_ankle: { x: 0.52, y: 0.92 },
            },
            viewAngle: 'front',
            description:
                'model in mid-stride runway walk, confident posture, one leg forward',
        },
        bestFor: ['runway looks', 'dynamic shots', 'flowing garments'],
    },
    {
        id: 'walking-casual',
        name: 'Casual Walk',
        category: 'walking',
        pose: {
            id: 'walking-casual',
            name: 'Casual Walk',
            joints: {
                nose: { x: 0.48, y: 0.1 },
                neck: { x: 0.49, y: 0.15 },
                right_shoulder: { x: 0.36, y: 0.2 },
                left_shoulder: { x: 0.62, y: 0.21 },
                right_elbow: { x: 0.32, y: 0.34 },
                left_elbow: { x: 0.66, y: 0.32 },
                right_wrist: { x: 0.38, y: 0.48 },
                left_wrist: { x: 0.58, y: 0.45 },
                right_hip: { x: 0.42, y: 0.5 },
                left_hip: { x: 0.58, y: 0.51 },
                right_knee: { x: 0.4, y: 0.7 },
                left_knee: { x: 0.56, y: 0.68 },
                right_ankle: { x: 0.38, y: 0.9 },
                left_ankle: { x: 0.58, y: 0.88 },
            },
            viewAngle: 'three-quarter',
            description:
                'model walking naturally, relaxed stride, arms swinging naturally',
        },
        bestFor: ['casual wear', 'street style', 'everyday looks'],
    },
    // Dynamic poses
    {
        id: 'dynamic-arm-hip',
        name: 'Hand on Hip',
        category: 'editorial',
        pose: {
            id: 'dynamic-arm-hip',
            name: 'Hand on Hip',
            joints: {
                nose: { x: 0.5, y: 0.1 },
                neck: { x: 0.5, y: 0.15 },
                right_shoulder: { x: 0.35, y: 0.2 },
                left_shoulder: { x: 0.65, y: 0.2 },
                right_elbow: { x: 0.25, y: 0.35 },
                left_elbow: { x: 0.6, y: 0.35 },
                right_wrist: { x: 0.32, y: 0.5 },
                left_wrist: { x: 0.55, y: 0.48 },
                right_hip: { x: 0.42, y: 0.5 },
                left_hip: { x: 0.58, y: 0.5 },
                right_knee: { x: 0.42, y: 0.72 },
                left_knee: { x: 0.56, y: 0.7 },
                right_ankle: { x: 0.42, y: 0.9 },
                left_ankle: { x: 0.58, y: 0.9 },
            },
            viewAngle: 'front',
            description:
                'model with one hand on hip, confident stance, weight on one leg',
        },
        bestFor: ['power poses', 'blazers', 'confident looks'],
    },
    {
        id: 'dynamic-twirl',
        name: 'Dress Twirl',
        category: 'dynamic',
        pose: {
            id: 'dynamic-twirl',
            name: 'Dress Twirl',
            joints: {
                nose: { x: 0.48, y: 0.1 },
                neck: { x: 0.5, y: 0.15 },
                right_shoulder: { x: 0.38, y: 0.18 },
                left_shoulder: { x: 0.62, y: 0.22 },
                right_elbow: { x: 0.25, y: 0.28 },
                left_elbow: { x: 0.72, y: 0.35 },
                right_wrist: { x: 0.18, y: 0.38 },
                left_wrist: { x: 0.78, y: 0.42 },
                right_hip: { x: 0.45, y: 0.5 },
                left_hip: { x: 0.55, y: 0.52 },
                right_knee: { x: 0.42, y: 0.7 },
                left_knee: { x: 0.58, y: 0.72 },
                right_ankle: { x: 0.4, y: 0.9 },
                left_ankle: { x: 0.6, y: 0.92 },
            },
            viewAngle: 'three-quarter',
            description:
                'model mid-twirl, arms extended, dress flowing with movement',
        },
        bestFor: ['flowing dresses', 'skirts', 'gowns', 'dynamic shots'],
    },
    {
        id: 'dynamic-lean',
        name: 'Editorial Lean',
        category: 'editorial',
        pose: {
            id: 'dynamic-lean',
            name: 'Editorial Lean',
            joints: {
                nose: { x: 0.45, y: 0.12 },
                neck: { x: 0.48, y: 0.17 },
                right_shoulder: { x: 0.35, y: 0.22 },
                left_shoulder: { x: 0.62, y: 0.25 },
                right_elbow: { x: 0.28, y: 0.38 },
                left_elbow: { x: 0.68, y: 0.4 },
                right_wrist: { x: 0.32, y: 0.52 },
                left_wrist: { x: 0.65, y: 0.55 },
                right_hip: { x: 0.42, y: 0.5 },
                left_hip: { x: 0.58, y: 0.52 },
                right_knee: { x: 0.4, y: 0.72 },
                left_knee: { x: 0.58, y: 0.7 },
                right_ankle: { x: 0.38, y: 0.92 },
                left_ankle: { x: 0.6, y: 0.88 },
            },
            viewAngle: 'three-quarter',
            description:
                'model leaning slightly, editorial pose, artistic composition',
        },
        bestFor: ['editorial shots', 'artistic looks', 'high fashion'],
    },
    // Sitting poses
    {
        id: 'sitting-elegant',
        name: 'Elegant Seated',
        category: 'sitting',
        pose: {
            id: 'sitting-elegant',
            name: 'Elegant Seated',
            joints: {
                nose: { x: 0.5, y: 0.15 },
                neck: { x: 0.5, y: 0.22 },
                right_shoulder: { x: 0.38, y: 0.28 },
                left_shoulder: { x: 0.62, y: 0.28 },
                right_elbow: { x: 0.32, y: 0.42 },
                left_elbow: { x: 0.68, y: 0.42 },
                right_wrist: { x: 0.38, y: 0.55 },
                left_wrist: { x: 0.62, y: 0.55 },
                right_hip: { x: 0.42, y: 0.55 },
                left_hip: { x: 0.58, y: 0.55 },
                right_knee: { x: 0.35, y: 0.72 },
                left_knee: { x: 0.55, y: 0.7 },
                right_ankle: { x: 0.3, y: 0.85 },
                left_ankle: { x: 0.52, y: 0.82 },
            },
            viewAngle: 'three-quarter',
            description:
                'model seated elegantly, legs crossed, upright posture',
        },
        bestFor: ['seated shots', 'tops', 'jewelry', 'upper body focus'],
    },
];

/**
 * Pose Control Manager
 */
export class PoseControlManager {
    /**
     * Get all pose presets
     */
    getAllPresets(): PosePreset[] {
        return POSE_PRESETS;
    }

    /**
     * Get presets by category
     */
    getPresetsByCategory(category: PoseCategory): PosePreset[] {
        return POSE_PRESETS.filter((p) => p.category === category);
    }

    /**
     * Get preset by ID
     */
    getPreset(id: string): PosePreset | undefined {
        return POSE_PRESETS.find((p) => p.id === id);
    }

    /**
     * Get recommended poses for a garment type
     */
    getRecommendedPoses(garmentType: string): PosePreset[] {
        const normalized = garmentType.toLowerCase();

        return POSE_PRESETS.filter((preset) =>
            preset.bestFor.some(
                (bf) =>
                    bf.toLowerCase().includes(normalized) ||
                    normalized.includes(bf.toLowerCase())
            )
        );
    }

    /**
     * Build a pose description for AI prompt
     */
    buildPosePrompt(pose: BodyPose): string {
        const parts: string[] = [];

        // Base description
        parts.push(pose.description);

        // View angle
        parts.push(`${pose.viewAngle} view`);

        // Add specific joint instructions if needed
        if (pose.viewAngle === 'three-quarter') {
            parts.push('body angled towards camera');
        }

        return parts.join(', ');
    }

    /**
     * Build a complete model + pose prompt
     */
    buildModelPosePrompt(
        pose: BodyPose,
        model?: ModelCharacteristics
    ): string {
        const parts: string[] = [];

        // Model description
        if (model) {
            const modelParts: string[] = [];

            if (model.gender) modelParts.push(model.gender);
            if (model.ageRange) modelParts.push(`${model.ageRange} model`);
            else modelParts.push('fashion model');

            if (model.bodyType) modelParts.push(`${model.bodyType} build`);
            if (model.height) modelParts.push(`${model.height} height`);
            if (model.skinTone) modelParts.push(`${model.skinTone} skin tone`);
            if (model.hairStyle || model.hairColor) {
                modelParts.push(
                    `${model.hairColor || ''} ${model.hairStyle || 'hair'}`.trim()
                );
            }

            parts.push(modelParts.join(', '));
        } else {
            parts.push('professional fashion model');
        }

        // Pose description
        parts.push(this.buildPosePrompt(pose));

        // Photography style
        parts.push('professional fashion photography, studio lighting');

        return parts.join(', ');
    }

    /**
     * Create a custom pose from natural language description
     */
    createCustomPose(
        name: string,
        description: string,
        viewAngle: BodyPose['viewAngle'] = 'front'
    ): BodyPose {
        return {
            id: `custom-${Date.now()}`,
            name,
            joints: {}, // Custom poses use description only
            viewAngle,
            description,
        };
    }

    /**
     * Get pose categories
     */
    getCategories(): PoseCategory[] {
        return ['standing', 'walking', 'sitting', 'dynamic', 'editorial', 'runway'];
    }

    /**
     * Convert pose to OpenPose-compatible format (for future integration)
     */
    toOpenPoseFormat(pose: BodyPose): number[][] {
        const joints = Object.values(pose.joints);
        return joints.map((joint) => [
            joint.x,
            joint.y,
            joint.confidence || 1.0,
        ]);
    }

    /**
     * Generate pose variation
     */
    createPoseVariation(
        basePose: BodyPose,
        variationType: 'subtle' | 'moderate' | 'dramatic'
    ): BodyPose {
        const variation: BodyPose = {
            ...basePose,
            id: `${basePose.id}-var-${Date.now()}`,
            name: `${basePose.name} (Variation)`,
            joints: { ...basePose.joints },
        };

        // Amount of variation based on type
        const variance =
            variationType === 'subtle' ? 0.02 : variationType === 'moderate' ? 0.05 : 0.1;

        // Apply random variations to joint positions
        for (const [joint, point] of Object.entries(variation.joints)) {
            if (point) {
                variation.joints[joint as JointName] = {
                    x: Math.max(0, Math.min(1, point.x + (Math.random() - 0.5) * variance)),
                    y: Math.max(0, Math.min(1, point.y + (Math.random() - 0.5) * variance)),
                    confidence: point.confidence,
                };
            }
        }

        // Update description
        variation.description = `${basePose.description} with ${variationType} variation`;

        return variation;
    }
}

/**
 * Export singleton instance
 */
export const poseControl = new PoseControlManager();

/**
 * Export pose categories for UI
 */
export const POSE_CATEGORIES: PoseCategory[] = [
    'standing',
    'walking',
    'sitting',
    'dynamic',
    'editorial',
    'runway',
];

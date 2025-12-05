/**
 * 3D Preview Manager
 *
 * Manages 3D garment preview with fabric simulation parameters.
 * Provides data structures and interfaces for Three.js integration.
 */

/**
 * Fabric physics properties
 */
export interface FabricPhysics {
    /** Fabric stiffness (0-1, lower = more drapey) */
    stiffness: number;
    /** Fabric weight (g/m²) */
    weight: number;
    /** Stretch factor (0-1, higher = more stretch) */
    stretch: number;
    /** Friction coefficient */
    friction: number;
    /** Air resistance */
    airResistance: number;
    /** Damping (energy loss) */
    damping: number;
}

/**
 * Fabric visual properties
 */
export interface FabricVisual {
    /** Base color (hex) */
    baseColor: string;
    /** Roughness (0-1, 0 = shiny, 1 = matte) */
    roughness: number;
    /** Metalness (0-1) */
    metalness: number;
    /** Normal map strength */
    normalScale: number;
    /** Opacity (0-1) */
    opacity: number;
    /** Is double-sided */
    doubleSided: boolean;
    /** Subsurface scattering for thin fabrics */
    subsurface?: number;
    /** Sheen for velvet/satin effects */
    sheen?: number;
    /** Sheen color */
    sheenColor?: string;
}

/**
 * Predefined fabric material
 */
export interface FabricMaterial {
    /** Material name */
    name: string;
    /** Material category */
    category: 'woven' | 'knit' | 'leather' | 'synthetic' | 'denim' | 'sheer';
    /** Physics properties */
    physics: FabricPhysics;
    /** Visual properties */
    visual: FabricVisual;
    /** Description */
    description: string;
}

/**
 * Lighting preset
 */
export interface LightingPreset {
    /** Preset name */
    name: string;
    /** Ambient light intensity */
    ambientIntensity: number;
    /** Ambient color */
    ambientColor: string;
    /** Directional light settings */
    directional: {
        intensity: number;
        color: string;
        position: { x: number; y: number; z: number };
    }[];
    /** Environment map URL */
    environmentMap?: string;
    /** Environment intensity */
    environmentIntensity?: number;
    /** Background color/gradient */
    background: string | { top: string; bottom: string };
}

/**
 * Camera preset
 */
export interface CameraPreset {
    /** Preset name */
    name: string;
    /** Camera position */
    position: { x: number; y: number; z: number };
    /** Look-at target */
    target: { x: number; y: number; z: number };
    /** Field of view */
    fov: number;
    /** Near clipping plane */
    near: number;
    /** Far clipping plane */
    far: number;
}

/**
 * Animation settings for fabric simulation
 */
export interface SimulationSettings {
    /** Enable physics simulation */
    enablePhysics: boolean;
    /** Simulation steps per frame */
    substeps: number;
    /** Wind direction and strength */
    wind?: {
        direction: { x: number; y: number; z: number };
        strength: number;
        turbulence: number;
    };
    /** Gravity strength */
    gravity: number;
    /** Pin certain vertices (e.g., shoulders) */
    pinnedVertices?: number[];
}

/**
 * 3D Preview configuration
 */
export interface Preview3DConfig {
    /** Canvas width */
    width: number;
    /** Canvas height */
    height: number;
    /** Pixel ratio */
    pixelRatio: number;
    /** Enable shadows */
    shadows: boolean;
    /** Shadow quality */
    shadowMapSize: number;
    /** Enable anti-aliasing */
    antialias: boolean;
    /** Enable tone mapping */
    toneMapping: boolean;
    /** Tone mapping exposure */
    exposure: number;
}

/**
 * Predefined fabric materials library
 */
const FABRIC_MATERIALS: Record<string, FabricMaterial> = {
    cotton: {
        name: 'Cotton',
        category: 'woven',
        physics: {
            stiffness: 0.4,
            weight: 150,
            stretch: 0.05,
            friction: 0.5,
            airResistance: 0.3,
            damping: 0.8,
        },
        visual: {
            baseColor: '#ffffff',
            roughness: 0.9,
            metalness: 0,
            normalScale: 0.3,
            opacity: 1,
            doubleSided: true,
        },
        description: 'Natural cotton fabric with soft drape and texture',
    },
    silk: {
        name: 'Silk',
        category: 'woven',
        physics: {
            stiffness: 0.2,
            weight: 80,
            stretch: 0.02,
            friction: 0.3,
            airResistance: 0.2,
            damping: 0.9,
        },
        visual: {
            baseColor: '#f8f4e3',
            roughness: 0.3,
            metalness: 0.1,
            normalScale: 0.1,
            opacity: 1,
            doubleSided: true,
            sheen: 0.8,
            sheenColor: '#ffffff',
        },
        description: 'Luxurious silk with characteristic sheen and flow',
    },
    denim: {
        name: 'Denim',
        category: 'denim',
        physics: {
            stiffness: 0.7,
            weight: 340,
            stretch: 0.03,
            friction: 0.6,
            airResistance: 0.4,
            damping: 0.7,
        },
        visual: {
            baseColor: '#2c4a7c',
            roughness: 0.95,
            metalness: 0,
            normalScale: 0.6,
            opacity: 1,
            doubleSided: false,
        },
        description: 'Classic denim with twill weave texture',
    },
    leather: {
        name: 'Leather',
        category: 'leather',
        physics: {
            stiffness: 0.8,
            weight: 600,
            stretch: 0.01,
            friction: 0.7,
            airResistance: 0.5,
            damping: 0.6,
        },
        visual: {
            baseColor: '#3d2b1f',
            roughness: 0.6,
            metalness: 0.05,
            normalScale: 0.4,
            opacity: 1,
            doubleSided: false,
        },
        description: 'Premium leather with natural grain texture',
    },
    velvet: {
        name: 'Velvet',
        category: 'woven',
        physics: {
            stiffness: 0.35,
            weight: 280,
            stretch: 0.04,
            friction: 0.7,
            airResistance: 0.35,
            damping: 0.85,
        },
        visual: {
            baseColor: '#4a0e4e',
            roughness: 0.95,
            metalness: 0,
            normalScale: 0.2,
            opacity: 1,
            doubleSided: true,
            sheen: 0.3,
        },
        description: 'Luxurious velvet with soft pile and rich color depth',
    },
    chiffon: {
        name: 'Chiffon',
        category: 'sheer',
        physics: {
            stiffness: 0.15,
            weight: 40,
            stretch: 0.03,
            friction: 0.2,
            airResistance: 0.15,
            damping: 0.95,
        },
        visual: {
            baseColor: '#ffeef5',
            roughness: 0.2,
            metalness: 0,
            normalScale: 0.05,
            opacity: 0.7,
            doubleSided: true,
        },
        description: 'Lightweight sheer chiffon with ethereal drape',
    },
    jersey: {
        name: 'Jersey Knit',
        category: 'knit',
        physics: {
            stiffness: 0.25,
            weight: 180,
            stretch: 0.3,
            friction: 0.4,
            airResistance: 0.25,
            damping: 0.85,
        },
        visual: {
            baseColor: '#2d2d2d',
            roughness: 0.8,
            metalness: 0,
            normalScale: 0.25,
            opacity: 1,
            doubleSided: true,
        },
        description: 'Stretchy jersey knit with comfortable drape',
    },
    satin: {
        name: 'Satin',
        category: 'woven',
        physics: {
            stiffness: 0.3,
            weight: 120,
            stretch: 0.02,
            friction: 0.25,
            airResistance: 0.2,
            damping: 0.9,
        },
        visual: {
            baseColor: '#c9a0dc',
            roughness: 0.15,
            metalness: 0.2,
            normalScale: 0.1,
            opacity: 1,
            doubleSided: true,
            sheen: 0.9,
            sheenColor: '#ffffff',
        },
        description: 'Lustrous satin with high sheen finish',
    },
    linen: {
        name: 'Linen',
        category: 'woven',
        physics: {
            stiffness: 0.5,
            weight: 180,
            stretch: 0.02,
            friction: 0.55,
            airResistance: 0.35,
            damping: 0.75,
        },
        visual: {
            baseColor: '#f5f0e1',
            roughness: 0.95,
            metalness: 0,
            normalScale: 0.5,
            opacity: 1,
            doubleSided: true,
        },
        description: 'Natural linen with characteristic texture and crispness',
    },
    wool: {
        name: 'Wool',
        category: 'woven',
        physics: {
            stiffness: 0.55,
            weight: 350,
            stretch: 0.05,
            friction: 0.6,
            airResistance: 0.4,
            damping: 0.8,
        },
        visual: {
            baseColor: '#4a4a4a',
            roughness: 0.98,
            metalness: 0,
            normalScale: 0.4,
            opacity: 1,
            doubleSided: false,
        },
        description: 'Classic wool with soft hand and natural texture',
    },
    sequin: {
        name: 'Sequin',
        category: 'synthetic',
        physics: {
            stiffness: 0.45,
            weight: 400,
            stretch: 0.02,
            friction: 0.3,
            airResistance: 0.45,
            damping: 0.7,
        },
        visual: {
            baseColor: '#ffd700',
            roughness: 0.1,
            metalness: 0.9,
            normalScale: 0.8,
            opacity: 1,
            doubleSided: false,
        },
        description: 'Sparkly sequin fabric with high metallic reflection',
    },
    organza: {
        name: 'Organza',
        category: 'sheer',
        physics: {
            stiffness: 0.45,
            weight: 50,
            stretch: 0.01,
            friction: 0.2,
            airResistance: 0.2,
            damping: 0.9,
        },
        visual: {
            baseColor: '#ffffff',
            roughness: 0.1,
            metalness: 0.05,
            normalScale: 0.05,
            opacity: 0.6,
            doubleSided: true,
            sheen: 0.4,
        },
        description: 'Crisp sheer organza with structure and shine',
    },
};

/**
 * Predefined lighting presets
 */
const LIGHTING_PRESETS: Record<string, LightingPreset> = {
    studio: {
        name: 'Studio',
        ambientIntensity: 0.5,
        ambientColor: '#ffffff',
        directional: [
            {
                intensity: 1.0,
                color: '#ffffff',
                position: { x: 5, y: 10, z: 7 },
            },
            {
                intensity: 0.5,
                color: '#b0c4de',
                position: { x: -5, y: 5, z: -5 },
            },
        ],
        background: { top: '#f0f0f0', bottom: '#e0e0e0' },
    },
    runway: {
        name: 'Runway',
        ambientIntensity: 0.3,
        ambientColor: '#1a1a2e',
        directional: [
            {
                intensity: 1.5,
                color: '#ffffff',
                position: { x: 0, y: 15, z: 5 },
            },
            {
                intensity: 0.7,
                color: '#ffd700',
                position: { x: -8, y: 5, z: 8 },
            },
        ],
        background: '#0a0a0a',
    },
    natural: {
        name: 'Natural Daylight',
        ambientIntensity: 0.6,
        ambientColor: '#87ceeb',
        directional: [
            {
                intensity: 1.2,
                color: '#fffacd',
                position: { x: 10, y: 20, z: 10 },
            },
        ],
        environmentIntensity: 0.8,
        background: { top: '#87ceeb', bottom: '#f0f8ff' },
    },
    dramatic: {
        name: 'Dramatic',
        ambientIntensity: 0.2,
        ambientColor: '#1a1a2e',
        directional: [
            {
                intensity: 2.0,
                color: '#ff6b6b',
                position: { x: -5, y: 8, z: 3 },
            },
            {
                intensity: 1.5,
                color: '#4ecdc4',
                position: { x: 5, y: 5, z: -3 },
            },
        ],
        background: '#0d0d0d',
    },
    sunset: {
        name: 'Sunset',
        ambientIntensity: 0.4,
        ambientColor: '#ffa07a',
        directional: [
            {
                intensity: 1.3,
                color: '#ff7f50',
                position: { x: -15, y: 5, z: 5 },
            },
            {
                intensity: 0.6,
                color: '#dda0dd',
                position: { x: 10, y: 10, z: -5 },
            },
        ],
        background: { top: '#ff7f50', bottom: '#dda0dd' },
    },
};

/**
 * Predefined camera presets
 */
const CAMERA_PRESETS: Record<string, CameraPreset> = {
    front: {
        name: 'Front View',
        position: { x: 0, y: 1.5, z: 4 },
        target: { x: 0, y: 1, z: 0 },
        fov: 45,
        near: 0.1,
        far: 100,
    },
    threeQuarter: {
        name: '3/4 View',
        position: { x: 3, y: 1.5, z: 3 },
        target: { x: 0, y: 1, z: 0 },
        fov: 45,
        near: 0.1,
        far: 100,
    },
    side: {
        name: 'Side View',
        position: { x: 4, y: 1.5, z: 0 },
        target: { x: 0, y: 1, z: 0 },
        fov: 45,
        near: 0.1,
        far: 100,
    },
    back: {
        name: 'Back View',
        position: { x: 0, y: 1.5, z: -4 },
        target: { x: 0, y: 1, z: 0 },
        fov: 45,
        near: 0.1,
        far: 100,
    },
    closeup: {
        name: 'Close-up',
        position: { x: 0, y: 1.5, z: 2 },
        target: { x: 0, y: 1.3, z: 0 },
        fov: 35,
        near: 0.1,
        far: 50,
    },
    fullLength: {
        name: 'Full Length',
        position: { x: 0, y: 1.2, z: 5.5 },
        target: { x: 0, y: 0.8, z: 0 },
        fov: 50,
        near: 0.1,
        far: 100,
    },
};

/**
 * 3D Preview Manager class
 */
export class Preview3DManager {
    private config: Preview3DConfig = {
        width: 800,
        height: 600,
        pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        shadows: true,
        shadowMapSize: 2048,
        antialias: true,
        toneMapping: true,
        exposure: 1.0,
    };

    private currentMaterial: FabricMaterial | null = null;
    private currentLighting: LightingPreset | null = null;
    private currentCamera: CameraPreset | null = null;
    private simulationSettings: SimulationSettings = {
        enablePhysics: true,
        substeps: 10,
        gravity: 9.8,
    };

    /**
     * Get all available fabric materials
     */
    getMaterials(): FabricMaterial[] {
        return Object.values(FABRIC_MATERIALS);
    }

    /**
     * Get fabric material by name
     */
    getMaterial(name: string): FabricMaterial | undefined {
        return FABRIC_MATERIALS[name.toLowerCase()];
    }

    /**
     * Get materials by category
     */
    getMaterialsByCategory(
        category: FabricMaterial['category']
    ): FabricMaterial[] {
        return Object.values(FABRIC_MATERIALS).filter(
            (m) => m.category === category
        );
    }

    /**
     * Set current material
     */
    setMaterial(materialName: string): void {
        const material = this.getMaterial(materialName);
        if (!material) throw new Error(`Material ${materialName} not found`);
        this.currentMaterial = material;
    }

    /**
     * Get current material
     */
    getCurrentMaterial(): FabricMaterial | null {
        return this.currentMaterial;
    }

    /**
     * Get all lighting presets
     */
    getLightingPresets(): LightingPreset[] {
        return Object.values(LIGHTING_PRESETS);
    }

    /**
     * Get lighting preset by name
     */
    getLightingPreset(name: string): LightingPreset | undefined {
        return LIGHTING_PRESETS[name.toLowerCase()];
    }

    /**
     * Set current lighting
     */
    setLighting(presetName: string): void {
        const preset = this.getLightingPreset(presetName);
        if (!preset) throw new Error(`Lighting preset ${presetName} not found`);
        this.currentLighting = preset;
    }

    /**
     * Get current lighting
     */
    getCurrentLighting(): LightingPreset | null {
        return this.currentLighting;
    }

    /**
     * Get all camera presets
     */
    getCameraPresets(): CameraPreset[] {
        return Object.values(CAMERA_PRESETS);
    }

    /**
     * Get camera preset by name
     */
    getCameraPreset(name: string): CameraPreset | undefined {
        return CAMERA_PRESETS[name.toLowerCase().replace(/\s+/g, '')];
    }

    /**
     * Set current camera
     */
    setCamera(presetName: string): void {
        const normalizedName = presetName.toLowerCase().replace(/\s+/g, '');
        const preset = CAMERA_PRESETS[normalizedName];
        if (!preset)
            throw new Error(`Camera preset ${presetName} not found`);
        this.currentCamera = preset;
    }

    /**
     * Get current camera
     */
    getCurrentCamera(): CameraPreset | null {
        return this.currentCamera;
    }

    /**
     * Update preview configuration
     */
    updateConfig(config: Partial<Preview3DConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): Preview3DConfig {
        return { ...this.config };
    }

    /**
     * Update simulation settings
     */
    updateSimulation(settings: Partial<SimulationSettings>): void {
        this.simulationSettings = { ...this.simulationSettings, ...settings };
    }

    /**
     * Get simulation settings
     */
    getSimulationSettings(): SimulationSettings {
        return { ...this.simulationSettings };
    }

    /**
     * Add wind to simulation
     */
    setWind(strength: number, direction: { x: number; y: number; z: number }): void {
        this.simulationSettings.wind = {
            direction,
            strength,
            turbulence: 0.3,
        };
    }

    /**
     * Remove wind from simulation
     */
    clearWind(): void {
        this.simulationSettings.wind = undefined;
    }

    /**
     * Get scene configuration for Three.js
     */
    getSceneConfig(): {
        config: Preview3DConfig;
        material: FabricMaterial | null;
        lighting: LightingPreset | null;
        camera: CameraPreset | null;
        simulation: SimulationSettings;
    } {
        return {
            config: this.getConfig(),
            material: this.currentMaterial,
            lighting: this.currentLighting,
            camera: this.currentCamera,
            simulation: this.getSimulationSettings(),
        };
    }

    /**
     * Create custom fabric material
     */
    createCustomMaterial(
        name: string,
        baseOn: string,
        overrides: Partial<FabricMaterial>
    ): FabricMaterial {
        const base = this.getMaterial(baseOn);
        if (!base) throw new Error(`Base material ${baseOn} not found`);

        return {
            ...base,
            name,
            physics: { ...base.physics, ...overrides.physics },
            visual: { ...base.visual, ...overrides.visual },
            description: overrides.description || base.description,
        };
    }

    /**
     * Export current scene settings
     */
    exportSettings(): string {
        return JSON.stringify(this.getSceneConfig(), null, 2);
    }

    /**
     * Import scene settings
     */
    importSettings(json: string): void {
        const settings = JSON.parse(json);

        if (settings.config) {
            this.updateConfig(settings.config);
        }

        if (settings.material) {
            this.currentMaterial = settings.material;
        }

        if (settings.lighting) {
            this.currentLighting = settings.lighting;
        }

        if (settings.camera) {
            this.currentCamera = settings.camera;
        }

        if (settings.simulation) {
            this.updateSimulation(settings.simulation);
        }
    }
}

/**
 * Export singleton instance
 */
export const preview3D = new Preview3DManager();

/**
 * 3D Scene Manager - Phase 4 Professional Design Tools
 *
 * Three.js-based 3D preview system for garment visualization.
 * Supports 3D model loading, fabric draping, camera controls,
 * lighting setups, and real-time rendering.
 */

// Type definitions for Three.js integration
export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

export interface Transform3D {
    position: Vector3D;
    rotation: Quaternion;
    scale: Vector3D;
}

export interface BoundingBox3D {
    min: Vector3D;
    max: Vector3D;
    center: Vector3D;
    size: Vector3D;
}

export interface Material3D {
    id: string;
    name: string;
    type: MaterialType;
    color: string;
    opacity: number;
    metalness: number;
    roughness: number;
    normalMap?: string;
    diffuseMap?: string;
    specularMap?: string;
    displacementMap?: string;
    aoMap?: string;
    emissive?: string;
    emissiveIntensity?: number;
    transparent: boolean;
    doubleSided: boolean;
    wireframe: boolean;
}

export type MaterialType =
    | 'standard'
    | 'physical'
    | 'basic'
    | 'phong'
    | 'lambert'
    | 'toon'
    | 'matcap';

export interface Mesh3D {
    id: string;
    name: string;
    geometry: Geometry3D;
    material: Material3D;
    transform: Transform3D;
    visible: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    boundingBox: BoundingBox3D;
}

export interface Geometry3D {
    id: string;
    type: GeometryType;
    vertices: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    vertexCount: number;
    faceCount: number;
}

export type GeometryType =
    | 'box'
    | 'sphere'
    | 'cylinder'
    | 'plane'
    | 'torus'
    | 'custom';

export interface Light3D {
    id: string;
    name: string;
    type: LightType;
    color: string;
    intensity: number;
    position: Vector3D;
    target?: Vector3D;
    castShadow: boolean;
    shadowMapSize?: number;
    decay?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
}

export type LightType =
    | 'ambient'
    | 'directional'
    | 'point'
    | 'spot'
    | 'hemisphere';

export interface Camera3D {
    id: string;
    name: string;
    type: CameraType;
    position: Vector3D;
    target: Vector3D;
    fov?: number;
    aspect?: number;
    near: number;
    far: number;
    zoom?: number;
    orthographicSize?: number;
}

export type CameraType = 'perspective' | 'orthographic';

export interface Scene3D {
    id: string;
    name: string;
    meshes: Map<string, Mesh3D>;
    lights: Map<string, Light3D>;
    cameras: Map<string, Camera3D>;
    activeCamera: string;
    background: SceneBackground;
    environment?: EnvironmentMap;
    fog?: SceneFog;
}

export interface SceneBackground {
    type: 'color' | 'gradient' | 'hdri' | 'transparent';
    color?: string;
    gradientTop?: string;
    gradientBottom?: string;
    hdriUrl?: string;
}

export interface EnvironmentMap {
    url: string;
    intensity: number;
    blur: number;
}

export interface SceneFog {
    type: 'linear' | 'exponential';
    color: string;
    near?: number;
    far?: number;
    density?: number;
}

export interface RenderSettings {
    width: number;
    height: number;
    pixelRatio: number;
    antialias: boolean;
    shadows: boolean;
    shadowMapType: 'basic' | 'pcf' | 'pcfsoft' | 'vsm';
    toneMapping: ToneMappingType;
    toneMappingExposure: number;
    outputColorSpace: 'srgb' | 'linear';
    physicallyCorrectLights: boolean;
}

export type ToneMappingType =
    | 'none'
    | 'linear'
    | 'reinhard'
    | 'cineon'
    | 'aces';

export interface CameraOrbitControls {
    enabled: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    minDistance: number;
    maxDistance: number;
    enablePan: boolean;
    minPolarAngle: number;
    maxPolarAngle: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
}

export interface SceneManagerConfig {
    canvas?: HTMLCanvasElement;
    renderSettings?: Partial<RenderSettings>;
    orbitControls?: Partial<CameraOrbitControls>;
}

export type SceneEvent =
    | { type: 'meshAdded'; mesh: Mesh3D }
    | { type: 'meshRemoved'; meshId: string }
    | { type: 'meshUpdated'; mesh: Mesh3D }
    | { type: 'lightAdded'; light: Light3D }
    | { type: 'lightRemoved'; lightId: string }
    | { type: 'cameraChanged'; cameraId: string }
    | { type: 'render' }
    | { type: 'resize'; width: number; height: number };

type SceneEventListener = (event: SceneEvent) => void;

/**
 * 3D Scene Manager for garment visualization
 */
export class SceneManager {
    private scene: Scene3D | null = null;
    private renderSettings: RenderSettings;
    private orbitControls: CameraOrbitControls;
    private listeners: Set<SceneEventListener> = new Set();
    private animationFrameId: number | null = null;
    private isRendering: boolean = false;
    private canvas: HTMLCanvasElement | null = null;

    constructor(config: SceneManagerConfig = {}) {
        this.canvas = config.canvas || null;
        this.renderSettings = this.createDefaultRenderSettings(config.renderSettings);
        this.orbitControls = this.createDefaultOrbitControls(config.orbitControls);
    }

    private createDefaultRenderSettings(overrides?: Partial<RenderSettings>): RenderSettings {
        return {
            width: 800,
            height: 600,
            pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
            antialias: true,
            shadows: true,
            shadowMapType: 'pcfsoft',
            toneMapping: 'aces',
            toneMappingExposure: 1,
            outputColorSpace: 'srgb',
            physicallyCorrectLights: true,
            ...overrides
        };
    }

    private createDefaultOrbitControls(overrides?: Partial<CameraOrbitControls>): CameraOrbitControls {
        return {
            enabled: true,
            autoRotate: false,
            autoRotateSpeed: 2,
            enableDamping: true,
            dampingFactor: 0.05,
            enableZoom: true,
            minDistance: 1,
            maxDistance: 100,
            enablePan: true,
            minPolarAngle: 0,
            maxPolarAngle: Math.PI,
            minAzimuthAngle: -Infinity,
            maxAzimuthAngle: Infinity,
            ...overrides
        };
    }

    /**
     * Create a new scene
     */
    createScene(name: string = 'New Scene'): Scene3D {
        const scene: Scene3D = {
            id: this.generateId(),
            name,
            meshes: new Map(),
            lights: new Map(),
            cameras: new Map(),
            activeCamera: '',
            background: {
                type: 'color',
                color: '#f0f0f0'
            }
        };

        // Add default camera
        const defaultCamera = this.createCamera('Main Camera', 'perspective');
        scene.cameras.set(defaultCamera.id, defaultCamera);
        scene.activeCamera = defaultCamera.id;

        // Add default lights
        const ambientLight = this.createLight('Ambient', 'ambient', { intensity: 0.5 });
        const directionalLight = this.createLight('Key Light', 'directional', {
            position: { x: 5, y: 10, z: 7 },
            intensity: 1,
            castShadow: true
        });

        scene.lights.set(ambientLight.id, ambientLight);
        scene.lights.set(directionalLight.id, directionalLight);

        this.scene = scene;
        return scene;
    }

    /**
     * Get current scene
     */
    getScene(): Scene3D | null {
        return this.scene;
    }

    /**
     * Create a camera
     */
    createCamera(
        name: string,
        type: CameraType,
        options: Partial<Camera3D> = {}
    ): Camera3D {
        return {
            id: this.generateId(),
            name,
            type,
            position: options.position || { x: 0, y: 2, z: 5 },
            target: options.target || { x: 0, y: 0, z: 0 },
            fov: options.fov || 50,
            aspect: options.aspect || this.renderSettings.width / this.renderSettings.height,
            near: options.near || 0.1,
            far: options.far || 1000,
            zoom: options.zoom || 1,
            orthographicSize: options.orthographicSize || 5
        };
    }

    /**
     * Create a light
     */
    createLight(
        name: string,
        type: LightType,
        options: Partial<Light3D> = {}
    ): Light3D {
        return {
            id: this.generateId(),
            name,
            type,
            color: options.color || '#ffffff',
            intensity: options.intensity ?? 1,
            position: options.position || { x: 0, y: 5, z: 0 },
            target: options.target,
            castShadow: options.castShadow ?? (type === 'directional' || type === 'spot'),
            shadowMapSize: options.shadowMapSize || 2048,
            decay: options.decay || 2,
            distance: options.distance || 0,
            angle: options.angle || Math.PI / 4,
            penumbra: options.penumbra || 0
        };
    }

    /**
     * Create a material
     */
    createMaterial(
        name: string,
        type: MaterialType = 'standard',
        options: Partial<Material3D> = {}
    ): Material3D {
        return {
            id: this.generateId(),
            name,
            type,
            color: options.color || '#ffffff',
            opacity: options.opacity ?? 1,
            metalness: options.metalness ?? 0,
            roughness: options.roughness ?? 0.5,
            normalMap: options.normalMap,
            diffuseMap: options.diffuseMap,
            specularMap: options.specularMap,
            displacementMap: options.displacementMap,
            aoMap: options.aoMap,
            emissive: options.emissive || '#000000',
            emissiveIntensity: options.emissiveIntensity || 0,
            transparent: options.transparent ?? false,
            doubleSided: options.doubleSided ?? false,
            wireframe: options.wireframe ?? false
        };
    }

    /**
     * Create geometry primitives
     */
    createBoxGeometry(width = 1, height = 1, depth = 1): Geometry3D {
        const vertices = new Float32Array([
            // Front face
            -width / 2, -height / 2, depth / 2,
            width / 2, -height / 2, depth / 2,
            width / 2, height / 2, depth / 2,
            -width / 2, height / 2, depth / 2,
            // Back face
            -width / 2, -height / 2, -depth / 2,
            -width / 2, height / 2, -depth / 2,
            width / 2, height / 2, -depth / 2,
            width / 2, -height / 2, -depth / 2,
        ]);

        return {
            id: this.generateId(),
            type: 'box',
            vertices,
            normals: new Float32Array(vertices.length),
            uvs: new Float32Array(vertices.length / 3 * 2),
            indices: new Uint32Array([
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7
            ]),
            vertexCount: 8,
            faceCount: 12
        };
    }

    createPlaneGeometry(width = 1, height = 1, widthSegments = 1, heightSegments = 1): Geometry3D {
        const widthHalf = width / 2;
        const heightHalf = height / 2;
        const gridX = widthSegments;
        const gridY = heightSegments;
        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;
        const segmentWidth = width / gridX;
        const segmentHeight = height / gridY;

        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segmentHeight - heightHalf;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segmentWidth - widthHalf;
                vertices.push(x, y, 0);
                normals.push(0, 0, 1);
                uvs.push(ix / gridX, 1 - iy / gridY);
            }
        }

        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = (ix + 1) + gridX1 * (iy + 1);
                const d = (ix + 1) + gridX1 * iy;
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        return {
            id: this.generateId(),
            type: 'plane',
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices),
            vertexCount: vertices.length / 3,
            faceCount: indices.length / 3
        };
    }

    createSphereGeometry(radius = 1, widthSegments = 32, heightSegments = 16): Geometry3D {
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const theta = v * Math.PI;

            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const phi = u * Math.PI * 2;

                const px = -radius * Math.cos(phi) * Math.sin(theta);
                const py = radius * Math.cos(theta);
                const pz = radius * Math.sin(phi) * Math.sin(theta);

                vertices.push(px, py, pz);
                normals.push(px / radius, py / radius, pz / radius);
                uvs.push(u, 1 - v);
            }
        }

        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = x + (widthSegments + 1) * y;
                const b = x + (widthSegments + 1) * (y + 1);
                const c = (x + 1) + (widthSegments + 1) * (y + 1);
                const d = (x + 1) + (widthSegments + 1) * y;

                if (y !== 0) indices.push(a, b, d);
                if (y !== heightSegments - 1) indices.push(b, c, d);
            }
        }

        return {
            id: this.generateId(),
            type: 'sphere',
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices),
            vertexCount: vertices.length / 3,
            faceCount: indices.length / 3
        };
    }

    createCylinderGeometry(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32): Geometry3D {
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        const halfHeight = height / 2;
        const heightSegments = 1;

        // Generate body
        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const radius = v * (radiusBottom - radiusTop) + radiusTop;
            const py = halfHeight - v * height;

            for (let x = 0; x <= radialSegments; x++) {
                const u = x / radialSegments;
                const theta = u * Math.PI * 2;

                const px = radius * Math.sin(theta);
                const pz = radius * Math.cos(theta);

                vertices.push(px, py, pz);
                normals.push(Math.sin(theta), 0, Math.cos(theta));
                uvs.push(u, 1 - v);
            }
        }

        // Generate indices for body
        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < radialSegments; x++) {
                const a = x + (radialSegments + 1) * y;
                const b = x + (radialSegments + 1) * (y + 1);
                const c = (x + 1) + (radialSegments + 1) * (y + 1);
                const d = (x + 1) + (radialSegments + 1) * y;
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        return {
            id: this.generateId(),
            type: 'cylinder',
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices),
            vertexCount: vertices.length / 3,
            faceCount: indices.length / 3
        };
    }

    /**
     * Create a mesh with geometry and material
     */
    createMesh(
        name: string,
        geometry: Geometry3D,
        material: Material3D,
        transform?: Partial<Transform3D>
    ): Mesh3D {
        const defaultTransform: Transform3D = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
        };

        return {
            id: this.generateId(),
            name,
            geometry,
            material,
            transform: {
                ...defaultTransform,
                ...transform
            },
            visible: true,
            castShadow: true,
            receiveShadow: true,
            boundingBox: this.calculateBoundingBox(geometry)
        };
    }

    /**
     * Add mesh to scene
     */
    addMesh(mesh: Mesh3D): void {
        if (!this.scene) {
            throw new Error('No scene created');
        }
        this.scene.meshes.set(mesh.id, mesh);
        this.emit({ type: 'meshAdded', mesh });
    }

    /**
     * Remove mesh from scene
     */
    removeMesh(meshId: string): boolean {
        if (!this.scene) return false;
        const result = this.scene.meshes.delete(meshId);
        if (result) {
            this.emit({ type: 'meshRemoved', meshId });
        }
        return result;
    }

    /**
     * Get mesh by ID
     */
    getMesh(meshId: string): Mesh3D | undefined {
        return this.scene?.meshes.get(meshId);
    }

    /**
     * Update mesh transform
     */
    updateMeshTransform(meshId: string, transform: Partial<Transform3D>): void {
        const mesh = this.getMesh(meshId);
        if (!mesh) {
            throw new Error(`Mesh ${meshId} not found`);
        }

        mesh.transform = {
            ...mesh.transform,
            ...transform
        };

        this.emit({ type: 'meshUpdated', mesh });
    }

    /**
     * Update mesh material
     */
    updateMeshMaterial(meshId: string, material: Partial<Material3D>): void {
        const mesh = this.getMesh(meshId);
        if (!mesh) {
            throw new Error(`Mesh ${meshId} not found`);
        }

        mesh.material = {
            ...mesh.material,
            ...material
        };

        this.emit({ type: 'meshUpdated', mesh });
    }

    /**
     * Add light to scene
     */
    addLight(light: Light3D): void {
        if (!this.scene) {
            throw new Error('No scene created');
        }
        this.scene.lights.set(light.id, light);
        this.emit({ type: 'lightAdded', light });
    }

    /**
     * Remove light from scene
     */
    removeLight(lightId: string): boolean {
        if (!this.scene) return false;
        const result = this.scene.lights.delete(lightId);
        if (result) {
            this.emit({ type: 'lightRemoved', lightId });
        }
        return result;
    }

    /**
     * Set active camera
     */
    setActiveCamera(cameraId: string): void {
        if (!this.scene) {
            throw new Error('No scene created');
        }
        if (!this.scene.cameras.has(cameraId)) {
            throw new Error(`Camera ${cameraId} not found`);
        }
        this.scene.activeCamera = cameraId;
        this.emit({ type: 'cameraChanged', cameraId });
    }

    /**
     * Get active camera
     */
    getActiveCamera(): Camera3D | undefined {
        if (!this.scene) return undefined;
        return this.scene.cameras.get(this.scene.activeCamera);
    }

    /**
     * Update camera position
     */
    updateCameraPosition(position: Vector3D): void {
        const camera = this.getActiveCamera();
        if (camera) {
            camera.position = position;
            this.emit({ type: 'cameraChanged', cameraId: camera.id });
        }
    }

    /**
     * Update camera target
     */
    updateCameraTarget(target: Vector3D): void {
        const camera = this.getActiveCamera();
        if (camera) {
            camera.target = target;
            this.emit({ type: 'cameraChanged', cameraId: camera.id });
        }
    }

    /**
     * Set scene background
     */
    setBackground(background: SceneBackground): void {
        if (!this.scene) {
            throw new Error('No scene created');
        }
        this.scene.background = background;
    }

    /**
     * Set environment map
     */
    setEnvironment(environment: EnvironmentMap): void {
        if (!this.scene) {
            throw new Error('No scene created');
        }
        this.scene.environment = environment;
    }

    /**
     * Update render settings
     */
    updateRenderSettings(settings: Partial<RenderSettings>): void {
        this.renderSettings = {
            ...this.renderSettings,
            ...settings
        };
        this.emit({ type: 'resize', width: this.renderSettings.width, height: this.renderSettings.height });
    }

    /**
     * Get render settings
     */
    getRenderSettings(): RenderSettings {
        return { ...this.renderSettings };
    }

    /**
     * Update orbit controls
     */
    updateOrbitControls(controls: Partial<CameraOrbitControls>): void {
        this.orbitControls = {
            ...this.orbitControls,
            ...controls
        };
    }

    /**
     * Get orbit controls
     */
    getOrbitControls(): CameraOrbitControls {
        return { ...this.orbitControls };
    }

    /**
     * Start render loop
     */
    startRenderLoop(): void {
        if (this.isRendering) return;
        this.isRendering = true;

        const render = () => {
            if (!this.isRendering) return;
            this.emit({ type: 'render' });
            this.animationFrameId = requestAnimationFrame(render);
        };

        render();
    }

    /**
     * Stop render loop
     */
    stopRenderLoop(): void {
        this.isRendering = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Resize renderer
     */
    resize(width: number, height: number): void {
        this.renderSettings.width = width;
        this.renderSettings.height = height;
        this.emit({ type: 'resize', width, height });
    }

    /**
     * Calculate bounding box for geometry
     */
    private calculateBoundingBox(geometry: Geometry3D): BoundingBox3D {
        const vertices = geometry.vertices;
        if (vertices.length === 0) {
            return {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 0, y: 0, z: 0 },
                center: { x: 0, y: 0, z: 0 },
                size: { x: 0, y: 0, z: 0 }
            };
        }

        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };

        for (let i = 0; i < vertices.length; i += 3) {
            min.x = Math.min(min.x, vertices[i]);
            min.y = Math.min(min.y, vertices[i + 1]);
            min.z = Math.min(min.z, vertices[i + 2]);
            max.x = Math.max(max.x, vertices[i]);
            max.y = Math.max(max.y, vertices[i + 1]);
            max.z = Math.max(max.z, vertices[i + 2]);
        }

        return {
            min,
            max,
            center: {
                x: (min.x + max.x) / 2,
                y: (min.y + max.y) / 2,
                z: (min.z + max.z) / 2
            },
            size: {
                x: max.x - min.x,
                y: max.y - min.y,
                z: max.z - min.z
            }
        };
    }

    /**
     * Event handling
     */
    addEventListener(listener: SceneEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: SceneEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Export scene to JSON
     */
    exportScene(): object {
        if (!this.scene) {
            throw new Error('No scene to export');
        }

        return {
            id: this.scene.id,
            name: this.scene.name,
            meshes: Array.from(this.scene.meshes.values()).map(mesh => ({
                ...mesh,
                geometry: {
                    ...mesh.geometry,
                    vertices: Array.from(mesh.geometry.vertices),
                    normals: Array.from(mesh.geometry.normals),
                    uvs: Array.from(mesh.geometry.uvs),
                    indices: Array.from(mesh.geometry.indices)
                }
            })),
            lights: Array.from(this.scene.lights.values()),
            cameras: Array.from(this.scene.cameras.values()),
            activeCamera: this.scene.activeCamera,
            background: this.scene.background,
            environment: this.scene.environment,
            fog: this.scene.fog
        };
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopRenderLoop();
        this.scene = null;
        this.listeners.clear();
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

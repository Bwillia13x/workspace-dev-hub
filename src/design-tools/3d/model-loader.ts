/**
 * Model Loader - Phase 4 Professional Design Tools
 *
 * Handles loading 3D models in various formats (OBJ, FBX, GLTF).
 * Provides parsing and conversion to internal mesh format.
 */

import type {
    Mesh3D,
    Geometry3D,
    Material3D,
    Vector3D,
    Transform3D,
    BoundingBox3D,
    MaterialType
} from './scene-manager';

export type ModelFormat = 'obj' | 'fbx' | 'gltf' | 'glb';

export interface ModelLoadOptions {
    /** Scale factor to apply */
    scale?: number;
    /** Flip UV coordinates */
    flipUVs?: boolean;
    /** Generate normals if missing */
    generateNormals?: boolean;
    /** Center model at origin */
    centerModel?: boolean;
    /** Merge materials with same properties */
    mergeMaterials?: boolean;
}

export interface LoadedModel {
    name: string;
    format: ModelFormat;
    meshes: Mesh3D[];
    materials: Material3D[];
    boundingBox: BoundingBox3D;
    metadata: ModelMetadata;
}

export interface ModelMetadata {
    vertexCount: number;
    faceCount: number;
    meshCount: number;
    materialCount: number;
    hasNormals: boolean;
    hasUVs: boolean;
    hasColors: boolean;
    fileSize: number;
    loadTime: number;
}

export interface ParsedOBJData {
    vertices: number[];
    normals: number[];
    uvs: number[];
    faces: OBJFace[];
    objects: OBJObject[];
    materials: Map<string, OBJMaterial>;
    currentMaterial: string;
}

export interface OBJFace {
    vertices: number[];
    normals: number[];
    uvs: number[];
    material: string;
}

export interface OBJObject {
    name: string;
    faces: OBJFace[];
}

export interface OBJMaterial {
    name: string;
    diffuse: string;
    specular: string;
    ambient: string;
    emissive: string;
    shininess: number;
    opacity: number;
    diffuseMap?: string;
    normalMap?: string;
    specularMap?: string;
}

export type LoaderEvent =
    | { type: 'progress'; loaded: number; total: number; percentage: number }
    | { type: 'loaded'; model: LoadedModel }
    | { type: 'error'; message: string };

type LoaderEventListener = (event: LoaderEvent) => void;

/**
 * 3D Model Loader
 */
export class ModelLoader {
    private listeners: Set<LoaderEventListener> = new Set();
    private cache: Map<string, LoadedModel> = new Map();
    private idCounter: number = 0;

    /**
     * Load model from URL
     */
    async load(
        url: string,
        options: ModelLoadOptions = {}
    ): Promise<LoadedModel> {
        const startTime = performance.now();

        // Check cache
        const cacheKey = `${url}-${JSON.stringify(options)}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            this.emit({ type: 'loaded', model: cached });
            return cached;
        }

        // Determine format from URL
        const format = this.detectFormat(url);

        try {
            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch model: ${response.statusText}`);
            }

            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            let loaded = 0;
            const reader = response.body?.getReader();
            const chunks: Uint8Array[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    loaded += value.length;

                    this.emit({
                        type: 'progress',
                        loaded,
                        total,
                        percentage: total > 0 ? (loaded / total) * 100 : 0
                    });
                }
            }

            // Combine chunks
            const data = new Uint8Array(loaded);
            let offset = 0;
            for (const chunk of chunks) {
                data.set(chunk, offset);
                offset += chunk.length;
            }

            // Parse based on format
            let model: LoadedModel;
            switch (format) {
                case 'obj':
                    model = await this.parseOBJ(new TextDecoder().decode(data), options);
                    break;
                case 'gltf':
                case 'glb':
                    model = await this.parseGLTF(data, format, options);
                    break;
                case 'fbx':
                    model = await this.parseFBX(data, options);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            const endTime = performance.now();
            model.metadata.loadTime = endTime - startTime;
            model.metadata.fileSize = loaded;

            // Cache result
            this.cache.set(cacheKey, model);

            this.emit({ type: 'loaded', model });
            return model;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.emit({ type: 'error', message });
            throw error;
        }
    }

    /**
     * Load model from file data
     */
    async loadFromData(
        data: ArrayBuffer | string,
        format: ModelFormat,
        options: ModelLoadOptions = {}
    ): Promise<LoadedModel> {
        const startTime = performance.now();

        let model: LoadedModel;
        switch (format) {
            case 'obj':
                const objData = typeof data === 'string' ? data : new TextDecoder().decode(data);
                model = await this.parseOBJ(objData, options);
                break;
            case 'gltf':
            case 'glb':
                const gltfData = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
                model = await this.parseGLTF(gltfData, format, options);
                break;
            case 'fbx':
                const fbxData = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
                model = await this.parseFBX(fbxData, options);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        const endTime = performance.now();
        model.metadata.loadTime = endTime - startTime;
        model.metadata.fileSize = typeof data === 'string' ? data.length : data.byteLength;

        return model;
    }

    /**
     * Parse OBJ format
     */
    private async parseOBJ(data: string, options: ModelLoadOptions): Promise<LoadedModel> {
        const parsed: ParsedOBJData = {
            vertices: [],
            normals: [],
            uvs: [],
            faces: [],
            objects: [{ name: 'default', faces: [] }],
            materials: new Map(),
            currentMaterial: ''
        };

        const lines = data.split('\n');
        let currentObject = parsed.objects[0];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

            const parts = trimmed.split(/\s+/);
            const keyword = parts[0];

            switch (keyword) {
                case 'v': // Vertex
                    parsed.vertices.push(
                        parseFloat(parts[1]) * (options.scale || 1),
                        parseFloat(parts[2]) * (options.scale || 1),
                        parseFloat(parts[3]) * (options.scale || 1)
                    );
                    break;

                case 'vn': // Normal
                    parsed.normals.push(
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    );
                    break;

                case 'vt': // Texture coordinate
                    parsed.uvs.push(
                        parseFloat(parts[1]),
                        options.flipUVs ? 1 - parseFloat(parts[2]) : parseFloat(parts[2])
                    );
                    break;

                case 'f': // Face
                    const face = this.parseOBJFace(parts.slice(1), parsed.currentMaterial);
                    parsed.faces.push(face);
                    currentObject.faces.push(face);
                    break;

                case 'o': // Object
                case 'g': // Group
                    currentObject = { name: parts[1] || 'unnamed', faces: [] };
                    parsed.objects.push(currentObject);
                    break;

                case 'usemtl': // Use material
                    parsed.currentMaterial = parts[1];
                    break;

                case 'mtllib': // Material library reference
                    // In a real implementation, this would load external MTL file
                    break;
            }
        }

        // Convert parsed data to meshes
        const meshes = this.convertOBJToMeshes(parsed, options);
        const materials = Array.from(parsed.materials.values()).map(m => this.convertOBJMaterial(m));

        // Calculate overall bounding box
        const boundingBox = this.calculateBoundingBox(parsed.vertices);

        // Center model if requested
        if (options.centerModel) {
            this.centerMeshes(meshes, boundingBox);
        }

        return {
            name: 'OBJ Model',
            format: 'obj',
            meshes,
            materials,
            boundingBox,
            metadata: {
                vertexCount: parsed.vertices.length / 3,
                faceCount: parsed.faces.length,
                meshCount: meshes.length,
                materialCount: materials.length,
                hasNormals: parsed.normals.length > 0,
                hasUVs: parsed.uvs.length > 0,
                hasColors: false,
                fileSize: 0,
                loadTime: 0
            }
        };
    }

    private parseOBJFace(parts: string[], material: string): OBJFace {
        const face: OBJFace = {
            vertices: [],
            normals: [],
            uvs: [],
            material
        };

        for (const part of parts) {
            const indices = part.split('/');
            face.vertices.push(parseInt(indices[0], 10) - 1);

            if (indices[1]) {
                face.uvs.push(parseInt(indices[1], 10) - 1);
            }

            if (indices[2]) {
                face.normals.push(parseInt(indices[2], 10) - 1);
            }
        }

        return face;
    }

    private convertOBJToMeshes(parsed: ParsedOBJData, options: ModelLoadOptions): Mesh3D[] {
        const meshes: Mesh3D[] = [];

        // Group faces by object
        for (const obj of parsed.objects) {
            if (obj.faces.length === 0) continue;

            // Build geometry
            const vertices: number[] = [];
            const normals: number[] = [];
            const uvs: number[] = [];
            const indices: number[] = [];
            const vertexMap = new Map<string, number>();

            for (const face of obj.faces) {
                // Triangulate face (assuming convex polygons)
                for (let i = 1; i < face.vertices.length - 1; i++) {
                    const triIndices = [0, i, i + 1];

                    for (const ti of triIndices) {
                        const vi = face.vertices[ti];
                        const ni = face.normals[ti];
                        const ui = face.uvs[ti];

                        const key = `${vi}/${ni}/${ui}`;
                        let index = vertexMap.get(key);

                        if (index === undefined) {
                            index = vertices.length / 3;
                            vertexMap.set(key, index);

                            // Add vertex
                            vertices.push(
                                parsed.vertices[vi * 3],
                                parsed.vertices[vi * 3 + 1],
                                parsed.vertices[vi * 3 + 2]
                            );

                            // Add normal
                            if (ni !== undefined && ni >= 0) {
                                normals.push(
                                    parsed.normals[ni * 3],
                                    parsed.normals[ni * 3 + 1],
                                    parsed.normals[ni * 3 + 2]
                                );
                            } else if (options.generateNormals) {
                                normals.push(0, 1, 0); // Placeholder, calculated later
                            }

                            // Add UV
                            if (ui !== undefined && ui >= 0) {
                                uvs.push(
                                    parsed.uvs[ui * 2],
                                    parsed.uvs[ui * 2 + 1]
                                );
                            } else {
                                uvs.push(0, 0);
                            }
                        }

                        indices.push(index);
                    }
                }
            }

            // Generate normals if needed
            if (options.generateNormals && parsed.normals.length === 0) {
                this.generateNormals(vertices, indices, normals);
            }

            const geometry: Geometry3D = {
                id: this.generateId(),
                type: 'custom',
                vertices: new Float32Array(vertices),
                normals: new Float32Array(normals),
                uvs: new Float32Array(uvs),
                indices: new Uint32Array(indices),
                vertexCount: vertices.length / 3,
                faceCount: indices.length / 3
            };

            const material = this.createDefaultMaterial(obj.name);
            const mesh = this.createMesh(obj.name, geometry, material);
            meshes.push(mesh);
        }

        return meshes;
    }

    private convertOBJMaterial(objMat: OBJMaterial): Material3D {
        return {
            id: this.generateId(),
            name: objMat.name,
            type: 'standard' as MaterialType,
            color: objMat.diffuse,
            opacity: objMat.opacity,
            metalness: 0,
            roughness: 1 - objMat.shininess / 1000,
            normalMap: objMat.normalMap,
            diffuseMap: objMat.diffuseMap,
            specularMap: objMat.specularMap,
            emissive: objMat.emissive,
            transparent: objMat.opacity < 1,
            doubleSided: false,
            wireframe: false
        };
    }

    /**
     * Parse GLTF/GLB format
     */
    private async parseGLTF(
        data: Uint8Array,
        format: 'gltf' | 'glb',
        options: ModelLoadOptions
    ): Promise<LoadedModel> {
        // Simplified GLTF parser (real implementation would be more complete)
        let json: GLTFRoot;

        if (format === 'glb') {
            // Parse GLB header
            const view = new DataView(data.buffer);
            const magic = view.getUint32(0, true);

            if (magic !== 0x46546C67) { // 'glTF'
                throw new Error('Invalid GLB file');
            }

            const jsonLength = view.getUint32(12, true);
            const jsonData = data.slice(20, 20 + jsonLength);
            json = JSON.parse(new TextDecoder().decode(jsonData));
        } else {
            json = JSON.parse(new TextDecoder().decode(data));
        }

        const meshes: Mesh3D[] = [];
        const materials: Material3D[] = [];

        // Parse materials
        if (json.materials) {
            for (const mat of json.materials) {
                materials.push(this.parseGLTFMaterial(mat));
            }
        }

        // Parse meshes
        if (json.meshes) {
            for (const gltfMesh of json.meshes) {
                for (const primitive of gltfMesh.primitives) {
                    const geometry = this.parseGLTFPrimitive(primitive, json, data);
                    const material = primitive.material !== undefined
                        ? materials[primitive.material]
                        : this.createDefaultMaterial(gltfMesh.name || 'mesh');

                    const mesh = this.createMesh(gltfMesh.name || 'mesh', geometry, material);
                    meshes.push(mesh);
                }
            }
        }

        // Calculate bounding box
        const allVertices: number[] = [];
        for (const mesh of meshes) {
            allVertices.push(...Array.from(mesh.geometry.vertices));
        }
        const boundingBox = this.calculateBoundingBox(allVertices);

        if (options.centerModel) {
            this.centerMeshes(meshes, boundingBox);
        }

        return {
            name: json.asset?.generator || 'GLTF Model',
            format,
            meshes,
            materials,
            boundingBox,
            metadata: {
                vertexCount: meshes.reduce((sum, m) => sum + m.geometry.vertexCount, 0),
                faceCount: meshes.reduce((sum, m) => sum + m.geometry.faceCount, 0),
                meshCount: meshes.length,
                materialCount: materials.length,
                hasNormals: true,
                hasUVs: true,
                hasColors: false,
                fileSize: 0,
                loadTime: 0
            }
        };
    }

    private parseGLTFMaterial(mat: GLTFMaterial): Material3D {
        const pbr = mat.pbrMetallicRoughness || {};

        return {
            id: this.generateId(),
            name: mat.name || 'material',
            type: 'physical' as MaterialType,
            color: pbr.baseColorFactor
                ? this.rgbaToHex(pbr.baseColorFactor)
                : '#ffffff',
            opacity: mat.alphaMode === 'BLEND' ? (pbr.baseColorFactor?.[3] ?? 1) : 1,
            metalness: pbr.metallicFactor ?? 0,
            roughness: pbr.roughnessFactor ?? 1,
            emissive: mat.emissiveFactor
                ? this.rgbaToHex([...mat.emissiveFactor, 1])
                : '#000000',
            transparent: mat.alphaMode === 'BLEND',
            doubleSided: mat.doubleSided ?? false,
            wireframe: false
        };
    }

    private parseGLTFPrimitive(
        primitive: GLTFPrimitive,
        gltf: GLTFRoot,
        data: Uint8Array
    ): Geometry3D {
        // Simplified - in real implementation, would properly parse accessors and buffers
        const vertices = new Float32Array(0);
        const normals = new Float32Array(0);
        const uvs = new Float32Array(0);
        const indices = new Uint32Array(0);

        return {
            id: this.generateId(),
            type: 'custom',
            vertices,
            normals,
            uvs,
            indices,
            vertexCount: vertices.length / 3,
            faceCount: indices.length / 3
        };
    }

    /**
     * Parse FBX format (placeholder)
     */
    private async parseFBX(data: Uint8Array, options: ModelLoadOptions): Promise<LoadedModel> {
        // FBX parsing is complex - this is a placeholder
        // Real implementation would use a proper FBX parser
        throw new Error('FBX parsing not yet implemented');
    }

    /**
     * Create default material
     */
    private createDefaultMaterial(name: string): Material3D {
        return {
            id: this.generateId(),
            name: `${name}_material`,
            type: 'standard' as MaterialType,
            color: '#cccccc',
            opacity: 1,
            metalness: 0,
            roughness: 0.5,
            transparent: false,
            doubleSided: false,
            wireframe: false
        };
    }

    /**
     * Create mesh from geometry and material
     */
    private createMesh(name: string, geometry: Geometry3D, material: Material3D): Mesh3D {
        return {
            id: this.generateId(),
            name,
            geometry,
            material,
            transform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 }
            },
            visible: true,
            castShadow: true,
            receiveShadow: true,
            boundingBox: this.calculateGeometryBoundingBox(geometry)
        };
    }

    /**
     * Generate normals for geometry
     */
    private generateNormals(vertices: number[], indices: number[], normals: number[]): void {
        // Initialize normals to zero
        for (let i = 0; i < vertices.length; i++) {
            normals[i] = 0;
        }

        // Calculate face normals and accumulate to vertices
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i] * 3;
            const i1 = indices[i + 1] * 3;
            const i2 = indices[i + 2] * 3;

            const v0 = { x: vertices[i0], y: vertices[i0 + 1], z: vertices[i0 + 2] };
            const v1 = { x: vertices[i1], y: vertices[i1 + 1], z: vertices[i1 + 2] };
            const v2 = { x: vertices[i2], y: vertices[i2 + 1], z: vertices[i2 + 2] };

            const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

            const normal = {
                x: e1.y * e2.z - e1.z * e2.y,
                y: e1.z * e2.x - e1.x * e2.z,
                z: e1.x * e2.y - e1.y * e2.x
            };

            for (const idx of [i0, i1, i2]) {
                normals[idx] += normal.x;
                normals[idx + 1] += normal.y;
                normals[idx + 2] += normal.z;
            }
        }

        // Normalize
        for (let i = 0; i < normals.length; i += 3) {
            const len = Math.sqrt(normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2);
            if (len > 0) {
                normals[i] /= len;
                normals[i + 1] /= len;
                normals[i + 2] /= len;
            }
        }
    }

    /**
     * Calculate bounding box from vertices
     */
    private calculateBoundingBox(vertices: number[]): BoundingBox3D {
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
     * Calculate bounding box for geometry
     */
    private calculateGeometryBoundingBox(geometry: Geometry3D): BoundingBox3D {
        return this.calculateBoundingBox(Array.from(geometry.vertices));
    }

    /**
     * Center meshes at origin
     */
    private centerMeshes(meshes: Mesh3D[], boundingBox: BoundingBox3D): void {
        const offset = boundingBox.center;

        for (const mesh of meshes) {
            const vertices = mesh.geometry.vertices;
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] -= offset.x;
                vertices[i + 1] -= offset.y;
                vertices[i + 2] -= offset.z;
            }
        }
    }

    /**
     * Detect format from URL
     */
    private detectFormat(url: string): ModelFormat {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'obj':
                return 'obj';
            case 'fbx':
                return 'fbx';
            case 'gltf':
                return 'gltf';
            case 'glb':
                return 'glb';
            default:
                throw new Error(`Unknown file format: ${extension}`);
        }
    }

    /**
     * Convert RGBA array to hex string
     */
    private rgbaToHex(rgba: number[]): string {
        const r = Math.round(rgba[0] * 255);
        const g = Math.round(rgba[1] * 255);
        const b = Math.round(rgba[2] * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Event handling
     */
    addEventListener(listener: LoaderEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: LoaderEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${this.idCounter++}`;
    }
}

// GLTF type definitions
interface GLTFRoot {
    asset?: {
        generator?: string;
        version?: string;
    };
    meshes?: GLTFMesh[];
    materials?: GLTFMaterial[];
    accessors?: GLTFAccessor[];
    bufferViews?: GLTFBufferView[];
    buffers?: GLTFBuffer[];
}

interface GLTFMesh {
    name?: string;
    primitives: GLTFPrimitive[];
}

interface GLTFPrimitive {
    attributes: Record<string, number>;
    indices?: number;
    material?: number;
    mode?: number;
}

interface GLTFMaterial {
    name?: string;
    pbrMetallicRoughness?: {
        baseColorFactor?: number[];
        metallicFactor?: number;
        roughnessFactor?: number;
        baseColorTexture?: { index: number };
        metallicRoughnessTexture?: { index: number };
    };
    normalTexture?: { index: number };
    emissiveFactor?: number[];
    alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND';
    doubleSided?: boolean;
}

interface GLTFAccessor {
    bufferView: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    max?: number[];
    min?: number[];
}

interface GLTFBufferView {
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
}

interface GLTFBuffer {
    uri?: string;
    byteLength: number;
}

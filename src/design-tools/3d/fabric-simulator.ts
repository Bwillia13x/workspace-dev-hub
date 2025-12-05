/**
 * Fabric Simulator - Phase 4 Professional Design Tools
 *
 * Physics-based fabric simulation for realistic draping and movement.
 * Uses mass-spring system for cloth simulation with collision detection.
 */

import type { Vector3D, Mesh3D, SceneManager } from './scene-manager';

export interface FabricProperties {
    /** Fabric weight in g/m² */
    weight: number;
    /** Stretch resistance (0-1, higher = stiffer) */
    stiffness: number;
    /** Bend resistance (0-1, higher = stiffer bending) */
    bendStiffness: number;
    /** Shear resistance (0-1) */
    shearStiffness: number;
    /** Damping factor for stability */
    damping: number;
    /** Friction coefficient */
    friction: number;
    /** Air resistance */
    airResistance: number;
    /** Thickness in meters */
    thickness: number;
}

export interface FabricPreset {
    name: string;
    properties: FabricProperties;
    description: string;
}

export interface Particle {
    position: Vector3D;
    previousPosition: Vector3D;
    velocity: Vector3D;
    acceleration: Vector3D;
    mass: number;
    pinned: boolean;
    uv: { u: number; v: number };
}

export interface Spring {
    p1Index: number;
    p2Index: number;
    restLength: number;
    stiffness: number;
    type: 'structural' | 'shear' | 'bend';
}

export interface Constraint {
    type: 'distance' | 'pin' | 'collision';
    particles: number[];
    targetValue?: number;
    targetPosition?: Vector3D;
    collider?: CollisionBody;
}

export interface CollisionBody {
    id: string;
    type: 'sphere' | 'box' | 'plane' | 'mesh';
    position: Vector3D;
    radius?: number;
    size?: Vector3D;
    normal?: Vector3D;
    mesh?: Mesh3D;
}

export interface SimulationSettings {
    /** Gravity vector */
    gravity: Vector3D;
    /** Time step per iteration */
    timeStep: number;
    /** Constraint solver iterations */
    solverIterations: number;
    /** Collision iterations */
    collisionIterations: number;
    /** Wind vector */
    wind: Vector3D;
    /** Wind turbulence factor */
    windTurbulence: number;
    /** Global damping */
    globalDamping: number;
}

export type SimulationEvent =
    | { type: 'step'; time: number; particles: Particle[] }
    | { type: 'collision'; particleIndex: number; collider: CollisionBody }
    | { type: 'settled' }
    | { type: 'error'; message: string };

type SimulationEventListener = (event: SimulationEvent) => void;

/**
 * Fabric simulation system
 */
export class FabricSimulator {
    private particles: Particle[] = [];
    private springs: Spring[] = [];
    private constraints: Constraint[] = [];
    private colliders: Map<string, CollisionBody> = new Map();
    private settings: SimulationSettings;
    private fabricProperties: FabricProperties;
    private isRunning: boolean = false;
    private simulationTime: number = 0;
    private listeners: Set<SimulationEventListener> = new Set();
    private animationFrameId: number | null = null;

    // Fabric presets for different materials
    static readonly PRESETS: Map<string, FabricPreset> = new Map([
        ['silk', {
            name: 'Silk',
            properties: {
                weight: 20,
                stiffness: 0.2,
                bendStiffness: 0.05,
                shearStiffness: 0.15,
                damping: 0.98,
                friction: 0.3,
                airResistance: 0.5,
                thickness: 0.0001
            },
            description: 'Lightweight, flowing material with minimal stiffness'
        }],
        ['cotton', {
            name: 'Cotton',
            properties: {
                weight: 150,
                stiffness: 0.5,
                bendStiffness: 0.3,
                shearStiffness: 0.4,
                damping: 0.95,
                friction: 0.5,
                airResistance: 0.3,
                thickness: 0.0005
            },
            description: 'Medium weight fabric with moderate drape'
        }],
        ['denim', {
            name: 'Denim',
            properties: {
                weight: 400,
                stiffness: 0.8,
                bendStiffness: 0.7,
                shearStiffness: 0.75,
                damping: 0.92,
                friction: 0.6,
                airResistance: 0.2,
                thickness: 0.001
            },
            description: 'Heavy, stiff fabric with minimal drape'
        }],
        ['wool', {
            name: 'Wool',
            properties: {
                weight: 250,
                stiffness: 0.6,
                bendStiffness: 0.4,
                shearStiffness: 0.5,
                damping: 0.94,
                friction: 0.55,
                airResistance: 0.25,
                thickness: 0.002
            },
            description: 'Medium-heavy with some body and structure'
        }],
        ['leather', {
            name: 'Leather',
            properties: {
                weight: 500,
                stiffness: 0.9,
                bendStiffness: 0.85,
                shearStiffness: 0.88,
                damping: 0.9,
                friction: 0.7,
                airResistance: 0.15,
                thickness: 0.0015
            },
            description: 'Very stiff with minimal flexibility'
        }],
        ['jersey', {
            name: 'Jersey Knit',
            properties: {
                weight: 180,
                stiffness: 0.3,
                bendStiffness: 0.15,
                shearStiffness: 0.2,
                damping: 0.96,
                friction: 0.4,
                airResistance: 0.35,
                thickness: 0.0008
            },
            description: 'Stretchy, draping fabric with good recovery'
        }],
        ['chiffon', {
            name: 'Chiffon',
            properties: {
                weight: 30,
                stiffness: 0.15,
                bendStiffness: 0.02,
                shearStiffness: 0.1,
                damping: 0.99,
                friction: 0.25,
                airResistance: 0.6,
                thickness: 0.00005
            },
            description: 'Ultra-lightweight with maximum flow'
        }],
        ['velvet', {
            name: 'Velvet',
            properties: {
                weight: 300,
                stiffness: 0.55,
                bendStiffness: 0.45,
                shearStiffness: 0.5,
                damping: 0.93,
                friction: 0.65,
                airResistance: 0.28,
                thickness: 0.0012
            },
            description: 'Medium-heavy with soft drape and pile texture'
        }]
    ]);

    constructor(fabricProperties?: FabricProperties, settings?: Partial<SimulationSettings>) {
        this.fabricProperties = fabricProperties || FabricSimulator.PRESETS.get('cotton')!.properties;
        this.settings = this.createDefaultSettings(settings);
    }

    private createDefaultSettings(overrides?: Partial<SimulationSettings>): SimulationSettings {
        return {
            gravity: { x: 0, y: -9.81, z: 0 },
            timeStep: 1 / 60,
            solverIterations: 8,
            collisionIterations: 2,
            wind: { x: 0, y: 0, z: 0 },
            windTurbulence: 0,
            globalDamping: 0.99,
            ...overrides
        };
    }

    /**
     * Create a cloth mesh for simulation
     */
    createCloth(
        width: number,
        height: number,
        resolutionX: number,
        resolutionY: number,
        position: Vector3D = { x: 0, y: 0, z: 0 }
    ): void {
        this.particles = [];
        this.springs = [];
        this.constraints = [];

        const segmentWidth = width / resolutionX;
        const segmentHeight = height / resolutionY;
        const massPerParticle = (this.fabricProperties.weight / 1000) * width * height /
            ((resolutionX + 1) * (resolutionY + 1));

        // Create particles
        for (let y = 0; y <= resolutionY; y++) {
            for (let x = 0; x <= resolutionX; x++) {
                const pos: Vector3D = {
                    x: position.x + x * segmentWidth - width / 2,
                    y: position.y,
                    z: position.z + y * segmentHeight - height / 2
                };

                this.particles.push({
                    position: { ...pos },
                    previousPosition: { ...pos },
                    velocity: { x: 0, y: 0, z: 0 },
                    acceleration: { x: 0, y: 0, z: 0 },
                    mass: massPerParticle,
                    pinned: false,
                    uv: { u: x / resolutionX, v: y / resolutionY }
                });
            }
        }

        // Create springs
        const cols = resolutionX + 1;

        for (let y = 0; y <= resolutionY; y++) {
            for (let x = 0; x <= resolutionX; x++) {
                const i = y * cols + x;

                // Structural springs (horizontal and vertical)
                if (x < resolutionX) {
                    this.springs.push(this.createSpring(i, i + 1, segmentWidth, 'structural'));
                }
                if (y < resolutionY) {
                    this.springs.push(this.createSpring(i, i + cols, segmentHeight, 'structural'));
                }

                // Shear springs (diagonal)
                if (x < resolutionX && y < resolutionY) {
                    const diagonalLength = Math.sqrt(segmentWidth ** 2 + segmentHeight ** 2);
                    this.springs.push(this.createSpring(i, i + cols + 1, diagonalLength, 'shear'));
                    this.springs.push(this.createSpring(i + 1, i + cols, diagonalLength, 'shear'));
                }

                // Bend springs (skip one particle)
                if (x < resolutionX - 1) {
                    this.springs.push(this.createSpring(i, i + 2, segmentWidth * 2, 'bend'));
                }
                if (y < resolutionY - 1) {
                    this.springs.push(this.createSpring(i, i + cols * 2, segmentHeight * 2, 'bend'));
                }
            }
        }
    }

    private createSpring(
        p1: number,
        p2: number,
        restLength: number,
        type: Spring['type']
    ): Spring {
        let stiffness: number;
        switch (type) {
            case 'structural':
                stiffness = this.fabricProperties.stiffness;
                break;
            case 'shear':
                stiffness = this.fabricProperties.shearStiffness;
                break;
            case 'bend':
                stiffness = this.fabricProperties.bendStiffness;
                break;
        }

        return {
            p1Index: p1,
            p2Index: p2,
            restLength,
            stiffness,
            type
        };
    }

    /**
     * Pin particles (fix them in place)
     */
    pinParticle(index: number, position?: Vector3D): void {
        if (index >= 0 && index < this.particles.length) {
            this.particles[index].pinned = true;
            if (position) {
                this.particles[index].position = { ...position };
                this.particles[index].previousPosition = { ...position };
            }
        }
    }

    /**
     * Unpin a particle
     */
    unpinParticle(index: number): void {
        if (index >= 0 && index < this.particles.length) {
            this.particles[index].pinned = false;
        }
    }

    /**
     * Pin top edge of cloth
     */
    pinTopEdge(width: number): void {
        const cols = Math.sqrt(this.particles.length);
        for (let i = 0; i < cols; i++) {
            this.pinParticle(i);
        }
    }

    /**
     * Pin corners of cloth
     */
    pinCorners(): void {
        const cols = Math.round(Math.sqrt(this.particles.length));
        const rows = Math.floor(this.particles.length / cols);

        this.pinParticle(0); // Top-left
        this.pinParticle(cols - 1); // Top-right
        this.pinParticle((rows - 1) * cols); // Bottom-left
        this.pinParticle(rows * cols - 1); // Bottom-right
    }

    /**
     * Add collision body
     */
    addCollider(collider: CollisionBody): void {
        this.colliders.set(collider.id, collider);
    }

    /**
     * Remove collision body
     */
    removeCollider(id: string): void {
        this.colliders.delete(id);
    }

    /**
     * Update collider position
     */
    updateColliderPosition(id: string, position: Vector3D): void {
        const collider = this.colliders.get(id);
        if (collider) {
            collider.position = { ...position };
        }
    }

    /**
     * Set wind
     */
    setWind(wind: Vector3D, turbulence: number = 0): void {
        this.settings.wind = { ...wind };
        this.settings.windTurbulence = turbulence;
    }

    /**
     * Set gravity
     */
    setGravity(gravity: Vector3D): void {
        this.settings.gravity = { ...gravity };
    }

    /**
     * Set fabric properties
     */
    setFabricProperties(properties: Partial<FabricProperties>): void {
        this.fabricProperties = {
            ...this.fabricProperties,
            ...properties
        };
        this.updateSpringStiffness();
    }

    /**
     * Load preset
     */
    loadPreset(presetName: string): void {
        const preset = FabricSimulator.PRESETS.get(presetName);
        if (preset) {
            this.fabricProperties = { ...preset.properties };
            this.updateSpringStiffness();
        }
    }

    private updateSpringStiffness(): void {
        for (const spring of this.springs) {
            switch (spring.type) {
                case 'structural':
                    spring.stiffness = this.fabricProperties.stiffness;
                    break;
                case 'shear':
                    spring.stiffness = this.fabricProperties.shearStiffness;
                    break;
                case 'bend':
                    spring.stiffness = this.fabricProperties.bendStiffness;
                    break;
            }
        }
    }

    /**
     * Step simulation
     */
    step(): void {
        const dt = this.settings.timeStep;

        // Apply external forces
        this.applyForces();

        // Verlet integration
        this.integrate(dt);

        // Satisfy constraints
        for (let i = 0; i < this.settings.solverIterations; i++) {
            this.satisfyConstraints();
        }

        // Handle collisions
        for (let i = 0; i < this.settings.collisionIterations; i++) {
            this.handleCollisions();
        }

        this.simulationTime += dt;
        this.emit({ type: 'step', time: this.simulationTime, particles: this.particles });

        // Check if settled
        if (this.isSettled()) {
            this.emit({ type: 'settled' });
        }
    }

    private applyForces(): void {
        for (const particle of this.particles) {
            if (particle.pinned) continue;

            // Reset acceleration
            particle.acceleration = { x: 0, y: 0, z: 0 };

            // Gravity
            particle.acceleration.x += this.settings.gravity.x;
            particle.acceleration.y += this.settings.gravity.y;
            particle.acceleration.z += this.settings.gravity.z;

            // Wind with turbulence
            if (this.settings.wind.x !== 0 || this.settings.wind.y !== 0 || this.settings.wind.z !== 0) {
                const turbulence = this.settings.windTurbulence;
                particle.acceleration.x += this.settings.wind.x + (Math.random() - 0.5) * turbulence;
                particle.acceleration.y += this.settings.wind.y + (Math.random() - 0.5) * turbulence;
                particle.acceleration.z += this.settings.wind.z + (Math.random() - 0.5) * turbulence;
            }

            // Air resistance
            const airRes = this.fabricProperties.airResistance;
            particle.acceleration.x -= particle.velocity.x * airRes;
            particle.acceleration.y -= particle.velocity.y * airRes;
            particle.acceleration.z -= particle.velocity.z * airRes;
        }
    }

    private integrate(dt: number): void {
        const damping = this.fabricProperties.damping * this.settings.globalDamping;

        for (const particle of this.particles) {
            if (particle.pinned) continue;

            // Store current position
            const temp = { ...particle.position };

            // Verlet integration
            particle.position.x = particle.position.x +
                (particle.position.x - particle.previousPosition.x) * damping +
                particle.acceleration.x * dt * dt;
            particle.position.y = particle.position.y +
                (particle.position.y - particle.previousPosition.y) * damping +
                particle.acceleration.y * dt * dt;
            particle.position.z = particle.position.z +
                (particle.position.z - particle.previousPosition.z) * damping +
                particle.acceleration.z * dt * dt;

            // Update velocity (for air resistance calculation)
            particle.velocity.x = (particle.position.x - particle.previousPosition.x) / dt;
            particle.velocity.y = (particle.position.y - particle.previousPosition.y) / dt;
            particle.velocity.z = (particle.position.z - particle.previousPosition.z) / dt;

            // Store previous position
            particle.previousPosition = temp;
        }
    }

    private satisfyConstraints(): void {
        // Spring constraints
        for (const spring of this.springs) {
            const p1 = this.particles[spring.p1Index];
            const p2 = this.particles[spring.p2Index];

            const dx = p2.position.x - p1.position.x;
            const dy = p2.position.y - p1.position.y;
            const dz = p2.position.z - p1.position.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance === 0) continue;

            const diff = (distance - spring.restLength) / distance;
            const correction = diff * spring.stiffness * 0.5;

            const correctionX = dx * correction;
            const correctionY = dy * correction;
            const correctionZ = dz * correction;

            if (!p1.pinned) {
                p1.position.x += correctionX;
                p1.position.y += correctionY;
                p1.position.z += correctionZ;
            }

            if (!p2.pinned) {
                p2.position.x -= correctionX;
                p2.position.y -= correctionY;
                p2.position.z -= correctionZ;
            }
        }
    }

    private handleCollisions(): void {
        for (const collider of this.colliders.values()) {
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                if (particle.pinned) continue;

                const collision = this.checkCollision(particle, collider);
                if (collision.collided) {
                    // Push particle out of collider
                    particle.position.x += collision.normal.x * collision.depth;
                    particle.position.y += collision.normal.y * collision.depth;
                    particle.position.z += collision.normal.z * collision.depth;

                    // Apply friction
                    const friction = this.fabricProperties.friction;
                    const vDotN = particle.velocity.x * collision.normal.x +
                        particle.velocity.y * collision.normal.y +
                        particle.velocity.z * collision.normal.z;

                    particle.velocity.x = (particle.velocity.x - collision.normal.x * vDotN) * friction;
                    particle.velocity.y = (particle.velocity.y - collision.normal.y * vDotN) * friction;
                    particle.velocity.z = (particle.velocity.z - collision.normal.z * vDotN) * friction;

                    this.emit({ type: 'collision', particleIndex: i, collider });
                }
            }
        }
    }

    private checkCollision(
        particle: Particle,
        collider: CollisionBody
    ): { collided: boolean; normal: Vector3D; depth: number } {
        switch (collider.type) {
            case 'sphere':
                return this.sphereCollision(particle, collider);
            case 'plane':
                return this.planeCollision(particle, collider);
            case 'box':
                return this.boxCollision(particle, collider);
            default:
                return { collided: false, normal: { x: 0, y: 1, z: 0 }, depth: 0 };
        }
    }

    private sphereCollision(
        particle: Particle,
        collider: CollisionBody
    ): { collided: boolean; normal: Vector3D; depth: number } {
        const radius = collider.radius || 1;
        const dx = particle.position.x - collider.position.x;
        const dy = particle.position.y - collider.position.y;
        const dz = particle.position.z - collider.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < radius + this.fabricProperties.thickness) {
            const normal = {
                x: dx / distance,
                y: dy / distance,
                z: dz / distance
            };
            return {
                collided: true,
                normal,
                depth: radius + this.fabricProperties.thickness - distance
            };
        }

        return { collided: false, normal: { x: 0, y: 1, z: 0 }, depth: 0 };
    }

    private planeCollision(
        particle: Particle,
        collider: CollisionBody
    ): { collided: boolean; normal: Vector3D; depth: number } {
        const normal = collider.normal || { x: 0, y: 1, z: 0 };
        const d = (particle.position.x - collider.position.x) * normal.x +
            (particle.position.y - collider.position.y) * normal.y +
            (particle.position.z - collider.position.z) * normal.z;

        if (d < this.fabricProperties.thickness) {
            return {
                collided: true,
                normal,
                depth: this.fabricProperties.thickness - d
            };
        }

        return { collided: false, normal: { x: 0, y: 1, z: 0 }, depth: 0 };
    }

    private boxCollision(
        particle: Particle,
        collider: CollisionBody
    ): { collided: boolean; normal: Vector3D; depth: number } {
        const size = collider.size || { x: 1, y: 1, z: 1 };
        const halfSize = {
            x: size.x / 2,
            y: size.y / 2,
            z: size.z / 2
        };

        const local = {
            x: particle.position.x - collider.position.x,
            y: particle.position.y - collider.position.y,
            z: particle.position.z - collider.position.z
        };

        // Check if inside box
        if (Math.abs(local.x) < halfSize.x &&
            Math.abs(local.y) < halfSize.y &&
            Math.abs(local.z) < halfSize.z) {

            // Find closest face
            const distances = {
                x: halfSize.x - Math.abs(local.x),
                y: halfSize.y - Math.abs(local.y),
                z: halfSize.z - Math.abs(local.z)
            };

            let minDist = distances.x;
            let normal: Vector3D = { x: local.x > 0 ? 1 : -1, y: 0, z: 0 };

            if (distances.y < minDist) {
                minDist = distances.y;
                normal = { x: 0, y: local.y > 0 ? 1 : -1, z: 0 };
            }

            if (distances.z < minDist) {
                minDist = distances.z;
                normal = { x: 0, y: 0, z: local.z > 0 ? 1 : -1 };
            }

            return {
                collided: true,
                normal,
                depth: minDist + this.fabricProperties.thickness
            };
        }

        return { collided: false, normal: { x: 0, y: 1, z: 0 }, depth: 0 };
    }

    private isSettled(): boolean {
        const threshold = 0.0001;
        for (const particle of this.particles) {
            if (particle.pinned) continue;
            const speed = Math.sqrt(
                particle.velocity.x ** 2 +
                particle.velocity.y ** 2 +
                particle.velocity.z ** 2
            );
            if (speed > threshold) return false;
        }
        return true;
    }

    /**
     * Start simulation loop
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        const loop = () => {
            if (!this.isRunning) return;
            this.step();
            this.animationFrameId = requestAnimationFrame(loop);
        };

        loop();
    }

    /**
     * Stop simulation
     */
    stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Reset simulation
     */
    reset(): void {
        this.stop();
        this.particles = [];
        this.springs = [];
        this.constraints = [];
        this.simulationTime = 0;
    }

    /**
     * Get particles
     */
    getParticles(): Particle[] {
        return [...this.particles];
    }

    /**
     * Get particle count
     */
    getParticleCount(): number {
        return this.particles.length;
    }

    /**
     * Get springs
     */
    getSprings(): Spring[] {
        return [...this.springs];
    }

    /**
     * Get simulation time
     */
    getSimulationTime(): number {
        return this.simulationTime;
    }

    /**
     * Get fabric properties
     */
    getFabricProperties(): FabricProperties {
        return { ...this.fabricProperties };
    }

    /**
     * Get settings
     */
    getSettings(): SimulationSettings {
        return { ...this.settings };
    }

    /**
     * Update settings
     */
    updateSettings(settings: Partial<SimulationSettings>): void {
        this.settings = {
            ...this.settings,
            ...settings
        };
    }

    /**
     * Export mesh data for rendering
     */
    exportMeshData(): {
        vertices: Float32Array;
        normals: Float32Array;
        uvs: Float32Array;
        indices: Uint32Array;
    } {
        const vertices = new Float32Array(this.particles.length * 3);
        const uvs = new Float32Array(this.particles.length * 2);

        for (let i = 0; i < this.particles.length; i++) {
            vertices[i * 3] = this.particles[i].position.x;
            vertices[i * 3 + 1] = this.particles[i].position.y;
            vertices[i * 3 + 2] = this.particles[i].position.z;

            uvs[i * 2] = this.particles[i].uv.u;
            uvs[i * 2 + 1] = this.particles[i].uv.v;
        }

        // Calculate normals
        const normals = this.calculateNormals(vertices);

        // Generate indices
        const cols = Math.round(Math.sqrt(this.particles.length));
        const rows = Math.floor(this.particles.length / cols);
        const indices: number[] = [];

        for (let y = 0; y < rows - 1; y++) {
            for (let x = 0; x < cols - 1; x++) {
                const i = y * cols + x;
                indices.push(i, i + cols, i + 1);
                indices.push(i + 1, i + cols, i + cols + 1);
            }
        }

        return {
            vertices,
            normals,
            uvs,
            indices: new Uint32Array(indices)
        };
    }

    private calculateNormals(vertices: Float32Array): Float32Array {
        const normals = new Float32Array(vertices.length);
        const cols = Math.round(Math.sqrt(this.particles.length));
        const rows = Math.floor(this.particles.length / cols);

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                const i3 = i * 3;

                // Get neighboring vertices
                const left = x > 0 ? (y * cols + x - 1) * 3 : i3;
                const right = x < cols - 1 ? (y * cols + x + 1) * 3 : i3;
                const up = y > 0 ? ((y - 1) * cols + x) * 3 : i3;
                const down = y < rows - 1 ? ((y + 1) * cols + x) * 3 : i3;

                // Calculate tangent vectors
                const tx = vertices[right] - vertices[left];
                const ty = vertices[right + 1] - vertices[left + 1];
                const tz = vertices[right + 2] - vertices[left + 2];

                const bx = vertices[down] - vertices[up];
                const by = vertices[down + 1] - vertices[up + 1];
                const bz = vertices[down + 2] - vertices[up + 2];

                // Cross product for normal
                let nx = ty * bz - tz * by;
                let ny = tz * bx - tx * bz;
                let nz = tx * by - ty * bx;

                // Normalize
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (len > 0) {
                    nx /= len;
                    ny /= len;
                    nz /= len;
                }

                normals[i3] = nx;
                normals[i3 + 1] = ny;
                normals[i3 + 2] = nz;
            }
        }

        return normals;
    }

    /**
     * Event handling
     */
    addEventListener(listener: SimulationEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: SimulationEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stop();
        this.particles = [];
        this.springs = [];
        this.constraints = [];
        this.colliders.clear();
        this.listeners.clear();
    }
}

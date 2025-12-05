/**
 * 3D Module - Phase 4 Professional Design Tools
 *
 * Exports all 3D visualization and simulation components.
 */

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
    type SceneEvent
} from './scene-manager';

export {
    FabricSimulator,
    type FabricProperties,
    type FabricPreset,
    type Particle,
    type Spring,
    type Constraint,
    type CollisionBody,
    type SimulationSettings,
    type SimulationEvent
} from './fabric-simulator';

export {
    ModelLoader,
    type ModelFormat,
    type ModelLoadOptions,
    type LoadedModel,
    type ModelMetadata,
    type LoaderEvent
} from './model-loader';

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CITY_BUILDINGS,
  CITY_HALF_SIZE,
  findRoadPath,
  getDistrictAt,
  PLAYER_SPAWN,
  PLAYER_SPAWN_ANGLE,
  resolveCircleAABB,
  STREET_CENTERS,
} from './cityGrid';
import {
  acceptMissionState,
  advanceMissionStep,
  calculateMissionReward,
  createInitialMissionRuntime,
  getMissionById,
  getRankTitle,
  MISSIONS,
} from './missionEngine';
import { soundEngine } from './soundEngine';
import {
  CutsceneSequence,
  CutsceneShot,
  evaluateCutsceneAtTime,
  getMissionCompleteCutscene,
  getMissionStartCutscene,
  IN_ENGINE_CUTSCENE_SHOTS,
  MID_GAME_CUTSCENES,
} from './storyData';
import {
  CutsceneCategory,
  CutsceneStateSnapshot,
  EnemySnapshot,
  GamePhase,
  HudSnapshot,
  MissionRuntimeState,
  RewardBreakdown,
  Vec2,
  VehicleSnapshot,
  VirtualInputState,
} from './types';
import {
  createBuildingDetails,
  createBuildingFacadeTexture,
  createCityGroundTexture,
  createHarborPier,
  createVoxelCharacter,
  createVoxelHelicopter,
  createVoxelHydrant,
  createVoxelShippingContainer,
  createVoxelStreetLamp,
  createVoxelTrafficLight,
  createVoxelTree,
  createVoxelVehicle,
  getBoxGeo,
  VoxelCharacterRig,
  VoxelHelicopterRig,
  VoxelVehicleRig,
} from './voxelModels';

interface VehicleEntity {
  id: string;
  kind: VehicleSnapshot['kind'];
  label: string;
  x: number;
  z: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  color: number;
  rig: VoxelVehicleRig;
  isPolicePatrol: boolean;
  missionTag?: string;
}

interface EnemyEntity {
  id: string;
  role: EnemySnapshot['role'];
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  koTimer: number;
  hitFlash: number;
  fireCooldown: number;
  patrolOrigin: Vec2;
  rig: VoxelCharacterRig;
}

interface Projectile {
  active: boolean;
  fromPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
  damage: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface WorldCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onCutsceneUpdate: (snapshot: CutsceneStateSnapshot) => void;
  onMissionPassed: (reward: RewardBreakdown) => void;
  onMissionFailed: (reason: string) => void;
  onOpenLockpick: () => void;
  onToggleMap: () => void;
  onTogglePhone: () => void;
  onTogglePause: () => void;
}

const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function detectSoftwareWebGL(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export class VoxelCityWorld {
  private container: HTMLElement;
  private callbacks: WorldCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private mouseNdc = new THREE.Vector2(0, 0);
  private aimWorld = new THREE.Vector3(0, 0, -10);
  private hasMouseMoved = false;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsedTotal = 0;
  private hudSyncTimer = 0;

  // Input state
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private mouseDown = false;
  private shootCooldown = 0;
  private virtualInput: VirtualInputState = {
    moveX: 0,
    moveZ: 0,
    throttle: 0,
    steer: 0,
    sprint: false,
    firing: false,
  };

  // Game & Player state
  private phase: GamePhase = 'title';
  private lockpickOpen = false;
  private cash = 2500;
  private rep = 50;
  private player = {
    x: PLAYER_SPAWN.x,
    z: PLAYER_SPAWN.z,
    angle: PLAYER_SPAWN_ANGLE,
    hp: 100,
    maxHp: 100,
    armor: 50,
    speed: 0,
    walkDist: 0,
    hitFlash: 0,
    vehicleId: null as string | null,
  };
  private wantedStars = 0;
  private wantedTimer = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;

  // Mission state
  private missionState: MissionRuntimeState = createInitialMissionRuntime();
  private customWaypoint: Vec2 | null = null;
  private lastGpsCalcPos: Vec2 = { x: 9999, z: 9999 };
  private cachedGpsPath: Vec2[] = [];

  // Entities & Scene props
  private playerRig!: VoxelCharacterRig;
  private vehicles: VehicleEntity[] = [];
  private enemies: EnemyEntity[] = [];
  private fixerBooths: Array<{ missionId: string; pos: Vec2; ring: THREE.Mesh; diamond: THREE.Mesh; rig: VoxelCharacterRig }> = [];
  private objectiveBeacon!: THREE.Group;
  private objectiveRing!: THREE.Mesh;
  private waypointBeacon!: THREE.Group;
  private vaultPropGroup!: THREE.Group;
  private lootBags: Array<{ mesh: THREE.Group; pos: Vec2; collected: boolean }> = [];
  private briefcaseProp!: THREE.Group;
  private briefcaseCollected = false;

  // Pooled InstancedMeshes
  private gpsArrowsMesh!: THREE.InstancedMesh;
  private readonly MAX_GPS_ARROWS = 96;

  private projectiles: Projectile[] = [];
  private projMesh!: THREE.InstancedMesh;
  private readonly MAX_PROJ = 32;

  private particles: Particle[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particleCursor = 0;
  private readonly MAX_PARTICLES = 120;

  private camPos = new THREE.Vector3(0, 48, 92);
  private camLook = new THREE.Vector3(0, 0, 0);
  private cutsceneElapsed = 0;
  private cutsceneLastShot = -1;
  private activeCutsceneId = 'intro';
  private activeCutsceneCategory: CutsceneCategory = 'intro';
  private activeCutsceneTitle = '全城战场导览';
  private activeCutsceneShots: CutsceneShot[] = IN_ENGINE_CUTSCENE_SHOTS;
  private onCutsceneComplete: (() => void) | null = null;
  private cutscenePreviewActors: THREE.Object3D[] = [];
  private extractionHeli: VoxelHelicopterRig | null = null;

  constructor(container: HTMLElement, callbacks: WorldCallbacks, autostart: boolean) {
    this.container = container;
    this.callbacks = callbacks;
    this.phase = autostart ? 'playing' : 'title';
    document.body.dataset.state = this.phase;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101827);
    this.scene.fog = new THREE.FogExp2(0x101827, 0.0028);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(aspect < 0.85 ? 55 : 48, aspect, 0.5, 420);
    this.camera.position.copy(this.camPos);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.setupLighting();
    this.buildCityGeometry();
    this.buildDynamicActors();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.pushHudSnapshot(true);
    this.scheduleNextFrame();
  }

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.72);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffcf99, 1.55);
    sun.position.set(85, 110, 75);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -138;
      sun.shadow.camera.right = 138;
      sun.shadow.camera.top = 138;
      sun.shadow.camera.bottom = -138;
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 320;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.02;
    }
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x60a5fa, 0.45);
    rim.position.set(-80, 50, -90);
    this.scene.add(rim);
  }

  private mergeStaticGroup(root: THREE.Group) {
    root.updateMatrixWorld(true);
    const buckets = new Map<
      THREE.Material,
      { geos: THREE.BufferGeometry[]; castShadow: boolean; receiveShadow: boolean }
    >();

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (Array.isArray(obj.material)) return;
      const mat = obj.material;
      const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      geo.applyMatrix4(obj.matrixWorld);
      if (!geo.attributes.normal) {
        geo.computeVertexNormals();
      }
      let entry = buckets.get(mat);
      if (!entry) {
        entry = { geos: [], castShadow: false, receiveShadow: false };
        buckets.set(mat, entry);
      }
      entry.geos.push(geo);
      if (obj.castShadow) entry.castShadow = true;
      if (obj.receiveShadow) entry.receiveShadow = true;
    });

    for (const [mat, entry] of buckets.entries()) {
      if (entry.geos.length === 1) {
        const m = new THREE.Mesh(entry.geos[0], mat);
        m.castShadow = entry.castShadow;
        m.receiveShadow = entry.receiveShadow;
        this.scene.add(m);
        continue;
      }
      const refKeys = Object.keys(entry.geos[0].attributes).sort().join(',');
      const compatible = entry.geos.every((g) => Object.keys(g.attributes).sort().join(',') === refKeys);
      if (compatible) {
        const merged = mergeGeometries(entry.geos, false);
        if (merged) {
          for (const g of entry.geos) g.dispose();
          const m = new THREE.Mesh(merged, mat);
          m.castShadow = entry.castShadow;
          m.receiveShadow = entry.receiveShadow;
          this.scene.add(m);
          continue;
        }
      }
      for (const g of entry.geos) {
        const m = new THREE.Mesh(g, mat);
        m.castShadow = entry.castShadow;
        m.receiveShadow = entry.receiveShadow;
        this.scene.add(m);
      }
    }
  }

  private buildCityGeometry() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Surrounding Harbor Water Plane
    const waterGeo = new THREE.PlaneGeometry(760, 760);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0b2538,
      roughness: 0.25,
      metalness: 0.35,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = -0.45;
    this.scene.add(water);

    // Seawall island foundation slab
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });
    const slab = new THREE.Mesh(getBoxGeo(CITY_HALF_SIZE * 2 + 6, 0.9, CITY_HALF_SIZE * 2 + 6), slabMat);
    slab.position.y = -0.46;
    this.scene.add(slab);

    // City Road + Sidewalk Ground Plane
    const groundTex = createCityGroundTexture(maxAniso);
    const groundGeo = new THREE.PlaneGeometry(CITY_HALF_SIZE * 2, CITY_HALF_SIZE * 2);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Batch all single-material static architectural details & street furniture into merged draw calls
    const staticBatchRoot = new THREE.Group();

    // Perimeter low concrete highway barriers with glowing corner beacons
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    const edgeOffset = CITY_HALF_SIZE + 0.6;
    const wallPositions: Array<[number, number, number, number]> = [
      [0, -edgeOffset, CITY_HALF_SIZE * 2 + 2, 1.2],
      [0, edgeOffset, CITY_HALF_SIZE * 2 + 2, 1.2],
      [-edgeOffset, 0, 1.2, CITY_HALF_SIZE * 2 + 2],
      [edgeOffset, 0, 1.2, CITY_HALF_SIZE * 2 + 2],
    ];
    for (const [wx, wz, ww, wd] of wallPositions) {
      const wall = new THREE.Mesh(getBoxGeo(ww, 1.1, wd), barrierMat);
      wall.position.set(wx, 0.55, wz);
      staticBatchRoot.add(wall);
    }

    const cornerBeaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
    });
    for (const sx of [-edgeOffset, edgeOffset]) {
      for (const sz of [-edgeOffset, edgeOffset]) {
        const pier = new THREE.Mesh(getBoxGeo(2.4, 2.4, 2.4), barrierMat);
        pier.position.set(sx, 1.2, sz);
        staticBatchRoot.add(pier);
        const cap = new THREE.Mesh(getBoxGeo(1.1, 0.7, 1.1), cornerBeaconMat);
        cap.position.set(sx, 2.75, sz);
        staticBatchRoot.add(cap);
      }
    }

    // Outer Harbor Piers & Moored Cargo Containers along South & East waterfronts
    const pierPositions: Array<[number, number, number]> = [
      [CITY_HALF_SIZE + 7.2, 42, 0],
      [CITY_HALF_SIZE + 7.2, 92, 0],
      [CITY_HALF_SIZE + 7.2, -48, 0],
      [48, CITY_HALF_SIZE + 7.2, Math.PI / 2],
      [98, CITY_HALF_SIZE + 7.2, Math.PI / 2],
      [-76, CITY_HALF_SIZE + 7.2, Math.PI / 2],
    ];
    for (const [px, pz, rot] of pierPositions) {
      const pier = createHarborPier();
      pier.position.set(px, 0, pz);
      pier.rotation.y = rot;
      staticBatchRoot.add(pier);
    }
    const harborContainerSpecs: Array<[number, number, number, number]> = [
      [CITY_HALF_SIZE + 6.5, 42, 0.15, 0x0f766e],
      [CITY_HALF_SIZE + 6.5, 91.5, 0.15, 0xb91c1c],
      [CITY_HALF_SIZE + 6.5, 94.2, 0.15, 0xd97706],
      [CITY_HALF_SIZE + 6.5, -48, 0.15, 0x1d4ed8],
      [48, CITY_HALF_SIZE + 6.8, Math.PI / 2, 0x1d4ed8],
      [98, CITY_HALF_SIZE + 6.8, Math.PI / 2, 0x0f766e],
      [-76, CITY_HALF_SIZE + 6.8, Math.PI / 2, 0xd97706],
    ];
    for (const [cx, cz, rot, color] of harborContainerSpecs) {
      const cont = createVoxelShippingContainer(color);
      cont.position.set(cx, 0.15, cz);
      cont.rotation.y = rot;
      staticBatchRoot.add(cont);
    }

    // Voxel Buildings with upgraded facades, plinths, setbacks & landmarks
    const facadeCache = new Map<string, THREE.CanvasTexture>();
    for (const b of CITY_BUILDINGS) {
      const w = b.maxX - b.minX;
      const d = b.maxZ - b.minZ;
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;

      const cacheKey = `${b.color}_${b.accentColor}`;
      let tex = facadeCache.get(cacheKey);
      if (!tex) {
        tex = createBuildingFacadeTexture(b.color, b.accentColor, maxAniso);
        facadeCache.set(cacheKey, tex);
      }

      const sideMat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.15,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.85,
        metalness: 0.1,
      });

      const body = new THREE.Mesh(getBoxGeo(w, b.height, d), [
        sideMat,
        sideMat,
        roofMat,
        roofMat,
        sideMat,
        sideMat,
      ]);
      body.position.set(cx, b.height / 2, cz);
      body.castShadow = true;
      body.receiveShadow = true;
      this.scene.add(body);

      const details = createBuildingDetails(b);
      details.position.set(cx, 0, cz);
      staticBatchRoot.add(details);
    }

    // Localized glow accents at inner & outer hero landmarks
    const landmarkLights: Array<[number, number, number, number, number]> = [
      [-45, 7, -40, 0xfbbf24, 14],
      [45, 7, -40, 0xfb7185, 14],
      [-105, 8, -100, 0xf43f5e, 18],
      [105, 7, -100, 0xe879f9, 16],
      [-105, 7, 100, 0xf97316, 15],
      [105, 8, 100, 0x38bdf8, 16],
    ];
    for (const [lx, ly, lz, color, intensity] of landmarkLights) {
      const pt = new THREE.PointLight(color, intensity, 28, 2);
      pt.position.set(lx, ly, lz);
      this.scene.add(pt);
    }

    // Voxel Trees along inner & outer boulevard sidewalk corners (strictly clear of lanes & footprints)
    const treeCoords: Array<[number, number]> = [
      [-35.4, -35.4],
      [-5.4, -35.4],
      [5.4, -35.4],
      [35.4, -35.4],
      [-35.4, -5.4],
      [35.4, -5.4],
      [-35.4, 35.4],
      [35.4, 35.4],
      [-5.4, 35.4],
      [5.4, 35.4],
      [-65.4, -65.4],
      [65.4, -65.4],
      [-65.4, 65.4],
      [65.4, 65.4],
      [-95.4, -95.4],
      [95.4, -95.4],
      [-95.4, 95.4],
      [95.4, 95.4],
      [-95.4, -5.4],
      [95.4, 5.4],
      [-5.4, -95.4],
      [5.4, 95.4],
      [-65.4, -5.4],
      [65.4, 5.4],
    ];
    for (let i = 0; i < treeCoords.length; i++) {
      const [tx, tz] = treeCoords[i];
      const tree = createVoxelTree(0.9 + (i % 3) * 0.14);
      tree.position.set(tx, 0, tz);
      staticBatchRoot.add(tree);
    }

    // Street Lamps along major avenues across inner & outer city
    const lampCoords: Array<[number, number, number]> = [];
    for (const sx of [-90, -30, 0, 30, 90]) {
      for (const lz of [-75, -15, 15, 75]) {
        lampCoords.push([sx - 5.3, lz, 0]);
        lampCoords.push([sx + 5.3, lz, Math.PI]);
      }
    }
    for (const [lx, lz, rot] of lampCoords) {
      const lamp = createVoxelStreetLamp();
      lamp.position.set(lx, 0, lz);
      lamp.rotation.y = rot;
      staticBatchRoot.add(lamp);
    }

    // Traffic Lights at primary avenue intersections
    const trafficCoords: Array<[number, number, number]> = [
      [-5.3, -5.3, 0],
      [5.3, 5.3, Math.PI],
      [-35.3, -35.3, 0],
      [35.3, -35.3, Math.PI],
      [-35.3, 35.3, 0],
      [35.3, 35.3, Math.PI],
      [-65.3, -65.3, 0],
      [65.3, -65.3, Math.PI],
      [-65.3, 65.3, 0],
      [65.3, 65.3, Math.PI],
      [-95.3, -95.3, 0],
      [95.3, -95.3, Math.PI],
      [-95.3, 95.3, 0],
      [95.3, 95.3, Math.PI],
    ];
    for (const [tx, tz, rot] of trafficCoords) {
      const tl = createVoxelTrafficLight();
      tl.position.set(tx, 0, tz);
      tl.rotation.y = rot;
      staticBatchRoot.add(tl);
    }

    // Sidewalk Fire Hydrants
    const hydrantCoords: Array<[number, number]> = [
      [-5.5, 10],
      [5.5, -20],
      [-35.5, -20],
      [35.5, 10],
      [-65.5, 20],
      [65.5, -20],
      [-95.5, 42],
      [95.5, -42],
    ];
    for (const [hx, hz] of hydrantCoords) {
      const hydrant = createVoxelHydrant();
      hydrant.position.set(hx, 0, hz);
      staticBatchRoot.add(hydrant);
    }

    this.mergeStaticGroup(staticBatchRoot);
  }

  private buildDynamicActors() {
    // Player Character
    this.playerRig = createVoxelCharacter({
      jacketColor: 0x0ea5e9,
      pantsColor: 0x1e293b,
      hasVisor: true,
      hasWeapon: true,
    });
    this.playerRig.group.position.set(this.player.x, 0, this.player.z);
    this.playerRig.group.rotation.y = this.player.angle;
    this.scene.add(this.playerRig.group);

    // Parked & Mission Vehicles (on open streets, clear of spawn & buildings)
    const initialVehicles: Array<{
      id: string;
      kind: VehicleSnapshot['kind'];
      label: string;
      x: number;
      z: number;
      angle: number;
      color: number;
      maxSpeed: number;
      missionTag?: string;
    }> = [
      {
        id: 'v-muscle-1',
        kind: 'muscle',
        label: '暗影肌肉车 · Dominator',
        x: 3.2,
        z: 6,
        angle: 0,
        color: 0xe11d48,
        maxSpeed: 24,
      },
      {
        id: 'v-taxi-1',
        kind: 'taxi',
        label: '像素出租车 · Block Cab',
        x: -3.2,
        z: -12,
        angle: Math.PI,
        color: 0xfacc15,
        maxSpeed: 20,
      },
      {
        id: 'v-van-1',
        kind: 'van',
        label: '装甲押运车 · Enforcer Van',
        x: -28,
        z: -24,
        angle: 0,
        color: 0x475569,
        maxSpeed: 18,
      },
      {
        id: 'v-cargo-1',
        kind: 'cargo',
        label: '走私改装车 · Apex GT',
        x: 44,
        z: 20,
        angle: Math.PI / 2,
        color: 0x10b981,
        maxSpeed: 27,
        missionTag: 'hot_cargo',
      },
      {
        id: 'v-convoy-1',
        kind: 'van',
        label: '议会装甲押运车 · Obsidian Van',
        x: -105,
        z: 99,
        angle: -Math.PI / 2,
        color: 0x334155,
        maxSpeed: 22,
        missionTag: 'convoy_ambush',
      },
      {
        id: 'v-muscle-west',
        kind: 'muscle',
        label: '暗夜拦截跑车 · Banshee',
        x: -62,
        z: 18,
        angle: 0,
        color: 0x0ea5e9,
        maxSpeed: 25,
      },
      {
        id: 'v-taxi-east',
        kind: 'taxi',
        label: '唐人街夜行计程车 · Neon Cab',
        x: 62,
        z: -18,
        angle: Math.PI,
        color: 0xfacc15,
        maxSpeed: 21,
      },
      {
        id: 'v-muscle-nw',
        kind: 'muscle',
        label: '黑曜石超跑 · Obsidian GT',
        x: -92,
        z: -90,
        angle: -Math.PI / 2,
        color: 0x1e293b,
        maxSpeed: 26,
      },
      {
        id: 'v-taxi-ne',
        kind: 'taxi',
        label: '九龙赌城礼宾车 · Kowloon VIP',
        x: 92,
        z: -90,
        angle: Math.PI / 2,
        color: 0xbe185d,
        maxSpeed: 22,
      },
      {
        id: 'v-cargo-se',
        kind: 'cargo',
        label: '灯塔港改装跑车 · Harbor GT',
        x: 92,
        z: 90,
        angle: 0,
        color: 0x059669,
        maxSpeed: 25,
      },
    ];

    for (const v of initialVehicles) {
      const rig = createVoxelVehicle(v.kind, v.color);
      rig.group.position.set(v.x, 0, v.z);
      rig.group.rotation.y = v.angle;
      this.scene.add(rig.group);
      this.vehicles.push({
        ...v,
        speed: 0,
        rig,
        isPolicePatrol: false,
      });
    }

    // Fixer Contact Booths (in-world mission acceptance points!)
    for (const m of MISSIONS) {
      const color = m.category === 'HEIST' ? 0xfbbf24 : m.category === 'ASSASSINATION' ? 0xf43f5e : 0x34d399;
      const rig = createVoxelCharacter({
        jacketColor: color,
        pantsColor: 0x0f172a,
        hasHat: true,
        hatColor: 0x1e293b,
      });
      rig.group.position.set(m.fixerPos.x, 0, m.fixerPos.z);
      this.scene.add(rig.group);

      const ringGeo = new THREE.RingGeometry(1.4, 1.85, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      ring.position.set(m.fixerPos.x, 0.04, m.fixerPos.z);
      this.scene.add(ring);

      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 0),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.0,
          roughness: 0.2,
        })
      );
      diamond.position.set(m.fixerPos.x, 2.55, m.fixerPos.z);
      this.scene.add(diamond);

      this.fixerBooths.push({ missionId: m.id, pos: m.fixerPos, ring, diamond, rig });
    }

    // Tactical Extraction Helicopter parked atop Liberty Helipad (SE corner)
    this.extractionHeli = createVoxelHelicopter();
    this.extractionHeli.group.position.set(103.8, 11.72, 107.7);
    this.extractionHeli.group.rotation.y = Math.PI * 0.25;
    this.scene.add(this.extractionHeli.group);

    // Active Mission Objective Beacon
    this.objectiveBeacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 28, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 14;
    this.objectiveBeacon.add(beam);

    const ringGeo = new THREE.RingGeometry(2.2, 2.75, 28);
    ringGeo.rotateX(-Math.PI / 2);
    this.objectiveRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    this.objectiveRing.position.y = 0.05;
    this.objectiveBeacon.add(this.objectiveRing);
    this.objectiveBeacon.visible = false;
    this.scene.add(this.objectiveBeacon);

    // Custom Map Waypoint Beacon (Cyan)
    this.waypointBeacon = new THREE.Group();
    const wpBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 22, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    wpBeam.position.y = 11;
    this.waypointBeacon.add(wpBeam);
    this.waypointBeacon.visible = false;
    this.scene.add(this.waypointBeacon);

    // Bank Vault Console Prop
    this.vaultPropGroup = new THREE.Group();
    const consoleBody = new THREE.Mesh(
      getBoxGeo(1.6, 1.5, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 })
    );
    consoleBody.position.y = 0.75;
    this.vaultPropGroup.add(consoleBody);
    const consoleScreen = new THREE.Mesh(
      getBoxGeo(1.1, 0.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.2 })
    );
    consoleScreen.position.set(0, 1.15, 0.48);
    this.vaultPropGroup.add(consoleScreen);
    this.vaultPropGroup.position.set(-45, 0, -42.5);
    this.vaultPropGroup.visible = false;
    this.scene.add(this.vaultPropGroup);

    // Loot Cash Bags (2 bags near Bank)
    const bagOffsets: Vec2[] = [
      { x: -42.5, z: -38.5 },
      { x: -39.5, z: -38.5 },
    ];
    for (const pos of bagOffsets) {
      const bag = new THREE.Group();
      const sack = new THREE.Mesh(
        getBoxGeo(0.75, 0.55, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 })
      );
      sack.position.y = 0.28;
      bag.add(sack);
      const strap = new THREE.Mesh(
        getBoxGeo(0.8, 0.14, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
      );
      strap.position.y = 0.58;
      bag.add(strap);
      bag.position.set(pos.x, 0, pos.z);
      bag.visible = false;
      this.scene.add(bag);
      this.lootBags.push({ mesh: bag, pos, collected: false });
    }

    // Encrypted Briefcase Prop (Assassination Mission)
    this.briefcaseProp = new THREE.Group();
    const caseBody = new THREE.Mesh(
      getBoxGeo(0.72, 0.48, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 })
    );
    caseBody.position.y = 0.26;
    this.briefcaseProp.add(caseBody);
    const caseGlow = new THREE.Mesh(
      getBoxGeo(0.5, 0.12, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.2 })
    );
    caseGlow.position.y = 0.32;
    this.briefcaseProp.add(caseGlow);
    this.briefcaseProp.visible = false;
    this.scene.add(this.briefcaseProp);

    // Pooled 3D GPS Chevron Breadcrumbs
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.55);
    arrowShape.lineTo(0.45, -0.35);
    arrowShape.lineTo(0, -0.1);
    arrowShape.lineTo(-0.45, -0.35);
    arrowShape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.1, bevelEnabled: false });
    arrowGeo.rotateX(-Math.PI / 2);
    this.gpsArrowsMesh = new THREE.InstancedMesh(
      arrowGeo,
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 }),
      this.MAX_GPS_ARROWS
    );
    this.gpsArrowsMesh.count = 0;
    this.gpsArrowsMesh.frustumCulled = false;
    this.scene.add(this.gpsArrowsMesh);

    // Pooled Projectiles
    const projGeo = getBoxGeo(0.22, 0.22, 0.65);
    const projMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.projMesh = new THREE.InstancedMesh(projGeo, projMat, this.MAX_PROJ);
    this.projMesh.count = 0;
    this.projMesh.frustumCulled = false;
    this.scene.add(this.projMesh);
    for (let i = 0; i < this.MAX_PROJ; i++) {
      this.projectiles.push({
        active: false,
        fromPlayer: true,
        x: 0,
        y: 1,
        z: 0,
        vx: 0,
        vz: 0,
        life: 0,
        damage: 25,
      });
    }

    // Pooled Voxel Burst Particles
    const partGeo = getBoxGeo(0.28, 0.28, 0.28);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, this.MAX_PARTICLES);
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.MAX_PARTICLES * 3),
      3
    );
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        size: 1,
        color: new THREE.Color(0xffffff),
      });
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onWindowBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onWindowBlur);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    this.camera.fov = aspect < 0.85 ? 55 : 48;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onWindowBlur = () => {
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDown = false;
    this.resetVirtualInput();
  };

  private resetVirtualInput() {
    this.virtualInput.moveX = 0;
    this.virtualInput.moveZ = 0;
    this.virtualInput.throttle = 0;
    this.virtualInput.steer = 0;
    this.virtualInput.sprint = false;
    this.virtualInput.firing = false;
  }

  public setVirtualInput(patch: Partial<VirtualInputState>) {
    Object.assign(this.virtualInput, patch);
    if (
      Math.abs(this.virtualInput.moveX) > 0.05 ||
      Math.abs(this.virtualInput.moveZ) > 0.05 ||
      this.virtualInput.firing
    ) {
      this.hasMouseMoved = false;
    }
  }

  public triggerVirtualAction(action: 'interact' | 'vehicle') {
    soundEngine.unlock();
    if (this.phase !== 'playing') return;
    this.justPressed.add(action === 'interact' ? 'KeyE' : 'KeyF');
  }

  private onKeyDown = (e: KeyboardEvent) => {
    soundEngine.unlock();
    const code = e.code;
    if (!this.keys.has(code)) {
      this.justPressed.add(code);
    }
    this.keys.add(code);

    if (code === 'Escape' || code === 'KeyP') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        this.callbacks.onTogglePause();
      }
    } else if (code === 'KeyM' && this.phase === 'playing') {
      this.callbacks.onToggleMap();
    } else if (code === 'Tab' && this.phase === 'playing') {
      e.preventDefault();
      this.callbacks.onTogglePhone();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.hasMouseMoved = true;
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    this.raycaster.ray.intersectPlane(_groundPlane, this.aimWorld);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    soundEngine.unlock();
    this.onPointerMove(e);
    this.mouseDown = true;
  };

  private onPointerUp = () => {
    this.mouseDown = false;
  };

  // --- Public API for React Shell ---

  public startGame() {
    soundEngine.unlock();
    this.clearCutscenePreviewActors();
    this.phase = 'playing';
    document.body.dataset.state = 'playing';
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDown = false;
    this.pushHudSnapshot(true);
  }

  public startInEngineCutscene() {
    soundEngine.unlock();
    this.clearCutscenePreviewActors();
    this.cutsceneElapsed = 0;
    this.cutsceneLastShot = -1;
    this.phase = 'cutscene';
    document.body.dataset.state = 'cutscene';
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDown = false;

    // Spawn live showcase preview actors across inner & outer landmarks
    this.vaultPropGroup.position.set(-45, 0, -42.5);
    this.vaultPropGroup.visible = true;
    const bankGuard = createVoxelCharacter({
      jacketColor: 0x334155,
      pantsColor: 0x0f172a,
      hasVisor: true,
      hasWeapon: true,
    });
    bankGuard.group.position.set(-42, 0, -37);
    bankGuard.group.rotation.y = Math.PI * 0.15;
    this.scene.add(bankGuard.group);
    this.cutscenePreviewActors.push(bankGuard.group);

    const vipPreview = createVoxelCharacter({
      jacketColor: 0xf8fafc,
      pantsColor: 0xe2e8f0,
      hasTargetMarker: true,
      hasWeapon: true,
      scale: 1.12,
    });
    vipPreview.group.position.set(45, 0, -40);
    this.scene.add(vipPreview.group);
    this.cutscenePreviewActors.push(vipPreview.group);

    const jadeGuard = createVoxelCharacter({
      jacketColor: 0x334155,
      pantsColor: 0x0f172a,
      hasVisor: true,
      hasWeapon: true,
    });
    jadeGuard.group.position.set(41.5, 0, -38.5);
    this.scene.add(jadeGuard.group);
    this.cutscenePreviewActors.push(jadeGuard.group);

    // Outer-ring Refinery Convoy Guards (Shot 4)
    for (const [gx, gz] of [
      [-109, 98],
      [-101, 98],
    ]) {
      const rg = createVoxelCharacter({
        jacketColor: 0x451a03,
        pantsColor: 0x1c1917,
        hasVisor: true,
        hasWeapon: true,
      });
      rg.group.position.set(gx, 0, gz);
      this.scene.add(rg.group);
      this.cutscenePreviewActors.push(rg.group);
    }

    // Outer-ring Obsidian Spire Bishop VIP + Elite Guards (Shot 5)
    const bishopPreview = createVoxelCharacter({
      jacketColor: 0xf8fafc,
      pantsColor: 0x0f172a,
      hasTargetMarker: true,
      hasWeapon: true,
      scale: 1.16,
    });
    bishopPreview.group.position.set(-105, 0, -99);
    this.scene.add(bishopPreview.group);
    this.cutscenePreviewActors.push(bishopPreview.group);

    for (const [sx, sz] of [
      [-109, -98],
      [-101, -98],
    ]) {
      const sg = createVoxelCharacter({
        jacketColor: 0x1e293b,
        pantsColor: 0x090d16,
        hasVisor: true,
        hasWeapon: true,
      });
      sg.group.position.set(sx, 0, sz);
      this.scene.add(sg.group);
      this.cutscenePreviewActors.push(sg.group);
    }

    this.playCutsceneSequence(
      {
        id: 'intro',
        category: 'intro',
        title: '自由港全城实机导览',
        shots: IN_ENGINE_CUTSCENE_SHOTS,
      },
      () => {
        this.resumePlayingAfterCutscene('实机导览结束：可前往联络人光圈或按 [Tab] 接取 5 项全域合约');
      }
    );
  }

  private playCutsceneSequence(seq: CutsceneSequence, onComplete: () => void) {
    soundEngine.unlock();
    if (this.player.vehicleId) {
      const car = this.vehicles.find((v) => v.id === this.player.vehicleId);
      if (car) car.speed = 0;
    }
    this.activeCutsceneId = seq.id;
    this.activeCutsceneCategory = seq.category;
    this.activeCutsceneTitle = seq.title;
    this.activeCutsceneShots = seq.shots;
    this.onCutsceneComplete = onComplete;
    this.cutsceneElapsed = 0;
    this.cutsceneLastShot = -1;
    this.phase = 'cutscene';
    document.body.dataset.state = 'cutscene';
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDown = false;
    this.resetVirtualInput();

    const firstFrame = evaluateCutsceneAtTime(0, this.activeCutsceneShots);
    this.camPos.set(...firstFrame.camPos);
    this.camLook.set(...firstFrame.lookAt);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.callbacks.onCutsceneUpdate({
      category: this.activeCutsceneCategory,
      title: this.activeCutsceneTitle,
      shotIndex: firstFrame.shotIndex,
      totalShots: firstFrame.totalShots,
      progressPct: 0,
      locationTag: firstFrame.shot.locationTag,
      speaker: firstFrame.shot.speaker,
      subtitle: firstFrame.shot.subtitle,
    });
    this.pushHudSnapshot(true);
  }

  private resumePlayingAfterCutscene(toast?: string) {
    this.clearCutscenePreviewActors();
    if (this.extractionHeli) {
      this.extractionHeli.group.position.set(103.8, 11.72, 107.7);
      this.extractionHeli.group.rotation.set(0, Math.PI * 0.25, 0);
    }
    const keepVault =
      this.missionState.activeMissionId === 'bank_heist' ||
      this.missionState.activeMissionId === 'obsidian_takedown';
    this.vaultPropGroup.visible = keepVault;
    this.phase = 'playing';
    document.body.dataset.state = 'playing';
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDown = false;
    soundEngine.playMissionAccept();
    if (toast) this.showToast(toast);
    this.pushHudSnapshot(true);
  }

  public finishInEngineCutscene() {
    const cb = this.onCutsceneComplete;
    this.onCutsceneComplete = null;
    if (cb) {
      cb();
    } else {
      this.resumePlayingAfterCutscene('实机导览结束：可前往联络人光圈或按 [Tab] 接取 5 项全域合约');
    }
  }

  private clearCutscenePreviewActors() {
    for (const obj of this.cutscenePreviewActors) {
      this.scene.remove(obj);
    }
    this.cutscenePreviewActors = [];
  }

  public setPhase(next: GamePhase) {
    if (next !== 'cutscene') {
      this.clearCutscenePreviewActors();
      if (
        this.missionState.activeMissionId !== 'bank_heist' &&
        this.missionState.activeMissionId !== 'obsidian_takedown'
      ) {
        this.vaultPropGroup.visible = false;
      }
    }
    this.phase = next;
    document.body.dataset.state = next === 'settlement' || next === 'failed' ? 'gameover' : next;
    if (next !== 'playing') {
      this.keys.clear();
      this.mouseDown = false;
      this.resetVirtualInput();
    }
    this.pushHudSnapshot(true);
  }

  public setLockpickOpen(open: boolean) {
    this.lockpickOpen = open;
    if (open) {
      this.keys.clear();
      this.mouseDown = false;
    }
    this.pushHudSnapshot(true);
  }

  public completeLockpickSuccess() {
    this.lockpickOpen = false;
    this.missionState.safeCracked = true;
    soundEngine.playStepComplete();
    if (this.missionState.activeMissionId === 'obsidian_takedown') {
      this.spawnParticles(-105, 1.2, -102, 0xf43f5e, 18);
      this.advanceAndSync('议会激光门禁已黑入！消灭黑曜石主教并夺回总账密钥！');
      const mission = getMissionById(this.missionState.activeMissionId);
      const curStep = mission?.steps[this.missionState.currentStepIndex];
      if (curStep?.type === 'ELIMINATE_TARGET' && this.missionState.targetEliminated) {
        this.advanceAndSync('黑曜石主教已倒下！靠近拾取总账密钥箱！');
      } else {
        this.playCutsceneSequence(MID_GAME_CUTSCENES.mid_bishop_confrontation, () => {
          this.resumePlayingAfterCutscene('「黑曜石主教」现身！击败主教并夺回总账密钥箱！');
        });
      }
    } else {
      this.spawnParticles(-45, 1.2, -41, 0x38bdf8, 18);
      this.advanceAndSync('金库密码锁已破解！快抢夺现钞！');
      this.playCutsceneSequence(MID_GAME_CUTSCENES.mid_bank_breach, () => {
        this.resumePlayingAfterCutscene('警报拉响！抢夺两袋现金后驱车逃往海港安全屋！');
      });
    }
  }

  public acceptMission(missionId: string) {
    soundEngine.unlock();
    const mission = getMissionById(missionId);
    if (!mission) return;

    this.clearMissionEntities();
    this.missionState = acceptMissionState(this.missionState, missionId);
    this.player.hp = this.player.maxHp;
    this.player.armor = 50;
    this.wantedStars = 0;
    this.wantedTimer = 0;
    this.customWaypoint = null;
    this.lastGpsCalcPos = { x: 9999, z: 9999 };

    // Spawn mission-specific world props & guards
    this.setupMissionActors(missionId);
    soundEngine.playMissionAccept();

    const startSeq = getMissionStartCutscene(missionId);
    if (startSeq) {
      this.playCutsceneSequence(startSeq, () => {
        this.resumePlayingAfterCutscene(`已接取合约：${mission.title} (${mission.code})`);
      });
    } else {
      this.showToast(`已接取合约：${mission.title} (${mission.code})`);
      this.pushHudSnapshot(true);
    }
  }

  public abandonMission() {
    this.clearMissionEntities();
    this.missionState = {
      ...createInitialMissionRuntime(),
      completedMissionIds: this.missionState.completedMissionIds,
    };
    this.wantedStars = 0;
    this.showToast('已中止当前合约');
    this.pushHudSnapshot(true);
  }

  public setCustomWaypoint(pos: Vec2 | null) {
    this.customWaypoint = pos;
    this.lastGpsCalcPos = { x: 9999, z: 9999 };
    if (pos) {
      this.showToast('已在城市地图设定自定义 GPS 导航点');
    }
    this.pushHudSnapshot(true);
  }

  public respawnAfterFailure() {
    this.clearMissionEntities();
    this.player.hp = this.player.maxHp;
    this.player.armor = 50;
    this.player.vehicleId = null;
    this.player.x = PLAYER_SPAWN.x;
    this.player.z = PLAYER_SPAWN.z;
    this.player.angle = PLAYER_SPAWN_ANGLE;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.player.x, 0, this.player.z);
    this.wantedStars = 0;
    this.cash = Math.max(0, this.cash - 350);
    this.missionState = {
      ...createInitialMissionRuntime(),
      completedMissionIds: this.missionState.completedMissionIds,
    };
    this.setPhase('playing');
    this.showToast('已支付 $350 医疗费出院，可重新接取任务');
  }

  private clearMissionEntities() {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.group);
    }
    this.enemies = [];
    this.vaultPropGroup.visible = false;
    for (const bag of this.lootBags) {
      bag.collected = false;
      bag.mesh.visible = false;
    }
    this.briefcaseProp.visible = false;
    this.briefcaseCollected = false;

    // Reset mission vehicles if moved
    const cargo = this.vehicles.find((v) => v.missionTag === 'hot_cargo');
    if (cargo && this.player.vehicleId !== cargo.id) {
      cargo.x = 44;
      cargo.z = 20;
      cargo.angle = Math.PI / 2;
      cargo.speed = 0;
      cargo.rig.group.position.set(cargo.x, 0, cargo.z);
      cargo.rig.group.rotation.y = cargo.angle;
    }

    const convoy = this.vehicles.find((v) => v.missionTag === 'convoy_ambush');
    if (convoy && this.player.vehicleId !== convoy.id) {
      convoy.x = -105;
      convoy.z = 99;
      convoy.angle = -Math.PI / 2;
      convoy.speed = 0;
      convoy.rig.group.position.set(convoy.x, 0, convoy.z);
      convoy.rig.group.rotation.y = convoy.angle;
    }

    // Remove spawned police pursuit cars
    this.vehicles = this.vehicles.filter((v) => {
      if (v.isPolicePatrol && this.player.vehicleId !== v.id) {
        this.scene.remove(v.rig.group);
        return false;
      }
      return true;
    });
  }

  private setupMissionActors(missionId: string) {
    if (missionId === 'bank_heist') {
      this.vaultPropGroup.position.set(-45, 0, -42.5);
      this.vaultPropGroup.visible = true;
      for (const bag of this.lootBags) {
        bag.collected = false;
        bag.mesh.visible = false;
      }
      this.spawnEnemy('guard', -49, -37);
      this.spawnEnemy('guard', -39, -36);
      this.spawnEnemy('guard', -45, -33);
    } else if (missionId === 'neon_assassination') {
      this.spawnEnemy('vip', 45, -40);
      this.spawnEnemy('guard', 41, -38);
      this.spawnEnemy('guard', 49, -38);
    } else if (missionId === 'hot_cargo') {
      const cargo = this.vehicles.find((v) => v.missionTag === 'hot_cargo');
      if (cargo) {
        if (this.player.vehicleId === cargo.id) {
          this.exitVehicle();
        }
        cargo.x = 44;
        cargo.z = 20;
        cargo.angle = Math.PI / 2;
        cargo.speed = 0;
        cargo.rig.group.position.set(cargo.x, 0, cargo.z);
        cargo.rig.group.rotation.y = cargo.angle;
      }
      this.spawnEnemy('guard', 40, 22);
    } else if (missionId === 'convoy_ambush') {
      const convoy = this.vehicles.find((v) => v.missionTag === 'convoy_ambush');
      if (convoy) {
        if (this.player.vehicleId === convoy.id) {
          this.exitVehicle();
        }
        convoy.x = -105;
        convoy.z = 99;
        convoy.angle = -Math.PI / 2;
        convoy.speed = 0;
        convoy.rig.group.position.set(convoy.x, 0, convoy.z);
        convoy.rig.group.rotation.y = convoy.angle;
      }
      this.spawnEnemy('guard', -109, 98);
      this.spawnEnemy('guard', -101, 98);
      this.spawnEnemy('guard', -105, 95);
    } else if (missionId === 'obsidian_takedown') {
      this.vaultPropGroup.position.set(-105, 0, -102);
      this.vaultPropGroup.visible = true;
      this.spawnEnemy('vip', -105, -99, 160);
      this.spawnEnemy('guard', -109, -98);
      this.spawnEnemy('guard', -101, -98);
      this.spawnEnemy('guard', -105, -95.5);
    }
  }

  private spawnEnemy(role: EnemySnapshot['role'], x: number, z: number, customHp?: number) {
    const isVip = role === 'vip';
    const isPolice = role === 'police';
    const rig = createVoxelCharacter({
      jacketColor: isVip ? 0xf8fafc : isPolice ? 0x1d4ed8 : 0x334155,
      pantsColor: isVip ? 0xe2e8f0 : 0x0f172a,
      hasVisor: !isVip,
      hasHat: isPolice,
      hatColor: 0x1e3a8a,
      hasTargetMarker: isVip,
      hasWeapon: true,
      scale: isVip ? 1.12 : 1,
    });
    rig.group.position.set(x, 0, z);
    this.scene.add(rig.group);

    const hp = customHp ?? (isVip ? 110 : isPolice ? 75 : 65);
    this.enemies.push({
      id: `${role}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      x,
      z,
      vx: 0,
      vz: 0,
      angle: 0,
      hp,
      maxHp: hp,
      alive: true,
      koTimer: 0,
      hitFlash: 0,
      fireCooldown: 0.7 + Math.random() * 0.6,
      patrolOrigin: { x, z },
      rig,
    });
  }

  private spawnPolicePursuit() {
    const activePoliceCars = this.vehicles.filter((v) => v.isPolicePatrol).length;
    if (activePoliceCars >= 2) return;

    // Spawn at a city intersection 30m..90m away across the expanded 9x9 grid
    const candidates: Vec2[] = [];
    for (const sx of STREET_CENTERS) {
      for (const sz of STREET_CENTERS) {
        if (Math.abs(sx) === 120 && Math.abs(sz) === 120) continue;
        if (sx % 60 === 0 || sz % 60 === 0) {
          candidates.push({ x: sx, z: sz });
        }
      }
    }
    let best = candidates[0];
    let bestScore = Infinity;
    for (const c of candidates) {
      const d = Math.hypot(c.x - this.player.x, c.z - this.player.z);
      if (d > 28 && d < 92) {
        const diffFromIdeal = Math.abs(d - 55);
        if (diffFromIdeal < bestScore) {
          bestScore = diffFromIdeal;
          best = c;
        }
      }
    }

    const rig = createVoxelVehicle('police', 0x0f172a);
    rig.group.position.set(best.x, 0, best.z);
    this.scene.add(rig.group);
    this.vehicles.push({
      id: `police-car-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      kind: 'police',
      label: '市警拦截巡逻车 · VCPD',
      x: best.x,
      z: best.z,
      angle: 0,
      speed: 0,
      maxSpeed: 19,
      color: 0x0f172a,
      rig,
      isPolicePatrol: true,
    });
  }

  private showToast(msg: string) {
    this.toastMessage = msg;
    this.toastTimer = 3.2;
  }

  private scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsedTotal += dt;

    if (this.phase === 'title' || this.phase === 'prologue') {
      this.updateTitleFlyover(dt);
    } else if (this.phase === 'cutscene') {
      this.updateCutscene(dt);
    } else if (this.phase === 'playing') {
      this.updateGameplay(dt);
    }

    this.justPressed.clear();
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  private updateCutscene(dt: number) {
    this.cutsceneElapsed += dt;
    const frame = evaluateCutsceneAtTime(this.cutsceneElapsed, this.activeCutsceneShots);
    this.camPos.set(...frame.camPos);
    this.camLook.set(...frame.lookAt);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.animateWorldProps(dt);

    // Subtle idle patrol sway on showcase actors during live cutscene
    for (let i = 0; i < this.cutscenePreviewActors.length; i++) {
      const actor = this.cutscenePreviewActors[i];
      actor.rotation.y = Math.sin(this.elapsedTotal * 1.4 + i) * 0.35;
    }

    // Animate tactical extraction helicopter liftoff during OP-05 finale cutscene
    if (this.extractionHeli && this.activeCutsceneId === 'complete_obsidian_takedown') {
      const liftT = Math.min(1, this.cutsceneElapsed / 6.5);
      const eased = liftT * liftT * (3 - 2 * liftT);
      this.extractionHeli.group.position.set(103.8 + eased * 4, 11.72 + eased * 11, 107.7 - eased * 4);
      this.extractionHeli.group.rotation.x = -0.14 * eased;
      this.extractionHeli.mainRotor.rotation.y += dt * 22;
      this.extractionHeli.tailRotor.rotation.x += dt * 26;
    }

    if (frame.shotIndex !== this.cutsceneLastShot) {
      this.cutsceneLastShot = frame.shotIndex;
      soundEngine.playStepComplete();
    }

    this.callbacks.onCutsceneUpdate({
      category: this.activeCutsceneCategory,
      title: this.activeCutsceneTitle,
      shotIndex: frame.shotIndex,
      totalShots: frame.totalShots,
      progressPct: frame.progressPct,
      locationTag: frame.shot.locationTag,
      speaker: frame.shot.speaker,
      subtitle: frame.shot.subtitle,
    });

    if (frame.finished) {
      this.finishInEngineCutscene();
    }
  }

  private updateTitleFlyover(dt: number) {
    const t = this.elapsedTotal * 0.14;
    const radius = 108;
    const targetCamX = Math.cos(t) * radius;
    const targetCamZ = Math.sin(t) * radius;
    const k = 1 - Math.exp(-3 * dt);
    this.camPos.x += (targetCamX - this.camPos.x) * k;
    this.camPos.y += (48 - this.camPos.y) * k;
    this.camPos.z += (targetCamZ - this.camPos.z) * k;
    this.camLook.set(0, 5, 0);

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.animateWorldProps(dt);
  }

  private updateGameplay(dt: number) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastMessage = null;
    }

    // Hitstop freeze for heavy combat feedback
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    if (!this.lockpickOpen) {
      if (this.player.vehicleId) {
        this.updateDriving(dt);
      } else {
        this.updateOnFoot(dt);
      }
      this.handleActionInput();
    }

    this.updateMissionProgress(dt);
    this.updateEnemies(dt);
    this.updatePoliceCruisers(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.animateWorldProps(dt);
    this.updateGpsBreadcrumbs();
    this.updateCamera(dt);

    // Wanted cooldown
    if (this.wantedStars > 0) {
      this.wantedTimer -= dt;
      if (this.wantedTimer <= 0) {
        this.wantedStars = Math.max(0, this.wantedStars - 1);
        this.wantedTimer = this.wantedStars > 0 ? 14 : 0;
      }
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.pushHudSnapshot(false);
    }
  }

  private updateOnFoot(dt: number) {
    let moveX = this.virtualInput.moveX;
    let moveZ = this.virtualInput.moveZ;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    const sprinting =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualInput.sprint;
    const speed = sprinting ? 11.2 : 7.8;

    if (len > 0.08) {
      const clampedMag = Math.min(1, len);
      const normX = moveX / len;
      const normZ = moveZ / len;
      const nx = this.player.x + normX * speed * clampedMag * dt;
      const nz = this.player.z + normZ * speed * clampedMag * dt;
      const resolved = resolveCircleAABB(nx, nz, 0.55, CITY_BUILDINGS);
      this.player.x = resolved.x;
      this.player.z = resolved.z;
      this.player.speed = speed * clampedMag;
      this.player.walkDist += speed * clampedMag * dt;

      if (!this.hasMouseMoved) {
        this.player.angle = Math.atan2(-normX, -normZ);
      }
    } else {
      this.player.speed = 0;
    }

    if (this.hasMouseMoved) {
      const dx = this.aimWorld.x - this.player.x;
      const dz = this.aimWorld.z - this.player.z;
      if (dx * dx + dz * dz > 0.2) {
        this.player.angle = Math.atan2(-dx, -dz);
      }
    }

    this.playerRig.group.position.set(this.player.x, 0, this.player.z);
    this.playerRig.group.rotation.y = this.player.angle;

    // Gait-synced voxel walk animation
    const swing = len > 0.08 ? Math.sin(this.player.walkDist * 2.2) * 0.55 : 0;
    this.playerRig.leftLeg.rotation.x = swing;
    this.playerRig.rightLeg.rotation.x = -swing;
    this.playerRig.leftArm.rotation.x = -swing * 0.8;
    this.playerRig.rightArm.rotation.x = swing * 0.8;

    // Shooting (Left Click, Space, or Touch Fire button)
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    const firing = this.mouseDown || this.keys.has('Space') || this.virtualInput.firing;
    if (firing && this.shootCooldown <= 0) {
      if (this.virtualInput.firing && !this.mouseDown) {
        this.snapAimToNearestHostile(26);
      }
      this.firePlayerWeapon();
      this.shootCooldown = 0.2;
    }
  }

  private snapAimToNearestHostile(maxRange: number) {
    let bestEnemy: EnemyEntity | null = null;
    let bestDist = maxRange;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
      if (d < bestDist) {
        bestDist = d;
        bestEnemy = e;
      }
    }
    if (bestEnemy) {
      this.player.angle = Math.atan2(-(bestEnemy.x - this.player.x), -(bestEnemy.z - this.player.z));
      this.playerRig.group.rotation.y = this.player.angle;
    }
  }

  private updateDriving(dt: number) {
    const car = this.vehicles.find((v) => v.id === this.player.vehicleId);
    if (!car) {
      this.player.vehicleId = null;
      this.playerRig.group.visible = true;
      return;
    }

    const kbThrottle =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const kbSteer =
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
    const throttle = Math.max(-1, Math.min(1, kbThrottle + this.virtualInput.throttle));
    const steer = Math.max(-1, Math.min(1, kbSteer + this.virtualInput.steer));
    const nitro =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualInput.sprint
        ? 1.18
        : 1.0;

    const maxFwd = car.maxSpeed * nitro;
    const maxRev = -9;

    if (throttle > 0) {
      car.speed = Math.min(maxFwd, car.speed + 24 * dt);
    } else if (throttle < 0) {
      car.speed = Math.max(maxRev, car.speed - 28 * dt);
    } else {
      car.speed *= Math.exp(-3.4 * dt);
      if (Math.abs(car.speed) < 0.15) car.speed = 0;
    }

    if (Math.abs(car.speed) > 0.6) {
      const turnRate = 2.6 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 6);
      car.angle += steer * turnRate * dt;
    }

    const fx = -Math.sin(car.angle);
    const fz = -Math.cos(car.angle);
    const nx = car.x + fx * car.speed * dt;
    const nz = car.z + fz * car.speed * dt;
    const resolved = resolveCircleAABB(nx, nz, 1.45, CITY_BUILDINGS);

    if (Math.hypot(resolved.x - nx, resolved.z - nz) > 0.08) {
      car.speed *= 0.45; // Wall scrape slowdown
    }
    car.x = resolved.x;
    car.z = resolved.z;

    car.rig.group.position.set(car.x, 0, car.z);
    car.rig.group.rotation.y = car.angle;
    for (const w of car.rig.wheels) {
      w.rotation.x -= car.speed * dt * 0.8;
    }

    this.player.x = car.x;
    this.player.z = car.z;
    this.player.angle = car.angle;
    this.player.speed = Math.abs(car.speed);

    // Check enemy ramming while driving fast
    if (Math.abs(car.speed) > 8) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - car.x, e.z - car.z) < 2.1) {
          this.damageEnemy(e, 90, fx, fz);
        }
      }
    }
  }

  private handleActionInput() {
    // [F] Enter / Exit Vehicle
    if (this.justPressed.has('KeyF')) {
      if (this.player.vehicleId) {
        this.exitVehicle();
      } else {
        const nearest = this.findNearestVehicle(4.2);
        if (nearest) {
          this.enterVehicle(nearest);
        }
      }
    }

    // [E] Context Interaction
    if (this.justPressed.has('KeyE')) {
      const prompt = this.computeNearbyPrompt();
      if (!prompt) return;

      if (prompt.actionType === 'ACCEPT_MISSION' && prompt.missionId) {
        this.acceptMission(prompt.missionId);
      } else if (prompt.actionType === 'CRACK_SAFE') {
        this.setLockpickOpen(true);
        this.callbacks.onOpenLockpick();
      } else if (prompt.actionType === 'PICKUP') {
        this.collectNearbyLoot();
      } else if (prompt.actionType === 'HACK') {
        this.collectBriefcase();
      }
    }
  }

  private enterVehicle(car: VehicleEntity) {
    this.player.vehicleId = car.id;
    this.playerRig.group.visible = false;
    soundEngine.playCarDoor();
    this.showToast(`已驾驶：${car.label}`);

    const mission = getMissionById(this.missionState.activeMissionId);
    const step = mission?.steps[this.missionState.currentStepIndex];
    if (step?.type === 'HIJACK_VEHICLE' && car.missionTag === this.missionState.activeMissionId) {
      if (mission?.id === 'convoy_ambush') {
        this.triggerWanted(3);
        this.advanceAndSync('已强夺议会装甲押运车！冲破南环路障！');
      } else {
        this.triggerWanted(2);
        this.advanceAndSync('已夺取走私跑车！冲向街头检查点！');
      }
    }
    this.pushHudSnapshot(true);
  }

  private exitVehicle() {
    const car = this.vehicles.find((v) => v.id === this.player.vehicleId);
    if (car) {
      car.speed = 0;
      const sideX = Math.cos(car.angle) * 2.1;
      const sideZ = -Math.sin(car.angle) * 2.1;
      const resolved = resolveCircleAABB(car.x + sideX, car.z + sideZ, 0.55, CITY_BUILDINGS);
      this.player.x = resolved.x;
      this.player.z = resolved.z;
    }
    this.player.vehicleId = null;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.player.x, 0, this.player.z);
    soundEngine.playCarDoor();
    this.pushHudSnapshot(true);
  }

  private findNearestVehicle(maxDist: number): VehicleEntity | null {
    let best: VehicleEntity | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.player.x, v.z - this.player.z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private firePlayerWeapon() {
    const dirX = -Math.sin(this.player.angle);
    const dirZ = -Math.cos(this.player.angle);
    this.spawnProjectile(true, this.player.x + dirX * 0.7, 1.0, this.player.z + dirZ * 0.7, dirX * 42, dirZ * 42, 34);
    soundEngine.playShoot();
    this.spawnParticles(this.player.x + dirX * 0.9, 1.05, this.player.z + dirZ * 0.9, 0xfef08a, 4);
    this.triggerWanted(1);
  }

  private spawnProjectile(
    fromPlayer: boolean,
    x: number,
    y: number,
    z: number,
    vx: number,
    vz: number,
    damage: number
  ) {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.fromPlayer = fromPlayer;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vz = vz;
    slot.life = 0.85;
    slot.damage = damage;
  }

  private spawnParticles(x: number, y: number, z: number, colorHex: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.MAX_PARTICLES;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      p.vx = Math.cos(a) * spd;
      p.vy = 2.5 + Math.random() * 4.5;
      p.vz = Math.sin(a) * spd;
      p.life = 0.35 + Math.random() * 0.25;
      p.maxLife = p.life;
      p.size = 0.6 + Math.random() * 0.7;
      p.color.setHex(colorHex);
    }
  }

  private triggerWanted(minStars: number) {
    if (this.wantedStars < minStars) {
      this.wantedStars = minStars;
    }
    this.wantedTimer = 15;
    if (this.wantedStars > this.missionState.metrics.maxWantedReached) {
      this.missionState.metrics.maxWantedReached = this.wantedStars;
    }
    if (this.wantedStars >= 2) {
      this.spawnPolicePursuit();
    }
  }

  private updateProjectiles(dt: number) {
    let activeCount = 0;
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;

      // Building hit check
      const resolved = resolveCircleAABB(p.x, p.z, 0.15, CITY_BUILDINGS);
      if (Math.hypot(resolved.x - p.x, resolved.z - p.z) > 0.02) {
        p.active = false;
        this.spawnParticles(p.x, p.y, p.z, 0x94a3b8, 5);
        continue;
      }

      if (p.fromPlayer) {
        let hit = false;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) < 0.85) {
            this.damageEnemy(e, p.damage, p.vx * 0.04, p.vz * 0.04);
            p.active = false;
            hit = true;
            break;
          }
        }
        if (hit) continue;
      } else {
        // Enemy bullet hitting player
        const hitRadius = this.player.vehicleId ? 1.5 : 0.7;
        if (Math.hypot(this.player.x - p.x, this.player.z - p.z) < hitRadius) {
          p.active = false;
          this.damagePlayer(p.damage);
          continue;
        }
      }

      const yaw = Math.atan2(p.vx, p.vz);
      _euler.set(0, yaw, 0);
      _quat.setFromEuler(_euler);
      _vec3.set(p.x, p.y, p.z);
      _scale.set(1, 1, 1);
      _mat4.compose(_vec3, _quat, _scale);
      this.projMesh.setMatrixAt(activeCount++, _mat4);
    }
    this.projMesh.count = activeCount;
    this.projMesh.instanceMatrix.needsUpdate = true;
  }

  private damageEnemy(e: EnemyEntity, amount: number, kx: number, kz: number) {
    e.hp -= amount;
    e.hitFlash = 0.09;
    e.vx += kx * 5;
    e.vz += kz * 5;
    soundEngine.playHit();
    this.spawnParticles(e.x, 1.0, e.z, 0xf87171, 8);

    if (e.hp <= 0 && e.alive) {
      e.alive = false;
      e.koTimer = 0.45;
      this.hitstopTimer = 0.04;
      this.trauma = Math.min(1, this.trauma + 0.35);
      this.missionState.metrics.enemiesNeutralized += 1;
      this.spawnParticles(e.x, 1.1, e.z, 0xfbbf24, 16);

      if (e.role === 'vip') {
        this.missionState.targetEliminated = true;
        this.briefcaseProp.position.set(e.x, 0, e.z);
        this.briefcaseProp.visible = true;
        const mission = getMissionById(this.missionState.activeMissionId);
        if (mission) {
          const hackStep = mission.steps.find((s) => s.type === 'HACK_BRIEFCASE');
          if (hackStep) {
            hackStep.targetPos = { x: e.x, z: e.z };
          }
          const curStep = mission.steps[this.missionState.currentStepIndex];
          if (curStep?.type === 'ELIMINATE_TARGET') {
            this.advanceAndSync(
              mission.id === 'obsidian_takedown'
                ? '黑曜石主教已清除！立即靠近回收《灰烬账本》总账密钥箱'
                : '白衣目标已清除！立即靠近回收加密手提箱'
            );
          } else {
            this.showToast('主目标已提前击倒！请先完成当前门禁黑入步骤再回收密钥箱');
            this.pushHudSnapshot(true);
          }
        }
      }
    }
  }

  private damagePlayer(amount: number) {
    const actual = this.player.vehicleId ? Math.round(amount * 0.45) : amount;
    this.missionState.metrics.damageTaken += actual;
    this.trauma = Math.min(1, this.trauma + 0.32);
    soundEngine.playHit();
    this.spawnParticles(this.player.x, 1.0, this.player.z, 0xef4444, 6);

    if (this.player.armor > 0) {
      const absorbed = Math.min(this.player.armor, actual);
      this.player.armor -= absorbed;
      this.player.hp -= actual - absorbed;
    } else {
      this.player.hp -= actual;
    }

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      soundEngine.playMissionFailed();
      this.setPhase('failed');
      this.callbacks.onMissionFailed('生命值归零（重伤住院）');
    }
  }

  private updateEnemies(dt: number) {
    let activeShooters = 0;
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.koTimer > 0) {
          e.koTimer -= dt;
          e.rig.group.rotation.x = Math.min(Math.PI / 2, e.rig.group.rotation.x + dt * 4.5);
          e.rig.group.position.y = Math.max(0.15, e.rig.group.position.y);
        } else {
          e.rig.group.visible = false;
        }
        continue;
      }

      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        for (const m of e.rig.bodyParts) {
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        }
      } else {
        for (const m of e.rig.bodyParts) {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        }
      }

      const dx = this.player.x - e.x;
      const dz = this.player.z - e.z;
      const dist = Math.hypot(dx, dz);

      // Distinct Enemy Movement Policies:
      // 1. VIP kites away when player approaches
      // 2. Guard patrols around origin & engages at medium range
      // 3. Police chases aggressively
      let moveX = 0;
      let moveZ = 0;
      const moveSpeed = e.role === 'vip' ? 5.2 : e.role === 'police' ? 5.6 : 4.1;

      if (dist < 28 && dist > 0.1) {
        if (e.role === 'vip') {
          // Kiter: flee away from player while firing
          if (dist < 14) {
            moveX = -dx / dist;
            moveZ = -dz / dist;
          }
        } else if (dist > 8.5) {
          moveX = dx / dist;
          moveZ = dz / dist;
        }
        e.angle = Math.atan2(-dx, -dz);
      }

      e.vx = e.vx * Math.exp(-8 * dt) + moveX * moveSpeed * (1 - Math.exp(-8 * dt));
      e.vz = e.vz * Math.exp(-8 * dt) + moveZ * moveSpeed * (1 - Math.exp(-8 * dt));

      const resolved = resolveCircleAABB(e.x + e.vx * dt, e.z + e.vz * dt, 0.55, CITY_BUILDINGS);
      e.x = resolved.x;
      e.z = resolved.z;

      e.rig.group.position.set(e.x, 0, e.z);
      e.rig.group.rotation.y = e.angle;
      if (e.rig.marker) {
        e.rig.marker.rotation.y += dt * 3;
        e.rig.marker.position.y = 2.4 + Math.sin(this.elapsedTotal * 4) * 0.16;
      }

      // Enemy firing with attack token cap (max 3 simultaneous shooters)
      e.fireCooldown -= dt;
      const hostile = this.missionState.activeMissionId !== null || this.wantedStars > 0;
      if (hostile && dist < 24 && e.fireCooldown <= 0 && activeShooters < 3) {
        activeShooters++;
        e.fireCooldown = e.role === 'vip' ? 1.1 : 1.35 + Math.random() * 0.4;
        const dirX = dx / Math.max(0.1, dist);
        const dirZ = dz / Math.max(0.1, dist);
        this.spawnProjectile(false, e.x + dirX * 0.7, 1.0, e.z + dirZ * 0.7, dirX * 22, dirZ * 22, 10);
      }
    }
  }

  private updatePoliceCruisers(dt: number) {
    const flash = Math.floor(this.elapsedTotal * 8) % 2 === 0;
    for (const v of this.vehicles) {
      if (!v.isPolicePatrol) continue;
      if (v.rig.lightbarRed && v.rig.lightbarBlue) {
        (v.rig.lightbarRed.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 2.2 : 0.2;
        (v.rig.lightbarBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.2 : 2.2;
      }
      if (this.player.vehicleId === v.id) continue;

      if (this.wantedStars > 0) {
        const dx = this.player.x - v.x;
        const dz = this.player.z - v.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 7.5) {
          const targetAngle = Math.atan2(-dx, -dz);
          let diff = targetAngle - v.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          v.angle += THREE.MathUtils.clamp(diff, -2.5 * dt, 2.5 * dt);
          v.speed = Math.min(14.5, v.speed + 12 * dt);

          const fx = -Math.sin(v.angle);
          const fz = -Math.cos(v.angle);
          const res = resolveCircleAABB(v.x + fx * v.speed * dt, v.z + fz * v.speed * dt, 1.45, CITY_BUILDINGS);
          v.x = res.x;
          v.z = res.z;
          v.rig.group.position.set(v.x, 0, v.z);
          v.rig.group.rotation.y = v.angle;
        }
      }
    }
  }

  private updateParticles(dt: number) {
    let count = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.1, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const s = p.size * (p.life / p.maxLife);
      _vec3.set(p.x, p.y, p.z);
      _quat.identity();
      _scale.set(s, s, s);
      _mat4.compose(_vec3, _quat, _scale);
      this.particleMesh.setMatrixAt(count, _mat4);
      this.particleMesh.setColorAt(count, p.color);
      count++;
    }
    this.particleMesh.count = count;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateMissionProgress(dt: number) {
    const mission = getMissionById(this.missionState.activeMissionId);
    if (!mission) {
      this.objectiveBeacon.visible = false;
      return;
    }

    this.missionState.metrics.elapsedSec += dt;
    if (this.missionState.metrics.elapsedSec >= mission.timeLimitSec) {
      soundEngine.playMissionFailed();
      this.setPhase('failed');
      this.callbacks.onMissionFailed('超出合约限定时间');
      return;
    }

    const step = mission.steps[this.missionState.currentStepIndex];
    if (!step) return;

    // Position 3D objective beacon
    this.objectiveBeacon.visible = true;
    this.objectiveBeacon.position.set(step.targetPos.x, 0, step.targetPos.z);
    (this.objectiveRing.material as THREE.MeshBasicMaterial).color.setHex(step.beaconColor);

    const dist = Math.hypot(step.targetPos.x - this.player.x, step.targetPos.z - this.player.z);

    if (step.type === 'NAVIGATE' && dist <= step.radius) {
      soundEngine.playStepComplete();
      this.advanceAndSync();
      if (step.id === 'convoy-nav') {
        this.playCutsceneSequence(MID_GAME_CUTSCENES.mid_convoy_intercept, () => {
          this.resumePlayingAfterCutscene('重工护卫现身！放倒护卫并按 [F] 强夺装甲押运车！');
        });
      }
    } else if (step.type === 'DRIVE_CHECKPOINT' && dist <= step.radius && this.player.vehicleId) {
      soundEngine.playStepComplete();
      this.spawnParticles(this.player.x, 1.2, this.player.z, 0xfbbf24, 14);
      this.advanceAndSync('检查点通过！继续全速前进');
    } else if (step.type === 'PICKUP_LOOT') {
      // Auto-pickup when walking right over bag
      for (const bag of this.lootBags) {
        if (!bag.collected && Math.hypot(bag.pos.x - this.player.x, bag.pos.z - this.player.z) < 2.1) {
          this.collectSpecificLoot(bag);
        }
      }
    } else if (step.type === 'ESCAPE_ZONE' && dist <= step.radius) {
      if (mission.id === 'hot_cargo' || mission.id === 'convoy_ambush') {
        const car = this.vehicles.find((v) => v.id === this.player.vehicleId);
        if (!car || car.missionTag !== mission.id) {
          this.showToast(
            mission.id === 'convoy_ambush'
              ? '必须驾驶议会装甲押运车驶入赌场交付区！'
              : '必须驾驶走私改装车进入交付车库！'
          );
          return;
        }
      }
      this.completeActiveMission(mission);
    }
  }

  private collectNearbyLoot() {
    for (const bag of this.lootBags) {
      if (!bag.collected && Math.hypot(bag.pos.x - this.player.x, bag.pos.z - this.player.z) < 4.5) {
        this.collectSpecificLoot(bag);
        return;
      }
    }
  }

  private collectSpecificLoot(bag: { mesh: THREE.Group; pos: Vec2; collected: boolean }) {
    bag.collected = true;
    bag.mesh.visible = false;
    this.missionState.lootCollected += 1;
    soundEngine.playPickup();
    this.spawnParticles(bag.pos.x, 0.8, bag.pos.z, 0x34d399, 14);

    if (this.missionState.lootCollected >= this.missionState.lootRequired) {
      this.triggerWanted(3);
      this.advanceAndSync('现钞到手！警报拉响，立即驱车逃往海港安全屋！');
    } else {
      this.showToast(`已拾取现金袋 (${this.missionState.lootCollected}/${this.missionState.lootRequired})`);
      this.pushHudSnapshot(true);
    }
  }

  private collectBriefcase() {
    if (this.briefcaseCollected) return;
    this.briefcaseCollected = true;
    this.briefcaseProp.visible = false;
    soundEngine.playPickup();
    const isSpire = this.missionState.activeMissionId === 'obsidian_takedown';
    this.triggerWanted(isSpire ? 4 : 2);
    this.spawnParticles(this.player.x, 1.0, this.player.z, isSpire ? 0xfbbf24 : 0x38bdf8, 16);
    this.advanceAndSync(
      isSpire
        ? '总账密钥箱已夺回！全速前往东南角「自由港灯塔停机坪」撤离！'
        : '加密手提箱已回收！前往南区地铁接应点撤离'
    );
  }

  private advanceAndSync(customToast?: string) {
    const res = advanceMissionStep(this.missionState);
    this.missionState = res.next;
    this.lastGpsCalcPos = { x: 9999, z: 9999 };

    // Reveal loot bags when entering PICKUP_LOOT step
    const mission = getMissionById(this.missionState.activeMissionId);
    const nextStep = mission?.steps[this.missionState.currentStepIndex];
    if (nextStep?.type === 'PICKUP_LOOT') {
      for (const bag of this.lootBags) {
        bag.collected = false;
        bag.mesh.visible = true;
      }
    }

    if (customToast) {
      this.showToast(customToast);
    } else if (nextStep) {
      this.showToast(`目标更新：${nextStep.title}`);
    }
    this.pushHudSnapshot(true);
  }

  private completeActiveMission(mission: ReturnType<typeof getMissionById>) {
    if (!mission) return;
    const reward = calculateMissionReward(mission, this.missionState.metrics);
    const lastStep = mission.steps[mission.steps.length - 1];
    this.cash += reward.totalPayout;
    this.rep += reward.repEarned;
    this.wantedStars = 0;
    this.wantedTimer = 0;

    const res = advanceMissionStep(this.missionState);
    this.missionState = res.next;
    this.objectiveBeacon.visible = false;

    const completeSeq = getMissionCompleteCutscene(mission.id, lastStep?.targetPos);
    this.playCutsceneSequence(completeSeq, () => {
      if (this.extractionHeli) {
        this.extractionHeli.group.position.set(103.8, 11.72, 107.7);
        this.extractionHeli.group.rotation.set(0, Math.PI * 0.25, 0);
      }
      this.clearMissionEntities();
      soundEngine.playMissionPassed();
      this.setPhase('settlement');
      this.callbacks.onMissionPassed(reward);
    });
  }

  private computeNearbyPrompt(): HudSnapshot['nearbyPrompt'] {
    if (this.player.vehicleId) {
      return { key: 'F', label: '下车', actionType: 'EXIT_VEHICLE' };
    }

    const mission = getMissionById(this.missionState.activeMissionId);
    const step = mission?.steps[this.missionState.currentStepIndex];

    if (step?.type === 'SAFE_CRACK' && Math.hypot(step.targetPos.x - this.player.x, step.targetPos.z - this.player.z) < 4.5) {
      return {
        key: 'E',
        label: this.missionState.activeMissionId === 'obsidian_takedown' ? '黑入议会激光门禁' : '破解金库密码锁',
        actionType: 'CRACK_SAFE',
      };
    }

    if (step?.type === 'PICKUP_LOOT') {
      const nearBag = this.lootBags.find(
        (b) => !b.collected && Math.hypot(b.pos.x - this.player.x, b.pos.z - this.player.z) < 4.2
      );
      if (nearBag) {
        return { key: 'E', label: '拾取现金袋', actionType: 'PICKUP' };
      }
    }

    if (step?.type === 'HACK_BRIEFCASE' && !this.briefcaseCollected && this.briefcaseProp.visible) {
      const d = Math.hypot(this.briefcaseProp.position.x - this.player.x, this.briefcaseProp.position.z - this.player.z);
      if (d < 4.5) {
        return { key: 'E', label: '回收加密手提箱', actionType: 'HACK' };
      }
    }

    const nearCar = this.findNearestVehicle(4.0);
    if (nearCar) {
      return { key: 'F', label: `上车 (${nearCar.label.split(' · ')[0]})`, actionType: 'ENTER_VEHICLE' };
    }

    if (!mission) {
      for (const booth of this.fixerBooths) {
        if (Math.hypot(booth.pos.x - this.player.x, booth.pos.z - this.player.z) < 4.2) {
          const m = getMissionById(booth.missionId)!;
          return {
            key: 'E',
            label: `接取合约：${m.title}`,
            actionType: 'ACCEPT_MISSION',
            missionId: m.id,
          };
        }
      }
    }

    return null;
  }

  private updateGpsBreadcrumbs() {
    const mission = getMissionById(this.missionState.activeMissionId);
    const step = mission?.steps[this.missionState.currentStepIndex];
    const target = step?.targetPos ?? this.customWaypoint;

    if (this.customWaypoint && !step) {
      this.waypointBeacon.visible = true;
      this.waypointBeacon.position.set(this.customWaypoint.x, 0, this.customWaypoint.z);
    } else {
      this.waypointBeacon.visible = false;
    }

    if (!target) {
      this.cachedGpsPath = [];
      this.gpsArrowsMesh.count = 0;
      return;
    }

    if (Math.hypot(this.player.x - this.lastGpsCalcPos.x, this.player.z - this.lastGpsCalcPos.z) > 2.5) {
      this.lastGpsCalcPos = { x: this.player.x, z: this.player.z };
      this.cachedGpsPath = findRoadPath({ x: this.player.x, z: this.player.z }, target);
    }

    // Place arrows every 5m along cachedGpsPath
    let arrowIdx = 0;
    const color = step ? step.beaconColor : 0x38bdf8;
    (this.gpsArrowsMesh.material as THREE.MeshBasicMaterial).color.setHex(color);

    for (let i = 0; i < this.cachedGpsPath.length - 1 && arrowIdx < this.MAX_GPS_ARROWS; i++) {
      const a = this.cachedGpsPath[i];
      const b = this.cachedGpsPath[i + 1];
      const segDx = b.x - a.x;
      const segDz = b.z - a.z;
      const segLen = Math.hypot(segDx, segDz);
      if (segLen < 1) continue;
      const yaw = Math.atan2(-segDx, -segDz);

      for (let d = 3.5; d < segLen - 1.5 && arrowIdx < this.MAX_GPS_ARROWS; d += 5.5) {
        const px = a.x + (segDx / segLen) * d;
        const pz = a.z + (segDz / segLen) * d;
        _vec3.set(px, 0.09, pz);
        _euler.set(0, yaw, 0);
        _quat.setFromEuler(_euler);
        _scale.set(1, 1, 1);
        _mat4.compose(_vec3, _quat, _scale);
        this.gpsArrowsMesh.setMatrixAt(arrowIdx++, _mat4);
      }
    }

    this.gpsArrowsMesh.count = arrowIdx;
    this.gpsArrowsMesh.instanceMatrix.needsUpdate = true;
  }

  private animateWorldProps(dt: number) {
    const pulse = 1 + Math.sin(this.elapsedTotal * 4.2) * 0.08;
    const hideFixers = this.missionState.activeMissionId !== null;
    for (const booth of this.fixerBooths) {
      booth.ring.visible = !hideFixers;
      booth.ring.scale.setScalar(pulse);
      booth.diamond.visible = !hideFixers;
      booth.diamond.rotation.y += dt * 2.4;
      booth.diamond.position.y = 2.55 + Math.sin(this.elapsedTotal * 3.5) * 0.18;
    }
    if (this.objectiveBeacon.visible) {
      this.objectiveRing.scale.setScalar(pulse);
    }
    if (this.briefcaseProp.visible) {
      this.briefcaseProp.rotation.y += dt * 1.8;
    }
    for (const bag of this.lootBags) {
      if (bag.mesh.visible) {
        bag.mesh.rotation.y += dt * 1.6;
      }
    }
    if (this.extractionHeli && this.activeCutsceneId !== 'complete_obsidian_takedown') {
      this.extractionHeli.mainRotor.rotation.y += dt * 4.5;
      this.extractionHeli.tailRotor.rotation.x += dt * 8.0;
    }
  }

  private updateCamera(dt: number) {
    const k = 1 - Math.exp(-8 * dt);
    const isDriving = this.player.vehicleId !== null;
    const height = isDriving ? 25 : 20;
    const backOffset = isDriving ? 19 : 15;
    const lead = isDriving ? Math.min(6, this.player.speed * 0.25) : 1.5;

    const fx = -Math.sin(this.player.angle);
    const fz = -Math.cos(this.player.angle);

    const desiredX = this.player.x + fx * lead;
    const desiredZ = this.player.z + fz * lead + backOffset;

    this.camPos.x += (desiredX - this.camPos.x) * k;
    this.camPos.y += (height - this.camPos.y) * k;
    this.camPos.z += (desiredZ - this.camPos.z) * k;

    this.camLook.x += (this.player.x + fx * lead * 0.6 - this.camLook.x) * k;
    this.camLook.y = 0.8;
    this.camLook.z += (this.player.z + fz * lead * 0.6 - this.camLook.z) * k;

    this.camera.position.copy(this.camPos);

    // Trauma-squared screen shake
    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma * 0.65;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }

    this.camera.lookAt(this.camLook);
  }

  private pushHudSnapshot(force: boolean) {
    if (!force && this.disposed) return;
    const mission = getMissionById(this.missionState.activeMissionId);
    const step = mission ? mission.steps[this.missionState.currentStepIndex] ?? null : null;
    const target = step?.targetPos ?? this.customWaypoint;
    const dist = target ? Math.round(Math.hypot(target.x - this.player.x, target.z - this.player.z)) : 0;
    const activeCar = this.player.vehicleId ? this.vehicles.find((v) => v.id === this.player.vehicleId) : null;

    this.callbacks.onHudUpdate({
      phase: this.phase,
      cash: this.cash,
      rep: this.rep,
      rankTitle: getRankTitle(this.rep),
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      armor: Math.round(this.player.armor),
      wantedStars: this.wantedStars,
      wantedCooldownPct: this.wantedStars > 0 ? Math.max(0, Math.min(100, (this.wantedTimer / 15) * 100)) : 0,
      inVehicle: Boolean(activeCar),
      vehicleLabel: activeCar ? activeCar.label : '步行模式',
      speedKmh: Math.round(this.player.speed * 4.5),
      district: getDistrictAt(this.player.x, this.player.z),
      playerX: this.player.x,
      playerZ: this.player.z,
      playerAngle: this.player.angle,
      activeMission: mission,
      activeStep: step,
      stepIndex: this.missionState.currentStepIndex,
      totalSteps: mission ? mission.steps.length : 0,
      missionElapsedSec: Math.round(this.missionState.metrics.elapsedSec),
      missionTimeLimitSec: mission ? mission.timeLimitSec : 0,
      distanceToTarget: dist,
      gpsPath: this.cachedGpsPath,
      customWaypoint: this.customWaypoint,
      nearbyPrompt: this.computeNearbyPrompt(),
      completedMissionIds: this.missionState.completedMissionIds,
      minimapVehicles: this.vehicles.map((v) => ({
        x: v.x,
        z: v.z,
        kind: v.kind,
        occupied: this.player.vehicleId === v.id,
      })),
      minimapEnemies: this.enemies
        .filter((e) => e.alive)
        .map((e) => ({ x: e.x, z: e.z, role: e.role })),
      toastMessage: this.toastMessage,
      lockpickActive: this.lockpickOpen,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

import * as THREE from 'three';
import { BLOCK_RANGES, CITY_HALF_SIZE, STREET_CENTERS } from './cityGrid';
import { BuildingCollider } from './types';

const _boxCache = new Map<string, THREE.BoxGeometry>();

export function getBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`;
  let geo = _boxCache.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    _boxCache.set(key, geo);
  }
  return geo;
}

const _sharedMatCache = new Map<string, THREE.MeshStandardMaterial>();
function getStdMat(
  color: number,
  roughness = 0.7,
  metalness = 0.1,
  emissive = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  const key = `${color}_${roughness.toFixed(2)}_${metalness.toFixed(2)}_${emissive}_${emissiveIntensity.toFixed(2)}`;
  let mat = _sharedMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
    });
    _sharedMatCache.set(key, mat);
  }
  return mat;
}

export function createContactShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 18);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x05080f,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  return mesh;
}

export function createCityGroundTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#18202c';
  ctx.fillRect(0, 0, size, size);

  // Subtle asphalt aggregate noise
  for (let i = 0; i < 18000; i++) {
    const x = (i * 197 + 23) % size;
    const y = (i * 389 + 59) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.14)';
    ctx.fillRect(x, y, 2, 2);
  }

  const totalSpan = CITY_HALF_SIZE * 2;
  const pxPerM = size / totalSpan;
  const worldToPx = (v: number) => (v + CITY_HALF_SIZE) * pxPerM;

  // Sidewalk pads + stone tile grid + curb bevels on all 8x8 city blocks
  for (let r = 0; r < BLOCK_RANGES.length; r++) {
    for (let c = 0; c < BLOCK_RANGES.length; c++) {
      const [bx0, bx1] = BLOCK_RANGES[c];
      const [bz0, bz1] = BLOCK_RANGES[r];
      const px0 = worldToPx(bx0 - 1.3);
      const pz0 = worldToPx(bz0 - 1.3);
      const pw = worldToPx(bx1 + 1.3) - px0;
      const ph = worldToPx(bz1 + 1.3) - pz0;

      // Outer curb shadow
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px0 - 2, pz0 - 2, pw + 4, ph + 4);

      // Sidewalk stone slab
      ctx.fillStyle = '#2b3545';
      ctx.fillRect(px0, pz0, pw, ph);

      // Subtle inner paving tile grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      const step = pw / 6;
      for (let gx = px0 + step; gx < px0 + pw - 2; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, pz0);
        ctx.lineTo(gx, pz0 + ph);
        ctx.stroke();
      }
      for (let gz = pz0 + step; gz < pz0 + ph - 2; gz += step) {
        ctx.beginPath();
        ctx.moveTo(px0, gz);
        ctx.lineTo(px0 + pw, gz);
        ctx.stroke();
      }

      // Raised curb rim highlight
      ctx.strokeStyle = '#52627a';
      ctx.lineWidth = 3;
      ctx.strokeRect(px0 + 1, pz0 + 1, pw - 2, ph - 2);
    }
  }

  // Distinct Courtyard Plaza Treatments (Inner + Outer Landmarks)
  const plazas: Array<{ x0: number; z0: number; x1: number; z1: number; fill: string; stroke: string; dashed?: boolean }> = [
    // Inner Bank Plaza
    { x0: -53, z0: -44, x1: -37, z1: -35.2, fill: '#334155', stroke: 'rgba(251, 191, 36, 0.5)' },
    // Inner Jade Neon Terrace
    { x0: 38, z0: -45, x1: 54, z1: -35.2, fill: '#3b2437', stroke: 'rgba(251, 113, 133, 0.5)' },
    // Inner Harbor Cargo Yard
    { x0: 37.5, z0: 14, x1: 54, z1: 24.5, fill: '#253740', stroke: 'rgba(52, 211, 153, 0.5)', dashed: true },
    // Outer NW Obsidian Spire Plaza
    { x0: -113, z0: -104, x1: -97, z1: -95.2, fill: '#1e1b2e', stroke: 'rgba(244, 63, 94, 0.65)' },
    // Outer NE Kowloon Casino Valet
    { x0: 98, z0: -104, x1: 114, z1: -95.2, fill: '#351c4d', stroke: 'rgba(251, 191, 36, 0.6)' },
    // Outer SW Blacksteel Refinery Convoy Yard
    { x0: -114, z0: 95.2, x1: -98, z1: 104, fill: '#2e2623', stroke: 'rgba(249, 115, 22, 0.6)', dashed: true },
    // Outer SE Liberty Helipad Extraction Pad
    { x0: 99, z0: 95.2, x1: 113, z1: 103, fill: '#17383b', stroke: 'rgba(56, 189, 248, 0.65)', dashed: true },
  ];

  for (const pl of plazas) {
    const px = worldToPx(pl.x0);
    const pz = worldToPx(pl.z0);
    const pw = worldToPx(pl.x1) - px;
    const ph = worldToPx(pl.z1) - pz;
    ctx.fillStyle = pl.fill;
    ctx.fillRect(px, pz, pw, ph);
    ctx.strokeStyle = pl.stroke;
    ctx.lineWidth = 2.5;
    if (pl.dashed) ctx.setLineDash([8, 5]);
    ctx.strokeRect(px + 3, pz + 3, pw - 6, ph - 6);
    ctx.setLineDash([]);
  }

  // Road segments between intersections (stopping cleanly at intersections)
  const segments: Array<[number, number]> = [
    [-CITY_HALF_SIZE, -126],
    ...BLOCK_RANGES,
    [126, CITY_HALF_SIZE],
  ];

  // Subtle shoulder lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 2;
  for (const c of STREET_CENTERS) {
    for (const offset of [-3.9, 3.9]) {
      const p = worldToPx(c + offset);
      for (const [s0, s1] of segments) {
        ctx.beginPath();
        ctx.moveTo(worldToPx(s0), p);
        ctx.lineTo(worldToPx(s1), p);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p, worldToPx(s0));
        ctx.lineTo(p, worldToPx(s1));
        ctx.stroke();
      }
    }
  }

  // Yellow dashed road centerlines
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 14]);
  for (const c of STREET_CENTERS) {
    const p = worldToPx(c);
    for (const [s0, s1] of segments) {
      ctx.beginPath();
      ctx.moveTo(worldToPx(s0), p);
      ctx.lineTo(worldToPx(s1), p);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p, worldToPx(s0));
      ctx.lineTo(p, worldToPx(s1));
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Crisp crosswalk stripes at all 9x9 intersections
  const stripeHalfW = 3.2;
  for (const cx of STREET_CENTERS) {
    for (const cz of STREET_CENTERS) {
      const px = worldToPx(cx);
      const pz = worldToPx(cz);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
      for (let m = -stripeHalfW; m <= stripeHalfW; m += 1.3) {
        const off = m * pxPerM;
        ctx.fillRect(px + off - 2, pz - 5.6 * pxPerM, 4, 1.4 * pxPerM);
        ctx.fillRect(px + off - 2, pz + 4.2 * pxPerM, 4, 1.4 * pxPerM);
        ctx.fillRect(px - 5.6 * pxPerM, pz + off - 2, 1.4 * pxPerM, 4);
        ctx.fillRect(px + 4.2 * pxPerM, pz + off - 2, 1.4 * pxPerM, 4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createBuildingFacadeTexture(
  baseHex: number,
  accentHex: number,
  maxAniso: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseColor = new THREE.Color(baseHex);
  const accentColor = new THREE.Color(accentHex);

  ctx.fillStyle = `#${baseColor.getHexString()}`;
  ctx.fillRect(0, 0, 128, 256);

  // Subtle vertical structural pilasters
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let x = 0; x < 128; x += 16) {
    ctx.fillRect(x, 0, 2, 256);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let x = 2; x < 128; x += 16) {
    ctx.fillRect(x, 0, 1, 256);
  }

  // Floor cornice bands
  for (let y = 0; y < 220; y += 22) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, y, 128, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y + 2, 128, 1);
  }

  // Pixel-art framed windows with sill & mullion
  for (let y = 10; y < 212; y += 22) {
    for (let x = 6; x < 118; x += 16) {
      // Recessed window frame
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(x - 1, y - 1, 12, 15);

      const hash = ((x * 31 + y * 17) % 13) / 13;
      if (hash > 0.64) {
        ctx.fillStyle = hash > 0.87 ? `#${accentColor.getHexString()}` : hash > 0.76 ? '#fef08a' : '#fde68a';
      } else if (hash > 0.36) {
        ctx.fillStyle = '#334155';
      } else {
        ctx.fillStyle = '#111827';
      }
      ctx.fillRect(x, y, 10, 12);

      // Center vertical mullion + bright sill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(x + 4, y, 2, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x - 1, y + 13, 12, 1);
    }
  }

  // Ground-floor stone lobby / storefront band (bottom of facade)
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 218, 128, 38);
  ctx.fillStyle = `#${accentColor.getHexString()}`;
  ctx.fillRect(0, 218, 128, 2);

  // Storefront display bays
  for (let x = 8; x < 120; x += 28) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(x, 226, 20, 26);
    ctx.fillStyle = x === 36 || x === 92 ? '#fde68a' : '#1e293b';
    ctx.fillRect(x + 2, 228, 16, 20);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export interface VoxelCharacterRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  bodyParts: THREE.Mesh[];
  marker?: THREE.Mesh;
}

export function createVoxelCharacter(options: {
  jacketColor: number;
  pantsColor: number;
  skinColor?: number;
  hairColor?: number;
  hasVisor?: boolean;
  hasHat?: boolean;
  hatColor?: number;
  hasTargetMarker?: boolean;
  hasWeapon?: boolean;
  scale?: number;
}): VoxelCharacterRig {
  const group = new THREE.Group();
  const s = options.scale ?? 1;
  const bodyParts: THREE.Mesh[] = [];

  const jacketMat = new THREE.MeshStandardMaterial({
    color: options.jacketColor,
    roughness: 0.62,
    metalness: 0.1,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: options.pantsColor,
    roughness: 0.88,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor ?? 0xf1c27d,
    roughness: 0.78,
    metalness: 0.02,
  });
  const hairMat = getStdMat(options.hairColor ?? 0x1e1b18, 0.86, 0.05);
  const bootMat = getStdMat(0x0b0f17, 0.55, 0.22);
  const soleMat = getStdMat(0x334155, 0.85, 0.05);
  const metalMat = getStdMat(0xcbd5e1, 0.25, 0.85);
  const gunMat = getStdMat(0x1e293b, 0.28, 0.82);

  // Legs with boots + soles (attached to leg mesh so swing animates seamlessly)
  const legGeo = getBoxGeo(0.24 * s, 0.52 * s, 0.24 * s);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14 * s, 0.26 * s, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  bodyParts.push(leftLeg);

  const lBoot = new THREE.Mesh(getBoxGeo(0.26 * s, 0.16 * s, 0.3 * s), bootMat);
  lBoot.position.set(0, -0.18 * s, -0.02 * s);
  leftLeg.add(lBoot);
  const lSole = new THREE.Mesh(getBoxGeo(0.27 * s, 0.05 * s, 0.31 * s), soleMat);
  lSole.position.set(0, -0.24 * s, -0.02 * s);
  leftLeg.add(lSole);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14 * s, 0.26 * s, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);
  bodyParts.push(rightLeg);

  const rBoot = new THREE.Mesh(getBoxGeo(0.26 * s, 0.16 * s, 0.3 * s), bootMat);
  rBoot.position.set(0, -0.18 * s, -0.02 * s);
  rightLeg.add(rBoot);
  const rSole = new THREE.Mesh(getBoxGeo(0.27 * s, 0.05 * s, 0.31 * s), soleMat);
  rSole.position.set(0, -0.24 * s, -0.02 * s);
  rightLeg.add(rSole);

  // Belt + metallic buckle
  const belt = new THREE.Mesh(getBoxGeo(0.58 * s, 0.09 * s, 0.36 * s), bootMat);
  belt.position.set(0, 0.55 * s, 0);
  group.add(belt);
  const buckle = new THREE.Mesh(getBoxGeo(0.14 * s, 0.08 * s, 0.05 * s), metalMat);
  buckle.position.set(0, 0.55 * s, -0.185 * s);
  group.add(buckle);

  // Torso + Jacket Collar + Lapels
  const torso = new THREE.Mesh(getBoxGeo(0.56 * s, 0.6 * s, 0.34 * s), jacketMat);
  torso.position.set(0, 0.85 * s, 0);
  torso.castShadow = true;
  group.add(torso);
  bodyParts.push(torso);

  // Inner shirt + tie / tactical plate
  const shirt = new THREE.Mesh(getBoxGeo(0.2 * s, 0.46 * s, 0.04 * s), getStdMat(0xe2e8f0, 0.6, 0.1));
  shirt.position.set(0, 0.86 * s, -0.175 * s);
  group.add(shirt);
  const tie = new THREE.Mesh(getBoxGeo(0.08 * s, 0.34 * s, 0.03 * s), getStdMat(0x0f172a, 0.45, 0.2));
  tie.position.set(0, 0.84 * s, -0.19 * s);
  group.add(tie);

  // Jacket collar + shoulder pads
  const collar = new THREE.Mesh(getBoxGeo(0.42 * s, 0.09 * s, 0.36 * s), jacketMat);
  collar.position.set(0, 1.15 * s, 0.02 * s);
  group.add(collar);
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(getBoxGeo(0.18 * s, 0.12 * s, 0.34 * s), jacketMat);
    pad.position.set(side * 0.28 * s, 1.11 * s, 0);
    group.add(pad);
  }

  // Arms + Hands (+ optional tactical pistol on right arm)
  const armGeo = getBoxGeo(0.2 * s, 0.44 * s, 0.2 * s);
  const leftArm = new THREE.Mesh(armGeo, jacketMat);
  leftArm.position.set(-0.41 * s, 0.88 * s, 0);
  leftArm.castShadow = true;
  group.add(leftArm);
  bodyParts.push(leftArm);

  const lHand = new THREE.Mesh(getBoxGeo(0.17 * s, 0.13 * s, 0.17 * s), skinMat);
  lHand.position.set(0, -0.25 * s, 0);
  leftArm.add(lHand);

  const rightArm = new THREE.Mesh(armGeo, jacketMat);
  rightArm.position.set(0.41 * s, 0.88 * s, 0);
  rightArm.castShadow = true;
  group.add(rightArm);
  bodyParts.push(rightArm);

  const rHand = new THREE.Mesh(getBoxGeo(0.17 * s, 0.13 * s, 0.17 * s), skinMat);
  rHand.position.set(0, -0.25 * s, 0);
  rightArm.add(rHand);

  if (options.hasWeapon) {
    const grip = new THREE.Mesh(getBoxGeo(0.08 * s, 0.14 * s, 0.09 * s), bootMat);
    grip.position.set(0, -0.28 * s, -0.09 * s);
    rightArm.add(grip);

    const slide = new THREE.Mesh(getBoxGeo(0.08 * s, 0.09 * s, 0.3 * s), gunMat);
    slide.position.set(0, -0.22 * s, -0.2 * s);
    rightArm.add(slide);

    const muzzleTip = new THREE.Mesh(getBoxGeo(0.05 * s, 0.05 * s, 0.06 * s), metalMat);
    muzzleTip.position.set(0, -0.22 * s, -0.36 * s);
    rightArm.add(muzzleTip);
  }

  // Head + Neck
  const neck = new THREE.Mesh(getBoxGeo(0.22 * s, 0.1 * s, 0.22 * s), skinMat);
  neck.position.set(0, 1.18 * s, 0);
  group.add(neck);

  const head = new THREE.Mesh(getBoxGeo(0.46 * s, 0.46 * s, 0.46 * s), skinMat);
  head.position.set(0, 1.42 * s, 0);
  head.castShadow = true;
  group.add(head);
  bodyParts.push(head);

  // Layered Hair (top + back fade)
  const hairTop = new THREE.Mesh(getBoxGeo(0.49 * s, 0.14 * s, 0.49 * s), hairMat);
  hairTop.position.set(0, 1.62 * s, 0.01 * s);
  group.add(hairTop);
  const hairBack = new THREE.Mesh(getBoxGeo(0.48 * s, 0.24 * s, 0.12 * s), hairMat);
  hairBack.position.set(0, 1.47 * s, 0.2 * s);
  group.add(hairBack);

  // Visor / Sunglasses OR Crisp Voxel Eyes (faces -Z forward)
  if (options.hasVisor) {
    const visorFrame = new THREE.Mesh(getBoxGeo(0.44 * s, 0.13 * s, 0.06 * s), bootMat);
    visorFrame.position.set(0, 1.45 * s, -0.22 * s);
    group.add(visorFrame);
    const visorLens = new THREE.Mesh(
      getBoxGeo(0.4 * s, 0.09 * s, 0.04 * s),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.45,
      })
    );
    visorLens.position.set(0, 1.45 * s, -0.245 * s);
    group.add(visorLens);
  } else {
    const eyeMat = getStdMat(0x0f172a, 0.2, 0.2);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(getBoxGeo(0.08 * s, 0.07 * s, 0.04 * s), eyeMat);
      eye.position.set(side * 0.11 * s, 1.43 * s, -0.23 * s);
      group.add(eye);
      const brow = new THREE.Mesh(getBoxGeo(0.1 * s, 0.03 * s, 0.04 * s), hairMat);
      brow.position.set(side * 0.11 * s, 1.49 * s, -0.23 * s);
      group.add(brow);
    }
  }

  // Optional Hat (Fixer Fedora with ribbon / Police cap with badge)
  if (options.hasHat) {
    const hatMat = getStdMat(options.hatColor ?? 0x1e293b, 0.6, 0.18);
    const brim = new THREE.Mesh(getBoxGeo(0.66 * s, 0.06 * s, 0.66 * s), hatMat);
    brim.position.set(0, 1.67 * s, -0.02 * s);
    group.add(brim);
    const crown = new THREE.Mesh(getBoxGeo(0.46 * s, 0.18 * s, 0.46 * s), hatMat);
    crown.position.set(0, 1.78 * s, 0);
    group.add(crown);
    const band = new THREE.Mesh(getBoxGeo(0.48 * s, 0.05 * s, 0.48 * s), getStdMat(options.jacketColor, 0.4, 0.3));
    band.position.set(0, 1.72 * s, 0);
    group.add(band);
  }

  let marker: THREE.Mesh | undefined;
  if (options.hasTargetMarker) {
    marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    marker.position.set(0, 2.35 * s, 0);
    group.add(marker);
  }

  group.add(createContactShadow(0.5 * s));

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    bodyParts,
    marker,
  };
}

export interface VoxelVehicleRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  lightbarRed?: THREE.Mesh;
  lightbarBlue?: THREE.Mesh;
}

export function createVoxelVehicle(
  kind: 'muscle' | 'police' | 'van' | 'taxi' | 'cargo',
  bodyColor: number
): VoxelVehicleRig {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const isVan = kind === 'van';
  const length = isVan ? 4.35 : 3.95;
  const width = isVan ? 2.04 : 1.88;
  const bodyH = isVan ? 0.92 : 0.62;

  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.28,
    metalness: 0.48,
  });
  const whiteMat = getStdMat(0xf8fafc, 0.3, 0.25);
  const trimMat = getStdMat(0x111827, 0.78, 0.18);
  const chromeMat = getStdMat(0xcbd5e1, 0.2, 0.88);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1526,
    roughness: 0.08,
    metalness: 0.9,
  });

  // Lower rocker skirt / underbody frame
  const underbody = new THREE.Mesh(getBoxGeo(width - 0.1, 0.16, length - 0.16), trimMat);
  underbody.position.set(0, 0.28, 0);
  group.add(underbody);

  // Main painted body
  const chassis = new THREE.Mesh(getBoxGeo(width, bodyH, length), paintMat);
  chassis.position.set(0, 0.36 + bodyH / 2, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Sculpted Hood step / power bulge (-Z front)
  const hoodZ = isVan ? -length / 2 + 0.55 : -length / 2 + 0.78;
  const hoodLen = isVan ? 0.95 : 1.35;
  const hood = new THREE.Mesh(getBoxGeo(width - 0.24, 0.12, hoodLen), paintMat);
  hood.position.set(0, 0.36 + bodyH + 0.05, hoodZ);
  group.add(hood);

  // Side fender arches & door beltline molding
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(
      getBoxGeo(0.08, 0.14, length - 0.5),
      kind === 'cargo'
        ? getStdMat(0x10b981, 0.25, 0.3, 0x059669, 0.6)
        : trimMat
    );
    skirt.position.set(side * (width / 2 + 0.02), 0.33, 0);
    group.add(skirt);

    const doorHandle = new THREE.Mesh(getBoxGeo(0.06, 0.06, 0.24), chromeMat);
    doorHandle.position.set(side * (width / 2 + 0.02), 0.36 + bodyH * 0.72, 0.1);
    group.add(doorHandle);
  }

  // Front & rear detailed bumpers + grille + license plates + exhausts
  const frontBumper = new THREE.Mesh(getBoxGeo(width + 0.12, 0.22, 0.22), trimMat);
  frontBumper.position.set(0, 0.34, -length / 2 - 0.06);
  group.add(frontBumper);

  const frontGrille = new THREE.Mesh(getBoxGeo(width * 0.54, 0.24, 0.08), trimMat);
  frontGrille.position.set(0, 0.58, -length / 2 - 0.02);
  group.add(frontGrille);
  const grilleBar = new THREE.Mesh(getBoxGeo(width * 0.48, 0.06, 0.04), chromeMat);
  grilleBar.position.set(0, 0.58, -length / 2 - 0.05);
  group.add(grilleBar);

  const rearBumper = new THREE.Mesh(getBoxGeo(width + 0.12, 0.22, 0.22), trimMat);
  rearBumper.position.set(0, 0.34, length / 2 + 0.06);
  group.add(rearBumper);

  const plate = new THREE.Mesh(getBoxGeo(0.46, 0.16, 0.04), whiteMat);
  plate.position.set(0, 0.55, length / 2 + 0.02);
  group.add(plate);

  for (const ex of [-0.52, 0.52]) {
    const pipe = new THREE.Mesh(getBoxGeo(0.14, 0.12, 0.18), chromeMat);
    pipe.position.set(ex, 0.24, length / 2 + 0.12);
    group.add(pipe);
  }

  // Cabin with structural roof & pillars framing glass
  const cabinLen = isVan ? 2.85 : 1.9;
  const cabinH = isVan ? 0.8 : 0.58;
  const cabinZ = isVan ? 0.35 : 0.22;
  const cabinMat = kind === 'police' ? whiteMat : paintMat;

  // Inner glass core
  const glassCore = new THREE.Mesh(getBoxGeo(width - 0.3, cabinH - 0.06, cabinLen - 0.06), glassMat);
  glassCore.position.set(0, 0.36 + bodyH + cabinH / 2 - 0.01, cabinZ);
  group.add(glassCore);

  // Roof cap
  const roof = new THREE.Mesh(getBoxGeo(width - 0.24, 0.12, cabinLen), cabinMat);
  roof.position.set(0, 0.36 + bodyH + cabinH, cabinZ);
  roof.castShadow = true;
  group.add(roof);

  // Corner cabin pillars (A & C pillars)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pillar = new THREE.Mesh(getBoxGeo(0.14, cabinH, 0.16), cabinMat);
      pillar.position.set(
        sx * ((width - 0.28) / 2),
        0.36 + bodyH + cabinH / 2,
        cabinZ + sz * (cabinLen / 2 - 0.08)
      );
      group.add(pillar);
    }
    // Side wing mirrors
    const mirror = new THREE.Mesh(getBoxGeo(0.18, 0.12, 0.14), trimMat);
    mirror.position.set(sx * (width / 2 + 0.07), 0.36 + bodyH + 0.12, cabinZ - cabinLen / 2 + 0.1);
    group.add(mirror);
  }

  // Police doors + push bullbar
  if (kind === 'police') {
    for (const sx of [-1, 1]) {
      const doorWhite = new THREE.Mesh(getBoxGeo(0.05, bodyH * 0.72, 1.55), whiteMat);
      doorWhite.position.set(sx * (width / 2 + 0.01), 0.36 + bodyH * 0.54, 0.05);
      group.add(doorWhite);
    }
    const bullBar = new THREE.Mesh(getBoxGeo(1.05, 0.32, 0.14), chromeMat);
    bullBar.position.set(0, 0.48, -length / 2 - 0.16);
    group.add(bullBar);
  }

  // Taxi side checker accents
  if (kind === 'taxi') {
    for (let i = 0; i < 4; i++) {
      const checkMat = i % 2 === 0 ? trimMat : whiteMat;
      for (const sx of [-1, 1]) {
        const sq = new THREE.Mesh(getBoxGeo(0.05, 0.14, 0.24), checkMat);
        sq.position.set(sx * (width / 2 + 0.015), 0.36 + bodyH * 0.65, -0.45 + i * 0.28);
        group.add(sq);
      }
    }
  }

  // Muscle / Cargo racing stripes + supercharger blower + twin-post spoiler
  if (kind === 'muscle' || kind === 'cargo') {
    const stripeMat =
      kind === 'cargo'
        ? getStdMat(0x34d399, 0.22, 0.4, 0x059669, 0.55)
        : whiteMat;

    for (const sx of [-0.22, 0.22]) {
      const hoodStripe = new THREE.Mesh(getBoxGeo(0.14, 0.03, hoodLen + 0.1), stripeMat);
      hoodStripe.position.set(sx, 0.36 + bodyH + 0.115, hoodZ);
      group.add(hoodStripe);

      const roofStripe = new THREE.Mesh(getBoxGeo(0.14, 0.03, cabinLen - 0.1), stripeMat);
      roofStripe.position.set(sx, 0.36 + bodyH + cabinH + 0.07, cabinZ);
      group.add(roofStripe);
    }

    // Supercharger intake scoop
    const scoop = new THREE.Mesh(getBoxGeo(0.48, 0.18, 0.44), chromeMat);
    scoop.position.set(0, 0.36 + bodyH + 0.18, hoodZ - 0.05);
    group.add(scoop);
    const intake = new THREE.Mesh(getBoxGeo(0.38, 0.12, 0.08), trimMat);
    intake.position.set(0, 0.36 + bodyH + 0.2, hoodZ - 0.26);
    group.add(intake);

    // Twin-post rear wing spoiler
    for (const sx of [-0.6, 0.6]) {
      const strut = new THREE.Mesh(getBoxGeo(0.08, 0.24, 0.12), trimMat);
      strut.position.set(sx, 0.36 + bodyH + 0.12, length / 2 - 0.24);
      group.add(strut);
    }
    const wing = new THREE.Mesh(getBoxGeo(width - 0.08, 0.09, 0.34), trimMat);
    wing.position.set(0, 0.36 + bodyH + 0.25, length / 2 - 0.24);
    group.add(wing);
  }

  // Van roof comms/AC pod
  if (kind === 'van') {
    const pod = new THREE.Mesh(getBoxGeo(1.0, 0.18, 0.85), trimMat);
    pod.position.set(0, 0.36 + bodyH + cabinH + 0.13, cabinZ + 0.3);
    group.add(pod);
  }

  // Headlights (-Z front)
  const headMat = getStdMat(0xfef08a, 0.15, 0.2, 0xfde047, 1.5);
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(getBoxGeo(0.34, 0.16, 0.08), headMat);
    hl.position.set(sx * (width / 2 - 0.32), 0.66, -length / 2 - 0.02);
    group.add(hl);
  }

  // Taillights (+Z back)
  const tailMat = getStdMat(0xef4444, 0.18, 0.2, 0xdc2626, 1.2);
  for (const sx of [-1, 1]) {
    const tl = new THREE.Mesh(getBoxGeo(0.38, 0.15, 0.08), tailMat);
    tl.position.set(sx * (width / 2 - 0.32), 0.66, length / 2 + 0.02);
    group.add(tl);
  }

  // 4 Voxel Wheels with recessed alloy hubcaps
  const wheelGeo = getBoxGeo(0.28, 0.58, 0.58);
  const wheelMat = getStdMat(0x0b0f17, 0.92, 0.05);
  const rimGeo = getBoxGeo(0.31, 0.3, 0.3);
  const wheelCoords: Array<[number, number]> = [
    [-width / 2 - 0.03, -length / 2 + 0.72],
    [width / 2 + 0.03, -length / 2 + 0.72],
    [-width / 2 - 0.03, length / 2 - 0.72],
    [width / 2 + 0.03, length / 2 - 0.72],
  ];
  for (const [wx, wz] of wheelCoords) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.29, wz);
    w.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    w.add(rim);
    group.add(w);
    wheels.push(w);
  }

  let lightbarRed: THREE.Mesh | undefined;
  let lightbarBlue: THREE.Mesh | undefined;
  if (kind === 'police') {
    const barY = 0.36 + bodyH + cabinH + 0.12;
    const barBase = new THREE.Mesh(getBoxGeo(1.06, 0.08, 0.32), trimMat);
    barBase.position.set(0, barY - 0.04, cabinZ);
    group.add(barBase);

    lightbarRed = new THREE.Mesh(
      getBoxGeo(0.45, 0.14, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.5,
      })
    );
    lightbarRed.position.set(-0.28, barY + 0.03, cabinZ);
    group.add(lightbarRed);

    lightbarBlue = new THREE.Mesh(
      getBoxGeo(0.45, 0.14, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x3b82f6,
        emissiveIntensity: 1.5,
      })
    );
    lightbarBlue.position.set(0.28, barY + 0.03, cabinZ);
    group.add(lightbarBlue);
  } else if (kind === 'taxi') {
    const base = new THREE.Mesh(getBoxGeo(0.62, 0.06, 0.28), trimMat);
    base.position.set(0, 0.36 + bodyH + cabinH + 0.08, cabinZ);
    group.add(base);
    const sign = new THREE.Mesh(
      getBoxGeo(0.55, 0.16, 0.24),
      getStdMat(0xfacc15, 0.2, 0.1, 0xfacc15, 0.9)
    );
    sign.position.set(0, 0.36 + bodyH + cabinH + 0.17, cabinZ);
    group.add(sign);
  }

  group.add(createContactShadow(2.25));

  return { group, wheels, lightbarRed, lightbarBlue };
}

export function createVoxelTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const curbMat = getStdMat(0x475569, 0.85, 0.08);
  const soilMat = getStdMat(0x3f2e21, 0.95, 0.02);
  const trunkMat = getStdMat(0x5c3a21, 0.9, 0.02);
  const leafDark = getStdMat(0x15803d, 0.82, 0.02);
  const leafMid = getStdMat(0x16a34a, 0.78, 0.02);
  const leafBright = getStdMat(0x22c55e, 0.74, 0.02);

  // Planter stone curb box
  const planter = new THREE.Mesh(getBoxGeo(1.35 * scale, 0.22 * scale, 1.35 * scale), curbMat);
  planter.position.y = 0.11 * scale;
  g.add(planter);
  const soil = new THREE.Mesh(getBoxGeo(1.05 * scale, 0.24 * scale, 1.05 * scale), soilMat);
  soil.position.y = 0.12 * scale;
  g.add(soil);

  // Stepped trunk + branch
  const trunk = new THREE.Mesh(getBoxGeo(0.46 * scale, 1.85 * scale, 0.46 * scale), trunkMat);
  trunk.position.y = 1.05 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  // Multi-cluster asymmetric voxel foliage
  const tier1 = new THREE.Mesh(getBoxGeo(2.15 * scale, 1.05 * scale, 2.0 * scale), leafDark);
  tier1.position.set(0, 2.25 * scale, 0);
  tier1.castShadow = true;
  g.add(tier1);

  const tier2 = new THREE.Mesh(getBoxGeo(1.65 * scale, 0.95 * scale, 1.65 * scale), leafMid);
  tier2.position.set(0.18 * scale, 3.05 * scale, -0.1 * scale);
  tier2.castShadow = true;
  g.add(tier2);

  const tier3 = new THREE.Mesh(getBoxGeo(1.1 * scale, 0.7 * scale, 1.1 * scale), leafBright);
  tier3.position.set(-0.15 * scale, 3.68 * scale, 0.1 * scale);
  tier3.castShadow = true;
  g.add(tier3);

  g.add(createContactShadow(1.15 * scale));
  return g;
}

export function createVoxelStreetLamp(): THREE.Group {
  const g = new THREE.Group();
  const poleMat = getStdMat(0x334155, 0.45, 0.72);
  const darkMetal = getStdMat(0x1e293b, 0.5, 0.65);
  const bulbMat = getStdMat(0xfef08a, 0.15, 0.1, 0xfbbf24, 1.45);

  const base = new THREE.Mesh(getBoxGeo(0.52, 0.45, 0.52), darkMetal);
  base.position.y = 0.225;
  g.add(base);

  const collar = new THREE.Mesh(getBoxGeo(0.32, 0.35, 0.32), poleMat);
  collar.position.y = 0.62;
  g.add(collar);

  const pole = new THREE.Mesh(getBoxGeo(0.16, 3.85, 0.16), poleMat);
  pole.position.y = 2.65;
  g.add(pole);

  const arm = new THREE.Mesh(getBoxGeo(1.05, 0.14, 0.16), poleMat);
  arm.position.set(0.44, 4.5, 0);
  g.add(arm);

  const hood = new THREE.Mesh(getBoxGeo(0.52, 0.12, 0.38), darkMetal);
  hood.position.set(0.84, 4.44, 0);
  g.add(hood);

  const lantern = new THREE.Mesh(getBoxGeo(0.42, 0.14, 0.3), bulbMat);
  lantern.position.set(0.84, 4.32, 0);
  g.add(lantern);

  return g;
}

export function createVoxelTrafficLight(): THREE.Group {
  const g = new THREE.Group();
  const poleMat = getStdMat(0x334155, 0.45, 0.72);
  const boxMat = getStdMat(0x0f172a, 0.65, 0.3);

  const base = new THREE.Mesh(getBoxGeo(0.42, 0.3, 0.42), boxMat);
  base.position.y = 0.15;
  g.add(base);

  const pole = new THREE.Mesh(getBoxGeo(0.14, 3.6, 0.14), poleMat);
  pole.position.y = 2.1;
  g.add(pole);

  const arm = new THREE.Mesh(getBoxGeo(1.2, 0.12, 0.12), poleMat);
  arm.position.set(0.55, 3.78, 0);
  g.add(arm);

  const housing = new THREE.Mesh(getBoxGeo(0.34, 0.88, 0.28), boxMat);
  housing.position.set(1.05, 3.45, 0);
  g.add(housing);

  const red = new THREE.Mesh(getBoxGeo(0.18, 0.18, 0.32), getStdMat(0xef4444, 0.2, 0.1, 0xef4444, 1.3));
  red.position.set(1.05, 3.69, 0);
  g.add(red);

  const amber = new THREE.Mesh(getBoxGeo(0.18, 0.18, 0.32), getStdMat(0xf59e0b, 0.2, 0.1, 0xf59e0b, 0.3));
  amber.position.set(1.05, 3.45, 0);
  g.add(amber);

  const green = new THREE.Mesh(getBoxGeo(0.18, 0.18, 0.32), getStdMat(0x22c55e, 0.2, 0.1, 0x22c55e, 1.1));
  green.position.set(1.05, 3.21, 0);
  g.add(green);

  return g;
}

export function createVoxelHydrant(): THREE.Group {
  const g = new THREE.Group();
  const redMat = getStdMat(0xdc2626, 0.42, 0.28);
  const capMat = getStdMat(0xe2e8f0, 0.3, 0.78);

  const base = new THREE.Mesh(getBoxGeo(0.36, 0.14, 0.36), redMat);
  base.position.y = 0.07;
  g.add(base);

  const body = new THREE.Mesh(getBoxGeo(0.28, 0.48, 0.28), redMat);
  body.position.y = 0.38;
  g.add(body);

  const nozzles = new THREE.Mesh(getBoxGeo(0.42, 0.14, 0.14), capMat);
  nozzles.position.y = 0.48;
  g.add(nozzles);

  const dome = new THREE.Mesh(getBoxGeo(0.22, 0.12, 0.22), capMat);
  dome.position.y = 0.68;
  g.add(dome);

  return g;
}

export function createVoxelShippingContainer(colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = getStdMat(colorHex, 0.68, 0.25);
  const ribMat = getStdMat(0x0f172a, 0.75, 0.3);

  const body = new THREE.Mesh(getBoxGeo(2.4, 2.3, 5.2), bodyMat);
  body.position.y = 1.15;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Corrugated vertical ribs
  for (let z = -2.1; z <= 2.1; z += 0.7) {
    const rib = new THREE.Mesh(getBoxGeo(2.48, 2.15, 0.14), bodyMat);
    rib.position.set(0, 1.15, z);
    g.add(rib);
  }

  // Corner steel posts
  for (const sx of [-1.14, 1.14]) {
    for (const sz of [-2.52, 2.52]) {
      const post = new THREE.Mesh(getBoxGeo(0.18, 2.34, 0.18), ribMat);
      post.position.set(sx, 1.17, sz);
      g.add(post);
    }
  }

  return g;
}

export function createHarborPier(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = getStdMat(0x5c3d28, 0.88, 0.04);
  const postMat = getStdMat(0x3b2618, 0.92, 0.04);
  const lampMat = getStdMat(0xfbbf24, 0.2, 0.1, 0xf59e0b, 1.3);

  const deck = new THREE.Mesh(getBoxGeo(14, 0.45, 7.2), woodMat);
  deck.position.set(0, -0.08, 0);
  g.add(deck);

  for (const px of [-5.5, 0, 5.5]) {
    for (const pz of [-2.8, 2.8]) {
      const piling = new THREE.Mesh(getBoxGeo(0.55, 1.8, 0.55), postMat);
      piling.position.set(px, -0.25, pz);
      g.add(piling);
    }
  }

  for (const px of [-5.5, 5.5]) {
    const lantern = new THREE.Mesh(getBoxGeo(0.32, 0.28, 0.32), lampMat);
    lantern.position.set(px, 0.78, 2.8);
    g.add(lantern);
  }

  return g;
}

export function createBuildingDetails(b: BuildingCollider): THREE.Group {
  const g = new THREE.Group();
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const stoneMat = getStdMat(0x1f2937, 0.85, 0.12);
  const darkMetal = getStdMat(0x334155, 0.55, 0.45);
  const accentGlow = getStdMat(b.accentColor, 0.3, 0.3, b.accentColor, b.landmark ? 0.75 : 0.3);

  // Ground plinth collar around base of building (slight outer lip)
  const plinth = new THREE.Mesh(getBoxGeo(w + 0.36, 0.7, d + 0.36), stoneMat);
  plinth.position.set(0, 0.35, 0);
  g.add(plinth);

  // Rooftop accent trim & recessed dark roof deck
  const trim = new THREE.Mesh(getBoxGeo(w + 0.38, 0.38, d + 0.38), accentGlow);
  trim.position.set(0, b.height + 0.19, 0);
  g.add(trim);

  const roofCap = new THREE.Mesh(
    getBoxGeo(Math.max(2, w - 0.8), 0.34, Math.max(2, d - 0.8)),
    getStdMat(0x141d2b, 0.9, 0.08)
  );
  roofCap.position.set(0, b.height + 0.39, 0);
  g.add(roofCap);

  // --- Standard Non-Landmark Architectural Variety ---
  if (!b.landmark) {
    // Stepped upper mechanical penthouse / setback on taller towers
    if (b.height >= 14) {
      const upperW = w * 0.64;
      const upperD = d * 0.64;
      const upperH = 2.6;
      const upperTier = new THREE.Mesh(getBoxGeo(upperW, upperH, upperD), getStdMat(b.color, 0.68, 0.15));
      upperTier.position.set(0, b.height + 0.56 + upperH / 2, 0);
      upperTier.castShadow = true;
      g.add(upperTier);

      const upperTrim = new THREE.Mesh(getBoxGeo(upperW + 0.25, 0.24, upperD + 0.25), accentGlow);
      upperTrim.position.set(0, b.height + 0.56 + upperH + 0.12, 0);
      g.add(upperTrim);

      // Spire antenna + red beacon
      const mast = new THREE.Mesh(getBoxGeo(0.22, 3.2, 0.22), darkMetal);
      mast.position.set(0, b.height + 0.56 + upperH + 1.7, 0);
      g.add(mast);
      const beacon = new THREE.Mesh(getBoxGeo(0.32, 0.32, 0.32), getStdMat(0xf43f5e, 0.2, 0.1, 0xf43f5e, 1.4));
      beacon.position.set(0, b.height + 0.56 + upperH + 3.4, 0);
      g.add(beacon);
    } else {
      // Rooftop HVAC + fan louver + water tank with steel bands & conical cap
      const hvacW = Math.min(3.0, w * 0.3);
      const hvacD = Math.min(2.4, d * 0.28);
      const hvac = new THREE.Mesh(getBoxGeo(hvacW, 0.85, hvacD), darkMetal);
      hvac.position.set(-w * 0.18, b.height + 0.92, d * 0.12);
      g.add(hvac);
      const fanGrill = new THREE.Mesh(
        getBoxGeo(hvacW * 0.62, 0.14, hvacD * 0.62),
        getStdMat(0x0f172a, 0.85, 0.3)
      );
      fanGrill.position.set(-w * 0.18, b.height + 1.4, d * 0.12);
      g.add(fanGrill);

      if (w >= 9 && b.district !== 'financial') {
        const tank = new THREE.Mesh(getBoxGeo(1.7, 1.4, 1.7), getStdMat(0x6b442a, 0.85, 0.08));
        tank.position.set(w * 0.22, b.height + 1.45, -d * 0.18);
        g.add(tank);
        const tankBand = new THREE.Mesh(getBoxGeo(1.78, 0.14, 1.78), darkMetal);
        tankBand.position.set(w * 0.22, b.height + 1.45, -d * 0.18);
        g.add(tankBand);
        const tankCap = new THREE.Mesh(getBoxGeo(1.4, 0.32, 1.4), darkMetal);
        tankCap.position.set(w * 0.22, b.height + 2.31, -d * 0.18);
        g.add(tankCap);
        const tankLegs = new THREE.Mesh(getBoxGeo(1.2, 0.6, 1.2), darkMetal);
        tankLegs.position.set(w * 0.22, b.height + 0.65, -d * 0.18);
        g.add(tankLegs);
      }
    }

    // Street-facing ground awning
    const awningColor = b.district === 'chinatown' ? 0xe11d48 : b.district === 'harbor' ? 0x0d9488 : 0x1e293b;
    const awning = new THREE.Mesh(getBoxGeo(Math.min(5.2, w * 0.48), 0.26, 1.0), getStdMat(awningColor, 0.6, 0.18));
    awning.position.set(0, 2.75, d / 2 + 0.45);
    g.add(awning);
    return g;
  }

  // --- Bespoke Hero Landmarks ---
  if (b.landmark === 'bank') {
    const marbleMat = getStdMat(0xdbeafe, 0.55, 0.15);
    const goldMat = getStdMat(0xfbbf24, 0.22, 0.78, 0xf59e0b, 0.55);

    // Classical 4-column portico on south plaza (+Z)
    for (const cx of [-5.2, -2.0, 2.0, 5.2]) {
      const col = new THREE.Mesh(getBoxGeo(0.75, 5.2, 0.75), marbleMat);
      col.position.set(cx, 2.6, d / 2 + 0.55);
      g.add(col);
    }
    const lintel = new THREE.Mesh(getBoxGeo(12.2, 0.9, 1.35), marbleMat);
    lintel.position.set(0, 5.55, d / 2 + 0.55);
    g.add(lintel);

    // Sculpted pixel-art "$" emblem above portico
    const signBack = new THREE.Mesh(getBoxGeo(4.8, 2.8, 0.4), getStdMat(0x0f172a, 0.4, 0.5));
    signBack.position.set(0, 9.2, d / 2 + 0.25);
    g.add(signBack);
    const sz = d / 2 + 0.52;
    const sTop = new THREE.Mesh(getBoxGeo(1.45, 0.3, 0.24), goldMat);
    sTop.position.set(0, 9.85, sz);
    g.add(sTop);
    const sMid = new THREE.Mesh(getBoxGeo(1.45, 0.3, 0.24), goldMat);
    sMid.position.set(0, 9.2, sz);
    g.add(sMid);
    const sBot = new THREE.Mesh(getBoxGeo(1.45, 0.3, 0.24), goldMat);
    sBot.position.set(0, 8.55, sz);
    g.add(sBot);
    const sUpperLeft = new THREE.Mesh(getBoxGeo(0.32, 0.68, 0.24), goldMat);
    sUpperLeft.position.set(-0.56, 9.52, sz);
    g.add(sUpperLeft);
    const sLowerRight = new THREE.Mesh(getBoxGeo(0.32, 0.68, 0.24), goldMat);
    sLowerRight.position.set(0.56, 8.88, sz);
    g.add(sLowerRight);
    const sTickTop = new THREE.Mesh(getBoxGeo(0.28, 0.32, 0.24), goldMat);
    sTickTop.position.set(0, 10.14, sz);
    g.add(sTickTop);
    const sTickBot = new THREE.Mesh(getBoxGeo(0.28, 0.32, 0.24), goldMat);
    sTickBot.position.set(0, 8.26, sz);
    g.add(sTickBot);

    // Rooftop stepped dome + helipad H
    const crown = new THREE.Mesh(getBoxGeo(w * 0.58, 2.4, d * 0.58), getStdMat(0x0f172a, 0.4, 0.6));
    crown.position.set(0, b.height + 1.6, 0);
    g.add(crown);
    const hLeft = new THREE.Mesh(getBoxGeo(0.35, 0.08, 2.8), goldMat);
    hLeft.position.set(-0.9, b.height + 2.85, 0);
    g.add(hLeft);
    const hRight = new THREE.Mesh(getBoxGeo(0.35, 0.08, 2.8), goldMat);
    hRight.position.set(0.9, b.height + 2.85, 0);
    g.add(hRight);
    const hCross = new THREE.Mesh(getBoxGeo(1.8, 0.08, 0.35), goldMat);
    hCross.position.set(0, b.height + 2.85, 0);
    g.add(hCross);
  } else if (b.landmark === 'jade') {
    const crimsonRoof = getStdMat(0x9f1239, 0.5, 0.2);
    const goldTrim = getStdMat(0xfbbf24, 0.3, 0.65);
    const lanternMat = getStdMat(0xf43f5e, 0.2, 0.1, 0xf43f5e, 1.3);

    // Multi-tier pagoda eaves
    const eaveLower = new THREE.Mesh(getBoxGeo(w + 1.6, 0.55, d + 1.6), crimsonRoof);
    eaveLower.position.set(0, 6.2, 0);
    g.add(eaveLower);

    const pagodaUpper = new THREE.Mesh(getBoxGeo(w * 0.68, 3.0, d * 0.68), getStdMat(0x4c1d3d, 0.65, 0.15));
    pagodaUpper.position.set(0, b.height + 1.9, 0);
    g.add(pagodaUpper);

    const eaveTop = new THREE.Mesh(getBoxGeo(w * 0.82, 0.65, d * 0.82), crimsonRoof);
    eaveTop.position.set(0, b.height + 3.6, 0);
    g.add(eaveTop);

    const finial = new THREE.Mesh(getBoxGeo(0.55, 1.6, 0.55), goldTrim);
    finial.position.set(0, b.height + 4.6, 0);
    g.add(finial);

    // Vertical neon blade sign on right facade
    const signFrame = new THREE.Mesh(getBoxGeo(1.1, 7.2, 0.5), getStdMat(0x0f172a, 0.5, 0.4));
    signFrame.position.set(w / 2 - 1.4, 8.2, d / 2 + 0.5);
    g.add(signFrame);
    const neonCore = new THREE.Mesh(getBoxGeo(0.65, 6.4, 0.22), getStdMat(0xf43f5e, 0.2, 0.1, 0xfb7185, 1.4));
    neonCore.position.set(w / 2 - 1.4, 8.2, d / 2 + 0.72);
    g.add(neonCore);

    // Hanging red lanterns along terrace
    for (let lx = -5.5; lx <= 5.5; lx += 2.75) {
      const cord = new THREE.Mesh(getBoxGeo(0.08, 0.65, 0.08), darkMetal);
      cord.position.set(lx, 5.65, d / 2 + 0.68);
      g.add(cord);
      const lantern = new THREE.Mesh(getBoxGeo(0.58, 0.82, 0.58), lanternMat);
      lantern.position.set(lx, 5.0, d / 2 + 0.68);
      g.add(lantern);
    }
  } else if (b.landmark === 'warehouse') {
    const steelMat = getStdMat(0x475569, 0.5, 0.65);
    const hazardMat = getStdMat(0xf59e0b, 0.4, 0.25, 0xf59e0b, 0.35);

    // Sawtooth industrial roof ridges
    for (let rx = -4.5; rx <= 4.5; rx += 4.5) {
      const ridge = new THREE.Mesh(getBoxGeo(3.6, 1.4, d - 0.6), steelMat);
      ridge.position.set(rx, b.height + 1.1, 0);
      g.add(ridge);
    }

    // Loading dock canopy facing south cargo yard (+Z)
    const bayCanopy = new THREE.Mesh(getBoxGeo(w - 1.5, 0.35, 1.4), hazardMat);
    bayCanopy.position.set(0, 4.1, d / 2 + 0.65);
    g.add(bayCanopy);

    // Harbor Gantry Crane silhouette mounted atop/beside roof
    const craneTower = new THREE.Mesh(getBoxGeo(1.1, 7.5, 1.1), hazardMat);
    craneTower.position.set(-w / 2 + 2.2, b.height + 4.1, -1.0);
    g.add(craneTower);
    const craneBoom = new THREE.Mesh(getBoxGeo(11.0, 0.75, 0.9), hazardMat);
    craneBoom.position.set(-w / 2 + 6.5, b.height + 7.8, -1.0);
    g.add(craneBoom);
  } else if (b.landmark === 'safehouse') {
    const tealGlow = getStdMat(0x2dd4bf, 0.2, 0.2, 0x14b8a6, 1.1);
    const canopy = new THREE.Mesh(getBoxGeo(w - 2, 0.35, 1.4), getStdMat(0x134e4a, 0.65, 0.2));
    canopy.position.set(0, 3.2, -d / 2 - 0.65);
    g.add(canopy);
    const neonStrip = new THREE.Mesh(getBoxGeo(w - 2.2, 0.22, 0.2), tealGlow);
    neonStrip.position.set(0, 3.4, -d / 2 - 1.3);
    g.add(neonStrip);
    const dishMast = new THREE.Mesh(getBoxGeo(0.3, 2.2, 0.3), darkMetal);
    dishMast.position.set(2.5, b.height + 1.5, 1.0);
    g.add(dishMast);
    const dish = new THREE.Mesh(getBoxGeo(1.6, 1.1, 0.3), getStdMat(0xe2e8f0, 0.4, 0.5));
    dish.position.set(2.5, b.height + 2.6, 0.8);
    g.add(dish);
  } else if (b.landmark === 'garage') {
    const amberGlow = getStdMat(0xf59e0b, 0.2, 0.2, 0xf59e0b, 1.1);
    const bayDoor = new THREE.Mesh(getBoxGeo(6.8, 3.8, 0.35), getStdMat(0x1f2937, 0.55, 0.55));
    bayDoor.position.set(0, 1.9, -d / 2 - 0.15);
    g.add(bayDoor);
    for (const sx of [-3.8, 3.8]) {
      const pillar = new THREE.Mesh(getBoxGeo(0.7, 4.4, 0.65), amberGlow);
      pillar.position.set(sx, 2.2, -d / 2 - 0.22);
      g.add(pillar);
    }
    const headerSign = new THREE.Mesh(getBoxGeo(7.8, 0.9, 0.5), amberGlow);
    headerSign.position.set(0, 4.8, -d / 2 - 0.25);
    g.add(headerSign);
  } else if (b.landmark === 'subway') {
    const cyanGlow = getStdMat(0x38bdf8, 0.2, 0.2, 0x0ea5e9, 1.2);
    const canopy = new THREE.Mesh(getBoxGeo(8.2, 0.32, 1.8), getStdMat(0x0f172a, 0.35, 0.7));
    canopy.position.set(0, 3.3, -d / 2 - 0.85);
    g.add(canopy);
    const totem = new THREE.Mesh(getBoxGeo(1.2, 4.2, 0.45), cyanGlow);
    totem.position.set(-4.8, 2.1, -d / 2 - 0.7);
    g.add(totem);
  } else if (b.landmark === 'spire') {
    const obsidianMat = getStdMat(0x090d16, 0.3, 0.65);
    const crimsonGlow = getStdMat(0xf43f5e, 0.2, 0.2, 0xe11d48, 1.5);

    // Multi-tiered obsidian spire crown & needle
    const tier2 = new THREE.Mesh(getBoxGeo(w * 0.72, 6.5, d * 0.72), obsidianMat);
    tier2.position.set(0, b.height + 3.6, 0);
    g.add(tier2);
    const tier2Trim = new THREE.Mesh(getBoxGeo(w * 0.75, 0.32, d * 0.75), crimsonGlow);
    tier2Trim.position.set(0, b.height + 6.95, 0);
    g.add(tier2Trim);
    const needleBase = new THREE.Mesh(getBoxGeo(w * 0.36, 4.2, d * 0.36), obsidianMat);
    needleBase.position.set(0, b.height + 9.2, 0);
    g.add(needleBase);
    const spireNeedle = new THREE.Mesh(getBoxGeo(0.5, 7.0, 0.5), crimsonGlow);
    spireNeedle.position.set(0, b.height + 14.5, 0);
    g.add(spireNeedle);

    // Vertical crimson reactor core slit on south facade (+Z)
    const coreSlit = new THREE.Mesh(getBoxGeo(1.1, b.height - 5, 0.35), crimsonGlow);
    coreSlit.position.set(0, b.height / 2 + 2.0, d / 2 + 0.18);
    g.add(coreSlit);

    // Laser security portal arch on south entrance (+Z)
    for (const sx of [-3.5, 3.5]) {
      const pylon = new THREE.Mesh(getBoxGeo(0.85, 4.6, 0.9), obsidianMat);
      pylon.position.set(sx, 2.3, d / 2 + 0.55);
      g.add(pylon);
    }
    const archBeam = new THREE.Mesh(getBoxGeo(8.2, 0.55, 1.0), crimsonGlow);
    archBeam.position.set(0, 4.75, d / 2 + 0.55);
    g.add(archBeam);
  } else if (b.landmark === 'casino') {
    const goldGlow = getStdMat(0xfbbf24, 0.2, 0.5, 0xf59e0b, 1.2);
    const magentaGlow = getStdMat(0xe879f9, 0.2, 0.2, 0xd946ef, 1.35);

    // Valet porte-cochere canopy on south (+Z)
    const valet = new THREE.Mesh(getBoxGeo(w * 0.72, 0.5, 2.4), getStdMat(0x581c87, 0.4, 0.4));
    valet.position.set(0, 4.2, d / 2 + 1.2);
    g.add(valet);
    const valetRim = new THREE.Mesh(getBoxGeo(w * 0.74, 0.22, 2.5), goldGlow);
    valetRim.position.set(0, 4.5, d / 2 + 1.2);
    g.add(valetRim);
    for (const sx of [-4.2, 4.2]) {
      const col = new THREE.Mesh(getBoxGeo(0.65, 4.2, 0.65), goldGlow);
      col.position.set(sx, 2.1, d / 2 + 2.0);
      g.add(col);
    }

    // Twin vertical neon strip columns + rooftop diamond crown
    for (const sx of [-w / 2 + 1.4, w / 2 - 1.4]) {
      const neonBar = new THREE.Mesh(getBoxGeo(0.45, b.height - 3.5, 0.3), magentaGlow);
      neonBar.position.set(sx, b.height / 2 + 1.2, d / 2 + 0.2);
      g.add(neonBar);
    }
    const crownBase = new THREE.Mesh(getBoxGeo(6.4, 1.8, 4.2), getStdMat(0x1e1b4b, 0.4, 0.5));
    crownBase.position.set(0, b.height + 1.3, 0);
    g.add(crownBase);
    const crownSign = new THREE.Mesh(getBoxGeo(4.4, 1.8, 0.6), goldGlow);
    crownSign.position.set(0, b.height + 2.6, d / 2 - 0.5);
    g.add(crownSign);
  } else if (b.landmark === 'refinery') {
    const rustSteel = getStdMat(0x57534e, 0.75, 0.45);
    const orangeGlow = getStdMat(0xf97316, 0.25, 0.2, 0xea580c, 1.25);

    // Twin industrial smokestacks with glowing warning collars
    for (const sx of [-4.2, 4.2]) {
      const stack = new THREE.Mesh(getBoxGeo(2.0, 8.5, 2.0), rustSteel);
      stack.position.set(sx, b.height + 4.4, 1.2);
      g.add(stack);
      const collar = new THREE.Mesh(getBoxGeo(2.25, 0.65, 2.25), orangeGlow);
      collar.position.set(sx, b.height + 7.6, 1.2);
      g.add(collar);
    }
    // Overhead steel pipe bridge + north loading gantry (-Z)
    const pipe = new THREE.Mesh(getBoxGeo(w - 2, 1.1, 1.1), darkMetal);
    pipe.position.set(0, b.height + 1.6, -1.8);
    g.add(pipe);
    const gantry = new THREE.Mesh(getBoxGeo(w - 1.5, 0.55, 1.6), orangeGlow);
    g.add(gantry);
    gantry.position.set(0, 4.4, -d / 2 - 0.8);
  } else if (b.landmark === 'helipad') {
    const cyanGlow = getStdMat(0x38bdf8, 0.2, 0.2, 0x0ea5e9, 1.35);
    const whiteMat = getStdMat(0xf1f5f9, 0.45, 0.2);

    // Lighthouse beacon tower on SE roof corner
    const tower = new THREE.Mesh(getBoxGeo(3.2, 7.0, 3.2), whiteMat);
    tower.position.set(w / 2 - 2.6, b.height + 3.7, d / 2 - 2.4);
    g.add(tower);
    const stripe = new THREE.Mesh(getBoxGeo(3.35, 1.4, 3.35), getStdMat(0x0d9488, 0.5, 0.2));
    stripe.position.set(w / 2 - 2.6, b.height + 3.8, d / 2 - 2.4);
    g.add(stripe);
    const lantern = new THREE.Mesh(getBoxGeo(2.2, 1.6, 2.2), cyanGlow);
    lantern.position.set(w / 2 - 2.6, b.height + 7.9, d / 2 - 2.4);
    g.add(lantern);

    // Rooftop illuminated "H" Helipad Deck
    const padBorder = new THREE.Mesh(getBoxGeo(6.4, 0.14, 6.4), getStdMat(0x1e293b, 0.7, 0.2));
    padBorder.position.set(-2.2, b.height + 0.62, -0.8);
    g.add(padBorder);
    const hL = new THREE.Mesh(getBoxGeo(0.45, 0.08, 3.6), cyanGlow);
    hL.position.set(-3.4, b.height + 0.72, -0.8);
    g.add(hL);
    const hR = new THREE.Mesh(getBoxGeo(0.45, 0.08, 3.6), cyanGlow);
    hR.position.set(-1.0, b.height + 0.72, -0.8);
    g.add(hR);
    const hC = new THREE.Mesh(getBoxGeo(2.4, 0.08, 0.45), cyanGlow);
    hC.position.set(-2.2, b.height + 0.72, -0.8);
    g.add(hC);
  }

  return g;
}

export interface VoxelHelicopterRig {
  group: THREE.Group;
  mainRotor: THREE.Group;
  tailRotor: THREE.Group;
}

export function createVoxelHelicopter(): VoxelHelicopterRig {
  const group = new THREE.Group();
  const hullMat = getStdMat(0x0f172a, 0.35, 0.55);
  const accentMat = getStdMat(0x38bdf8, 0.25, 0.4, 0x0ea5e9, 0.85);
  const goldMat = getStdMat(0xfbbf24, 0.3, 0.5);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1526,
    roughness: 0.08,
    metalness: 0.9,
  });
  const metalMat = getStdMat(0x475569, 0.45, 0.72);

  // Twin landing skids
  for (const sx of [-1.15, 1.15]) {
    const skid = new THREE.Mesh(getBoxGeo(0.16, 0.14, 3.8), metalMat);
    skid.position.set(sx, 0.07, -0.1);
    group.add(skid);
    for (const sz of [-0.95, 0.95]) {
      const strut = new THREE.Mesh(getBoxGeo(0.12, 0.65, 0.14), metalMat);
      strut.position.set(sx * 0.88, 0.4, sz);
      group.add(strut);
    }
  }

  // Main fuselage cabin + cockpit nose
  const fuselage = new THREE.Mesh(getBoxGeo(2.05, 1.35, 3.4), hullMat);
  fuselage.position.set(0, 1.35, -0.15);
  fuselage.castShadow = true;
  group.add(fuselage);

  const stripe = new THREE.Mesh(getBoxGeo(2.12, 0.2, 3.2), accentMat);
  stripe.position.set(0, 1.15, -0.15);
  group.add(stripe);

  const cockpitGlass = new THREE.Mesh(getBoxGeo(1.75, 0.75, 1.25), glassMat);
  cockpitGlass.position.set(0, 1.5, -1.55);
  group.add(cockpitGlass);

  // Twin turbine engine housing on roof
  const turbine = new THREE.Mesh(getBoxGeo(1.25, 0.55, 1.9), metalMat);
  turbine.position.set(0, 2.28, 0.1);
  group.add(turbine);

  // Tail boom + vertical stabilizer + tail rotor
  const tailBoom = new THREE.Mesh(getBoxGeo(0.45, 0.48, 3.2), hullMat);
  tailBoom.position.set(0, 1.55, 2.85);
  group.add(tailBoom);

  const tailFin = new THREE.Mesh(getBoxGeo(0.18, 1.2, 0.75), accentMat);
  tailFin.position.set(0, 2.05, 4.25);
  group.add(tailFin);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.24, 2.15, 4.25);
  const trBlade1 = new THREE.Mesh(getBoxGeo(0.06, 1.05, 0.16), goldMat);
  const trBlade2 = new THREE.Mesh(getBoxGeo(0.06, 0.16, 1.05), goldMat);
  tailRotor.add(trBlade1, trBlade2);
  group.add(tailRotor);

  // Main Rotor Assembly
  const mast = new THREE.Mesh(getBoxGeo(0.26, 0.5, 0.26), metalMat);
  mast.position.set(0, 2.75, 0);
  group.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 2.98, 0);
  const bladeA = new THREE.Mesh(getBoxGeo(7.6, 0.06, 0.28), metalMat);
  const bladeB = new THREE.Mesh(getBoxGeo(0.28, 0.06, 7.6), metalMat);
  const hub = new THREE.Mesh(getBoxGeo(0.48, 0.18, 0.48), goldMat);
  mainRotor.add(bladeA, bladeB, hub);
  group.add(mainRotor);

  return { group, mainRotor, tailRotor };
}

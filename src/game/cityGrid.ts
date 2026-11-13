import { BuildingCollider, DistrictId, DistrictInfo, Vec2 } from './types';

// Expanded 3.2x City Area: 272m x 272m (8x8 blocks across 9x9 street grid)
export const CITY_HALF_SIZE = 136;
export const STREET_CENTERS = [-120, -90, -60, -30, 0, 30, 60, 90, 120] as const;
export const STREET_HALF_WIDTH = 5; // 10m wide streets (2 full lanes + sidewalks)

export const PLAYER_SPAWN: Vec2 = { x: 0, z: 12 };
export const PLAYER_SPAWN_ANGLE = 0; // Facing -Z down Central Avenue toward landmarks

export const DISTRICTS: Record<DistrictId, DistrictInfo> = {
  financial: {
    id: 'financial',
    name: '金融中心',
    nameEn: 'Financial Plaza & Spire',
    color: '#38bdf8',
  },
  chinatown: {
    id: 'chinatown',
    name: '霓虹唐人街',
    nameEn: 'Neon Jade & Casino',
    color: '#fb7185',
  },
  industrial: {
    id: 'industrial',
    name: '工业货场',
    nameEn: 'Ironworks & Refinery',
    color: '#f59e0b',
  },
  harbor: {
    id: 'harbor',
    name: '海港码头',
    nameEn: 'Harbor Docks & Helipad',
    color: '#34d399',
  },
};

export function getDistrictAt(x: number, z: number): DistrictInfo {
  if (x < 0 && z < 0) return DISTRICTS.financial;
  if (x >= 0 && z < 0) return DISTRICTS.chinatown;
  if (x < 0 && z >= 0) return DISTRICTS.industrial;
  return DISTRICTS.harbor;
}

// 8x8 grid of city blocks between STREET_CENTERS [-120, -90, -60, -30, 0, 30, 60, 90, 120]
// Inner 4x4 core (indices 2..5) preserves all original block coordinates & landmarks.
export const BLOCK_RANGES: Array<[number, number]> = [
  [-114, -96],
  [-84, -66],
  [-54, -36],
  [-24, -6],
  [6, 24],
  [36, 54],
  [66, 84],
  [96, 114],
];

function districtPalette(d: DistrictId, row: number, col: number): { color: number; accent: number; h: number } {
  const seed = (row * 7 + col * 13) % 5;
  const isOuterRing = row === 0 || row === 7 || col === 0 || col === 7;
  const outerBoost = isOuterRing ? 2 : 0;

  switch (d) {
    case 'financial':
      return {
        color: [0x2c3e55, 0x34495e, 0x3b4d63, 0x263547, 0x415a77][seed],
        accent: 0x38bdf8,
        h: 14 + seed * 4 + outerBoost * 2,
      };
    case 'chinatown':
      return {
        color: [0x3b2634, 0x4a2535, 0x2d2a3e, 0x522b3a, 0x36293d][seed],
        accent: seed % 2 === 0 ? 0xf43f5e : 0xf59e0b,
        h: 9 + seed * 2.5 + outerBoost,
      };
    case 'industrial':
      return {
        color: [0x463f3a, 0x544940, 0x3d3a38, 0x5e4b3c, 0x4a433d][seed],
        accent: 0xf59e0b,
        h: 6 + seed * 2 + outerBoost,
      };
    case 'harbor':
      return {
        color: [0x264147, 0x2b4c54, 0x334e58, 0x223840, 0x2f5359][seed],
        accent: 0x34d399,
        h: 7 + seed * 2 + outerBoost,
      };
  }
}

export function buildCityBuildings(): BuildingCollider[] {
  const buildings: BuildingCollider[] = [];

  for (let r = 0; r < BLOCK_RANGES.length; r++) {
    for (let c = 0; c < BLOCK_RANGES.length; c++) {
      const [minX, maxX] = BLOCK_RANGES[c];
      const [minZ, maxZ] = BLOCK_RANGES[r];
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const district = getDistrictAt(cx, cz).id;
      const pal = districtPalette(district, r, c);

      // --- 4 NEW OUTER-RING LANDMARKS ---
      // NW Outer Corner (r=0, c=0): Obsidian Spire (-105, -105), south plaza (-105, -104..-96)
      if (r === 0 && c === 0) {
        buildings.push({
          id: 'landmark-spire',
          minX: -113,
          maxX: -97,
          minZ: -114,
          maxZ: -104,
          height: 28,
          district,
          color: 0x0f172a,
          accentColor: 0xf43f5e,
          label: '黑曜石议会大厦',
          landmark: 'spire',
        });
        continue;
      }

      // NE Outer Corner (r=0, c=7): Kowloon Neon Casino (105, -105), south valet yard (105, -104..-96)
      if (r === 0 && c === 7) {
        buildings.push({
          id: 'landmark-casino',
          minX: 98,
          maxX: 114,
          minZ: -114,
          maxZ: -104,
          height: 16,
          district,
          color: 0x3b0764,
          accentColor: 0xfbbf24,
          label: '九龙霓虹赌场',
          landmark: 'casino',
        });
        continue;
      }

      // SW Outer Corner (r=7, c=0): Blacksteel Refinery (-105, 105), north convoy yard (-105, 96..104)
      if (r === 7 && c === 0) {
        buildings.push({
          id: 'landmark-refinery',
          minX: -114,
          maxX: -98,
          minZ: 104,
          maxZ: 114,
          height: 12,
          district,
          color: 0x292524,
          accentColor: 0xf97316,
          label: '黑钢重工精炼厂',
          landmark: 'refinery',
        });
        continue;
      }

      // SE Outer Corner (r=7, c=7): Liberty Helipad Pier (105, 105), north extraction pad (105, 96..103)
      if (r === 7 && c === 7) {
        buildings.push({
          id: 'landmark-helipad',
          minX: 99,
          maxX: 113,
          minZ: 103,
          maxZ: 114,
          height: 11,
          district,
          color: 0x134e4a,
          accentColor: 0x38bdf8,
          label: '自由港灯塔停机坪',
          landmark: 'helipad',
        });
        continue;
      }

      // --- ORIGINAL 6 INNER-CORE LANDMARKS (mapped to indices 2..5) ---
      // Bank at block (r=2, c=2) -> (-45, -45), courtyard at (-45, -38)
      if (r === 2 && c === 2) {
        buildings.push({
          id: 'landmark-bank',
          minX: -53,
          maxX: -37,
          minZ: -54,
          maxZ: -44,
          height: 18,
          district,
          color: 0x1e293b,
          accentColor: 0xfbbf24,
          label: '太平洋体素银行',
          landmark: 'bank',
        });
        continue;
      }

      // Jade Plaza at block (r=2, c=5) -> (45, -45), open terrace at (45, -39)
      if (r === 2 && c === 5) {
        buildings.push({
          id: 'landmark-jade',
          minX: 38,
          maxX: 54,
          minZ: -54,
          maxZ: -45,
          height: 14,
          district,
          color: 0x4c1d3d,
          accentColor: 0xfb7185,
          label: '翡翠霓虹楼',
          landmark: 'jade',
        });
        continue;
      }

      // Dock Warehouse at block (r=4, c=5) -> (45, 15)
      if (r === 4 && c === 5) {
        buildings.push({
          id: 'landmark-warehouse',
          minX: 38,
          maxX: 54,
          minZ: 6,
          maxZ: 14,
          height: 8,
          district,
          color: 0x264653,
          accentColor: 0x34d399,
          label: '码头仓库',
          landmark: 'warehouse',
        });
        continue;
      }

      // Harbor Safe House at block (r=5, c=5) -> (45, 45)
      if (r === 5 && c === 5) {
        buildings.push({
          id: 'landmark-safehouse',
          minX: 39,
          maxX: 53,
          minZ: 43,
          maxZ: 54,
          height: 9,
          district,
          color: 0x1f3a3d,
          accentColor: 0x2dd4bf,
          label: '海港安全屋',
          landmark: 'safehouse',
        });
        continue;
      }

      // Underground Garage at block (r=5, c=2) -> (-45, 45)
      if (r === 5 && c === 2) {
        buildings.push({
          id: 'landmark-garage',
          minX: -54,
          maxX: -39,
          minZ: 44,
          maxZ: 54,
          height: 8,
          district,
          color: 0x44403c,
          accentColor: 0xf59e0b,
          label: '地下改装车库',
          landmark: 'garage',
        });
        continue;
      }

      // Subway Extraction at block (r=5, c=3) -> (-15, 45)
      if (r === 5 && c === 3) {
        buildings.push({
          id: 'landmark-subway',
          minX: -24,
          maxX: -8,
          minZ: 44,
          maxZ: 54,
          height: 7,
          district,
          color: 0x334155,
          accentColor: 0x38bdf8,
          label: '南区地铁口',
          landmark: 'subway',
        });
        continue;
      }

      // Standard voxel city block: split alternating blocks into 2 varied-height voxel towers for skyline silhouette
      if ((r + c) % 2 === 0) {
        buildings.push({
          id: `b-${r}-${c}-a`,
          minX: minX + 0.5,
          maxX: cx - 1,
          minZ: minZ + 0.5,
          maxZ: maxZ - 0.5,
          height: pal.h,
          district,
          color: pal.color,
          accentColor: pal.accent,
        });
        buildings.push({
          id: `b-${r}-${c}-b`,
          minX: cx + 1,
          maxX: maxX - 0.5,
          minZ: minZ + 1.5,
          maxZ: maxZ - 1.5,
          height: Math.max(5, pal.h - 4),
          district,
          color: pal.color,
          accentColor: pal.accent,
        });
      } else {
        buildings.push({
          id: `b-${r}-${c}`,
          minX: minX + 1,
          maxX: maxX - 1,
          minZ: minZ + 1,
          maxZ: maxZ - 1,
          height: pal.h,
          district,
          color: pal.color,
          accentColor: pal.accent,
        });
      }
    }
  }

  return buildings;
}

export const CITY_BUILDINGS: BuildingCollider[] = buildCityBuildings();

export function resolveCircleAABB(
  x: number,
  z: number,
  radius: number,
  colliders: BuildingCollider[]
): Vec2 {
  let rx = Math.max(-CITY_HALF_SIZE + radius, Math.min(CITY_HALF_SIZE - radius, x));
  let rz = Math.max(-CITY_HALF_SIZE + radius, Math.min(CITY_HALF_SIZE - radius, z));

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const closestX = Math.max(b.minX, Math.min(rx, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(rz, b.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          rx += (dx / dist) * overlap;
          rz += (dz / dist) * overlap;
        } else {
          // Center is inside AABB: push out along shallowest axis
          const leftPen = rx - b.minX;
          const rightPen = b.maxX - rx;
          const topPen = rz - b.minZ;
          const bottomPen = b.maxZ - rz;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) rx = b.minX - radius;
          else if (minPen === rightPen) rx = b.maxX + radius;
          else if (minPen === topPen) rz = b.minZ - radius;
          else rz = b.maxZ + radius;
        }
      }
    }
  }

  return { x: rx, z: rz };
}

export function isPointInsideBuilding(x: number, z: number, colliders: BuildingCollider[]): boolean {
  for (let i = 0; i < colliders.length; i++) {
    const b = colliders[i];
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return true;
    }
  }
  return false;
}

// Road Graph: 9x9 grid intersections at STREET_CENTERS
interface GraphNode {
  ix: number;
  iz: number;
  x: number;
  z: number;
}

const ROAD_NODES: GraphNode[] = [];
for (let iz = 0; iz < STREET_CENTERS.length; iz++) {
  for (let ix = 0; ix < STREET_CENTERS.length; ix++) {
    ROAD_NODES.push({
      ix,
      iz,
      x: STREET_CENTERS[ix],
      z: STREET_CENTERS[iz],
    });
  }
}

function nodeIndex(ix: number, iz: number): number {
  return iz * STREET_CENTERS.length + ix;
}

function nearestRoadNodeIndex(pos: Vec2): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ROAD_NODES.length; i++) {
    const n = ROAD_NODES[i];
    const d = Math.hypot(n.x - pos.x, n.z - pos.z);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Computes a street-following GPS path from `start` to `goal` using A* over the city's road grid.
 */
export function findRoadPath(start: Vec2, goal: Vec2): Vec2[] {
  const distDirect = Math.hypot(goal.x - start.x, goal.z - start.z);
  if (distDirect < 14) {
    return [start, goal];
  }

  const startIdx = nearestRoadNodeIndex(start);
  const goalIdx = nearestRoadNodeIndex(goal);

  if (startIdx === goalIdx) {
    return [start, { x: ROAD_NODES[startIdx].x, z: ROAD_NODES[startIdx].z }, goal];
  }

  const total = ROAD_NODES.length;
  const gScore = new Float64Array(total).fill(Infinity);
  const fScore = new Float64Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const openSet = new Set<number>([startIdx]);

  gScore[startIdx] = 0;
  fScore[startIdx] =
    Math.abs(ROAD_NODES[goalIdx].x - ROAD_NODES[startIdx].x) +
    Math.abs(ROAD_NODES[goalIdx].z - ROAD_NODES[startIdx].z);

  while (openSet.size > 0) {
    let current = -1;
    let lowestF = Infinity;
    for (const id of openSet) {
      if (fScore[id] < lowestF) {
        lowestF = fScore[id];
        current = id;
      }
    }

    if (current === -1) break;
    if (current === goalIdx) {
      const path: Vec2[] = [];
      let curr = current;
      while (curr !== -1) {
        path.push({ x: ROAD_NODES[curr].x, z: ROAD_NODES[curr].z });
        curr = cameFrom[curr];
      }
      path.reverse();

      const fullPath: Vec2[] = [start, ...path, goal];
      if (fullPath.length >= 3) {
        const d02 = Math.hypot(fullPath[2].x - fullPath[0].x, fullPath[2].z - fullPath[0].z);
        const d12 = Math.hypot(fullPath[2].x - fullPath[1].x, fullPath[2].z - fullPath[1].z);
        if (d02 < d12) {
          fullPath.splice(1, 1);
        }
      }
      return fullPath;
    }

    openSet.delete(current);
    closed[current] = 1;

    const node = ROAD_NODES[current];
    const neighbors: number[] = [];
    if (node.ix > 0) neighbors.push(nodeIndex(node.ix - 1, node.iz));
    if (node.ix < STREET_CENTERS.length - 1) neighbors.push(nodeIndex(node.ix + 1, node.iz));
    if (node.iz > 0) neighbors.push(nodeIndex(node.ix, node.iz - 1));
    if (node.iz < STREET_CENTERS.length - 1) neighbors.push(nodeIndex(node.ix, node.iz + 1));

    for (const nb of neighbors) {
      if (closed[nb]) continue;
      const nbNode = ROAD_NODES[nb];
      const tentativeG = gScore[current] + Math.hypot(nbNode.x - node.x, nbNode.z - node.z);
      if (tentativeG < gScore[nb]) {
        cameFrom[nb] = current;
        gScore[nb] = tentativeG;
        fScore[nb] =
          tentativeG +
          Math.abs(ROAD_NODES[goalIdx].x - nbNode.x) +
          Math.abs(ROAD_NODES[goalIdx].z - nbNode.z);
        openSet.add(nb);
      }
    }
  }

  return [start, goal];
}

export function getRandomRoadPoint(seed: number): Vec2 {
  const s1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const s2 = Math.abs(Math.sin(seed * 78.233) * 19341.123) % 1;
  const ix = Math.floor(s1 * STREET_CENTERS.length);
  const iz = Math.floor(s2 * STREET_CENTERS.length);
  return { x: STREET_CENTERS[ix], z: STREET_CENTERS[iz] };
}

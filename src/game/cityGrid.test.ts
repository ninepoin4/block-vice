import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_BUILDINGS,
  CITY_HALF_SIZE,
  findRoadPath,
  getDistrictAt,
  isPointInsideBuilding,
  PLAYER_SPAWN,
  resolveCircleAABB,
} from './cityGrid';

test('player spawn is on an open street and not inside any building', () => {
  assert.equal(isPointInsideBuilding(PLAYER_SPAWN.x, PLAYER_SPAWN.z, CITY_BUILDINGS), false);
});

test('city is expanded to 3.2x area with all 4 outer-ring landmarks', () => {
  assert.equal(CITY_HALF_SIZE, 136);
  for (const lm of ['spire', 'casino', 'refinery', 'helipad'] as const) {
    assert.ok(
      CITY_BUILDINGS.some((b) => b.landmark === lm),
      `Expected outer landmark ${lm}`
    );
  }
});

test('A* road pathfinding navigates around blocks from center to bank plaza and outer Obsidian Spire', () => {
  const path = findRoadPath(PLAYER_SPAWN, { x: -45, z: -38 });
  assert.ok(path.length >= 3, 'Expected multi-node street path');
  assert.equal(path[0].x, PLAYER_SPAWN.x);
  assert.equal(path[path.length - 1].x, -45);
  assert.equal(path[path.length - 1].z, -38);

  for (let i = 1; i < path.length - 1; i++) {
    assert.equal(
      isPointInsideBuilding(path[i].x, path[i].z, CITY_BUILDINGS),
      false,
      `Road node ${i} collided with building`
    );
  }

  const outerPath = findRoadPath(PLAYER_SPAWN, { x: -105, z: -96 });
  assert.ok(outerPath.length >= 5, 'Expected cross-city multi-node path to Obsidian Spire');
  for (let i = 1; i < outerPath.length - 1; i++) {
    assert.equal(
      isPointInsideBuilding(outerPath[i].x, outerPath[i].z, CITY_BUILDINGS),
      false,
      `Outer road node ${i} collided with building`
    );
  }
});

test('circle-AABB collision pushes actor out of building footprints', () => {
  const bank = CITY_BUILDINGS.find((b) => b.landmark === 'bank');
  assert.ok(bank);
  const cx = (bank.minX + bank.maxX) / 2;
  const cz = bank.maxZ - 0.5;
  const resolved = resolveCircleAABB(cx, cz, 0.7, CITY_BUILDINGS);
  assert.equal(isPointInsideBuilding(resolved.x, resolved.z, CITY_BUILDINGS), false);
});

test('district lookup maps all four city quadrants accurately', () => {
  assert.equal(getDistrictAt(-40, -40).id, 'financial');
  assert.equal(getDistrictAt(40, -40).id, 'chinatown');
  assert.equal(getDistrictAt(-40, 40).id, 'industrial');
  assert.equal(getDistrictAt(40, 40).id, 'harbor');
});

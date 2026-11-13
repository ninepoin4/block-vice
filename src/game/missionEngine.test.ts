import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptMissionState,
  advanceMissionStep,
  calculateMissionReward,
  createInitialMissionRuntime,
  getMissionById,
  getRankTitle,
  MISSIONS,
} from './missionEngine';

test('accepting a mission initializes step index and metrics', () => {
  const init = createInitialMissionRuntime();
  const state = acceptMissionState(init, 'bank_heist');
  assert.equal(state.activeMissionId, 'bank_heist');
  assert.equal(state.currentStepIndex, 0);
  assert.equal(state.lootRequired, 2);
});

test('advancing through all mission steps completes mission and records completion', () => {
  let state = acceptMissionState(createInitialMissionRuntime(), 'neon_assassination');
  const mission = getMissionById('neon_assassination')!;
  let completed = false;

  for (let i = 0; i < mission.steps.length; i++) {
    const res = advanceMissionStep(state);
    state = res.next;
    completed = res.completed;
    if (i < mission.steps.length - 1) {
      assert.equal(completed, false);
      assert.equal(state.currentStepIndex, i + 1);
    }
  }

  assert.equal(completed, true);
  assert.equal(state.activeMissionId, null);
  assert.ok(state.completedMissionIds.includes('neon_assassination'));
});

test('reward settlement calculates bonuses, deductions, and S-rank properly', () => {
  const mission = MISSIONS[0];
  const fastClean = calculateMissionReward(mission, {
    elapsedSec: 50,
    damageTaken: 10,
    maxWantedReached: 2,
    enemiesNeutralized: 4,
    accuracyBonus: true,
  });

  assert.ok(fastClean.timeBonus > 0);
  assert.equal(fastClean.stealthBonus, 1500);
  assert.equal(fastClean.combatBonus, 1200);
  assert.equal(fastClean.medicalDeduction, 180);
  assert.equal(fastClean.rankGrade, 'S');
  assert.ok(fastClean.totalPayout > mission.baseReward);

  const roughRun = calculateMissionReward(mission, {
    elapsedSec: 150,
    damageTaken: 140,
    maxWantedReached: 5,
    enemiesNeutralized: 0,
    accuracyBonus: false,
  });
  assert.equal(roughRun.timeBonus, 0);
  assert.equal(roughRun.stealthBonus, 0);
  assert.ok(roughRun.totalPayout < mission.baseReward);
  assert.equal(roughRun.rankGrade, 'C');
});

test('street rank progression advances with reputation', () => {
  assert.match(getRankTitle(0), /Rookie/);
  assert.match(getRankTitle(400), /Professional/);
  assert.match(getRankTitle(1300), /Crime Boss/);
  assert.match(getRankTitle(1900), /Vice Legend/);
});

test('expanded contract catalog includes OP-04 convoy_ambush and OP-05 obsidian_takedown', () => {
  assert.equal(MISSIONS.length, 5);
  for (const id of ['convoy_ambush', 'obsidian_takedown']) {
    const m = getMissionById(id);
    assert.ok(m, `Expected mission ${id}`);
    let state = acceptMissionState(createInitialMissionRuntime(), id);
    let completed = false;
    for (let i = 0; i < m.steps.length; i++) {
      const res = advanceMissionStep(state);
      state = res.next;
      completed = res.completed;
    }
    assert.equal(completed, true);
    assert.ok(state.completedMissionIds.includes(id));
  }
});

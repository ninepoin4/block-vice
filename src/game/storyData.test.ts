import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCutsceneAtTime,
  getMissionCompleteCutscene,
  getMissionStartCutscene,
  getStoryLedgerStatus,
  getTotalCutsceneDuration,
  IN_ENGINE_CUTSCENE_SHOTS,
  MID_GAME_CUTSCENES,
  PROLOGUE_SCENES,
} from './storyData';

test('prologue scenes and cutscene shots cover all 6 chapters & 5 mission origins', () => {
  assert.equal(PROLOGUE_SCENES.length, 6);
  assert.equal(IN_ENGINE_CUTSCENE_SHOTS.length, 6);
  assert.ok(getTotalCutsceneDuration() > 18);
});

test('mid-game cutscenes cover mission_start, mid_mission forced, and mission_complete flows', () => {
  const startOp4 = getMissionStartCutscene('convoy_ambush');
  const startOp5 = getMissionStartCutscene('obsidian_takedown');
  assert.ok(startOp4 && startOp4.category === 'mission_start' && startOp4.shots.length === 2);
  assert.ok(startOp5 && startOp5.category === 'mission_start' && startOp5.shots.length === 2);

  assert.equal(MID_GAME_CUTSCENES.mid_bank_breach.category, 'mid_mission');
  assert.equal(MID_GAME_CUTSCENES.mid_convoy_intercept.category, 'mid_mission');
  assert.equal(MID_GAME_CUTSCENES.mid_bishop_confrontation.category, 'mid_mission');

  const compOp5 = getMissionCompleteCutscene('obsidian_takedown');
  assert.equal(compOp5.category, 'mission_complete');
  assert.equal(compOp5.shots.length, 2);

  const evalMid = evaluateCutsceneAtTime(1.0, MID_GAME_CUTSCENES.mid_bishop_confrontation.shots);
  assert.equal(evalMid.finished, false);
  assert.equal(evalMid.totalShots, 2);
  const evalEnd = evaluateCutsceneAtTime(99, compOp5.shots);
  assert.equal(evalEnd.finished, true);
});

test('evaluateCutsceneAtTime interpolates smoothly across shots and finishes cleanly', () => {
  const start = evaluateCutsceneAtTime(0);
  assert.equal(start.finished, false);
  assert.equal(start.shotIndex, 0);
  assert.deepEqual(start.camPos, IN_ENGINE_CUTSCENE_SHOTS[0].camStart);

  const mid = evaluateCutsceneAtTime(IN_ENGINE_CUTSCENE_SHOTS[0].durationSec + 0.5);
  assert.equal(mid.finished, false);
  assert.equal(mid.shotIndex, 1);

  const end = evaluateCutsceneAtTime(999);
  assert.equal(end.finished, true);
  assert.equal(end.progressPct, 100);
});

test('getStoryLedgerStatus tracks clue recovery and unlocks finale at 5 missions', () => {
  const partial = getStoryLedgerStatus(['bank_heist', 'convoy_ambush']);
  assert.equal(partial.cluesRecovered, 2);
  assert.equal(partial.totalClues, 5);
  assert.equal(partial.isFinaleUnlocked, false);

  const complete = getStoryLedgerStatus([
    'bank_heist',
    'neon_assassination',
    'hot_cargo',
    'convoy_ambush',
    'obsidian_takedown',
  ]);
  assert.equal(complete.cluesRecovered, 5);
  assert.equal(complete.isFinaleUnlocked, true);
});

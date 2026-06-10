import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, spawnBalloon, update, checkPops } from '../js/balloons.js';

test('spawnBalloon: al 5-lea balon e cu animal, primele 4 nu', () => {
  const state = createGame();
  const balloons = Array.from({ length: 5 }, () => spawnBalloon(state, () => 0.5));
  assert.equal(balloons[0].animal, null);
  assert.equal(balloons[3].animal, null);
  assert.notEqual(balloons[4].animal, null);
});

test('update mută baloanele în sus și le scoate pe cele ieșite pe sus', () => {
  const state = createGame();
  const b = spawnBalloon(state, () => 0.5);
  const y0 = b.y;
  update(state, 1);
  assert.ok(b.y < y0);
  b.y = -0.5;
  update(state, 0.016);
  assert.equal(state.balloons.length, 0);
});

test('checkPops pocnește balonul cu mișcare peste prag', () => {
  const state = createGame();
  const b = spawnBalloon(state, () => 0.5);
  b.y = 0.5;
  const popped = checkPops(state, () => 0.5, 1000, { sens: 0.15 });
  assert.equal(popped.id, b.id);
  assert.equal(state.balloons.length, 0);
  assert.equal(state.popped, 1);
});

test('sub prag nu pocnește nimic', () => {
  const state = createGame();
  spawnBalloon(state, () => 0.5).y = 0.5;
  assert.equal(checkPops(state, () => 0.05, 1000, { sens: 0.15 }), null);
  assert.equal(state.balloons.length, 1);
});

test('checkPops respectă cooldown-ul global de 300ms', () => {
  const state = createGame();
  spawnBalloon(state, () => 0.2).y = 0.5;
  spawnBalloon(state, () => 0.8).y = 0.5;
  assert.ok(checkPops(state, () => 1, 1000));
  assert.equal(checkPops(state, () => 1, 1100), null);
  assert.ok(checkPops(state, () => 1, 1400));
});

test('balonul încă sub marginea de jos nu poate fi pocnit', () => {
  const state = createGame();
  spawnBalloon(state, () => 0.5); // y inițial 1.15, sub ecran
  assert.equal(checkPops(state, () => 1, 1000), null);
});

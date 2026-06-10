import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceQueue } from '../js/audio.js';

const tick = () => new Promise((r) => setImmediate(r));

test('redă clipurile pe rând, fără suprapunere', async () => {
  const log = [];
  let release;
  const q = createVoiceQueue((name) => new Promise((res) => {
    log.push(`start:${name}`);
    release = () => { log.push(`end:${name}`); res(); };
  }));
  q.say('rosu');
  q.say('albastru');
  await tick();
  assert.deepEqual(log, ['start:rosu']);
  release(); await tick();
  assert.deepEqual(log, ['start:rosu', 'end:rosu', 'start:albastru']);
  release(); await tick();
});

test('la pocnit rapid nu acumulează restanțe (max 2 în zbor)', async () => {
  const started = [];
  let release;
  const q = createVoiceQueue((name) => new Promise((res) => { started.push(name); release = res; }));
  q.say('a'); q.say('b'); q.say('c'); q.say('d');
  await tick();
  release(); await tick();
  release(); await tick();
  assert.deepEqual(started, ['a', 'b']);
});

test('clip lipsă nu blochează coada', async () => {
  const played = [];
  const q = createVoiceQueue(async (name) => {
    if (name === 'lipsa') throw new Error('404');
    played.push(name);
  });
  q.say('lipsa');
  q.say('verde');
  await tick(); await tick();
  assert.deepEqual(played, ['verde']);
});

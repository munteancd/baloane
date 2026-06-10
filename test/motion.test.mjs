import test from 'node:test';
import assert from 'node:assert/strict';
import { diffFrames, motionInRect } from '../js/motion.js';

// Buffer RGBA uniform (ca ImageData.data) de w*h pixeli cu luminozitatea `fill`.
function frame(w, h, fill) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = fill; buf[i * 4 + 1] = fill; buf[i * 4 + 2] = fill; buf[i * 4 + 3] = 255;
  }
  return buf;
}

test('frames identice => zero mișcare', () => {
  const motion = diffFrames(frame(4, 4, 100), frame(4, 4, 100));
  assert.equal(motion.reduce((s, v) => s + v, 0), 0);
});

test('schimbare mare de luminozitate => mișcare pe toți pixelii', () => {
  const motion = diffFrames(frame(4, 4, 0), frame(4, 4, 200));
  assert.equal(motion.reduce((s, v) => s + v, 0), 16);
});

test('motionInRect numără doar pixelii din dreptunghi', () => {
  const w = 10, h = 10;
  const motion = new Uint8Array(w * h);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) motion[y * w + x] = 1;
  assert.equal(motionInRect(motion, w, h, { x: 0, y: 0, w: 0.5, h: 0.5 }), 1);
  assert.equal(motionInRect(motion, w, h, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }), 0);
});

test('dreptunghi complet în afara ecranului => 0, fără crash', () => {
  const motion = new Uint8Array(100).fill(1);
  assert.equal(motionInRect(motion, 10, 10, { x: 1.2, y: 1.2, w: 0.2, h: 0.2 }), 0);
});

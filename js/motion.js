// Detecție de mișcare prin frame-diff pe buffere RGBA (ImageData.data).

// Compară luminanța pixel cu pixel; returnează Uint8Array cu 1 = pixel în mișcare.
export function diffFrames(prev, curr, threshold = 30) {
  const n = curr.length / 4;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const lumPrev = 0.299 * prev[p] + 0.587 * prev[p + 1] + 0.114 * prev[p + 2];
    const lumCurr = 0.299 * curr[p] + 0.587 * curr[p + 1] + 0.114 * curr[p + 2];
    if (Math.abs(lumCurr - lumPrev) > threshold) out[i] = 1;
  }
  return out;
}

// Fracția (0..1) de pixeli în mișcare dintr-un dreptunghi normalizat {x,y,w,h}.
export function motionInRect(motion, width, height, rect) {
  const x0 = Math.max(0, Math.floor(rect.x * width));
  const y0 = Math.max(0, Math.floor(rect.y * height));
  const x1 = Math.min(width, Math.ceil((rect.x + rect.w) * width));
  const y1 = Math.min(height, Math.ceil((rect.y + rect.h) * height));
  let moving = 0, total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      total++;
      if (motion[y * width + x]) moving++;
    }
  }
  return total ? moving / total : 0;
}

// Starea jocului și logica baloanelor. Coordonate normalizate 0..1 (y=1 jos).

export const COLORS = [
  { id: 'rosu', hex: '#e63946' },
  { id: 'albastru', hex: '#1d6fd1' },
  { id: 'galben', hex: '#ffc300' },
  { id: 'verde', hex: '#2a9d4a' },
  { id: 'mov', hex: '#9b5de5' },
  { id: 'portocaliu', hex: '#f77f00' },
];

export const ANIMALS = [
  { id: 'vaca', emoji: '🐮' },
  { id: 'caine', emoji: '🐶' },
  { id: 'pisica', emoji: '🐱' },
  { id: 'oaie', emoji: '🐑' },
  { id: 'rata', emoji: '🦆' },
  { id: 'cal', emoji: '🐴' },
  { id: 'gaina', emoji: '🐔' },
  { id: 'porc', emoji: '🐷' },
];

let nextId = 1;

export function createGame() {
  return { balloons: [], spawned: 0, popped: 0, lastPopAt: -Infinity };
}

export function spawnBalloon(state, rng = Math.random) {
  state.spawned++;
  const isAnimal = state.spawned % 5 === 0;
  const balloon = {
    id: nextId++,
    x: 0.1 + rng() * 0.8,
    y: 1.15,                     // pornește puțin sub marginea de jos
    r: 0.075,                    // diametru ~15% din înălțimea ecranului
    speed: 0.06 + rng() * 0.04,  // fracție de ecran pe secundă
    color: COLORS[Math.floor(rng() * COLORS.length)],
    animal: isAnimal ? ANIMALS[Math.floor(rng() * ANIMALS.length)] : null,
  };
  state.balloons.push(balloon);
  return balloon;
}

// dt în secunde.
export function update(state, dt) {
  for (const b of state.balloons) b.y -= b.speed * dt;
  state.balloons = state.balloons.filter((b) => b.y + b.r > -0.05);
}

// motionRatioFn(rect) -> fracție 0..1 de mișcare în dreptunghi.
// Pocnește cel mult un balon per apel, cu cooldown global anti-fluturare.
export function checkPops(state, motionRatioFn, now, { sens = 0.15, cooldownMs = 300 } = {}) {
  if (now - state.lastPopAt < cooldownMs) return null;
  for (const b of state.balloons) {
    if (b.y - b.r > 1) continue; // încă sub marginea de jos
    const rect = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
    if (motionRatioFn(rect) >= sens) {
      state.balloons = state.balloons.filter((o) => o.id !== b.id);
      state.popped++;
      state.lastPopAt = now;
      return b;
    }
  }
  return null;
}

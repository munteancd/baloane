import { diffFrames, motionInRect } from './motion.js';
import { createGame, spawnBalloon, update, checkPops, COLORS, ANIMALS } from './balloons.js';
import { createVoiceQueue, playPop } from './audio.js';

const DETECT_W = 160, DETECT_H = 120;
const MAX_BALLOONS = 4;
const SPAWN_MS = 900;
const ENCOURAGE_EVERY = 8;
const ENCOURAGEMENTS = ['bravo-carol', 'super', 'foarte-bine'];
// ?sens=1..10 (1 = foarte sensibil, 10 = aproape insensibil); implicit 3.
const SENS = (parseInt(new URLSearchParams(location.search).get('sens'), 10) || 3) * 0.05;

const canvas = document.getElementById('scene');
const ctx2d = canvas.getContext('2d');
const startOverlay = document.getElementById('start');
const errorOverlay = document.getElementById('camera-error');

const video = document.createElement('video');
video.playsInline = true;
video.muted = true;

const detect = document.createElement('canvas');
detect.width = DETECT_W;
detect.height = DETECT_H;
const dctx = detect.getContext('2d', { willReadFrequently: true });

const clips = new Map();
const voice = createVoiceQueue((name) => new Promise((resolve, reject) => {
  const a = clips.get(name);
  if (!a) return reject(new Error(`clip lipsă: ${name}`));
  a.currentTime = 0;
  a.onended = resolve;
  a.onerror = () => reject(new Error(`clip eșuat: ${name}`));
  a.play().catch(reject);
}));

let audioCtx = null;
let state = createGame();
let prevFrame = null;
let lastTime = 0;
let lastSpawn = 0;
let particles = [];

function preloadClips() {
  const names = [
    ...COLORS.map((c) => c.id),
    ...ANIMALS.map((a) => a.id),
    ...ENCOURAGEMENTS,
  ];
  for (const name of names) {
    const a = new Audio(`audio/${name}.wav`);
    a.preload = 'auto';
    clips.set(name, a);
  }
}

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

// Desenează video-ul oglindit, umplând complet suprafața (stil "cover").
// Aceeași funcție pentru ecran și pentru canvas-ul de detecție, ca să
// coincidă coordonatele de mișcare cu cele de desen.
function drawVideoMirrored(c, w, h) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale, dh = vh * scale;
  c.save();
  c.translate(w, 0);
  c.scale(-1, 1);
  c.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
  c.restore();
}

function detectMotion() {
  drawVideoMirrored(dctx, DETECT_W, DETECT_H);
  const frame = dctx.getImageData(0, 0, DETECT_W, DETECT_H).data;
  let motion = null;
  if (prevFrame) motion = diffFrames(prevFrame, frame);
  prevFrame = frame;
  return motion;
}

function onPop(b) {
  if (audioCtx) playPop(audioCtx);
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const speed = 0.25 + Math.random() * 0.35;
    particles.push({
      x: b.x, y: b.y,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      life: 0.7, color: b.color.hex,
    });
  }
  voice.say(b.animal ? b.animal.id : b.color.id);
  if (state.popped % ENCOURAGE_EVERY === 0) {
    voice.say(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
  }
}

function drawBalloon(b, w, h) {
  const x = b.x * w, y = b.y * h, r = b.r * h;
  ctx2d.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx2d.beginPath();
  ctx2d.moveTo(x, y + r);
  ctx2d.quadraticCurveTo(x + r * 0.3, y + r * 1.6, x, y + r * 2.2);
  ctx2d.stroke();
  ctx2d.fillStyle = b.color.hex;
  ctx2d.beginPath();
  ctx2d.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.fillStyle = 'rgba(255,255,255,0.35)';
  ctx2d.beginPath();
  ctx2d.ellipse(x - r * 0.3, y - r * 0.35, r * 0.2, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx2d.fill();
  if (b.animal) {
    ctx2d.font = `${r}px serif`;
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(b.animal.emoji, x, y);
  }
}

function drawParticles(dt, w, h) {
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx2d.globalAlpha = Math.max(p.life / 0.7, 0);
    ctx2d.fillStyle = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.globalAlpha = 1;
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  const w = canvas.width, h = canvas.height;

  if (state.balloons.length < MAX_BALLOONS && now - lastSpawn > SPAWN_MS) {
    spawnBalloon(state);
    lastSpawn = now;
  }
  update(state, dt);

  const motion = detectMotion();
  if (motion) {
    const popped = checkPops(
      state,
      (rect) => motionInRect(motion, DETECT_W, DETECT_H, rect),
      now,
      { sens: SENS },
    );
    if (popped) onPop(popped);
  }

  drawVideoMirrored(ctx2d, w, h);
  for (const b of state.balloons) drawBalloon(b, w, h);
  drawParticles(dt, w, h);

  requestAnimationFrame(frame);
}

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  } catch {
    startOverlay.classList.add('hidden');
    errorOverlay.classList.remove('hidden');
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  preloadClips();
  startOverlay.classList.add('hidden');
  resize();
  requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(frame); });
}

addEventListener('resize', resize);
document.getElementById('start-btn').addEventListener('click', start);

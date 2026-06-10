// Coadă de redare vocală: clipurile nu se suprapun, clipurile lipsă sunt
// sărite tăcut (jocul merge și fără voce), iar la pocnit rapid nu se
// acumulează restanțe (max `maxPending` clipuri în zbor: 1 redat + 1 în coadă).
export function createVoiceQueue(playFn, maxPending = 2) {
  const queue = [];
  let busy = false;
  async function drain() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const name = queue.shift();
      try {
        await playFn(name);
      } catch {
        // clip lipsă sau eșuat: continuăm fără voce
      }
    }
    busy = false;
  }
  return {
    say(name) {
      if (queue.length + (busy ? 1 : 0) >= maxPending) return;
      queue.push(name);
      drain();
    },
  };
}

// „Poc" sintetic: pitch în cădere rapidă, fără fișier audio.
export function playPop(ctx) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

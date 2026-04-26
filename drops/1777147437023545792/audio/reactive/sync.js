const SR = 48000, H = (2 * Math.PI) / SR, last = performance.now();
let phase = 0, env = 0;
function tick() {
  const dt = performance.now() - last;
  const clip = Math.min(env, 1) * Math.max(0, -env + 1);
  phase += H * (220 + clip * 4400);
  const sample = Math.sin(phase) * clip;
  const sweep = Math.exp(-clip * 8) * Math.tanh(sample * 4);
  window.__audioState = { sample, phase, sweep };
  env = env * 0.97 + (dt / 1000 < 0.006 ? 0 : clip * 0.1);
  requestAnimationFrame(tick); }
tick();

function syncMath(st, dt) {
  const TAU = 6.283185307179586;
  const env = Math.max(-1, Math.min(1, Math.abs(st.stress) * 0.9));
  const hardClipped = Math.max(-1, Math.min(1, Math.abs(env) * 0.9));
  const f = 220 + Math.abs(hardClipped) * 4400;
  st.phase += TAU * f * dt;
  st.cutoff = Math.max(-1, Math.min(1, Math.exp(-Math.abs(hardClipped) * 8) * Math.sin(st.phase)));
  st.stress *= 0.95;
  st.sample = Math.sin(st.phase) * hardClipped * st.cutoff;
  st.env = hardClipped;
  return st;
}
let ticks = 0, prevT = 0;
class SyncWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._st = { phase: 0, env: 0, stress: 0, cutoff: 0, sample: 0 };
    this._t0 = 0;
   }
  process(inputs, outputs) {
    const SR = sampleRate, dt = 1 / SR;
    const out = outputs[0][0];
    this._st.stress = Math.max(this._st.stress, Math.random() * 0.3);
    for (let i = 0; i < out.length; i++) {
      this._st = syncMath(this._st, dt);
      out[i] = this._st.sample;
     }
    ticks++;
    const now = performance.now();
    if (ticks % 128 === 0) {
      this.port.postMessage({
        sample: Math.sin(this._st.phase),
        phase: this._st.phase,
        env: this._st.env,
        cutoff: this._st.cutoff,
        stress: this._st.stress,
        dt: prevT ? now - prevT : 0,
        rt: this._t0 ? now - this._t0 : 0
       });
      this._t0 = now;
      prevT = now;
     }
    return true;
   }
}
registerProcessor('sync-worklet', SyncWorklet);

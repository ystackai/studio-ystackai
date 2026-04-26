class SyncWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._phase = 0; this._env = 0; this._stress = 0; this._cutoff = 0; this._t0 = 0;
  }
  process(inputs, outputs) {
    const out = outputs[0][0];
    const TAU = 6.283185307179586, SR = sampleRate;
    for (let i = 0; i < out.length; i++) {
      this._stress = Math.max(this._stress, Math.random() * 0.3);
      const env = Math.abs(this._stress) * 0.9;
      const envClipped = Math.max(-1, Math.min(1, env));
      const f = 220 + Math.abs(envClipped) * 4400;
      this._phase += TAU * f / SR;
      this._cutoff = Math.max(-1, Math.min(1, Math.exp(-Math.abs(envClipped) * 8) * Math.tanh(Math.sin(this._phase + i * TAU / SR) * 4)));
      out[i] = Math.sin(this._phase) * envClipped * this._cutoff;
      this._stress *= 0.95;
    }
    this._env = Math.max(-1, Math.min(1, Math.abs(this._stress) * 0.9));
    this.port.postMessage({ sample: Math.sin(this._phase), phase: this._phase, env: this._env, cutoff: this._cutoff, stress: this._stress, rt: this._t0 ? performance.now() - this._t0 : 0 });
    this._t0 = performance.now();
    return true;
  }
}
registerProcessor('sync-worklet', SyncWorklet);

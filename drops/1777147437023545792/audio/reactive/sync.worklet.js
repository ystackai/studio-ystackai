class SyncWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.env = 0;
    this.stress = 0;
    this._t0 = 0;
    this.cutoff = 0;
  }
  process(inputs, outputs) {
    const input = inputs[0], output = outputs[0];
    const TAU = 6.283185307179586, SR = sampleRate;
    for (let ch = 0; ch < output.length; ch++) {
      const out = output[ch], inp = input[ch];
      for (let i = 0; i < out.length; i++) {
        const dt = i / SR;
        this.stress = Math.max(this.stress, Math.random() * 0.3);
        const env = Math.abs(this.stress) * 0.9;
        const envClipped = Math.max(-1, Math.min(1, env));
        const f = 220 + Math.abs(envClipped) * 4400;
        this.phase += TAU * f / SR;
        this.cutoff = Math.max(-1, Math.min(1, Math.exp(-Math.abs(envClipped) * 8) * Math.tanh(Math.sin(this.phase + i * TAU / SR) * 4)));
        out[i] = Math.sin(this.phase) * envClipped * this.cutoff;
        this.stress *= 0.95;
      }
    }
    this.port.postMessage({
      sample: Math.sin(this.phase),
      phase: this.phase,
      env: this.env,
      cutoff: this.cutoff,
      stress: this.stress,
      dt: this._t0 ? (performance.now() - this._t0) : 0,
      rt: performance.now() - this._t0
    });
    this._t0 = performance.now();
    return true;
  }
}
registerProcessor('sync-worklet', SyncWorklet);

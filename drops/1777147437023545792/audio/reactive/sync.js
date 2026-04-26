export function syncMath(st, dt) {
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

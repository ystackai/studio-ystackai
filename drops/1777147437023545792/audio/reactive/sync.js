const SR=48000,TAU=2*Math.PI,hc=v=>Math.max(-1,Math.min(1,v));
let phase=0,env=0,stress=0,_t0=0,cutoff=0;
function tick(now){
  const buf=new Float32Array(SR>>7),dt=Math.max(now-(_t0||now),0.5);
  env=hc(env-stress*0.02);stress*=0.97;
  for(let i=0;i<buf.length;i++){const si=i*TAU/SR;
    const f=220+Math.abs(env)*4400;phase+=TAU*f/SR;
    cutoff=hc(Math.exp(-Math.abs(env)*8)*Math.tanh(Math.sin(phase+si)*4));
    buf[i]=Math.sin(phase)*env*cutoff;
  }
  window.__audioState={sample:Math.sin(phase),phase,env,cutoff,stress,dt,rt:performance.now()-now};
}tick(performance.now());setInterval(tick,5);

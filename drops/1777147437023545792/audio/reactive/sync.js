const SR=48000,TWO_PI=2*Math.PI,hclip=v=>Math.max(-1,Math.min(1,v));
let phase=0,env=1,_t0=0,sweep=0,stress=0;
function tick(t){
  if(!_t0){_t0=t;return;}
  const dt=Math.max(t-_t0,0.5),samples=Math.round(dt*SR/1000)||1;
  env=hclip(env*0.94-stress*0.12);stress*=0.9;
  for(let i=0;i<samples;i++){
    phase+=TWO_PI/SR*(220+Math.abs(env)*4400);
    sweep=hclip(Math.exp(-Math.abs(env)*8)*Math.tanh(Math.sin(phase)*4));
  }
  window.__audioState={sample:Math.sin(phase),phase,env:hclip(env),sweep,dt,rt:performance.now()-_t0};_t0=t;
}
tick(performance.now());setInterval(tick,5);

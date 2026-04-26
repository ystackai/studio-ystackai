const SR=48000,TWO_PI=2*Math.PI,clip=(v)=>Math.max(-1,Math.min(1,v));
let phase=0,env=1,_last=0,sweep=0;
function osc(t){
  if(!_last){_last=t;requestAnimationFrame(osc);return;}
  const dt=t-_last,_sample=Math.round(dt*SR/1000)||1;
  for(let i=0;i<_sample;i++){
    env=clip(env*0.96+(dt<6?0:env*0.08));
    phase+=TWO_PI/SR*(220+Math.abs(env)*4400);
    sweep=clip(Math.exp(-Math.abs(env)*8)*Math.tanh(Math.sin(phase)*4));
  }
  window.__audioState={sample:Math.sin(phase),phase,env:clip(env),sweep,dt};requestAnimationFrame(osc);}
osc(performance.now());

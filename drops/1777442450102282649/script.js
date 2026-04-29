// ── Config ──────────────────────────────────────────
var CONFIG = {
    cols: 12,
    baseFreq: 110,
    attackTime: 0.003,
    decayTime: 0.12,
    sustainLevel: 0.01,
    releaseTime: 0.25,
    waveFreq: 2.5,
    amp: 40,
    maxPhase: 1,
    shiftInterval: 2000,
    phasesPerCycle: 4,
    subGain: 0.45,
    noiseDuration: 0.08,
    distortionAmount: 3,
    idleBreath: 0.02,
    idleHumFreq: 55,
};

// ── State ───────────────────────────────────────────
var state = {
    phase: 0,
    running: false,
    muted: true,
    cycles: 0,
    targetAmplitude: CONFIG.amp,
    targetFreq: CONFIG.baseFreq,
    currentAmplitude: 0,
    currentFreq: CONFIG.baseFreq,
    idleTime: 0,
    lastBreath: 0,
};

// ── Audio ───────────────────────────────────────────
var ctx        = null;
var osc        = null;
var gain       = null;
var oscFreq    = null;
var oscGain    = null;
var subOsc     = null;
var subGain    = null;
var distortion  = null;
var idleOsc    = null;
var idleGain   = null;
var masterGain = null;
var phaseTime  = 0;
var kickPhase  = 0;

function makeDistortionCurve(amount) {
    var n = 44100;
    var curve = new Float32Array(n);
    var deg = Math.PI / 180;
    for (var i = 0; i < n; i++) {
        var x = (i * 2) / n - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain for mute control
    masterGain = ctx.createGain();
    masterGain.gain.value = state.muted ? 0 : 1;
    masterGain.connect(ctx.destination);

    // Distortion node — phase callback routed here
    distortion = ctx.createWaveShaper();
    distortion.curve = makeDistortionCurve(CONFIG.distortionAmount);
    distortion.oversample = '4x';

    // Idle hum — low sawtooth oscillator, always running
    idleOsc  = ctx.createOscillator();
    idleGain  = ctx.createGain();
    idleOsc.type = 'sawtooth';
    idleOsc.frequency.value = CONFIG.idleHumFreq;
    idleGain.gain.value = 0.04;
    idleOsc.connect(idleGain);
    idleGain.connect(masterGain);
    idleOsc.start();

    // Main kick oscillator chain
    osc      = ctx.createOscillator();
    gain     = ctx.createGain();
    oscFreq  = ctx.createOscillator();
    oscGain  = ctx.createGain();

    // Modulation: oscFreq drives osc pitch
    oscFreq.type = 'sine';
    oscFreq.frequency.value = CONFIG.waveFreq;
    oscGain.gain.value = 15;
    oscFreq.connect(oscGain);
    oscGain.connect(osc.frequency);

    // Sub-oscillator for low-end punch
    subOsc   = ctx.createOscillator();
    subGain  = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.value = 55;
    subOsc.connect(subGain);
    subGain.gain.value = 0;
    subGain.connect(distortion);

    // Main voice through distortion
    osc.type = 'triangle';
    osc.frequency.value = CONFIG.baseFreq;
    osc.connect(gain);
    gain.connect(distortion);
    distortion.connect(masterGain);

    gain.gain.value = 0;
    osc.start();
    oscFreq.start();
    subOsc.start();
}

// ── Kick envelope (phase callback) ────────────────
function playKick() {
    if (!ctx || state.muted) return;
    var now = ctx.currentTime;
    var at  = CONFIG.attackTime;
    var dt  = CONFIG.decayTime;

    // Main voice kick envelope
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + at);
    gain.gain.exponentialRampToValueAtTime(
        CONFIG.sustainLevel,
        now + at + dt
    );
    gain.gain.exponentialRampToValueAtTime(0.01, now + at + dt + CONFIG.releaseTime);

    // Sub-oscillator kick envelope — deeper attack
    subGain.gain.cancelScheduledValues(now);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(CONFIG.subGain, now + at * 1.5);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + at * 1.5 + dt + 0.05);

    // Phase callback: kickPhase drives waveform distortion strength
    kickPhase = 1;
    setTimeout(function() {
        kickPhase = 0;
    }, (at + dt + CONFIG.releaseTime) * 1000);

    // Transient noise click for attack definition
    playNoise(at * 6);

    // Button click sound
    playClick();
}

// ── Sonic feedback tokens ─────────────────────────
function playClick() {
    if (!ctx || state.muted) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1200;
    o.connect(g);
    g.connect(masterGain || ctx.destination);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.04);
}

function playTone(freq, duration, vol) {
    if (!ctx || state.muted) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(masterGain || ctx.destination);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + duration);
}

function playNoise(duration) {
    if (!ctx || state.muted) return;
    var bufferSize = ctx.sampleRate * (duration || CONFIG.noiseDuration);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || CONFIG.noiseDuration));
    src.connect(g);
    g.connect(masterGain || ctx.destination);
    src.start(ctx.currentTime);
}

function playCycleComplete() {
    // Satisfied chord on cycle completion (4th shift)
    var freqs = [261.63, 329.63, 392, 523.25]; // C major
    for (var i = 0; i < freqs.length; i++) {
        setTimeout(function(f) {
            playTone(f, 0.8, 0.12);
        }, i * 60, freqs[i]);
    }
}

function playReset() {
    // Descending tone on full reset (8th shift)
    setTimeout(function() { playTone(523.25, 0.15, 0.1); }, 0);
    setTimeout(function() { playTone(440, 0.15, 0.1); }, 80);
    setTimeout(function() { playTone(349.23, 0.15, 0.1); }, 160);
    setTimeout(function() { playTone(261.63, 0.4, 0.12); }, 240);
}

// ── Visual system ─────────────────────────────────
var canvas  = null;
var c       = null;
var W       = 0;
var H       = 0;
var boundary = 0;

function initCanvas() {
    canvas = document.getElementById('waveform');
    c      = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
}

function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = canvas.parentElement.clientWidth;
    H = canvas.parentElement.clientHeight;
    canvas.width   = W * dpr;
    canvas.height = H * dpr;
    c.scale(dpr, dpr);
    // 12-col boundary clamp for canvas width
    boundary = Math.min(W, 1200) / CONFIG.cols;
}

// ── Render loop ───────────────────────────────────
function clampPhase(p) {
    return Math.max(0, Math.min(p, CONFIG.maxPhase));
}

function drawWave(t) {
    state.phase = clampPhase(state.phase);

    // Smooth interpolation
    state.currentAmplitude += (state.targetAmplitude - state.currentAmplitude) * 0.12;
    state.currentFreq      += (state.targetFreq - state.currentFreq) * 0.1;

    // Idle breathing
    state.idleTime = (t - state.lastBreath) * 0.001;
    var breath = Math.sin(state.idleTime * 1.5) * CONFIG.idleBreath;

    // Clear
    c.fillStyle = '#12121a';
    c.fillRect(0, 0, W, H);

    // Draw 12-col grid lines
    c.strokeStyle = 'rgba(255,255,255,0.03)';
    c.lineWidth = 1;
    for (var i = 1; i < CONFIG.cols; i++) {
        var x = (i / CONFIG.cols) * W;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, H);
        c.stroke();
    }

    // Draw waveform — phase-modulated sine with kick-phase distortion
    var amp       = state.currentAmplitude * (1 + state.phase * 2 + breath * 5);
    var freq      = state.currentFreq;
    var centerY   = H / 2;
    var kickDistort = kickPhase * 20;

    c.beginPath();
    c.lineWidth = 2.5 + state.phase * 1.5;
    var hueShift = 245 + state.phase * 40 + kickPhase * 15;
    c.strokeStyle = 'hsl(' + hueShift + ', 70%, ' + (55 + state.phase * 15) + '%)';
    c.shadowColor    = 'hsl(' + hueShift + ', 70%, ' + (55 + state.phase * 15) + '%)';
    c.shadowBlur     = 8 + state.phase * 16 + kickPhase * 24;

    for (var x = 0; x <= W; x++) {
        var tNorm = x / W;
        var y = centerY
              + Math.sin(tNorm * Math.PI * 4 + t * freq * 0.01 + breath * 3) * amp
              + Math.sin(tNorm * Math.PI * 2 + state.phase * 6.28) * amp * 0.3
              + Math.sin(tNorm * Math.PI * 8 + t * 0.05) * kickDistort
              + (Math.random() - 0.5) * kickPhase * 4;

        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
    }
    c.stroke();
    c.shadowBlur = 0;

    // Phase indicator glow bar
    var barW = state.phase * W;
    var grad = c.createLinearGradient(0, 0, barW, 0);
    grad.addColorStop(0, 'rgba(99,102,241,0.15)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, barW, H);

    // Scanlines
    c.fillStyle = 'rgba(0,0,0,0.03)';
    for (var sy = 0; sy < H; sy += 3) {
        c.fillRect(0, sy, W, 1);
    }

    // Update phase display
    var pv = document.getElementById('phase-value');
    if (pv) {
        pv.textContent = state.phase.toFixed(2);
        if (state.phase > 0.6) pv.classList.add('shift');
        else pv.classList.remove('shift');
    }

    // Update cycle display
    updateCycleDisplay();

    // Smooth phase decay
    if (state.phase > 0) {
        state.phase = Math.max(0, state.phase - 0.003);
    }

    requestAnimationFrame(drawWave);
}

function updateCycleDisplay() {
    var cc = document.getElementById('cycle-count');
    if (cc) {
        cc.textContent = (state.cycles % CONFIG.phasesPerCycle) + ' / ' + CONFIG.phasesPerCycle;
    }
}

// ── Phase shift trigger (core interaction) ────────
function triggerPhaseShift() {
    if (!state.running) return;

    playKick();
    state.phase = CONFIG.maxPhase;
    state.targetAmplitude = CONFIG.amp * 2.5;
    state.targetFreq = CONFIG.baseFreq + state.cycles * 12;

    // Visual kick pulse on canvas area
    var ca = document.getElementById('canvasArea');
    ca.classList.remove('kick');
    void ca.offsetWidth;
    ca.classList.add('kick');

    // Grid overlay shift
    var go = document.getElementById('grid-overlay');
    go.classList.add('phase-shift');
    setTimeout(function() { go.classList.remove('phase-shift'); }, 800);

    // Button indicator flash
    var ind = document.getElementById('btnIndicator');
    ind.classList.add('active');
    setTimeout(function() { ind.classList.remove('active'); }, 350);

    state.cycles++;

    // Completion tone after 4 cycles
    if (state.cycles % CONFIG.phasesPerCycle === 0) {
        playCycleComplete();
    }

    // Full reset every 8 cycles (2x 4-cycle)
    if (state.cycles % (CONFIG.phasesPerCycle * 2) === 0) {
        setTimeout(function() {
            state.targetFreq        = CONFIG.baseFreq;
            state.targetAmplitude   = CONFIG.amp;
            state.cycles = 0;
            // Flash the reset
            document.body.classList.add('body-reset');
            playReset();
            setTimeout(function() {
                document.body.classList.remove('body-reset');
            }, 600);
        }, 600);
    }

    // Decay back to base
    setTimeout(function() {
        state.targetAmplitude = CONFIG.amp;
        state.targetFreq = CONFIG.baseFreq + Math.max(0, state.cycles % CONFIG.phasesPerCycle) * 12;
    }, 400);
}

// ── DOM wiring ────────────────────────────────────
function init() {
    initCanvas();

    var btn   = document.getElementById('phaseButton');
    var mBtn  = document.getElementById('muteBtn');
    var mIcon = document.getElementById('muteIcon');
    var prompt= document.getElementById('startPrompt');

    var first = true;

    function startExperience() {
        initAudio();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        state.running  = true;
        state.muted    = false;
        state.lastBreath = performance.now();
        btn.disabled   = false;
        mBtn.disabled  = false;
        mIcon.textContent = '🔊';
        prompt.style.opacity = '0';
        setTimeout(function() { prompt.style.display = 'none'; }, 500);
        phaseTime = Date.now();
        requestAnimationFrame(drawWave);
        first = false;
    }

    // Click / tap on canvas area or button to start
    document.getElementById('canvasArea').addEventListener('click', function(e) {
        if (first) {
            startExperience();
        } else if (e.target === canvas || e.target.closest('.canvas-area')) {
            triggerPhaseShift();
        }
    });

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (first) {
            startExperience();
        } else {
            triggerPhaseShift();
        }
    });

    // Mute toggle
    mBtn.addEventListener('click', function() {
        state.muted = !state.muted;
        mIcon.textContent = state.muted ? '🔇' : '🔊';
        if (masterGain) {
            masterGain.gain.setValueAtTime(state.muted ? 0 : 1, ctx.currentTime);
        }
    });

    // Keyboard accessibility
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            if (first) {
                startExperience();
            } else {
                triggerPhaseShift();
            }
        }
        if (e.code === 'KeyM') {
            mBtn.click();
        }
    });
}

// Start
init();

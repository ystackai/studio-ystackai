// ─── Audio Engine & Grid Sync Scheduler ───

(function () {
    'use strict';

    // ━━━ CONFIG ━━━
    var CFG = {
        fps: 60,
        bpm: 120,
        beatsPerHold: 8,
        shipThreshold: 4,
        timingWindowMs: 300,
        attackMs: 3,
        holdMs: 120,
        releaseMs: 80,
        decayMs: 150,
        lookaheadSec: 0.1,
        scheduleIntervalMs: 25,
        sawFreq: 220,
        sawFreqHigh: 440,
        kickFundamental: 60,
        kickPitchDrop: 15,
        noiseCutoff: 4000,
        saturationAmount: 0.08,
        masterGain: 0.5,
    };

    var beatIntervalSec = 60 / CFG.bpm;
    var beatIntervalMs = beatIntervalSec * 1000;

    // ━━━ STATE ━━━
    var State = {
        running: false,
        audioStarted: false,
        currentBeat: 0,
        holdBeatIndex: 0,
        holdCount: 0,
        totalMomentum: 0,
        phase: 'idle',
        shipFlipped: false,
        gridLocked: false,
        nextBeatTime: 0,
        baseTime: 0,
        beatTimes: [],
        currentHoldWindowBeatTimes: [],
        holdWindowBeatHit: [],
        lastDriftTime: 0,
    };

    // ━━━ DOM REFS ━━━
    var dom = {
        overlay: null,
        bpmDisplay: null,
        beatDisplay: null,
        phaseIndicator: null,
        holdCount: null,
        momentumDisplay: null,
        grid: null,
        scanline: null,
        shipBarFill: null,
        shipLabel: null,
        breakRoom: null,
        cells: [],
    };

    function initDOM() {
        dom.overlay = document.getElementById('start-overlay');
        dom.bpmDisplay = document.getElementById('bpm-display');
        dom.beatDisplay = document.getElementById('beat-display');
        dom.phaseIndicator = document.getElementById('phase-indicator');
        dom.holdCount = document.getElementById('hold-count');
        dom.momentumDisplay = document.getElementById('momentum-display');
        dom.grid = document.getElementById('grid');
        dom.scanline = document.getElementById('grid-scanline');
        dom.shipBarFill = document.getElementById('ship-bar-fill');
        dom.shipLabel = document.getElementById('ship-label');
        dom.breakRoom = document.getElementById('break-room');

        for (var i = 0; i < 12; i++) {
            var cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            dom.grid.appendChild(cell);
            dom.cells.push(cell);
        }

        dom.beatDisplay.textContent = '0';
        dom.holdCount.textContent = '0';
        dom.momentumDisplay.textContent = '0';
    }

    // ━━━ Web Audio API — Single Context ━━━
    var audioCtx = null;
    var masterBus = null;

    function createAudioContext() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        var masterGain = audioCtx.createGain();
        masterGain.gain.value = CFG.masterGain;

        var saturator = audioCtx.createWaveShaper();
        saturator.curve = makeTapeSaturationCurve(CFG.saturationAmount * 4096);
        saturator.oversample = '4x';

        masterGain.connect(saturator);
        saturator.connect(audioCtx.destination);

        return { masterGain: masterGain, saturator: saturator };
    }

    // ━━━ ADSR Envelope ━━━
    function applyADSR(gainNode, startTime, duration, peak) {
        peak = peak !== undefined ? peak : 1.0;
        var t = startTime;
        var aSec = CFG.attackMs / 1000;
        var dSec = CFG.decayMs / 1000;
        var rSec = CFG.releaseMs / 1000;
        var hSec = Math.max(duration - aSec - dSec - rSec, 0.001);

        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(peak, t + aSec);
        if (hSec > 0.005) {
            gainNode.gain.linearRampToValueAtTime(peak * 0.7, t + aSec + dSec);
            gainNode.gain.setValueAtTime(peak * 0.7, t + aSec + dSec + hSec);
        }
        gainNode.gain.linearRampToValueAtTime(0, t + aSec + dSec + hSec + rSec);
    }

    // ━━━ Synthesis: Sawtooth Oscillator ━━━
    function playSawtooth(lockTime, duration, frequency) {
        if (!audioCtx || State.gridLocked) return;

        freq = frequency || CFG.sawFreq;

        var osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        var detuneOsc = audioCtx.createOscillator();
        detuneOsc.type = 'sawtooth';
        detuneOsc.frequency.value = freq * 1.002;
        detuneOsc.detune.value = 8;

        var oscGain = audioCtx.createGain();
        oscGain.gain.value = 0;
        applyADSR(oscGain, lockTime, duration, 0.5);

        var detuneGain = audioCtx.createGain();
        detuneGain.gain.value = 0;
        applyADSR(detuneGain, lockTime, duration * 0.9, 0.2);

        osc.connect(oscGain);
        detuneOsc.connect(detuneGain);
        oscGain.connect(masterBus.masterGain);
        detuneGain.connect(masterBus.masterGain);

        osc.start(lockTime);
        osc.stop(lockTime + duration + 0.1);
        detuneOsc.start(lockTime);
        detuneOsc.stop(lockTime + duration * 0.9 + 0.1);
    }

    // ━━━ Synthesis: Kick Drum ━━━
    function playKick(lockTime) {
        if (!audioCtx || State.gridLocked) return;

        var osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(CFG.kickFundamental, lockTime);
        osc.frequency.exponentialRampToValueAtTime(CFG.kickPitchDrop, lockTime + 0.08);

        var oscGain = audioCtx.createGain();
        oscGain.gain.setValueAtTime(0, lockTime);
        oscGain.gain.linearRampToValueAtTime(1.0, lockTime + 0.003);
        oscGain.gain.exponentialRampToValueAtTime(0.001, lockTime + 0.25);

        osc.connect(oscGain);
        oscGain.connect(masterBus.masterGain);
        osc.start(lockTime);
        osc.stop(lockTime + 0.3);

        playNoiseBurst(lockTime, 0.05, 3000);
    }

    // ━═ Synthesis: Noise Burst (grid snap click) ━━━
    function playNoiseBurst(startTime, duration, cutoff) {
        if (!audioCtx) return;

        var bufferLen = Math.round(audioCtx.sampleRate * duration);
        var buffer = audioCtx.createBuffer(1, bufferLen, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferLen; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        var source = audioCtx.createBufferSource();
        source.buffer = buffer;

        var fil = audioCtx.createBiquadFilter();
        fil.type = 'bandpass';
        fil.frequency.value = cutoff || CFG.noiseCutoff;
        fil.Q.value = 2;

        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        source.connect(fil);
        fil.connect(gain);
        gain.connect(masterBus.masterGain);

        source.start(startTime);
        source.stop(startTime + duration + 0.01);
    }

    // ━═ Synthesis: Rising Filter Sweep (hold success) ━━━
    function playFilterSweep(startTime, duration) {
        if (!audioCtx) return;

        var osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(CFG.sawFreq, startTime);
        osc.frequency.exponentialRampToValueAtTime(CFG.sawFreqHigh * 2, startTime + duration);

        var fil = audioCtx.createBiquadFilter();
        fil.type = 'lowpass';
        fil.frequency.setValueAtTime(400, startTime);
        fil.frequency.exponentialRampToValueAtTime(8000, startTime + duration);
        fil.Q.value = 4;

        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.004);
        gain.gain.setValueAtTime(0.25, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(fil);
        fil.connect(gain);
        gain.connect(masterBus.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    }

    // ━═ Synthesis: Detuned Square Wave (drift/miss) ━━━
    function playDriftSound(startTime) {
        if (!audioCtx) return;

        var osc1 = audioCtx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.value = CFG.sawFreq * 0.8;
        osc1.detune.value = -15;

        var osc2 = audioCtx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = CFG.sawFreq * 0.78;
        osc2.detune.value = 20;

        var gain1 = audioCtx.createGain();
        gain1.gain.setValueAtTime(0, startTime);
        gain1.gain.linearRampToValueAtTime(0.15, startTime + 0.003);
        gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        var gain2 = audioCtx.createGain();
        gain2.gain.setValueAtTime(0, startTime);
        gain2.gain.linearRampToValueAtTime(0.12, startTime + 0.003);
        gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(masterBus.masterGain);
        gain2.connect(masterBus.masterGain);

        osc1.start(startTime);
        osc1.stop(startTime + 0.45);
        osc2.start(startTime);
        osc2.stop(startTime + 0.4);
    }

    // ━═ Synthesis: Ship Flip Chord ━━━
    function playShipFlipChord(startTime) {
        if (!audioCtx) return;

        var chord = [220, 277.18, 329.63, 440];
        for (var i = 0; i < chord.length; i++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = chord[i];

            var gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0, startTime + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.1, startTime + i * 0.05 + 0.003);
            gain.gain.setValueAtTime(0.1, startTime + i * 0.05 + 0.5);
            gain.gain.linearRampToValueAtTime(0, startTime + i * 0.05 + 1.2);

            osc.connect(gain);
            gain.connect(masterBus.masterGain);
            osc.start(startTime + i * 0.05);
            osc.stop(startTime + i * 0.05 + 1.5);
        }
    }

    // ━━━ Tape Saturation Curve ━━━
    function makeTapeSaturationCurve(kFactor) {
        var samples = 4096;
        var curve = new Float32Array(samples);
        var half = samples / 2;
        for (var i = 0; i < samples; i++) {
            var x = (i - half) / half;
            if (kFactor === 0) {
                curve[i] = x;
            } else {
                curve[i] = (kFactor * x) / (1 + kFactor * Math.abs(x));
            }
        }
        return curve;
    }

    // ━━━ Sample-Accurate Scheduler ━━━
    var schedulerTimer = null;
    var renderQueue = [];
    var lastRenderedBeat = -1;

    function scheduler() {
        var ct = audioCtx.currentTime;

        while (State.nextBeatTime < ct + CFG.lookaheadSec) {
            scheduleBeat(State.currentBeat, State.nextBeatTime);
            State.nextBeatTime += beatIntervalSec;
            State.currentBeat++;
        }
    }

    function scheduleBeat(beatNum, time) {
        if (beatNum % 4 === 0) {
            playKick(time);
        }

        playNoiseBurst(time, 0.03, 3500);

        if (State.phase === 'hold' && beatNum % 2 === 0) {
            playSawtooth(time, beatIntervalSec * 1.8, CFG.sawFreq);
        }

        State.beatTimes.push({ beat: beatNum, time: time });
        if (State.beatTimes.length > 64) {
            State.beatTimes.shift();
        }

        renderQueue.push({ beat: beatNum, time: time });
        if (renderQueue.length > 24) renderQueue.shift();

        if (State.phase === 'hold' && State.holdBeatIndex < CFG.beatsPerHold) {
            State.currentHoldWindowBeatTimes.push(time);
        }
    }

    function processRenderUpdates() {
        var ct = audioCtx ? audioCtx.currentTime : 0;

        while (renderQueue.length > 0) {
            var evt = renderQueue[0];
            if (evt.time > ct + 0.05) break;
            renderQueue.shift();
            renderBeat(evt.beat);
        }
    }

    function renderBeat(beatNum) {
        if (beatNum === lastRenderedBeat) return;
        lastRenderedBeat = beatNum;

        var displayBeat = ((beatNum % 8) + 1);
        dom.beatDisplay.textContent = displayBeat;

        var cellIndex = beatNum % 12;
        pulseCell(cellIndex);

        checkHoldWindowAlignment(beatNum);
    }

    // ━══ Hold Window (8-beat) ━══
    function startHoldWindow() {
        State.phase = 'hold';
        State.holdBeatIndex = 0;
        State.currentHoldWindowBeatTimes = [];
        State.holdWindowBeatHit = new Array(CFG.beatsPerHold);
        State.holdWindowBeatHit.fill(false);
        dom.holdCount.textContent = '0';
        setPhase('hold');
    }

    function checkHoldWindowAlignment(beatNum) {
        if (State.phase !== 'hold' || State.holdBeatIndex >= CFG.beatsPerHold) return;

        var windowBeatTimes = State.currentHoldWindowBeatTimes;
        if (State.holdBeatIndex >= windowBeatTimes.length) return;

        var expectedTime = windowBeatTimes[State.holdBeatIndex];
        var ct = audioCtx.currentTime;

        if (ct < expectedTime - CFG.timingWindowMs) {
            return;
        }

        var hit = State.holdWindowBeatHit[State.holdBeatIndex];

        if (hit) {
            advanceHoldBeat();
        } else {
            triggerDrift();
        }
    }

    function advanceHoldBeat() {
        State.holdBeatIndex++;
        var displayHold = Math.min(State.holdBeatIndex, CFG.beatsPerHold);
        dom.holdCount.textContent = displayHold;

        if (State.holdBeatIndex >= CFG.beatsPerHold) {
            completeHold();
        }
    }

    function markBeatHit() {
        if (State.phase !== 'hold') return;

        var ct = audioCtx.currentTime;
        var windowBeatTimes = State.currentHoldWindowBeatTimes;

        for (var i = State.holdBeatIndex; i < windowBeatTimes.length; i++) {
            var diff = Math.abs(ct - windowBeatTimes[i]);
            if (diff < CFG.timingWindowMs / 1000) {
                State.holdWindowBeatHit[i] = true;
                return;
            }
        }
    }

    function completeHold() {
        var now = audioCtx.currentTime;
        playFilterSweep(now, 0.3);

        State.totalMomentum++;
        State.holdCount++;
        dom.momentumDisplay.textContent = State.totalMomentum;

        var pct = Math.min((State.holdCount / CFG.shipThreshold) * 100, 100);
        dom.shipBarFill.style.width = pct + '%';

        if (State.holdCount >= CFG.shipThreshold) {
            flipShip();
        } else {
            setTimeout(function () {
                if (State.running && !State.gridLocked) {
                    startHoldWindow();
                }
            }, beatIntervalMs);
        }
    }

    function triggerDrift() {
        var now = audioCtx.currentTime;
        if (now - State.lastDriftTime < 0.5) return;
        State.lastDriftTime = now;
        playDriftSound(now);

        setPhase('drift');

        dom.cells.forEach(function (cell) {
            cell.classList.add('drift');
            setTimeout(function () {
                cell.classList.remove('drift');
            }, 200);
        });

        setTimeout(function () {
            State.holdBeatIndex = 0;
            dom.holdCount.textContent = '0';
            setPhase('idle');
        }, 600);
    }

    // ━══ Ship Flip ━══
    function flipShip() {
        State.shipFlipped = true;
        State.gridLocked = true;

        playShipFlipChord(audioCtx.currentTime);

        dom.shipBarFill.classList.add('flipped');
        dom.shipLabel.classList.add('flipped');
        setPhase('locked');

        dom.cells.forEach(function (cell) {
            cell.classList.add('locked');
            cell.classList.remove('pulse', 'active');
        });

        setTimeout(function () {
            dom.breakRoom.classList.remove('hidden');
        }, 800);

        if (schedulerTimer) {
            clearInterval(schedulerTimer);
            schedulerTimer = null;
        }
    }

    // ━══ Visual Helpers ━══
    function pulseCell(index) {
        if (State.gridLocked) return;

        dom.cells.forEach(function (cell, i) {
            if (i === index) {
                cell.classList.remove('pulse', 'active');
                void cell.offsetWidth;
                cell.classList.add('pulse');
                setTimeout(function () {
                    cell.classList.remove('pulse');
                    cell.classList.add('active');
                    setTimeout(function () {
                        cell.classList.remove('active');
                    }, beatIntervalMs * 0.8);
                }, 80);
            }
        });
    }

    function setPhase(phase) {
        State.phase = phase;
        dom.phaseIndicator.className = 'phase-' + phase;
        dom.phaseIndicator.textContent = 'PHASE: ' + phase.toUpperCase();
    }

    // ━══ 60fps Render Loop ━══
    function renderLoop() {
        if (!State.running) return;

        processRenderUpdates();

        if (!State.gridLocked && audioCtx) {
            var beatPhase = ((audioCtx.currentTime - State.baseTime) % beatIntervalSec) / beatIntervalSec;
            dom.scanline.style.top = (beatPhase * 100) + '%';
        }

        requestAnimationFrame(renderLoop);
    }

    // ━══ Audio Start (User-Triggered) ━══
    function startAudio() {
        if (State.audioStarted) return;
        State.audioStarted = true;

        masterBus = createAudioContext();

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(function () {
                beginEngine();
            });
        } else {
            beginEngine();
        }
    }

    function beginEngine() {
        State.running = true;
        State.baseTime = audioCtx.currentTime + 0.1;
        State.nextBeatTime = State.baseTime;
        State.currentBeat = 0;
        State.lastDriftTime = 0;

        setPhase('idle');
        dom.overlay.classList.add('hidden');

        schedulerTimer = setInterval(function () {
            if (State.running) {
                scheduler();
            }
        }, CFG.scheduleIntervalMs);

        requestAnimationFrame(renderLoop);

        setTimeout(function () {
            if (State.running && !State.gridLocked) {
                startHoldWindow();
            }
        }, beatIntervalMs * 3);
    }

    // ━══ User Input ━══
    function handleInput(e) {
        if (!State.audioStarted) {
            startAudio();
            return;
        }

        if (!State.running || State.gridLocked) return;

        if (State.phase === 'idle') {
            startHoldWindow();
            playKick(audioCtx.currentTime);
            playSawtooth(audioCtx.currentTime, beatIntervalSec * 3, CFG.sawFreq);
        }

        if (State.phase === 'hold') {
            markBeatHit();
            playKick(audioCtx.currentTime);
            pulseCell(State.currentBeat % 12);
        }
    }

    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            handleInput(e);
        }
    });

    document.addEventListener('click', function (e) {
        handleInput(e);
    });

    document.addEventListener('touchstart', function (e) {
        if (!State.audioStarted) {
            e.preventDefault();
            handleInput(e);
        }
    }, { passive: false });

    // ━══ Init ━══
    function init() {
        initDOM();

        dom.overlay.addEventListener('click', function () {
            handleInput({});
        });

        dom.overlay.addEventListener('touchstart', function (e) {
            e.preventDefault();
            handleInput({});
        }, { passive: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

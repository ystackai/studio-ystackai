const GridSync = (() => {
    let audioCtx = null;
    let sawtoothOsc = null;
    let gainNode = null;
    let running = false;
    let lastFrameTime = 0;
    let driftAccumulator = 0;
    const TARGET_FPS = 60;
    const FRAME_DURATION = 1000 / TARGET_FPS;
    const FRACTURE_GAP = 16.67;

    function initAudioContext() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
    }

    function createKickEnvelope(targetTime) {
        const kickGain = audioCtx.createGain();
        kickGain.gain.setValueAtTime(0, targetTime);
        kickGain.gain.linearRampToValueAtTime(1, targetTime + 0.01);
        kickGain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.3);
        kickGain.connect(gainNode);

        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, targetTime);
        osc.frequency.exponentialRampToValueAtTime(30, targetTime + 0.15);
        osc.connect(kickGain);
        osc.start(targetTime);
        osc.stop(targetTime + 0.35);
        return kickGain;
    }

    function createSawtoothAttack(targetTime) {
        sawtoothOsc = audioCtx.createOscillator();
        sawtoothOsc.type = 'sawtooth';
        sawtoothOsc.frequency.setValueAtTime(220, targetTime);
        const sawGain = audioCtx.createGain();
        sawGain.gain.setValueAtTime(0, targetTime);
        sawGain.gain.linearRampToValueAtTime(0.3, targetTime + 0.005);
        sawGain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.2);
        sawtoothOsc.connect(sawGain);
        sawGain.connect(audioCtx.destination);
        sawtoothOsc.start(targetTime);
        sawtoothOsc.stop(targetTime + 0.25);
        return sawGain;
    }

    function scheduleCycle() {
        if (!running) return;

        const now = audioCtx.currentTime;
        createSawtoothAttack(now);
        createKickEnvelope(now);

        setTimeout(() => triggerFracture(), FRACTURE_GAP);

        const nextCycleTime = now + (FRAME_DURATION / 1000);
        setTimeout(scheduleCycle, FRAME_DURATION);
    }

    function triggerFracture() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell) => {
            const idx = parseInt(cell.dataset.index, 10);
            const angle = idx * 10;
            const fracture = Math.min(Math.max(idx * 0.1, 0.5), 3);
            cell.style.transform = `rotate(${angle}deg) scale(${fracture}) translateZ(0)`;
            cell.classList.add('fractured');
        });

        requestAnimationFrame(resetGrid);
    }

    function resetGrid() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell) => {
            cell.style.transform = 'translateZ(0)';
            cell.style.opacity = '';
            cell.classList.remove('fractured');
        });
    }

    function startSyncLoop() {
        running = true;
        lastFrameTime = performance.now();
        driftAccumulator = 0;
        scheduleCycle();
        tick();
    }

    function tick() {
        if (!running) return;
        const now = performance.now();
        let delta = now - lastFrameTime;
        lastFrameTime = now;

        driftAccumulator += (delta - FRAME_DURATION);
        if (Math.abs(driftAccumulator) > (FRAME_DURATION / 2)) {
            if (audioCtx && audioCtx.state === 'running') {
                audioCtx.suspend();
                setTimeout(() => audioCtx.resume(), 1);
            }
            driftAccumulator = 0;
        }

        requestAnimationFrame(tick);
    }

    return {
        init: function () {
            initAudioContext();
            const triggerBtn = document.getElementById('trigger');
            if (triggerBtn) {
                triggerBtn.addEventListener('click', () => {
                    if (!audioCtx) initAudioContext();
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    if (!running) {
                        initAudioContext();
                        startSyncLoop();
                    }
                });
            }
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => GridSync.init());

// Script for frog animation and interaction
document.addEventListener('DOMContentLoaded', function() {
    const frog = document.getElementById('frog');
    const frogContainer = document.getElementById('frog-container');
    const button = document.getElementById('accept-button');
    const message = document.getElementById('message');
    const container = document.getElementById('container');

    // --- Audio system (unchanged from original) ---
    let audioContext;
    let tritoneOscillator;
    let cashRegisterOscillator;
    let subBassOscillator;
    let tritoneGainNode;
    let cashRegisterGainNode;
    let subBassGainNode;
    let creditScore = 0;
    let startTime = Date.now();

    function updateCreditScore() {
        const elapsed = (Date.now() - startTime) / 1000;
        creditScore = Math.max(0, Math.floor(5 - elapsed / 30));
        message.classList.remove('credit-0', 'credit-1', 'credit-2', 'credit-3', 'credit-4', 'credit-5');
        message.classList.add(`credit-${creditScore}`);
    }

    // Descent: UI dissolve effect triggered on boundary impact.
    // Boundary check prevents race conditions by clamping position to container bottom
    // before calling descent(). Uses cubic-bezier(0.22, 0.61, 0.36, 1.0) match.
    function descent() {
        frog.classList.add('drop-landing');
        message.classList.add('drop-landing');
        setTimeout(function() {
            frog.classList.remove('drop-landing');
            message.classList.remove('drop-landing');
            frog.classList.add('drop-gone');
            message.classList.add('drop-gone');
        }, 1000);
    }

    // Boundary-aware descent driver.
    // Computes when the CSS cubic-bezier(0.22, 0.61, 0.36, 1.0) animation
    // would bring frog to the container floor, then calls descent().
    function startDescent() {
        var containerHeight = container.clientHeight;
        var frogHeight = frog.offsetHeight || 200;
        var maxTravel = containerHeight - frogHeight - 20; // 20px buffer from bottom

        // Clamp: never animate beyond the boundary (prevents floor clipping)
        if (maxTravel <= 0) {
            descent();
            return;
        }

        // CSS animation runs for 2s with cubic-bezier(0.22, 0.61, 0.36, 1.0).
        // We schedule descent() to fire at the end of the CSS animation so it
        // precisely matches the computed bottom — no race condition between JS
        // position tracking and CSS keyframes.
        setTimeout(function() {
            descent();
        }, 2000);

        // Start the CSS-driven cubic-bezier fall
        frogContainer.classList.add('drop-falling');
    }

    // --- Audio helpers (unchanged from original) ---
    function initAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        tritoneOscillator = audioContext.createOscillator();
        tritoneOscillator.type = 'sawtooth';
        tritoneGainNode = audioContext.createGain();
        tritoneGainNode.gain.value = 0;
        tritoneOscillator.connect(tritoneGainNode);
        tritoneGainNode.connect(audioContext.destination);

        cashRegisterOscillator = audioContext.createOscillator();
        cashRegisterOscillator.type = 'square';
        cashRegisterGainNode = audioContext.createGain();
        cashRegisterGainNode.gain.value = 0;
        cashRegisterOscillator.connect(cashRegisterGainNode);
        cashRegisterGainNode.connect(audioContext.destination);

        subBassOscillator = audioContext.createOscillator();
        subBassOscillator.type = 'sine';
        subBassOscillator.frequency.value = 16;
        subBassGainNode = audioContext.createGain();
        subBassGainNode.gain.value = 0.1;
        subBassOscillator.connect(subBassGainNode);
        subBassGainNode.connect(audioContext.destination);

        tritoneOscillator.start();
        cashRegisterOscillator.start();
        subBassOscillator.start();
    }

    function playTritoneSequence() {
        if (!audioContext) initAudio();
        tritoneGainNode.gain.setValueAtTime(0, audioContext.currentTime);
        tritoneGainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        tritoneOscillator.frequency.setValueAtTime(261.63, audioContext.currentTime);
        tritoneOscillator.frequency.linearRampToValueAtTime(369.99, audioContext.currentTime + 3);
        tritoneGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 3);
    }

    function playCashRegister() {
        if (!audioContext) initAudio();
        cashRegisterOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        cashRegisterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        cashRegisterGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
    }

    function startSubBass() {
        if (!audioContext) initAudio();
        subBassGainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    }

    function startAudioOnInteraction() {
        document.addEventListener('click', function() {
            if (!audioContext) {
                initAudio();
                playTritoneSequence();
                startSubBass();
            }
        }, { once: true });
    }

    // --- Launch ---
    creditScore = Math.floor(5);
    updateCreditScore();
    startDescent();
    startAudioOnInteraction();

    button.addEventListener('click', function() {
        button.click();
        playCashRegister();
    });
});

class SnapAudioProcessor extends AudioWorkletProcessor {
     constructor() {
        super();
        this._timestamps = [];
        this._sampleRate = 0;
        this._blockOffset = 0;
        this._noiseBuffer = null;
        this._noiseIndex = 0;
        this._initDone = false;
     }

     process(inputs, outputs) {
        if (!this._initDone) {
            this._sampleRate = sampleRate;
            this._noiseBuffer = new Float32Array(this._sampleRate * 0.5);
            for (let i = 0; i < this._noiseBuffer.length; i++) {
                this._noiseBuffer[i] = Math.random() * 2 - 1;
             }
            this._initDone = true;
         }

        const output = outputs[0];
        const left = output[0];
        const numSamples = left.length;

        for (let i = 0; i < numSamples; i++) {
            const sampleTime = this._blockOffset + i;
            const currentTime = performance.now();
            let sample = 0;

            for (let t = 0; t < this._timestamps.length; t++) {
                const ts = this._timestamps[t];
                const delayMs = (currentTime - ts) / 1000;
                const delaySamples = Math.round(delayMs * this._sampleRate);
                const pulsePos = sampleTime - delaySamples;

                if (pulsePos >= 0 && pulsePos < 500) {
                    const attackSamples = Math.round(0.003 * this._sampleRate);
                    const releaseSamples = Math.round(0.012 * this._sampleRate);
                    const envelopePos = pulsePos / releaseSamples;

                    let envelope = 0;
                    if (pulsePos < attackSamples) {
                        envelope = pulsePos / attackSamples;
                     } else if (pulsePos < releaseSamples) {
                        envelope = 1 - Math.pow((pulsePos - attackSamples) / (releaseSamples - attackSamples), 3);
                     }

                    if (envelope > 0) {
                        const noiseIdx = (this._noiseIndex + pulsePos) % this._noiseBuffer.length;
                        const noise = this._noiseBuffer[Math.floor(noiseIdx)];
                        const click = Math.exp(-pulsePos * 0.08) * noise * 0.5;
                        const tone = Math.sin(pulsePos * 0.12) * Math.exp(-pulsePos * 0.04) * 0.2;
                        sample += (click + tone) * envelope;
                     }
                 }
             }

            left[i] = sample;
            if (output.length > 1) {
                output[1][i] = sample;
             }
         }

        this._blockOffset += numSamples;

        this._timestamps = this._timestamps.filter(ts => {
            return (performance.now() - ts) < 200;
         });

        return true;
     }

     static parameterDescriptors() {
        return [];
     }
}

registerProcessor('snap-audio-processor', SnapAudioProcessor);

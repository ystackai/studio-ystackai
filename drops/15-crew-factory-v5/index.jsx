import React, { useState, useEffect, useRef } from 'react';

const Tiered404 = () => {
  const [tier, setTier] = useState('free'); // 'free' or 'enterprise'
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lowPassFilterRef = useRef(null);
  const subBassRef = useRef(null);
  const buttonPulseRef = useRef(null);

  // Initialize audio context on user interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Free tier sound generation
  const playFreeTierSound = () => {
    if (!audioContextRef.current) return;

    // Create sawtooth oscillator
    oscillatorRef.current = audioContextRef.current.createOscillator();
    oscillatorRef.current.type = 'sawtooth';
    oscillatorRef.current.frequency.value = 440;

    // Create low-pass filter
    lowPassFilterRef.current = audioContextRef.current.createBiquadFilter();
    lowPassFilterRef.current.type = 'lowpass';
    lowPassFilterRef.current.frequency.value = 2000;

    // Create gain node for volume control
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.gain.value = 0.3;

    // Create sub-bass oscillator
    subBassRef.current = audioContextRef.current.createOscillator();
    subBassRef.current.type = 'sine';
    subBassRef.current.frequency.value = 16;

    // Create gain node for sub-bass
    const subBassGain = audioContextRef.current.createGain();
    subBassGain.gain.value = 0.5;

    // Connect nodes
    oscillatorRef.current.connect(lowPassFilterRef.current);
    lowPassFilterRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioContextRef.current.destination);

    subBassRef.current.connect(subBassGain);
    subBassGain.connect(audioContextRef.current.destination);

    // Start oscillators
    oscillatorRef.current.start();
    subBassRef.current.start();

    // Modulate frequency over time
    let startTime = audioContextRef.current.currentTime;
    oscillatorRef.current.frequency.setValueAtTime(440, startTime);
    oscillatorRef.current.frequency.exponentialRampToValueAtTime(100, startTime + 10);

    // Open low-pass filter over time
    lowPassFilterRef.current.frequency.setValueAtTime(2000, startTime);
    lowPassFilterRef.current.frequency.exponentialRampToValueAtTime(500, startTime + 10);

    // Gradually decrease volume
    gainNodeRef.current.gain.setValueAtTime(0.3, startTime);
    gainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, startTime + 10);

    // Start sub-bass
    subBassRef.current.start();
  };

  // Enterprise tier sound generation
  const playEnterpriseTierSound = () => {
    if (!audioContextRef.current) return;

    // Create a G7 chord (G - B - D - F)
    const chordFrequencies = [392, 494, 587, 698]; // G4, B4, D5, F5
    const oscillators = [];

    chordFrequencies.forEach(freq => {
      const osc = audioContextRef.current.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      oscillators.push(osc);
    });

    // Create a single gain node for the chord
    const gain = audioContextRef.current.createGain();
    gain.gain.value = 0.5;

    // Connect all oscillators to gain node
    oscillators.forEach(osc => {
      osc.connect(gain);
      osc.start();
    });

    // Connect gain to destination
      gain.connect(audioContextRef.current.destination);

    // Fade out the chord
    const startTime = audioContextRef.current.currentTime;
    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 5);

    // Stop oscillators after fade out
    oscillators.forEach((osc, index) => {
      osc.stop(startTime + 5);
    });
  };

  // Play cha-ching sound
  const playChaChing = () => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = 220;

    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = 0.1;

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Apply a sharp envelope
    const now = audioContextRef.current.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  };

  // Handle button click
  const handleButtonClick = () => {
    initAudio();
    playChaChing();
    // Transition to black screen logic would go here
  };

  // Initialize and play sound on component mount
  useEffect(() => {
    initAudio();
    if (tier === 'free') {
      playFreeTierSound();
    } else {
      playEnterpriseTierSound();
    }
    setIsPlaying(true);

    return () => {
      // Clean up audio nodes
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (subBassRef.current) {
        subBassRef.current.stop();
      }
      if (lowPassFilterRef.current) {
        lowPassFilterRef.current.disconnect();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
    };
  }, [tier]);

  return (
    <div className="tiered-404">
      <div className="frog-container">
        <div className="frog-sinking"></div>
      </div>
      <div className="button-container">
        <div className="accept-button" onClick={handleButtonClick}></div>
      </div>
    </div>
  );
};

export default Tiered404;

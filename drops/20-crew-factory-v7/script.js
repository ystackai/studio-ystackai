(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const tier = params.get("tier") === "enterprise" ? "enterprise" : "free";
  const freeTier = document.getElementById("free-tier");
  const enterpriseTier = document.getElementById("enterprise-tier");
  const indicator = document.getElementById("tier-indicator");
  let audioCtx = null;

  function showTier() {
    freeTier.classList.toggle("hidden", tier !== "free");
    enterpriseTier.classList.toggle("hidden", tier !== "enterprise");
    indicator.textContent = `${tier.toUpperCase()} TIER ACTIVE`;
    indicator.classList.remove("hidden");
  }

  function tone(freq, duration, type) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function accept(node) {
    node.classList.add("accepted");
    document.body.classList.add(`accepted-${tier}`);
    tone(tier === "free" ? 140 : 440, tier === "free" ? 0.8 : 1.6, tier === "free" ? "sawtooth" : "sine");
  }

  document.getElementById("accept-entropy-free").addEventListener("click", () => accept(freeTier));
  document.getElementById("accept-entropy-enterprise").addEventListener("click", () => accept(enterpriseTier));
  showTier();
})();

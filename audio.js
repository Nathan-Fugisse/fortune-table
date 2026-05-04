(function() {
  var audioCtx = null;

  function getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, duration, type, volume) {
    if (!FortuneTable.state.soundEnabled) return;
    var ctx = getCtx();
    if (!ctx) return;
    try {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  FortuneTable.Audio = {
    tick:           function() { tone(900, 0.04, "square", 0.07); },
    rouletteResult: function() {
      tone(523, 0.12, "sine", 0.18);
      setTimeout(function(){ tone(659, 0.12, "sine", 0.18); }, 130);
      setTimeout(function(){ tone(784, 0.25, "sine", 0.18); }, 260);
    },
    slotTick:  function() { tone(550, 0.03, "square", 0.05); },
    slotStop:  function() { tone(380, 0.1,  "triangle", 0.14); },
    slotWin:   function() {
      [523,659,784,1047].forEach(function(f,i) {
        setTimeout(function(){ tone(f, 0.18, "sine", 0.18); }, i * 120);
      });
    },
    slotLose:   function() { tone(220, 0.35, "sawtooth", 0.09); },
    coinFlip:   function() {
      tone(1100, 0.07, "sine", 0.1);
      setTimeout(function(){ tone(1300, 0.07, "sine", 0.1); }, 90);
    },
    coinResult: function() {
      tone(660, 0.14, "triangle", 0.14);
      setTimeout(function(){ tone(880, 0.2, "triangle", 0.14); }, 170);
    },
    click: function() { tone(480, 0.05, "square", 0.07); }
  };
})();
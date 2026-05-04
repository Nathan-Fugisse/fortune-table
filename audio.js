/* ============================================
   AUDIO.JS
   Sons gerados por código (Web Audio API).
   Nenhum arquivo de áudio externo necessário.
   ============================================ */

(function() {

  var audioCtx = null;

  // Cria o AudioContext na primeira interação do usuário
  // (necessário por política de segurança dos navegadores)
  function getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        return null;
      }
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Toca um tom simples.
   * @param {number} freq     - Frequência em Hz (altura da nota)
   * @param {number} duration - Duração em segundos
   * @param {string} type     - Tipo: "sine", "square", "triangle", "sawtooth"
   * @param {number} volume   - Volume de 0 a 1
   */
  function tone(freq, duration, type, volume) {
    // Se som desligado, não faz nada
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
    } catch(e) {
      // ignora erros silenciosamente
    }
  }

  // Sons disponíveis para toda a extensão
  FortuneTable.Audio = {

    // Tick da roleta passando por um segmento
    tick: function() {
      tone(900, 0.04, "square", 0.07);
    },

    // Fanfarra de resultado da roleta
    rouletteResult: function() {
      tone(523, 0.12, "sine", 0.18);
      setTimeout(function(){ tone(659, 0.12, "sine", 0.18); }, 130);
      setTimeout(function(){ tone(784, 0.25, "sine", 0.18); }, 260);
    },

    // Tick rápido de um rolo do slot girando
    slotTick: function() {
      tone(550, 0.03, "square", 0.05);
    },

    // Som de parada de um rolo
    slotStop: function() {
      tone(380, 0.1, "triangle", 0.14);
    },

    // Fanfarra de vitória no slot
    slotWin: function() {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function(f, i) {
        setTimeout(function(){ tone(f, 0.18, "sine", 0.18); }, i * 120);
      });
    },

    // Som de derrota no slot
    slotLose: function() {
      tone(220, 0.35, "sawtooth", 0.09);
    },

    // Som de jogar a moeda
    coinFlip: function() {
      tone(1100, 0.07, "sine", 0.1);
      setTimeout(function(){ tone(1300, 0.07, "sine", 0.1); }, 90);
    },

    // Som de resultado da moeda
    coinResult: function() {
      tone(660, 0.14, "triangle", 0.14);
      setTimeout(function(){ tone(880, 0.2, "triangle", 0.14); }, 170);
    },

    // Clique genérico de botão
    click: function() {
      tone(480, 0.05, "square", 0.07);
    }
  };

})();
(function() {

  var winChance  = 30;
  var reelTimers = [null, null, null];

  FortuneTable.Slots = {

    init: function() {
      this.setupEvents();
      FortuneTable.Sync.loadSlotsConfig().then(function(chance) {
        winChance = chance;
        var slider = document.getElementById("slots-win-chance");
        var label  = document.getElementById("slots-win-chance-label");
        if (slider) slider.value = Math.round(winChance);
        if (label)  label.textContent = Math.round(winChance);
      });
    },

    calculateResult: function() {
      var isWin = Math.random() * 100 < winChance;
      if (isWin) {
        var sym = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
        return { symbols: [sym, sym, sym], isWin: true };
      } else {
        var s1, s2, s3;
        do {
          s1 = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
          s2 = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
          s3 = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
        } while (s1 === s2 && s2 === s3);
        return { symbols: [s1, s2, s3], isWin: false };
      }
    },

    spinReels: function(targetSymbols, onComplete) {
      var stopped = 0;
      for (var i = 0; i < 3; i++) {
        (function(idx) {
          var reel     = document.getElementById("reel-" + idx);
          var symbolEl = reel ? reel.querySelector(".slot-symbol") : null;
          if (!symbolEl) return;
          if (reel) reel.classList.add("spinning");
          var speed = 55 + idx * 12;
          reelTimers[idx] = setInterval(function() {
            symbolEl.textContent = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
            FortuneTable.Audio.slotTick();
          }, speed);
          setTimeout(function() {
            clearInterval(reelTimers[idx]);
            reelTimers[idx] = null;
            if (reel) reel.classList.remove("spinning");
            symbolEl.textContent = targetSymbols[idx];
            FortuneTable.Audio.slotStop();
            stopped++;
            if (stopped === 3 && onComplete) onComplete();
          }, 900 + idx * 650 + Math.random() * 250);
        })(i);
      }
    },

    showResult: function(isWin, playerName, symbols) {
      var box = document.getElementById("slots-result");
      if (!box) return;
      var symsStr = symbols.join(" ");
      if (isWin) {
        box.textContent = "🎉 " + playerName + " GANHOU! " + symsStr;
        box.className   = "result-box win celebrate";
        FortuneTable.Audio.slotWin();
        setTimeout(function() { box.classList.remove("celebrate"); }, 2500);
      } else {
        box.textContent = "😔 " + playerName + " perdeu. " + symsStr;
        box.className   = "result-box lose";
        FortuneTable.Audio.slotLose();
      }
      FortuneTable.addHistoryEntry("slots-history", playerName, symsStr + (isWin ? " — VITÓRIA! 🎉" : " — derrota 😔"));
    },

    updateWinChance: function(newChance) {
      winChance = newChance;
      if (FortuneTable.state.role === "GM") {
        var slider = document.getElementById("slots-win-chance");
        var label  = document.getElementById("slots-win-chance-label");
        if (slider) slider.value = Math.round(winChance);
        if (label)  label.textContent = Math.round(winChance);
      }
    },

    setupEvents: function() {
      var self = this;

      var btnPull = document.getElementById("btn-pull-slots");
      if (btnPull) {
        btnPull.addEventListener("click", function() {
          if (FortuneTable.state.isSlotsSpinning) return;
          FortuneTable.state.isSlotsSpinning = true;
          btnPull.disabled = true;
          FortuneTable.Audio.click();
          var result = self.calculateResult();
          self.spinReels(result.symbols, function() {
            FortuneTable.state.isSlotsSpinning = false;
            btnPull.disabled = false;
            self.showResult(result.isWin, FortuneTable.state.playerName, result.symbols);
            FortuneTable.Sync.broadcast(FortuneTable.CHANNELS.SLOTS_RESULT, {
              symbols: result.symbols, isWin: result.isWin, playerName: FortuneTable.state.playerName
            });
          });
        });
      }

      var slider = document.getElementById("slots-win-chance");
      var label  = document.getElementById("slots-win-chance-label");
      if (slider) {
        slider.addEventListener("input", function() {
          if (label) label.textContent = slider.value;
        });
      }

      var btnSave = document.getElementById("btn-save-slots-config");
      if (btnSave) {
        btnSave.addEventListener("click", function() {
          if (!slider) return;
          var val = parseInt(slider.value, 10);
          if (isNaN(val) || val < 0 || val > 100) val = 30;
          winChance = val;
          FortuneTable.Sync.saveSlotsConfig(val).then(function() {
            FortuneTable.Audio.click();
            btnSave.textContent = "✅ Salvo!";
            setTimeout(function() { btnSave.textContent = "💾 Salvar"; }, 1800);
          });
        });
      }

      var btnClear = document.getElementById("btn-clear-slots-history");
      if (btnClear) {
        btnClear.addEventListener("click", function() {
          FortuneTable.clearHistory("slots-history");
          FortuneTable.Sync.broadcast(FortuneTable.CHANNELS.CLEAR_HISTORY, { game: "slots" });
          FortuneTable.Audio.click();
        });
      }
    }
  };

})();
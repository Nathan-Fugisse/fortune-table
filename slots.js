/* ============================================
   SLOTS.JS
   Caça-níquel com 3 rolos e emojis.
   Probabilidade configurável pelo GM.
   ============================================ */

(function() {

  // Chance de vitória (em %, de 0 a 100)
  var winChance = 30;

  // Intervalos de animação dos 3 rolos
  var reelTimers = [null, null, null];

  FortuneTable.Slots = {

    /** Inicializa o módulo */
    init: function() {
      this.setupEvents();
      // Carrega a probabilidade configurada pelo GM
      FortuneTable.Sync.loadSlotsConfig().then(function(chance) {
        winChance = chance;
        // Atualiza o slider do GM
        var slider = document.getElementById("slots-win-chance");
        var label  = document.getElementById("slots-win-chance-label");
        if (slider) slider.value = Math.round(winChance);
        if (label)  label.textContent = Math.round(winChance);
      });
    },

    /**
     * Calcula o resultado da jogada.
     *
     * ⚠️ AVISO DE SEGURANÇA:
     * Este cálculo acontece no navegador do jogador.
     * Um jogador técnico PODE inspecionar e modificar este código.
     * Sem um servidor backend, não é possível evitar isso no OBR.
     *
     * @returns {{ symbols: string[], isWin: boolean }}
     */
    calculateResult: function() {
      var isWin = Math.random() * 100 < winChance;

      if (isWin) {
        // Vitória: 3 símbolos iguais
        var sym = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
        return { symbols: [sym, sym, sym], isWin: true };
      } else {
        // Derrota: garante que não sejam todos iguais
        var s1, s2, s3;
        do {
          s1 = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
          s2 = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
          s3 = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
        } while (s1 === s2 && s2 === s3);

        return { symbols: [s1, s2, s3], isWin: false };
      }
    },

    /**
     * Anima os 3 rolos e para em sequência.
     * @param {string[]}  targetSymbols - Os 3 símbolos finais
     * @param {Function}  onComplete    - Chamado quando todos pararem
     */
    spinReels: function(targetSymbols, onComplete) {
      var stopped = 0;

      for (var i = 0; i < 3; i++) {
        (function(idx) {
          var reel      = document.getElementById("reel-" + idx);
          var symbolEl  = reel ? reel.querySelector(".slot-symbol") : null;
          if (!symbolEl) return;

          // Adiciona efeito de brilho durante giro
          if (reel) reel.classList.add("spinning");

          // Troca símbolo rapidamente (efeito de giro)
          var speed = 55 + idx * 12;
          reelTimers[idx] = setInterval(function() {
            symbolEl.textContent = FortuneTable.randomFrom(FortuneTable.SLOT_SYMBOLS);
            FortuneTable.Audio.slotTick();
          }, speed);

          // Para cada rolo com um delay diferente
          var stopDelay = 900 + idx * 650 + Math.random() * 250;

          setTimeout(function() {
            // Para o giro
            clearInterval(reelTimers[idx]);
            reelTimers[idx] = null;

            // Remove efeito de brilho
            if (reel) reel.classList.remove("spinning");

            // Mostra símbolo final
            symbolEl.textContent = targetSymbols[idx];
            FortuneTable.Audio.slotStop();

            stopped++;
            if (stopped === 3 && onComplete) {
              onComplete();
            }
          }, stopDelay);
        })(i);
      }
    },

    /**
     * Para todos os rolos imediatamente (para resultado remoto).
     */
    stopReelsInstant: function(targetSymbols) {
      for (var i = 0; i < 3; i++) {
        if (reelTimers[i]) {
          clearInterval(reelTimers[i]);
          reelTimers[i] = null;
        }
        var reel = document.getElementById("reel-" + i);
        if (reel) {
          reel.classList.remove("spinning");
          var sym = reel.querySelector(".slot-symbol");
          if (sym) sym.textContent = targetSymbols[i];
        }
      }
    },

    /**
     * Mostra o resultado na tela.
     */
    showResult: function(isWin, playerName, symbols) {
      var box = document.getElementById("slots-result");
      if (!box) return;

      var symsStr = symbols.join(" ");

      if (isWin) {
        box.textContent = "🎉 " + playerName + " GANHOU! " + symsStr;
        box.className   = "result-box win celebrate";
        FortuneTable.Audio.slotWin();

        // Remove animação de celebração depois de um tempo
        setTimeout(function() { box.classList.remove("celebrate"); }, 2500);
      } else {
        box.textContent = "😔 " + playerName + " perdeu. " + symsStr;
        box.className   = "result-box lose";
        FortuneTable.Audio.slotLose();
      }

      var histText = symsStr + (isWin ? " — VITÓRIA! 🎉" : " — derrota 😔");
      FortuneTable.addHistoryEntry("slots-history", playerName, histText);
    },

    /** Atualiza a probabilidade quando o GM mudar via metadados */
    updateWinChance: function(newChance) {
      winChance = newChance;

      // Atualiza o slider do GM se ele estiver visível
      if (FortuneTable.state.role === "GM") {
        var slider = document.getElementById("slots-win-chance");
        var label  = document.getElementById("slots-win-chance-label");
        if (slider) slider.value = Math.round(winChance);
        if (label)  label.textContent = Math.round(winChance);
      }
    },

    /** Configura os eventos de clique */
    setupEvents: function() {
      var self = this;

      // Botão "Puxar Alavanca"
      var btnPull = document.getElementById("btn-pull-slots");
      if (btnPull) {
        btnPull.addEventListener("click", function() {
          if (FortuneTable.state.isSlotsSpinning) return;

          FortuneTable.state.isSlotsSpinning = true;
          btnPull.disabled = true;
          FortuneTable.Audio.click();

          // Calcula resultado
          var result = self.calculateResult();

          // Anima os rolos
          self.spinReels(result.symbols, function() {
            FortuneTable.state.isSlotsSpinning = false;
            btnPull.disabled = false;

            // Mostra resultado
            self.showResult(
              result.isWin,
              FortuneTable.state.playerName,
              result.symbols
            );

            // Envia para todos
            FortuneTable.Sync.broadcast(
              FortuneTable.CHANNELS.SLOTS_RESULT,
              {
                symbols:    result.symbols,
                isWin:      result.isWin,
                playerName: FortuneTable.state.playerName
              }
            );
          });
        });
      }

      // Slider de chance (GM)
      var slider = document.getElementById("slots-win-chance");
      var label  = document.getElementById("slots-win-chance-label");
      if (slider) {
        slider.addEventListener("input", function() {
          if (label) label.textContent = slider.value;
        });
      }

      // Botão "Salvar" da configuração do GM
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
            setTimeout(function() {
              btnSave.textContent = "💾 Salvar";
            }, 1800);
          });
        });
      }

      // Limpar histórico
      var btnClear = document.getElementById("btn-clear-slots-history");
      if (btnClear) {
        btnClear.addEventListener("click", function() {
          FortuneTable.clearHistory("slots-history");
          FortuneTable.Sync.broadcast(
            FortuneTable.CHANNELS.CLEAR_HISTORY,
            { game: "slots" }
          );
          FortuneTable.Audio.click();
        });
      }
    }
  };

})();
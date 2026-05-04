/* ============================================
   COINFLIP.JS
   Cara ou Coroa com animação CSS 3D.
   ============================================ */

(function() {

  FortuneTable.CoinFlip = {

    /** Inicializa o módulo */
    init: function() {
      this.setupEvents();

      // Define posição inicial da moeda (mostrando a cara)
      var coin = document.getElementById("coin");
      if (coin) coin.classList.add("result-heads");
    },

    /**
     * Executa o lançamento da moeda.
     * @param {Function} onResult - Chamado com ("heads" ou "tails")
     */
    flip: function(onResult) {
      if (FortuneTable.state.isFlipping) return;

      var coin = document.getElementById("coin");
      var btn  = document.getElementById("btn-flip-coin");
      if (!coin) return;

      FortuneTable.state.isFlipping = true;
      if (btn) btn.disabled = true;

      // Sorteia o resultado
      var result = Math.random() < 0.5 ? "heads" : "tails";

      // Limpa classes anteriores
      coin.classList.remove("flipping", "result-heads", "result-tails");

      FortuneTable.Audio.coinFlip();

      // Número de rotações completas (entre 5 e 8)
      var flips      = 5 + Math.floor(Math.random() * 4);
      // Rotação extra: 0 para cara, 180 para coroa
      var finalExtra = result === "heads" ? 0 : 180;
      // Rotação total em graus
      var finalRot   = flips * 360 + finalExtra;

      // Passa o valor para o CSS via variável customizada
      coin.style.setProperty("--flip-count", flips);
      coin.style.setProperty("--final-rotation", finalRot + "deg");

      // Força reflow para reiniciar animação (truque do CSS)
      void coin.offsetWidth;

      // Inicia animação
      coin.classList.add("flipping");

      // Calcula duração total
      var duration = flips * 550;

      setTimeout(function() {
        // Remove animação
        coin.classList.remove("flipping");

        // Aplica rotação final permanente
        coin.style.setProperty("--flip-count", "0");
        coin.style.setProperty("--final-rotation", "0deg");

        if (result === "heads") {
          coin.classList.add("result-heads");
        } else {
          coin.classList.add("result-tails");
        }

        FortuneTable.state.isFlipping = false;
        if (btn) btn.disabled = false;

        FortuneTable.Audio.coinResult();

        if (onResult) onResult(result);

      }, duration);
    },

    /**
     * Mostra o resultado de outro jogador (recebido via broadcast).
     */
    showRemoteResult: function(result, playerName) {
      if (FortuneTable.state.isFlipping) return;

      // Reutiliza a animação de flip
      var self = this;
      var coin = document.getElementById("coin");
      var btn  = document.getElementById("btn-flip-coin");

      if (!coin) return;

      FortuneTable.state.isFlipping = true;
      if (btn) btn.disabled = true;

      coin.classList.remove("flipping", "result-heads", "result-tails");

      FortuneTable.Audio.coinFlip();

      var flips      = 4 + Math.floor(Math.random() * 3);
      var finalExtra = result === "heads" ? 0 : 180;
      var finalRot   = flips * 360 + finalExtra;

      coin.style.setProperty("--flip-count", flips);
      coin.style.setProperty("--final-rotation", finalRot + "deg");

      void coin.offsetWidth;
      coin.classList.add("flipping");

      var duration = flips * 550;

      setTimeout(function() {
        coin.classList.remove("flipping");
        coin.style.setProperty("--flip-count", "0");
        coin.style.setProperty("--final-rotation", "0deg");

        if (result === "heads") {
          coin.classList.add("result-heads");
        } else {
          coin.classList.add("result-tails");
        }

        FortuneTable.state.isFlipping = false;
        if (btn) btn.disabled = false;

        FortuneTable.Audio.coinResult();

        // Exibe o resultado na tela
        var resultText = result === "heads" ? "👑 Cara!" : "🌿 Coroa!";
        var box = document.getElementById("coinflip-result");
        if (box) {
          box.textContent = playerName + " → " + resultText;
          box.className   = "result-box highlight";
        }

        FortuneTable.addHistoryEntry("coinflip-history", playerName, resultText);
      }, duration);
    },

    /** Configura os eventos de clique */
    setupEvents: function() {
      var self = this;

      // Botão "Jogar Moeda"
      var btnFlip = document.getElementById("btn-flip-coin");
      if (btnFlip) {
        btnFlip.addEventListener("click", function() {
          if (FortuneTable.state.isFlipping) return;

          FortuneTable.Audio.click();

          self.flip(function(result) {
            var resultText = result === "heads" ? "👑 Cara!" : "🌿 Coroa!";

            // Exibe resultado
            var box = document.getElementById("coinflip-result");
            if (box) {
              box.textContent = "Resultado: " + resultText;
              box.className   = "result-box highlight";
            }

            // Adiciona ao histórico
            FortuneTable.addHistoryEntry(
              "coinflip-history",
              FortuneTable.state.playerName,
              resultText
            );

            // Envia para todos
            FortuneTable.Sync.broadcast(
              FortuneTable.CHANNELS.COINFLIP_RESULT,
              {
                result:     result,
                playerName: FortuneTable.state.playerName
              }
            );
          });
        });
      }

      // Limpar histórico
      var btnClear = document.getElementById("btn-clear-coinflip-history");
      if (btnClear) {
        btnClear.addEventListener("click", function() {
          FortuneTable.clearHistory("coinflip-history");
          FortuneTable.Sync.broadcast(
            FortuneTable.CHANNELS.CLEAR_HISTORY,
            { game: "coinflip" }
          );
          FortuneTable.Audio.click();
        });
      }
    }
  };

})();
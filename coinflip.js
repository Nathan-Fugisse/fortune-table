(function() {

  FortuneTable.CoinFlip = {

    init: function() {
      this.setupEvents();
      var coin = document.getElementById("coin");
      if (coin) coin.classList.add("result-heads");
    },

    flip: function(onResult) {
      if (FortuneTable.state.isFlipping) return;
      var coin = document.getElementById("coin");
      var btn  = document.getElementById("btn-flip-coin");
      if (!coin) return;

      FortuneTable.state.isFlipping = true;
      if (btn) btn.disabled = true;

      var result     = Math.random() < 0.5 ? "heads" : "tails";
      var flips      = 5 + Math.floor(Math.random() * 4);
      var finalExtra = result === "heads" ? 0 : 180;
      var finalRot   = flips * 360 + finalExtra;

      coin.classList.remove("flipping", "result-heads", "result-tails");
      coin.style.setProperty("--flip-count", flips);
      coin.style.setProperty("--final-rotation", finalRot + "deg");

      FortuneTable.Audio.coinFlip();
      void coin.offsetWidth;
      coin.classList.add("flipping");

      setTimeout(function() {
        coin.classList.remove("flipping");
        if (result === "heads") { coin.classList.add("result-heads"); }
        else                    { coin.classList.add("result-tails"); }
        FortuneTable.state.isFlipping = false;
        if (btn) btn.disabled = false;
        FortuneTable.Audio.coinResult();
        if (onResult) onResult(result);
      }, flips * 550);
    },

    showRemoteResult: function(result, playerName) {
      if (FortuneTable.state.isFlipping) return;
      var self = this;
      var coin = document.getElementById("coin");
      var btn  = document.getElementById("btn-flip-coin");
      if (!coin) return;

      FortuneTable.state.isFlipping = true;
      if (btn) btn.disabled = true;

      var flips      = 4 + Math.floor(Math.random() * 3);
      var finalExtra = result === "heads" ? 0 : 180;
      var finalRot   = flips * 360 + finalExtra;

      coin.classList.remove("flipping", "result-heads", "result-tails");
      coin.style.setProperty("--flip-count", flips);
      coin.style.setProperty("--final-rotation", finalRot + "deg");

      FortuneTable.Audio.coinFlip();
      void coin.offsetWidth;
      coin.classList.add("flipping");

      setTimeout(function() {
        coin.classList.remove("flipping");
        if (result === "heads") { coin.classList.add("result-heads"); }
        else                    { coin.classList.add("result-tails"); }
        FortuneTable.state.isFlipping = false;
        if (btn) btn.disabled = false;
        FortuneTable.Audio.coinResult();
        var resultText = result === "heads" ? "👑 Cara!" : "🌿 Coroa!";
        var box = document.getElementById("coinflip-result");
        if (box) { box.textContent = playerName + " → " + resultText; box.className = "result-box highlight"; }
        FortuneTable.addHistoryEntry("coinflip-history", playerName, resultText);
      }, flips * 550);
    },

    setupEvents: function() {
      var self = this;

      var btnFlip = document.getElementById("btn-flip-coin");
      if (btnFlip) {
        btnFlip.addEventListener("click", function() {
          if (FortuneTable.state.isFlipping) return;
          FortuneTable.Audio.click();
          self.flip(function(result) {
            var resultText = result === "heads" ? "👑 Cara!" : "🌿 Coroa!";
            var box = document.getElementById("coinflip-result");
            if (box) { box.textContent = "Resultado: " + resultText; box.className = "result-box highlight"; }
            FortuneTable.addHistoryEntry("coinflip-history", FortuneTable.state.playerName, resultText);
            FortuneTable.Sync.broadcast(FortuneTable.CHANNELS.COINFLIP_RESULT, {
              result: result, playerName: FortuneTable.state.playerName
            });
          });
        });
      }

      var btnClear = document.getElementById("btn-clear-coinflip-history");
      if (btnClear) {
        btnClear.addEventListener("click", function() {
          FortuneTable.clearHistory("coinflip-history");
          FortuneTable.Sync.broadcast(FortuneTable.CHANNELS.CLEAR_HISTORY, { game: "coinflip" });
          FortuneTable.Audio.click();
        });
      }
    }
  };

})();
(function() {

  var canvas = null;
  var ctx    = null;
  var items  = [];
  var angle  = 0;
  var animId = null;
  var CX = 150, CY = 150, R = 138;

  FortuneTable.Roulette = {

    init: function(initialItems) {
      canvas = document.getElementById("roulette-canvas");
      if (!canvas) return;
      ctx   = canvas.getContext("2d");
      items = (initialItems && initialItems.length >= 2) ? initialItems : ["Opção 1","Opção 2","Opção 3"];
      this.draw();
      this.setupEvents();
    },

    setItems: function(newItems) {
      if (newItems && newItems.length >= 2) { items = newItems; this.draw(); }
    },

    getItems: function() { return items.slice(); },

    draw: function() {
      if (!ctx || items.length < 2) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var n   = items.length;
      var arc = (2 * Math.PI) / n;
      var colors = FortuneTable.ROULETTE_COLORS;

      for (var i = 0; i < n; i++) {
        var startAngle = angle + i * arc;
        var endAngle   = startAngle + arc;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign    = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle    = "#ffffff";
        ctx.shadowColor  = "rgba(0,0,0,0.6)";
        ctx.shadowBlur   = 3;
        ctx.font = (n <= 4 ? 14 : n <= 8 ? 12 : n <= 12 ? 11 : 10) + "px 'Segoe UI', sans-serif";
        var label = items[i].length > 13 ? items[i].substring(0, 11) + "…" : items[i];
        ctx.fillText(label, R - 10, 0);
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(CX, CY, 16, 0, 2 * Math.PI);
      ctx.fillStyle   = "#16162a";
      ctx.fill();
      ctx.strokeStyle = "#e94560";
      ctx.lineWidth   = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(CX, CY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#e94560";
      ctx.fill();
    },

    spin: function(onResult) {
      if (FortuneTable.state.isSpinning || items.length < 2) return;
      FortuneTable.state.isSpinning = true;

      var self   = this;
      var n      = items.length;
      var arc    = (2 * Math.PI) / n;
      var winner = Math.floor(Math.random() * n);
      var targetSegCenter = winner * arc + arc / 2;
      var randomOffset    = (Math.random() - 0.5) * arc * 0.65;
      var targetAngle     = -(Math.PI / 2) - targetSegCenter - randomOffset;
      var extraSpins      = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
      var totalSpin       = extraSpins + (targetAngle - angle);
      while (totalSpin < extraSpins) totalSpin += 2 * Math.PI;

      var startAngle = angle;
      var startTime  = null;
      var duration   = 4500 + Math.random() * 1500;
      var lastTick   = startAngle;

      function animate(ts) {
        if (!startTime) startTime = ts;
        var elapsed  = ts - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased    = FortuneTable.easeOutCubic(progress);
        angle = startAngle + totalSpin * eased;
        if (Math.abs(angle - lastTick) >= arc) { FortuneTable.Audio.tick(); lastTick = angle; }
        self.draw();
        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          angle = angle % (2 * Math.PI);
          if (angle < 0) angle += 2 * Math.PI;
          FortuneTable.state.isSpinning = false;
          FortuneTable.Audio.rouletteResult();
          if (onResult) onResult(winner, items[winner]);
        }
      }
      animId = requestAnimationFrame(animate);
    },

    showRemoteResult: function(winIndex, winItem, playerName) {
      if (FortuneTable.state.isSpinning) return;
      var self = this;
      var btn  = document.getElementById("btn-spin-roulette");
      FortuneTable.state.isSpinning = true;
      if (btn) btn.disabled = true;

      var n   = items.length;
      var arc = (2 * Math.PI) / n;
      if (winIndex < 0 || winIndex >= n) winIndex = 0;

      var targetSegCenter = winIndex * arc + arc / 2;
      var targetAngle     = -(Math.PI / 2) - targetSegCenter;
      var extraSpins      = (4 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
      var totalSpin       = extraSpins + (targetAngle - angle);
      while (totalSpin < extraSpins) totalSpin += 2 * Math.PI;

      var startAngle = angle;
      var startTime  = null;
      var duration   = 4000 + Math.random() * 1000;
      var lastTick   = startAngle;

      function animate(ts) {
        if (!startTime) startTime = ts;
        var elapsed  = ts - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased    = FortuneTable.easeOutCubic(progress);
        angle = startAngle + totalSpin * eased;
        if (Math.abs(angle - lastTick) >= arc) { FortuneTable.Audio.tick(); lastTick = angle; }
        self.draw();
        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          angle = angle % (2 * Math.PI);
          if (angle < 0) angle += 2 * Math.PI;
          FortuneTable.state.isSpinning = false;
          if (btn) btn.disabled = false;
          FortuneTable.Audio.rouletteResult();
          var box = document.getElementById("roulette-result");
          if (box) { box.textContent = "🎯 " + playerName + " → " + winItem; box.className = "result-box highlight"; }
          FortuneTable.addHistoryEntry("roulette-history", playerName, winItem);
        }
      }
      animId = requestAnimationFrame(animate);
    },

    setupEvents: function() {
      var self = this;

      var btnSpin = document.getElementById("btn-spin-roulette");
      if (btnSpin) {
        btnSpin.addEventListener("click", function() {
          if (FortuneTable.state.isSpinning) return;
          btnSpin.disabled = true;
          FortuneTable.Audio.click();
          self.spin(function(winIndex, winItem) {
            btnSpin.disabled = false;
            var box = document.getElementById("roulette-result");
            if (box) { box.textContent = "🎯 Resultado: " + winItem; box.className = "result-box highlight"; }
            FortuneTable.addHistoryEntry("roulette-history", FortuneTable.state.playerName, winItem);
            FortuneTable.Sync.broadcast(FortuneTable.CHANNELS.ROULETTE_RESULT, {
              winIndex: winIndex, winItem: winItem, playerName: FortuneTable.state.playerName
            });
          });
        });
      }

      var btnSave = document.getElementById("btn-save-roulette-items");
      if (btnSave) {
        btnSave.addEventListener("click", function() {
          var ta = document.getElementById("roulette-items-input");
          if (!ta) return;
          var newItems = ta.value.trim().split("\n")
            .map(function(l) { return l.trim(); })
            .filter(function(l) { return l.length > 0; });
          if (newItems.length < 2) { alert("Mínimo 2 opções."); return; }
          if (newItems.length > 20) { alert("Máximo 20 opções."); return; }
          FortuneTable.Sync.saveRouletteItems(newItems).then(function() {
            self.setItems(newItems);
            FortuneTable.Audio.click();
            btnSave.textContent = "✅ Salvo!";
            setTimeout(function() { btnSave.textContent = "💾 Salvar"; }, 1800);
          });
        });
      }

      var btnClear = document.getElementById("btn-clear-roulette-history");
      if (btnClear) {
        btnClear.addEventListener("click", function() {
          FortuneTable.clearHistory("roulette-history");
          FortuneTable.Sync.broadcast(FortuneTable.CHANNELS.CLEAR_HISTORY, { game: "roulette" });
          FortuneTable.Audio.click();
        });
      }
    }
  };

})();
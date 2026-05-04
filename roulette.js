/* ============================================
   ROULETTE.JS
   Roleta desenhada no canvas HTML5.
   Inspirada no visual do Wheel of Names.
   ============================================ */

(function() {

  // Variáveis internas do módulo
  var canvas    = null;
  var ctx       = null;
  var items     = [];          // Lista de opções atual
  var angle     = 0;           // Ângulo atual da roleta (em radianos)
  var animId    = null;        // ID do requestAnimationFrame

  // Centro e raio da roleta
  var CX = 150, CY = 150, R = 138;

  FortuneTable.Roulette = {

    /** Inicializa a roleta com uma lista inicial de itens */
    init: function(initialItems) {
      canvas = document.getElementById("roulette-canvas");
      if (!canvas) return;

      ctx   = canvas.getContext("2d");
      items = (initialItems && initialItems.length >= 2)
              ? initialItems
              : ["Opção 1", "Opção 2", "Opção 3"];

      this.draw();
      this.setupEvents();
    },

    /** Atualiza a lista e redesenha */
    setItems: function(newItems) {
      if (newItems && newItems.length >= 2) {
        items = newItems;
        this.draw();
      }
    },

    /** Retorna a lista atual (cópia) */
    getItems: function() {
      return items.slice();
    },

    /** Desenha a roleta completa no canvas */
    draw: function() {
      if (!ctx || items.length < 2) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var n      = items.length;
      var arc    = (2 * Math.PI) / n;
      var colors = FortuneTable.ROULETTE_COLORS;

      // Desenha cada segmento
      for (var i = 0; i < n; i++) {
        var startAngle = angle + i * arc;
        var endAngle   = startAngle + arc;

        // Fundo colorido do segmento
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        // Borda fina entre segmentos
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Texto do segmento
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign    = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle    = "#ffffff";
        ctx.shadowColor  = "rgba(0,0,0,0.6)";
        ctx.shadowBlur   = 3;
        ctx.font         = this.getFontSize(n) + "px 'Segoe UI', sans-serif";

        // Trunca texto longo
        var label = items[i].length > 13
          ? items[i].substring(0, 11) + "…"
          : items[i];

        ctx.fillText(label, R - 10, 0);
        ctx.restore();
      }

      // Círculo central decorativo
      ctx.beginPath();
      ctx.arc(CX, CY, 16, 0, 2 * Math.PI);
      ctx.fillStyle   = "#16162a";
      ctx.fill();
      ctx.strokeStyle = "#e94560";
      ctx.lineWidth   = 3;
      ctx.stroke();

      // Ponto central
      ctx.beginPath();
      ctx.arc(CX, CY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#e94560";
      ctx.fill();
    },

    /** Calcula o tamanho da fonte baseado no número de segmentos */
    getFontSize: function(n) {
      if (n <= 4)  return 14;
      if (n <= 8)  return 12;
      if (n <= 12) return 11;
      if (n <= 16) return 10;
      return 9;
    },

    /**
     * Gira a roleta até um segmento aleatório.
     * @param {Function} onResult - Chamado com (index, nomeDoItem)
     */
    spin: function(onResult) {
      if (FortuneTable.state.isSpinning) return;
      if (items.length < 2) return;

      FortuneTable.state.isSpinning = true;

      var self      = this;
      var n         = items.length;
      var arc       = (2 * Math.PI) / n;

      // Escolhe o vencedor aleatoriamente
      var winner    = Math.floor(Math.random() * n);

      // Calcula quantos graus girar para que o vencedor fique sob o ponteiro
      // O ponteiro está no TOPO da roleta (posição -PI/2)
      var targetSegCenter = winner * arc + arc / 2;
      // Adiciona um offset aleatório dentro do segmento (mais realista)
      var randomOffset    = (Math.random() - 0.5) * arc * 0.65;
      // Ângulo final desejado
      var targetAngle     = -(Math.PI / 2) - targetSegCenter - randomOffset;

      // Adiciona voltas extras para parecer que está realmente girando (5 a 8 voltas)
      var extraSpins  = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
      var totalSpin   = extraSpins + (targetAngle - angle);

      // Garante que a rotação seja sempre positiva (sentido horário)
      while (totalSpin < extraSpins) {
        totalSpin += 2 * Math.PI;
      }

      var startAngle  = angle;
      var startTime   = null;
      var duration    = 4500 + Math.random() * 1500; // 4.5 a 6 segundos
      var lastTick    = startAngle;

      function animate(ts) {
        if (!startTime) startTime = ts;

        var elapsed  = ts - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased    = FortuneTable.easeOutCubic(progress);

        angle = startAngle + totalSpin * eased;

        // Toca um tick a cada segmento que passa
        if (Math.abs(angle - lastTick) >= arc) {
          FortuneTable.Audio.tick();
          lastTick = angle;
        }

        self.draw();

        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          // Giro terminou
          angle = angle % (2 * Math.PI);
          if (angle < 0) angle += 2 * Math.PI;

          FortuneTable.state.isSpinning = false;
          FortuneTable.Audio.rouletteResult();

          if (onResult) onResult(winner, items[winner]);
        }
      }

      animId = requestAnimationFrame(animate);
    },

    /**
     * Mostra o resultado de outro jogador (recebido via broadcast).
     * Anima a roleta localmente até o mesmo resultado.
     */
    showRemoteResult: function(winIndex, winItem, playerName) {
      if (FortuneTable.state.isSpinning) return;

      var self = this;
      var btn  = document.getElementById("btn-spin-roulette");

      FortuneTable.state.isSpinning = true;
      if (btn) btn.disabled = true;

      var n   = items.length;
      var arc = (2 * Math.PI) / n;

      // Garante que o índice é válido
      if (winIndex < 0 || winIndex >= n) winIndex = 0;

      var targetSegCenter = winIndex * arc + arc / 2;
      var targetAngle     = -(Math.PI / 2) - targetSegCenter;
      var extraSpins      = (4 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
      var totalSpin       = extraSpins + (targetAngle - angle);

      while (totalSpin < extraSpins) {
        totalSpin += 2 * Math.PI;
      }

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

        if (Math.abs(angle - lastTick) >= arc) {
          FortuneTable.Audio.tick();
          lastTick = angle;
        }

        self.draw();

        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          angle = angle % (2 * Math.PI);
          if (angle < 0) angle += 2 * Math.PI;

          FortuneTable.state.isSpinning = false;
          if (btn) btn.disabled = false;

          FortuneTable.Audio.rouletteResult();

          // Exibe resultado na tela
          var box = document.getElementById("roulette-result");
          if (box) {
            box.textContent = "🎯 " + playerName + " → " + winItem;
            box.className   = "result-box highlight";
          }

          FortuneTable.addHistoryEntry("roulette-history", playerName, winItem);
        }
      }

      animId = requestAnimationFrame(animate);
    },

    /** Configura os eventos de clique da interface */
    setupEvents: function() {
      var self = this;

      // Botão "Girar Roleta"
      var btnSpin = document.getElementById("btn-spin-roulette");
      if (btnSpin) {
        btnSpin.addEventListener("click", function() {
          if (FortuneTable.state.isSpinning) return;

          // Desabilita botão durante o giro
          btnSpin.disabled = true;
          FortuneTable.Audio.click();

          self.spin(function(winIndex, winItem) {
            // Reabilita botão
            btnSpin.disabled = false;

            // Exibe resultado local
            var box = document.getElementById("roulette-result");
            if (box) {
              box.textContent = "🎯 Resultado: " + winItem;
              box.className   = "result-box highlight";
            }

            // Adiciona ao histórico
            FortuneTable.addHistoryEntry(
              "roulette-history",
              FortuneTable.state.playerName,
              winItem
            );

            // Envia resultado para todos na sala
            FortuneTable.Sync.broadcast(
              FortuneTable.CHANNELS.ROULETTE_RESULT,
              {
                winIndex:   winIndex,
                winItem:    winItem,
                playerName: FortuneTable.state.playerName
              }
            );
          });
        });
      }

      // Botão "Salvar Opções" (GM)
      var btnSave = document.getElementById("btn-save-roulette-items");
      if (btnSave) {
        btnSave.addEventListener("click", function() {
          var ta = document.getElementById("roulette-items-input");
          if (!ta) return;

          // Processa o texto: quebra por linha, remove espaços e vazios
          var newItems = ta.value.trim()
            .split("\n")
            .map(function(l) { return l.trim(); })
            .filter(function(l) { return l.length > 0; });

          if (newItems.length < 2) {
            alert("Adicione pelo menos 2 opções.");
            return;
          }
          if (newItems.length > 20) {
            alert("Máximo de 20 opções permitidas.");
            return;
          }

          // Salva nos metadados da sala (sincroniza para todos)
          FortuneTable.Sync.saveRouletteItems(newItems).then(function() {
            self.setItems(newItems);
            FortuneTable.Audio.click();

            btnSave.textContent = "✅ Salvo!";
            setTimeout(function() {
              btnSave.textContent = "💾 Salvar Opções";
            }, 1800);
          }).catch(function(e) {
            console.error("[Fortune Table] Erro ao salvar:", e);
            alert("Erro ao salvar. Verifique o console.");
          });
        });
      }

      // Botão "Limpar Histórico"
      var btnClear = document.getElementById("btn-clear-roulette-history");
      if (btnClear) {
        btnClear.addEventListener("click", function() {
          FortuneTable.clearHistory("roulette-history");
          // Avisa todos para limparem também
          FortuneTable.Sync.broadcast(
            FortuneTable.CHANNELS.CLEAR_HISTORY,
            { game: "roulette" }
          );
          FortuneTable.Audio.click();
        });
      }
    }
  };

})();
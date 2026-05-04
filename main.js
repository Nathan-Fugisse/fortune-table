/* ============================================
   MAIN.JS
   Ponto de entrada da extensão.
   ============================================ */

(function() {

  /**
   * Função principal.
   * NÃO verificamos window.OBR antes — usamos OBR.onReady
   * diretamente, que é a forma correta no ambiente do OBR.
   */
  function inicializar() {

    FortuneTable.Sync.init(function(role, playerName) {

      console.log("[Fortune Table] Iniciado como:", role, "—", playerName);

      FortuneTable.state.role = role;
      FortuneTable.state.playerName = playerName;

      // Esconde carregamento
      var loading = document.getElementById("loading-screen");
      if (loading) loading.classList.add("hidden");

      // Mostra a aplicação
      var app = document.getElementById("app");
      if (app) app.classList.remove("hidden");

      // Configura painéis do GM
      configurarPaineisGM(role);

      // Configura abas
      configurarAbas();

      // Configura botões globais
      configurarControlesGlobais();

      // Inicializa os minigames
      inicializarMinigames();

      // Escuta resultados de outros jogadores
      escutarBroadcasts();

      // Escuta mudanças de configuração
      escutarMetadados();

      // Ajusta a altura do popover
      try {
        OBR.action.setHeight(700);
      } catch(e) {
        console.log("[Fortune Table] Não foi possível ajustar altura");
      }
    });
  }

  function configurarPaineisGM(role) {
    var paineis = document.querySelectorAll(".gm-panel");
    for (var i = 0; i < paineis.length; i++) {
      if (role === "GM") {
        paineis[i].classList.remove("hidden");
      } else {
        paineis[i].classList.add("hidden");
      }
    }
  }

  function configurarAbas() {
    var botoes = document.querySelectorAll(".tab-btn");
    var conteudos = document.querySelectorAll(".tab-content");

    botoes.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var alvo = btn.getAttribute("data-tab");

        FortuneTable.Audio.click();

        botoes.forEach(function(b) {
          b.classList.remove("active");
        });
        conteudos.forEach(function(c) {
          c.classList.add("hidden");
          c.classList.remove("active");
        });

        btn.classList.add("active");
        var secao = document.getElementById("tab-" + alvo);
        if (secao) {
          secao.classList.remove("hidden");
          secao.classList.add("active");
        }
      });
    });
  }

  function configurarControlesGlobais() {
    var btnSom = document.getElementById("btn-toggle-sound");
    if (btnSom) {
      btnSom.addEventListener("click", function() {
        FortuneTable.state.soundEnabled = !FortuneTable.state.soundEnabled;
        if (FortuneTable.state.soundEnabled) {
          btnSom.textContent = "🔊";
          btnSom.classList.remove("off");
          FortuneTable.Audio.click();
        } else {
          btnSom.textContent = "🔇";
          btnSom.classList.add("off");
        }
      });
    }

    var btnAnim = document.getElementById("btn-toggle-anim");
    if (btnAnim) {
      btnAnim.addEventListener("click", function() {
        FortuneTable.state.animationsEnabled = !FortuneTable.state.animationsEnabled;
        if (FortuneTable.state.animationsEnabled) {
          btnAnim.textContent = "✨";
          btnAnim.classList.remove("off");
          document.body.classList.remove("no-animations");
        } else {
          btnAnim.textContent = "🚫";
          btnAnim.classList.add("off");
          document.body.classList.add("no-animations");
        }
        FortuneTable.Audio.click();
      });
    }
  }

  function inicializarMinigames() {
    FortuneTable.Sync.loadRouletteItems().then(function(itens) {
      FortuneTable.Roulette.init(itens);

      if (FortuneTable.state.role === "GM") {
        var ta = document.getElementById("roulette-items-input");
        if (ta) ta.value = itens.join("\n");
      }
    }).catch(function() {
      FortuneTable.Roulette.init([
        "Guerreiro", "Mago", "Ladino", "Clérigo",
        "Bardo", "Ranger", "Paladino", "Druida"
      ]);
    });

    FortuneTable.Slots.init();
    FortuneTable.CoinFlip.init();
  }

  function escutarBroadcasts() {
    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.ROULETTE_RESULT,
      function(data) {
        if (!data || typeof data.winIndex === "undefined") return;
        FortuneTable.Roulette.showRemoteResult(
          data.winIndex, data.winItem, data.playerName
        );
      }
    );

    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.SLOTS_RESULT,
      function(data) {
        if (!data || !data.symbols) return;
        if (FortuneTable.state.isSlotsSpinning) return;

        var btn = document.getElementById("btn-pull-slots");
        FortuneTable.state.isSlotsSpinning = true;
        if (btn) btn.disabled = true;

        FortuneTable.Slots.spinReels(data.symbols, function() {
          FortuneTable.state.isSlotsSpinning = false;
          if (btn) btn.disabled = false;
          FortuneTable.Slots.showResult(
            data.isWin, data.playerName, data.symbols
          );
        });
      }
    );

    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.COINFLIP_RESULT,
      function(data) {
        if (!data || !data.result) return;
        FortuneTable.CoinFlip.showRemoteResult(
          data.result, data.playerName
        );
      }
    );

    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.CLEAR_HISTORY,
      function(data) {
        if (!data || !data.game) return;
        var mapas = {
          "roulette": "roulette-history",
          "slots": "slots-history",
          "coinflip": "coinflip-history"
        };
        var listId = mapas[data.game];
        if (listId) FortuneTable.clearHistory(listId);
      }
    );
  }

  function escutarMetadados() {
    FortuneTable.Sync.onMetadataChange(function(meta) {
      if (!meta) return;

      var rKey = FortuneTable.METADATA_KEYS.ROULETTE_ITEMS;
      if (meta[rKey]) {
        var novosItens = meta[rKey];
        var itensAtuais = FortuneTable.Roulette.getItems();
        if (JSON.stringify(itensAtuais) !== JSON.stringify(novosItens)) {
          FortuneTable.Roulette.setItems(novosItens);
          if (FortuneTable.state.role === "GM") {
            var ta = document.getElementById("roulette-items-input");
            if (ta) ta.value = novosItens.join("\n");
          }
        }
      }

      var sKey = FortuneTable.METADATA_KEYS.SLOTS_CONFIG;
      if (meta[sKey]) {
        var novaChance = FortuneTable.deobfuscateValue(meta[sKey]);
        FortuneTable.Slots.updateWinChance(novaChance);
      }
    });
  }

  /* ============================================
     INICIAR — Chama diretamente sem verificar
     window.OBR porque dentro do OBR o SDK
     sempre está disponível via o script CDN
     ============================================ */
  inicializar();

})();

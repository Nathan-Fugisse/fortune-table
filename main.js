/* ============================================
   MAIN.JS
   Ponto de entrada da extensão.
   Inicializa tudo e conecta os módulos.
   ============================================ */

(function() {

  /**
   * Função principal — chamada quando o OBR SDK está pronto.
   */
  function inicializar() {

    FortuneTable.Sync.init(function(role, playerName) {

      console.log(
        "[Fortune Table] Iniciado como:",
        role, "—", playerName
      );

      // Salva no estado global
      FortuneTable.state.role       = role;
      FortuneTable.state.playerName = playerName;

      // 1. Esconde a tela de carregamento
      var loading = document.getElementById("loading-screen");
      if (loading) loading.classList.add("hidden");

      // 2. Mostra a aplicação
      var app = document.getElementById("app");
      if (app) app.classList.remove("hidden");

      // 3. Configura os painéis de GM
      configurarPaineisGM(role);

      // 4. Configura a navegação por abas
      configurarAbas();

      // 5. Configura os botões globais (som e animações)
      configurarControlesGlobais();

      // 6. Carrega configurações e inicializa cada minigame
      inicializarMinigames();

      // 7. Escuta mensagens dos outros jogadores
      escutarBroadcasts();

      // 8. Escuta mudanças de configuração da sala
      escutarMetadados();
    });
  }

  /**
   * Mostra ou esconde elementos exclusivos do GM.
   */
  function configurarPaineisGM(role) {
    var paineis = document.querySelectorAll(".gm-panel");
    for (var i = 0; i < paineis.length; i++) {
      if (role === "GM") {
        paineis[i].classList.remove("hidden");
      } else {
        // Jogadores NUNCA veem os painéis de GM
        paineis[i].classList.add("hidden");
      }
    }
  }

  /**
   * Configura a troca de abas (Roleta / Caça-níquel / Moeda).
   */
  function configurarAbas() {
    var botoes    = document.querySelectorAll(".tab-btn");
    var conteudos = document.querySelectorAll(".tab-content");

    botoes.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var alvo = btn.getAttribute("data-tab");

        FortuneTable.Audio.click();

        // Remove ativo de todos
        botoes.forEach(function(b) {
          b.classList.remove("active");
        });
        conteudos.forEach(function(c) {
          c.classList.add("hidden");
          c.classList.remove("active");
        });

        // Ativa o selecionado
        btn.classList.add("active");
        var secao = document.getElementById("tab-" + alvo);
        if (secao) {
          secao.classList.remove("hidden");
          secao.classList.add("active");
        }
      });
    });
  }

  /**
   * Configura os botões de Som e Animações no cabeçalho.
   */
  function configurarControlesGlobais() {

    // --- BOTÃO DE SOM ---
    var btnSom = document.getElementById("btn-toggle-sound");
    if (btnSom) {
      btnSom.addEventListener("click", function() {
        FortuneTable.state.soundEnabled = !FortuneTable.state.soundEnabled;

        if (FortuneTable.state.soundEnabled) {
          btnSom.textContent = "🔊";
          btnSom.classList.remove("off");
          FortuneTable.Audio.click(); // confirma com som
        } else {
          btnSom.textContent = "🔇";
          btnSom.classList.add("off");
        }
      });
    }

    // --- BOTÃO DE ANIMAÇÕES ---
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

  /**
   * Carrega configurações da sala e inicializa cada minigame.
   */
  function inicializarMinigames() {

    // Carrega itens da roleta e inicializa
    FortuneTable.Sync.loadRouletteItems().then(function(itens) {
      FortuneTable.Roulette.init(itens);

      // Preenche o textarea do GM com os itens atuais
      if (FortuneTable.state.role === "GM") {
        var ta = document.getElementById("roulette-items-input");
        if (ta) ta.value = itens.join("\n");
      }
    }).catch(function() {
      // Se falhar, inicializa com padrão
      FortuneTable.Roulette.init([
        "Guerreiro","Mago","Ladino","Clérigo",
        "Bardo","Ranger","Paladino","Druida"
      ]);
    });

    // Inicializa o caça-níquel (carrega probabilidade internamente)
    FortuneTable.Slots.init();

    // Inicializa cara ou coroa
    FortuneTable.CoinFlip.init();
  }

  /**
   * Configura a escuta de mensagens em tempo real dos outros jogadores.
   */
  function escutarBroadcasts() {

    /* ---- ROLETA ---- */
    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.ROULETTE_RESULT,
      function(data) {
        if (!data || typeof data.winIndex === "undefined") return;

        FortuneTable.Roulette.showRemoteResult(
          data.winIndex,
          data.winItem,
          data.playerName
        );
      }
    );

    /* ---- CAÇA-NÍQUEL ---- */
    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.SLOTS_RESULT,
      function(data) {
        if (!data || !data.symbols) return;
        if (FortuneTable.state.isSlotsSpinning) return;

        var btn = document.getElementById("btn-pull-slots");

        FortuneTable.state.isSlotsSpinning = true;
        if (btn) btn.disabled = true;

        // Anima os rolos até o resultado recebido
        FortuneTable.Slots.spinReels(data.symbols, function() {
          FortuneTable.state.isSlotsSpinning = false;
          if (btn) btn.disabled = false;

          FortuneTable.Slots.showResult(
            data.isWin,
            data.playerName,
            data.symbols
          );
        });
      }
    );

    /* ---- CARA OU COROA ---- */
    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.COINFLIP_RESULT,
      function(data) {
        if (!data || !data.result) return;

        FortuneTable.CoinFlip.showRemoteResult(
          data.result,
          data.playerName
        );
      }
    );

    /* ---- LIMPAR HISTÓRICO ---- */
    FortuneTable.Sync.onBroadcast(
      FortuneTable.CHANNELS.CLEAR_HISTORY,
      function(data) {
        if (!data || !data.game) return;

        var mapas = {
          "roulette": "roulette-history",
          "slots":    "slots-history",
          "coinflip": "coinflip-history"
        };

        var listId = mapas[data.game];
        if (listId) FortuneTable.clearHistory(listId);
      }
    );
  }

  /**
   * Escuta mudanças nos metadados da sala.
   * Isso atualiza a roleta e o caça-níquel em tempo real
   * quando o GM altera as configurações.
   */
  function escutarMetadados() {
    FortuneTable.Sync.onMetadataChange(function(meta) {
      if (!meta) return;

      // ---- Atualiza itens da roleta ----
      var rKey = FortuneTable.METADATA_KEYS.ROULETTE_ITEMS;
      if (meta[rKey]) {
        var novosItens    = meta[rKey];
        var itensAtuais   = FortuneTable.Roulette.getItems();

        // Só atualiza se mudou
        if (JSON.stringify(itensAtuais) !== JSON.stringify(novosItens)) {
          FortuneTable.Roulette.setItems(novosItens);

          // Atualiza textarea do GM também
          if (FortuneTable.state.role === "GM") {
            var ta = document.getElementById("roulette-items-input");
            if (ta) ta.value = novosItens.join("\n");
          }
        }
      }

      // ---- Atualiza probabilidade do slot ----
      var sKey = FortuneTable.METADATA_KEYS.SLOTS_CONFIG;
      if (meta[sKey]) {
        var novaChance = FortuneTable.deobfuscateValue(meta[sKey]);
        FortuneTable.Slots.updateWinChance(novaChance);
      }
    });
  }

  /* ============================================
     INICIALIZAÇÃO
     ============================================ */

  // Verifica se o SDK do OBR está disponível
  if (typeof window.OBR !== "undefined") {
    inicializar();
  } else {
    // Espera o script CDN carregar completamente
    window.addEventListener("load", function() {
      if (typeof window.OBR !== "undefined") {
        inicializar();
      } else {
        // Mostra erro na tela de carregamento
        var loading = document.getElementById("loading-screen");
        if (loading) {
          loading.innerHTML =
            "<div style='padding:20px; text-align:center;'>" +
            "<p style='color:#e94560; font-size:16px;'>⚠️ Erro de Conexão</p>" +
            "<p style='color:#a0a0c0; margin-top:10px; font-size:13px;'>" +
            "Esta extensão precisa ser carregada <strong>dentro do Owlbear Rodeo</strong>." +
            "<br><br>Se você está testando localmente, verifique se:" +
            "<br>• O servidor está rodando (npm run dev)" +
            "<br>• A URL foi adicionada ao OBR" +
            "</p></div>";
        }
        console.error("[Fortune Table] OBR SDK não encontrado.");
      }
    });
  }

})();
(function() {

  function inicializar() {
    FortuneTable.Sync.init(function(role, playerName) {
      console.log("[Fortune Table] Iniciado como:", role, "—", playerName);

      FortuneTable.state.role       = role;
      FortuneTable.state.playerName = playerName;

      var loading = document.getElementById("loading-screen");
      if (loading) loading.classList.add("hidden");

      var app = document.getElementById("app");
      if (app) app.classList.remove("hidden");

      configurarPaineisGM(role);
      configurarAbas();
      configurarControlesGlobais();
      inicializarMinigames();
      escutarBroadcasts();
      escutarMetadados();
    });
  }

  function configurarPaineisGM(role) {
    var paineis = document.querySelectorAll(".gm-panel");
    for (var i = 0; i < paineis.length; i++) {
      if (role === "GM") { paineis[i].classList.remove("hidden"); }
      else               { paineis[i].classList.add("hidden"); }
    }
  }

  function configurarAbas() {
    var botoes    = document.querySelectorAll(".tab-btn");
    var conteudos = document.querySelectorAll(".tab-content");
    botoes.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var alvo = btn.getAttribute("data-tab");
        FortuneTable.Audio.click();
        botoes.forEach(function(b)    { b.classList.remove("active"); });
        conteudos.forEach(function(c) { c.classList.add("hidden"); c.classList.remove("active"); });
        btn.classList.add("active");
        var secao = document.getElementById("tab-" + alvo);
        if (secao) { secao.classList.remove("hidden"); secao.classList.add("active"); }
      });
    });
  }

  function configurarControlesGlobais() {
    var btnSom = document.getElementById("btn-toggle-sound");
    if (btnSom) {
      btnSom.addEventListener("click", function() {
        FortuneTable.state.soundEnabled = !FortuneTable.state.soundEnabled;
        btnSom.textContent = FortuneTable.state.soundEnabled ? "🔊" : "🔇";
        btnSom.classList.toggle("off", !FortuneTable.state.soundEnabled);
        if (FortuneTable.state.soundEnabled) FortuneTable.Audio.click();
      });
    }

    var btnAnim = document.getElementById("btn-toggle-anim");
    if (btnAnim) {
      btnAnim.addEventListener("click", function() {
        FortuneTable.state.animationsEnabled = !FortuneTable.state.animationsEnabled;
        btnAnim.textContent = FortuneTable.state.animationsEnabled ? "✨" : "🚫";
        btnAnim.classList.toggle("off", !FortuneTable.state.animationsEnabled);
        document.body.classList.toggle("no-animations", !FortuneTable.state.animationsEnabled);
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
      FortuneTable.Roulette.init(["Guerreiro","Mago","Ladino","Clérigo","Bardo","Ranger","Paladino","Druida"]);
    });
    FortuneTable.Slots.init();
    FortuneTable.CoinFlip.init();
  }

  function escutarBroadcasts() {
    FortuneTable.Sync.onBroadcast(FortuneTable.CHANNELS.ROULETTE_RESULT, function(data) {
      if (!data || typeof data.winIndex === "undefined") return;
      FortuneTable.Roulette.showRemoteResult(data.winIndex, data.winItem, data.playerName);
    });

    FortuneTable.Sync.onBroadcast(FortuneTable.CHANNELS.SLOTS_RESULT, function(data) {
      if (!data || !data.symbols || FortuneTable.state.isSlotsSpinning) return;
      var btn = document.getElementById("btn-pull-slots");
      FortuneTable.state.isSlotsSpinning = true;
      if (btn) btn.disabled = true;
      FortuneTable.Slots.spinReels(data.symbols, function() {
        FortuneTable.state.isSlotsSpinning = false;
        if (btn) btn.disabled = false;
        FortuneTable.Slots.showResult(data.isWin, data.playerName, data.symbols);
      });
    });

    FortuneTable.Sync.onBroadcast(FortuneTable.CHANNELS.COINFLIP_RESULT, function(data) {
      if (!data || !data.result) return;
      FortuneTable.CoinFlip.showRemoteResult(data.result, data.playerName);
    });

    FortuneTable.Sync.onBroadcast(FortuneTable.CHANNELS.CLEAR_HISTORY, function(data) {
      if (!data || !data.game) return;
      var mapas = { "roulette": "roulette-history", "slots": "slots-history", "coinflip": "coinflip-history" };
      if (mapas[data.game]) FortuneTable.clearHistory(mapas[data.game]);
    });
  }

  function escutarMetadados() {
    FortuneTable.Sync.onMetadataChange(function(meta) {
      if (!meta) return;
      var rKey = FortuneTable.METADATA_KEYS.ROULETTE_ITEMS;
      if (meta[rKey]) {
        var novosItens  = meta[rKey];
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
      if (meta[sKey]) FortuneTable.Slots.updateWinChance(FortuneTable.deobfuscateValue(meta[sKey]));
    });
  }

  inicializar();

})();
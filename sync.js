/* ============================================
   SYNC.JS
   Comunicação com o SDK do Owlbear Rodeo.
   ============================================ */

(function() {

  FortuneTable.Sync = {

    /**
     * Inicializa a extensão.
     * Usa OBR.onReady que é a forma correta de esperar o SDK.
     */
    init: function(callback) {
      // OBR.onReady funciona mesmo que o OBR ainda não esteja
      // totalmente carregado — ele espera automaticamente
      OBR.onReady(function() {
        console.log("[Fortune Table] OBR SDK pronto!");

        Promise.all([
          OBR.player.getRole(),
          OBR.player.getName()
        ]).then(function(results) {
          var role = results[0];
          var playerName = results[1];
          console.log("[Fortune Table] Role:", role, "Nome:", playerName);
          callback(role, playerName);
        }).catch(function(err) {
          console.error("[Fortune Table] Erro ao obter dados do jogador:", err);
          callback("PLAYER", "Jogador");
        });
      });
    },

    /** Lê os metadados da sala */
    getMetadata: function() {
      return OBR.room.getMetadata();
    },

    /** Salva dados nos metadados da sala */
    setMetadata: function(data) {
      return OBR.room.setMetadata(data);
    },

    /** Escuta mudanças nos metadados */
    onMetadataChange: function(callback) {
      OBR.room.onMetadataChange(callback);
    },

    /** Envia mensagem para todos na sala */
    broadcast: function(channel, data) {
      OBR.broadcast.sendMessage(channel, data, { destination: "ALL" });
    },

    /** Escuta mensagens de um canal */
    onBroadcast: function(channel, callback) {
      OBR.broadcast.onMessage(channel, function(event) {
        callback(event.data);
      });
    },

    /** Carrega itens da roleta dos metadados */
    loadRouletteItems: function() {
      return this.getMetadata().then(function(meta) {
        var key = FortuneTable.METADATA_KEYS.ROULETTE_ITEMS;
        if (meta && meta[key] && meta[key].length > 0) {
          return meta[key];
        }
        return [
          "Guerreiro", "Mago", "Ladino", "Clérigo",
          "Bardo", "Ranger", "Paladino", "Druida"
        ];
      });
    },

    /** Salva itens da roleta */
    saveRouletteItems: function(items) {
      var data = {};
      data[FortuneTable.METADATA_KEYS.ROULETTE_ITEMS] = items;
      return this.setMetadata(data);
    },

    /** Carrega configuração do caça-níquel */
    loadSlotsConfig: function() {
      return this.getMetadata().then(function(meta) {
        var key = FortuneTable.METADATA_KEYS.SLOTS_CONFIG;
        if (meta && meta[key]) {
          return FortuneTable.deobfuscateValue(meta[key]);
        }
        return 30;
      });
    },

    /** Salva configuração do caça-níquel */
    saveSlotsConfig: function(chance) {
      var data = {};
      data[FortuneTable.METADATA_KEYS.SLOTS_CONFIG] =
        FortuneTable.obfuscateValue(chance);
      return this.setMetadata(data);
    }
  };

})();

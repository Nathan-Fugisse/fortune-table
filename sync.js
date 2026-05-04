(function() {

  FortuneTable.Sync = {

    init: function(callback) {
      OBR.onReady(function() {
        console.log("[Fortune Table] OBR pronto!");
        Promise.all([
          OBR.player.getRole(),
          OBR.player.getName()
        ]).then(function(results) {
          callback(results[0], results[1]);
        }).catch(function(err) {
          console.error("[Fortune Table] Erro:", err);
          callback("PLAYER", "Jogador");
        });
      });
    },

    getMetadata: function() {
      return OBR.room.getMetadata();
    },

    setMetadata: function(data) {
      return OBR.room.setMetadata(data);
    },

    onMetadataChange: function(callback) {
      OBR.room.onMetadataChange(callback);
    },

    broadcast: function(channel, data) {
      OBR.broadcast.sendMessage(channel, data, { destination: "ALL" });
    },

    onBroadcast: function(channel, callback) {
      OBR.broadcast.onMessage(channel, function(event) {
        callback(event.data);
      });
    },

    loadRouletteItems: function() {
      return this.getMetadata().then(function(meta) {
        var key = FortuneTable.METADATA_KEYS.ROULETTE_ITEMS;
        if (meta && meta[key] && meta[key].length > 0) return meta[key];
        return ["Guerreiro","Mago","Ladino","Clérigo","Bardo","Ranger","Paladino","Druida"];
      });
    },

    saveRouletteItems: function(items) {
      var data = {};
      data[FortuneTable.METADATA_KEYS.ROULETTE_ITEMS] = items;
      return this.setMetadata(data);
    },

    loadSlotsConfig: function() {
      return this.getMetadata().then(function(meta) {
        var key = FortuneTable.METADATA_KEYS.SLOTS_CONFIG;
        if (meta && meta[key]) return FortuneTable.deobfuscateValue(meta[key]);
        return 30;
      });
    },

    saveSlotsConfig: function(chance) {
      var data = {};
      data[FortuneTable.METADATA_KEYS.SLOTS_CONFIG] = FortuneTable.obfuscateValue(chance);
      return this.setMetadata(data);
    }
  };

})();
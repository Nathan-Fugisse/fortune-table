/* ============================================
   SYNC.JS
   Comunicação com o SDK do Owlbear Rodeo.
   Gerencia metadados e mensagens em tempo real.
   ============================================ */

(function() {

  // O SDK do OBR fica disponível como window.OBR
  // após o script CDN ser carregado no index.html
  var OBR = window.OBR;

  FortuneTable.Sync = {

    /**
     * Inicializa a extensão esperando o SDK ficar pronto.
     * @param {Function} callback - Chamado com (role, playerName)
     */
    init: function(callback) {
      OBR.onReady(function() {
        // Pega o papel (GM ou PLAYER) e o nome do jogador
        Promise.all([
          OBR.player.getRole(),
          OBR.player.getName()
        ]).then(function(results) {
          callback(results[0], results[1]);
        }).catch(function(err) {
          console.error("[Fortune Table] Erro ao inicializar:", err);
          // Fallback para testes locais
          callback("GM", "Usuário Local");
        });
      });
    },

    /**
     * Lê os metadados da sala (dados salvos).
     * @returns {Promise<Object>}
     */
    getMetadata: function() {
      return OBR.room.getMetadata();
    },

    /**
     * Salva dados nos metadados da sala.
     * Apenas o GM deveria chamar isso.
     * @param {Object} data - Objeto com os dados a salvar
     * @returns {Promise}
     */
    setMetadata: function(data) {
      return OBR.room.setMetadata(data);
    },

    /**
     * Escuta quando os metadados mudam.
     * Isso permite que todos vejam as mudanças do GM em tempo real.
     * @param {Function} callback - Recebe o novo objeto de metadados
     */
    onMetadataChange: function(callback) {
      OBR.room.onMetadataChange(callback);
    },

    /**
     * Envia uma mensagem para TODOS na sala.
     * @param {string} channel - Nome do canal (identificador da mensagem)
     * @param {*}      data    - Dados a enviar (qualquer coisa)
     */
    broadcast: function(channel, data) {
      OBR.broadcast.sendMessage(channel, data, { destination: "ALL" });
    },

    /**
     * Escuta mensagens de um canal específico.
     * @param {string}   channel  - Canal a escutar
     * @param {Function} callback - Recebe os dados da mensagem
     */
    onBroadcast: function(channel, callback) {
      OBR.broadcast.onMessage(channel, function(event) {
        callback(event.data);
      });
    },

    /* ---- FUNÇÕES ESPECÍFICAS DE CONFIGURAÇÃO ---- */

    /** Carrega a lista de opções da roleta */
    loadRouletteItems: function() {
      return this.getMetadata().then(function(meta) {
        var key = FortuneTable.METADATA_KEYS.ROULETTE_ITEMS;
        if (meta && meta[key] && meta[key].length > 0) {
          return meta[key];
        }
        // Valores padrão se não houver nada salvo
        return [
          "Guerreiro","Mago","Ladino","Clérigo",
          "Bardo","Ranger","Paladino","Druida"
        ];
      });
    },

    /** Salva a lista de opções da roleta */
    saveRouletteItems: function(items) {
      var data = {};
      data[FortuneTable.METADATA_KEYS.ROULETTE_ITEMS] = items;
      return this.setMetadata(data);
    },

    /**
     * Carrega a chance de vitória do caça-níquel.
     * O valor é armazenado ofuscado.
     *
     * ⚠️ LIMITAÇÃO DE SEGURANÇA:
     * Qualquer jogador com DevTools pode ler os metadados
     * da sala e decodificar o valor. Sem um servidor backend,
     * é impossível esconder totalmente no Owlbear Rodeo.
     */
    loadSlotsConfig: function() {
      return this.getMetadata().then(function(meta) {
        var key = FortuneTable.METADATA_KEYS.SLOTS_CONFIG;
        if (meta && meta[key]) {
          return FortuneTable.deobfuscateValue(meta[key]);
        }
        return 30; // 30% padrão
      });
    },

    /** Salva a chance de vitória do caça-níquel (ofuscado) */
    saveSlotsConfig: function(chance) {
      var data = {};
      data[FortuneTable.METADATA_KEYS.SLOTS_CONFIG] =
        FortuneTable.obfuscateValue(chance);
      return this.setMetadata(data);
    }
  };

})();
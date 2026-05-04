/* ============================================
   UTILS.JS
   Variáveis globais e funções compartilhadas
   ============================================ */

// Namespace global para evitar conflitos
var FortuneTable = FortuneTable || {};

// ID único da extensão (usado como prefixo em tudo)
FortuneTable.EXTENSION_ID = "com.fortune-table.v1";

// Chaves para salvar dados na sala (metadados)
FortuneTable.METADATA_KEYS = {
  ROULETTE_ITEMS: "com.fortune-table.v1/roulette-items",
  SLOTS_CONFIG:   "com.fortune-table.v1/slots-config"
};

// Canais de comunicação em tempo real (broadcast)
FortuneTable.CHANNELS = {
  ROULETTE_RESULT:  "com.fortune-table.v1/roulette-result",
  SLOTS_RESULT:     "com.fortune-table.v1/slots-result",
  COINFLIP_RESULT:  "com.fortune-table.v1/coinflip-result",
  CLEAR_HISTORY:    "com.fortune-table.v1/clear-history"
};

// Estado global compartilhado entre os módulos
FortuneTable.state = {
  role:              "PLAYER",  // Papel: "GM" ou "PLAYER"
  playerName:        "Jogador", // Nome do usuário atual
  soundEnabled:      true,      // Som ligado?
  animationsEnabled: true,      // Animações ligadas?
  isSpinning:        false,     // Roleta está girando?
  isSlotsSpinning:   false,     // Slots estão girando?
  isFlipping:        false      // Moeda está girando?
};

// Cores dos segmentos da roleta
FortuneTable.ROULETTE_COLORS = [
  "#e94560","#0f3460","#533483","#2ecc71",
  "#e67e22","#3498db","#9b59b6","#1abc9c",
  "#e74c3c","#2c3e50","f39c12","#16a085",
  "#8e44ad","#d35400","#27ae60","#c0392b",
  "#2980b9","#f1c40f","#7f8c8d","#e91e63"
];

// Símbolos do caça-níquel
FortuneTable.SLOT_SYMBOLS = [
  "🍒","🍋","🍊","🍇","💎","⭐","7️⃣","🔔"
];

/* ---- FUNÇÕES UTILITÁRIAS ---- */

/**
 * Ofusca um número para dificultar leitura nos metadados.
 * ATENÇÃO: isso NÃO é segurança real. Um jogador com DevTools
 * pode ler os metadados. Explicação completa no README.
 */
FortuneTable.obfuscateValue = function(value) {
  var str = "FT_" + (value * 7 + 13).toString(36) + "_TF";
  return btoa(str.split("").reverse().join(""));
};

/**
 * Desfaz a ofuscação para ler o valor real.
 */
FortuneTable.deobfuscateValue = function(encoded) {
  try {
    var decoded   = atob(encoded);
    var reversed  = decoded.split("").reverse().join("");
    var match     = reversed.match(/FT_(.+)_TF/);
    if (match) {
      return (parseInt(match[1], 36) - 13) / 7;
    }
    return 30;
  } catch (e) {
    return 30;
  }
};

/**
 * Retorna um item aleatório de um array.
 */
FortuneTable.randomFrom = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Easing para desaceleração suave (usada na roleta).
 */
FortuneTable.easeOutCubic = function(t) {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Formata a hora atual como HH:MM:SS.
 */
FortuneTable.formatTime = function() {
  var d = new Date();
  var pad = function(n) { return n.toString().padStart(2, "0"); };
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
};

/**
 * Escapa HTML para evitar injeção de código.
 */
FortuneTable.escapeHtml = function(text) {
  var d = document.createElement("div");
  d.appendChild(document.createTextNode(String(text)));
  return d.innerHTML;
};

/**
 * Adiciona uma linha no histórico de um minigame.
 * @param {string} listId     - ID do elemento <ul>
 * @param {string} playerName - Quem jogou
 * @param {string} resultText - O que aconteceu
 */
FortuneTable.addHistoryEntry = function(listId, playerName, resultText) {
  var ul = document.getElementById(listId);
  if (!ul) return;

  var li = document.createElement("li");
  li.innerHTML =
    "<span class='history-player'>" + FortuneTable.escapeHtml(playerName) + "</span>" +
    " → <span class='history-result'>" + FortuneTable.escapeHtml(resultText) + "</span>" +
    " <small style='color:#555;'>(" + FortuneTable.formatTime() + ")</small>";

  // Insere no topo (mais recente primeiro)
  ul.insertBefore(li, ul.firstChild);

  // Limita a 20 entradas
  while (ul.children.length > 20) {
    ul.removeChild(ul.lastChild);
  }
};

/**
 * Apaga todo o histórico de um minigame.
 */
FortuneTable.clearHistory = function(listId) {
  var ul = document.getElementById(listId);
  if (ul) ul.innerHTML = "";
};
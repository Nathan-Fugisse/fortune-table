/**
 * main.js — Main entry point for Fortune Table extension
 * 
 * Orchestrates:
 * - OBR SDK initialization
 * - Tab navigation
 * - Game initialization
 * - GM config visibility
 * - Event synchronization
 */

import Sync from './sync.js';
import Wheel from './wheel.js';
import Slots from './slots.js';
import Coin from './coin.js';

// ============================
// Global state
// ============================
let playerRole = 'PLAYER';
let playerName = 'Jogador';
let lastProcessedTimestamp = 0;

// ============================
// Toast notification
// ============================
function showToast(message, duration = 3000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ============================
// Tab Navigation
// ============================
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });
}

// ============================
// Wheel Setup
// ============================
function initWheel() {
  Wheel.init('wheelCanvas');

  const spinBtn = document.getElementById('wheel-spin-btn');
  const resultDiv = document.getElementById('wheel-result');

  spinBtn.addEventListener('click', async () => {
    if (Wheel.isSpinning()) return;
    spinBtn.disabled = true;
    resultDiv.textContent = '🎡 Girando...';
    resultDiv.className = 'result-display';

    const idx = Wheel.getRandomIndex();
    const result = Wheel.items[idx];

    // Broadcast to all players
    await Sync.broadcastEvent('wheel', result, playerName);

    // Local animation
    await Wheel.spin(idx);

    resultDiv.textContent = `🎯 ${playerName}: ${result}`;
    resultDiv.className = 'result-display neutral';
    spinBtn.disabled = false;
  });

  // GM config
  const configDiv = document.getElementById('wheel-config');
  const textarea = document.getElementById('wheel-items-input');
  const saveBtn = document.getElementById('wheel-save-config');

  // Populate textarea with current items
  const state = Sync.getState();
  textarea.value = (state.wheelItems || []).join('\n');

  saveBtn.addEventListener('click', async () => {
    const items = textarea.value.split('\n').map(s => s.trim()).filter(s => s !== '');
    if (items.length === 0) {
      showToast('⚠️ Adicione pelo menos 1 item!');
      return;
    }
    await Sync.setState({ wheelItems: items });
    Wheel.setItems(items);
    showToast('✅ Itens da roleta atualizados!');
  });
}

// ============================
// Slots Setup
// ============================
function initSlots() {
  Slots.init();

  const spinBtn = document.getElementById('slots-spin-btn');
  const resultDiv = document.getElementById('slots-result');

  spinBtn.addEventListener('click', async () => {
    if (Slots.isSpinning()) return;
    spinBtn.disabled = true;
    resultDiv.textContent = '🎰 Girando...';
    resultDiv.className = 'result-display';

    // Get win rate from synced state
    const state = Sync.getState();
    const winRate = state.slotsWinRate ?? 25;

    const result = Slots.calculateResult(winRate);
    const isWin = Slots.isWin(result);

    // Broadcast
    await Sync.broadcastEvent('slots', { symbols: result, win: isWin }, playerName);

    // Animate
    await Slots.spin(result);

    if (isWin) {
      resultDiv.textContent = `🎉 ${playerName} GANHOU! ${result.join(' ')}`;
      resultDiv.className = 'result-display win';
    } else {
      resultDiv.textContent = `${playerName}: ${result.join(' ')} — Tente novamente!`;
      resultDiv.className = 'result-display lose';
    }
    spinBtn.disabled = false;
  });

  // GM config
  const configDiv = document.getElementById('slots-config');
  const slider = document.getElementById('slots-winrate');
  const valueDisplay = document.getElementById('slots-winrate-value');
  const saveBtn = document.getElementById('slots-save-config');

  const state = Sync.getState();
  slider.value = state.slotsWinRate ?? 25;
  valueDisplay.textContent = slider.value;

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
  });

  saveBtn.addEventListener('click', async () => {
    await Sync.setState({ slotsWinRate: parseInt(slider.value) });
    showToast(`✅ Probabilidade: ${slider.value}%`);
  });
}

// ============================
// Coin Setup
// ============================
function initCoin() {
  Coin.init();

  const flipBtn = document.getElementById('coin-flip-btn');
  const resultDiv = document.getElementById('coin-result');

  flipBtn.addEventListener('click', async () => {
    if (Coin.isFlipping()) return;
    flipBtn.disabled = true;
    resultDiv.textContent = '🪙 Lançando...';
    resultDiv.className = 'result-display';

    const result = Coin.getRandomResult();

    // Broadcast
    await Sync.broadcastEvent('coin', result, playerName);

    // Animate
    await Coin.flip(result);

    const emoji = result === 'cara' ? '👑' : '🌙';
    const label = result === 'cara' ? 'CARA' : 'COROA';
    resultDiv.textContent = `${emoji} ${playerName}: ${label}!`;
    resultDiv.className = 'result-display neutral';
    flipBtn.disabled = false;
  });
}

// ============================
// Handle synced events from OTHER players
// ============================
function handleSyncedEvent(state, oldEvent) {
  const event = state.lastEvent;
  if (!event) return;

  // Skip if we already processed this event
  if (event.timestamp <= lastProcessedTimestamp) return;
  lastProcessedTimestamp = event.timestamp;

  // Skip if this event was triggered by us (we already animated locally)
  if (event.playerName === playerName) return;

  // Update wheel items if changed
  if (state.wheelItems) {
    Wheel.setItems(state.wheelItems);
    const textarea = document.getElementById('wheel-items-input');
    if (textarea) textarea.value = state.wheelItems.join('\n');
  }

  // Update slots winrate display if GM
  if (playerRole === 'GM') {
    const slider = document.getElementById('slots-winrate');
    const valueDisplay = document.getElementById('slots-winrate-value');
    if (slider && state.slotsWinRate !== undefined) {
      slider.value = state.slotsWinRate;
      valueDisplay.textContent = state.slotsWinRate;
    }
  }

  // Animate the event from other player
  switch (event.game) {
    case 'wheel':
      handleRemoteWheel(event);
      break;
    case 'slots':
      handleRemoteSlots(event);
      break;
    case 'coin':
      handleRemoteCoin(event);
      break;
  }
}

async function handleRemoteWheel(event) {
  const resultDiv = document.getElementById('wheel-result');
  const spinBtn = document.getElementById('wheel-spin-btn');

  // Switch to wheel tab visually to show the animation
  showToast(`🎡 ${event.playerName} girou a roleta!`);

  spinBtn.disabled = true;
  resultDiv.textContent = `🎡 ${event.playerName} está girando...`;
  resultDiv.className = 'result-display';

  await Wheel.spinToResult(event.result);

  resultDiv.textContent = `🎯 ${event.playerName}: ${event.result}`;
  resultDiv.className = 'result-display neutral';
  spinBtn.disabled = false;
}

async function handleRemoteSlots(event) {
  const resultDiv = document.getElementById('slots-result');
  const spinBtn = document.getElementById('slots-spin-btn');

  showToast(`🎰 ${event.playerName} puxou a alavanca!`);

  spinBtn.disabled = true;
  resultDiv.textContent = `🎰 ${event.playerName} está jogando...`;
  resultDiv.className = 'result-display';

  await Slots.spin(event.result.symbols);

  if (event.result.win) {
    resultDiv.textContent = `🎉 ${event.playerName} GANHOU! ${event.result.symbols.join(' ')}`;
    resultDiv.className = 'result-display win';
  } else {
    resultDiv.textContent = `${event.playerName}: ${event.result.symbols.join(' ')}`;
    resultDiv.className = 'result-display lose';
  }
  spinBtn.disabled = false;
}

async function handleRemoteCoin(event) {
  const resultDiv = document.getElementById('coin-result');
  const flipBtn = document.getElementById('coin-flip-btn');

  showToast(`🪙 ${event.playerName} lançou a moeda!`);

  flipBtn.disabled = true;
  resultDiv.textContent = `🪙 ${event.playerName} está lançando...`;
  resultDiv.className = 'result-display';

  await Coin.flip(event.result);

  const emoji = event.result === 'cara' ? '👑' : '🌙';
  const label = event.result === 'cara' ? 'CARA' : 'COROA';
  resultDiv.textContent = `${emoji} ${event.playerName}: ${label}!`;
  resultDiv.className = 'result-display neutral';
  flipBtn.disabled = false;
}

// ============================
// GM Config Visibility
// ============================
function applyRoleVisibility() {
  const gmConfigs = document.querySelectorAll('.gm-config');
  gmConfigs.forEach(el => {
    if (playerRole === 'GM') {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// ============================
// OBR SDK Initialization
// ============================
async function main() {
  // Initialize tabs immediately (works without OBR)
  initTabs();

  try {
    // Wait for OBR SDK
    await OBR.onReady(async () => {
      // Get player info
      playerRole = await OBR.player.getRole();
      playerName = await OBR.player.getName();

      // Update footer
      const info = document.getElementById('player-info');
      info.textContent = `${playerName} (${playerRole === 'GM' ? 'Mestre' : 'Jogador'})`;

      // Initialize sync
      await Sync.init();

      // Initialize games
      initWheel();
      initSlots();
      initCoin();

      // Apply role-based visibility
      applyRoleVisibility();

      // Listen for synced events
      Sync.onChange(handleSyncedEvent);

      // Listen for role changes (if player gets promoted)
      OBR.player.onChange((player) => {
        playerName = player.name;
        // Role might change, re-check
        OBR.player.getRole().then(role => {
          playerRole = role;
          applyRoleVisibility();
        });
      });
    });
  } catch (e) {
    // Running outside OBR (standalone testing)
    console.warn('OBR SDK not available. Running in standalone mode.');
    playerRole = 'GM'; // Show all configs in standalone
    playerName = 'Test Player';

    const info = document.getElementById('player-info');
    info.textContent = `${playerName} (Modo Teste — sem sincronização)`;

    // Mock Sync for standalone testing
    initStandalone();
  }
}

/**
 * Standalone mode for testing without OBR
 */
function initStandalone() {
  // Override Sync methods to work locally
  const originalBroadcast = Sync.broadcastEvent.bind(Sync);
  Sync.broadcastEvent = async (game, result, name) => {
    // Just store locally, no actual broadcast
    Sync._currentState.lastEvent = { game, result, playerName: name, timestamp: Date.now() };
  };
  Sync.setState = async (partial) => {
    Sync._currentState = { ...Sync._currentState, ...partial };
  };

  // Initialize games
  Wheel.init('wheelCanvas');
  initWheelStandalone();
  initSlotsStandalone();
  initCoinStandalone();
  applyRoleVisibility();
}

function initWheelStandalone() {
  const spinBtn = document.getElementById('wheel-spin-btn');
  const resultDiv = document.getElementById('wheel-result');
  const textarea = document.getElementById('wheel-items-input');
  const saveBtn = document.getElementById('wheel-save-config');

  textarea.value = Wheel.items.join('\n');

  spinBtn.addEventListener('click', async () => {
    if (Wheel.isSpinning()) return;
    spinBtn.disabled = true;
    resultDiv.textContent = '🎡 Girando...';
    resultDiv.className = 'result-display';

    const idx = Wheel.getRandomIndex();
    await Wheel.spin(idx);

    resultDiv.textContent = `🎯 ${Wheel.items[idx]}`;
    resultDiv.className = 'result-display neutral';
    spinBtn.disabled = false;
  });

  saveBtn.addEventListener('click', () => {
    const items = textarea.value.split('\n').map(s => s.trim()).filter(s => s);
    Wheel.setItems(items);
    showToast('✅ Itens atualizados!');
  });
}

function initSlotsStandalone() {
  Slots.init();
  const spinBtn = document.getElementById('slots-spin-btn');
  const resultDiv = document.getElementById('slots-result');
  const slider = document.getElementById('slots-winrate');
  const valueDisplay = document.getElementById('slots-winrate-value');

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
  });

  document.getElementById('slots-save-config').addEventListener('click', () => {
    showToast(`✅ Probabilidade: ${slider.value}%`);
  });

  spinBtn.addEventListener('click', async () => {
    if (Slots.isSpinning()) return;
    spinBtn.disabled = true;
    resultDiv.textContent = '🎰 Girando...';
    resultDiv.className = 'result-display';

    const result = Slots.calculateResult(parseInt(slider.value));
    await Slots.spin(result);

    if (Slots.isWin(result)) {
      resultDiv.textContent = `🎉 GANHOU! ${result.join(' ')}`;
      resultDiv.className = 'result-display win';
    } else {
      resultDiv.textContent = `${result.join(' ')} — Tente novamente!`;
      resultDiv.className = 'result-display lose';
    }
    spinBtn.disabled = false;
  });
}

function initCoinStandalone() {
  Coin.init();
  const flipBtn = document.getElementById('coin-flip-btn');
  const resultDiv = document.getElementById('coin-result');

  flipBtn.addEventListener('click', async () => {
    if (Coin.isFlipping()) return;
    flipBtn.disabled = true;
    resultDiv.textContent = '🪙 Lançando...';
    resultDiv.className = 'result-display';

    const result = Coin.getRandomResult();
    await Coin.flip(result);

    const emoji = result === 'cara' ? '👑' : '🌙';
    const label = result === 'cara' ? 'CARA' : 'COROA';
    resultDiv.textContent = `${emoji} ${label}!`;
    resultDiv.className = 'result-display neutral';
    flipBtn.disabled = false;
  });
}

// ============================
// Start everything
// ============================
main();
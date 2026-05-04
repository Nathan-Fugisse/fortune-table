/**
 * sync.js — Synchronization layer using OBR Room Metadata
 * 
 * All game state is stored under a single metadata key.
 * When any client updates the state, all other clients
 * receive the update via onMetadataChange.
 */

const METADATA_KEY = "com.fortune-table/state";

// Default state
const DEFAULT_STATE = {
  // Wheel config
  wheelItems: ["Tesouro", "Armadilha", "Nada", "Monstro", "Poção", "Ouro", "Evento", "Descanso"],

  // Slots config (GM only sees this)
  slotsWinRate: 25,

  // Last game results (for syncing)
  lastEvent: null
  // lastEvent shape:
  // {
  //   game: "wheel" | "slots" | "coin",
  //   result: any,
  //   playerName: string,
  //   timestamp: number
  // }
};

const Sync = {
  _listeners: [],
  _currentState: { ...DEFAULT_STATE },
  _initialized: false,

  /**
   * Initialize sync system. Call once after OBR is ready.
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;

    // Load current metadata
    const metadata = await OBR.room.getMetadata();
    if (metadata[METADATA_KEY]) {
      this._currentState = { ...DEFAULT_STATE, ...metadata[METADATA_KEY] };
    } else {
      // First time: write defaults
      await this._write(this._currentState);
    }

    // Listen for changes
    OBR.room.onMetadataChange((metadata) => {
      if (metadata[METADATA_KEY]) {
        const newState = { ...DEFAULT_STATE, ...metadata[METADATA_KEY] };
        const oldEvent = this._currentState.lastEvent;
        this._currentState = newState;

        // Notify listeners
        this._listeners.forEach(fn => fn(newState, oldEvent));
      }
    });
  },

  /**
   * Get current state
   */
  getState() {
    return { ...this._currentState };
  },

  /**
   * Update state (partial update)
   */
  async setState(partial) {
    this._currentState = { ...this._currentState, ...partial };
    await this._write(this._currentState);
  },

  /**
   * Broadcast a game event (result)
   */
  async broadcastEvent(game, result, playerName) {
    await this.setState({
      lastEvent: {
        game,
        result,
        playerName,
        timestamp: Date.now()
      }
    });
  },

  /**
   * Register a listener for state changes
   */
  onChange(fn) {
    this._listeners.push(fn);
  },

  /**
   * Internal: write to room metadata
   */
  async _write(state) {
    await OBR.room.setMetadata({
      [METADATA_KEY]: state
    });
  }
};

export default Sync;
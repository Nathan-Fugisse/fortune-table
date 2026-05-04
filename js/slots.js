/**
 * slots.js — Slot Machine mini-game
 * 
 * Features:
 * - 3 reels with emoji symbols
 * - GM controls win probability (hidden from players)
 * - Animated spinning reels
 * - Synced results
 */

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '🔔', '7️⃣'];

const Slots = {
  reels: [null, null, null],
  spinning: false,
  currentSymbols: ['🍒', '🍒', '🍒'],

  init() {
    this.reels = [
      document.getElementById('reel1'),
      document.getElementById('reel2'),
      document.getElementById('reel3')
    ];
    this._renderReels(this.currentSymbols);
  },

  /**
   * Determine the result based on win probability
   * winRate: 0-100 (percentage chance of forced win)
   */
  calculateResult(winRate) {
    const roll = Math.random() * 100;
    if (roll < winRate) {
      // Forced win: all three same symbol
      const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return [sym, sym, sym];
    } else {
      // Random result (might still accidentally win)
      let result;
      let attempts = 0;
      do {
        result = [
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ];
        attempts++;
        // If winRate is 0, actively prevent wins
        if (winRate === 0 && result[0] === result[1] && result[1] === result[2] && attempts < 100) {
          continue;
        }
        break;
      } while (true);
      return result;
    }
  },

  /**
   * Check if result is a win
   */
  isWin(result) {
    return result[0] === result[1] && result[1] === result[2];
  },

  /**
   * Animate the reels to show a specific result
   * Returns a promise that resolves when animation is complete
   */
  spin(result) {
    return new Promise((resolve) => {
      if (this.spinning) return resolve();
      this.spinning = true;

      // Build reel strips with many symbols, ending on the target
      const stripLength = 20; // symbols to scroll through

      this.reels.forEach((reel, i) => {
        // Build a strip of random symbols ending with the target
        const strip = [];
        for (let j = 0; j < stripLength + i * 5; j++) {
          strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        }
        strip.push(result[i]); // Final symbol

        // Render all symbols in the reel
        reel.innerHTML = '';
        strip.forEach(sym => {
          const div = document.createElement('div');
          div.className = 'slot-symbol';
          div.textContent = sym;
          reel.appendChild(div);
        });

        // Position at top
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
        reel.classList.remove('stopping');
        reel.classList.add('spinning');

        // Force reflow
        reel.offsetHeight;

        // Animate: scroll down to the last symbol
        const symbolHeight = 90;
        const totalScroll = -(strip.length - 1) * symbolHeight;

        // Stagger the stops
        const delay = 500 + i * 600;
        const spinDuration = 1000 + i * 500;

        // Quick spin phase
        let spinProgress = 0;
        const spinInterval = setInterval(() => {
          spinProgress += symbolHeight;
          if (spinProgress >= Math.abs(totalScroll) - symbolHeight * 3) {
            clearInterval(spinInterval);
          }
          reel.style.transform = `translateY(${-spinProgress}px)`;
        }, 50);

        setTimeout(() => {
          clearInterval(spinInterval);
          reel.classList.remove('spinning');
          reel.classList.add('stopping');
          reel.style.transition = `transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)`;
          reel.style.transform = `translateY(${totalScroll}px)`;

          if (i === 2) {
            // Last reel stopped
            setTimeout(() => {
              this.currentSymbols = result;
              this.spinning = false;
              this._renderReels(result);
              resolve();
            }, 700);
          }
        }, delay + spinDuration);
      });
    });
  },

  /**
   * Render reels showing static symbols
   */
  _renderReels(symbols) {
    this.reels.forEach((reel, i) => {
      reel.innerHTML = '';
      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0)';
      reel.classList.remove('spinning', 'stopping');
      const div = document.createElement('div');
      div.className = 'slot-symbol';
      div.textContent = symbols[i];
      reel.appendChild(div);
    });
  },

  isSpinning() {
    return this.spinning;
  }
};

export default Slots;
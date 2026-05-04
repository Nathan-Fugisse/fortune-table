/**
 * coin.js — Coin Flip mini-game
 * 
 * Features:
 * - 3D CSS flip animation
 * - "Cara" (Heads) or "Coroa" (Tails)
 * - Synced result
 */

const Coin = {
  element: null,
  flipping: false,

  init() {
    this.element = document.getElementById('coin');
  },

  /**
   * Flip to a specific result
   * result: "cara" or "coroa"
   * Returns a promise that resolves when animation completes
   */
  flip(result) {
    return new Promise((resolve) => {
      if (this.flipping) return resolve();
      this.flipping = true;

      // Remove old animation classes
      this.element.classList.remove('flipping', 'flipping-tails');
      this.element.style.transform = 'rotateX(0deg)';

      // Force reflow
      this.element.offsetHeight;

      // Apply animation
      if (result === 'coroa') {
        this.element.classList.add('flipping-tails');
      } else {
        this.element.classList.add('flipping');
      }

      // Wait for animation to complete
      setTimeout(() => {
        this.flipping = false;
        resolve();
      }, 2100);
    });
  },

  /**
   * Random result
   */
  getRandomResult() {
    return Math.random() < 0.5 ? 'cara' : 'coroa';
  },

  isFlipping() {
    return this.flipping;
  }
};

export default Coin;
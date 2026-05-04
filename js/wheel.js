/**
 * wheel.js — Wheel of Fortune mini-game
 * 
 * Features:
 * - Configurable segments (GM)
 * - Smooth spin animation using Canvas 2D
 * - Result synced to all players
 */

import Sync from './sync.js';

// Color palette for segments
const SEGMENT_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#2980b9',
  '#27ae60', '#c0392b', '#8e44ad', '#16a085',
  '#d35400', '#f1c40f', '#e91e63', '#00bcd4'
];

const Wheel = {
  canvas: null,
  ctx: null,
  items: [],
  currentAngle: 0,
  spinning: false,
  animationId: null,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.items = Sync.getState().wheelItems || [];
    this.draw();
  },

  setItems(items) {
    this.items = items.filter(i => i.trim() !== '');
    if (this.items.length === 0) {
      this.items = ["???"];
    }
    this.draw();
  },

  draw() {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const radius = Math.min(cx, cy) - 5;
    const count = this.items.length;
    const arc = (2 * Math.PI) / count;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.currentAngle);

    for (let i = 0; i < count; i++) {
      const angle = i * arc;
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, Math.min(14, 160 / count))}px 'Segoe UI', sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;

      const text = this.items[i];
      const maxLen = Math.floor(radius / 9);
      const displayText = text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text;
      ctx.fillText(displayText, radius - 12, 5);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  },

  /**
   * Spin the wheel. The targetIndex determines where it lands.
   * Returns a promise that resolves when animation completes.
   */
  spin(targetIndex) {
    return new Promise((resolve) => {
      if (this.spinning) return resolve(null);
      this.spinning = true;

      const count = this.items.length;
      const arc = (2 * Math.PI) / count;

      // Calculate target angle
      // The pointer is at the top (12 o'clock position = -π/2 from standard)
      // We want targetIndex to be under the pointer
      // The wheel rotates clockwise
      const baseSpins = 5 + Math.random() * 3; // 5-8 full rotations
      const targetAngle = -(targetIndex * arc + arc / 2); // center of target segment under pointer
      // Adjust for pointer at top (which is -π/2 in canvas coords, but since we draw from angle 0 at 3 o'clock)
      // The pointer is at top, which in our rotated system is at angle = -π/2
      // So we need the segment center at -π/2 when rotation is applied
      const pointerAngle = -Math.PI / 2;
      const finalAngle = baseSpins * 2 * Math.PI + (pointerAngle - targetAngle);

      const startAngle = this.currentAngle;
      const totalRotation = finalAngle - startAngle;
      const duration = 4000 + Math.random() * 1000; // 4-5 seconds
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing: cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);

        this.currentAngle = startAngle + totalRotation * eased;
        this.draw();

        if (progress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.spinning = false;
          // Normalize angle
          this.currentAngle = this.currentAngle % (2 * Math.PI);
          resolve(this.items[targetIndex]);
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  },

  /**
   * Animate to a predetermined result (for receiving synced results)
   */
  async spinToResult(resultText) {
    const idx = this.items.indexOf(resultText);
    if (idx === -1) return;
    await this.spin(idx);
  },

  /**
   * Pick a random index and spin to it
   */
  getRandomIndex() {
    return Math.floor(Math.random() * this.items.length);
  },

  isSpinning() {
    return this.spinning;
  }
};

export default Wheel;
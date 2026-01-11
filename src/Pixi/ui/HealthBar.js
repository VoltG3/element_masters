// Lightweight reusable health bar for PixiJS
// Usage:
//   import { HealthBar } from './HealthBar';
//   const hb = new HealthBar({ width: 32, height: 4, offsetY: -6 });
//   container.addChild(hb);
//   hb.update(currentHealth, maxHealth);

import { Container, Graphics } from 'pixi.js';

export class HealthBar extends Container {
  constructor(options = {}) {
    super();
    const {
      width = 32,
      height = 4,
      offsetX = 0,
      offsetY = -6,
      thresholds = { warn: 0.55, danger: 0.35 },
      colors = { ok: 0x2ecc71, warn: 0xf1c40f, danger: 0xe74c3c },
      // Use a neutral gray track instead of near-black; keep border options for backward compat (unused)
      trackColor = 0x666666,
      borderColor = 0x000000,
      borderAlpha = 0.8,
    } = options;

    this._w = Math.max(4, Math.floor(width));
    this._h = Math.max(2, Math.floor(height));
    this._pct = -1; // force first draw
    this._color = 0xffffff;
    this._thresholds = thresholds;
    this._colors = colors;
    this._trackColor = trackColor;
    this._borderColor = borderColor;
    this._borderAlpha = borderAlpha;

    this.x = offsetX || 0;
    this.y = offsetY || 0;

    this._track = new Graphics();
    this._fill = new Graphics();
    this.addChild(this._track);
    this.addChild(this._fill);

    this._redrawAll();
  }

  resize(width, height) {
    const w = Math.max(4, Math.floor(width || this._w));
    const h = Math.max(2, Math.floor(height || this._h));
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this._redrawAll();
  }

  update(current, max) {
    const m = Math.max(0, Number(max) || 0);
    if (m <= 0 || !Number.isFinite(current)) {
      this.visible = false;
      return;
    }
    const c = Math.max(0, Math.min(m, Number(current)));
    const pct = m > 0 ? c / m : 0;
    this.visible = true;

    const color = pct < this._thresholds.danger
      ? this._colors.danger
      : (pct < this._thresholds.warn ? this._colors.warn : this._colors.ok);

    // Only redraw fill if percent or color changed noticeably
    if (Math.abs(pct - this._pct) > 0.001 || color !== this._color) {
      this._pct = pct;
      this._color = color;
      this._redrawFill();
    }
  }

  _redrawAll() {
    // Track (no border)
    const w = this._w, h = this._h;
    this._track.clear();
    this._track.roundRect(0, 0, w, h, Math.min(3, h * 0.5));
    this._track.fill({ color: this._trackColor, alpha: 0.85 });
    // Redraw fill with current state
    this._redrawFill();
  }

  _redrawFill() {
    const w = this._w, h = this._h;
    const innerW = Math.max(0, Math.floor(w * Math.max(0, Math.min(1, this._pct))));
    const radius = Math.min(2, Math.floor(h / 2));
    this._fill.clear();
    if (innerW <= 0) return;
    this._fill.roundRect(0, 0, innerW, h, radius);
    this._fill.fill({ color: this._color, alpha: 1 });
  }
}

export default HealthBar;

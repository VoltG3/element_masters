import { Graphics, BlurFilter } from 'pixi.js';

// Thunder/Lightning weather effect
// API:
//   new WeatherThunder(container, api, getIntensity)
//   setIntensity(v), resize(w,h), update(dtMs), destroy()
// Notes:
// - Renders inside weather layer (below fog). Blocks/tiles remain above fog.
// - Picks random strike targets above solid tiles using api.isSolidAt(x,y).
export default class WeatherThunder {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api || {};
    this.getIntensity = getIntensity || (() => 0);
    this.width = (api?.mapWidth || 0) * (api?.tileSize || 32);
    this.height = (api?.mapHeight || 0) * (api?.tileSize || 32);

    this.intensity = 0;
    this.time = 0;
    this.nextStrikeMs = Infinity; // scheduled delay to next strike
    this.flashAlpha = 0; // global white flash
    this.flashDecay = 0.0;
    this.boltAlive = false;
    this.boltTime = 0; // ms since bolt spawned
    this.boltDuration = 0; // ms total

    // Graphics
    this.flashG = new Graphics();
    this.boltG = new Graphics();
    // Add slight glow to bolt
    try {
      this.boltG.filters = [new BlurFilter(2, 1)];
    } catch {}
    this.container.addChild(this.flashG);
    this.container.addChild(this.boltG);

    // Build once
    this._scheduleNextStrike(true);
  }

  setIntensity(v) {
    const nv = Math.max(0, Math.min(100, Number(v) || 0));
    if (nv === this.intensity) return;
    this.intensity = nv;
    if (nv <= 0) {
      // disable visuals
      this.flashAlpha = 0;
      this.boltAlive = false;
      this._redrawFlash();
      this._clearBolt();
      this.nextStrikeMs = Infinity;
    } else if (!Number.isFinite(this.nextStrikeMs) || this.nextStrikeMs === Infinity) {
      this._scheduleNextStrike(true);
    }
  }

  resize(w, h) {
    const W = Math.max(1, Math.floor(w));
    const H = Math.max(1, Math.floor(h));
    if (W === this.width && H === this.height) return;
    this.width = W;
    this.height = H;
    // redraw flash when active
    if (this.flashAlpha > 0) this._redrawFlash();
  }

  update(dtMs) {
    // live intensity updates
    const curInt = Math.max(0, Math.min(100, this.getIntensity()));
    if (curInt !== this.intensity) this.setIntensity(curInt);

    const dt = Math.max(0, Number(dtMs) || 16.67);
    if (this.intensity <= 0) return;

    // Update scheduling
    this.nextStrikeMs -= dt;
    if (this.nextStrikeMs <= 0) {
      // Perform strike: trigger screen flash and draw bolt
      this._triggerFlash();
      this._createBolt();
      this._scheduleNextStrike(false); // schedule next time after immediate strike window
    }

    // Flash decay
    if (this.flashAlpha > 0) {
      // exponential-like decay via linear factor raised with dt
      const decayPerMs = this.flashDecay || 0.004; // higher = quicker fade
      this.flashAlpha = Math.max(0, this.flashAlpha - decayPerMs * dt);
      this._redrawFlash();
    }

    // Bolt lifetime
    if (this.boltAlive) {
      this.boltTime += dt;
      const t = this.boltTime / Math.max(1, this.boltDuration);
      // Fade color/alpha over time
      const remain = Math.max(0, 1 - t);
      this.boltG.alpha = 0.25 + 0.75 * remain;
      if (this.boltTime >= this.boltDuration) {
        this._clearBolt();
      }
    }
  }

  destroy() {
    try { this.flashG.parent && this.flashG.parent.removeChild(this.flashG); } catch {}
    try { this.flashG.destroy(true); } catch {}
    try { this.boltG.parent && this.boltG.parent.removeChild(this.boltG); } catch {}
    try { this.boltG.destroy(true); } catch {}
    this.flashG = null;
    this.boltG = null;
    this.container = null;
  }

  // Internal helpers
  _scheduleNextStrike(initial) {
    // Map intensity 1..100 to delay: from ~9000..6000 ms down to ~2500..1000 ms
    if (this.intensity <= 0) { this.nextStrikeMs = Infinity; return; }
    const t = Math.max(0, Math.min(1, this.intensity / 100));
    const minDelay = this._lerp(1000, 2500, 1 - t); // at high intensity, between 1–2.5s
    const maxDelay = this._lerp(2500, 9000, 1 - t); // at low intensity, up to ~9s
    const delay = this._rand(minDelay, maxDelay);
    this.nextStrikeMs = initial ? this._rand(400, 1400) : delay; // first strike quicker on enable
  }

  _triggerFlash() {
    // Brightness based on intensity, with slight randomness
    const t = Math.max(0, Math.min(1, this.intensity / 100));
    const base = this._lerp(0.25, 0.9, t);
    this.flashAlpha = Math.min(1, base * this._rand(0.8, 1));
    // fade time scales with intensity (brighter fades a bit slower)
    this.flashDecay = this._lerp(0.008, 0.004, t);
    this._redrawFlash();
  }

  _redrawFlash() {
    const g = this.flashG;
    g.clear();
    if (this.flashAlpha <= 0) return;
    g.rect(0, 0, this.width, this.height);
    g.fill({ color: 0xffffff, alpha: this.flashAlpha });
  }

  _createBolt() {
    // Determine target using solid scan from top
    const W = this.width, H = this.height;
    const x = Math.floor(this._rand(8, W - 8));
    const topY = -Math.floor(this._rand(10, 40)); // start slightly above top
    const targetY = this._findGroundY(x, H);
    const endY = Number.isFinite(targetY) ? Math.max(0, targetY - this._rand(8, 16)) : Math.floor(H * 0.6);

    // Build polyline with jittered segments from top to end
    const segments = Math.max(8, Math.floor((endY - topY) / this._rand(10, 16)));
    const jitterX = this._lerp(6, 18, Math.max(0, Math.min(1, this.intensity / 100)));
    const points = [];
    let cx = x;
    let cy = topY;
    points.push({ x: cx, y: cy });
    for (let i = 1; i <= segments; i++) {
      const ny = topY + Math.floor(((endY - topY) * i) / segments);
      const nx = x + this._rand(-jitterX, jitterX);
      cx = nx; cy = ny;
      points.push({ x: cx, y: cy });
    }

    // Draw main bolt
    const g = this.boltG;
    g.clear();
    const thickness = this._lerp(2, 5, Math.max(0, Math.min(1, this.intensity / 100)));
    const color = 0xCCEEFF;
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.stroke({ width: thickness, color, alpha: 1, alignment: 0.5, cap: 'round', join: 'round' });

    // Branches: some short forks from random mid points
    const branchCount = Math.floor(this._lerp(1, 3, Math.max(0, Math.min(1, this.intensity / 100))));
    for (let b = 0; b < branchCount; b++) {
      const idx = Math.floor(this._rand(2, points.length - 2));
      const p = points[idx];
      const len = this._rand(30, 80);
      const ang = this._rand(-Math.PI * 0.5, Math.PI * 0.5);
      const bx = p.x + Math.cos(ang) * len;
      const by = p.y + Math.sin(ang) * len;
      g.moveTo(p.x, p.y);
      g.lineTo(bx, by);
      g.stroke({ width: Math.max(1, thickness * 0.55), color, alpha: 0.9, alignment: 0.5 });
    }

    this.boltAlive = true;
    this.boltTime = 0;
    this.boltDuration = this._rand(120, 260); // very brief
    this.boltG.alpha = 1;
  }

  _clearBolt() {
    if (!this.boltG) return;
    this.boltAlive = false;
    this.boltTime = 0;
    this.boltDuration = 0;
    try { this.boltG.clear(); } catch {}
  }

  _findGroundY(worldX, maxH) {
    // Scan from top to bottom to find first solid tile boundary
    const isSolid = this.api?.isSolidAt;
    if (typeof isSolid !== 'function') return null;
    for (let y = 0; y < maxH; y += 4) {
      if (isSolid(worldX, y)) {
        return y;
      }
    }
    return null;
  }

  _rand(a, b) {
    if (b === undefined) { b = a; a = 0; }
    return a + Math.random() * (b - a);
  }

  _lerp(a, b, t) { return a + (b - a) * t; }
}

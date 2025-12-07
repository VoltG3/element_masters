import { Graphics } from 'pixi.js';

// Full-screen fog overlay: a semi-transparent rectangle covering entire viewport.
// Intensity 0..100 maps to alpha 0..0.65.
export default class WeatherFog {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.intensity = 0;

    this.g = new Graphics();
    this.container.addChild(this.g);
    this._draw();
  }

  _alphaFromIntensity(v) {
    const t = Math.max(0, Math.min(100, Number(v) || 0)) / 100; // 0..1
    return Math.max(0, Math.min(0.65, t * 0.65));
  }

  setIntensity(v) {
    const nv = Math.max(0, Math.min(100, Number(v) || 0));
    if (nv === this.intensity) return;
    this.intensity = nv;
    this._draw();
  }

  resize(width, height) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this._draw();
  }

  _draw() {
    const alpha = this._alphaFromIntensity(this.intensity);
    const w = this.width;
    const h = this.height;
    const g = this.g;
    g.clear();
    if (alpha <= 0) return;
    // Neutral gray-blue fog color; tweak if needed
    g.beginFill(0x9fb7c9, alpha);
    g.drawRect(0, 0, w, h);
    g.endFill();
  }

  update(_dtMs) {
    // live intensity update
    const cur = Math.max(0, Math.min(100, this.getIntensity()));
    if (cur !== this.intensity) this.setIntensity(cur);
  }

  destroy() {
    if (this.g) {
      try { this.g.parent && this.g.parent.removeChild(this.g); } catch {}
      try { this.g.destroy(); } catch {}
    }
    this.g = null;
  }
}

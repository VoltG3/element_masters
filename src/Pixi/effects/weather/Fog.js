import { Graphics, Texture, TilingSprite } from 'pixi.js';

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
    this.time = 0; // ms accumulator for subtle breathing

    // Base tint rectangle drawn once; alpha controlled via displayObject alpha (no redraws per frame)
    this.g = new Graphics();
    this.container.addChild(this.g);

    // Build procedural noise texture once (small size, repeats as tiling sprites)
    this.noiseTex = WeatherFog._createNoiseTexture(128, 128);
    this.layer1 = new TilingSprite(this.noiseTex, this.width, this.height);
    this.layer2 = new TilingSprite(this.noiseTex, this.width, this.height);
    // Different scales for parallax effect
    this.layer1.tileScale.set(1.0, 1.0);
    this.layer2.tileScale.set(0.6, 0.8);
    // Start with zero alpha; will be set based on intensity
    this.layer1.alpha = 0;
    this.layer2.alpha = 0;
    this.container.addChild(this.layer1);
    this.container.addChild(this.layer2);

    // Precompute parameters
    this._recalcParams();
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
    this._recalcParams();
    this._applyAlphas(0); // update layer alphas based on new intensity
    this._draw();
  }

  resize(width, height) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    // Resize tiling sprites and redraw base rect
    if (this.layer1) { this.layer1.width = w; this.layer1.height = h; }
    if (this.layer2) { this.layer2.width = w; this.layer2.height = h; }
    this._draw();
  }

  _draw() {
    const w = this.width;
    const h = this.height;
    const g = this.g;
    g.clear();
    const baseAlpha = this._alphaFromIntensity(this.intensity);
    if (baseAlpha <= 0) {
      g.alpha = 0;
      return;
    }
    // Draw once with alpha 1, then control real alpha via g.alpha each frame
    g.rect(0, 0, w, h);
    g.fill({ color: 0x9fb7c9, alpha: 1 });
    g.alpha = baseAlpha;
  }

  update(dtMs) {
    // Live intensity update from settings
    const cur = Math.max(0, Math.min(100, this.getIntensity()));
    if (cur !== this.intensity) this.setIntensity(cur);

    // Advance time for breathing/pulse
    const dt = Math.max(0, Number(dtMs) || 16.67);
    this.time += dt;
    // Very subtle breathing: sine between ~0.96 .. 1.04
    const pulse = 1 + 0.04 * Math.sin(this.time * 0.0012);
    this._applyAlphas(pulse);

    // Scroll noise layers slowly
    if (this.layer1) {
      this.layer1.tilePosition.x += this.speed1.x * dt;
      this.layer1.tilePosition.y += this.speed1.y * dt;
    }
    if (this.layer2) {
      this.layer2.tilePosition.x += this.speed2.x * dt;
      this.layer2.tilePosition.y += this.speed2.y * dt;
    }
  }

  destroy() {
    if (this.g) {
      try { this.g.parent && this.g.parent.removeChild(this.g); } catch {}
      try { this.g.destroy(); } catch {}
    }
    this.g = null;
    try {
      if (this.layer1) { this.layer1.parent && this.layer1.parent.removeChild(this.layer1); this.layer1.destroy(true); }
    } catch {}
    try {
      if (this.layer2) { this.layer2.parent && this.layer2.parent.removeChild(this.layer2); this.layer2.destroy(true); }
    } catch {}
    this.layer1 = null;
    this.layer2 = null;
    try { this.noiseTex?.destroy(true); } catch {}
    this.noiseTex = null;
  }

  _applyAlphas(pulseFactor = 1) {
    const base = this._alphaFromIntensity(this.intensity);
    // Noise contribution grows with intensity but remains subtle
    const t = Math.max(0, Math.min(1, this.intensity / 100));
    const noiseAlpha = base * (0.25 + 0.35 * t); // up to ~0.4 of base
    if (this.g) this.g.alpha = base * pulseFactor;
    if (this.layer1) this.layer1.alpha = noiseAlpha * 0.8;
    if (this.layer2) this.layer2.alpha = noiseAlpha;
  }

  _recalcParams() {
    // Map intensity to drift speeds (pixels per ms)
    const t = Math.max(0, Math.min(1, this.intensity / 100));
    const lerp = (a, b, u) => a + (b - a) * u;
    // Two layers drifting in different directions
    this.speed1 = { x: lerp(0.005, 0.025, t), y: lerp(0.0, 0.012, t) };
    this.speed2 = { x: lerp(-0.006, -0.018, t), y: lerp(0.004, 0.02, t) };
  }

  // Static helper: generate small grayscale noise texture
  static _createNoiseTexture(w = 128, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    // Use a gentle noise range to avoid harsh contrast
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + Math.floor(Math.random() * 55); // 200..254
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return Texture.from(canvas);
  }
}

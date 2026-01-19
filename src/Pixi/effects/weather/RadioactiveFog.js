import { Graphics, Texture, TilingSprite } from 'pixi.js';

// Radioactive fog overlay: similar to fog but toxic green
export default class WeatherRadioactiveFog {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.intensity = 0;
    this.time = 0;

    this.g = new Graphics();
    this.container.addChild(this.g);

    this.noiseTex = WeatherRadioactiveFog._createNoiseTexture(128, 128);
    this.layer1 = new TilingSprite({ texture: this.noiseTex, width: this.width, height: this.height });
    this.layer2 = new TilingSprite({ texture: this.noiseTex, width: this.width, height: this.height });
    
    this.layer1.tileScale.set(1.2, 1.2);
    this.layer2.tileScale.set(0.7, 0.9);
    this.layer1.alpha = 0;
    this.layer2.alpha = 0;
    this.container.addChild(this.layer1);
    this.container.addChild(this.layer2);

    this._recalcParams();
    this._draw();
  }

  _alphaFromIntensity(v) {
    const t = Math.max(0, Math.min(100, Number(v) || 0)) / 100;
    return Math.max(0, Math.min(0.75, t * 0.75));
  }

  setIntensity(v) {
    const nv = Math.max(0, Math.min(100, Number(v) || 0));
    if (nv === this.intensity) return;
    this.intensity = nv;
    this._recalcParams();
    this._applyAlphas(0);
    this._draw();
  }

  resize(width, height) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
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
    g.rect(0, 0, w, h);
    // Toxic green tint
    g.fill({ color: 0x1a5c1a, alpha: 1 });
    g.alpha = baseAlpha;
  }

  update(dtMs) {
    const targetIntensity = Math.max(0, Math.min(100, this.getIntensity()));
    if (Math.abs(targetIntensity - this.intensity) > 0.1) {
      const lerpFactor = 1 - Math.exp(-0.0015 * dtMs);
      this.setIntensity(this.intensity + (targetIntensity - this.intensity) * lerpFactor);
    } else {
      this.setIntensity(targetIntensity);
    }

    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    if (viewport) {
      if (this.g) { this.g.x = viewport.x; this.g.y = viewport.y; }
      if (this.layer1) { this.layer1.x = viewport.x; this.layer1.y = viewport.y; }
      if (this.layer2) { this.layer2.x = viewport.x; this.layer2.y = viewport.y; }
    }

    const dt = Math.max(0, Number(dtMs) || 16.67);
    this.time += dt;
    const pulse = 1 + 0.06 * Math.sin(this.time * 0.001);
    this._applyAlphas(pulse);

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
      try { this.g.parent && this.g.parent.removeChild(this.g); this.g.destroy(); } catch {}
    }
    this.g = null;
    if (this.layer1) { try { this.layer1.parent && this.layer1.parent.removeChild(this.layer1); this.layer1.destroy(true); } catch {} }
    if (this.layer2) { try { this.layer2.parent && this.layer2.parent.removeChild(this.layer2); this.layer2.destroy(true); } catch {} }
    this.layer1 = null; this.layer2 = null;
    try { this.noiseTex?.destroy(true); } catch {}
    this.noiseTex = null;
  }

  _applyAlphas(pulseFactor = 1) {
    const base = this._alphaFromIntensity(this.intensity);
    const t = Math.max(0, Math.min(1, this.intensity / 100));
    const noiseAlpha = base * (0.3 + 0.4 * t);
    if (this.g) this.g.alpha = base * pulseFactor;
    if (this.layer1) this.layer1.alpha = noiseAlpha * 0.7;
    if (this.layer2) this.layer2.alpha = noiseAlpha;
  }

  _recalcParams() {
    const t = Math.max(0, Math.min(1, this.intensity / 100));
    const lerp = (a, b, u) => a + (b - a) * u;
    this.speed1 = { x: lerp(0.004, 0.02, t), y: lerp(0.0, 0.01, t) };
    this.speed2 = { x: lerp(-0.005, -0.015, t), y: lerp(0.003, 0.015, t) };
  }

  static _createNoiseTexture(w = 128, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 180 + Math.floor(Math.random() * 75); 
      img.data[i] = v * 0.4;
      img.data[i + 1] = v;
      img.data[i + 2] = v * 0.4;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return Texture.from(canvas);
  }
}

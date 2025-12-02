import { Graphics, BlurFilter } from 'pixi.js';

// Fog overlay: uneven semi-transparent patches drifting slowly with varying alpha.
export default class WeatherFog {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.patches = [];
    this.intensity = 0;

    // Soft blur for nicer fog appearance
    try {
      this.container.filters = [new BlurFilter({ strength: 2.2, quality: 2 })];
    } catch {}

    this.rebuild();
  }

  setIntensity(v) {
    const nv = Math.max(0, Math.min(100, Number(v) || 0));
    if (nv === this.intensity) return;
    this.intensity = nv;
    this.rebuild();
  }

  rebuild() {
    // Clear existing
    for (const p of this.patches) {
      try { p.g.parent && p.g.parent.removeChild(p.g); } catch {}
      try { p.g.destroy(); } catch {}
    }
    this.patches = [];

    const count = Math.round((this.intensity / 100) * 18); // up to ~18 patches
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const w = 80 + Math.random() * 220; // patch size
      const h = 50 + Math.random() * 160;
      const x = Math.random() * (this.width + 200) - 100;
      const y = Math.random() * (this.height + 120) - 60;
      const alpha = 0.08 + (this.intensity / 100) * (0.16 + Math.random() * 0.12); // denser with intensity
      const speed = 4 + Math.random() * 18; // px/s drift
      const vy = (Math.random() - 0.5) * 6; // slight vertical drift

      g.beginFill(0x9fb7c9, 1.0);
      // Draw an oval-ish rounded rectangle
      const radius = Math.min(w, h) * 0.45;
      g.drawRoundedRect(-w / 2, -h / 2, w, h, radius);
      g.endFill();
      g.alpha = alpha;
      g.x = x;
      g.y = y;
      this.container.addChild(g);
      this.patches.push({ g, w, h, vx: speed * (Math.random() < 0.5 ? -1 : 1), vy, alpha, phase: Math.random() * Math.PI * 2 });
    }
  }

  update(dtMs) {
    // live intensity update
    const cur = Math.max(0, Math.min(100, this.getIntensity()));
    if (cur !== this.intensity) this.setIntensity(cur);

    const dt = dtMs / 1000;
    const W = this.width;
    const H = this.height;
    for (const p of this.patches) {
      // drift
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;

      // gentle alpha oscillation for unevenness
      p.phase += dt * 0.5;
      const osc = (Math.sin(p.phase) + 1) * 0.5; // 0..1
      p.g.alpha = Math.max(0.02, Math.min(0.6, p.alpha * (0.7 + 0.6 * osc)));

      // wrap around edges to keep fog continuous
      if (p.g.x < -150) p.g.x = W + 150;
      if (p.g.x > W + 150) p.g.x = -150;
      if (p.g.y < -100) p.g.y = H + 100;
      if (p.g.y > H + 100) p.g.y = -100;
    }
  }

  destroy() {
    try { this.container.filters = []; } catch {}
    for (const p of this.patches) {
      try { p.g.parent && p.g.parent.removeChild(p.g); } catch {}
      try { p.g.destroy(); } catch {}
    }
    this.patches = [];
  }
}

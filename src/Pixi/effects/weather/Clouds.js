import { Graphics, BlurFilter } from 'pixi.js';

// Clouds overlay: organic cloud blobs drifting in the top 30% of the screen.
export default class WeatherClouds {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.bandHeight = Math.max(1, Math.floor(this.height * 0.3)); // top 30%
    this.patches = [];
    this.intensity = 0;

    // Soft blur for nicer cloud appearance
    try {
      this.container.filters = [new BlurFilter({ strength: 2.0, quality: 2 })];
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

    const count = Math.round((this.intensity / 100) * 18); // a bit fewer than fog by default
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const w = 140 + Math.random() * 300; // cloud size
      const h = 80 + Math.random() * 160;
      const x = Math.random() * (this.width + 200) - 100;
      const y = -40 + Math.random() * (this.bandHeight - 20); // only in band
      const alpha = 0.08 + (this.intensity / 100) * (0.12 + Math.random() * 0.08);
      const speed = 8 + Math.random() * 22; // horizontal drift speed
      const vy = (Math.random() - 0.5) * 4; // subtle vertical drift

      // Draw an organic cloud using overlapping circles (soft edges)
      const rx = w * 0.5;
      const ry = h * 0.5;
      const circles = 8 + Math.floor(Math.random() * 6); // 8..13 lobes
      const baseR = Math.min(rx, ry) * 0.55;
      for (let k = 0; k < circles; k++) {
        const t = (k / circles) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 0.2 + Math.random() * 0.35;
        const cx = Math.cos(t) * rx * dist;
        const cy = Math.sin(t) * ry * dist;
        const r = baseR * (0.7 + Math.random() * 0.7);
        g.circle(cx, cy, r);
      }
      // central mass
      g.circle(0, 0, baseR * (0.9 + Math.random() * 0.5));
      g.fill({ color: 0xffffff, alpha: 1.0 });
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
    const bandTop = -100; // allow spawn/wrap margin above
    const bandBottom = this.bandHeight - 20; // keep away from lower area
    for (const p of this.patches) {
      // drift
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;

      // very gentle alpha oscillation
      p.phase += dt * 0.35;
      const osc = (Math.sin(p.phase) + 1) * 0.5; // 0..1
      p.g.alpha = Math.max(0.04, Math.min(0.55, p.alpha * (0.75 + 0.5 * osc)));

      // wrap horizontally
      if (p.g.x < -180) p.g.x = W + 180;
      if (p.g.x > W + 180) p.g.x = -180;
      // constrain within top band vertically (wrap within band only)
      if (p.g.y < bandTop) p.g.y = bandBottom;
      if (p.g.y > bandBottom) p.g.y = bandTop;
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

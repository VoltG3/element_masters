import { Container, Graphics } from 'pixi.js';

// WaterSplashFX: lightweight pooled splash particles (droplets + ring ripples)
// API:
//   const fx = new WaterSplashFX(container)
//   fx.trigger({ x, y, strength, upward }) // upward=true for exit splash
//   fx.update(dtMs)
//   fx.resize(w,h) // noop (kept for symmetry)
//   fx.destroy()
export default class WaterSplashFX {
  constructor(container) {
    this.container = container;
    this.node = new Container();
    this.container.addChild(this.node);
    this.droplets = []; // {g,x,y,vx,vy,life,max}
    this.rings = [];    // {g,x,y,r,vr,life,max}
    this.maxDroplets = 48;
    this.maxRings = 6;
  }

  destroy() {
    try { this.node.parent && this.node.parent.removeChild(this.node); } catch {}
    try { this.node.destroy({ children: true }); } catch {}
    this.node = null;
    this.droplets = [];
    this.rings = [];
  }

  resize() {}

  trigger({ x = 0, y = 0, strength = 1, upward = false } = {}) {
    const s = Math.max(0.2, Math.min(3, Number(strength) || 1));
    // Ring ripple on surface (entry/exit)
    if (this.rings.length < this.maxRings) {
      const g = new Graphics();
      g.x = 0; g.y = 0; g.alpha = 0.8;
      this.node.addChild(g);
      this.rings.push({ g, x, y, r: 2 + 4 * s, vr: 0.08 + 0.12 * s, life: 0, max: 450 + 250 * s });
    }
    // Droplets burst
    const count = Math.floor(8 + 18 * s);
    for (let i = 0; i < count && this.droplets.length < this.maxDroplets; i++) {
      const ang = upward ? (-Math.PI * 0.15 + Math.random() * Math.PI * 0.3) : (Math.PI * 0.6 + (Math.random() - 0.5) * Math.PI * 0.6);
      const spd = (0.12 + Math.random() * 0.25) * (upward ? 1.2 : 1) * (0.6 + 0.8 * s);
      const g = new Graphics();
      g.x = 0; g.y = 0; g.alpha = 1;
      this.node.addChild(g);
      this.droplets.push({ g, x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0, max: 500 + Math.random() * 400 });
    }
  }

  update(dtMs) {
    const dt = Math.max(0, Number(dtMs) || 16.67);
    // Droplets update
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.life += dt;
      d.vy += 0.0018 * dt; // gravity
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const t = Math.min(1, d.life / d.max);
      const alpha = 1 - t;
      const size = 1 + 1.5 * (1 - t);
      const g = d.g; g.clear();
      g.circle(d.x, d.y, size);
      g.fill({ color: 0xc9ecff, alpha: Math.max(0, alpha) });
      if (d.life >= d.max) {
        try { g.parent && g.parent.removeChild(g); } catch {}
        try { g.destroy(); } catch {}
        this.droplets.splice(i, 1);
      }
    }
    // Rings update
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      r.r += r.vr * dt;
      const t = Math.min(1, r.life / r.max);
      const alpha = 0.6 * (1 - t);
      const g = r.g; g.clear();
      g.circle(r.x, r.y, r.r);
      g.stroke({ width: 1.5, color: 0xc9ecff, alpha: Math.max(0, alpha) });
      if (r.life >= r.max) {
        try { g.parent && g.parent.removeChild(g); } catch {}
        try { g.destroy(); } catch {}
        this.rings.splice(i, 1);
      }
    }
  }
}

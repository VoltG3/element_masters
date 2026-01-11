import { Container, Graphics } from 'pixi.js';

// LavaSteamFX: tiny steam puffs when rain/snow hits lava surface
// API:
//   const steam = new LavaSteamFX(parentContainer)
//   steam.trigger({ x, y, strength })
//   steam.update(dtMs)
//   steam.destroy()
export default class LavaSteamFX {
  constructor(container) {
    this.container = container;
    this.node = new Container();
    this.container.addChild(this.node);
    this.puffs = []; // {g,x,y,vx,vy,life,max,r}
    this.maxPuffs = 80;
  }

  destroy() {
    try { this.node.parent && this.node.parent.removeChild(this.node); } catch {}
    try { this.node.destroy({ children: true }); } catch {}
    this.node = null;
    this.puffs = [];
  }

  resize() {}

  trigger({ x = 0, y = 0, strength = 0.7 } = {}) {
    const s = Math.max(0.2, Math.min(2.5, Number(strength) || 0.7));
    const count = Math.max(2, Math.floor(3 + 4 * s));
    for (let i = 0; i < count && this.puffs.length < this.maxPuffs; i++) {
      const g = new Graphics();
      this.node.addChild(g);
      const vx = (Math.random() - 0.5) * (0.03 + 0.03 * s);
      const vy = -(0.08 + Math.random() * 0.08) * (0.8 + 0.4 * s);
      const r = 1.5 + Math.random() * (2.5 * s);
      const max = 450 + Math.random() * 350;
      this.puffs.push({ g, x, y: y - 2, vx, vy, life: 0, max, r });
    }
  }

  update(dtMs) {
    const dt = Math.max(0, Number(dtMs) || 16.67);
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // slight expansion and fade
      const t = Math.min(1, p.life / p.max);
      const alpha = 0.75 * (1 - t);
      const radius = p.r * (1 + 0.8 * t);
      const g = p.g; g.clear();
      // soft grey-white steam
      g.circle(p.x, p.y, radius);
      g.fill({ color: 0xdfdad2, alpha: Math.max(0, alpha) });
      if (p.life >= p.max) {
        try { g.parent && g.parent.removeChild(g); } catch {}
        try { g.destroy(); } catch {}
        this.puffs.splice(i, 1);
      }
    }
  }
}

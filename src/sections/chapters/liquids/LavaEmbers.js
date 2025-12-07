import { Container, Graphics } from 'pixi.js';

// LavaEmbers: ambient embers with tiny smoke trails spawning from lava surface tiles
// API:
//   const fx = new LavaEmbers(container, api, getIntensity)
//   fx.setIntensity(v)
//   fx.rebuildSurfaces({ mapWidth, mapHeight, tileSize, tileMapData, registryItems })
//   fx.update(dtMs)
//   fx.resize(w,h)
//   fx.destroy()
export default class LavaEmbers {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api || {};
    this.getIntensity = getIntensity || (() => 0);
    this.node = new Container();
    this.container.addChild(this.node);
    this.intensity = 0;
    this.time = 0;
    this.spawnAcc = 0;
    this.embers = []; // {g,x,y,vx,vy,life,max,trail}
    this.maxEmbers = 60;
    this.surfaces = []; // {x,y,w}
  }

  destroy() {
    try { this.node.parent && this.node.parent.removeChild(this.node); } catch {}
    try { this.node.destroy({ children: true }); } catch {}
    this.embers = [];
    this.surfaces = [];
  }

  setIntensity(v) {
    const nv = Math.max(0, Math.min(100, Number(v) || 0));
    this.intensity = nv;
  }

  resize() {}

  rebuildSurfaces({ mapWidth, mapHeight, tileSize, tileMapData, registryItems }) {
    const getDef = (id) => Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
    const isLava = (def) => !!(def && def.flags && def.flags.lava);
    const W = mapWidth, H = mapHeight, TS = tileSize;
    const spans = [];
    for (let gy = 0; gy < H; gy++) {
      let runStart = -1;
      for (let gx = 0; gx < W; gx++) {
        const idx = gy * W + gx;
        const id = tileMapData[idx];
        if (!id) { if (runStart !== -1) { runStart = -1; } continue; }
        const def = getDef(id);
        const aboveIdx = (gy - 1) * W + gx;
        const aboveLava = gy > 0 && isLava(getDef(tileMapData[aboveIdx]));
        const hereLava = isLava(def);
        const isSurface = hereLava && !aboveLava;
        if (isSurface) {
          if (runStart === -1) runStart = gx;
        } else {
          if (runStart !== -1) {
            const w = (gx - runStart) * TS;
            if (w > 0) spans.push({ x: runStart * TS, y: gy * TS, w });
            runStart = -1;
          }
        }
      }
      if (runStart !== -1) {
        const w = (W - runStart) * TS;
        if (w > 0) spans.push({ x: runStart * TS, y: gy * TS, w });
      }
    }
    this.surfaces = spans;
  }

  _spawnOne() {
    if (!this.surfaces.length) return;
    if (this.embers.length >= this.maxEmbers) return;
    const s = this.surfaces[Math.floor(Math.random() * this.surfaces.length)];
    const x = s.x + Math.random() * s.w;
    const y = s.y - 2; // just above surface
    const g = new Graphics();
    this.node.addChild(g);
    const vx = (Math.random() - 0.5) * 0.02; // small horizontal drift
    const vy = -0.05 - Math.random() * 0.06; // initial upward
    const life = 0; const max = 1200 + Math.random() * 1200; // 1.2..2.4s
    this.embers.push({ g, x, y, vx, vy, life, max, trail: [] });
  }

  update(dtMs) {
    const dt = Math.max(0, Number(dtMs) || 16.67);
    // live intensity
    const cur = Math.max(0, Math.min(100, this.getIntensity()))
    this.setIntensity(cur);
    if (this.intensity <= 0) return;

    // Spawn rate depends on intensity and surface count
    const baseRate = 0.0015 + 0.0035 * (this.intensity / 100); // embers per ms
    const mult = Math.max(0.5, Math.min(3, this.surfaces.length / 6));
    this.spawnAcc += dt * baseRate * mult;
    while (this.spawnAcc >= 1) {
      this._spawnOne();
      this.spawnAcc -= 1;
    }

    // Update embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life += dt;
      // motion: rise then fall slightly
      e.vy += 0.00006 * dt; // gravity slowly pulls down
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // record simple smoke trail points
      if (e.trail.length < 14) e.trail.push({ x: e.x, y: e.y });
      else { e.trail.shift(); e.trail.push({ x: e.x, y: e.y }); }

      const t = Math.min(1, e.life / e.max);
      const emberAlpha = 1 - t;
      const emberSize = 1 + 1.5 * (1 - t);
      const g = e.g; g.clear();
      // smoke trail (fainter)
      g.lineStyle({ width: 1, color: 0x555555, alpha: 0.25 * emberAlpha });
      for (let k = 1; k < e.trail.length; k++) {
        const p0 = e.trail[k - 1]; const p1 = e.trail[k];
        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
      }
      // glowing ember
      g.beginFill(0xffa229, 0.9 * emberAlpha);
      g.drawCircle(e.x, e.y, emberSize);
      g.endFill();

      if (e.life >= e.max) {
        try { g.parent && g.parent.removeChild(g); } catch {}
        try { g.destroy(); } catch {}
        this.embers.splice(i, 1);
      }
    }
  }
}

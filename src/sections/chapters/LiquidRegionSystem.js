import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';

// LiquidRegionSystem: groups contiguous liquid tiles (water/lava) into regions
// and renders each region as a masked, animated tiling surface (weather-like style)
// while constrained to the exact sector (region) shape.
//
// API:
//   const sys = new LiquidRegionSystem(parentContainer, { mapWidth, mapHeight, tileSize });
//   sys.build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
//   sys.update(dtMs);
//   sys.resize(mapWidth, mapHeight, tileSize);
//   sys.destroy();

export default class LiquidRegionSystem {
  constructor(container, opts = {}) {
    this.container = container;
    this.mapWidth = opts.mapWidth || 0;
    this.mapHeight = opts.mapHeight || 0;
    this.tileSize = opts.tileSize || 32;
    this._regions = []; // { type, node, mask, sprite }
    this._waterTex = null;
    this._lavaTex = null;
    this._time = 0;
  }

  destroy() {
    try {
      for (const r of this._regions) {
        try { if (r.node && r.node.parent) r.node.parent.removeChild(r.node); } catch {}
        try { r.node?.destroy({ children: true }); } catch {}
      }
    } catch {}
    this._regions = [];
    try { this._waterTex?.destroy(true); } catch {}
    try { this._lavaTex?.destroy(true); } catch {}
    this._waterTex = null;
    this._lavaTex = null;
  }

  clear() {
    for (const r of this._regions) {
      try { r.node?.parent && r.node.parent.removeChild(r.node); } catch {}
      try { r.node?.destroy({ children: true }); } catch {}
    }
    this._regions = [];
  }

  resize(mapWidth, mapHeight, tileSize) {
    const mw = Math.max(1, mapWidth | 0);
    const mh = Math.max(1, mapHeight | 0);
    const ts = Math.max(1, tileSize | 0);
    const changed = mw !== this.mapWidth || mh !== this.mapHeight || ts !== this.tileSize;
    this.mapWidth = mw; this.mapHeight = mh; this.tileSize = ts;
    if (changed) {
      // rebuild textures at new tile size; regions will be rebuilt by caller
      try { this._waterTex?.destroy(true); } catch {}
      try { this._lavaTex?.destroy(true); } catch {}
      this._waterTex = null; this._lavaTex = null;
    }
  }

  update(dtMs) {
    const dt = Math.max(0, Number(dtMs) || 16.67);
    this._time += dt;
    // Gentle drift speeds (px/ms) per liquid type
    const waterDrift = { x: 0.010, y: 0.004 };
    const lavaDrift = { x: -0.012, y: 0.006 };
    for (const r of this._regions) {
      const sprite = r.sprite;
      if (!sprite) continue;
      const drift = r.type === 'lava' ? lavaDrift : waterDrift;
      sprite.tilePosition.x += drift.x * dt;
      sprite.tilePosition.y += drift.y * dt;
      // Subtle alpha breathing for water
      if (r.type === 'water') {
        const pulse = 0.96 + 0.04 * Math.sin(this._time * 0.0012);
        sprite.alpha = 0.9 * pulse; // around ~0.86..0.94
      } else {
        sprite.alpha = 0.98;
      }
    }
  }

  build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems }) {
    if (!Array.isArray(tileMapData) || !Array.isArray(registryItems)) return;
    this.resize(mapWidth, mapHeight, tileSize);
    this.clear();

    const W = this.mapWidth;
    const H = this.mapHeight;
    const TS = this.tileSize;
    const count = W * H;

    const getDef = (id) => registryItems.find((r) => r.id === id);
    const typeAt = (i) => {
      const id = tileMapData[i];
      if (!id) return null;
      const def = getDef(id);
      if (!def || !def.flags || !def.flags.liquid) return null;
      if (def.flags.water) return 'water';
      if (def.flags.lava) return 'lava';
      return 'liquid';
    };

    const visited = new Uint8Array(count);
    const dirs = [1, -1, W, -W]; // 4-connectivity

    for (let i = 0; i < count; i++) {
      if (visited[i]) continue;
      const t = typeAt(i);
      if (!t) { visited[i] = 1; continue; }

      // Flood fill this region for same liquid type
      const regionTiles = [];
      const queue = [i];
      visited[i] = 1;
      while (queue.length) {
        const idx = queue.pop();
        regionTiles.push(idx);
        for (let d = 0; d < 4; d++) {
          const n = idx + dirs[d];
          if (n < 0 || n >= count) continue;
          if (visited[n]) continue;
          // prevent wrapping on left/right when using +/-1
          if (d < 2) {
            const row = Math.floor(idx / W);
            const nrow = Math.floor(n / W);
            if (row !== nrow) continue;
          }
          const nt = typeAt(n);
          if (nt === t) { visited[n] = 1; queue.push(n); }
          else { visited[n] = visited[n] || 0; }
        }
      }

      if (regionTiles.length === 0) continue;
      this._addRegion(t, regionTiles, W, H, TS);
    }
  }

  _addRegion(type, tileIndices, mapWidth, mapHeight, tileSize) {
    const node = new Container();
    const mask = new Graphics();
    const worldW = mapWidth * tileSize;
    const worldH = mapHeight * tileSize;

    // Draw mask as union of tile rects (grid-aligned)
    mask.clear();
    mask.beginFill(0xffffff, 1);
    for (let k = 0; k < tileIndices.length; k++) {
      const idx = tileIndices[k];
      const gx = (idx % mapWidth);
      const gy = Math.floor(idx / mapWidth);
      mask.drawRect(gx * tileSize, gy * tileSize, tileSize, tileSize);
    }
    mask.endFill();

    const tex = type === 'lava' ? (this._lavaTex || (this._lavaTex = this._createLavaTexture(tileSize)))
                                 : (this._waterTex || (this._waterTex = this._createWaterTexture(tileSize)));
    const tiling = new TilingSprite(tex, worldW, worldH);
    tiling.tileScale.set(1, 1);
    tiling.alpha = type === 'lava' ? 0.98 : 0.92;

    // Constrain fill to region mask
    node.addChild(tiling);
    node.addChild(mask);
    node.mask = mask;

    this.container.addChild(node);
    this._regions.push({ type, node, mask, sprite: tiling });
  }

  _createWaterTexture(tileSize) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize; canvas.height = tileSize;
    const ctx = canvas.getContext('2d');
    // base gradient
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, '#2a5d8f');
    g.addColorStop(1, '#174369');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);
    // ripples
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#8fc0ff';
    const bands = 3;
    for (let b = 0; b < bands; b++) {
      const y = Math.floor((tileSize / bands) * b + (tileSize / bands) * 0.5);
      ctx.fillRect(0, y, tileSize, Math.max(1, Math.floor(tileSize * 0.06)));
    }
    // top highlight
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#c9ecff';
    ctx.fillRect(0, 0, tileSize, Math.max(1, Math.floor(tileSize * 0.12)));
    return Texture.from(canvas);
  }

  _createLavaTexture(tileSize) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize; canvas.height = tileSize;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, '#6b1a07');
    g.addColorStop(1, '#c43f0f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);
    // veins
    ctx.globalAlpha = 0.3;
    for (let b = 0; b < 3; b++) {
      const y = Math.floor((tileSize / 3) * b + (tileSize / 3) * 0.5);
      const h = Math.max(1, Math.floor(tileSize * 0.07));
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#ffed8a');
      grad.addColorStop(1, '#ff7b00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, tileSize, h);
    }
    // bubbles
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd36e';
    const count = Math.max(2, Math.floor(tileSize * 0.12));
    for (let k = 0; k < count; k++) {
      const rx = Math.floor((k * 37) % tileSize);
      const ry = Math.floor((k * 53) % tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }
    return Texture.from(canvas);
  }
}

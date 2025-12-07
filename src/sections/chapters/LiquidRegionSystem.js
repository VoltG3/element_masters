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
    this._regions = []; // { type, node, mask, sprite, noise1, noise2, capG, topEdges }
    this._waterTex = null;
    this._lavaTex = null;
    this._time = 0;
    this._noiseTex = null;
  }

  // Query approximate surface Y (pixel) for a given X within liquid regions of type ('water'|'lava')
  getSurfaceY(type, x) {
    if (!Array.isArray(this._regions) || this._regions.length === 0) return null;
    const X = Math.max(0, Math.floor(Number(x) || 0));
    for (const r of this._regions) {
      if (r.type !== type) continue;
      if (!Array.isArray(r.topEdges)) continue;
      for (let i = 0; i < r.topEdges.length; i++) {
        const e = r.topEdges[i];
        if (X >= e.x && X <= e.x + e.w) {
          return e.y; // region tile top in pixels
        }
      }
    }
    return null;
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
    try { this._noiseTex?.destroy(true); } catch {}
    this._waterTex = null;
    this._lavaTex = null;
    this._noiseTex = null;
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

      // Animate noise overlays to break repetition
      if (r.noise1) {
        r.noise1.tilePosition.x += drift.x * 1.6 * dt;
        r.noise1.tilePosition.y += drift.y * 1.2 * dt;
      }
      if (r.noise2) {
        r.noise2.tilePosition.x += -drift.x * 1.1 * dt;
        r.noise2.tilePosition.y += drift.y * 0.9 * dt;
      }

      // Animate water surface cap (rim light) with slight sine undulation
      if (r.type === 'water' && r.capG && Array.isArray(r.topEdges) && r.topEdges.length) {
        const g = r.capG;
        const amp = Math.max(1, Math.floor(this.tileSize * 0.06));
        const thickness = Math.max(1, Math.floor(this.tileSize * 0.08));
        g.clear();
        g.beginFill(0xc9ecff, 0.35);
        for (let i = 0; i < r.topEdges.length; i++) {
          const e = r.topEdges[i];
          // slight vertical offset wave
          const dy = Math.sin((this._time * 0.002) + e.x * 0.15) * (amp * 0.5);
          g.drawRect(e.x, e.y - thickness + dy, e.w, thickness);
        }
        g.endFill();
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
    // To avoid hairline gaps between rows/columns due to AA/subpixel sampling,
    // slightly expand each rect by a small bleed so neighbors overlap.
    mask.clear();
    mask.beginFill(0xffffff, 1);
    const bleed = 0.5; // px
    for (let k = 0; k < tileIndices.length; k++) {
      const idx = tileIndices[k];
      const gx = (idx % mapWidth);
      const gy = Math.floor(idx / mapWidth);
      mask.drawRect(
        gx * tileSize - bleed,
        gy * tileSize - bleed,
        tileSize + bleed * 2,
        tileSize + bleed * 2
      );
    }
    mask.endFill();

    const tex = type === 'lava' ? (this._lavaTex || (this._lavaTex = this._createLavaTexture(tileSize)))
                                 : (this._waterTex || (this._waterTex = this._createWaterTexture(tileSize)));
    const tiling = new TilingSprite(tex, worldW, worldH);
    tiling.tileScale.set(1, 1);
    tiling.alpha = type === 'lava' ? 0.98 : 0.92;
    // Ensure integer placement to reduce sampling seams
    tiling.x = 0; tiling.y = 0;

    // Constrain fill to region mask
    node.addChild(tiling);
    // Add subtle noise overlays to break repetition
    const noiseTex = this._noiseTex || (this._noiseTex = this._createNoiseTexture(128, 128));
    const noise1 = new TilingSprite(noiseTex, worldW, worldH);
    const noise2 = new TilingSprite(noiseTex, worldW, worldH);
    // Different scales/alphas per liquid
    if (type === 'water') {
      noise1.tileScale.set(0.9, 1.1);
      noise2.tileScale.set(0.6, 0.7);
      noise1.alpha = 0.06; noise2.alpha = 0.08;
    } else {
      noise1.tileScale.set(1.2, 0.9);
      noise2.tileScale.set(0.7, 0.6);
      noise1.alpha = 0.08; noise2.alpha = 0.12;
    }
    node.addChild(noise1);
    node.addChild(noise2);

    node.addChild(mask);
    node.mask = mask;

    // Water surface rim highlight along top edges of the region
    let capG = null;
    let topEdges = null;
    if (type === 'water') {
      capG = new Graphics();
      node.addChild(capG);
      topEdges = this._computeTopEdgeSpans(tileIndices, mapWidth, tileSize);
    }

    this.container.addChild(node);
    this._regions.push({ type, node, mask, sprite: tiling, noise1, noise2, capG, topEdges });
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

  _createNoiseTexture(w = 128, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      // soft noise around mid-high values
      const v = 200 + Math.floor(Math.random() * 55); // 200..254
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return Texture.from(canvas);
  }

  // Given tile indices of a region, compute horizontal spans representing its top boundary per row.
  _computeTopEdgeSpans(tileIndices, mapWidth, tileSize) {
    // Build a set for O(1) membership
    const set = new Set(tileIndices);
    const spans = [];
    // For each tile that has no neighbor directly above, create a span; merge contiguous tiles in that row
    const tilesByRow = new Map();
    for (const idx of tileIndices) {
      const gy = Math.floor(idx / mapWidth);
      const gx = idx % mapWidth;
      const above = idx - mapWidth;
      if (!set.has(above)) {
        // This tile contributes to the top edge
        const rowList = tilesByRow.get(gy) || [];
        rowList.push(gx);
        tilesByRow.set(gy, rowList);
      }
    }
    // Merge contiguous gx into spans
    for (const [gy, cols] of tilesByRow.entries()) {
      cols.sort((a, b) => a - b);
      let start = null; let prev = null;
      for (const gx of cols) {
        if (start === null) { start = gx; prev = gx; continue; }
        if (gx === prev + 1) { prev = gx; continue; }
        // flush previous span
        spans.push({ x: start * tileSize, y: gy * tileSize, w: (prev - start + 1) * tileSize });
        start = gx; prev = gx;
      }
      if (start !== null) {
        spans.push({ x: start * tileSize, y: gy * tileSize, w: (prev - start + 1) * tileSize });
      }
    }
    return spans;
  }
}

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
    this._regions = []; // { type, node, mask, sprite, noise1, noise2, capG, topEdges, waves:[] }
    this._waterTex = null;
    this._lavaTex = null;
    this._time = 0;
    this._noiseTex = null;
    this._playerState = null; // Will be set from PixiStage
  }

  setPlayerState(playerState) {
    this._playerState = playerState;
  }

  _checkPlayerInRegion(region) {
    if (!this._playerState || !region || !region.node) return false;
    const p = this._playerState;
    const px = p.x || 0;
    const py = p.y || 0;
    const pw = p.width || 32;
    const ph = p.height || 32;
    // Simple AABB check against region bounds
    const b = region.node.getBounds();
    return (px + pw > b.x && px < b.x + b.width && py + ph > b.y && py < b.y + b.height);
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
      // Alpha: normally opaque, but becomes transparent when player is inside!
      // (We'll detect player position and adjust alpha accordingly)
      if (r.type === 'water') {
        // Check if player is in this water region (simplified check)
        const playerInRegion = this._checkPlayerInRegion(r);
        if (playerInRegion) {
          sprite.alpha = 0.50; // Transparent when player is inside - can see player/items!
        } else {
          sprite.alpha = 0.95; // Opaque when player is outside
        }
      } else {
        // Lava
        const playerInRegion = this._checkPlayerInRegion(r);
        if (playerInRegion) {
          sprite.alpha = 0.60; // Transparent when player is inside
        } else {
          sprite.alpha = 0.95; // Opaque when player is outside
        }
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

      // Update interactive surface waves (small ripples from impacts)
      if (!Array.isArray(r.waves)) r.waves = [];
      if (r.waves.length) {
        for (let i = r.waves.length - 1; i >= 0; i--) {
          const w = r.waves[i];
          w.t += dt; // ms
          // Lifetimes: water longer than lava
          const life = r.type === 'water' ? w.lifeMsWater : w.lifeMsLava;
          if (w.t >= life) { r.waves.splice(i, 1); continue; }
          // expand radius over time (px)
          w.radius = w.startRadius + w.speed * (w.t / 1000);
          // exponential decay of amplitude
          const decay = Math.exp(-w.t / (r.type === 'water' ? 1400 : 900));
          w.ampNow = w.amp * decay;
        }
      }

      // Animate water surface cap (rim light) with slight sine undulation
      if (r.type === 'water' && r.capG && Array.isArray(r.topEdges) && r.topEdges.length) {
        const g = r.capG;
        const amp = Math.max(1, Math.floor(this.tileSize * 0.06));
        const thickness = Math.max(1, Math.floor(this.tileSize * 0.08));
        g.clear();
        for (let i = 0; i < r.topEdges.length; i++) {
          const e = r.topEdges[i];
          // slight vertical offset wave
          let dy = Math.sin((this._time * 0.002) + e.x * 0.15) * (amp * 0.5);
          // Add contributions from interactive waves (Gaussian falloff)
          if (r.waves && r.waves.length) {
            // use span center for sampling; keeps draw perf O(spans + waves)
            const centerX = e.x + e.w * 0.5;
            for (let k = 0; k < r.waves.length; k++) {
              const w = r.waves[k];
              const dx = centerX - w.cx;
              const dist = Math.abs(dx);
              if (dist > w.radius + e.w * 0.6) continue; // early reject
              const sigma = Math.max(8, w.radius * 0.6);
              const gauss = Math.exp(-(dx * dx) / (2 * sigma * sigma));
              dy += w.ampNow * gauss;
            }
            // clamp to avoid excessive displacement
            const maxDisp = Math.max(2, this.tileSize * 0.22);
            if (dy > maxDisp) dy = maxDisp;
            if (dy < -maxDisp) dy = -maxDisp;
          }
          g.rect(e.x, e.y - thickness + dy, e.w, thickness);
        }
        g.fill({ color: 0xc9ecff, alpha: 0.35 });
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
    const bleed = 0.5; // px
    for (let k = 0; k < tileIndices.length; k++) {
      const idx = tileIndices[k];
      const gx = (idx % mapWidth);
      const gy = Math.floor(idx / mapWidth);
      mask.rect(
        gx * tileSize - bleed,
        gy * tileSize - bleed,
        tileSize + bleed * 2,
        tileSize + bleed * 2
      );
    }
    mask.fill({ color: 0xffffff, alpha: 1 });

    const tex = type === 'lava' ? (this._lavaTex || (this._lavaTex = this._createLavaTexture(tileSize)))
                                 : (this._waterTex || (this._waterTex = this._createWaterTexture(tileSize)));
        
    // LABOJUMS: Iestatām pareizu v8 addressMode, lai izvairītos no artefaktiem uz malām
    if (tex.source) {
      tex.source.addressMode = 'repeat';
    }

    const tiling = new TilingSprite({
      texture: tex,
      width: worldW,
      height: worldH
    });
        
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
    this._regions.push({ type, node, mask, sprite: tiling, noise1, noise2, capG, topEdges, waves: [] });
  }

  _createWaterTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = tileSize * 2;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // LABOJUMS: Mainām gradientu uz "seamless" (bežšuvju). 
    // Sākam un beidzam ar to pašu krāsu, lai atkārtojoties nebūtu svītras.
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#3a7fb8');     // Vidēji zils
    g.addColorStop(0.5, '#5ba3d9');   // Gaiši zils (centrā)
    g.addColorStop(1, '#3a7fb8');     // Atpakaļ uz vidēji zilu
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Simple noise function for organic look
    const noise = (x, y, scale) => {
      const val = Math.sin(x * scale) * Math.cos(y * scale * 1.3) +
                  Math.sin(x * scale * 2.1 + 1.7) * Math.cos(y * scale * 1.7 + 2.3);
      return (val + 2) / 4; // 0..1
    };

    // Add subtle organic pattern with noise (no obvious horizontal lines)
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n = noise(x, y, 0.05);
        // Subtle brightness variation
        const brightness = 0.95 + n * 0.1;
        data[idx] = Math.min(255, data[idx] * brightness);     // R
        data[idx + 1] = Math.min(255, data[idx + 1] * brightness); // G
        data[idx + 2] = Math.min(255, data[idx + 2] * brightness); // B
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // LABOJUMS: Noņemam vai padarām šo "shimmer" caurspīdīgu abās malās.
    // Šobrīd šis zīmēja baltu svītru tikai augšā, kas radīja horizontālo līniju ik pēc 64 pikseļiem.
    return Texture.from(canvas);
  }

  _createLavaTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = tileSize * 2;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // LABOJUMS: Seamless gradients lavai
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#ffa229');     // Galvenā krāsa
    g.addColorStop(0.5, '#ffb84d');   // Gaišāks centrs
    g.addColorStop(1, '#ffa229');     // Galvenā krāsa
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Simple noise function for organic flow
    const noise = (x, y, scale) => {
      const val = Math.sin(x * scale * 0.8) * Math.cos(y * scale * 1.5) +
                  Math.sin(x * scale * 1.9 + 2.1) * Math.cos(y * scale * 1.3 + 1.7);
      return (val + 2) / 4; // 0..1
    };

    // Add organic pattern with noise - no horizontal lines!
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n1 = noise(x, y, 0.06);
        const n2 = noise(x * 1.3, y * 0.7, 0.04);
        // Combine noise for flowing veins effect
        const brightness = 0.9 + n1 * 0.15 + n2 * 0.1;
        data[idx] = Math.min(255, data[idx] * brightness);     // R
        data[idx + 1] = Math.min(255, data[idx + 1] * brightness); // G
        data[idx + 2] = Math.min(255, data[idx + 2] * brightness); // B

        // Add bright spots where noise peaks
        if (n1 > 0.7 && n2 > 0.6) {
          const glow = (n1 + n2 - 1.3) * 80;
          data[idx] = Math.min(255, data[idx] + glow);
          data[idx + 1] = Math.min(255, data[idx + 1] + glow * 0.7);
          data[idx + 2] = Math.min(255, data[idx + 2] + glow * 0.3);
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Noņemam fiksēto virsmas spīdumu šeit, jo tas atkārtojas horizontāli.
    // Virsmas spīdums jau tiek zīmēts ar capG dinamiski.

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

  // Public: add a ripple/wave on a liquid surface of given type at world x
  // type: 'water'|'lava'
  // x: world pixel X
  // strength: 0.2..3 roughly; maps to amplitude and speed
  addWave(type, x, strength = 1) {
    const t = (type === 'lava') ? 'lava' : 'water';
    const X = Math.max(0, Math.min(this.mapWidth * this.tileSize, Number(x) || 0));
    // Find region and a top edge span containing x
    for (const r of this._regions) {
      if (r.type !== t) continue;
      const spans = r.topEdges;
      if (!Array.isArray(spans) || spans.length === 0) continue;
      for (let i = 0; i < spans.length; i++) {
        const e = spans[i];
        if (X >= e.x && X <= e.x + e.w) {
          if (!Array.isArray(r.waves)) r.waves = [];
          // Cap total waves to keep perf stable
          if (r.waves.length > 24) r.waves.shift();
          const ts = this.tileSize;
          const s = Math.max(0.15, Math.min(3, Number(strength) || 1));
          const baseAmp = (t === 'water') ? ts * 0.18 : ts * 0.10; // pixels
          const amp = baseAmp * (0.4 + 0.6 * Math.min(1.0, s));
          const speed = (t === 'water') ? (40 + 60 * s) : (30 + 40 * s); // px/s growth
          const startRadius = Math.max(4, ts * 0.2);
          // lifetimes in ms
          const lifeMsWater = 1600 + 900 * s;
          const lifeMsLava = 900 + 600 * s;
          r.waves.push({ cx: X, t: 0, amp, ampNow: amp, speed, radius: startRadius, startRadius, lifeMsWater, lifeMsLava });
          return true;
        }
      }
    }
    return false;
  }
}

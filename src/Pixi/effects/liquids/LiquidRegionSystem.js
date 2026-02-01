import { Container, Graphics, Texture, TilingSprite, Sprite } from 'pixi.js';

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
    this.bgContainer = opts.bgContainer || null;
    this.mapWidth = opts.mapWidth || 0;
    this.mapHeight = opts.mapHeight || 0;
    this.tileSize = opts.tileSize || 32;
    this._regions = []; // { type, node, mask, sprite, noise1, noise2, capG, topEdges, waves:[] }
    this._waterTex = null;
    this._lavaTex = null;
    this._quicksandTex = null;
    this._waterfallTex = null;
    this._lavaWaterfallTex = null;
    this._radioactiveWaterTex = null;
    this._radioactiveWaterfallTex = null;
    this._time = 0;
    this._noiseTex = null;
    this._lavaDetailTex = null;
    this._waterDetailTex = null;
    this._quicksandDetailTex = null;
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

    // Use multiple sample points for better precision
    // 1. Center
    const points = [
      { x: px + pw * 0.5, y: py + ph * 0.5 },
      { x: px + pw * 0.5, y: py + ph * 0.1 }, // Top
      { x: px + pw * 0.5, y: py + ph * 0.9 }, // Bottom
    ];

    for (const pt of points) {
      const gx = Math.floor(pt.x / this.tileSize);
      const gy = Math.floor(pt.y / this.tileSize);
      const idx = gy * this.mapWidth + gx;
      if (region.tileIndicesSet && region.tileIndicesSet.has(idx)) {
        return true;
      }
    }

    return false;
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
        try { if (r.bgNode && r.bgNode.parent) r.bgNode.parent.removeChild(r.bgNode); } catch {}
        try { r.node?.destroy({ children: true }); } catch {}
        try { r.bgNode?.destroy({ children: true }); } catch {}
      }
    } catch {}
    this._regions = [];
    try { this._waterTex?.destroy(true); } catch {}
    try { this._lavaTex?.destroy(true); } catch {}
    try { this._quicksandTex?.destroy(true); } catch {}
    try { this._waterfallTex?.destroy(true); } catch {}
    try { this._lavaWaterfallTex?.destroy(true); } catch {}
    try { this._radioactiveWaterTex?.destroy(true); } catch {}
    try { this._radioactiveWaterfallTex?.destroy(true); } catch {}
    try { this._noiseTex?.destroy(true); } catch {}
    try { this._lavaDetailTex?.destroy(true); } catch {}
    try { this._waterDetailTex?.destroy(true); } catch {}
    try { this._quicksandDetailTex?.destroy(true); } catch {}
    this._waterTex = null;
    this._lavaTex = null;
    this._quicksandTex = null;
    this._waterfallTex = null;
    this._lavaWaterfallTex = null;
    this._radioactiveWaterTex = null;
    this._radioactiveWaterfallTex = null;
    this._noiseTex = null;
    this._lavaDetailTex = null;
    this._waterDetailTex = null;
    this._quicksandDetailTex = null;
    if (this._gradTextures) {
      for (const k in this._gradTextures) {
        try { this._gradTextures[k].destroy(true); } catch {}
      }
      this._gradTextures = null;
    }
  }

  clear() {
    for (const r of this._regions) {
      try { r.node?.parent && r.node.parent.removeChild(r.node); } catch {}
      try { r.bgNode?.parent && r.bgNode.parent.removeChild(r.bgNode); } catch {}
      try { r.node?.destroy({ children: true }); } catch {}
      try { r.bgNode?.destroy({ children: true }); } catch {}
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
      try { this._quicksandTex?.destroy(true); } catch {}
      try { this._waterfallTex?.destroy(true); } catch {}
      try { this._lavaWaterfallTex?.destroy(true); } catch {}
      try { this._radioactiveWaterTex?.destroy(true); } catch {}
      try { this._radioactiveWaterfallTex?.destroy(true); } catch {}
      try { this._lavaDetailTex?.destroy(true); } catch {}
      try { this._waterDetailTex?.destroy(true); } catch {}
      try { this._quicksandDetailTex?.destroy(true); } catch {}
      this._waterTex = null; this._lavaTex = null; this._quicksandTex = null; this._waterfallTex = null;
      this._lavaWaterfallTex = null;
      this._radioactiveWaterTex = null; this._radioactiveWaterfallTex = null;
      this._lavaDetailTex = null; this._waterDetailTex = null; this._quicksandDetailTex = null;
    }
  }

  update(dtMs) {
    const dt = Math.max(0, Number(dtMs) || 16.67);
    this._time += dt;
    // Gentle drift speeds (px/ms) per liquid type
    const waterDrift = { x: 0, y: 0 }; // Static (bubbles added via texture/noise)
    const lavaDrift = { x: 0, y: 0 }; // Static (floating pieces added via noise/texture)
    const quicksandDrift = { x: 0, y: 0 }; // Static (pixels fade via noise)
    const waterfallDrift = { x: 0, y: 0.15 }; // Fast vertical drift
    const lavaWaterfallDrift = { x: 0, y: 0.12 }; // Lava falls a bit slower/thicker
    const radioactiveWaterDrift = { x: 0, y: 0 }; // Static
    const radioactiveWaterfallDrift = { x: 0, y: 0.12 }; // Match lava waterfall speed or similar
    for (const r of this._regions) {
      const sprite = r.sprite;
      if (!sprite) continue;
      const drift = r.type === 'lava' ? lavaDrift : (r.type === 'quicksand' ? quicksandDrift : (r.type === 'waterfall' ? waterfallDrift : (r.type === 'lava_waterfall' ? lavaWaterfallDrift : (r.type === 'radioactive_waterfall' ? radioactiveWaterfallDrift : (r.type === 'radioactive_water' ? radioactiveWaterDrift : waterDrift)))));
      sprite.tilePosition.x += drift.x * dt;
      sprite.tilePosition.y += drift.y * dt;
      // Alpha: normally opaque, but becomes transparent when player is inside!
      // (We'll detect player position and adjust alpha accordingly with smooth transitions)
      let targetAlpha = 0.95;
      if (r.type === 'water') {
        const playerInRegion = this._checkPlayerInRegion(r);
        targetAlpha = playerInRegion ? 0.35 : 0.45;
      } else if (r.type === 'quicksand') {
        const playerInRegion = this._checkPlayerInRegion(r);
        targetAlpha = playerInRegion ? 0.55 : 0.75;
      } else if (r.type === 'waterfall' || r.type === 'lava_waterfall' || r.type === 'radioactive_waterfall') {
        const playerInRegion = this._checkPlayerInRegion(r);
        targetAlpha = playerInRegion ? 0.30 : 0.45;
      } else if (r.type === 'radioactive_water') {
        const playerInRegion = this._checkPlayerInRegion(r);
        targetAlpha = playerInRegion ? 0.40 : 0.50;
      } else {
        // Lava
        const playerInRegion = this._checkPlayerInRegion(r);
        targetAlpha = playerInRegion ? 0.45 : 0.60;
      }

      // Smooth transition (lerp)
      if (r.currentAlpha === undefined) r.currentAlpha = sprite.alpha;
      const lerpFactor = 0.005; // Adjust for speed of transition
      const alphaDiff = targetAlpha - r.currentAlpha;
      r.currentAlpha += alphaDiff * Math.min(1, dt * lerpFactor);
      sprite.alpha = r.currentAlpha;

      // Splash animation for waterfalls
      if ((r.type === 'waterfall' || r.type === 'lava_waterfall' || r.type === 'radioactive_waterfall') && r.splashG && Array.isArray(r.bottomEdges)) {
        const g = r.splashG;
        g.clear();
        const thickness = Math.max(2, Math.floor(this.tileSize * 0.25));
        const F = 1000;
        const cycle = (this._time % F) / F;
        
        for (const e of r.bottomEdges) {
          // Animated foam/splash at the bottom
          const splashHeight = thickness * (0.8 + Math.sin(this._time * 0.01 + e.x) * 0.2);
          g.rect(e.x, e.y + this.tileSize - splashHeight, e.w, splashHeight);
          
          // Bubbles
          for (let k = 0; k < 5; k++) {
             const bx = e.x + ((e.x * 13 + k * 37 + this._time * 0.05) % e.w);
             const by = e.y + this.tileSize - (Math.random() * thickness * 2);
             g.circle(bx, by, 1 + Math.random() * 2);
          }
        }
        const splashColor = r.type === 'lava_waterfall' ? 0xffcc00 : (r.type === 'radioactive_waterfall' ? 0xadff2f : 0xffffff);
        g.fill({ color: splashColor, alpha: 0.5 + Math.sin(this._time * 0.02) * 0.2 });
      }

      // Animate noise/detail overlays
      if (r.noise1) {
        if (r.type === 'water') {
          r.noise1.tilePosition.y -= 0.015 * dt; // Bubbles go UP
          r.noise1.tilePosition.x += Math.sin(this._time * 0.001) * 0.005 * dt; 
        } else if (r.type === 'lava') {
          r.noise1.tilePosition.x += 0.004 * dt; 
          r.noise1.tilePosition.y += 0.002 * dt;
        } else if (r.type === 'quicksand') {
          // Fade effect for pixels
          r.noise1.alpha = 0.4 + Math.sin(this._time * 0.001) * 0.2;
          r.noise1.tilePosition.x += 0.001 * dt;
        } else if (r.type.includes('waterfall')) {
          r.noise1.tilePosition.y += drift.y * 0.8 * dt;
          r.noise1.tilePosition.x += Math.sin(this._time * 0.002) * 0.02 * dt;
        } else {
          r.noise1.tilePosition.x += 0.008 * dt;
          r.noise1.tilePosition.y += 0.004 * dt;
        }
      }
      if (r.noise2) {
        if (r.type === 'quicksand') {
          r.noise2.alpha = 0.2 + Math.cos(this._time * 0.0015) * 0.1;
        } else if (r.type.includes('waterfall')) {
          r.noise2.tilePosition.y += drift.y * 1.2 * dt;
        } else {
          r.noise2.tilePosition.x -= 0.005 * dt;
          r.noise2.tilePosition.y += 0.003 * dt;
        }
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
      if (def.flags.lava_waterfall) return 'lava_waterfall';
      if (def.flags.radioactive_waterfall) return 'radioactive_waterfall';
      if (def.flags.waterfall) return 'waterfall';
      if (def.flags.radioactive_water) return 'radioactive_water';
      if (def.flags.quicksand) return 'quicksand';
      if (def.flags.lava) return 'lava';
      if (def.flags.water) return 'water';
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

        const tileIndicesSet = new Set(tileIndices);

        mask.clear();
        const bleed = 1; // Palielināts bleed, lai nosegtu spraugas
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
                                     : (type === 'quicksand' ? (this._quicksandTex || (this._quicksandTex = this._createQuicksandTexture(tileSize)))
                                     : (type === 'waterfall' ? (this._waterfallTex || (this._waterfallTex = this._createWaterfallTexture(tileSize)))
                                     : (type === 'lava_waterfall' ? (this._lavaWaterfallTex || (this._lavaWaterfallTex = this._createLavaWaterfallTexture(tileSize)))
                                     : (type === 'radioactive_waterfall' ? (this._radioactiveWaterfallTex || (this._radioactiveWaterfallTex = this._createRadioactiveWaterfallTexture(tileSize)))
                                     : (type === 'radioactive_water' ? (this._radioactiveWaterTex || (this._radioactiveWaterTex = this._createRadioactiveWaterTexture(tileSize)))
                                     : (this._waterTex || (this._waterTex = this._createWaterTexture(tileSize))))))));
        
        // v8 addressMode iestatīšana
        if (tex.source && tex.source.style) {
          tex.source.style.addressMode = 'repeat';
        }

        const tiling = new TilingSprite({
          texture: tex,
          width: worldW,
          height: worldH
        });
        
        tiling.tileScale.set(1, 1);
        tiling.alpha = type === 'lava' ? 0.60 : ((type === 'waterfall' || type === 'lava_waterfall' || type === 'radioactive_waterfall') ? 0.45 : (type === 'quicksand' ? 0.75 : 0.45));
        node.addChild(tiling);

        // Noise/Detail slāņi
        let detailTex1, detailTex2;
        if (type.includes('lava')) {
          detailTex1 = this._lavaDetailTex || (this._lavaDetailTex = this._createLavaDetailTexture());
          detailTex2 = this._noiseTex || (this._noiseTex = this._createNoiseTexture());
        } else if (type === 'quicksand') {
          detailTex1 = this._quicksandDetailTex || (this._quicksandDetailTex = this._createQuicksandDetailTexture());
          detailTex2 = this._noiseTex || (this._noiseTex = this._createNoiseTexture());
        } else if (type.includes('radioactive')) {
          detailTex1 = this._noiseTex || (this._noiseTex = this._createNoiseTexture());
          detailTex2 = this._noiseTex;
        } else {
          // water, waterfall
          detailTex1 = this._waterDetailTex || (this._waterDetailTex = this._createWaterDetailTexture());
          detailTex2 = this._noiseTex || (this._noiseTex = this._createNoiseTexture());
        }

        if (detailTex1.source && detailTex1.source.style) detailTex1.source.style.addressMode = 'repeat';
        if (detailTex2.source && detailTex2.source.style) detailTex2.source.style.addressMode = 'repeat';

        const noise1 = new TilingSprite({ texture: detailTex1, width: worldW, height: worldH });
        const noise2 = new TilingSprite({ texture: detailTex2, width: worldW, height: worldH });
        
        if (type === 'water' || type === 'radioactive_water') {
          noise1.alpha = 0.25; noise2.alpha = 0.15;
        } else if (type === 'waterfall' || type === 'lava_waterfall' || type === 'radioactive_waterfall') {
          noise1.alpha = 0.2; noise2.alpha = 0.15;
        } else if (type === 'lava') {
          noise1.alpha = 0.4; noise2.alpha = 0.2;
        } else if (type === 'quicksand') {
          noise1.alpha = 0.6; noise2.alpha = 0.3;
        } else {
          noise1.alpha = 0.12; noise2.alpha = 0.15;
        }
        node.addChild(noise1, noise2);

        // LABOJUMS: Maska tiek pievienota kā bērns, lai tā sekotu līdzi node koordinātām
        node.addChild(mask);
        node.mask = mask;

        // Background slānis (zIndex 28) - lai aizsegtu fonu caur ūdeni
        let bgNode = null;
        if (this.bgContainer) {
          bgNode = new Container();
          const bgMask = new Graphics();
          bgMask.clear();
          for (let k = 0; k < tileIndices.length; k++) {
            const idx = tileIndices[k];
            const gx = (idx % mapWidth);
            const gy = Math.floor(idx / mapWidth);
            bgMask.rect(gx * tileSize - bleed, gy * tileSize - bleed, tileSize + bleed * 2, tileSize + bleed * 2);
          }
          bgMask.fill({ color: 0xffffff, alpha: 1 });
          bgNode.addChild(bgMask);
          bgNode.mask = bgMask;

          const bgG = new Graphics();
          let minY = Infinity, maxY = -Infinity;
          for (let k = 0; k < tileIndices.length; k++) {
            const gy = Math.floor(tileIndices[k] / mapWidth) * tileSize;
            if (gy < minY) minY = gy;
            if (gy + tileSize > maxY) maxY = gy + tileSize;
          }

          if (!this._gradTextures) this._gradTextures = {};
          if (!this._gradTextures[type]) {
            let color, bottomColor;
            if (type.includes('lava')) {
              color = '#ffaa00'; bottomColor = '#884400';
            } else if (type.includes('radioactive')) {
              color = '#004400'; bottomColor = '#001100';
            } else if (type === 'quicksand') {
              color = '#5d4037'; bottomColor = '#2d1d19';
            } else { 
              color = '#3a7fb8'; bottomColor = '#0b1d2e';
            }
            this._gradTextures[type] = this._createGradientTexture(color, bottomColor);
          }

          const bgSprite = new Sprite(this._gradTextures[type]);
          bgSprite.width = worldW;
          bgSprite.height = worldH;
          bgSprite.y = 0;
          
          bgNode.addChild(bgSprite);
          this.bgContainer.addChild(bgNode);
        }

        const baseAlpha = type === 'lava' ? 0.60 : ((type === 'waterfall' || type === 'lava_waterfall' || type === 'radioactive_waterfall') ? 0.45 : (type === 'quicksand' ? 0.75 : 0.45));

        if (type === 'water' || type === 'radioactive_water') {
          const capG = new Graphics();
          node.addChild(capG);
          const topEdges = this._computeTopEdgeSpans(tileIndices, mapWidth, tileSize);
          // Saglabājam atsauces uz r reģistrā
          this._regions.push({ type, node, bgNode, mask, sprite: tiling, noise1, noise2, capG, topEdges, waves: [], tileIndicesSet, currentAlpha: baseAlpha });
        } else if (type === 'waterfall' || type === 'lava_waterfall' || type === 'radioactive_waterfall') {
          const splashG = new Graphics();
          node.addChild(splashG);
          const bottomEdges = this._computeBottomEdgeSpans(tileIndices, mapWidth, tileSize);
          this._regions.push({ type, node, bgNode, mask, sprite: tiling, noise1, noise2, splashG, bottomEdges, tileIndicesSet, currentAlpha: baseAlpha });
        } else {
          this._regions.push({ type, node, bgNode, mask, sprite: tiling, noise1, noise2, waves: [], tileIndicesSet, currentAlpha: baseAlpha });
        }

        this.container.addChild(node);
      }

      _createGradientTexture(topColor, bottomColor) {
        const canvas = document.createElement('canvas');
        const size = 64; 
        canvas.width = 2; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, size);
        g.addColorStop(0, topColor);
        g.addColorStop(1, bottomColor);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2, size);
        return Texture.from(canvas);
      }

  _createWaterTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Solid color instead of gradient to remove horizontal bars
    ctx.fillStyle = '#3a7fb8';
    ctx.fillRect(0, 0, size, size);

    return Texture.from(canvas);
  }

  _createLavaTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Solid color instead of gradient
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, size, size);

    return Texture.from(canvas);
  }

  _createLavaWaterfallTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // No horizontal gradient to remove bars
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, size, size);

    // Lava pieces/streaks (vertical) - these go down
    ctx.fillStyle = '#ffed8a';
    for (let k = 0; k < 10; k++) {
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const h = 10 + Math.random() * 15;
      const w = 3 + Math.random() * 4; // Wider "chunks"
      ctx.fillRect(x, y, w, h);
      if (y + h > size) ctx.fillRect(x, y - size, w, h);
    }

    return Texture.from(canvas);
  }

  _createQuicksandTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Solid sand color
    ctx.fillStyle = '#a6915b';
    ctx.fillRect(0, 0, size, size);

    // grainy texture (static here, will animate pixels via noise)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#5c5031';
    for (let k = 0; k < 25; k++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }

    return Texture.from(canvas);
  }

  _createWaterfallTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background color
    ctx.fillStyle = '#3a7fb8';
    ctx.fillRect(0, 0, size, size);

    // Vertical streaks
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 15; k++) {
      ctx.globalAlpha = 0.1 + Math.random() * 0.4;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const h = 10 + Math.random() * 25;
      const w = 1 + Math.random() * 2;
      ctx.fillRect(x, y, w, h);
      if (y + h > size) ctx.fillRect(x, y - size, w, h);
    }

    return Texture.from(canvas);
  }

  _createRadioactiveWaterTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Solid toxic green
    ctx.fillStyle = '#1a5c1a';
    ctx.fillRect(0, 0, size, size);

    // Some mini bubbles (static here, noise provides movement)
    ctx.fillStyle = '#adff2f';
    for (let k = 0; k < 12; k++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    return Texture.from(canvas);
  }

  _createRadioactiveWaterfallTexture(tileSize) {
    const canvas = document.createElement('canvas');
    const size = 64; 
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a5c1a';
    ctx.fillRect(0, 0, size, size);

    // Vertical streaks
    ctx.fillStyle = '#adff2f';
    for (let k = 0; k < 12; k++) {
      ctx.globalAlpha = 0.15 + Math.random() * 0.3;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const h = 8 + Math.random() * 15;
      const w = 1 + Math.random() * 2;
      ctx.fillRect(x, y, w, h);
      if (y + h > size) ctx.fillRect(x, y - size, w, h);
    }
    
    // Pievienojam burbuļus (prasība: "var pieveinot burbuļus kuri iet uzleju kā radioactive water")
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    return Texture.from(canvas);
  }

  _createLavaDetailTexture(w = 128, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff8800'; 
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      const sw = 12 + Math.random() * 24;
      const sh = 10 + Math.random() * 20;
      ctx.fillRect(Math.random() * w, Math.random() * h, sw, sh);
    }
    return Texture.from(canvas);
  }

  _createWaterDetailTexture(w = 128, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      ctx.globalAlpha = 0.2 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return Texture.from(canvas);
  }

  _createQuicksandDetailTexture(w = 128, h = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#5c5031';
    for (let i = 0; i < 100; i++) {
      ctx.globalAlpha = 0.1 + Math.random() * 0.5;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    return Texture.from(canvas);
  }

  _createNoiseTexture(w = 256, h = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    for(let i=0; i<500; i++) {
      ctx.globalAlpha = Math.random() * 0.05;
      ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
    }

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

  // Given tile indices of a region, compute horizontal spans representing its bottom boundary per row.
  _computeBottomEdgeSpans(tileIndices, mapWidth, tileSize) {
    const set = new Set(tileIndices);
    const spans = [];
    const tilesByRow = new Map();
    for (const idx of tileIndices) {
      const gy = Math.floor(idx / mapWidth);
      const gx = idx % mapWidth;
      const below = idx + mapWidth;
      if (!set.has(below)) {
        const rowList = tilesByRow.get(gy) || [];
        rowList.push(gx);
        tilesByRow.set(gy, rowList);
      }
    }
    for (const [gy, cols] of tilesByRow.entries()) {
      cols.sort((a, b) => a - b);
      let start = null; let prev = null;
      for (const gx of cols) {
        if (start === null) { start = gx; prev = gx; continue; }
        if (gx === prev + 1) { prev = gx; continue; }
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

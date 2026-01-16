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
    this.windDirection = 1; // 1: from left to right, -1: from right to left

    // Soft blur for nicer cloud appearance
    try {
      this.container.filters = [new BlurFilter({ strength: 2.0, quality: 2 })];
    } catch {}

    this.rebuild();
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(100, Number(v) || 0));
  }

  spawnOne(isInitial = false) {
    const g = new Graphics();
    const w = 140 + Math.random() * 300; // cloud size
    const h = 80 + Math.random() * 160;
    
    // Get viewport info if available
    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    const vX = viewport ? viewport.x : 0;
    const vY = viewport ? viewport.y : 0;
    const vW = viewport ? viewport.width : this.width;

    let x;
    if (isInitial) {
      // Initial scatter across the whole viewport (or map if no viewport)
      const range = Math.max(vW, this.width) + 800;
      const startX = viewport ? vX - 400 : -400;
      x = startX + Math.random() * range;
    } else if (viewport) {
      // Dynamic spawn: place in or near viewport so the user sees results quickly
      // We scatter them in a wider area around viewport [x-400, x+width+400]
      x = viewport.x - 400 + Math.random() * (viewport.width + 800);
    } else {
      // Fallback to edges
      x = (Math.random() < 0.5 ? -180 : this.width + 180);
    }
    
    const y = vY - 40 + Math.random() * (this.bandHeight - 20); // only in band
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
    g.alpha = 0; // Start invisible for fade-in
    g.x = x;
    g.y = y;
    this.container.addChild(g);
    this.patches.push({ 
      g, w, h, 
      vx: speed * this.windDirection, 
      vy, 
      targetAlpha: alpha, 
      currentAlpha: 0,
      phase: Math.random() * Math.PI * 2,
      dying: false
    });
  }

  resize(width, height) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    // We don't change this.width/height here as they are map bounds,
    // but we can update bandHeight if the screen height changed significantly.
    this.bandHeight = Math.max(1, Math.floor(h * 0.3)); 
  }

  rebuild() {
    // Clear existing
    for (const p of this.patches) {
      try { p.g.parent && p.g.parent.removeChild(p.g); } catch {}
      try { p.g.destroy(); } catch {}
    }
    this.patches = [];

    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    const vW = viewport ? viewport.width : 1280;
    const targetCount = Math.round((this.intensity / 100) * 18 * (vW / 1280));
    
    for (let i = 0; i < targetCount; i++) {
      this.spawnOne(true);
      // For initial ones, set alpha immediately
      if (this.patches.length > 0) {
        const p = this.patches[this.patches.length - 1];
        p.currentAlpha = p.targetAlpha;
        p.g.alpha = p.currentAlpha;
      }
    }
  }

  update(dtMs) {
    // Live intensity update with smoothing
    const targetIntensity = Math.max(0, Math.min(100, this.getIntensity()));
    if (Math.abs(targetIntensity - this.intensity) > 0.1) {
      const lerpFactor = 1 - Math.exp(-0.0015 * dtMs);
      this.intensity += (targetIntensity - this.intensity) * lerpFactor;
    } else if (this.intensity !== targetIntensity) {
      this.intensity = targetIntensity;
    }

    const dt = dtMs / 1000;
    const W = this.width;
    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    const vX = viewport ? viewport.x : 0;
    const vY = viewport ? viewport.y : 0;
    const vW = viewport ? viewport.width : 1280;
    const vH = viewport ? viewport.height : 720;

    const bandTop = vY - 100;
    const bandBottom = vY + this.bandHeight;

    // Adjust cloud count gradually
    // We scale target count based on viewport width (default 18 for 1280px)
    const targetCount = Math.round((this.intensity / 100) * 18 * (vW / 1280));
    
    const activePatches = this.patches.filter(p => {
      if (p.dying) return false;
      if (!viewport) return true;
      // Only count patches that are within a reasonable distance of the viewport
      return p.g.x > vX - 1000 && p.g.x < vX + vW + 1000;
    });
    
    if (activePatches.length < targetCount) {
      // Spawn one cloud per ~300ms if needed, to avoid sudden pops
      this._spawnTimer = (this._spawnTimer || 0) + dtMs;
      if (this._spawnTimer > 300 || activePatches.length === 0) {
        this.spawnOne(activePatches.length === 0);
        this._spawnTimer = 0;
      }
    } else if (activePatches.length > targetCount) {
      // Mark one for death
      const toKill = activePatches[0];
      if (toKill) toKill.dying = true;
    }

    const toRemove = [];
    for (let i = 0; i < this.patches.length; i++) {
      const p = this.patches[i];
      // drift
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;

      // Alpha handling
      p.phase += dt * 0.35;
      const osc = (Math.sin(p.phase) + 1) * 0.5; // 0..1
      
      // Cleanup if too far from viewport (e.g. teleport)
      if (viewport && !p.dying && (p.g.x < vX - 2500 || p.g.x > vX + vW + 2500)) {
        p.dying = true;
      }

      if (p.dying) {
        p.currentAlpha -= dt * 0.1; // Fade out slowly
        if (p.currentAlpha <= 0) {
          toRemove.push(i);
          continue;
        }
      } else if (p.currentAlpha < p.targetAlpha) {
        p.currentAlpha += dt * 0.05; // Fade in slowly
        if (p.currentAlpha > p.targetAlpha) p.currentAlpha = p.targetAlpha;
      }

      p.g.alpha = Math.max(0, Math.min(0.55, p.currentAlpha * (0.75 + 0.5 * osc)));

      // wrap horizontally
      const margin = 800; // Increased margin to ensure they don't pop out visibly
      if (viewport) {
          const leftBound = vX - margin;
          const rightBound = vX + vW + margin;
          if (p.g.x < leftBound) p.g.x = rightBound;
          if (p.g.x > rightBound) p.g.x = leftBound;
      } else {
          if (p.g.x < -margin) p.g.x = W + margin;
          if (p.g.x > W + margin) p.g.x = -margin;
      }
      // constrain within top band vertically (wrap within band only)
      if (p.g.y < bandTop) p.g.y = bandBottom;
      if (p.g.y > bandBottom) p.g.y = bandTop;
    }

    // Remove dead patches
    for (let j = toRemove.length - 1; j >= 0; j--) {
      const idx = toRemove[j];
      const p = this.patches[idx];
      try { p.g.parent && p.g.parent.removeChild(p.g); } catch {}
      try { p.g.destroy(); } catch {}
      this.patches.splice(idx, 1);
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

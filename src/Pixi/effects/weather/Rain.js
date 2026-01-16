import { Graphics } from 'pixi.js';

// Simple rain system with variable speeds and single-bounce behavior on solid tiles.
export default class WeatherRain {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.particles = [];
    this.intensity = 0;
    const area = this.width * this.height;
    // Reasonable particle cap depending on viewport area to keep FPS stable
    this.maxParticles = 400; // Base for 1280x720
  }

  resize(width, height) {
    const area = width * height;
    this.maxParticles = Math.max(160, Math.floor(area / 2300));
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(100, Number(v) || 0));
  }

  spawnOne() {
    const g = new Graphics();
    g.clear();
    // Draw a thin slanted line to mimic a raindrop motion blur
    g.rect(0, 0, 1.3, 9);
    g.fill({ color: 0x4aa3ff, alpha: 0.92 });

    // Get viewport info if available
    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    
    let x, y;
    if (viewport) {
      // Spawn within viewport plus a small margin for slanted fall
      x = viewport.x - 100 + Math.random() * (viewport.width + 200);
      y = viewport.y - 10 - Math.random() * 30;
    } else {
      x = Math.random() * this.width;
      y = -10 - Math.random() * 30;
    }

    const speed = 520 + Math.random() * 520; // px/s, different speeds for depth
    const vx = (Math.random() * 60 - 30); // slight wind
    const vy = speed;
    g.x = x;
    g.y = y;
    g.rotation = 0.15; // slight tilt
    this.container.addChild(g);
    this.particles.push({ g, x, y, vx, vy, bounces: 0, alive: true });
  }

  update(dtMs) {
    // Get viewport info if available
    const viewport = this.api.getViewport ? this.api.getViewport() : null;

    // Smooth intensity transition
    const targetIntensity = Math.max(0, Math.min(100, this.getIntensity()));
    if (Math.abs(targetIntensity - this.intensity) > 0.1) {
      // Exponential smoothing (approx 2s to reach 95% of target)
      const lerpFactor = 1 - Math.exp(-0.0015 * dtMs);
      this.intensity += (targetIntensity - this.intensity) * lerpFactor;
    } else if (this.intensity !== targetIntensity) {
      this.intensity = targetIntensity;
    }

    // Constant-density controller: keep active particles near target count
    const norm = Math.max(0, Math.min(1, this.intensity / 100));
    const scaled = Math.pow(norm, 1.15);
    let target = Math.floor(this.maxParticles * scaled);
    if (scaled > 0 && target < 8) target = 8; // small baseline so low intensity still visible

    const deficit = target - this.particles.length;
    if (deficit > 0) {
      // Smooth ramp, spawn only a fraction per frame to avoid bursts
      const maxPerFrame = 48;
      const smooth = Math.max(1, Math.ceil(target * 0.02));
      const toSpawn = Math.min(deficit, smooth, maxPerFrame);
      for (let i = 0; i < toSpawn; i++) this.spawnOne();
    }
    // Gentle over-target culling to keep density steady
    if (this.particles.length > target) {
      const surplus = this.particles.length - target;
      const toCull = Math.min(surplus, Math.max(1, Math.ceil(this.particles.length * 0.02)));
      for (let i = 0; i < toCull; i++) {
        const p = this.particles.pop();
        if (!p) break;
        try { p.g.parent && p.g.parent.removeChild(p.g); } catch {}
        try { p.g.destroy(); } catch {}
      }
    }

    const gAcc = 1800; // gravity px/s^2
    const dt = dtMs / 1000;
    const toRemove = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) { toRemove.push(i); continue; }

      p.vy += gAcc * dt;
      let nx = p.x + p.vx * dt;
      let ny = p.y + p.vy * dt;

      // Liquid surface interaction: water/lava
      try {
        if (typeof this.api.getLiquidSurfaceY === 'function') {
          // Prefer closest surface above current ny
          const syWater = this.api.getLiquidSurfaceY('water', nx);
          if (Number.isFinite(syWater) && ny >= syWater) {
            // Hit water surface → spawn small splash and despawn
            const speed = Math.max(0, Math.min(1500, p.vy));
            const strength = Math.min(2, 0.4 + speed / 900);
            if (typeof this.api.onWaterImpact === 'function') this.api.onWaterImpact({ x: nx, strength });
            p.alive = false; toRemove.push(i);
            continue;
          }
          const syLava = this.api.getLiquidSurfaceY('lava', nx);
          if (Number.isFinite(syLava) && ny >= syLava) {
            // Hit lava → steam puff and despawn
            const speed = Math.max(0, Math.min(1500, p.vy));
            const strength = Math.min(2, 0.35 + speed / 1200);
            if (typeof this.api.onLavaImpact === 'function') this.api.onLavaImpact({ x: nx, y: syLava, strength });
            p.alive = false; toRemove.push(i);
            continue;
          }
        }
      } catch {}

      // Collision check (treat as point)
      if (this.api.isSolidAt(nx, ny)) {
        // Backtrack slightly to stand above surface
        let guard = 0;
        while (this.api.isSolidAt(nx, ny) && guard < 6) { ny -= 1; guard++; }
        // Bounce once, then fade out quickly on next impact
        if (p.bounces === 0 && Math.abs(p.vy) > 150) {
          p.vy = -p.vy * 0.3; // dampened bounce
          p.vx *= 0.8;
          p.bounces++;
        } else {
          // Small splash effect: shrink line and fade
          p.alive = false;
          toRemove.push(i);
        }
      }

      p.x = nx;
      p.y = ny;
      p.g.x = p.x;
      p.g.y = p.y;

      // Off-screen cleanup
      const vY = viewport ? viewport.y : 0;
      const vH = viewport ? viewport.height : this.height;
      if (p.y > vY + vH + 100 || p.y > this.height + 40 || p.x < -40 || p.x > this.width + 40) {
        p.alive = false;
        toRemove.push(i);
      }
    }

    // remove in reverse
    for (let j = toRemove.length - 1; j >= 0; j--) {
      const idx = toRemove[j];
      const p = this.particles[idx];
      if (p && p.g && p.g.parent) p.g.parent.removeChild(p.g);
      if (p && p.g && p.g.destroy) try { p.g.destroy(); } catch {}
      this.particles.splice(idx, 1);
    }
  }

  destroy() {
    this.particles.forEach(p => {
      try { p.g.parent && p.g.parent.removeChild(p.g); } catch {}
      try { p.g.destroy(); } catch {}
    });
    this.particles = [];
  }
}

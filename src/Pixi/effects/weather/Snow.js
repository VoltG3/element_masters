import { Graphics } from 'pixi.js';

// Snow system: slow fluttering flakes with varied speeds; stop on blocks without bouncing.
export default class WeatherSnow {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.flakes = [];
    this.intensity = 0;
    this.seeded = false;
    const area = this.width * this.height;
    // Snow lasts longer; keep a tighter cap than rain for performance
    this.maxFlakes = 300; // Base for 1280x720
  }

  resize(width, height) {
    const area = width * height;
    this.maxFlakes = Math.max(120, Math.floor(area / 3000));
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(100, Number(v) || 0));
  }

  spawnOne(options = null) {
    const g = new Graphics();
    g.clear();
    // Slightly larger/more visible flakes on average
    const r = 1.2 + Math.random() * 2.0; // radius
    g.circle(0, 0, r);
    g.fill({ color: 0xffffff, alpha: 0.97 });

    // Get viewport info if available
    const viewport = this.api.getViewport ? this.api.getViewport() : null;

    let x, y;
    if (viewport) {
      // Spawn within viewport plus margin
      x = viewport.x - 100 + Math.random() * (viewport.width + 200);
      const minY = options && Number.isFinite(options.minY) ? options.minY : (viewport.y - 10);
      const maxY = options && Number.isFinite(options.maxY) ? options.maxY : (viewport.y - 40);
      y = minY + Math.random() * Math.max(1, (maxY - minY));
    } else {
      x = Math.random() * this.width;
      const minY = options && Number.isFinite(options.minY) ? options.minY : -10;
      const maxY = options && Number.isFinite(options.maxY) ? options.maxY : -40;
      y = minY + Math.random() * Math.max(1, (maxY - minY));
    }

    const speed = 40 + Math.random() * 80; // slower than rain, but a bit more range
    const drift = (Math.random() * 50 - 25); // horizontal drift
    g.x = x;
    g.y = y;
    this.container.addChild(g);
    this.flakes.push({ g, x, y, vx: drift, vy: speed, alive: true, settled: false, life: 1.0, phase: 'fall', restMs: 0 });
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

    // Constant-density controller to avoid wavey bursts
    const norm = Math.max(0, Math.min(1, this.intensity / 100));
    const scaled = Math.pow(norm, 1.15);
    let target = Math.floor(this.maxFlakes * scaled);
    if (scaled > 0 && target < 10) target = 10;

    if (target === 0) {
      this.seeded = false;
    }

    const deficit = target - this.flakes.length;
    if (!this.seeded && target > 0) {
      const viewportH = viewport ? viewport.height : this.height;
      const viewportY = viewport ? viewport.y : 0;
      const seedCount = Math.min(target, Math.max(24, Math.floor(this.maxFlakes * 0.35)));
      for (let i = 0; i < seedCount; i++) {
        this.spawnOne({
          minY: viewportY - viewportH * 0.35,
          maxY: viewportY + viewportH * 0.9
        });
      }
      this.seeded = true;
    }
    if (deficit > 0) {
      const maxPerFrame = 24; // slower than rain
      const smooth = Math.max(1, Math.ceil(target * 0.015));
      const toSpawn = Math.min(deficit, smooth, maxPerFrame);
      for (let i = 0; i < toSpawn; i++) this.spawnOne();
    }
    // Gentle over-target culling to keep density steady when slider decreases
    if (this.flakes.length > target) {
      const surplus = this.flakes.length - target;
      const toCull = Math.min(surplus, Math.max(1, Math.ceil(this.flakes.length * 0.015)));
      for (let i = 0; i < toCull; i++) {
        const f = this.flakes.pop();
        if (!f) break;
        try { f.g.parent && f.g.parent.removeChild(f.g); } catch {}
        try { f.g.destroy(); } catch {}
      }
    }

    const gAcc = 200; // gentle gravity
    const dt = dtMs / 1000;
    const toRemove = [];

    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      if (!f.alive) { toRemove.push(i); continue; }

      if (f.phase === 'fall') {
        f.vy = Math.min(140, f.vy + gAcc * dt);
        // small oscillation for flutter
        f.vx += Math.sin((f.y + i) * 0.02) * 7 * dt;
        let nx = f.x + f.vx * dt;
        let ny = f.y + f.vy * dt;

        // Liquid interaction first
        try {
          if (typeof this.api.getLiquidSurfaceY === 'function') {
            const sYwater = this.api.getLiquidSurfaceY('water', nx);
            if (Number.isFinite(sYwater) && ny >= sYwater) {
              // Land on water surface and rest for a bit
              ny = sYwater - 0.5;
              f.x = nx; f.y = ny; f.vx = 0; f.vy = 0;
              f.phase = 'rest';
              f.restMs = 800 + Math.random() * 400; // 0.8..1.2s
              // Do not continue to solid collision checks this frame
              // Update display and proceed to next flake
              f.g.x = f.x; f.g.y = f.y;
              continue;
            }
            const sYlava = this.api.getLiquidSurfaceY('lava', nx);
            if (Number.isFinite(sYlava) && ny >= sYlava) {
              // Steam puff and despawn
              if (typeof this.api.onLavaImpact === 'function') this.api.onLavaImpact({ x: nx, y: sYlava, strength: 0.5 });
              f.alive = false; toRemove.push(i); continue;
            }
          }
        } catch {}

        // Solid collision
        if (this.api.isSolidAt(nx, ny)) {
          // backtrack up to stand above the surface
          let guard = 0;
          while (this.api.isSolidAt(nx, ny) && guard < 10) { ny -= 1; guard++; }
          f.settled = true;
          f.vx = 0;
          f.vy = 0;
          f.phase = 'rest';
          f.restMs = 800 + Math.random() * 400;
        }

        f.x = nx;
        f.y = ny;
      } else if (f.phase === 'rest') {
        // Flake rests on surface for a short time (water or ground), then starts sinking/falling slowly
        f.restMs -= dtMs;
        if (f.restMs <= 0) {
          f.phase = 'sinking';
          // resume gentle fall with reduced alpha
          f.vx = (Math.random() * 20 - 10);
          f.vy = 20 + Math.random() * 20;
        }
      } else if (f.phase === 'sinking') {
        // Continue downward slowly; fade out progressively
        f.vy = Math.min(60, f.vy + gAcc * 0.3 * dt);
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.life -= 0.22 * dt;
        if (f.life <= 0) { f.alive = false; toRemove.push(i); }
      }

      f.g.x = f.x;
      f.g.y = f.y;
      if (f.phase === 'rest' || f.phase === 'sinking' || f.settled) f.g.alpha = Math.max(0, Math.min(1, f.life));

      if (f.y > this.height + 40 || f.x < -40 || f.x > this.width + 40 || (viewport && f.y > viewport.y + viewport.height + 100)) {
        f.alive = false;
        toRemove.push(i);
      }
    }

    for (let j = toRemove.length - 1; j >= 0; j--) {
      const idx = toRemove[j];
      const f = this.flakes[idx];
      if (f && f.g && f.g.parent) f.g.parent.removeChild(f.g);
      if (f && f.g && f.g.destroy) try { f.g.destroy(); } catch {}
      this.flakes.splice(idx, 1);
    }
  }

  destroy() {
    this.flakes.forEach(f => {
      try { f.g.parent && f.g.parent.removeChild(f.g); } catch {}
      try { f.g.destroy(); } catch {}
    });
    this.flakes = [];
  }
}

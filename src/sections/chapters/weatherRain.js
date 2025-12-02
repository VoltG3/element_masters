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
    this.spawnAcc = 0;
    this.intensity = 0;
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(100, Number(v) || 0));
  }

  spawnOne() {
    const g = new Graphics();
    g.clear();
    // Draw a thin slanted line to mimic a raindrop motion blur
    g.lineStyle(0);
    g.beginFill(0x4aa3ff, 0.9);
    g.drawRect(0, 0, 1.2, 6);
    g.endFill();
    const x = Math.random() * this.width;
    const y = -10 - Math.random() * 30;
    const speed = 400 + Math.random() * 400; // px/s, different speeds for depth
    const vx = (Math.random() * 40 - 20); // slight wind
    const vy = speed;
    g.x = x;
    g.y = y;
    g.rotation = 0.15; // slight tilt
    this.container.addChild(g);
    this.particles.push({ g, x, y, vx, vy, bounces: 0, alive: true });
  }

  update(dtMs) {
    // adjust intensity dynamically
    this.setIntensity(this.getIntensity());

    const ratePerSecond = (this.intensity / 100) * (this.width / 6); // width-scaled spawn rate
    this.spawnAcc += ratePerSecond * (dtMs / 1000);
    while (this.spawnAcc >= 1) {
      this.spawnOne();
      this.spawnAcc -= 1;
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
      if (p.y > this.height + 40 || p.x < -40 || p.x > this.width + 40) {
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

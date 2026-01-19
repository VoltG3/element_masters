import { Graphics } from 'pixi.js';

// Lava rain system: similar to rain but red/orange and potentially deals damage (handled by engine)
export default class WeatherLavaRain {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.particles = [];
    this.intensity = 0;
    this.maxParticles = 300; 
  }

  resize(width, height) {
    const area = width * height;
    this.maxParticles = Math.max(120, Math.floor(area / 3000));
  }

  spawnOne() {
    const g = new Graphics();
    g.clear();
    // Lava drops are slightly thicker and more glowing
    g.rect(0, 0, 2, 10);
    // Glowing orange/red color
    const color = Math.random() > 0.3 ? 0xff4500 : 0xff8c00;
    g.fill({ color, alpha: 0.95 });

    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    
    let x, y;
    if (viewport) {
      x = viewport.x - 100 + Math.random() * (viewport.width + 200);
      y = viewport.y - 10 - Math.random() * 30;
    } else {
      x = Math.random() * this.width;
      y = -10 - Math.random() * 30;
    }

    const speed = 400 + Math.random() * 400; // slightly slower/heavier than water rain
    const vx = (Math.random() * 40 - 20); 
    const vy = speed;
    g.x = x;
    g.y = y;
    g.rotation = 0.1; 
    this.container.addChild(g);
    this.particles.push({ g, x, y, vx, vy, alive: true });
  }

  update(dtMs) {
    const targetIntensity = Math.max(0, Math.min(100, this.getIntensity()));
    if (Math.abs(targetIntensity - this.intensity) > 0.1) {
      const lerpFactor = 1 - Math.exp(-0.0015 * dtMs);
      this.intensity += (targetIntensity - this.intensity) * lerpFactor;
    } else {
      this.intensity = targetIntensity;
    }

    const norm = Math.max(0, Math.min(1, this.intensity / 100));
    let target = Math.floor(this.maxParticles * norm);
    if (norm > 0 && target < 5) target = 5;

    const deficit = target - this.particles.length;
    if (deficit > 0) {
      const toSpawn = Math.min(deficit, Math.max(1, Math.ceil(target * 0.02)), 30);
      for (let i = 0; i < toSpawn; i++) this.spawnOne();
    }
    
    if (this.particles.length > target) {
      const surplus = this.particles.length - target;
      const toCull = Math.min(surplus, Math.max(1, Math.ceil(this.particles.length * 0.02)));
      for (let i = 0; i < toCull; i++) {
        const p = this.particles.pop();
        if (p) {
          try { p.g.parent && p.g.parent.removeChild(p.g); p.g.destroy(); } catch {}
        }
      }
    }

    const dt = dtMs / 1000;
    const gAcc = 1200; 
    const toRemove = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.vy += gAcc * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.g.x = p.x;
      p.g.y = p.y;

      // Interaction with surfaces
      if (this.api.isSolidAt(p.x, p.y)) {
         // Lava drops just vanish on hit with a tiny "ember" effect (optional)
         if (typeof this.api.onLavaImpact === 'function' && Math.random() > 0.5) {
            this.api.onLavaImpact({ x: p.x, y: p.y, strength: 0.2 });
         }
         p.alive = false;
         toRemove.push(i);
         continue;
      }

      const viewport = this.api.getViewport ? this.api.getViewport() : null;
      const vY = viewport ? viewport.y : 0;
      const vH = viewport ? viewport.height : this.height;
      if (p.y > vY + vH + 50 || p.y > this.height + 40 || p.x < -40 || p.x > this.width + 40) {
        p.alive = false;
        toRemove.push(i);
      }
    }

    for (let j = toRemove.length - 1; j >= 0; j--) {
      const idx = toRemove[j];
      const p = this.particles[idx];
      if (p && p.g) {
        try { p.g.parent && p.g.parent.removeChild(p.g); p.g.destroy(); } catch {}
      }
      this.particles.splice(idx, 1);
    }
  }

  destroy() {
    this.particles.forEach(p => {
      try { p.g.parent && p.g.parent.removeChild(p.g); p.g.destroy(); } catch {}
    });
    this.particles = [];
  }
}

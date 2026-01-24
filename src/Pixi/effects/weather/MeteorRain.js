import { Graphics } from 'pixi.js';

// Meteor rain system: large falling fireballs that can deal damage via API callback
export default class WeatherMeteorRain {
  constructor(container, api, getIntensity) {
    this.container = container;
    this.api = api;
    this.getIntensity = getIntensity || (() => 0);
    this.width = api.mapWidth * api.tileSize;
    this.height = api.mapHeight * api.tileSize;
    this.particles = [];
    this.intensity = 0;
    this.maxParticles = 15; // Meteors are rare and large
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  spawnOne() {
    const size = 4 + Math.random() * 8; // Meteor radius
    const isLarge = size > 9;
    
    const g = new Graphics();
    g.clear();
    
    // Core
    g.circle(0, 0, size);
    g.fill({ color: 0x555555, alpha: 1 });
    
    // Glow/Fire
    g.circle(0, 0, size * 1.5);
    g.fill({ color: 0xff4500, alpha: 0.4 });
    
    // Tail
    g.moveTo(-size, 0);
    g.lineTo(0, -size * 4);
    g.lineTo(size, 0);
    g.fill({ color: 0xff8c00, alpha: 0.6 });

    const viewport = this.api.getViewport ? this.api.getViewport() : null;
    
    let x, y;
    if (viewport) {
      x = viewport.x - 200 + Math.random() * (viewport.width + 400);
      y = viewport.y - 100 - Math.random() * 200;
    } else {
      x = Math.random() * this.width;
      y = -100 - Math.random() * 200;
    }

    const vx = 100 + Math.random() * 100; // slanted fall
    const vy = 400 + Math.random() * 300;
    
    g.x = x;
    g.y = y;
    // Rotate towards fall direction
    g.rotation = Math.atan2(vy, vx) - Math.PI/2;
    
    this.container.addChild(g);
    this.particles.push({ g, x, y, vx, vy, size, isLarge, alive: true });
  }

  update(dtMs) {
    const targetIntensity = Math.max(0, Math.min(100, this.getIntensity()));
    if (Math.abs(targetIntensity - this.intensity) > 0.1) {
      const lerpFactor = 1 - Math.exp(-0.0005 * dtMs);
      this.intensity += (targetIntensity - this.intensity) * lerpFactor;
    } else {
      this.intensity = targetIntensity;
    }

    const norm = this.intensity / 100;
    const target = Math.floor(this.maxParticles * norm);

    if (this.particles.length < target && Math.random() < 0.02 * norm) {
      this.spawnOne();
    }

    const dt = dtMs / 1000;
    const toRemove = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.g.x = p.x;
      p.g.y = p.y;

      const liquidType = typeof this.api.getLiquidTypeAt === 'function'
        ? this.api.getLiquidTypeAt(p.x, p.y)
        : null;

      if (liquidType) {
        if (liquidType === 'water' && typeof this.api.onWaterImpact === 'function') {
          this.api.onWaterImpact({ x: p.x, strength: p.isLarge ? 1.4 : 0.8 });
        }
        if (liquidType === 'lava' && typeof this.api.onLavaImpact === 'function') {
          this.api.onLavaImpact({ x: p.x, y: p.y, strength: p.isLarge ? 1.6 : 0.9 });
        }

        if (typeof this.api.onMeteorHit === 'function') {
          this.api.onMeteorHit({ x: p.x, y: p.y, size: p.size, isLarge: p.isLarge, surfaceType: liquidType });
        }

        p.alive = false;
        toRemove.push(i);
        continue;
      }

      // Check collision with solid world
      if (this.api.isSolidAt(p.x, p.y)) {
        // Explosion effect
        if (typeof this.api.onLavaImpact === 'function') {
           this.api.onLavaImpact({ x: p.x, y: p.y, strength: p.isLarge ? 1.5 : 0.8 });
        }
        
        // Notify engine about meteor hit for damage
        if (typeof this.api.onMeteorHit === 'function') {
           this.api.onMeteorHit({ x: p.x, y: p.y, size: p.size, isLarge: p.isLarge, surfaceType: 'ground' });
        }

        p.alive = false;
        toRemove.push(i);
        continue;
      }

      const viewport = this.api.getViewport ? this.api.getViewport() : null;
      if (viewport && (p.y > viewport.y + viewport.height + 100 || p.x > viewport.x + viewport.width + 100)) {
        p.alive = false;
        toRemove.push(i);
      } else if (!viewport && (p.y > this.height + 100 || p.x > this.width + 100)) {
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

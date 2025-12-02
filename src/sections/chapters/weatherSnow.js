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
    this.spawnAcc = 0;
    this.intensity = 0;
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(100, Number(v) || 0));
  }

  spawnOne() {
    const g = new Graphics();
    g.clear();
    const r = 1 + Math.random() * 1.5; // radius
    g.beginFill(0xffffff, 0.95);
    g.drawCircle(0, 0, r);
    g.endFill();
    const x = Math.random() * this.width;
    const y = -10 - Math.random() * 30;
    const speed = 30 + Math.random() * 60; // slower than rain
    const drift = (Math.random() * 40 - 20); // horizontal drift
    g.x = x;
    g.y = y;
    this.container.addChild(g);
    this.flakes.push({ g, x, y, vx: drift, vy: speed, alive: true, settled: false, life: 1.0 });
  }

  update(dtMs) {
    // adjust intensity dynamically
    this.setIntensity(this.getIntensity());

    const ratePerSecond = (this.intensity / 100) * (this.width / 24); // fewer than rain
    this.spawnAcc += ratePerSecond * (dtMs / 1000);
    while (this.spawnAcc >= 1) {
      this.spawnOne();
      this.spawnAcc -= 1;
    }

    const gAcc = 200; // gentle gravity
    const dt = dtMs / 1000;
    const toRemove = [];

    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      if (!f.alive) { toRemove.push(i); continue; }

      if (!f.settled) {
        f.vy = Math.min(140, f.vy + gAcc * dt);
        // small oscillation for flutter
        f.vx += Math.sin((f.y + i) * 0.02) * 5 * dt;
        let nx = f.x + f.vx * dt;
        let ny = f.y + f.vy * dt;

        if (this.api.isSolidAt(nx, ny)) {
          // backtrack up to stand above the surface
          let guard = 0;
          while (this.api.isSolidAt(nx, ny) && guard < 10) { ny -= 1; guard++; }
          f.settled = true;
          f.vx = 0;
          f.vy = 0;
        }

        f.x = nx;
        f.y = ny;
      } else {
        // slowly fade out settled flakes
        f.life -= 0.2 * dt;
        if (f.life <= 0) {
          f.alive = false;
          toRemove.push(i);
        }
      }

      f.g.x = f.x;
      f.g.y = f.y;
      if (f.settled) f.g.alpha = Math.max(0, Math.min(1, f.life));

      if (f.y > this.height + 40 || f.x < -40 || f.x > this.width + 40) {
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

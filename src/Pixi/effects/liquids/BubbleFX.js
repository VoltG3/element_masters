import { Container, Graphics } from 'pixi.js';

// BubbleFX: lightweight bubble particles for underwater ambience
export default class BubbleFX {
  constructor(container) {
    this.container = container;
    this.node = new Container();
    this.container.addChild(this.node);
    this.bubbles = [];
    this.maxBubbles = 120;
  }

  destroy() {
    try { this.node.parent && this.node.parent.removeChild(this.node); } catch {}
    try { this.node.destroy({ children: true }); } catch {}
    this.node = null;
    this.bubbles = [];
  }

  trigger({ x = 0, y = 0, size = 2, rise = 0.03, life = 1200, drift = 0.02, color = 0xc9ecff } = {}) {
    if (this.bubbles.length >= this.maxBubbles) return;
    const g = new Graphics();
    g.x = 0;
    g.y = 0;
    this.node.addChild(g);
    this.bubbles.push({
      g,
      x,
      y,
      size,
      rise,
      drift,
      life: 0,
      max: life,
      color
    });
  }

  update(dtMs) {
    const dt = Math.max(0, Number(dtMs) || 16.67);
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life += dt;
      b.y -= b.rise * dt;
      b.x += (Math.random() - 0.5) * b.drift * dt;
      const t = Math.min(1, b.life / b.max);
      const alpha = 0.7 * (1 - t);
      const size = Math.max(0.5, b.size * (1 - t * 0.2));
      const g = b.g;
      g.clear();
      g.circle(b.x, b.y, size);
      g.stroke({ width: 1, color: b.color || 0xc9ecff, alpha: Math.max(0, alpha) });
      if (b.life >= b.max) {
        try { g.parent && g.parent.removeChild(g); } catch {}
        try { g.destroy(); } catch {}
        this.bubbles.splice(i, 1);
      }
    }
  }
}

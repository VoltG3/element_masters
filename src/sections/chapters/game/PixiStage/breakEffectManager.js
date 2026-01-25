import { Container, Graphics } from 'pixi.js';

export const createBreakEffectLayer = () => {
  const layer = new Container();
  layer.sortableChildren = true;
  return layer;
};

export const createBreakEffectManager = (layer) => {
  const particles = [];

  const add = ({ x, y, config }) => {
    if (!layer || !config) return;
    const count = Math.max(1, Number(config.count) || 12);
    const speed = Math.max(0.2, Number(config.speed) || 2);
    const lifeMs = Math.max(120, Number(config.lifeMs) || 600);
    const size = Math.max(1, Number(config.size) || 2);
    const gravity = Number.isFinite(Number(config.gravity)) ? Number(config.gravity) : 0.02;
    const shape = config.shape === 'circle' ? 'circle' : 'square';
    const angleRange = Array.isArray(config.angleRange) && config.angleRange.length >= 2 ? config.angleRange : null;
    const colors = Array.isArray(config.colors) && config.colors.length ? config.colors : [0xffffff];
    const chunks = config.chunks && typeof config.chunks === 'object' ? config.chunks : null;

    for (let i = 0; i < count; i++) {
      const angle = angleRange
        ? (Number(angleRange[0]) + Math.random() * (Number(angleRange[1]) - Number(angleRange[0])))
        : (Math.random() * Math.PI * 2);
      const sp = speed * (0.5 + Math.random() * 0.9);
      const g = new Graphics();
      if (shape === 'circle') {
        g.circle(0, 0, size * 0.6);
      } else {
        g.rect(-size / 2, -size / 2, size, size);
      }
      g.fill({ color: colors[i % colors.length], alpha: 1 });
      g.x = x;
      g.y = y;
      layer.addChild(g);
      particles.push({
        g,
        x,
        y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        life: lifeMs,
        maxLife: lifeMs,
        gravity
      });
    }

    if (chunks) {
      const chunkCount = Math.max(0, Number(chunks.count) || 0);
      const chunkSpeed = Math.max(0.3, Number(chunks.speed) || speed * 1.2);
      const chunkLife = Math.max(160, Number(chunks.lifeMs) || lifeMs * 1.1);
      const chunkSize = Math.max(size, Number(chunks.size) || size * 1.6);
      const chunkGravity = Number.isFinite(Number(chunks.gravity)) ? Number(chunks.gravity) : gravity;
      const chunkShape = chunks.shape === 'square' ? 'square' : 'circle';
      const chunkAngle = Array.isArray(chunks.angleRange) && chunks.angleRange.length >= 2 ? chunks.angleRange : angleRange;
      const chunkColors = Array.isArray(chunks.colors) && chunks.colors.length ? chunks.colors : colors;

      for (let i = 0; i < chunkCount; i++) {
        const angle = chunkAngle
          ? (Number(chunkAngle[0]) + Math.random() * (Number(chunkAngle[1]) - Number(chunkAngle[0])))
          : (Math.random() * Math.PI * 2);
        const sp = chunkSpeed * (0.6 + Math.random() * 0.9);
        const g = new Graphics();
        if (chunkShape === 'circle') {
          g.circle(0, 0, chunkSize * 0.6);
        } else {
          g.rect(-chunkSize / 2, -chunkSize / 2, chunkSize, chunkSize);
        }
        g.fill({ color: chunkColors[i % chunkColors.length], alpha: 1 });
        g.x = x;
        g.y = y;
        layer.addChild(g);
        particles.push({
          g,
          x,
          y,
          vx: Math.cos(angle) * sp,
          vy: Math.sin(angle) * sp,
          life: chunkLife,
          maxLife: chunkLife,
          gravity: chunkGravity
        });
      }
    }
  };

  const update = (dt) => {
    if (!particles.length) return;
    const delta = Math.max(0, Number(dt) || 0);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        if (p.g && p.g.parent) p.g.parent.removeChild(p.g);
        particles.splice(i, 1);
        continue;
      }
      p.x = (p.x || 0) + p.vx * (delta / 16.67);
      p.y = (p.y || 0) + p.vy * (delta / 16.67);
      p.vy += (Number(p.gravity) || 0.02) * (delta / 16.67);
      if (p.g) {
        p.g.x = p.x;
        p.g.y = p.y;
        p.g.alpha = Math.max(0, p.life / p.maxLife);
      }
    }
  };

  const clear = () => {
    for (const p of particles) {
      if (p.g && p.g.parent) p.g.parent.removeChild(p.g);
    }
    particles.length = 0;
  };

  return { add, update, clear };
};

export default {
  createBreakEffectLayer,
  createBreakEffectManager
};

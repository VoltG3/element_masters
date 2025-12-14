import { Texture } from 'pixi.js';

// Generate procedural water frames (cached per tile size)
export const createWaterFrames = (tileSize) => {
  const frames = [];
  const F = 8; // frame count
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // background gradient
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, '#2a5d8f');
    g.addColorStop(1, '#174369');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // animated ripples via sine stripes
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#8fc0ff';
    const t = i / F;
    const bands = 3;
    for (let b = 0; b < bands; b++) {
      const y = Math.floor((tileSize / bands) * b + (tileSize / bands) * 0.5 + Math.sin((t + b * 0.33) * Math.PI * 2) * (tileSize * 0.08));
      ctx.fillRect(0, y, tileSize, Math.max(1, Math.floor(tileSize * 0.06)));
    }

    // soft top highlight
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#c9ecff';
    ctx.fillRect(0, 0, tileSize, Math.max(1, Math.floor(tileSize * 0.12)));

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

// Generate procedural lava frames (cached per tile size)
export const createLavaFrames = (tileSize) => {
  const frames = [];
  const F = 8;
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // base gradient (dark red to orange)
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, '#6b1a07');
    g.addColorStop(1, '#c43f0f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // glowing veins
    const t = i / F;
    ctx.globalAlpha = 0.3;
    for (let b = 0; b < 3; b++) {
      const y = Math.floor((tileSize / 3) * b + (tileSize / 3) * 0.5 + Math.sin((t * 2 + b * 0.6) * Math.PI * 2) * (tileSize * 0.1));
      const h = Math.max(1, Math.floor(tileSize * 0.07));
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#ffed8a');
      grad.addColorStop(1, '#ff7b00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, tileSize, h);
    }

    // bubbles/dots
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd36e';
    const count = Math.max(2, Math.floor(tileSize * 0.12));
    for (let k = 0; k < count; k++) {
      const rx = Math.floor((k * 37 + i * 13) % tileSize);
      const ry = Math.floor((k * 53 + i * 29) % tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

// Helpers to check if a definition is water or lava
export const isWaterDef = (def) => !!(def && def.flags && def.flags.water);
export const isLavaDef = (def) => !!(def && def.flags && def.flags.lava);

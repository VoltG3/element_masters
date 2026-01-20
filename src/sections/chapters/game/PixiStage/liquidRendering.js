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
    g.addColorStop(0, '#3a7fb8');
    g.addColorStop(0.5, '#5ba3d9');
    g.addColorStop(1, '#3a7fb8');
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
export const isQuicksandDef = (def) => !!(def && def.flags && def.flags.quicksand);
export const isWaterfallDef = (def) => !!(def && def.flags && def.flags.waterfall);
export const isLavaWaterfallDef = (def) => !!(def && def.flags && def.flags.lava_waterfall);
export const isRadioactiveWaterDef = (def) => !!(def && def.flags && def.flags.radioactive_water);
export const isRadioactiveWaterfallDef = (def) => !!(def && def.flags && def.flags.radioactive_waterfall);

// Generate procedural quicksand frames (cached per tile size)
export const createQuicksandFrames = (tileSize) => {
  const frames = [];
  const F = 12; // slightly more frames for smoother slow movement
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // base sand color (brownish yellow)
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, '#a6915b');
    g.addColorStop(1, '#7d6d42');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // grainy texture / swirling patterns
    const t = i / F;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#5c5031';
    for (let k = 0; k < 4; k++) {
       const y = Math.floor((tileSize / 4) * k + (t * tileSize)) % tileSize;
       ctx.fillRect(0, y, tileSize, 1);
    }
    
    // random grains
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#d1ba7d';
    const count = Math.max(5, Math.floor(tileSize * 0.25));
    for (let k = 0; k < count; k++) {
      const rx = Math.floor((k * 43 + i * 7) % tileSize);
      const ry = Math.floor((k * 61 + i * 11) % tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

// Generate procedural waterfall frames
export const createWaterfallFrames = (tileSize) => {
  const frames = [];
  const F = 10;
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // base transparent blue (izmantojam ūdens krāsas)
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, 'rgba(42, 93, 143, 0.5)');
    g.addColorStop(0.5, 'rgba(91, 163, 217, 0.5)');
    g.addColorStop(1, 'rgba(42, 93, 143, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // Īsas vertikālas svītriņas
    const t = i / F;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const count = 6;
    for (let k = 0; k < count; k++) {
      const x = Math.floor((tileSize / count) * k + (tileSize / (count*2)) + Math.sin(t * Math.PI * 2 + k) * 2);
      const h = Math.floor(tileSize * 0.3);
      const y = Math.floor((t * tileSize + k * (tileSize / count)) % tileSize);
      ctx.fillRect(x, y, 2, h);
      if (y + h > tileSize) {
        ctx.fillRect(x, y - tileSize, 2, h);
      }
    }

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

// Generate procedural lava waterfall frames
export const createLavaWaterfallFrames = (tileSize) => {
  const frames = [];
  const F = 10;
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // base transparent lava colors
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, 'rgba(107, 26, 7, 0.6)');
    g.addColorStop(0.5, 'rgba(196, 63, 15, 0.6)');
    g.addColorStop(1, 'rgba(107, 26, 7, 0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // animated lava streaks
    const t = i / F;
    ctx.fillStyle = 'rgba(255, 123, 0, 0.5)';
    const count = 5;
    for (let k = 0; k < count; k++) {
      const x = Math.floor((tileSize / count) * k + (tileSize / (count*2)) + Math.sin(t * Math.PI * 2 + k) * 2);
      const h = Math.floor(tileSize * 0.4);
      const y = Math.floor((t * tileSize + k * (tileSize / count)) % tileSize);
      ctx.fillRect(x, y, 2, h);
      if (y + h > tileSize) {
        ctx.fillRect(x, y - tileSize, 2, h);
      }
    }

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

// Generate procedural radioactive water frames
export const createRadioactiveWaterFrames = (tileSize) => {
  const frames = [];
  const F = 12;
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // background gradient (toxic green)
    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, '#1a5c1a');
    g.addColorStop(1, '#0d2e0d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    const t = i / F;
    
    // Bubbles
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#32cd32';
    const bubbleCount = 4;
    for (let k = 0; k < bubbleCount; k++) {
      const bx = Math.floor((k * 137 + i * 2) % tileSize);
      const by = Math.floor((tileSize + k * 43 - (t * tileSize + k * 10)) % tileSize);
      const size = 1 + (Math.sin(t * Math.PI + k) * 0.5 + 0.5) * 2;
      ctx.beginPath();
      ctx.arc(bx, by, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glow streaks
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#adff2f';
    for (let b = 0; b < 2; b++) {
      const y = Math.floor((tileSize / 2) * b + Math.sin((t + b * 0.5) * Math.PI * 2) * (tileSize * 0.1));
      ctx.fillRect(0, y, tileSize, 1);
    }

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

// Generate procedural radioactive waterfall frames
export const createRadioactiveWaterfallFrames = (tileSize) => {
  const frames = [];
  const F = 16; // more frames for slower motion
  for (let i = 0; i < F; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 0, tileSize);
    g.addColorStop(0, 'rgba(26, 92, 26, 0.6)');
    g.addColorStop(0.5, 'rgba(50, 205, 50, 0.6)');
    g.addColorStop(1, 'rgba(26, 92, 26, 0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tileSize, tileSize);

    const t = i / F;
    ctx.fillStyle = 'rgba(173, 255, 47, 0.5)';
    const count = 4; // fewer streaks
    for (let k = 0; k < count; k++) {
      const x = Math.floor((tileSize / count) * k + (tileSize / (count*2)) + Math.sin(t * Math.PI * 2 + k) * 2);
      const h = Math.floor(tileSize * 0.2);
      const y = Math.floor((t * tileSize + k * (tileSize / count)) % tileSize);
      ctx.fillRect(x, y, 2, h);
      if (y + h > tileSize) {
        ctx.fillRect(x, y - tileSize, 2, h);
      }
    }

    const tex = Texture.from(canvas);
    frames.push(tex);
  }
  return frames;
};

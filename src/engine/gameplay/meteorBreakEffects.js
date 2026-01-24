import meteorBreakEffectsConfig from '../../assets/json/system/meteor_break_effects.json';

const normalizeColor = (c) => {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') {
    const raw = c.trim().replace('#', '');
    const n = parseInt(raw, 16);
    return Number.isFinite(n) ? n : 0xffffff;
  }
  return 0xffffff;
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const getConfig = () => {
  if (!meteorBreakEffectsConfig || meteorBreakEffectsConfig.enabled === false) return null;
  return meteorBreakEffectsConfig;
};

const lerp = (a, b, t) => a + (b - a) * t;

const scaleFromRange = (range, fallback, t) => {
  if (!Array.isArray(range) || range.length < 2) return fallback;
  const a = Number(range[0]);
  const b = Number(range[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return fallback;
  return lerp(a, b, t);
};

const readNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const getMeteorBreakEffectConfig = ({ size, surfaceType }) => {
  const cfg = getConfig();
  if (!cfg) return null;

  const defaults = cfg.defaults || {};
  const sizeScale = cfg.sizeScale || {};
  const minSize = readNumber(sizeScale.min, 4);
  const maxSize = readNumber(sizeScale.max, 12);
  const denom = Math.max(1, maxSize - minSize);
  const t = clamp01((readNumber(size, minSize) - minSize) / denom);

  let count = scaleFromRange(sizeScale.count, defaults.count, t);
  let speed = scaleFromRange(sizeScale.speed, defaults.speed, t);
  let lifeMs = scaleFromRange(sizeScale.lifeMs, defaults.lifeMs, t);
  let particleSize = scaleFromRange(sizeScale.size, defaults.size, t);
  let gravity = readNumber(defaults.gravity, 0.02);
  let shape = defaults.shape || 'square';
  let angleRange = Array.isArray(defaults.angleRange) ? defaults.angleRange : null;

  const surfaces = cfg.surfaces || {};
  const surface = surfaceType && surfaces[surfaceType] ? surfaces[surfaceType] : surfaces.ground;
  if (surface) {
    count = readNumber(surface.count, count);
    speed = readNumber(surface.speed, speed);
    lifeMs = readNumber(surface.lifeMs, lifeMs);
    particleSize = readNumber(surface.size, particleSize);
    gravity = readNumber(surface.gravity, gravity);
    shape = surface.shape || shape;
    angleRange = Array.isArray(surface.angleRange) ? surface.angleRange : angleRange;
  }

  const colorsRaw = (surface && Array.isArray(surface.colors)) ? surface.colors : defaults.colors;
  const colors = Array.isArray(colorsRaw) && colorsRaw.length ? colorsRaw.map(normalizeColor) : [0xffffff];

  return {
    count: readNumber(count, 12),
    speed: readNumber(speed, 2.4),
    lifeMs: readNumber(lifeMs, 700),
    size: readNumber(particleSize, 3),
    colors,
    gravity,
    shape,
    angleRange
  };
};

export default {
  getMeteorBreakEffectConfig
};

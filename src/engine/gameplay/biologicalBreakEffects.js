import biologicalBreakEffectsConfig from '../../assets/json/system/biological_break_effects.json';

const normalizeColor = (c) => {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') {
    const raw = c.trim().replace('#', '');
    const n = parseInt(raw, 16);
    return Number.isFinite(n) ? n : 0xffffff;
  }
  return 0xffffff;
};

const getConfig = () => {
  if (!biologicalBreakEffectsConfig || biologicalBreakEffectsConfig.enabled === false) return null;
  return biologicalBreakEffectsConfig;
};

export const getBiologicalBreakEffectConfig = () => {
  const cfg = getConfig();
  if (!cfg) return null;
  const base = cfg.default || {};
  const chunks = cfg.chunks && typeof cfg.chunks === 'object' ? cfg.chunks : null;
  const colors = Array.isArray(base.colors) && base.colors.length ? base.colors.map(normalizeColor) : [0xffffff];
  return {
    count: Number(base.count) || 18,
    speed: Number(base.speed) || 2.4,
    lifeMs: Number(base.lifeMs) || 700,
    size: Number(base.size) || 2,
    gravity: Number.isFinite(Number(base.gravity)) ? Number(base.gravity) : 0.02,
    shape: base.shape || 'circle',
    angleRange: Array.isArray(base.angleRange) ? base.angleRange : null,
    colors,
    chunks: chunks || null
  };
};

export default {
  getBiologicalBreakEffectConfig
};

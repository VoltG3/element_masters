import breakEffectsConfig from '../../assets/json/system/object_break_effects.json';

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
  if (!breakEffectsConfig || breakEffectsConfig.enabled === false) return null;
  return breakEffectsConfig;
};

export const getBreakEffectParams = (def) => {
  if (!def) return null;
  const cfg = getConfig();
  if (!cfg) return null;
  const id = def.id;
  const type = def.type;
  const subtype = def.subtype;
  const name = def.name;
  const ids = Array.isArray(cfg.objectIds) ? cfg.objectIds : [];
  const types = Array.isArray(cfg.objectTypes) ? cfg.objectTypes : [];
  const matchesValue = (value, list) => {
    if (!value) return false;
    return list.some(item => item === value || value.includes(item));
  };
  const matched = matchesValue(id, ids) || matchesValue(name, ids) || matchesValue(type, types) || matchesValue(subtype, types);
  if (!matched) return null;
  const base = cfg.default || {};
  const colors = Array.isArray(base.colors) ? base.colors.map(normalizeColor) : [0xffffff];
  return {
    count: Number(base.count) || 12,
    speed: Number(base.speed) || 2,
    lifeMs: Number(base.lifeMs) || 600,
    size: Number(base.size) || 2,
    colors
  };
};

export const shouldTriggerBreakEffect = (def, newHealth) => {
  if (!def) return false;
  const params = getBreakEffectParams(def);
  if (!params) return false;
  const threshold = Number(def.passableHealthThreshold ?? 0);
  const hp = Number(newHealth);
  if (!Number.isFinite(hp)) return false;
  return hp <= threshold;
};

export default {
  getBreakEffectParams,
  shouldTriggerBreakEffect
};

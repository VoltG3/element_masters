import weatherDamageConfig from '../../assets/json/system/weather_damage.json';

const clampIntensity = (v) => {
  const n = Number(v) || 0;
  return Math.max(0, Math.min(100, n));
};

const getWeatherConfig = (type) => {
  return weatherDamageConfig?.weather?.[type] || null;
};

export const getMapWeather = (mapData) => {
  if (!mapData) return {};
  let base = {};
  if (mapData.weather) base = mapData.weather;
  else {
    const metaWeather = mapData.meta?.weather;
    if (metaWeather && Object.keys(metaWeather).length > 0) {
      base = metaWeather;
    } else {
      const activeId = mapData.meta?.activeMapId || mapData.meta?.activeMap;
      if (activeId && mapData.maps && mapData.maps[activeId] && mapData.maps[activeId].weather) {
        base = mapData.maps[activeId].weather;
      } else {
        base = mapData.meta?.weather || {};
      }
    }
  }
  let runtime = {};
  try {
    const rt = window.__GAME_RUNTIME_SETTINGS__ || {};
    runtime = {
      rain: rt.weatherRain,
      snow: rt.weatherSnow,
      clouds: rt.weatherClouds,
      fog: rt.weatherFog,
      thunder: rt.weatherThunder,
      lavaRain: rt.weatherLavaRain,
      radioactiveFog: rt.weatherRadioactiveFog,
      meteorRain: rt.weatherMeteorRain
    };
  } catch {}
  const merged = { ...base };
  Object.keys(runtime).forEach(key => {
    if (runtime[key] !== undefined && runtime[key] !== null) {
      merged[key] = runtime[key];
    }
  });
  return merged;
};

export const getWeatherDps = (type, intensity) => {
  const cfg = getWeatherConfig(type);
  if (!cfg || cfg.enabled === false) return 0;
  const pct = clampIntensity(intensity);
  if (pct <= 0) return 0;
  const maxDps = Number(cfg.maxDps) || 0;
  const minDps = Number(cfg.minDps) || 0;
  const dps = (pct / 100) * maxDps;
  return Math.max(minDps, dps);
};

export const getRadioactivityRates = () => {
  const cfg = getWeatherConfig('radioactiveFog') || {};
  const inc = Number(cfg.radioactivityPerSecond);
  const dec = Number(cfg.radioactivityRegenPerSecond);
  return {
    increase: Number.isFinite(inc) ? inc : 0,
    decay: Number.isFinite(dec) ? dec : 0
  };
};

export const weatherAffectsPlayer = (type) => {
  const cfg = getWeatherConfig(type);
  if (!cfg || cfg.enabled === false) return false;
  return !!cfg.affects?.player;
};

export const weatherAffectsEnemy = (type, enemyId, enemyName) => {
  const cfg = getWeatherConfig(type);
  if (!cfg || cfg.enabled === false) return false;
  const enemies = cfg.affects?.enemies;
  if (enemies === 'true') return true;
  if (enemies === true || enemies === 'all') return true;
  if (enemies && typeof enemies === 'object' && enemies.mode === 'all') {
    const excluded = Array.isArray(enemies.exclude) ? enemies.exclude : [];
    const isExcluded = (value) => value && excluded.some(ex => value === ex || value.includes(ex));
    if (isExcluded(enemyId)) return false;
    if (isExcluded(enemyName)) return false;
    return true;
  }
  if (Array.isArray(enemies)) {
    if (enemyId && enemies.some(ex => enemyId === ex || enemyId.includes(ex))) return true;
    if (enemyName && enemies.some(ex => enemyName === ex || enemyName.includes(ex))) return true;
    return false;
  }
  return false;
};

export const weatherBlockedByCover = (type) => {
  const cfg = getWeatherConfig(type);
  if (!cfg) return false;
  return !!cfg.blockedByCover;
};

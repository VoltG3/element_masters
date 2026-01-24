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
    const activeId = mapData.meta?.activeMapId || mapData.meta?.activeMap;
    if (activeId && mapData.maps && mapData.maps[activeId] && mapData.maps[activeId].weather) {
      base = mapData.maps[activeId].weather;
    } else {
      base = mapData.meta?.weather || {};
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

export const weatherAffectsPlayer = (type) => {
  const cfg = getWeatherConfig(type);
  if (!cfg || cfg.enabled === false) return false;
  return !!cfg.affects?.player;
};

export const weatherAffectsEnemy = (type, enemyId) => {
  const cfg = getWeatherConfig(type);
  if (!cfg || cfg.enabled === false) return false;
  const enemies = cfg.affects?.enemies;
  if (enemies === true || enemies === 'all') return true;
  if (Array.isArray(enemies)) return !!enemyId && enemies.includes(enemyId);
  return false;
};

export const weatherBlockedByCover = (type) => {
  const cfg = getWeatherConfig(type);
  if (!cfg) return false;
  return !!cfg.blockedByCover;
};

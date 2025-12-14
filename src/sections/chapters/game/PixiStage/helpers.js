import { Texture } from 'pixi.js';

// Small helper cache for textures
const textureCacheMap = new Map();

export const getTexture = (url) => {
  if (!url) {
    console.warn('[getTexture] No URL provided');
    return null;
  }
  if (textureCacheMap.has(url)) {
    return textureCacheMap.get(url);
  }
  try {
    const tex = Texture.from(url);
    if (!tex) {
      console.warn('[getTexture] Failed to create texture from URL:', url);
      return null;
    }
    textureCacheMap.set(url, tex);
    return tex;
  } catch (e) {
    console.error('[getTexture] Error creating texture:', url, e);
    return null;
  }
};

export const clearTextureCache = () => {
  textureCacheMap.forEach((t) => t.destroy && t.destroy(true));
  textureCacheMap.clear();
};

// Background images resolver (from src/assets/background)
// Meta stores `/assets/background/<name>`
export const createBackgroundResolver = () => {
  let bgContext;
  try {
    // webpack require.context (CRA)
    // relative to this file: '../../../../assets/background'
    bgContext = require.context('../../../../assets/background', false, /\.(png|jpe?g|svg)$/);
  } catch (e) {
    bgContext = null;
  }

  return (metaPath) => {
    if (!bgContext) return null;
    if (!metaPath) {
      const keys = bgContext.keys();
      if (keys && keys.length) {
        const mod = bgContext(keys[0]);
        return mod.default || mod;
      }
      return null;
    }
    const name = metaPath.split('/').pop();
    const rel = `./${name}`;
    try {
      const mod = bgContext(rel);
      return mod.default || mod;
    } catch (e) {
      // fallback to first available
      const keys = bgContext.keys();
      if (keys && keys.length) {
        const mod = bgContext(keys[0]);
        return mod.default || mod;
      }
      return null;
    }
  };
};

// Convert ms-per-frame (JSON) to Pixi AnimatedSprite speed factor (1 = 60fps)
export const msToSpeed = (ms) => {
  const m = Number(ms);
  const msPerFrame = Number.isFinite(m) && m > 0 ? m : 500;
  const fps = 1000 / msPerFrame;
  return fps / 60; // Pixi speed factor
};

// Helper to get registry item by id
export const getRegItem = (registryItems, id) => registryItems.find((r) => r.id === id);

// Solid collision helper for world tiles (used by weather systems)
export const createSolidChecker = (mapWidth, mapHeight, tileSize, tileMapData, registryItems) => {
  return (wx, wy) => {
    // Allow particles (snow/rain) to spawn above the top edge and fall into the world.
    // Negative Y should NOT be treated as solid, otherwise flakes will "settle" off-screen.
    if (wy < 0) return false;
    // Keep left-of-world as solid to avoid pushing from outside horizontally.
    if (wx < 0) return true;
    const gx = Math.floor(wx / tileSize);
    const gy = Math.floor(wy / tileSize);
    if (gx < 0 || gy < 0 || gx >= mapWidth || gy >= mapHeight) return false; // below world is not solid
    const idx = gy * mapWidth + gx;
    const id = tileMapData[idx];
    if (!id) return false;
    const def = getRegItem(registryItems, id);
    if (!def) return false;
    const c = def.collision;
    if (!c) return false;
    if (c === true) return true;
    if (typeof c === 'object') {
      return !!(c.top || c.bottom || c.left || c.right);
    }
    return false;
  };
};

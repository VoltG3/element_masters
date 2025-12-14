import { Sprite, AnimatedSprite, Texture } from 'pixi.js';
import { getTexture, msToSpeed, getRegItem } from './helpers';

// Sync and update projectiles: create missing sprites, remove stale ones, update positions
export const syncProjectiles = (projectilesLayer, projectileSpritesMap, projectilesList, registryItems, tileSize) => {
  if (!projectilesLayer) return;

  const map = projectileSpritesMap;
  const list = projectilesList || [];
  const seen = new Set();

  // Create or update sprites for current projectiles
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const key = p.id;
    seen.add(key);

    let spr = map.get(key);
    if (!spr) {
      // Create new sprite
      const def = getRegItem(registryItems, p.defId);
      if (def && Array.isArray(def.textures) && def.textures.length > 1) {
        const frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
        if (frames.length > 0) {
          spr = new AnimatedSprite(frames);
          spr.animationSpeed = msToSpeed(def.animationSpeed);
          spr.play();
        }
      }
      if (!spr) {
        const tex = getTexture(getRegItem(registryItems, p.defId)?.texture) || Texture.WHITE;
        spr = new Sprite(tex);
      }
      spr.anchor.set(0.5, 0.5);
      spr.width = Math.max(2, p.w || tileSize * 0.25);
      spr.height = Math.max(2, p.h || tileSize * 0.25);
      projectilesLayer.addChild(spr);
      map.set(key, spr);
    }

    // Update position and direction
    spr.x = p.x + (p.dir >= 0 ? 0 : 0);
    spr.y = p.y;
    const mag = Math.abs(spr.scale.x || 1);
    spr.scale.x = p.dir >= 0 ? mag : -mag;
  }

  // Remove sprites that no longer exist
  for (const [key, spr] of map.entries()) {
    if (!seen.has(key)) {
      try {
        spr.parent && spr.parent.removeChild(spr);
      } catch (e) {
        // ignore
      }
      try {
        spr.destroy && spr.destroy();
      } catch (e) {
        // ignore
      }
      map.delete(key);
    }
  }
};

// Cleanup all projectile sprites
export const cleanupProjectiles = (projectileSpritesMap) => {
  try {
    for (const spr of projectileSpritesMap.values()) {
      try {
        spr.parent && spr.parent.removeChild(spr);
      } catch (e) {
        // ignore
      }
      try {
        spr.destroy && spr.destroy();
      } catch (e) {
        // ignore
      }
    }
    projectileSpritesMap.clear();
  } catch (e) {
    // ignore
  }
};

import { Sprite, AnimatedSprite, Texture, Rectangle, Container, Graphics } from 'pixi.js';
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
      // Sea Rescue boxes use a container for 50/50 water effect
      if (p.isSeaRescueBox) {
        spr = new Container();
        spr.isSeaRescueBox = true;
      }

      const def = getRegItem(registryItems, p.defId);
      if (def) {
        if (Array.isArray(def.textures) && def.textures.length > 1) {
          const frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
          if (frames.length > 0) {
            const anim = new AnimatedSprite(frames);
            anim.animationSpeed = msToSpeed(def.animationSpeed);
            anim.play();
            if (spr instanceof Container) {
              spr.addChild(anim);
              spr.mainVisual = anim;
            } else {
              spr = anim;
            }
          }
        } else if (def.spriteSheet && def.spriteSheet.enabled) {
          const totalSprites = def.spriteSheet.totalSprites || 1;
          const columns = def.spriteSheet.columns || totalSprites;
          const frameIndex = p.frameIndex !== undefined ? p.frameIndex : (def.spriteSheet.frameIndex || 0);
          
          const baseTexture = getTexture(def.texture);
          const source = baseTexture?.source;
          if (source && source.width > 1) {
            const frameWidth = source.width / columns;
            const frameHeight = source.height / Math.ceil(totalSprites / columns);
            const col = frameIndex % columns;
            const row = Math.floor(frameIndex / columns);
            const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
            const tex = new Texture({ source: source, frame: rect });
            const s = new Sprite(tex);
            if (spr instanceof Container) {
              spr.addChild(s);
              spr.mainVisual = s;
            } else {
              spr = s;
            }
          }
        }
      }
      
      if (!spr || (spr instanceof Container && spr.children.length === 0)) {
        const tex = getTexture(getRegItem(registryItems, p.defId)?.texture) || Texture.WHITE;
        const s = new Sprite(tex);
        if (spr instanceof Container) {
          spr.addChild(s);
          spr.mainVisual = s;
        } else {
          spr = s;
        }
      }
      
      if (spr.anchor) {
        spr.anchor.set(0.5, 0.5);
      } else if (spr.mainVisual && spr.mainVisual.anchor) {
        spr.mainVisual.anchor.set(0.5, 0.5);
      }
      
      spr.width = Math.max(2, p.w || tileSize * 0.25);
      spr.height = Math.max(2, p.h || tileSize * 0.25);
      projectilesLayer.addChild(spr);
      map.set(key, spr);
    }

    // Update position and direction
    spr.x = p.x;
    spr.y = p.y;
    spr.rotation = p.rotation || 0;
    
    // Sea Rescue 50/50 Floating effect
    if (spr.isSeaRescueBox && spr.mainVisual) {
      if (p.floating) {
        if (!spr.splitContainer) {
          spr.mainVisual.visible = false;
          spr.splitContainer = new Container();
          spr.addChild(spr.splitContainer);
          
          // Full box sprite for above water
          const topPart = new Sprite(spr.mainVisual.texture);
          topPart.anchor.set(0.5, 0.5);
          
          // Full box sprite for below water (with tint)
          const bottomPart = new Sprite(spr.mainVisual.texture);
          bottomPart.anchor.set(0.5, 0.5);
          bottomPart.tint = 0x4488ff;
          bottomPart.alpha = 0.8;

          // Masks to cut them horizontally
          const topMask = new Graphics();
          const bottomMask = new Graphics();
          
          spr.splitContainer.addChild(bottomPart);
          spr.splitContainer.addChild(topPart);
          spr.splitContainer.addChild(topMask);
          spr.splitContainer.addChild(bottomMask);
          
          topPart.mask = topMask;
          bottomPart.mask = bottomMask;
          
          spr.topMask = topMask;
          spr.bottomMask = bottomMask;
          spr.topPart = topPart;
          spr.bottomPart = bottomPart;
        }
        
        spr.splitContainer.visible = true;
        
        // Update masks to stay horizontal regardless of container rotation
        // We want the water line to be at the container's center (spr.y)
        // Since masks are children of spr, they move/rotate with spr.
        // To keep them horizontal, we must counter-rotate them and adjust their shape.
        
        const rotation = spr.rotation || 0;
        const pWidth = Number(p.w) || tileSize;
        const pHeight = Number(p.h) || tileSize;
        const maskW = pWidth * 2; // Extra wide to cover during rotation
        const maskH = pHeight;
        
        if (!isNaN(pWidth) && !isNaN(pHeight)) {
          spr.topMask.clear();
          spr.topMask.rect(-maskW/2, -maskH, maskW, maskH);
          spr.topMask.fill({ color: 0xffffff, alpha: 1 });
          spr.topMask.pivot.set(0, 0); 
          spr.topMask.rotation = -rotation;
          
          spr.bottomMask.clear();
          spr.bottomMask.rect(-maskW/2, 0, maskW, maskH);
          spr.bottomMask.fill({ color: 0xffffff, alpha: 1 });
          spr.bottomMask.pivot.set(0, 0);
          spr.bottomMask.rotation = -rotation;
        }

        // Keep parts synced with main visual in case of animation
        if (spr.mainVisual instanceof AnimatedSprite) {
          spr.topPart.texture = spr.mainVisual.texture;
          spr.bottomPart.texture = spr.mainVisual.texture;
        }
      } else {
        if (spr.splitContainer) spr.splitContainer.visible = false;
        spr.mainVisual.visible = true;
      }
    }
    
    const mag = Math.abs(spr.scale.x || 1);
    spr.scale.x = (p.dir === undefined || p.dir >= 0) ? mag : -mag;
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

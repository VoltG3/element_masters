import { Sprite, AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { getTexture, msToSpeed, getRegItem } from './helpers';
import { buildSpriteFromDef } from './playerManager';
import { isWaterDef, isLavaDef } from './liquidRendering';

// Build layers: tiles, objects, and secret overlays
export const rebuildLayers = (refs, options) => {
  const {
    mapWidth,
    mapHeight,
    tileSize,
    tileMapData,
    objectMapData,
    secretMapData,
    revealedSecrets,
    registryItems,
    objectMetadata
  } = options;

  const { bgRef, objBehindRef, objFrontRef, secretLayerRef } = refs;

  if (!bgRef || !objBehindRef || !objFrontRef) return;

  // Clear previous
  bgRef.removeChildren();
  objBehindRef.removeChildren();
  objFrontRef.removeChildren();
  secretLayerRef?.below?.removeChildren();
  secretLayerRef?.above?.removeChildren();

  // Helper: resolve registry item by id
  const getDef = (id) => getRegItem(registryItems, id);

  // Background tiles (skip liquids; they are handled by LiquidRegionSystem)
  let secretLayerCount = 0;
  let normalLayerCount = 0;

  for (let i = 0; i < mapWidth * mapHeight; i++) {
    const id = tileMapData[i];
    if (!id) continue;
    const def = getDef(id);
    if (!def) continue;

    // Check if this tile is in a secret zone
    const secretId = secretMapData?.[i];
    const secretDef = secretId ? getDef(secretId) : null;
    const secretSubtype = secretDef?.subtype;
    const isInOpenArea = secretSubtype === 'open' || secretSubtype === 'below';
    const isInSecretArea = secretSubtype === 'secret' || secretSubtype === 'above';
    const isSecretRevealed = revealedSecrets && revealedSecrets.includes(i);

    // Determine if this tile should be rendered with filter on secret layer
    let renderOnSecretLayer = false;
    if (isInOpenArea) {
      // open.area: always render on secret layer with filter
      renderOnSecretLayer = true;
      secretLayerCount++;
    } else if (isInSecretArea && isSecretRevealed) {
      // secret.area: only render on secret layer with filter AFTER revealed
      renderOnSecretLayer = true;
      secretLayerCount++;
    } else {
      normalLayerCount++;
    }

    let sprite;
    let frames = null;
    if (isWaterDef(def) || isLavaDef(def)) {
      // liquids are handled by LiquidRegionSystem; skip per-tile sprite
      continue;
    } else {
      if (Array.isArray(def.textures) && def.textures.length > 1) {
        frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
      }
      if (frames && frames.length > 0) {
        sprite = new AnimatedSprite(frames);
        sprite.animationSpeed = msToSpeed(def.animationSpeed);
        sprite.play();
      } else {
        const tex = getTexture(def.texture) || null;
        if (!tex) continue;
        sprite = new Sprite(tex);
      }
    }

    const x = (i % mapWidth) * tileSize;
    const y = Math.floor(i / mapWidth) * tileSize;
    sprite.x = x;
    sprite.y = y;
    sprite.width = tileSize;
    sprite.height = tileSize;

    // Apply filter if rendering on secret layer
    if (renderOnSecretLayer) {
      sprite.alpha = 0.4; // darken the tile
      // Add to secret layer (below player always for tiles)
      if (secretLayerRef?.below) {
        secretLayerRef.below.addChild(sprite);
      } else {
        bgRef.addChild(sprite);
      }
    } else {
      // Normal rendering on tiles layer
      bgRef.addChild(sprite);
    }
  }

  console.log('[RENDER] Tiles rendering complete:', {
    secretLayerTiles: secretLayerCount,
    normalLayerTiles: normalLayerCount,
    revealedSecretsCount: revealedSecrets?.length || 0
  });

  // Objects (non-player)
  for (let i = 0; i < mapWidth * mapHeight; i++) {
    const id = objectMapData[i];
    if (!id || id.includes('player')) continue;
    const def = getDef(id);
    if (!def || def.type === 'entity') continue;

    let sprite;
    if (def.spriteSheet && def.spriteSheet.enabled) {
      const meta = (objectMetadata && objectMetadata[i]) || {};
      const maxH = def.maxHealth || 100;
      const health = meta.health !== undefined ? meta.health : maxH;
      const totalSprites = def.spriteSheet.totalSprites || 1;
      const columns = def.spriteSheet.columns || totalSprites;
      
      const healthPercent = Math.max(0, Math.min(100, (health / maxH) * 100));
      let frameIndex = Math.floor((1 - healthPercent / 100) * (totalSprites - 1));
      frameIndex = Math.max(0, Math.min(totalSprites - 1, frameIndex));

      const baseTexture = getTexture(def.texture);
      if (baseTexture && (baseTexture.width > 1 || (baseTexture.source && baseTexture.source.width > 1))) {
        const texWidth = baseTexture.source ? baseTexture.source.width : baseTexture.width;
        const texHeight = baseTexture.source ? baseTexture.source.height : baseTexture.height;

        const frameWidth = texWidth / columns;
        const frameHeight = texHeight / Math.ceil(totalSprites / columns);
        
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);
        
        const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
        
        const frameTexture = new Texture({
            source: baseTexture.source || baseTexture,
            frame: rect
        });
        sprite = new Sprite(frameTexture);
      } else {
        sprite = buildSpriteFromDef(def);
      }
    } else {
      sprite = buildSpriteFromDef(def);
    }

    if (!sprite) continue;

    const x = (i % mapWidth) * tileSize;
    const y = Math.floor(i / mapWidth) * tileSize;
    sprite.x = x;
    sprite.y = y;
    sprite.width = tileSize;
    sprite.height = tileSize;

    const renderAbove = !!def.renderAbovePlayer;
    if (renderAbove) {
      objFrontRef.addChild(sprite);
    } else {
      objBehindRef.addChild(sprite);
    }
  }
};

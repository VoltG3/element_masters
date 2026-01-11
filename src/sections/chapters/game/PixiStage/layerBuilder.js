import { Sprite, AnimatedSprite, Texture, Rectangle, Container } from 'pixi.js';
import { getTexture, msToSpeed, getRegItem } from './helpers';
import { buildSpriteFromDef } from './playerManager';
import { isWaterDef, isLavaDef } from './liquidRendering';
import HealthBar from '../../../../Pixi/ui/HealthBar';

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
    objectMetadata,
    isEditor
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
    if (isWaterDef(def) || isLavaDef(def) || def.type === 'entity' || def.subtype === 'platform') {
      // liquids are handled by LiquidRegionSystem; skip per-tile sprite
      // entities and platforms are handled by separate managers
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

  // Objects (non-player)
  for (let i = 0; i < mapWidth * mapHeight; i++) {
    const id = objectMapData[i];
    if (!id || id.includes('player')) continue;
    const def = getDef(id);
    if (!def || def.type === 'entity' || def.subtype === 'platform') continue;

    const meta = (objectMetadata && objectMetadata[i]) || {};
    const maxH = def.maxHealth || 100;
    const health = meta.health !== undefined ? meta.health : maxH;

    let visualElement;
    if (def.spriteSheet && def.spriteSheet.enabled) {
      const totalSprites = def.spriteSheet.totalSprites || 1;
      const columns = def.spriteSheet.columns || totalSprites;
      
      const healthPercent = Math.max(0, Math.min(100, (health / maxH) * 100));
      let frameIndex = Math.floor((1 - healthPercent / 100) * (totalSprites - 1));
      frameIndex = Math.max(0, Math.min(totalSprites - 1, frameIndex));

      const baseTexture = getTexture(def.texture);
      const source = baseTexture?.source;
      if (source && source.width > 1) {
        const texWidth = source.width;
        const texHeight = source.height;

        const frameWidth = texWidth / columns;
        const frameHeight = texHeight / Math.ceil(totalSprites / columns);
        
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);
        
        const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
        
        const frameTexture = new Texture({
            source: source,
            frame: rect
        });
        visualElement = new Sprite(frameTexture);
      } else {
        visualElement = buildSpriteFromDef(def);
      }
    } else {
      visualElement = buildSpriteFromDef(def);
    }

    if (!visualElement) continue;

    const x = (i % mapWidth) * tileSize;
    const y = Math.floor(i / mapWidth) * tileSize;
    
    // Ja tas ir teksts (piemēram, bultiņa redaktorā), centrējam to tile ietvaros
    if (visualElement.anchor && visualElement.anchor.x === 0.5) {
      visualElement.x = tileSize / 2;
      visualElement.y = tileSize / 2;
    } else {
      visualElement.x = 0;
      visualElement.y = 0;
    }
    
    visualElement.width = tileSize;
    visualElement.height = tileSize;

    // Create a container if we need a health bar or just to keep it clean
    const container = new Container();
    container.x = x;
    container.y = y;
    
    // Slēpjam objektus, kuriem ir isHiddenInGame: true (piemēram, bultiņas spēlē)
    // Bet ja mēs esam redaktorā, mēs gribam tās redzēt.
    if (def.isHiddenInGame && !isEditor) {
        container.visible = false;
    }
    
    container.addChild(visualElement);

    // Add health bar for destructible objects if damaged
    if (def.isDestructible && health < maxH && health > 0) {
      try {
        const hb = new HealthBar({
          width: tileSize,
          height: 4,
          offsetX: 0,
          offsetY: -5
        });
        hb.update(health, maxH);
        container.addChild(hb);
      } catch (e) {}
    }

    const renderAbove = !!def.renderAbovePlayer;
    if (renderAbove) {
      objFrontRef.addChild(container);
    } else {
      objBehindRef.addChild(container);
    }
  }
};

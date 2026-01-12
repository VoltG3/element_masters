import { Sprite, AnimatedSprite, Texture, Rectangle, Container, Graphics } from 'pixi.js';
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

  // Clear previous and destroy old children to prevent memory leaks/ticker buildup
  const safeDestroy = (container) => {
    if (!container) return;
    const children = container.removeChildren();
    children.forEach(child => {
      try {
        // Destroy child but KEEP textures in cache
        child.destroy({ children: true, texture: false });
      } catch (e) {}
    });
  };

  safeDestroy(bgRef);
  safeDestroy(objBehindRef);
  safeDestroy(objFrontRef);
  safeDestroy(secretLayerRef?.below);
  safeDestroy(secretLayerRef?.above);

  // Track which tiles need secret overlay
  // We need overlay for: 1) unrevealed above/secret zones, 2) all open/below zones
  const secretOverlayTilesBelow = new Map(); // tile index -> filterColor
  const secretOverlayTilesAbove = new Map(); // tile index -> filterColor

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

    // Track which tiles need overlay rendering
    // above/secret: overlay AFTER reveal (to darken objects after revealing secret)
    // open/below: no overlay needed (tiles already darkened)
    if (isInSecretArea && isSecretRevealed) {
      const filterColor = secretDef?.filterColorInGame || secretDef?.filterColor || 'rgba(0, 0, 0, 0.6)';
      const renderAbove = secretDef?.renderAbovePlayer;
      if (renderAbove) {
        secretOverlayTilesAbove.set(i, filterColor);
      } else {
        secretOverlayTilesBelow.set(i, filterColor);
      }
    }

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
    if (!def || def.type === 'entity' || def.subtype === 'platform' || def.subtype === 'pushable' || def.isPushable) continue;

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

    // Check if object is in unrevealed secret zone - if so, hide it
    const secretId = secretMapData?.[i];
    const secretDef = secretId ? getDef(secretId) : null;
    const secretSubtype = secretDef?.subtype;
    const isInSecretArea = secretSubtype === 'secret' || secretSubtype === 'above';
    const isSecretRevealed = revealedSecrets && revealedSecrets.includes(i);

    if (isInSecretArea && !isSecretRevealed && !isEditor) {
      // Object is in unrevealed secret zone - make it invisible
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

  // Create dark overlays for unrevealed secret zones
  // Below player overlay (for secrets with renderAbovePlayer: false)
  if (secretOverlayTilesBelow.size > 0 && secretLayerRef?.below) {
    const overlay = new Graphics();
    secretOverlayTilesBelow.forEach((filterColor, idx) => {
      const x = (idx % mapWidth) * tileSize;
      const y = Math.floor(idx / mapWidth) * tileSize;

      const match = filterColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;

        overlay.rect(x, y, tileSize, tileSize);
        overlay.fill({ color: (r << 16) | (g << 8) | b, alpha: a });
      }
    });
    secretLayerRef.below.addChild(overlay);
  }

  // Above player overlay (for secrets with renderAbovePlayer: true)
  if (secretOverlayTilesAbove.size > 0 && secretLayerRef?.above) {
    const overlay = new Graphics();
    secretOverlayTilesAbove.forEach((filterColor, idx) => {
      const x = (idx % mapWidth) * tileSize;
      const y = Math.floor(idx / mapWidth) * tileSize;

      const match = filterColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;

        overlay.rect(x, y, tileSize, tileSize);
        overlay.fill({ color: (r << 16) | (g << 8) | b, alpha: a });
      }
    });
    secretLayerRef.above.addChild(overlay);
  }
};

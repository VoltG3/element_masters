import { Sprite, AnimatedSprite, Texture, Rectangle, Container, Graphics } from 'pixi.js';
import { getTexture, msToSpeed, getRegItem } from './helpers';
import { buildSpriteFromDef } from './playerManager';
import { isWaterDef, isLavaDef, isQuicksandDef, isWaterfallDef, isLavaWaterfallDef, isRadioactiveWaterDef, isRadioactiveWaterfallDef, createWaterFrames, createLavaFrames, createQuicksandFrames } from './liquidRendering';
import HealthBar from '../../../../Pixi/ui/HealthBar';

// Build layers: tiles, objects, and secret overlays
export const rebuildLayers = (refs, options) => {
  const { bgRef, objBehindRef, objFrontRef, roomBgRef, roomObjBehindRef, roomObjFrontRef, secretLayerRef } = refs;
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
  safeDestroy(roomBgRef);
  safeDestroy(roomObjBehindRef);
  safeDestroy(roomObjFrontRef);
  safeDestroy(secretLayerRef?.below);
  safeDestroy(secretLayerRef?.above);

  const secretOverlays = {
    below: new Map(),
    above: new Map()
  };

  // 1. Render main map
  renderMapContent(refs, options, 0, 0, secretOverlays, bgRef, objBehindRef, objFrontRef);

  // 2. Render active rooms
  const { activeRoomIds, maps, objectMetadata, secretMapData, mapWidth, tileSize } = options;
  if (activeRoomIds && activeRoomIds.length > 0 && maps && objectMetadata && secretMapData) {
    activeRoomIds.forEach(roomId => {
      const roomMap = maps[roomId];
      if (!roomMap) return;

      // Find the room_area on the current map that links to this room
      const roomAreaIndex = Object.keys(objectMetadata).find(idx => 
        secretMapData[idx] === 'room_area' && objectMetadata[idx].linkedMapId === roomId
      );

      if (roomAreaIndex !== undefined) {
        const idx = parseInt(roomAreaIndex);
        const ox = Math.round((idx % mapWidth) * tileSize);
        const oy = Math.round(Math.floor(idx / mapWidth) * tileSize);
        
        const roomSecrets = roomMap.secretMapData || (roomMap.layers?.find(l => l.name === 'secrets' || l.type === 'secret')?.data) || [];
        
        const roomOptions = {
          ...options,
          mapWidth: roomMap.mapWidth || roomMap.width,
          mapHeight: roomMap.mapHeight || roomMap.height,
          tileMapData: roomMap.tileMapData || (roomMap.layers?.find(l => l.name === 'background')?.data) || [],
          objectMapData: roomMap.objectMapData || (roomMap.layers?.find(l => l.name === 'entities')?.data) || [],
          secretMapData: roomSecrets,
          objectMetadata: roomMap.objectMetadata || {},
          mapType: 'room',
          backgroundColor: roomMap.selectedBackgroundColor,
          activeRoomIds: [] // Avoid recursion
        };

        renderMapContent(refs, roomOptions, ox, oy, secretOverlays, roomBgRef, roomObjBehindRef, roomObjFrontRef);
      }
    });
  }

  // 3. Render collected secret overlays
  renderSecretOverlays(refs, options, secretOverlays);
};

const renderMapContent = (refs, options, offsetX, offsetY, secretOverlays, targetBg, targetObjBehind, targetObjFront) => {
  const {
    mapWidth, mapHeight, tileSize, tileMapData, objectMapData, secretMapData,
    revealedSecrets, registryItems, objectMetadata, isEditor, isEditorPlayMode, mapType,
    activeRoomIds, maps
  } = options;

  const { secretLayerRef } = refs;
  const getDef = (id) => getRegItem(registryItems, id);

  // Pre-calculate indices covered by active rooms to hide main map content under them
  const activeRoomIndices = new Set();
  const roomWindowIndices = new Set(); // Store indices where rooms have windows

  if (mapType !== 'room' && activeRoomIds && activeRoomIds.length > 0 && maps) {
      Object.entries(objectMetadata || {}).forEach(([idxStr, meta]) => {
          const idx = parseInt(idxStr);
          if (secretMapData?.[idx] === 'room_area' && meta?.linkedMapId && activeRoomIds.includes(meta.linkedMapId)) {
              const roomMap = maps[meta.linkedMapId];
              if (!roomMap) return;

              const roomSecrets = roomMap.secretMapData || (roomMap.layers?.find(l => l.name === 'secrets' || l.type === 'secret')?.data) || [];
              const rw = meta.width || 1;
              const rh = meta.height || 1;
              const rx = idx % mapWidth;
              const ry = Math.floor(idx / mapWidth);
              const rMapW = roomMap.mapWidth || roomMap.width || rw;

              for (let dy = 0; dy < rh; dy++) {
                  for (let dx = 0; dx < rw; dx++) {
                      const worldIdx = (ry + dy) * mapWidth + (rx + dx);
                      const localIdx = dy * rMapW + dx;
                      
                      // In the main map context, roomWindowIndices are spots where we DON'T hide the main map
                      // because the room has a "hole" (window) there.
                      // A "hole" is defined as no tile AND no object in the room map.
                      const roomTiles = roomMap.tileMapData || (roomMap.layers?.find(l => l.name === 'background')?.data) || [];
                      const roomObjs = roomMap.objectMapData || (roomMap.layers?.find(l => l.name === 'entities')?.data) || [];
                      
                      if (!roomTiles[localIdx] && !roomObjs[localIdx]) {
                          roomWindowIndices.add(worldIdx);
                          activeRoomIndices.add(worldIdx); // Also hide main map tiles here to see background through windows
                      } else {
                          activeRoomIndices.add(worldIdx);
                      }
                  }
              }
          }
      });
  }

  // Add background color for rooms
  if (mapType === 'room') {
    const bgColorStr = options.backgroundColor || '#1a1a1a';
    const bgColorHex = bgColorStr.startsWith('#') ? 
        parseInt(bgColorStr.substring(1), 16) : 
        0x1a1a1a;
    
    const roomBg = new Graphics();
    const floorTileIds = new Set(tileMapData.filter(id => id));
    const floorObjIds = new Set(objectMapData.filter(id => id && !id.includes('player')));

    for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = tileMapData[i];
        const objId = objectMapData[i];
        
        // Window logic: if there is no tile AND no object, it's a window (transparent)
        // Be very strict about what counts as content
        const hasContent = (id && id !== "0") || (objId && objId !== "0" && !objId.includes('player'));

        if (hasContent) {
            const tx = i % mapWidth;
            const ty = Math.floor(i / mapWidth);
            const x = offsetX + tx * tileSize;
            const y = offsetY + ty * tileSize;
            
            // Use a slightly larger rect (0.5px) to prevent gaps/bleeding between tiles
            // but keep the overall room boundary sharp
            roomBg.rect(x - 0.25, y - 0.25, tileSize + 0.5, tileSize + 0.5);
        }
    }
    roomBg.fill({ color: bgColorHex, alpha: 1 });
    targetBg.addChild(roomBg);
  }

  // Background tiles
  for (let i = 0; i < mapWidth * mapHeight; i++) {
    const id = tileMapData[i];
    const secretId = secretMapData?.[i];

    if (mapType === 'room' && secretId === 'room_area') {
        continue;
    }

    // Hide content if it's under an active room
    if (activeRoomIndices.has(i)) {
        continue;
    }

    if (!id) continue;
    const def = getDef(id);
    if (!def) continue;

    const secretDef = secretId ? getDef(secretId) : null;
    const secretSubtype = secretDef?.subtype;
    const isInOpenArea = secretSubtype === 'open' || secretSubtype === 'below';
    const isInSecretArea = (secretSubtype === 'secret' || secretSubtype === 'above') && secretId !== 'room_area'; // Don't treat room_area as a classic secret filter if it's used as a window
    const isSecretRevealed = revealedSecrets && revealedSecrets.includes(i);

    const x = offsetX + (i % mapWidth) * tileSize;
    const y = offsetY + Math.floor(i / mapWidth) * tileSize;

    if (isInSecretArea && isSecretRevealed) {
      const filterColor = secretDef?.filterColorInGame || secretDef?.filterColor || 'rgba(0, 0, 0, 0.6)';
      const renderAbove = secretDef?.renderAbovePlayer;
      const key = `${x},${y}`;
      if (renderAbove) {
        secretOverlays.above.set(key, filterColor);
      } else {
        secretOverlays.below.set(key, filterColor);
      }
    }

    let renderOnSecretLayer = false;
    if (isInOpenArea) {
      renderOnSecretLayer = true;
    } else if (isInSecretArea && isSecretRevealed) {
      renderOnSecretLayer = true;
    }

    let sprite;
    let frames = null;
    if (isWaterDef(def) || isLavaDef(def) || isWaterfallDef(def) || isLavaWaterfallDef(def) || isRadioactiveWaterDef(def) || isRadioactiveWaterfallDef(def) || def.type === 'entity' || def.subtype === 'platform') {
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

    sprite.x = x;
    sprite.y = y;
    sprite.width = tileSize;
    sprite.height = tileSize;

    if (renderOnSecretLayer) {
      let backingSprite;
      if (frames && frames.length > 0) {
        backingSprite = new AnimatedSprite(frames);
        backingSprite.animationSpeed = sprite.animationSpeed;
        backingSprite.play();
      } else if (sprite.texture) {
        backingSprite = new Sprite(sprite.texture);
      }

      if (backingSprite) {
        backingSprite.x = x;
        backingSprite.y = y;
        backingSprite.width = tileSize;
        backingSprite.height = tileSize;
        targetBg.addChild(backingSprite);
      }

      const backing = new Graphics();
      backing.rect(x, y, tileSize, tileSize);
      backing.fill({ color: 0x000000, alpha: 0.7 });
      targetBg.addChild(backing);

      sprite.alpha = 0.4;
      if (secretLayerRef?.below) {
        secretLayerRef.below.addChild(sprite);
      } else {
        targetBg.addChild(sprite);
      }
    } else {
      targetBg.addChild(sprite);
    }
  }

  // Objects
  for (let i = 0; i < mapWidth * mapHeight; i++) {
    const id = objectMapData[i];
    if (!id || id.includes('player')) continue;

    const secretId = secretMapData?.[i];
    if (mapType === 'room' && secretId === 'room_area') {
        continue;
    }

    if (activeRoomIndices.has(i)) {
        continue;
    }

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
      let frameIndex = 0;
      
      if (meta.currentFrame !== undefined) {
        frameIndex = meta.currentFrame;
      } else if (def.subtype === 'door' && mapType === 'room') {
        frameIndex = def.interaction?.frames?.inside || 2;
      } else if (Number.isFinite(Number(def.spriteSheet?.frameIndex))) {
        frameIndex = Number(def.spriteSheet.frameIndex);
      } else {
        frameIndex = Math.floor((1 - healthPercent / 100) * (totalSprites - 1));
      }
      
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
        visualElement = new Sprite(new Texture({ source: source, frame: rect }));
      } else {
        visualElement = buildSpriteFromDef(def);
      }
    } else {
      visualElement = buildSpriteFromDef(def);
    }

    if (!visualElement) continue;

    const x = offsetX + (i % mapWidth) * tileSize;
    const y = offsetY + Math.floor(i / mapWidth) * tileSize;
    
    const renderOffsetX = Number(def.render?.offsetX) || 0;
    const renderOffsetY = Number(def.render?.offsetY) || 0;
    const overlapX = Number(def.render?.overlapX) || 0;
    const overlapY = Number(def.render?.overlapY) || 0;
    if (visualElement.anchor && visualElement.anchor.x === 0.5) {
      visualElement.x = tileSize / 2 + renderOffsetX - overlapX / 2;
      visualElement.y = tileSize / 2 + renderOffsetY - overlapY / 2;
    } else {
      visualElement.x = renderOffsetX - overlapX / 2;
      visualElement.y = renderOffsetY - overlapY / 2;
    }
    
    const tileW = meta.width || def.width || 1;
    const tileH = meta.height || def.height || 1;
    const objWidth = tileW * tileSize;
    const objHeight = tileH * tileSize;
    visualElement.width = objWidth + overlapX;
    visualElement.height = objHeight + overlapY;

    const container = new Container();
    const isLargeDecoration = def.type === 'decoration' && (tileW > 1 || tileH > 1);
    const anchorOffsetX = isLargeDecoration ? -Math.floor(tileW / 2) * tileSize : 0;
    const anchorOffsetY = isLargeDecoration ? -(tileH - 1) * tileSize : 0;
    container.x = x + anchorOffsetX;
    container.y = y + anchorOffsetY;
    container.isRoomContent = mapType === 'room';
    
    const isWeatherTrigger = def.type === 'weather_trigger';
    const isMessageTrigger = def.type === 'message_trigger';
    const isWolfSecret = def.type === 'wolf_secret';
    const shouldShowAnyway = (isWeatherTrigger || isMessageTrigger || isWolfSecret) && (isEditor || isEditorPlayMode);
    
    if (def.isHiddenInGame && !isEditor && !shouldShowAnyway) {
        container.visible = false;
    }

    const secretDef = secretId ? getDef(secretId) : null;
    const secretSubtype = secretDef?.subtype;
    const isInSecretArea = (secretSubtype === 'secret' || secretSubtype === 'above') && secretId !== 'room_area';
    const isSecretRevealed = revealedSecrets && revealedSecrets.includes(i);

    if (isInSecretArea && !isSecretRevealed && !isEditor) {
      container.visible = false;
    }

    container.addChild(visualElement);

    if (def.isDestructible && health < maxH && health > 0) {
      try {
        const hb = new HealthBar({
          width: objWidth,
          height: 4,
          offsetX: 0,
          offsetY: -5
        });
        hb.update(health, maxH);
        container.addChild(hb);
      } catch (e) {}
    }

    if (!!def.renderAbovePlayer) {
      targetObjFront.addChild(container);
    } else {
      targetObjBehind.addChild(container);
    }
  }
};

const renderSecretOverlays = (refs, options, overlays) => {
  const { tileSize } = options;
  const { secretLayerRef } = refs;

  const drawOverlay = (map, container) => {
    if (!container || map.size === 0) return;
    const overlay = new Graphics();
    map.forEach((filterColor, key) => {
      const [x, y] = key.split(',').map(Number);
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
    container.addChild(overlay);
  };

  drawOverlay(overlays.below, secretLayerRef?.below);
  drawOverlay(overlays.above, secretLayerRef?.above);
};

// Interactables logic - objects that can be used once and change state
// Unlike items (which disappear), interactables stay but change texture

export function checkInteractables(ctx, currentX, currentY, mapWidth, objectLayerData) {
  const { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState, mapData, activeRoomIds: activeRoomIdsProp, objectMetadata: mainObjectMetadata } = ctx;
  if (!objectLayerData) return;

  const keys = ctx.input?.current || {};

  const centerX = currentX + gameState.current.width / 2;
  const centerY = currentY + gameState.current.height / 2;

  // --- ROOM OVERLAY LOGIC: FIND CONTEXT ---
  let activeTargetMap = mapData;
  let activeObjectData = objectLayerData;
  // Use explicit metadata from Redux if available
  let activeMetadata = mainObjectMetadata || mapData?.objectMetadata || mapData?.meta?.objectMetadata || {};
  let activeMapWidth = mapWidth;
  let offsetX = 0;
  let offsetY = 0;
  let currentMapId = mapData?.id || 'main';

  const projectMaps = mapData?.maps || mapData?.projectMaps || {};
  const activeRoomIds = activeRoomIdsProp || mapData?.meta?.activeRoomIds || [];

  if (activeRoomIds.length > 0) {
      const mainMetadata = mainObjectMetadata || mapData?.objectMetadata || mapData?.meta?.objectMetadata || {};
      for (const [idxStr, meta] of Object.entries(mainMetadata)) {
          const idx = parseInt(idxStr);
          if (meta.linkedMapId && activeRoomIds.includes(meta.linkedMapId)) {
              const roomMap = projectMaps[meta.linkedMapId];
              if (!roomMap) continue;

              const rx = (idx % mapWidth) * TILE_SIZE;
              const ry = Math.floor(idx / mapWidth) * TILE_SIZE;
              const rw = (meta.width || 1) * TILE_SIZE;
              const rh = (meta.height || 1) * TILE_SIZE;

              if (centerX >= rx && centerX < rx + rw && centerY >= ry && centerY < ry + rh) {
                  // Player center is inside an active room!
                  activeTargetMap = roomMap;
                  activeMapWidth = roomMap.mapWidth || roomMap.width || 20;
                  activeObjectData = roomMap.objectMapData || roomMap.layers?.find(l => l.name === 'entities')?.data;
                  activeMetadata = roomMap.objectMetadata || {};
                  offsetX = rx;
                  offsetY = ry;
                  currentMapId = meta.linkedMapId;
                  break;
              }
          }
      }
  }
  // ----------------------------------------

  const localX = centerX - offsetX;
  const localY = centerY - offsetY;

  const gridX = Math.floor(localX / TILE_SIZE);
  const gridY = Math.floor(localY / TILE_SIZE);
  let index = gridY * activeMapWidth + gridX;

  // If "E" is pressed, also check one tile in front of the player
  if (keys.e) {
      const dir = gameState.current.direction || 1; // 1 for right, -1 for left
      const frontX = localX + dir * (TILE_SIZE * 0.8);
      const frontGridX = Math.floor(frontX / TILE_SIZE);
      const frontIndex = gridY * activeMapWidth + frontGridX;
      
      if (frontIndex >= 0 && frontIndex < (activeObjectData?.length || 0)) {
          const frontObjId = activeObjectData[frontIndex];
          if (frontObjId) {
              const frontDef = registryItems.find(r => r.id === frontObjId);
              // Priority given to interactive objects found in front
              if (frontDef && (frontDef.type === 'wolf_secret' || frontDef.subtype === 'door' || frontDef.name?.startsWith('interactable.'))) {
                  index = frontIndex;
              }
          }
      }
  }

  // 1. Check direct tile first (priority)
  let foundIndex = -1;
  const directObjId = activeObjectData ? activeObjectData[index] : null;
  if (directObjId) {
    foundIndex = index;
  } else {
    // 2. Check if we are inside any property region (multi-tile objects)
    if (activeMetadata) {
      for (const [idxStr, meta] of Object.entries(activeMetadata)) {
        const idx = parseInt(idxStr);
        const w = meta.width || 1;
        const h = meta.height || 1;
        if (w > 1 || h > 1) {
          const ox = idx % activeMapWidth;
          const oy = Math.floor(idx / activeMapWidth);
          if (gridX >= ox && gridX < ox + w && gridY >= oy && gridY < oy + h) {
            // Check if there's actually an object at this base index
            if (activeObjectData && activeObjectData[idx]) {
              foundIndex = idx;
              break; 
            }
          }
        }
      }
    }
  }

  if (foundIndex === -1) return;
  const actualIndex = foundIndex;

  const currentMeta = activeMetadata?.[actualIndex];

  const objId = activeObjectData[actualIndex];
  if (!objId) return;

  const objDef = registryItems.find(r => r.id === objId);
  if (!objDef) return;

  // Track used interactables in gameState
  if (!gameState.current.usedInteractables) {
    gameState.current.usedInteractables = new Set();
  }

  // Check for Weather Trigger logic (triggers when walking over it)
  if (objDef.type === 'weather_trigger') {
      const weatherType = objDef.weatherType; // rain, snow, clouds, fog, thunder
      const action = objDef.weatherAction; // on, off, set
      let value = 0;
      
      if (action === 'set' || action === 'on') {
          value = currentMeta?.intensity !== undefined ? currentMeta.intensity : (action === 'on' ? 1 : 50);
      } else if (action === 'off') {
          value = 0; // In runtime settings, 0 means off
      }
      
      if (!gameState.current.lastWeatherTrigger) {
          gameState.current.lastWeatherTrigger = {};
      }
      
      const lastVal = gameState.current.lastWeatherTrigger[actualIndex];
      if (lastVal !== value) {
          if (onStateUpdate) {
              onStateUpdate('updateWeather', {
                  type: weatherType,
                  value: value
              });
          }
          gameState.current.lastWeatherTrigger[actualIndex] = value;
          
          if (objDef.sfx) {
              try {
                  playShotSfx(objDef.sfx, objDef.sfxVolume || 0.5);
              } catch {}
          }
      }
      return;
  }

  // Check for Message Trigger logic
  if (objDef.type === 'message_trigger') {
      const message = currentMeta?.message;
      if (!message) return;

      if (!gameState.current.lastMessageTrigger) {
          gameState.current.lastMessageTrigger = {};
      }

      const lastMsg = gameState.current.lastMessageTrigger[actualIndex];
      if (lastMsg !== message) {
          if (onStateUpdate) {
              onStateUpdate('showMessage', {
                  text: message,
                  duration: 8000 // 8 sekundes
              });
          }
          gameState.current.lastMessageTrigger[actualIndex] = message;
          
          if (objDef.sfx) {
              try {
                  playShotSfx(objDef.sfx, objDef.sfxVolume || 0.5);
              } catch {}
          }
      }
      return;
  }

  // Check for Wolfenstein Secret logic (push wall on "E")
  if (objDef.type === 'wolf_secret') {
      if (!keys.e) return;

      if (!gameState.current.lastETime) gameState.current.lastETime = 0;
      const now = Date.now();
      if (now - gameState.current.lastETime < 1000) return; // 1s debounce
      
      gameState.current.lastETime = now;

      if (onStateUpdate) {
          const dx = objDef.moveX || 0;
          const dy = objDef.moveY || 0;
          onStateUpdate('shiftTile', { index, dx, dy });
        
          if (objDef.sfx) {
              try { playShotSfx(objDef.sfx, objDef.sfxVolume || 0.5); } catch {}
          }
      }
      return;
  }

  // Check for Door logic
  if (objDef.subtype === 'door') {
    if (keys.e) {
      if (!gameState.current.lastETime) gameState.current.lastETime = 0;
      const now = Date.now();
      if (now - gameState.current.lastETime < 600) return; // 0.6s debounce for doors (must exceed delaySeconds)
      gameState.current.lastETime = now;

      // 1. Play sound
      const sound = currentMeta?.sound || objDef.interaction?.sound;
      if (sound) {
        try { playShotSfx(sound, objDef.sfxVolume || 0.5); } catch {}
      }

      // 2. Change frame to 'opening'
      if (onStateUpdate) {
        onStateUpdate('setObjectFrame', { 
            index: actualIndex, 
            frame: objDef.interaction?.frames?.opening || 1,
            mapId: activeTargetMap === mapData ? null : activeTargetMap.id
        });
      }

      // 3. Delay and switch map
      const delayS = currentMeta?.delaySeconds !== undefined ? currentMeta.delaySeconds : (objDef.interaction?.delaySeconds || 0.5);
      const targetMapId = currentMeta?.targetMapId;

      if (onStateUpdate && targetMapId) {
        setTimeout(() => {
          // Special handling for rooms
          const targetMap = projectMaps[targetMapId];
          const isRoom = targetMap && targetMap.type === 'room';
          const isExitingRoom = !isRoom && activeTargetMap !== mapData && targetMapId === 'main';

          if (isRoom || isExitingRoom) {
              let newX = gameState.current.x, newY = gameState.current.y;
              if (isRoom) {
                  // Entering a room
                  const roomAreaEntry = Object.entries(mapData?.meta?.objectMetadata || {}).find(([idx, m]) => m.linkedMapId === targetMapId);
                  let rx = 0, ry = 0;
                  if (roomAreaEntry) {
                      const raIdx = parseInt(roomAreaEntry[0]);
                      rx = (raIdx % mapWidth) * TILE_SIZE;
                      ry = Math.floor(raIdx / mapWidth) * TILE_SIZE;
                  }
                  const spawn = findSpawnPosition(targetMap, currentMeta.spawnTriggerId, TILE_SIZE);
                  if (spawn) {
                      newX = rx + spawn.x + (TILE_SIZE - gameState.current.width) / 2;
                      newY = ry + spawn.y + (TILE_SIZE - gameState.current.height) / 2;
                  }
              } else {
                  // Exiting room
                  const roomAreaEntry = Object.entries(mapData?.meta?.objectMetadata || {}).find(([idx, m]) => m.linkedMapId === activeTargetMap.id);
                  if (roomAreaEntry) {
                      const spawn = findSpawnPosition(mapData, currentMeta.spawnTriggerId, TILE_SIZE);
                      if (spawn) {
                          newX = spawn.x + (TILE_SIZE - gameState.current.width) / 2;
                          newY = spawn.y + (TILE_SIZE - gameState.current.height) / 2;
                      }
                  }
              }

              gameState.current.x = newX;
              gameState.current.y = newY;
              gameState.current.vx = 0;
              gameState.current.vy = 0;
              onStateUpdate('switchMap', { targetMapId, triggerId: currentMeta.spawnTriggerId });
          } else {
              // Normal map switch
              onStateUpdate('switchMap', {
                targetMapId: targetMapId,
                triggerId: currentMeta.spawnTriggerId
              });
          }
        }, delayS * 1000);
      }
      return;
    }
    return;
  }

  if (!objDef.name || !objDef.name.startsWith('interactable.')) return;

  // Check for Teleport logic
  if (objId.includes('portal') && currentMeta && currentMeta.triggerId !== undefined && currentMeta.triggerId !== null) {
      // 1. Check for cross-map teleport
      const targetMapId = currentMeta.targetMapId;

      if (targetMapId && projectMaps && projectMaps[targetMapId]) {
          // TELEPORT!
          if (onStateUpdate) {
              onStateUpdate('switchMap', {
                  targetMapId: targetMapId,
                  triggerId: currentMeta.triggerId
              });
              
              // Play sound
              try {
                  const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
                  playShotSfx(objDef?.sfx || "/assets/sound/sfx/teleport.ogg", vol);
              } catch {}
              return;
          }
      }

      // 2. Internal teleport (find destination on same map)
      for (let i = 0; i < (activeObjectData?.length || 0); i++) {
          if (i === actualIndex) continue;
          const destId = activeObjectData[i];
          if (destId && (destId.includes('target') || destId === 'portal_target')) {
              const destMeta = activeMetadata?.[i];
              if (destMeta && destMeta.triggerId === currentMeta.triggerId) {
                  // TELEPORT!
                  const tx = offsetX + (i % activeMapWidth) * TILE_SIZE;
                  const ty = offsetY + Math.floor(i / activeMapWidth) * TILE_SIZE;
                  
                  // Move player to target
                  gameState.current.x = tx;
                  gameState.current.y = ty;
                  
                  // Play sound
                  try {
                      const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
                      playShotSfx(objDef?.sfx || "/assets/sound/sfx/teleport.ogg", vol);
                  } catch {}
                  return;
              }
          }
      }
  }

  // Check for End Level logic
  if (objDef.subtype === 'end' && !gameState.current.isWinning) {
    gameState.current.isWinning = true;
    gameState.current.winCounter = 0;
    gameState.current.winCountSpeed = objDef.winCountSpeed || 10;
    return;
  }

  const interactableKey = currentMapId === 'main' ? `${actualIndex}` : `${currentMapId}:${actualIndex}`;
  if (gameState.current.usedInteractables.has(interactableKey)) return; // Already used

  // Check if has effect
  if (!objDef.effect) return;

  // Health effect
  if (objDef.effect.health) {
    const healthBonus = parseInt(objDef.effect.health, 10);
    if (gameState.current.health >= MAX_HEALTH) return; // Don't use if already full health

    const newHealth = Math.min(gameState.current.health + healthBonus, MAX_HEALTH);
    gameState.current.health = newHealth;

    // Play sound
    try {
      const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
      playShotSfx(objDef?.sfx, vol);
    } catch {}

    // Mark as used
    gameState.current.usedInteractables.add(interactableKey);

    // Notify state update with 'interactable' event - this will switch to next texture
    if (onStateUpdate) onStateUpdate('interactable', { index: actualIndex, mapId: currentMapId === 'main' ? null : currentMapId });
    return;
  }

  // Future: Add other interactable effects (ammo, etc.)
  if (objDef.effect.fireball) {
    const ammoBonus = parseInt(objDef.effect.fireball, 10) || 0;
    gameState.current.ammo = Math.max(0, (gameState.current.ammo || 0) + ammoBonus);

    try {
      const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
      playShotSfx(objDef?.sfx, vol);
    } catch {}

    gameState.current.usedInteractables.add(interactableKey);
    if (onStateUpdate) onStateUpdate('interactable', { index: actualIndex, mapId: currentMapId === 'main' ? null : currentMapId });
    return;
  }
}

/**
 * Finds spawn position in a map by trigger ID or player start
 */
export function findSpawnPosition(map, triggerId, tileSize) {
    if (!map) return null;
    
    const mapW = map.width || map.mapWidth || 20;
    const metadata = map.objectMetadata || {};
    
    // Find all objects
    const objLayer = map.layers?.find(l => l.name === 'entities' || l.type === 'object');
    const objData = map.objectMapData || objLayer?.data;
    
    if (!objData) return null;
    
    let spawnIdx = -1;
    
    // 1. Search for matching triggerId
    const triggerRequested = triggerId !== undefined && triggerId !== null && triggerId !== '';
    if (triggerRequested) {
        for (let i = 0; i < objData.length; i++) {
            if (!objData[i]) continue;
            if (metadata[i] && metadata[i].triggerId === triggerId) {
                spawnIdx = i;
                break;
            }
        }
    }
    
    // 2. Fallback: Search for player start (only if no specific trigger was requested or requested trigger not found)
    if (spawnIdx === -1 && !triggerRequested) {
        spawnIdx = objData.findIndex(id => id && id.includes('player'));
    }
    
    if (spawnIdx !== -1) {
        return {
            x: (spawnIdx % mapW) * tileSize,
            y: Math.floor(spawnIdx / mapW) * tileSize
        };
    }
    
    return null;
}

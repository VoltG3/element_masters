// Interactables logic - objects that can be used once and change state
// Unlike items (which disappear), interactables stay but change texture

export function checkInteractables(ctx, currentX, currentY, mapWidth, objectLayerData) {
  const { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState, mapData } = ctx;
  if (!objectLayerData) return;

  const keys = ctx.input?.current || {};

  const centerX = currentX + gameState.current.width / 2;
  const centerY = currentY + gameState.current.height / 2;

  const gridX = Math.floor(centerX / TILE_SIZE);
  const gridY = Math.floor(centerY / TILE_SIZE);
  let index = gridY * mapWidth + gridX;

  // If "E" is pressed, also check one tile in front of the player
  // This allows interacting with solid objects (like pushable walls) that the player can't overlap with
  if (keys.e) {
      const dir = gameState.current.direction || 1; // 1 for right, -1 for left
      const frontX = centerX + dir * (TILE_SIZE * 0.8);
      const frontGridX = Math.floor(frontX / TILE_SIZE);
      const frontIndex = gridY * mapWidth + frontGridX;
      
      if (frontIndex >= 0 && frontIndex < objectLayerData.length) {
          const frontObjId = objectLayerData[frontIndex];
          if (frontObjId) {
              const frontDef = registryItems.find(r => r.id === frontObjId);
              // Priority given to wolf_secret if found in front
              if (frontDef && frontDef.type === 'wolf_secret') {
                  index = frontIndex;
              }
          }
      }
  }

  // 1. Check direct tile first (priority)
  let foundIndex = -1;
  const directObjId = objectLayerData[index];
  if (directObjId) {
    foundIndex = index;
  } else {
    // 2. Check if we are inside any property region
    const metadata = mapData?.meta?.objectMetadata;
    if (metadata) {
      for (const [idxStr, meta] of Object.entries(metadata)) {
        const idx = parseInt(idxStr);
        const w = meta.width || 1;
        const h = meta.height || 1;
        if (w > 1 || h > 1) {
          const ox = idx % mapWidth;
          const oy = Math.floor(idx / mapWidth);
          if (gridX >= ox && gridX < ox + w && gridY >= oy && gridY < oy + h) {
            // Check if there's actually an object at this base index
            if (objectLayerData[idx]) {
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

  const metadata = mapData?.meta?.objectMetadata;
  const currentMeta = metadata?.[actualIndex];

  const objId = objectLayerData[actualIndex];
  if (!objId) return;

  const objDef = registryItems.find(r => r.id === objId);
  if (!objDef) return;

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
      // 1. Play sound
      const sound = currentMeta?.sound || objDef.interaction?.sound;
      if (sound) {
        try { playShotSfx(sound, objDef.sfxVolume || 0.5); } catch {}
      }

      // 2. Change frame to 'opening'
      if (onStateUpdate) {
        onStateUpdate('setObjectFrame', { index: actualIndex, frame: objDef.interaction?.frames?.opening || 1 });
      }

      // 3. Delay and switch map
      const delayS = currentMeta?.delaySeconds !== undefined ? currentMeta.delaySeconds : (objDef.interaction?.delaySeconds || 0.5);
      
      if (onStateUpdate && currentMeta?.targetMapId) {
        setTimeout(() => {
          onStateUpdate('switchMap', {
            targetMapId: currentMeta.targetMapId,
            triggerId: currentMeta.spawnTriggerId
          });
        }, delayS * 1000);
      }
      return;
    }
    // If not pressed E, but we are just standing there - the frame is handled by layerBuilder (closed or inside)
    return;
  }

  if (!objDef.name || !objDef.name.startsWith('interactable.')) return;

  // Check for Teleport logic
  if (objId.includes('portal') && currentMeta && currentMeta.triggerId !== undefined && currentMeta.triggerId !== null) {
      // 1. Check for cross-map teleport
      const targetMapId = currentMeta.targetMapId;
      const maps = mapData?.maps || mapData?.projectMaps; // Try to find project maps

      if (targetMapId && maps && maps[targetMapId]) {
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
      for (let i = 0; i < objectLayerData.length; i++) {
          if (i === index) continue;
          const destId = objectLayerData[i];
          if (destId && (destId.includes('target') || destId === 'portal_target')) {
              const destMeta = metadata?.[i];
              if (destMeta && destMeta.triggerId === currentMeta.triggerId) {
                  // TELEPORT!
                  const tx = (i % mapWidth) * TILE_SIZE;
                  const ty = Math.floor(i / mapWidth) * TILE_SIZE;
                  
                  // Move player to target
                  gameState.current.x = tx;
                  gameState.current.y = ty;
                  
                  // Play sound
                  try {
                      const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
                      playShotSfx(objDef?.sfx || "/assets/sound/sfx/teleport.ogg", vol);
                  } catch {}

                  // For teleport we don't necessarily mark as used if we want multi-use
                  // but if the user wants it to disappear/change state, we can.
                  // For now, let's just teleport.
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

  // Check if already used (track used interactables in gameState)
  if (!gameState.current.usedInteractables) {
    gameState.current.usedInteractables = new Set();
  }

  if (gameState.current.usedInteractables.has(index)) return; // Already used

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
    gameState.current.usedInteractables.add(index);

    // Notify state update with 'interactable' event - this will switch to next texture
    if (onStateUpdate) onStateUpdate('interactable', index);
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

    gameState.current.usedInteractables.add(index);
    if (onStateUpdate) onStateUpdate('interactable', index);
    return;
  }
}

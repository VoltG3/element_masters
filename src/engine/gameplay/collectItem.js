// Item collection extracted from useGameEngine.js

const getDefById = (registryItems, id) => {
  if (!id) return null;
  const map = registryItems && registryItems.__byId;
  if (map && typeof map.get === 'function') return map.get(id) || null;
  return Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
};

// Collects item under player's center if pickup-able.
// Args (ctx): { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState, maps, activeRoomIds, objectMetadata }
// Params: currentX, currentY, mapWidth, objectLayerData
export function collectItem(ctx, currentX, currentY, mapWidth, objectLayerData) {
  const { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState, maps, activeRoomIds, objectMetadata: mainMetadata, secretMapData, activeMapId } = ctx;
  if (!objectLayerData) return;

  const centerX = currentX + gameState.current.width / 2;
  const centerY = currentY + gameState.current.height / 2;

  // --- ROOM OVERLAY LOGIC ---
  if (maps && activeRoomIds && activeRoomIds.length > 0 && mainMetadata) {
    if (!gameState.current.collectedItems) {
      gameState.current.collectedItems = new Set();
    }

    for (const [idxStr, meta] of Object.entries(mainMetadata)) {
      const idx = parseInt(idxStr);
      if (secretMapData && secretMapData[idx] !== 'room_area') continue;
      if (meta.linkedMapId && activeRoomIds.includes(meta.linkedMapId)) {
        const roomMap = maps[meta.linkedMapId];
        if (!roomMap) continue;

        const rx = (idx % mapWidth) * TILE_SIZE;
        const ry = Math.floor(idx / mapWidth) * TILE_SIZE;
        const rw = (meta.width || 1) * TILE_SIZE;
        const rh = (meta.height || 1) * TILE_SIZE;

        if (centerX >= rx && centerX < rx + rw && centerY >= ry && centerY < ry + rh) {
          // Inside a room!
          const localX = centerX - rx;
          const localY = centerY - ry;
          const rWidth = roomMap.mapWidth || roomMap.width || 20;
          const rgX = Math.floor(localX / TILE_SIZE);
          const rgY = Math.floor(localY / TILE_SIZE);
          const rIndex = rgY * rWidth + rgX;
          
          const itemKey = `${meta.linkedMapId}:${rIndex}`;
          if (gameState.current.collectedItems.has(itemKey)) return;

          const rObjectData = roomMap.objectMapData || roomMap.layers?.find(l => l.name === 'entities')?.data;
          if (rObjectData && rObjectData[rIndex]) {
            // Call collectItem recursively or just handle it here
            const rItemId = rObjectData[rIndex];
            const rItemDef = getDefById(registryItems, rItemId);
            
            if (rItemDef && rItemDef.pickup && !rItemId.includes('player')) {
               if (rItemDef.name && rItemDef.name.startsWith('interactable.')) return;

               // Pick it up
               let pickedUp = false;
               if (rItemDef.effect && rItemDef.effect.health) {
                 const healthBonus = parseInt(rItemDef.effect.health, 10);
                 if (gameState.current.health < MAX_HEALTH) {
                   gameState.current.health = Math.min(gameState.current.health + healthBonus, MAX_HEALTH);
                   pickedUp = true;
                 }
               } else if (rItemDef.effect && rItemDef.effect.fireball) {
                 const ammoBonus = parseInt(rItemDef.effect.fireball, 10) || 0;
                 gameState.current.ammo = (gameState.current.ammo || 0) + ammoBonus;
                 pickedUp = true;
               }

               if (pickedUp) {
                 gameState.current.collectedItems.add(itemKey);
                 try {
                   playShotSfx(rItemDef?.sfx, Math.max(0, Math.min(1, rItemDef?.sfxVolume ?? 1)));
                 } catch {}
                 if (onStateUpdate) {
                   onStateUpdate('collectItem', { index: rIndex, mapId: meta.linkedMapId });
                 }
                 return;
               }
            }
          }
          // If we are in a room, we don't pick up items from the main map below
          return;
        }
      }
    }
  }
  // --- END ROOM OVERLAY LOGIC ---

  if (!gameState.current.collectedItems) {
    gameState.current.collectedItems = new Set();
  }

  const gridX = Math.floor(centerX / TILE_SIZE);
  const gridY = Math.floor(centerY / TILE_SIZE);
  const index = gridY * mapWidth + gridX;
  if (index < 0 || index >= objectLayerData.length) return;

  const mapKey = activeMapId || 'main';
  const itemKey = `${mapKey}:${index}`;
  if (gameState.current.collectedItems.has(itemKey)) return;

  const itemId = objectLayerData[index];
  if (!itemId) return;

  const itemDef = getDefById(registryItems, itemId);
  if (!itemDef || !itemDef.pickup || itemId.includes('player')) return;

  // Skip interactables - they are handled by checkInteractables()
  if (itemDef.name && itemDef.name.startsWith('interactable.')) return;

  // Health pickup
  if (itemDef.effect && itemDef.effect.health) {
    const healthBonus = parseInt(itemDef.effect.health, 10);
    if (gameState.current.health >= MAX_HEALTH) return;
    const newHealth = Math.min(gameState.current.health + healthBonus, MAX_HEALTH);
    gameState.current.health = newHealth;
    try {
      const vol = Math.max(0, Math.min(1, itemDef?.sfxVolume ?? 1));
      playShotSfx(itemDef?.sfx, vol);
    } catch {}
    if (onStateUpdate) onStateUpdate('collectItem', { index, mapId: mapKey });
    return;
  }

  // Fireball ammo pickup
  if (itemDef.effect && itemDef.effect.fireball) {
    const ammoBonus = parseInt(itemDef.effect.fireball, 10) || 0;
    gameState.current.ammo = Math.max(0, (gameState.current.ammo || 0) + ammoBonus);
    try {
      const vol = Math.max(0, Math.min(1, itemDef?.sfxVolume ?? 1));
      playShotSfx(itemDef?.sfx, vol);
    } catch {}
    if (onStateUpdate) onStateUpdate('collectItem', { index, mapId: mapKey });
    return;
  }
}

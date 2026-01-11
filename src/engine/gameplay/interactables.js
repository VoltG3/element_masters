// Interactables logic - objects that can be used once and change state
// Unlike items (which disappear), interactables stay but change texture

export function checkInteractables(ctx, currentX, currentY, mapWidth, objectLayerData) {
  const { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState, mapData } = ctx;
  if (!objectLayerData) return;

  const centerX = currentX + gameState.current.width / 2;
  const centerY = currentY + gameState.current.height / 2;

  const gridX = Math.floor(centerX / TILE_SIZE);
  const gridY = Math.floor(centerY / TILE_SIZE);
  const index = gridY * mapWidth + gridX;
  if (index < 0 || index >= objectLayerData.length) return;

  const objId = objectLayerData[index];
  if (!objId) return;

  const objDef = registryItems.find(r => r.id === objId);
  if (!objDef || !objDef.name || !objDef.name.startsWith('interactable.')) return;

  // Check for Teleport logic
  const metadata = mapData?.meta?.objectMetadata;
  const currentMeta = metadata?.[index];
  
  if (objId.includes('portal') && currentMeta && currentMeta.triggerId !== undefined && currentMeta.triggerId !== null) {
      // Find destination
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

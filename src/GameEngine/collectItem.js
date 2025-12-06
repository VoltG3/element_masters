// Item collection extracted from useGameEngine.js

// Collects item under player's center if pickup-able.
// Args (ctx): { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState }
// Params: currentX, currentY, mapWidth, objectLayerData
export function collectItem(ctx, currentX, currentY, mapWidth, objectLayerData) {
  const { registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState } = ctx;
  if (!objectLayerData) return;

  const centerX = currentX + gameState.current.width / 2;
  const centerY = currentY + gameState.current.height / 2;

  const gridX = Math.floor(centerX / TILE_SIZE);
  const gridY = Math.floor(centerY / TILE_SIZE);
  const index = gridY * mapWidth + gridX;
  if (index < 0 || index >= objectLayerData.length) return;

  const itemId = objectLayerData[index];
  if (!itemId) return;

  const itemDef = registryItems.find(r => r.id === itemId);
  if (!itemDef || !itemDef.pickup || itemId.includes('player')) return;

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
    if (onStateUpdate) onStateUpdate('collectItem', index);
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
    if (onStateUpdate) onStateUpdate('collectItem', index);
    return;
  }
}

export function applyInteractableEffects({
  objDef,
  actualIndex,
  currentMapId,
  gameState,
  onStateUpdate,
  playShotSfx,
  MAX_HEALTH
}) {
  if (!objDef || !objDef.name || !objDef.name.startsWith('interactable.')) return false;
  if (!objDef.effect) return true;

  const interactableKey = currentMapId === 'main' ? `${actualIndex}` : `${currentMapId}:${actualIndex}`;
  if (gameState.current.usedInteractables.has(interactableKey)) return true;

  if (objDef.effect.health) {
    const healthBonus = parseInt(objDef.effect.health, 10);
    if (gameState.current.health >= MAX_HEALTH) return true;

    gameState.current.health = Math.min(gameState.current.health + healthBonus, MAX_HEALTH);

    try {
      const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
      playShotSfx(objDef?.sfx, vol);
    } catch {}

    gameState.current.usedInteractables.add(interactableKey);
    if (onStateUpdate) onStateUpdate('interactable', { index: actualIndex, mapId: currentMapId === 'main' ? null : currentMapId });
    return true;
  }

  if (objDef.effect.fireball) {
    const ammoBonus = parseInt(objDef.effect.fireball, 10) || 0;
    gameState.current.ammo = Math.max(0, (gameState.current.ammo || 0) + ammoBonus);

    try {
      const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
      playShotSfx(objDef?.sfx, vol);
    } catch {}

    gameState.current.usedInteractables.add(interactableKey);
    if (onStateUpdate) onStateUpdate('interactable', { index: actualIndex, mapId: currentMapId === 'main' ? null : currentMapId });
    return true;
  }

  return true;
}

export default { applyInteractableEffects };

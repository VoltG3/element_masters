export function handleTeleportInteraction({
  objId,
  objDef,
  currentMeta,
  actualIndex,
  activeObjectData,
  activeMetadata,
  activeMapWidth,
  offsetX,
  offsetY,
  projectMaps,
  onStateUpdate,
  playShotSfx,
  gameState,
  TILE_SIZE
}) {
  if (!objId || !objId.includes('portal')) return false;
  if (!currentMeta || currentMeta.triggerId === undefined || currentMeta.triggerId === null) return true;

  const targetMapId = currentMeta.targetMapId;
  if (targetMapId && projectMaps && projectMaps[targetMapId]) {
    if (onStateUpdate) {
      onStateUpdate('switchMap', {
        targetMapId,
        triggerId: currentMeta.triggerId
      });
      try {
        const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
        playShotSfx(objDef?.sfx || "/assets/sound/sfx/teleport.ogg", vol);
      } catch {}
    }
    return true;
  }

  for (let i = 0; i < (activeObjectData?.length || 0); i++) {
    if (i === actualIndex) continue;
    const destId = activeObjectData[i];
    if (destId && (destId.includes('target') || destId === 'portal_target')) {
      const destMeta = activeMetadata?.[i];
      if (destMeta && destMeta.triggerId === currentMeta.triggerId) {
        const tx = offsetX + (i % activeMapWidth) * TILE_SIZE;
        const ty = offsetY + Math.floor(i / activeMapWidth) * TILE_SIZE;

        gameState.current.x = tx;
        gameState.current.y = ty;

        try {
          const vol = Math.max(0, Math.min(1, objDef?.sfxVolume ?? 1));
          playShotSfx(objDef?.sfx || "/assets/sound/sfx/teleport.ogg", vol);
        } catch {}
        return true;
      }
    }
  }

  return true;
}

export default { handleTeleportInteraction };

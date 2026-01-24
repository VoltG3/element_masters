import { findSpawnPosition } from './spawn';

export function handleDoorInteraction({
  objDef,
  currentMeta,
  actualIndex,
  keys,
  gameState,
  onStateUpdate,
  playShotSfx,
  mapData,
  mapWidth,
  TILE_SIZE,
  activeTargetMap,
  projectMaps
}) {
  if (!objDef || objDef.subtype !== 'door') return false;
  if (!keys?.e) return true;

  if (!gameState.current.lastETime) gameState.current.lastETime = 0;
  const now = Date.now();
  if (now - gameState.current.lastETime < 600) return true;
  gameState.current.lastETime = now;

  const sound = currentMeta?.sound || objDef.interaction?.sound;
  if (sound) {
    try { playShotSfx(sound, objDef.sfxVolume || 0.5); } catch {}
  }

  if (onStateUpdate) {
    onStateUpdate('setObjectFrame', {
      index: actualIndex,
      frame: objDef.interaction?.frames?.opening || 1,
      mapId: activeTargetMap === mapData ? null : activeTargetMap.id
    });
  }

  const delayS = currentMeta?.delaySeconds !== undefined ? currentMeta.delaySeconds : (objDef.interaction?.delaySeconds || 0.5);
  const targetMapId = currentMeta?.targetMapId;

  if (onStateUpdate && targetMapId) {
    setTimeout(() => {
      const targetMap = projectMaps[targetMapId];
      const isRoom = targetMap && targetMap.type === 'room';
      const isExitingRoom = !isRoom && activeTargetMap !== mapData && targetMapId === 'main';

      if (isRoom || isExitingRoom) {
        let newX = gameState.current.x;
        let newY = gameState.current.y;

        if (isRoom) {
          const roomAreaEntry = Object.entries(mapData?.meta?.objectMetadata || {})
            .find(([, m]) => m.linkedMapId === targetMapId);
          let rx = 0;
          let ry = 0;
          if (roomAreaEntry) {
            const raIdx = parseInt(roomAreaEntry[0], 10);
            rx = (raIdx % mapWidth) * TILE_SIZE;
            ry = Math.floor(raIdx / mapWidth) * TILE_SIZE;
          }
          const spawn = findSpawnPosition(targetMap, currentMeta.spawnTriggerId, TILE_SIZE);
          if (spawn) {
            newX = rx + spawn.x + (TILE_SIZE - gameState.current.width) / 2;
            newY = ry + spawn.y + (TILE_SIZE - gameState.current.height) / 2;
          }
        } else {
          const roomAreaEntry = Object.entries(mapData?.meta?.objectMetadata || {})
            .find(([, m]) => m.linkedMapId === activeTargetMap.id);
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
        onStateUpdate('switchMap', { targetMapId, triggerId: currentMeta.spawnTriggerId });
      }
    }, delayS * 1000);
  }

  return true;
}

export default { handleDoorInteraction };

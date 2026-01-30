import { findSpawnPosition } from './spawn';

const resolveMapObjects = (map) => {
  if (!map) return { mapW: 20, objData: [], metadata: {} };
  const mapW = map.mapWidth || map.width || map.meta?.width || 20;
  const objLayer = map.layers?.find(l => l.name === 'entities' || l.type === 'object');
  const objData = map.objectMapData || objLayer?.data || [];
  const metadata = map.objectMetadata || map.meta?.objectMetadata || {};
  return { mapW, objData, metadata };
};

const findExitDoorSpawn = ({ map, targetRoomId, roomMeta, tileSize }) => {
  const { mapW, objData, metadata } = resolveMapObjects(map);
  if (!Array.isArray(objData) || objData.length === 0) return null;

  const matchIds = [];
  if (roomMeta?.spawnTriggerId !== undefined && roomMeta?.spawnTriggerId !== null && roomMeta?.spawnTriggerId !== '') {
    matchIds.push(roomMeta.spawnTriggerId);
  }
  if (roomMeta?.triggerId !== undefined && roomMeta?.triggerId !== null && roomMeta?.triggerId !== '') {
    if (!matchIds.includes(roomMeta.triggerId)) {
      matchIds.push(roomMeta.triggerId);
    }
  }
  let candidateIdx = -1;
  let matchedIdx = -1;

  for (let i = 0; i < objData.length; i++) {
    const id = objData[i];
    if (!id || !String(id).includes('door')) continue;
    const meta = metadata[i];
    if (!meta || meta.targetMapId !== targetRoomId) continue;
    if (candidateIdx === -1) candidateIdx = i;
    if (matchIds.length) {
      if (matchIds.some(id => meta.spawnTriggerId === id || meta.triggerId === id)) {
        matchedIdx = i;
        break;
      }
    }
  }

  const doorIdx = matchedIdx !== -1 ? matchedIdx : candidateIdx;
  if (doorIdx === -1) return null;
  return {
    index: doorIdx,
    x: (doorIdx % mapW) * tileSize,
    y: Math.floor(doorIdx / mapW) * tileSize,
    meta: metadata[doorIdx] || {}
  };
};

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
        let exitTriggerId = currentMeta?.spawnTriggerId;
        if (exitTriggerId === undefined || exitTriggerId === null || exitTriggerId === '') {
          exitTriggerId = currentMeta?.triggerId;
        }

        if (isRoom) {
          const roomAreaMeta = mapData?.meta?.objectMetadata || mapData?.objectMetadata || {};
          const roomAreaEntry = Object.entries(roomAreaMeta)
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
          const roomAreaMeta = mapData?.meta?.objectMetadata || mapData?.objectMetadata || {};
          const roomAreaEntry = Object.entries(roomAreaMeta)
            .find(([, m]) => m.linkedMapId === activeTargetMap.id);
          if (roomAreaEntry) {
            let spawnFound = false;
            if (exitTriggerId !== undefined && exitTriggerId !== null && exitTriggerId !== '') {
              const spawn = findSpawnPosition(mapData, exitTriggerId, TILE_SIZE);
              if (spawn) {
                newX = spawn.x + (TILE_SIZE - gameState.current.width) / 2;
                newY = spawn.y + (TILE_SIZE - gameState.current.height) / 2;
                spawnFound = true;
              }
            }
            if (!spawnFound) {
              const fallback = findExitDoorSpawn({
                map: mapData,
                targetRoomId: activeTargetMap.id,
                roomMeta: currentMeta,
                tileSize: TILE_SIZE
              });
              if (fallback) {
                newX = fallback.x + (TILE_SIZE - gameState.current.width) / 2;
                newY = fallback.y + (TILE_SIZE - gameState.current.height) / 2;
                spawnFound = true;
                if (exitTriggerId === undefined || exitTriggerId === null || exitTriggerId === '') {
                  if (fallback.meta?.triggerId !== undefined) {
                    exitTriggerId = fallback.meta.triggerId;
                  } else if (fallback.meta?.spawnTriggerId !== undefined) {
                    exitTriggerId = fallback.meta.spawnTriggerId;
                  }
                }
              }
            }
          }
        }

        gameState.current.x = newX;
        gameState.current.y = newY;
        gameState.current.vx = 0;
        gameState.current.vy = 0;
        const triggerId = isExitingRoom ? exitTriggerId : currentMeta.spawnTriggerId;
        onStateUpdate('switchMap', { targetMapId, triggerId });
      } else {
        onStateUpdate('switchMap', { targetMapId, triggerId: currentMeta.spawnTriggerId });
      }
    }, delayS * 1000);
  }

  return true;
}

export default { handleDoorInteraction };

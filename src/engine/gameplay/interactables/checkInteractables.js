import { resolveInteractableContext } from './context';
import { handleDoorInteraction } from './doors';
import { handleTeleportInteraction } from './teleport';
import { applyInteractableEffects } from './effects';
import { handleWeatherTrigger, handleMessageTrigger, triggerWolfSecret } from '../secrets';

export function checkInteractables(ctx, currentX, currentY, mapWidth, objectLayerData) {
  const {
    registryItems,
    TILE_SIZE,
    MAX_HEALTH,
    playShotSfx,
    onStateUpdate,
    gameState,
    mapData,
    activeRoomIds: activeRoomIdsProp,
    objectMetadata: mainObjectMetadata
  } = ctx;
  if (!objectLayerData) return;

  const keys = ctx.input?.current || {};

  const centerX = currentX + gameState.current.width / 2;
  const centerY = currentY + gameState.current.height / 2;

  const {
    activeTargetMap,
    activeObjectData,
    activeMetadata,
    activeMapWidth,
    offsetX,
    offsetY,
    currentMapId,
    projectMaps
  } = resolveInteractableContext({
    mapData,
    mapWidth,
    objectLayerData,
    mainObjectMetadata,
    activeRoomIds: activeRoomIdsProp,
    centerX,
    centerY,
    TILE_SIZE
  });

  const localX = centerX - offsetX;
  const localY = centerY - offsetY;

  const gridX = Math.floor(localX / TILE_SIZE);
  const gridY = Math.floor(localY / TILE_SIZE);
  let index = gridY * activeMapWidth + gridX;

  if (keys.e) {
    const dir = gameState.current.direction || 1;
    const frontX = localX + dir * (TILE_SIZE * 0.8);
    const frontGridX = Math.floor(frontX / TILE_SIZE);
    const frontIndex = gridY * activeMapWidth + frontGridX;

    if (frontIndex >= 0 && frontIndex < (activeObjectData?.length || 0)) {
      const frontObjId = activeObjectData[frontIndex];
      if (frontObjId) {
        const frontDef = registryItems.find(r => r.id === frontObjId);
        if (frontDef && (frontDef.type === 'wolf_secret' || frontDef.subtype === 'door' || frontDef.name?.startsWith('interactable.'))) {
          index = frontIndex;
        }
      }
    }
  }

  let foundIndex = -1;
  const directObjId = activeObjectData ? activeObjectData[index] : null;
  if (directObjId) {
    foundIndex = index;
  } else if (activeMetadata) {
    for (const [idxStr, meta] of Object.entries(activeMetadata)) {
      const idx = parseInt(idxStr, 10);
      const w = meta.width || 1;
      const h = meta.height || 1;
      if (w > 1 || h > 1) {
        const ox = idx % activeMapWidth;
        const oy = Math.floor(idx / activeMapWidth);
        if (gridX >= ox && gridX < ox + w && gridY >= oy && gridY < oy + h) {
          if (activeObjectData && activeObjectData[idx]) {
            foundIndex = idx;
            break;
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

  if (!gameState.current.usedInteractables) {
    gameState.current.usedInteractables = new Set();
  }

  if (handleWeatherTrigger({ objDef, currentMeta, index: actualIndex, gameState, onStateUpdate, playShotSfx })) return;
  if (handleMessageTrigger({ objDef, currentMeta, index: actualIndex, gameState, onStateUpdate, playShotSfx })) return;
  if (triggerWolfSecret({ objDef, index: actualIndex, keys, gameState, onStateUpdate, playShotSfx })) return;

  if (handleDoorInteraction({
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
  })) return;

  if (handleTeleportInteraction({
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
  })) return;

  if (objDef.subtype === 'end' && !gameState.current.isWinning) {
    gameState.current.isWinning = true;
    gameState.current.winCounter = 0;
    gameState.current.winCountSpeed = objDef.winCountSpeed || 10;
    return;
  }

  applyInteractableEffects({
    objDef,
    actualIndex,
    currentMapId,
    gameState,
    onStateUpdate,
    playShotSfx,
    MAX_HEALTH
  });
}

export default { checkInteractables };

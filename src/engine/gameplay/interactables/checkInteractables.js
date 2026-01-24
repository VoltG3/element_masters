import { resolveInteractableContext } from './context';
import { handleDoorInteraction } from './doors';
import { handleTeleportInteraction } from './teleport';
import { applyInteractableEffects } from './effects';
import { handleWeatherTrigger, handleMessageTrigger, triggerWolfSecret } from '../secrets';

const getDefById = (registryItems, id) => {
  if (!id) return null;
  const map = registryItems && registryItems.__byId;
  if (map && typeof map.get === 'function') return map.get(id) || null;
  return Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
};

export function checkInteractables(ctx, currentX, currentY, mapWidth, mapHeight, objectLayerData) {
  const {
    registryItems,
    TILE_SIZE,
    MAX_HEALTH,
    playShotSfx,
    onStateUpdate,
    gameState,
    mapData,
    activeRoomIds: activeRoomIdsProp,
    objectMetadata: mainObjectMetadata,
    secretMapData
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
    activeMapHeight,
    offsetX,
    offsetY,
    currentMapId,
    projectMaps
  } = resolveInteractableContext({
    mapData,
    mapWidth,
    mapHeight,
    objectLayerData,
    mainObjectMetadata,
    secretMapData,
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
    let targetIndex = null;

    if (keys.w) {
        const upIndex = (gridY - 1) * activeMapWidth + gridX;
        if (gridY - 1 >= 0) {
          const upObjId = activeObjectData?.[upIndex];
          const upDef = getDefById(registryItems, upObjId);
          if (upDef && upDef.type === 'wolf_secret') {
            targetIndex = upIndex;
          }
        }
      }

    if (targetIndex === null && keys.s) {
      const downIndex = (gridY + 1) * activeMapWidth + gridX;
      const limitHeight = activeMapHeight || mapHeight || 0;
      if (gridY + 1 < limitHeight) {
        const downObjId = activeObjectData?.[downIndex];
        const downDef = getDefById(registryItems, downObjId);
        if (downDef && downDef.type === 'wolf_secret') {
          targetIndex = downIndex;
        }
      }
    }

    if (targetIndex === null) {
      const dir = keys.d ? 1 : (keys.a ? -1 : (gameState.current.direction || 1));
      const frontX = localX + dir * (TILE_SIZE * 0.8);
      const frontGridX = Math.floor(frontX / TILE_SIZE);
      const frontIndex = gridY * activeMapWidth + frontGridX;

      if (frontIndex >= 0 && frontIndex < (activeObjectData?.length || 0)) {
        const frontObjId = activeObjectData[frontIndex];
        if (frontObjId) {
          const frontDef = getDefById(registryItems, frontObjId);
          if (frontDef && (
            frontDef.type === 'wolf_secret' ||
            frontDef.subtype === 'door' ||
            frontDef.name?.startsWith('interactable.') ||
            (frontDef.type === 'message_trigger' && (frontDef.requiresActionKey || frontDef.interaction?.requiresKey))
          )) {
            targetIndex = frontIndex;
          }
        }
      }
    }

    if (targetIndex !== null) {
      index = targetIndex;
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

  const objDef = getDefById(registryItems, objId);
  if (!objDef) return;

  if (!gameState.current.usedInteractables) {
    gameState.current.usedInteractables = new Set();
  }

  if (handleWeatherTrigger({ objDef, currentMeta, index: actualIndex, gameState, onStateUpdate, playShotSfx })) return;
  if (handleMessageTrigger({ objDef, currentMeta, index: actualIndex, gameState, onStateUpdate, playShotSfx, keys })) return;
  if (triggerWolfSecret({
    objDef,
    index: actualIndex,
    keys,
    gameState,
    onStateUpdate,
    playShotSfx,
    playerCenterX: localX,
    playerCenterY: localY,
    objCenterX: ((actualIndex % activeMapWidth) + 0.5) * TILE_SIZE,
    objCenterY: (Math.floor(actualIndex / activeMapWidth) + 0.5) * TILE_SIZE,
    playerGridX: gridX,
    playerGridY: gridY,
    objGridX: actualIndex % activeMapWidth,
    objGridY: Math.floor(actualIndex / activeMapWidth)
  })) return;

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

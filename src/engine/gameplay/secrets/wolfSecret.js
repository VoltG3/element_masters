// Wolfenstein-style secret triggers and movement handling

export function triggerWolfSecret({
  objDef,
  index,
  keys,
  gameState,
  onStateUpdate,
  playShotSfx,
  playerCenterX,
  playerCenterY,
  objCenterX,
  objCenterY,
  playerGridX,
  playerGridY,
  objGridX,
  objGridY
}) {
  if (!objDef || objDef.type !== 'wolf_secret') return false;
  if (!keys?.e) return true;

  const moveX = objDef.moveX || 0;
  const moveY = objDef.moveY || 0;
  if (moveX !== 0 || moveY !== 0) {
    const hasGrid = Number.isFinite(playerGridX) && Number.isFinite(playerGridY) && Number.isFinite(objGridX) && Number.isFinite(objGridY);
    if (hasGrid) {
      if (moveX < 0 && !(playerGridX > objGridX)) return true;
      if (moveX > 0 && !(playerGridX < objGridX)) return true;
      if (moveY < 0) {
        if (!keys?.w) return true;
        if (!(playerGridY > objGridY)) return true;
      }
      if (moveY > 0) {
        if (!keys?.s) return true;
        if (!(playerGridY < objGridY)) return true;
      }
    } else {
      const eps = 0.01;
      if (moveX < 0 && playerCenterX !== undefined && objCenterX !== undefined) {
        if (!(playerCenterX > objCenterX + eps)) return true;
      }
      if (moveX > 0 && playerCenterX !== undefined && objCenterX !== undefined) {
        if (!(playerCenterX < objCenterX - eps)) return true;
      }
      if (moveY < 0 && playerCenterY !== undefined && objCenterY !== undefined) {
        if (!keys?.w) return true;
        if (!(playerCenterY > objCenterY + eps)) return true;
      }
      if (moveY > 0 && playerCenterY !== undefined && objCenterY !== undefined) {
        if (!keys?.s) return true;
        if (!(playerCenterY < objCenterY - eps)) return true;
      }
    }
  }

  if (!gameState.current.lastETime) gameState.current.lastETime = 0;
  const now = Date.now();
  if (now - gameState.current.lastETime < 1000) return true;
  gameState.current.lastETime = now;

  if (onStateUpdate) {
    const dx = moveX;
    const dy = moveY;
    onStateUpdate('shiftTile', { index, dx, dy });

    if (objDef.sfx) {
      try { playShotSfx(objDef.sfx, objDef.sfxVolume || 0.5); } catch {}
    }
  }
  return true;
}

export function applyWolfSecretShift({
  index,
  dx,
  dy,
  mapWidth,
  mapHeight,
  getObjectId,
  getObjectDef,
  moveTile,
  moveObject,
  moveMetadata,
  removeObject,
  stepDelayMs = 250,
  setTimeoutFn = setTimeout
}) {
  let currentIdx = index;
  let remainingDx = dx;
  let remainingDy = dy;

  const moveStep = () => {
    if (remainingDx === 0 && remainingDy === 0) {
      removeObject(currentIdx);
      return;
    }

    const stepX = remainingDx > 0 ? 1 : (remainingDx < 0 ? -1 : 0);
    const stepY = remainingDy > 0 ? 1 : (remainingDy < 0 ? -1 : 0);

    const tx = (currentIdx % mapWidth) + stepX;
    const ty = Math.floor(currentIdx / mapWidth) + stepY;

    if (tx >= 0 && tx < mapWidth && ty >= 0 && ty < mapHeight) {
      const targetIndex = ty * mapWidth + tx;

      const isLastStepOfBatch = (Math.abs(remainingDx) === 1 && remainingDy === 0) ||
        (Math.abs(remainingDy) === 1 && remainingDx === 0);
      if (isLastStepOfBatch) {
        const targetObjId = getObjectId(targetIndex);
        const targetDef = getObjectDef(targetObjId);
        if (targetDef && targetDef.type === 'wolf_secret') {
          const extraX = Math.abs(targetDef.moveX || 3);
          const extraY = Math.abs(targetDef.moveY || 3);
          if (remainingDx !== 0) remainingDx += (remainingDx > 0 ? extraX : -extraX);
          if (remainingDy !== 0) remainingDy += (remainingDy > 0 ? extraY : -extraY);
        }
      }

      if (moveTile) moveTile(currentIdx, targetIndex);
      if (moveObject) moveObject(currentIdx, targetIndex);
      if (moveMetadata) moveMetadata(currentIdx, targetIndex);

      currentIdx = targetIndex;
      remainingDx -= stepX;
      remainingDy -= stepY;

      if (remainingDx !== 0 || remainingDy !== 0) {
        setTimeoutFn(moveStep, stepDelayMs);
      } else {
        removeObject(currentIdx);
      }
    } else {
      removeObject(currentIdx);
    }
  };

  moveStep();
}

export default { triggerWolfSecret, applyWolfSecretShift };

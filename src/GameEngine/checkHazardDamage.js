// Hazard damage calculation extracted from useGameEngine.js

export function checkHazardDamage({
  currentX,
  currentY,
  mapWidth,
  objectLayerData,
  deltaMs,
  registryItems,
  TILE_SIZE,
  MOVE_SPEED,
  JUMP_FORCE,
  hazardDamageAccumulatorRef,
  lastHazardIndexRef,
  triggeredHazardsRef,
  gameState
}) {
  if (!objectLayerData) {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  const width = gameState.current.width;
  const height = gameState.current.height;

  const bottomCenterX = currentX + width / 2;
  const bottomCenterY = currentY + height - 1;

  const gridX = Math.floor(bottomCenterX / TILE_SIZE);
  const gridY = Math.floor(bottomCenterY / TILE_SIZE);
  const index = gridY * mapWidth + gridX;

  if (index < 0 || index >= objectLayerData.length) {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  const objId = objectLayerData[index];
  if (!objId) {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  const objDef = registryItems.find(r => r.id === objId);
  if (!objDef || objDef.type !== 'hazard') {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  const playerLeft = currentX;
  const playerRight = currentX + width;
  const playerTop = currentY;
  const playerBottom = currentY + height;

  const tileLeft = gridX * TILE_SIZE;
  const tileRight = tileLeft + TILE_SIZE;
  const tileTop = gridY * TILE_SIZE;
  const tileBottom = tileTop + TILE_SIZE;

  const overlapsHorizontally = playerRight > tileLeft && playerLeft < tileRight;
  const overlapsVertically = playerBottom > tileTop && playerTop < tileBottom;
  if (!overlapsHorizontally || !overlapsVertically) {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  const touchingTop = playerBottom <= tileTop + 4 && playerBottom >= tileTop;
  const touchingBottom = playerTop >= tileBottom - 4 && playerTop <= tileBottom;
  const touchingLeft = playerRight <= tileRight && playerRight >= tileRight - 4;
  const touchingRight = playerLeft >= tileLeft && playerLeft <= tileLeft + 4;

  const dirs = objDef.damageDirections || {
    top: true,
    bottom: true,
    left: true,
    right: true
  };

  const dirOK =
    (touchingTop && dirs.top) ||
    (touchingBottom && dirs.bottom) ||
    (touchingLeft && dirs.left) ||
    (touchingRight && dirs.right);

  if (!dirOK) {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  lastHazardIndexRef.current = index;

  const damageOnce = !!objDef.damageOnce;
  const baseDamage = objDef.damage ?? 0;
  const dps = objDef.damagePerSecond ?? baseDamage;

  if (damageOnce) {
    if (!triggeredHazardsRef.current.has(index)) {
      triggeredHazardsRef.current.add(index);

      gameState.current.health = Math.max(0, gameState.current.health - baseDamage);

      if (touchingTop) {
        gameState.current.vy = -JUMP_FORCE * 0.4;
      } else if (touchingLeft) {
        gameState.current.vx = -MOVE_SPEED * 1.5;
      } else if (touchingRight) {
        gameState.current.vx = MOVE_SPEED * 1.5;
      }

      return;
    }
  } else {
    hazardDamageAccumulatorRef.current += deltaMs;

    if (lastHazardIndexRef.current !== index) {
      hazardDamageAccumulatorRef.current = 0;
    }

    const TICK_MS = 1000;
    while (hazardDamageAccumulatorRef.current >= TICK_MS) {
      hazardDamageAccumulatorRef.current -= TICK_MS;
      gameState.current.health = Math.max(0, gameState.current.health - dps);
    }
  }
}

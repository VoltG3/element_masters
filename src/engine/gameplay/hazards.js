// Hazard damage calculation (migrated from GameEngine/checkHazardDamage.js)

const getDefById = (registryItems, id) => {
  if (!id) return null;
  const map = registryItems && registryItems.__byId;
  if (map && typeof map.get === 'function') return map.get(id) || null;
  return Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
};

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

  // Player AABB in world pixels
  const playerLeft = currentX;
  const playerRight = currentX + width;
  const playerTop = currentY;
  const playerBottom = currentY + height;

  // Overlapped tile rectangle (inclusive)
  const minGX = Math.floor(playerLeft / TILE_SIZE);
  const maxGX = Math.floor(playerRight / TILE_SIZE);
  const minGY = Math.floor(playerTop / TILE_SIZE);
  const maxGY = Math.floor(playerBottom / TILE_SIZE);

  // Collect candidate hazards that match direction rules
  const candidates = [];

  const pushCandidate = (idx, def, touch) => {
    const dirs = def.damageDirections || { top: true, bottom: true, left: true, right: true };
    const ok = (touch.top && dirs.top) || (touch.bottom && dirs.bottom) || (touch.left && dirs.left) || (touch.right && dirs.right);
    if (!ok) return;
    candidates.push({ index: idx, def, touch });
  };

  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      const idx = gy * mapWidth + gx;
      if (idx < 0 || idx >= objectLayerData.length) continue;
      const objId = objectLayerData[idx];
      if (!objId) continue;
      const def = getDefById(registryItems, objId);
      if (!def || def.type !== 'hazard') continue;

      const tileLeft = gx * TILE_SIZE;
      const tileRight = tileLeft + TILE_SIZE;
      const tileTop = gy * TILE_SIZE;
      const tileBottom = tileTop + TILE_SIZE;

      const overlapsHorizontally = playerRight >= tileLeft && playerLeft <= tileRight;
      const overlapsVertically = playerBottom >= tileTop && playerTop <= tileBottom;
      if (!overlapsHorizontally || !overlapsVertically) continue;

      // Allow per-hazard touch margin; default 4px
      let m = Number(def.touchMargin);
      if (!Number.isFinite(m)) m = 4;
      m = Math.max(1, Math.min(8, m));

      let touchingTop = playerBottom >= tileTop && playerBottom <= tileTop + m;
      let touchingBottom = playerTop <= tileBottom && playerTop >= tileBottom - m;
      let touchingLeft = playerRight >= tileRight - m && playerRight <= tileRight;
      let touchingRight = playerLeft <= tileLeft + m && playerLeft >= tileLeft;

      // Fallback: infer side by smallest penetration when inside tile
      if (!touchingTop && !touchingBottom && !touchingLeft && !touchingRight) {
        const overlapTop = playerBottom - tileTop;
        const overlapBottom = tileBottom - playerTop;
        const overlapLeft = playerRight - tileLeft;
        const overlapRight = tileRight - playerLeft;
        const min = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);
        touchingTop = (min === overlapTop);
        touchingBottom = (!touchingTop && min === overlapBottom);
        touchingLeft = (!touchingTop && !touchingBottom && min === overlapLeft);
        touchingRight = (!touchingTop && !touchingBottom && !touchingLeft);
      }

      pushCandidate(idx, def, { top: touchingTop, bottom: touchingBottom, left: touchingLeft, right: touchingRight });
    }
  }

  if (candidates.length === 0) {
    hazardDamageAccumulatorRef.current = 0;
    lastHazardIndexRef.current = null;
    return;
  }

  // Choose deterministic candidate: prefer top > bottom > left > right
  const sideScore = (t) => (t.top ? 4 : 0) + (t.bottom ? 3 : 0) + (t.left ? 2 : 0) + (t.right ? 1 : 0);
  candidates.sort((a, b) => sideScore(b.touch) - sideScore(a.touch));
  const chosen = candidates[0];
  const index = chosen.index;
  const objDef = chosen.def;
  const touch = chosen.touch;

  // Update active hazard index
  const prevIndex = lastHazardIndexRef.current;
  lastHazardIndexRef.current = index;

  const damageOnce = !!objDef.damageOnce;
  const baseDamage = objDef.damage ?? 0;
  const dps = objDef.damagePerSecond ?? baseDamage;

  if (damageOnce) {
    if (!triggeredHazardsRef.current.has(index)) {
      triggeredHazardsRef.current.add(index);
      gameState.current.health = Math.max(0, gameState.current.health - baseDamage);
      // Hit flash to trigger temporary target animation
      const HIT_FLASH_MS = 500;
      const prev = Number(gameState.current.hitTimerMs) || 0;
      gameState.current.hitTimerMs = Math.max(prev, HIT_FLASH_MS);
      if (touch.top) {
        gameState.current.vy = -JUMP_FORCE * 0.4;
      } else if (touch.left) {
        gameState.current.vx = -MOVE_SPEED * 1.5;
      } else if (touch.right) {
        gameState.current.vx = MOVE_SPEED * 1.5;
      }
      return;
    }
  } else {
    // Continuous DPS: reset accumulator if we switched tiles
    const firstTouch = prevIndex !== index;
    if (firstTouch) {
      // Immediate damage on first contact, then start ticking
      hazardDamageAccumulatorRef.current = 0;
      const immediate = Number.isFinite(baseDamage) && baseDamage > 0 ? baseDamage : dps;
      if (immediate > 0) {
        gameState.current.health = Math.max(0, gameState.current.health - immediate);
        // Hit flash on immediate hit
        const HIT_FLASH_MS = 500;
        const prev = Number(gameState.current.hitTimerMs) || 0;
        gameState.current.hitTimerMs = Math.max(prev, HIT_FLASH_MS);
      }
      // Skip DPS accumulation this same frame to avoid double damage on long frames
      return;
    }

    hazardDamageAccumulatorRef.current += deltaMs;
    const TICK_MS = 1000;
    while (hazardDamageAccumulatorRef.current >= TICK_MS) {
      hazardDamageAccumulatorRef.current -= TICK_MS;
      gameState.current.health = Math.max(0, gameState.current.health - dps);
      // Refresh hit timer on each damage tick
      const HIT_FLASH_MS = 500;
      const prev = Number(gameState.current.hitTimerMs) || 0;
      gameState.current.hitTimerMs = Math.max(prev, HIT_FLASH_MS);
    }
  }
}

export default null;

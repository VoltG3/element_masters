// One-frame update orchestrator extracted from useGameEngine.js
import { moveHorizontal } from './moveHorizontal';
import { applyVerticalPhysics } from './applyVerticalPhysics';
import { tickLiquidDamage } from './liquids/liquidUtils';

// updateFrame(ctx, timestamp) → { continue: boolean }
// ctx expects:
// - mapData, objectData
// - input
// - refs: { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef, liquidDamageAccumulatorRef }
// - constants: { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE }
// - helpers: { checkCollision }
// - actions: {
//     collectItem(x, y, mapWidth, objectData),
//     checkHazardDamage(x, y, mapWidth, objectData, deltaMs),
//     spawnProjectile(originX, originY, direction),
//     updateProjectiles(deltaMs, mapWidth, mapHeight),
//     setPlayer(nextState),
//     onGameOver()
//   }
export function updateFrame(ctx, timestamp) {
  const {
    mapData,
    objectData,
    input,
    refs,
    constants,
    helpers,
    actions
  } = ctx;

  const { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef, liquidDamageAccumulatorRef } = refs;
  const { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE } = constants;
  const { checkCollision, isWaterAt, getLiquidSample } = helpers;
  const { collectItem, checkHazardDamage, spawnProjectile, updateProjectiles, setPlayer, onGameOver } = actions;

  // Keep RAF alive even if init not finished yet
  if (!isInitialized.current || !mapData) {
    return { continue: true };
  }

  // Delta time ms
  if (!lastTimeRef.current) {
    lastTimeRef.current = timestamp;
  }
  const deltaMs = timestamp - lastTimeRef.current;
  lastTimeRef.current = timestamp;

  // Pause while terminal is open
  try {
    if (window.__GAME_TERMINAL_OPEN__) {
      return { continue: true };
    }
  } catch {}

  const mapWidth = mapData.meta?.width || mapData.width || 20;
  const mapHeight = mapData.meta?.height || mapData.height || 15;
  const keys = input.current;

  let {
    x,
    y,
    vx,
    vy,
    width,
    height,
    isGrounded,
    direction,
    animation
  } = gameState.current;

  // 1) Horizontal movement
  const mh = moveHorizontal({
    keys,
    state: { x, y, width, direction },
    MOVE_SPEED,
    TILE_SIZE,
    mapWidth,
    mapHeight,
    checkCollision
  });
  x = mh.x; vx = mh.vx; direction = mh.direction;

  // 2) Vertical physics
  const vp = applyVerticalPhysics({
    keys,
    x,
    y,
    vy,
    isGrounded,
    animation,
    GRAVITY,
    TERMINAL_VELOCITY,
    JUMP_FORCE,
    TILE_SIZE,
    width,
    height,
    mapWidth,
    mapHeight,
    checkCollision,
    vx,
    isWaterAt: (wx, wy) => {
      try { return typeof isWaterAt === 'function' ? !!isWaterAt(wx, wy) : false; } catch { return false; }
    },
    prevInWater: !!gameState.current.inWater
  });
  y = vp.y; vy = vp.vy; isGrounded = vp.isGrounded; animation = vp.animation;
  const inWater = !!vp.inWater;
  const headUnderWater = !!vp.headUnderWater;
  const atSurface = !!vp.atSurface;

  // 2.5) Generic liquid sampling (water, lava, etc.)
  let liquidType = null;
  let liquidParams = null;
  if (typeof getLiquidSample === 'function') {
    try {
      const sample = getLiquidSample({ x, y, width, height, TILE_SIZE, mapWidth, mapHeight });
      if (sample && sample.inLiquid) {
        liquidType = sample.type || null;
        liquidParams = sample.params || null;
      }
      // Reset DPS accumulator if we just left liquids
      if (!sample || !sample.inLiquid) {
        if (liquidDamageAccumulatorRef) liquidDamageAccumulatorRef.current = 0;
      }
    } catch {}
  }

  // Extra horizontal damping when in water (simple model)
  if (inWater || liquidType) {
    // Apply simple horizontal damping in liquids
    if (liquidType === 'lava') {
      vx *= 0.78;
    } else {
      vx *= 0.82;
    }
  }

  // 2.6) Apply liquid damage-per-second if defined (e.g., lava)
  if (liquidType && liquidParams && Number(liquidParams.dps) > 0) {
    try {
      tickLiquidDamage({ accRef: liquidDamageAccumulatorRef, gameState }, deltaMs, liquidParams);
    } catch {}
  }

  // 3) Item collection
  collectItem(x, y, mapWidth, objectData);

  // 4) Hazard damage
  checkHazardDamage(x, y, mapWidth, objectData, deltaMs);

  // 5) Shooting
  shootCooldownRef.current = Math.max(0, (shootCooldownRef.current || 0) - deltaMs);
  const SHOOT_COOLDOWN_MS = 160;
  if (keys.mouseLeft && shootCooldownRef.current <= 0 && (gameState.current.ammo || 0) > 0) {
    const originX = x + (direction >= 0 ? (width) : 0);
    const originY = y + height * 0.5;
    spawnProjectile(originX, originY, direction);
    gameState.current.ammo = Math.max(0, (gameState.current.ammo || 0) - 1);
    shootCooldownRef.current = SHOOT_COOLDOWN_MS;
  }

  // 6) Update projectiles
  updateProjectiles(deltaMs, mapWidth, mapHeight);

  // 6.5) Update transient timers (hit flash, etc.)
  if (Number.isFinite(gameState.current.hitTimerMs)) {
    gameState.current.hitTimerMs = Math.max(0, (gameState.current.hitTimerMs || 0) - deltaMs);
  }

  // 7) Game over checks
  const worldH = mapHeight * TILE_SIZE;
  if (gameState.current.health <= 0) {
    gameState.current.health = 0;
    setPlayer({ ...gameState.current });
    onGameOver && onGameOver();
    isInitialized.current = false;
    return { continue: false };
  }
  if (y > worldH + 100) {
    onGameOver && onGameOver();
    isInitialized.current = false;
    return { continue: false };
  }

  // 8) Clamp horizontal world bounds
  const maxX = mapWidth * TILE_SIZE - width;
  if (x < 0) x = 0;
  if (x > maxX) x = Math.max(0, maxX);

  // 9) Sync state
  gameState.current = {
    ...gameState.current,
    x,
    y,
    vx,
    vy,
    isGrounded,
    direction,
    animation,
    inWater,
    headUnderWater,
    atSurface,
    liquidType: liquidType || null
  };
  setPlayer({ ...gameState.current, projectiles: projectilesRef.current.slice(0) });

  return { continue: true };
}

// One-frame update orchestrator extracted from useGameEngine.js
import { moveHorizontal } from './moveHorizontal';
import { applyVerticalPhysics } from './applyVerticalPhysics';

// updateFrame(ctx, timestamp) → { continue: boolean }
// ctx expects:
// - mapData, objectData
// - input
// - refs: { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef }
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

  const { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef } = refs;
  const { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE } = constants;
  const { checkCollision } = helpers;
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
    vx
  });
  y = vp.y; vy = vp.vy; isGrounded = vp.isGrounded; animation = vp.animation;

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
    animation
  };
  setPlayer({ ...gameState.current, projectiles: projectilesRef.current.slice(0) });

  return { continue: true };
}

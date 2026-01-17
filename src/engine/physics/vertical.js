// Vertical physics (gravity, jump, vertical collisions)
// Migrated from GameEngine/applyVerticalPhysics.js to make core the source of truth.

// Args:
// - keys, x, y, vy, isGrounded, animation
// - GRAVITY, TERMINAL_VELOCITY, JUMP_FORCE, TILE_SIZE
// - width, height, mapWidth, mapHeight
// - checkCollision(newX, newY, mapWidth, mapHeight)
// - isWaterAt(wx, wy): optional helper to detect liquid tiles at a world pixel
// - vx: horizontal velocity (for deciding run/idle when landing)
// - prevInWater: whether player was in water on previous frame
// Returns: { y, vy, isGrounded, animation, inWater, headUnderWater, atSurface }
export function applyVerticalPhysics({
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
  isWaterAt,
  prevInWater
}) {
  // Liquid defaults (can be overridden in future via per-tile sampling)
  const LIQ_BUOYANCY = 0.5; // reduces effective gravity by 50%
  const LIQ_DRAG_Y = 0.88;  // vertical damping per frame when in liquid
  const LIQ_TERMINAL = Math.max(2, Math.floor(TERMINAL_VELOCITY * 0.4));

  // Water detection using centerline points
  let inWater = false;
  let headUnderWater = false;
  let atSurface = false;
  if (typeof isWaterAt === 'function') {
    const cx = x + (width || TILE_SIZE) * 0.5;
    const headY = y + Math.min(4, (height || TILE_SIZE) * 0.125);
    const feetY = y + (height || TILE_SIZE) - 2;
    const chestY = y + (height || TILE_SIZE) * 0.45;
    inWater = !!(isWaterAt(cx, feetY) || isWaterAt(cx, chestY));
    headUnderWater = !!isWaterAt(cx, headY);
    atSurface = inWater && !headUnderWater;
  }

  // Jump
  if (keys?.space || keys?.w) {
    if (inWater) {
      // Swim stroke (allow even when not grounded)
      const swimImpulse = Math.max(2, Math.floor(JUMP_FORCE * 0.55));
      vy = Math.min(vy, 0); // prevent extra downward boost
      vy -= swimImpulse * 0.5; // smaller continuous impulse
      animation = 'jump';
    } else if (isGrounded) {
      vy = -JUMP_FORCE;
      isGrounded = false;
      animation = 'jump';
    }
  }

  // Gravity (reduced in liquid) + vertical drag
  if (inWater) {
    // Entrance damping to remove harsh fall shock
    if (!prevInWater) {
      vy *= 0.4;
    }
    vy += GRAVITY * (1 - LIQ_BUOYANCY);
    vy *= LIQ_DRAG_Y;
    if (vy > LIQ_TERMINAL) vy = LIQ_TERMINAL;
  } else {
    vy += GRAVITY;
    if (vy > TERMINAL_VELOCITY) vy = TERMINAL_VELOCITY;
  }

  // Check vertical collision at proposed Y
  if (checkCollision(x, y + vy, mapWidth, mapHeight, width, height)) {
    if (vy > 0) {
      // Landing on ground
      isGrounded = true;
      y = Math.floor((y + vy + height) / TILE_SIZE) * TILE_SIZE - height;
      if (Math.abs(vx || 0) > 0) {
        animation = 'run';
      } else {
        animation = 'idle';
      }
    } else if (vy < 0) {
      // Hitting ceiling
      y = Math.ceil((y + vy) / TILE_SIZE) * TILE_SIZE;
    }
    vy = 0;
  } else {
    // Free fall
    isGrounded = false;
    y += vy;
    if (vy > 0) {
      animation = 'fall';
    }
  }

  return { y, vy, isGrounded, animation, inWater, headUnderWater, atSurface };
}

export default null;

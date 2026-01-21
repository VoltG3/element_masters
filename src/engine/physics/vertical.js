// Vertical physics (gravity, jump, vertical collisions)
// Migrated from GameEngine/applyVerticalPhysics.js to make core the source of truth.

// Args:
// - keys, x, y, vy, isGrounded, animation
// - GRAVITY, TERMINAL_VELOCITY, JUMP_FORCE, TILE_SIZE
// - width, height, mapWidth, mapHeight
// - checkCollision(newX, newY, mapWidth, mapHeight)
// - isLiquidAt(wx, wy): optional helper to detect liquid type at a world pixel
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
  isLiquidAt,
  prevInWater
}) {
  // Liquid defaults
  let liqBuoyancy = 0.5; // reduces effective gravity by 50%
  let liqDragY = 0.88;  // vertical damping per frame when in liquid
  let liqTerminal = Math.max(2, Math.floor(TERMINAL_VELOCITY * 0.4));
  let swimImpulseMult = 0.55;

  // Water detection using centerline points
  let inWater = false;
  let headUnderWater = false;
  let atSurface = false;
  let activeLiquidType = null;

  if (typeof isLiquidAt === 'function') {
    const cx = x + (width || TILE_SIZE) * 0.5;
    const headY = y + Math.min(4, (height || TILE_SIZE) * 0.125);
    const feetY = y + (height || TILE_SIZE) - 2;
    const chestY = y + (height || TILE_SIZE) * 0.45;
    
    const feetLiq = isLiquidAt(cx, feetY);
    const chestLiq = isLiquidAt(cx, chestY);
    const headLiq = isLiquidAt(cx, headY);
    
    activeLiquidType = feetLiq || chestLiq;
    inWater = !!activeLiquidType;
    headUnderWater = !!headLiq;
    atSurface = inWater && !headUnderWater;

    // Apply per-liquid physics overrides
    if (activeLiquidType === 'quicksand') {
      liqBuoyancy = -0.15; // Negative buoyancy makes player sink!
      liqDragY = 0.85;     // Higher drag
      liqTerminal = 1.2;   // Very slow terminal velocity for sinking
      swimImpulseMult = 0.35; // Harder to jump/swim
    } else if (activeLiquidType === 'lava') {
      liqBuoyancy = 0.3;
      liqDragY = 0.82;
    } else if (activeLiquidType === 'waterfall') {
      liqBuoyancy = -0.5; // Acts like extra gravity
      liqDragY = 0.95;     // Very low resistance
      liqTerminal = TERMINAL_VELOCITY * 1.5; // Allow falling faster than usual terminal velocity
    } else if (activeLiquidType === 'lava_waterfall') {
      liqBuoyancy = -0.4; // Slightly more viscous than water
      liqDragY = 0.92;
      liqTerminal = TERMINAL_VELOCITY * 1.3;
    } else if (activeLiquidType === 'radioactive_waterfall') {
      liqBuoyancy = -0.2; // Slower fall than normal waterfall
      liqDragY = 0.94;
      liqTerminal = TERMINAL_VELOCITY * 0.7; // Slower speed
    } else if (activeLiquidType === 'radioactive_water') {
      liqBuoyancy = 0.45; // Slightly less buoyant than water
      liqDragY = 0.86;
    }
  }

  // Jump
  if (keys?.space || keys?.w) {
    if (inWater) {
      // Swim stroke (allow even when not grounded)
      const swimImpulse = Math.max(2, Math.floor(JUMP_FORCE * swimImpulseMult));
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
    vy += GRAVITY * (1 - liqBuoyancy);
    vy *= liqDragY;
    if (vy > liqTerminal) vy = liqTerminal;
  } else {
    vy += GRAVITY;
    if (vy > TERMINAL_VELOCITY) vy = TERMINAL_VELOCITY;
  }

  // Check vertical collision at proposed Y
  if (checkCollision(x, y + vy, mapWidth, mapHeight, width, height)) {
    if (vy > 0) {
      // Landing on ground
      isGrounded = true;
      // Snapping to the pixel above the tile
      y = Math.floor((y + vy + height - 0.01) / TILE_SIZE) * TILE_SIZE - height;
      if (Math.abs(vx || 0) > 0) {
        animation = 'run';
      } else {
        animation = 'idle';
      }
    } else if (vy < 0) {
      // Hitting ceiling
      y = Math.ceil((y + vy + 0.01) / TILE_SIZE) * TILE_SIZE;
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

  // Sanitize coordinates to prevent floating point noise jitter
  y = Math.round(y * 1000) / 1000;

  return { y, vy, isGrounded, animation, inWater, headUnderWater, atSurface };
}

export default null;

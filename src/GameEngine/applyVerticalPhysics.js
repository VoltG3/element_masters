// Vertical physics (gravity, jump, vertical collisions) extracted from useGameEngine.js

// Args:
// - keys, x, y, vy, isGrounded, animation
// - GRAVITY, TERMINAL_VELOCITY, JUMP_FORCE, TILE_SIZE
// - width, height, mapWidth, mapHeight
// - checkCollision(newX, newY, mapWidth, mapHeight)
// - vx: horizontal velocity (for deciding run/idle when landing)
// Returns: { y, vy, isGrounded, animation }
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
  vx
}) {
  // Jump
  if ((keys?.space || keys?.w) && isGrounded) {
    vy = -JUMP_FORCE;
    isGrounded = false;
    animation = 'jump';
  }

  // Gravity
  vy += GRAVITY;
  if (vy > TERMINAL_VELOCITY) vy = TERMINAL_VELOCITY;

  // Check vertical collision at proposed Y
  if (checkCollision(x, y + vy, mapWidth, mapHeight)) {
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

  return { y, vy, isGrounded, animation };
}

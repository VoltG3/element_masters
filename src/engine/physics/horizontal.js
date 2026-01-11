// Horizontal movement extracted from useGameEngine.js

// Calculates horizontal velocity/direction and resolves horizontal collision with snap.
// Args:
// - keys: input state (expects boolean a/d)
// - state: { x, width, direction }
// - MOVE_SPEED, TILE_SIZE, mapWidth, mapHeight
// - checkCollision: function(newX, newY, mapWidth, mapHeight) → boolean
// Returns: { x, vx, direction }
export function moveHorizontal({
  keys,
  state,
  MOVE_SPEED,
  TILE_SIZE,
  mapWidth,
  mapHeight,
  checkCollision,
  friction = 0.8,
  acceleration = 0.2
}) {
  let { x, vx, width, direction } = state;
  
  const targetVx = keys?.a ? -MOVE_SPEED : (keys?.d ? MOVE_SPEED : 0);
  
  if (targetVx !== 0) {
    // Accelerate
    vx += targetVx * acceleration;
    if (Math.abs(vx) > MOVE_SPEED) vx = Math.sign(vx) * MOVE_SPEED;
    direction = Math.sign(targetVx);
  } else {
    // Apply friction
    vx *= friction;
    if (Math.abs(vx) < 0.1) vx = 0;
  }

  const proposedX = x + vx;
  if (checkCollision(proposedX, state.y ?? 0, mapWidth, mapHeight)) {
    if (vx > 0) {
      // Snap to left edge of the blocking tile
      x = Math.floor((proposedX + width) / TILE_SIZE) * TILE_SIZE - width;
    } else if (vx < 0) {
      // Snap to right edge of the blocking tile
      x = Math.ceil(proposedX / TILE_SIZE) * TILE_SIZE;
    }
    vx = 0;
  } else {
    x = proposedX;
  }

  return { x, vx, direction };
}

export default null;

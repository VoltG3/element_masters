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
  checkCollision
}) {
  let { x, width, direction } = state;
  let vx = 0;

  if (keys?.a) {
    vx = -MOVE_SPEED;
    direction = -1;
  }
  if (keys?.d) {
    vx = MOVE_SPEED;
    direction = 1;
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

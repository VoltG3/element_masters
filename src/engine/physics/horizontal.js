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
  let { x, vx, width, direction, y, height } = state;
  
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
  const py = y ?? 0;
  if (checkCollision(proposedX, py, mapWidth, mapHeight, width, height)) {
    // Precīza apstāšanās pie šķēršļa (tiles vai entītijas) bez rupja snapping pie TILE_SIZE
    const step = 0.5;
    const sign = Math.sign(vx);
    let safeX = x;
    
    for (let d = step; d < Math.abs(vx); d += step) {
      const nextX = x + d * sign;
      if (!checkCollision(nextX, py, mapWidth, mapHeight, width, height)) {
        safeX = nextX;
      } else {
        break;
      }
    }
    x = safeX;
    vx = 0;
  } else {
    x = proposedX;
  }

  x = Math.round(x * 1000) / 1000;

  return { x, vx, direction };
}

export default null;

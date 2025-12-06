// Collision helpers extracted from useGameEngine.js

// Check whether a world pixel (wx, wy) is solid (collides with a tile)
// Params:
// - wx, wy: world pixel coordinates
// - mapWidthTiles, mapHeightTiles: map size in tiles
// - TILE_SIZE: tile size in pixels
// - tileData: tile layer array (ids)
// - registryItems: registry to resolve tile definitions (with `collision` flag)
export function isSolidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems) {
  // Allow movement above the map
  if (wy < 0) return false;
  const gx = Math.floor(wx / TILE_SIZE);
  const gy = Math.floor(wy / TILE_SIZE);
  // Out of world is not solid (projectile/later logic will clamp by bounds)
  if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) return false;
  const index = gy * mapWidthTiles + gx;
  const tileId = tileData[index];
  if (!tileId) return false;
  const tileDef = registryItems.find(r => r.id === tileId);
  if (!tileDef || !tileDef.collision) return false;
  if (tileDef.collision === true) return true;
  if (typeof tileDef.collision === 'object') {
    return !!(
      tileDef.collision.top ||
      tileDef.collision.bottom ||
      tileDef.collision.left ||
      tileDef.collision.right
    );
  }
  return false;
}

// AABB collision check for player rectangle at (newX, newY)
// Params:
// - newX, newY: proposed player top-left position (pixels)
// - mapWidthTiles, mapHeightTiles: map size in tiles
// - TILE_SIZE, tileData, registryItems: see above
// - width, height: player size in pixels
export function checkCollision(newX, newY, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, width, height) {
  const points = [
    { x: newX, y: newY }, // Top Left
    { x: newX + width - 0.01, y: newY }, // Top Right
    { x: newX, y: newY + height - 0.01 }, // Bottom Left
    { x: newX + width - 0.01, y: newY + height - 0.01 } // Bottom Right
  ];

  for (let p of points) {
    const gridX = Math.floor(p.x / TILE_SIZE);
    const gridY = Math.floor(p.y / TILE_SIZE);
    const index = gridY * mapWidthTiles + gridX;

    // Out-of-bounds horizontally or above map is treated as solid to prevent escaping
    if (gridX < 0 || gridX >= mapWidthTiles || gridY < 0) return true;
    // Below the map is not a collision — allows falling off the world
    if (gridY >= mapHeightTiles) continue;

    const tileId = tileData[index];
    if (tileId) {
      const tileDef = registryItems.find(r => r.id === tileId);
      if (tileDef && tileDef.collision) return true;
    }
  }
  return false;
}

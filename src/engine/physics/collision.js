// Collision helpers (migrated from GameEngine/collision.js)

// Check whether a world pixel (wx, wy) is solid (collides with a tile or an object)
// Params:
// - wx, wy: world pixel coordinates
// - mapWidthTiles, mapHeightTiles: map size in tiles
// - TILE_SIZE: tile size in pixels
// - tileData: tile layer array (ids)
// - registryItems: registry to resolve definitions
// - secretData: secret layer array (ids)
// - objectData: object layer array (ids)
// - objectMetadata: metadata for objects (e.g. health)
export function isSolidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata) {
  // Allow movement above the map
  if (wy < 0) return false;
  const gx = Math.floor(wx / TILE_SIZE);
  const gy = Math.floor(wy / TILE_SIZE);
  // Out of world is not solid
  if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) return false;
  const index = gy * mapWidthTiles + gx;

  // Check if this tile has a secret - secrets make tiles passable
  if (secretData && secretData[index]) {
    return false;
  }

  // 1. Check objects layer first (like the wooden box)
  if (objectData && objectData[index]) {
    const objId = objectData[index];
    const objDef = registryItems.find(r => r.id === objId);
    if (objDef && objDef.collision) {
      // Special logic for destructible objects like the wooden box
      if (objDef.isDestructible && objectMetadata && objectMetadata[index]) {
        const health = objectMetadata[index].health !== undefined ? objectMetadata[index].health : objDef.maxHealth;
        const threshold = objDef.passableHealthThreshold || 0;
        if (health <= threshold) {
          return false; // Box is broken, can pass through
        }
      }
      return true;
    }
  }

  // 2. Check tiles layer
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
export function checkCollision(newX, newY, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, width, height, secretData, objectData, objectMetadata) {
  const points = [
    { x: newX, y: newY }, // Top Left
    { x: newX + width - 0.01, y: newY }, // Top Right
    { x: newX, y: newY + height - 0.01 }, // Bottom Left
    { x: newX + width - 0.01, y: newY + height - 0.01 } // Bottom Right
  ];

  for (let p of points) {
    if (isSolidAtPixel(p.x, p.y, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata)) {
      // gridX < 0 || gridX >= mapWidthTiles || gridY < 0 return true logic is now inside isSolidAtPixel (partially)
      // but checkCollision had special logic for gridX < 0 || gridY < 0
      const gx = Math.floor(p.x / TILE_SIZE);
      const gy = Math.floor(p.y / TILE_SIZE);
      if (gx < 0 || gx >= mapWidthTiles || gy < 0) return true;
      
      return true;
    }
  }
  return false;
}

export default {
  isSolidAtPixel,
  checkCollision,
};

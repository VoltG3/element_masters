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
// - entities: array of active entities (optional)
// - ignoreEntityId: ID of the entity to ignore in check (optional)
export function isSolidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata, entities, ignoreEntityId) {
  // Allow movement above the map
  if (wy < 0) return false;
  const gx = Math.floor(wx / TILE_SIZE);
  const gy = Math.floor(wy / TILE_SIZE);
  // Out of world is not solid
  if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) return false;
  const index = gy * mapWidthTiles + gx;

  // 0. Check entities first (dynamic obstacles)
  if (entities) {
    for (const ent of entities) {
      if (ent.id === ignoreEntityId) continue;
      if (ent.health <= 0 || ent.isExploding) continue;
      // Platforms are stand-on-able but not usually "solid" for other entities' horizontal physics
      if (ent.subtype === 'platform') continue;

      if (wx >= ent.x && wx < ent.x + ent.width && wy >= ent.y && wy < ent.y + ent.height) {
        return true;
      }
    }
  }

  // Check if this tile has a secret - secrets make tiles passable
  if (secretData && secretData[index]) {
    return false;
  }

  // 1. Check objects layer first (like the wooden box)
  if (objectData && objectData[index]) {
    const objId = objectData[index];
    const objDef = registryItems.find(r => r.id === objId);
    
    // Ignorējam entītijas kolīziju pārbaudēs (tām ir sava fizika un tās nevajadzētu uztvert kā blokus)
    // Pārbaudām pēc vairākām pazīmēm, lai būtu droši
    const isEntity = objDef && (
      objDef.type === 'entity' || 
      objDef.subtype === 'tank' || 
      objDef.subtype === 'platform' ||
      objDef.subtype === 'pushable' ||
      objDef.isPushable ||
      (objDef.name && objDef.name.toLowerCase().includes('entities.'))
    );

    if (objDef && objDef.collision && !isEntity) {
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
export function checkCollision(newX, newY, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, width, height, secretData, objectData, objectMetadata, entities, ignoreEntityId) {
  const points = [
    { x: newX, y: newY }, // Top Left
    { x: newX + width - 0.01, y: newY }, // Top Right
    { x: newX, y: newY + height - 0.01 }, // Bottom Left
    { x: newX + width - 0.01, y: newY + height - 0.01 } // Bottom Right
  ];

  for (let p of points) {
    const gx = Math.floor(p.x / TILE_SIZE);
    const gy = Math.floor(p.y / TILE_SIZE);
    
    // Boundary checks: block left, right, and top edges of the world.
    // Allow falling off the bottom (gy >= mapHeightTiles).
    if (gx < 0 || gx >= mapWidthTiles || gy < 0) return true;

    if (isSolidAtPixel(p.x, p.y, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata, entities, ignoreEntityId)) {
      return true;
    }
  }
  return false;
}

/**
 * Gets physical properties of the surface below the player (friction, acceleration)
 */
export function getSurfaceProperties(x, y, width, height, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems) {
  const cx = x + width / 2;
  const feetY = y + height + 1; // 1 pixel below feet
  const gx = Math.floor(cx / TILE_SIZE);
  const gy = Math.floor(feetY / TILE_SIZE);
  
  if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) {
    return { friction: 0.8, acceleration: 0.2 };
  }
  
  const index = gy * mapWidthTiles + gx;
  const tileId = tileData[index];
  if (!tileId) return { friction: 0.8, acceleration: 0.2 };
  
  const tileDef = registryItems.find(r => r.id === tileId);
  if (!tileDef) return { friction: 0.8, acceleration: 0.2 };
  
  // If block has slipperiness, use it. Default friction is 0.8.
  const slipperiness = tileDef.slipperiness !== undefined ? tileDef.slipperiness : 0.8;
  
  return {
    friction: slipperiness,
    // When slippery, acceleration is lower (harder to start/change direction)
    acceleration: tileDef.slipperiness !== undefined ? (1 - slipperiness) * 2 + 0.05 : 0.2
  };
}

export default {
  isSolidAtPixel,
  checkCollision,
  getSurfaceProperties
};

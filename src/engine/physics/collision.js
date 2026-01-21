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
// - maps: all project maps (optional, for room overlays)
// - activeRoomIds: IDs of currently active/open rooms (optional)
// - isRoom: boolean, whether we are checking collision for a room sub-map
export function isSolidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata, entities, ignoreEntityId, maps, activeRoomIds, isRoom = false) {
  try {
    const gx = Math.floor(wx / TILE_SIZE);
    const gy = Math.floor(wy / TILE_SIZE);

    // Boundary check
    if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) {
        // Rooms have strict boundaries. Main map allows falling off the bottom.
        // checkCollision handles top/left/right boundaries for main map.
        return isRoom; 
    }

    // Allow movement above the map (already handled by gx,gy check usually, but just in case)
    if (wy < 0) return false;

    // 0. Check for active rooms (sub-maps) - Priority check
    if (!isRoom && maps && activeRoomIds && activeRoomIds.length > 0 && objectMetadata && secretData) {
      let insideAnyRoom = false;
      
      for (const [idxStr, meta] of Object.entries(objectMetadata)) {
        const idx = parseInt(idxStr);
        if (secretData[idx] === 'room_area' && meta.linkedMapId && activeRoomIds.includes(meta.linkedMapId)) {
          const roomMap = maps[meta.linkedMapId];
          if (!roomMap) continue;

          const rx = (idx % mapWidthTiles) * TILE_SIZE;
          const ry = Math.floor(idx / mapWidthTiles) * TILE_SIZE;
          const rw = (meta.width || 1) * TILE_SIZE;
          const rh = (meta.height || 1) * TILE_SIZE;

          // Added 0.1px tolerance to borders to prevent slipping through edges
          if (wx >= rx - 0.1 && wx < rx + rw + 0.1 && wy >= ry - 0.1 && wy < ry + rh + 0.1) {
            insideAnyRoom = true;
            
            const localWx = wx - rx;
            const localWy = wy - ry;
            
            const roomTileW = roomMap.mapWidth || roomMap.width;
            const roomTileH = roomMap.mapHeight || roomMap.height;
            
            const roomTiles = roomMap.tileMapData || roomMap.layers?.find(l => l.name === 'background' || l.type === 'tile')?.data;
            const roomObjects = roomMap.objectMapData || roomMap.layers?.find(l => l.name === 'entities' || l.type === 'object')?.data;
            const roomSecrets = roomMap.secretMapData || roomMap.layers?.find(l => l.name === 'secrets' || l.type === 'secret')?.data;

            const solidInRoom = isSolidAtPixel(
              localWx, localWy, 
              roomTileW, roomTileH, TILE_SIZE, 
              roomTiles, 
              registryItems, 
              roomSecrets, 
              roomObjects, 
              roomMap.objectMetadata, 
              null, 
              ignoreEntityId,
              null,
              null,
              true // WE ARE IN A ROOM
            );

            if (solidInRoom) return true;
            
            // If the room map has NO content at this spot, it's a window/open area.
            // The recursive call with isRoom=true already blocked the boundaries of the room map.
            return false;
          }
        }
      }
      
      if (!insideAnyRoom) {
        // Izņēmums: ļaujam atrasties uz durvīm, kas ir atvērtas, pat ja tās ir ārpus room_area.
        // Tas ir nepieciešams, lai spēlētājs neiestrēgtu teleportācijas brīdī, izejot no istabas.
        const index = gy * mapWidthTiles + gx;
        const objId = objectData && objectData[index];
        if (objId) {
          const objDef = registryItems.find(r => r.id === objId);
          if (objDef && objDef.subtype === 'door') {
            const meta = (objectMetadata && objectMetadata[index]) || {};
            let frame = meta.currentFrame;
            if (frame === undefined) frame = 0;
            
            const closedFrame = objDef.interaction?.frames?.closed ?? 0;
            if (frame !== closedFrame) {
              return false; // Durvis ir atvērtas, ļaujam te atrasties
            }
          }
        }
        return true; 
      }
    }

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
      
      const isEntity = objDef && (
        objDef.type === 'entity' || 
        objDef.subtype === 'tank' || 
        objDef.subtype === 'platform' ||
        objDef.subtype === 'pushable' ||
        objDef.isPushable ||
        (objDef.name && objDef.name.toLowerCase().includes('entities.'))
      );

      if (objDef && objDef.collision && !isEntity) {
        // Durvju speciālā loģika: atvērtas/lietotas durvis nav cietas
        if (objDef.subtype === 'door') {
          const meta = (objectMetadata && objectMetadata[index]) || {};
          let frame = meta.currentFrame;
          
          if (frame === undefined) {
              // Default frame for rooms is 'inside' (open)
              if (isRoom) {
                  frame = objDef.interaction?.frames?.inside ?? 0;
              } else {
                  frame = 0; // Default for main map is closed
              }
          }

          const closedFrame = objDef.interaction?.frames?.closed ?? 0;
          
          // Ja durvis nav aizvērtas (ir atvēršanās fāzē vai atvērtas), tās nav cietas
          if (frame !== closedFrame) {
            return false;
          }
        }

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
  } catch (error) {
    console.error('Error in isSolidAtPixel:', error);
    return false;
  }
}

// AABB collision check for player rectangle at (newX, newY)
export function checkCollision(newX, newY, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, width, height, secretData, objectData, objectMetadata, entities, ignoreEntityId, maps, activeRoomIds) {
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

    if (isSolidAtPixel(p.x, p.y, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata, entities, ignoreEntityId, maps, activeRoomIds)) {
      return true;
    }
  }
  return false;
}

/**
 * Gets physical properties of the surface below the player (friction, acceleration)
 */
export function getSurfaceProperties(x, y, width, height, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems, secretData, objectMetadata, maps, activeRoomIds) {
  const cx = x + width / 2;
  const feetY = y + height + 1; // 1 pixel below feet

  // Check for active rooms (sub-maps) - Priority check
  if (maps && activeRoomIds && activeRoomIds.length > 0 && objectMetadata && secretData) {
    for (const [idxStr, meta] of Object.entries(objectMetadata)) {
      const idx = parseInt(idxStr);
      if (secretData[idx] === 'room_area' && meta.linkedMapId && activeRoomIds.includes(meta.linkedMapId)) {
        const roomMap = maps[meta.linkedMapId];
        if (!roomMap) continue;

        const rx = (idx % mapWidthTiles) * TILE_SIZE;
        const ry = Math.floor(idx / mapWidthTiles) * TILE_SIZE;
        const rw = (meta.width || 1) * TILE_SIZE;
        const rh = (meta.height || 1) * TILE_SIZE;

        if (cx >= rx && cx < rx + rw && feetY >= ry && feetY < ry + rh) {
          // Point is inside an active room!
          const localCx = cx - rx;
          const localFeetY = feetY - ry;
          
          const roomTileW = roomMap.mapWidth || roomMap.width;
          const roomTileH = roomMap.mapHeight || roomMap.height;
          
          return getSurfaceProperties(
            localCx - width/2, localFeetY - height - 1, width, height,
            roomTileW, roomTileH, TILE_SIZE,
            roomMap.tileMapData || (roomMap.layers?.find(l => l.name === 'background')?.data),
            registryItems,
            roomMap.secretMapData,
            roomMap.objectMetadata,
            null,
            null
          );
        }
      }
    }
  }

  const gx = Math.floor(cx / TILE_SIZE);
  const gy = Math.floor(feetY / TILE_SIZE);
  
  if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) {
    return { friction: 0.8, acceleration: 0.2 };
  }
  
  const index = gy * mapWidthTiles + gx;
  const tileId = tileData ? tileData[index] : null;
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

import { isSolidAtPixel } from '../physics/collision';

const isInsideActiveRoom = ({
  x,
  y,
  mapWidth,
  mapHeight,
  TILE_SIZE,
  secretData,
  objectMetadata,
  activeRoomIds
}) => {
  if (!activeRoomIds || !activeRoomIds.length) return false;
  if (!secretData || !objectMetadata) return false;
  const gx = Math.floor(x / TILE_SIZE);
  const gy = Math.floor(y / TILE_SIZE);
  if (gx < 0 || gy < 0 || gx >= mapWidth || gy >= mapHeight) return false;
  for (const [idxStr, meta] of Object.entries(objectMetadata)) {
    const idx = parseInt(idxStr, 10);
    if (secretData[idx] !== 'room_area') continue;
    if (!meta?.linkedMapId || !activeRoomIds.includes(meta.linkedMapId)) continue;
    const rx = idx % mapWidth;
    const ry = Math.floor(idx / mapWidth);
    const rw = meta.width || 1;
    const rh = meta.height || 1;
    if (gx >= rx && gx < rx + rw && gy >= ry && gy < ry + rh) return true;
  }
  return false;
};

export const isCoveredFromAbove = ({
  x,
  y,
  mapWidth,
  mapHeight,
  TILE_SIZE,
  tileData,
  registryItems,
  secretData,
  objectData,
  objectMetadata,
  maps,
  activeRoomIds
}) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (isInsideActiveRoom({ x, y, mapWidth, mapHeight, TILE_SIZE, secretData, objectMetadata, activeRoomIds })) {
    return true;
  }
  const gridX = Math.floor(x / TILE_SIZE);
  if (gridX < 0 || gridX >= mapWidth) return false;
  let gridY = Math.floor(y / TILE_SIZE) - 1;
  for (; gridY >= 0; gridY--) {
    const wx = gridX * TILE_SIZE + TILE_SIZE / 2;
    const wy = gridY * TILE_SIZE + TILE_SIZE / 2;
    if (isSolidAtPixel(wx, wy, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata, null, null, maps, activeRoomIds)) {
      return true;
    }
  }
  return false;
};

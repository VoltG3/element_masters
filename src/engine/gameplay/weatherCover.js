import { isSolidAtPixel } from '../physics/collision';

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

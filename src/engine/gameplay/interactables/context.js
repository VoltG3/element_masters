export function resolveInteractableContext({
  mapData,
  mapWidth,
  mapHeight,
  objectLayerData,
  mainObjectMetadata,
  secretMapData,
  activeRoomIds: activeRoomIdsProp,
  centerX,
  centerY,
  TILE_SIZE
}) {
  const hasMainMetadata = mainObjectMetadata && Object.keys(mainObjectMetadata).length > 0;
  let activeTargetMap = mapData;
  let activeObjectData = objectLayerData;
  let activeMetadata = hasMainMetadata
    ? mainObjectMetadata
    : (mapData?.objectMetadata || mapData?.meta?.objectMetadata || {});
  let activeMapWidth = mapWidth;
  let activeMapHeight = mapHeight;
  let offsetX = 0;
  let offsetY = 0;
  let currentMapId = mapData?.id || 'main';

  const projectMaps = mapData?.maps || mapData?.projectMaps || {};
  const activeRoomIds = activeRoomIdsProp || mapData?.meta?.activeRoomIds || [];

  if (activeRoomIds.length > 0) {
    const mainMetadata = hasMainMetadata
      ? mainObjectMetadata
      : (mapData?.objectMetadata || mapData?.meta?.objectMetadata || {});
    for (const [idxStr, meta] of Object.entries(mainMetadata)) {
      const idx = parseInt(idxStr, 10);
      if (secretMapData && secretMapData[idx] !== 'room_area') continue;
      if (meta.linkedMapId && activeRoomIds.includes(meta.linkedMapId)) {
        const roomMap = projectMaps[meta.linkedMapId];
        if (!roomMap) continue;

        const rx = (idx % mapWidth) * TILE_SIZE;
        const ry = Math.floor(idx / mapWidth) * TILE_SIZE;
        const rw = (meta.width || 1) * TILE_SIZE;
        const rh = (meta.height || 1) * TILE_SIZE;

        if (centerX >= rx && centerX < rx + rw && centerY >= ry && centerY < ry + rh) {
          activeTargetMap = roomMap;
          activeMapWidth = roomMap.mapWidth || roomMap.width || 20;
          activeMapHeight = roomMap.mapHeight || roomMap.height || 15;
          activeObjectData = roomMap.objectMapData || roomMap.layers?.find(l => l.name === 'entities')?.data;
          activeMetadata = roomMap.objectMetadata || {};
          offsetX = rx;
          offsetY = ry;
          currentMapId = meta.linkedMapId;
          break;
        }
      }
    }
  }

  return {
    activeTargetMap,
    activeObjectData,
    activeMetadata,
    activeMapWidth,
    activeMapHeight,
    offsetX,
    offsetY,
    currentMapId,
    projectMaps,
    activeRoomIds
  };
}

export default { resolveInteractableContext };

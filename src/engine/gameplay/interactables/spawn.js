/**
 * Finds spawn position in a map by trigger ID or player start
 */
export function findSpawnPosition(map, triggerId, tileSize) {
  if (!map) return null;

  const mapW = map.width || map.mapWidth || map.meta?.width || 20;
  const metadata = map.objectMetadata || map.meta?.objectMetadata || {};

  const objLayer = map.layers?.find(l => l.name === 'entities' || l.type === 'object');
  const objData = map.objectMapData || objLayer?.data;

  if (!objData) return null;

  let spawnIdx = -1;

  const triggerRequested = triggerId !== undefined && triggerId !== null && triggerId !== '';
  if (triggerRequested) {
    for (let i = 0; i < objData.length; i++) {
      if (!objData[i]) continue;
      if (metadata[i] && metadata[i].triggerId === triggerId) {
        spawnIdx = i;
        break;
      }
    }
  }

  if (spawnIdx === -1 && !triggerRequested) {
    spawnIdx = objData.findIndex(id => id && id.includes('player'));
  }

  if (spawnIdx !== -1) {
    return {
      x: (spawnIdx % mapW) * tileSize,
      y: Math.floor(spawnIdx / mapW) * tileSize
    };
  }

  return null;
}

export default { findSpawnPosition };

/**
 * Secrets Detection and Reveal Logic
 * Handles AboveSecret zone detection and revealing when player enters
 */

/**
 * Flood fill to find all connected secret tiles of the same type
 * @param {number} startIndex - Starting tile index
 * @param {Array} secretMapData - Secret layer data
 * @param {number} mapWidth - Map width in tiles
 * @param {number} mapHeight - Map height in tiles
 * @param {Array} registryItems - Registry items to lookup secret definitions
 * @returns {Array} - Array of connected tile indices
 */
export function floodFillSecretZone(startIndex, secretMapData, mapWidth, mapHeight, registryItems) {
  const startSecretId = secretMapData[startIndex];
  if (!startSecretId) return [];

  const startDef = registryItems.find(r => r.id === startSecretId);
  if (!startDef || startDef.type !== 'secret') return [];

  const visited = new Set();
  const result = [];
  const queue = [startIndex];

  while (queue.length > 0) {
    const idx = queue.shift();
    if (visited.has(idx)) continue;
    if (idx < 0 || idx >= secretMapData.length) continue;

    visited.add(idx);

    const secretId = secretMapData[idx];
    if (!secretId || secretId !== startSecretId) continue;

    result.push(idx);

    // Check 4 neighbors (up, down, left, right)
    const x = idx % mapWidth;
    const y = Math.floor(idx / mapWidth);

    // Up
    if (y > 0) queue.push((y - 1) * mapWidth + x);
    // Down
    if (y < mapHeight - 1) queue.push((y + 1) * mapWidth + x);
    // Left
    if (x > 0) queue.push(y * mapWidth + (x - 1));
    // Right
    if (x < mapWidth - 1) queue.push(y * mapWidth + (x + 1));
  }

  return result;
}

/**
 * Check if player is touching any AboveSecret tiles
 * @param {Object} params - Detection parameters
 * @returns {Array|null} - Array of tile indices to reveal, or null if no detection
 */
export function checkSecretDetection({
  currentX,
  currentY,
  width,
  height,
  secretMapData,
  revealedSecrets,
  mapWidth,
  mapHeight,
  registryItems,
  TILE_SIZE
}) {
  if (!secretMapData || secretMapData.length === 0) return null;

  // Player AABB in world pixels
  const playerLeft = currentX;
  const playerRight = currentX + width;
  const playerTop = currentY;
  const playerBottom = currentY + height;

  // Overlapped tile rectangle
  const minGX = Math.floor(playerLeft / TILE_SIZE);
  const maxGX = Math.floor((playerRight - 1) / TILE_SIZE);
  const minGY = Math.floor(playerTop / TILE_SIZE);
  const maxGY = Math.floor((playerBottom - 1) / TILE_SIZE);

  // Check all overlapping tiles for AboveSecret
  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      if (gx < 0 || gx >= mapWidth || gy < 0 || gy >= mapHeight) continue;

      const idx = gy * mapWidth + gx;
      const secretId = secretMapData[idx];
      if (!secretId) continue;

      // Already revealed?
      if (revealedSecrets && revealedSecrets.includes(idx)) continue;

      const def = registryItems.find(r => r.id === secretId);
      if (!def || def.type !== 'secret') continue;

      // Only AboveSecret can be revealed
      if (def.subtype !== 'above' || !def.revealOnEnter) continue;

      // Found an unrevealed AboveSecret that player is touching!
      // Flood fill to find all connected tiles
      const connectedIndices = floodFillSecretZone(idx, secretMapData, mapWidth, mapHeight, registryItems);
      return connectedIndices;
    }
  }

  return null;
}

export default { checkSecretDetection, floodFillSecretZone };

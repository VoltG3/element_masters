export const getFloodFillIndices = (startIndex, currentData, mapWidth, mapHeight) => {
    const startId = currentData[startIndex];
    const width = mapWidth;
    const height = mapHeight;
    const stack = [startIndex];
    const visited = new Set();
    const matchingIndices = new Set();

    while (stack.length > 0) {
        const idx = stack.pop();
        if (visited.has(idx)) continue;
        visited.add(idx);
        if (idx < 0 || idx >= currentData.length) continue;
        if (currentData[idx] !== startId) continue;
        matchingIndices.add(idx);

        const x = idx % width;
        const y = Math.floor(idx / width);
        if (x > 0) stack.push(idx - 1);
        if (x < width - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - width);
        if (y < height - 1) stack.push(idx + width);
    }
    return matchingIndices;
};

export const floodFill = (startIndex, targetId, currentData, mapWidth, mapHeight) => {
    const startId = currentData[startIndex];
    if (startId === targetId) return currentData;

    const indices = getFloodFillIndices(startIndex, currentData, mapWidth, mapHeight);
    const newData = [...currentData];
    indices.forEach(idx => newData[idx] = targetId);
    return newData;
};

export const paintTile = ({
    index, brushSize, activeLayer, selectedTile,
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData,
    setTileMapData, setObjectMapData, setSecretMapData
}) => {
    const targetData = activeLayer === 'tile' ? tileMapData : (activeLayer === 'object' ? objectMapData : secretMapData);
    const setTargetData = activeLayer === 'tile' ? setTileMapData : (activeLayer === 'object' ? setObjectMapData : setSecretMapData);
    
    const newData = [...targetData];
    const x = index % mapWidth;
    const y = Math.floor(index / mapWidth);

    for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
            const targetX = x + dx;
            const targetY = y + dy;
            if (targetX < mapWidth && targetY < mapHeight) {
                const targetIndex = targetY * mapWidth + targetX;
                newData[targetIndex] = selectedTile ? selectedTile.id : null;
            }
        }
    }
    setTargetData(newData);
};

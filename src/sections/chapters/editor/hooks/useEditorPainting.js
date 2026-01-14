import { useState, useRef, useEffect, useCallback } from 'react';
import { getFloodFillIndices, floodFill, paintTile as paintTileUtil } from '../tools/paintingTools';

export const useEditorPainting = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, 
    setTileMapData, setObjectMapData, setSecretMapData,
    activeTool, brushSize, activeLayer, selectedTile, selection, 
    setSelection, setPreviewPosition, setOriginalMapData, setDragStart, setIsDragging
) => {
    const [hoverIndex, setHoverIndex] = useState(null);
    const [bucketPreviewIndices, setBucketPreviewIndices] = useState(new Set());
    const bucketTimerRef = useRef(null);

    const paintTile = useCallback((index) => {
        paintTileUtil({
            index,
            activeTool,
            brushSize,
            activeLayer,
            selectedTile,
            mapWidth,
            mapHeight,
            tileMapData,
            objectMapData,
            secretMapData,
            setTileMapData,
            setObjectMapData,
            setSecretMapData
        });
    }, [activeTool, brushSize, activeLayer, selectedTile, mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, setTileMapData, setObjectMapData, setSecretMapData]);

    const handleGridMouseDown = (index, e) => {
        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index);
        } else if (activeTool === 'bucket') {
            const targetData = activeLayer === 'tile' ? tileMapData : (activeLayer === 'object' ? objectMapData : secretMapData);
            const targetValue = targetData[index];
            const newValue = selectedTile ? selectedTile.id : null;
            if (targetValue === newValue) return;

            const indices = getFloodFillIndices(index, targetValue, targetData, mapWidth, mapHeight);
            const newData = floodFill(targetValue, newValue, targetData, mapWidth, mapHeight, index);
            
            if (activeLayer === 'tile') setTileMapData(newData);
            else if (activeLayer === 'object') setObjectMapData(newData);
            else setSecretMapData(newData);
        } else if (activeTool === 'move') {
            if (selection) return;

            const x = index % mapWidth;
            const y = Math.floor(index / mapWidth);
            setDragStart({ x, y });
            setIsDragging(true);
        }
    };

    const handleGridMouseMove = (index) => {
        setHoverIndex(index);
        if (activeTool === 'bucket') {
            if (bucketTimerRef.current) clearTimeout(bucketTimerRef.current);
            bucketTimerRef.current = setTimeout(() => {
                const targetData = activeLayer === 'tile' ? tileMapData : (activeLayer === 'object' ? objectMapData : secretMapData);
                const targetValue = targetData[index];
                const indices = getFloodFillIndices(index, targetValue, targetData, mapWidth, mapHeight);
                setBucketPreviewIndices(indices);
            }, 10);
        }
    };

    return {
        hoverIndex,
        setHoverIndex,
        bucketPreviewIndices,
        setBucketPreviewIndices,
        handleGridMouseDown,
        handleGridMouseMove,
        paintTile
    };
};

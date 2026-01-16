import { useState, useRef, useEffect, useCallback } from 'react';
import { getFloodFillIndices, floodFill, paintTile as paintTileUtil } from '../editorTools/paintingTools';

export const useEditorPainting = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, 
    setTileMapData, setObjectMapData, setSecretMapData,
    activeTool, brushSize, activeLayer, selectedTile, selection, 
    setSelection, setPreviewPosition, setOriginalMapData, setDragStart, isDragging, setIsDragging,
    setActivePanel, setHighlightedIndex, registryItems
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
        // Quick select for configurable objects
        const existingObjId = objectMapData[index];
        if (existingObjId && setActivePanel && setHighlightedIndex) {
            const def = registryItems?.find(r => r.id === existingObjId);
            const isConfigurable = existingObjId.includes('portal') || 
                                 existingObjId.includes('target') || 
                                 existingObjId === 'portal_target' || 
                                 (def && def.type === 'weather_trigger');
            
            if (isConfigurable) {
                setActivePanel('props');
                setHighlightedIndex(index);
            }
        }

        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index);
        } else if (activeTool === 'bucket') {
            const targetData = activeLayer === 'tile' ? tileMapData : (activeLayer === 'object' ? objectMapData : secretMapData);
            const targetValue = targetData[index];
            const newValue = selectedTile ? selectedTile.id : null;
            if (targetValue === newValue) return;

            const newData = floodFill(index, newValue, targetData, mapWidth, mapHeight);
            
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
        if (activeTool === 'brush' && isDragging) {
            paintTile(index);
        } else if (activeTool === 'bucket') {
            if (bucketTimerRef.current) clearTimeout(bucketTimerRef.current);
            bucketTimerRef.current = setTimeout(() => {
                const targetData = activeLayer === 'tile' ? tileMapData : (activeLayer === 'object' ? objectMapData : secretMapData);
                const indices = getFloodFillIndices(index, targetData, mapWidth, mapHeight);
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

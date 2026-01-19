import { useState, useRef, useEffect, useCallback } from 'react';
import { getFloodFillIndices, floodFill, paintTile as paintTileUtil } from '../editorTools/paintingTools';

export const useEditorPainting = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, 
    setTileMapData, setObjectMapData, setSecretMapData,
    activeTool, brushSize, activeLayer, selectedTile, selection, 
    setSelection, setPreviewPosition, setOriginalMapData, dragStart, setDragStart, isDragging, setIsDragging,
    setActivePanel, setHighlightedIndex, highlightedIndex, registryItems,
    objectMetadata, setObjectMetadata
) => {
    const [hoverIndex, setHoverIndex] = useState(null);
    const [bucketPreviewIndices, setBucketPreviewIndices] = useState(new Set());
    const [resizeState, setResizeState] = useState(null); // { index, edge, startX, startY, startW, startH }
    const [moveState, setMoveState] = useState(null); // { index, startX, startY, objId, secretId, meta }
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
            objectMetadata,
            setTileMapData,
            setObjectMapData,
            setSecretMapData,
            setObjectMetadata
        });
    }, [activeTool, brushSize, activeLayer, selectedTile, mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata]);

    const handleResizeStart = useCallback((index, edge) => {
        const meta = objectMetadata[index] || {};
        const x = index % mapWidth;
        const y = Math.floor(index / mapWidth);
        setResizeState({
            index,
            edge,
            startX: x,
            startY: y,
            startW: meta.width || 1,
            startH: meta.height || 1
        });
        setIsDragging(true);
    }, [objectMetadata, mapWidth, setIsDragging]);

    const handleMoveStart = useCallback((index) => {
        const x = index % mapWidth;
        const y = Math.floor(index / mapWidth);
        setMoveState({
            index,
            startX: x,
            startY: y,
            objId: objectMapData[index],
            secretId: secretMapData[index],
            meta: objectMetadata[index] ? { ...objectMetadata[index] } : null
        });
        setIsDragging(true);
        setHighlightedIndex(index);
    }, [objectMapData, secretMapData, objectMetadata, mapWidth, setIsDragging, setHighlightedIndex]);

    const handleGridMouseDown = useCallback((index, e) => {
        // Quick select for configurable objects
        const existingObjId = objectMapData[index];
        const existingSecretId = secretMapData[index];
        if ((existingObjId || existingSecretId) && setActivePanel && setHighlightedIndex) {
            const def = registryItems?.find(r => r.id === (existingObjId || existingSecretId));
            const isConfigurable = (existingObjId && (existingObjId.includes('portal') || 
                                 existingObjId.includes('target') || 
                                 existingObjId === 'portal_target' || 
                                 (def && def.type === 'weather_trigger') ||
                                 (def && def.type === 'message_trigger'))) || existingSecretId;
            
            if (isConfigurable) {
                setActivePanel('props');
                setHighlightedIndex(index);
            }
        }

        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index);
        } else if (activeTool === 'bucket') {
            const isPropsLayer = activeLayer === 'props';
            const targetLayer = isPropsLayer ? 'object' : activeLayer;
            const targetData = targetLayer === 'tile' ? tileMapData : (targetLayer === 'object' ? objectMapData : secretMapData);
            const targetValue = targetData[index];
            const newValue = selectedTile ? selectedTile.id : null;
            if (targetValue === newValue) return;

            const newData = floodFill(index, newValue, targetData, mapWidth, mapHeight);
            
            if (targetLayer === 'tile') setTileMapData(newData);
            else if (targetLayer === 'object') {
                setObjectMapData(newData);
                // Clean up metadata for all affected indices if erasing
                if (newValue === null && objectMetadata && setObjectMetadata) {
                    const affectedIndices = getFloodFillIndices(index, targetData, mapWidth, mapHeight);
                    let metaChanged = false;
                    const newMeta = { ...objectMetadata };
                    affectedIndices.forEach(idx => {
                        if (newMeta[idx]) {
                            delete newMeta[idx];
                            metaChanged = true;
                        }
                    });
                    if (metaChanged) setObjectMetadata(newMeta);
                }
            }
            else setSecretMapData(newData);
        } else if (activeTool === 'move') {
            if (selection) return;

            // If we clicked on an object/secret, start moving it
            if (existingObjId || existingSecretId) {
                handleMoveStart(index);
            } else {
                const x = index % mapWidth;
                const y = Math.floor(index / mapWidth);
                setDragStart({ x, y });
                setIsDragging(true);
            }
        }
    }, [objectMapData, secretMapData, setActivePanel, setHighlightedIndex, registryItems, activeTool, setIsDragging, paintTile, activeLayer, tileMapData, selectedTile, mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData, objectMetadata, setObjectMetadata, selection, handleMoveStart, setDragStart]);

    const handleGridMouseMove = useCallback((index) => {
        setHoverIndex(index);
        const curX = index % mapWidth;
        const curY = Math.floor(index / mapWidth);

        if (resizeState) {
            const dx = curX - resizeState.startX;
            const dy = curY - resizeState.startY;
            let newW = resizeState.startW;
            let newH = resizeState.startH;
            let newIndex = resizeState.index;

            if (resizeState.edge === 'right') newW = Math.max(1, resizeState.startW + dx);
            if (resizeState.edge === 'bottom') newH = Math.max(1, resizeState.startH + dy);
            
            if (resizeState.edge === 'left') {
                const shift = Math.min(resizeState.startW - 1, dx);
                newW = resizeState.startW - shift;
                newIndex = resizeState.startY * mapWidth + (resizeState.startX + shift);
            }
            if (resizeState.edge === 'top') {
                const shift = Math.min(resizeState.startH - 1, dy);
                newH = resizeState.startH - shift;
                newIndex = (resizeState.startY + shift) * mapWidth + resizeState.startX;
            }

            if (newW !== (objectMetadata[resizeState.index]?.width || 1) || 
                newH !== (objectMetadata[resizeState.index]?.height || 1) ||
                newIndex !== resizeState.index) {
                
                const meta = { ...objectMetadata[resizeState.index] };
                meta.width = newW;
                meta.height = newH;
                
                setObjectMetadata(prev => {
                    const next = { ...prev };
                    delete next[resizeState.index];
                    next[newIndex] = meta;
                    return next;
                });

                if (newIndex !== resizeState.index) {
                    const objId = objectMapData[resizeState.index];
                    const secretId = secretMapData[resizeState.index];
                    setObjectMapData(prev => {
                        const next = [...prev];
                        next[resizeState.index] = null;
                        next[newIndex] = objId;
                        return next;
                    });
                    setSecretMapData(prev => {
                        const next = [...prev];
                        next[resizeState.index] = null;
                        next[newIndex] = secretId;
                        return next;
                    });
                    setResizeState(prev => ({ ...prev, index: newIndex, startX: newIndex % mapWidth, startY: Math.floor(newIndex / mapWidth), startW: newW, startH: newH }));
                    setHighlightedIndex(newIndex);
                }
            }
        } else if (moveState) {
            if (index === moveState.index) return;
            
            // Perform move
            setObjectMapData(prev => {
                const next = [...prev];
                next[moveState.index] = null;
                next[index] = moveState.objId;
                return next;
            });
            setSecretMapData(prev => {
                const next = [...prev];
                next[moveState.index] = null;
                next[index] = moveState.secretId;
                return next;
            });
            setObjectMetadata(prev => {
                const next = { ...prev };
                delete next[moveState.index];
                if (moveState.meta) next[index] = moveState.meta;
                return next;
            });
            setMoveState(prev => ({ ...prev, index, startX: curX, startY: curY }));
            setHighlightedIndex(index);

        } else if (activeTool === 'brush' && isDragging) {
            paintTile(index);
        } else if (activeTool === 'bucket') {
            if (bucketTimerRef.current) clearTimeout(bucketTimerRef.current);
            bucketTimerRef.current = setTimeout(() => {
                const targetLayer = activeLayer === 'props' ? 'object' : activeLayer;
                const targetData = targetLayer === 'tile' ? tileMapData : (targetLayer === 'object' ? objectMapData : secretMapData);
                const indices = getFloodFillIndices(index, targetData, mapWidth, mapHeight);
                setBucketPreviewIndices(indices);
            }, 10);
        }
    }, [setHoverIndex, activeTool, isDragging, paintTile, activeLayer, tileMapData, objectMapData, secretMapData, mapWidth, mapHeight, setBucketPreviewIndices, resizeState, moveState, objectMetadata, setObjectMetadata, setObjectMapData, setSecretMapData, setHighlightedIndex]);

    const handleGridMouseUp = useCallback((index) => {
        if (activeTool === 'move' && isDragging && !resizeState && !moveState && dragStart && index !== null) {
            const hx = index % mapWidth;
            const hy = Math.floor(index / mapWidth);
            const x1 = Math.min(dragStart.x, hx);
            const y1 = Math.min(dragStart.y, hy);
            const x2 = Math.max(dragStart.x, hx);
            const y2 = Math.max(dragStart.y, hy);
            const w = x2 - x1 + 1;
            const h = y2 - y1 + 1;

            const tileData = [];
            const objectData = [];
            const secretData = [];
            const selectionMetadata = {};

            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    const idx = y * mapWidth + x;
                    tileData.push(tileMapData[idx]);
                    objectData.push(objectMapData[idx]);
                    secretData.push(secretMapData[idx]);
                    if (objectMetadata[idx]) {
                        selectionMetadata[`${x - x1},${y - y1}`] = { ...objectMetadata[idx] };
                    }
                }
            }

            setSelection({
                x: x1, y: y1, w, h,
                originalX: x1, originalY: y1,
                tileData, objectData, secretData,
                metadata: selectionMetadata
            });
            setPreviewPosition({ x: x1, y: y1 });
            setOriginalMapData({
                tileMap: [...tileMapData],
                objectMap: [...objectMapData],
                secretMap: [...secretMapData],
                objectMetadata: { ...objectMetadata }
            });
            setDragStart(null);
        }

        setIsDragging(false);
        setResizeState(null);
        setMoveState(null);
    }, [activeTool, isDragging, resizeState, moveState, dragStart, mapWidth, tileMapData, objectMapData, secretMapData, setSelection, setPreviewPosition, setOriginalMapData, setDragStart, setIsDragging]);

    return {
        hoverIndex,
        setHoverIndex,
        bucketPreviewIndices,
        setBucketPreviewIndices,
        handleGridMouseDown,
        handleGridMouseMove,
        handleGridMouseUp,
        handleResizeStart,
        handleMoveStart,
        paintTile
    };
};

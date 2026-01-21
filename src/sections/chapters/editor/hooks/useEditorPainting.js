import { useState, useRef, useEffect, useCallback } from 'react';
import { getFloodFillIndices, floodFill, paintTile as paintTileUtil } from '../editorTools/paintingTools';

export const useEditorPainting = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, 
    setTileMapData, setObjectMapData, setSecretMapData,
    activeTool, brushSize, activeLayer, selectedTile, selection, 
    setSelection, setPreviewPosition, setOriginalMapData, dragStart, setDragStart, isDragging, setIsDragging,
    setActivePanel, setHighlightedIndex, highlightedIndex, registryItems,
    objectMetadata, setObjectMetadata,
    maps, activeMapId, showRoomMapContent, isRoomAreaVisible, updateMapData
) => {
    const [hoverIndex, setHoverIndex] = useState(null);
    const [bucketPreviewIndices, setBucketPreviewIndices] = useState(new Set());
    const [resizeState, setResizeState] = useState(null); // { index, edge, startX, startY, startW, startH }
    const [moveState, setMoveState] = useState(null); // { index, startX, startY, objId, secretId, meta }
    const bucketTimerRef = useRef(null);

    const getLinkedRoomAt = useCallback((index) => {
        if (!showRoomMapContent || !secretMapData || !objectMetadata) return null;
        
        const x = index % mapWidth;
        const y = Math.floor(index / mapWidth);

        // Scan for room areas
        for (const [idxStr, meta] of Object.entries(objectMetadata)) {
            const idx = parseInt(idxStr);
            if (secretMapData[idx] === 'room_area' && meta.linkedMapId && maps[meta.linkedMapId]) {
                const rx = idx % mapWidth;
                const ry = Math.floor(idx / mapWidth);
                const rw = meta.width || 1;
                const rh = meta.height || 1;

                if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
                    return {
                        mapId: meta.linkedMapId,
                        roomX: rx,
                        roomY: ry,
                        roomWidth: rw,
                        roomHeight: rh,
                        localX: x - rx,
                        localY: y - ry,
                        map: maps[meta.linkedMapId]
                    };
                }
            }
        }
        return null;
    }, [showRoomMapContent, secretMapData, objectMetadata, maps, mapWidth]);

    const paintTile = useCallback((index) => {
        const linkedRoom = getLinkedRoomAt(index);
        
        if (linkedRoom && showRoomMapContent) {
            const { mapId, localX, localY, map } = linkedRoom;
            const rWidth = map.mapWidth;
            const rHeight = map.mapHeight;
            const roomIndex = localY * rWidth + localX;

            const setRoomData = (layer, newData) => {
                updateMapData(mapId, { [layer]: newData });
            };

            const setRoomMetadata = (newMeta) => {
                updateMapData(mapId, { objectMetadata: newMeta });
            };

            paintTileUtil({
                index: roomIndex,
                activeTool,
                brushSize,
                activeLayer,
                selectedTile,
                mapWidth: rWidth,
                mapHeight: rHeight,
                tileMapData: map.tileMapData || [],
                objectMapData: map.objectMapData || [],
                secretMapData: map.secretMapData || [],
                objectMetadata: map.objectMetadata || {},
                setTileMapData: (data) => setRoomData('tileMapData', data),
                setObjectMapData: (data) => setRoomData('objectMapData', data),
                setSecretMapData: (data) => setRoomData('secretMapData', data),
                setObjectMetadata: setRoomMetadata,
                isRoomAreaVisible
            });
            return;
        }

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
            setObjectMetadata,
            isRoomAreaVisible
        });
    }, [getLinkedRoomAt, showRoomMapContent, updateMapData, activeTool, brushSize, activeLayer, selectedTile, mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata, isRoomAreaVisible]);

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
        const linkedRoom = getLinkedRoomAt(index);
        const useLinked = linkedRoom && showRoomMapContent;

        const mWidth = useLinked ? linkedRoom.map.mapWidth : mapWidth;
        const mHeight = useLinked ? linkedRoom.map.mapHeight : mapHeight;
        const mIndex = useLinked ? (linkedRoom.localY * mWidth + linkedRoom.localX) : index;
        
        const mTileMapData = useLinked ? linkedRoom.map.tileMapData : tileMapData;
        const mObjectMapData = useLinked ? linkedRoom.map.objectMapData : objectMapData;
        const mSecretMapData = useLinked ? linkedRoom.map.secretMapData : secretMapData;
        const mObjectMetadata = useLinked ? linkedRoom.map.objectMetadata : objectMetadata;

        const mSetTileMapData = useLinked ? (data) => updateMapData(linkedRoom.mapId, { tileMapData: data }) : setTileMapData;
        const mSetObjectMapData = useLinked ? (data) => updateMapData(linkedRoom.mapId, { objectMapData: data }) : setObjectMapData;
        const mSetSecretMapData = useLinked ? (data) => updateMapData(linkedRoom.mapId, { secretMapData: data }) : setSecretMapData;
        const mSetObjectMetadata = useLinked ? (data) => updateMapData(linkedRoom.mapId, { objectMetadata: data }) : setObjectMetadata;

        // Quick select for configurable objects
        const existingObjId = mObjectMapData[mIndex];
        const existingSecretId = mSecretMapData[mIndex];
        const isEraser = selectedTile === null && activeTool === 'brush';
        const isRoomMap = maps[activeMapId]?.type === 'room';

        if (!isEraser && (existingObjId || existingSecretId) && setActivePanel && setHighlightedIndex) {
            const objDef = existingObjId ? registryItems?.find(r => r.id === existingObjId) : null;
            const secretDef = existingSecretId ? registryItems?.find(r => r.id === existingSecretId) : null;

            const isWeather = objDef && objDef.type === 'weather_trigger';
            const isMessage = objDef && objDef.type === 'message_trigger';
            const isPortalOrTarget = existingObjId && (existingObjId.includes('portal') || existingObjId.includes('target') || existingObjId === 'portal_target');
            const isDoor = objDef && objDef.subtype === 'door';
            const isRoomArea = secretDef && secretDef.subtype === 'room' && !isRoomMap;

            if (isWeather || isMessage || isPortalOrTarget || isDoor || isRoomArea) {
                setActivePanel('props');
                setHighlightedIndex(useLinked ? index : mIndex);
            }
        }

        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index);
        } else if (activeTool === 'area') {
            setIsDragging(true);
            setDragStart({ x: index % mapWidth, y: Math.floor(index / mapWidth) });
        } else if (activeTool === 'bucket') {
            const isPropsLayer = activeLayer === 'props';
            const targetLayer = isPropsLayer ? 'object' : activeLayer;
            const targetData = targetLayer === 'tile' ? mTileMapData : (targetLayer === 'object' ? mObjectMapData : mSecretMapData);
            const targetValue = targetData[mIndex];
            const newValue = selectedTile ? selectedTile.id : null;
            if (targetValue === newValue) return;

            const newData = floodFill(mIndex, newValue, targetData, mWidth, mHeight);
            
            if (targetLayer === 'tile') mSetTileMapData(newData);
            else if (targetLayer === 'object') {
                mSetObjectMapData(newData);
                // Clean up metadata for all affected indices if erasing
                if (newValue === null && mObjectMetadata && mSetObjectMetadata) {
                    const affectedIndices = getFloodFillIndices(mIndex, targetData, mWidth, mHeight);
                    let metaChanged = false;
                    const newMeta = { ...mObjectMetadata };
                    affectedIndices.forEach(idx => {
                        if (newMeta[idx]) {
                            delete newMeta[idx];
                            metaChanged = true;
                        }
                    });
                    if (metaChanged) mSetObjectMetadata(newMeta);
                }
            }
            else mSetSecretMapData(newData);
        } else if (activeTool === 'move') {
            if (selection) return;

            // If we clicked on an object/secret, start moving it
            if (existingObjId || existingSecretId) {
                handleMoveStart(mIndex); // Note: move/resize on linked rooms might still be buggy
            } else {
                const x = index % mapWidth;
                const y = Math.floor(index / mapWidth);
                setDragStart({ x, y });
                setIsDragging(true);
            }
        }
    }, [mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata, setActivePanel, setHighlightedIndex, registryItems, activeTool, setIsDragging, paintTile, activeLayer, selectedTile, selection, handleMoveStart, setDragStart, getLinkedRoomAt, showRoomMapContent, updateMapData]);

    const handleGridMouseMove = useCallback((index) => {
        setHoverIndex(index);
        const curX = index % mapWidth;
        const curY = Math.floor(index / mapWidth);

        const linkedRoom = getLinkedRoomAt(index);
        const useLinked = linkedRoom && showRoomMapContent;

        if (resizeState) {
            // Resize logic - keep on active map for now as it's complex
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
                
                const mWidth = useLinked ? linkedRoom.map.mapWidth : mapWidth;
                const mHeight = useLinked ? linkedRoom.map.mapHeight : mapHeight;
                const mIndex = useLinked ? (linkedRoom.localY * mWidth + linkedRoom.localX) : index;
                const mData = useLinked ? linkedRoom.map : { tileMapData, objectMapData, secretMapData };
                
                const targetData = targetLayer === 'tile' ? mData.tileMapData : (targetLayer === 'object' ? mData.objectMapData : mData.secretMapData);
                const indices = getFloodFillIndices(mIndex, targetData, mWidth, mHeight);
                
                if (useLinked) {
                    // We need to convert linked room indices back to main map indices for preview?
                    // Or just skip preview for linked rooms for now to keep it simple.
                    setBucketPreviewIndices(new Set()); 
                } else {
                    setBucketPreviewIndices(indices);
                }
            }, 10);
        }
    }, [setHoverIndex, activeTool, isDragging, paintTile, activeLayer, tileMapData, objectMapData, secretMapData, mapWidth, mapHeight, setBucketPreviewIndices, resizeState, moveState, objectMetadata, setObjectMetadata, setObjectMapData, setSecretMapData, setHighlightedIndex, getLinkedRoomAt, showRoomMapContent]);

    const handleGridMouseUp = useCallback((index) => {
        if (activeTool === 'area' && isDragging && dragStart && index !== null) {
            const hx = index % mapWidth;
            const hy = Math.floor(index / mapWidth);
            const x1 = Math.min(dragStart.x, hx);
            const y1 = Math.min(dragStart.y, hy);
            const x2 = Math.max(dragStart.x, hx);
            const y2 = Math.max(dragStart.y, hy);
            const w = x2 - x1 + 1;
            const h = y2 - y1 + 1;
            const baseIndex = y1 * mapWidth + x1;

            setSecretMapData(prev => {
                const next = [...prev];
                next[baseIndex] = 'room_area';
                return next;
            });
            setObjectMetadata(prev => ({
                ...prev,
                [baseIndex]: { ...prev[baseIndex], width: w, height: h, roomName: 'New Room' }
            }));
            setHighlightedIndex(baseIndex);
            if (setActivePanel) setActivePanel('props');
            setIsDragging(false);
            setDragStart(null);
            return;
        }

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

import React, { useState, useEffect, useRef } from 'react';
import { getRegistry } from '../../../engine/registry';
import { TILE_SIZE } from '../../../constants/gameConstants';
import { saveMap, loadMap, clearMap, resizeMapData } from './mapOperations';
import { getFloodFillIndices, floodFill, paintTile } from './paintingTools';
import { loadBackgroundOptions, loadMusicOptions } from './assetLoaders';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';
import { NewMapModal } from './NewMapModal';

export const Editor = () => {
    // Editor state: map dimensions, tile/object data, selected tile, tools
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    const [tileMapData, setTileMapData] = useState([]);
    const [objectMapData, setObjectMapData] = useState([]);
    const [secretMapData, setSecretMapData] = useState([]);
    const [selectedTile, setSelectedTile] = useState(null);
    const [showGrid, setShowGrid] = useState(true);

    const [isDragging, setIsDragging] = useState(false);
    const [brushSize, setBrushSize] = useState(1);
    const [activeTool, setActiveTool] = useState('brush');

    const [selection, setSelection] = useState(null);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [activeLayer, setActiveLayer] = useState('tile');
    const [dragStart, setDragStart] = useState(null);
    const [bucketPreviewIndices, setBucketPreviewIndices] = useState(new Set());
    const bucketTimerRef = useRef(null);
    const stateRef = useRef({ mapWidth, mapHeight, tileMapData, objectMapData, secretMapData });

    // Map metadata
    const [mapName, setMapName] = useState("New Map");
    const [creatorName, setCreatorName] = useState("Anonymous");
    const [createdAt, setCreatedAt] = useState(null);
    const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);
    const [tempMapName, setTempMapName] = useState("");
    const [tempCreatorName, setTempCreatorName] = useState("");

    useEffect(() => {
        stateRef.current = { mapWidth, mapHeight, tileMapData, objectMapData, secretMapData };
    }, [mapWidth, mapHeight, tileMapData, objectMapData, secretMapData]);

    useEffect(() => {
        const size = 15 * 20;
        setTileMapData(Array(size).fill(null));
        setObjectMapData(Array(size).fill(null));
        setSecretMapData(Array(size).fill(null));
    }, []);

    const registryItems = getRegistry() || [];
    const blocks = registryItems.filter(item => item.name && item.name.startsWith('block.') && !(item.flags && item.flags.liquid));
    const liquids = registryItems.filter(item => item.flags && item.flags.liquid);
    const entities = registryItems.filter(item => {
        if (!item.name || !item.name.startsWith('entities.')) return false;
        if (item.isHiddenInEditor) return false;
        return !item.type || item.type === 'default';
    });
    const items = registryItems.filter(item => item.name && item.name.startsWith('item.'));
    const interactables = registryItems.filter(item => item.name && item.name.startsWith('interactable.'));
    const hazards = registryItems.filter(item => item.type === 'hazard');
    const secrets = registryItems.filter(item => item.type === 'secret');

    const backgroundOptions = loadBackgroundOptions();
    const musicOptions = loadMusicOptions();

    const [selectedBackgroundImage, setSelectedBackgroundImage] = useState(backgroundOptions[0]?.metaPath || null);
    const [backgroundParallaxFactor, setBackgroundParallaxFactor] = useState(0.3);
    const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#87CEEB');
    const [selectedBackgroundMusic, setSelectedBackgroundMusic] = useState(null);

    const selectedBgOption = backgroundOptions.find((bg) => bg.metaPath === selectedBackgroundImage) || backgroundOptions[0];
    const selectedBackgroundUrl = selectedBgOption && selectedBackgroundImage ? selectedBgOption.src : null;

    const openNewMapModal = () => {
        setTempMapName("New Map");
        setTempCreatorName(creatorName);
        setIsNewMapModalOpen(true);
    };

    const confirmNewMap = () => {
        if (window.confirm("Are you sure you want to create a new map? Unsaved changes will be lost.")) {
            const size = 20 * 15;
            setMapWidth(20);
            setMapHeight(15);
            setTileMapData(Array(size).fill(null));
            setObjectMapData(Array(size).fill(null));
            setSecretMapData(Array(size).fill(null));

            setMapName(tempMapName || "New Map");
            setCreatorName(tempCreatorName || "Anonymous");
            setCreatedAt(null);
            setSelectedBackgroundImage(backgroundOptions[0]?.metaPath || null);
            setBackgroundParallaxFactor(0.3);
            setSelectedBackgroundColor('#87CEEB');
            setSelectedBackgroundMusic(null);

            setIsNewMapModalOpen(false);
        }
    };

    const getCurrentData = () => {
        if (activeLayer === 'tile') return tileMapData;
        if (activeLayer === 'object') return objectMapData;
        if (activeLayer === 'secret') return secretMapData;
        return tileMapData;
    };
    const setCurrentData = (newData) => {
        if (activeLayer === 'tile') setTileMapData(newData);
        else if (activeLayer === 'object') setObjectMapData(newData);
        else if (activeLayer === 'secret') setSecretMapData(newData);
    };

    const handleGridMouseDown = (index, e) => {
        e.preventDefault();
        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index, selectedTile, brushSize, mapWidth, mapHeight, getCurrentData, setCurrentData);
        }
        else if (activeTool === 'bucket') {
            const targetId = selectedTile ? selectedTile.id : null;
            floodFill(index, targetId, getCurrentData, setCurrentData, mapWidth, mapHeight);
            setBucketPreviewIndices(new Set());
        } else if (activeTool === 'move') {
            const x = index % mapWidth;
            const y = Math.floor(index / mapWidth);
            setDragStart({ x, y });
            setSelection(null);
            setIsDragging(true);
        }
    };

    const handleGridMouseEnter = (index) => {
        setHoverIndex(index);
        if (bucketTimerRef.current) {
            clearTimeout(bucketTimerRef.current);
            bucketTimerRef.current = null;
        }
        setBucketPreviewIndices(new Set());
        if (activeTool === 'brush' && isDragging) {
            paintTile(index, selectedTile, brushSize, mapWidth, mapHeight, getCurrentData, setCurrentData);
        }
        else if (activeTool === 'bucket' && !isDragging) {
            bucketTimerRef.current = setTimeout(() => {
                const currentData = getCurrentData();
                const indices = getFloodFillIndices(index, currentData, mapWidth, mapHeight);
                setBucketPreviewIndices(new Set(indices));
            }, 600);
        }
    };

    const handleGridMouseLeave = () => {
        setHoverIndex(null);
        if (bucketTimerRef.current) clearTimeout(bucketTimerRef.current);
        setBucketPreviewIndices(new Set());
    };

    const handleGridMouseUp = (index) => {
        setIsDragging(false);
        if (activeTool === 'move' && dragStart) {
            const endX = index % mapWidth;
            const endY = Math.floor(index / mapWidth);
            const x1 = Math.min(dragStart.x, endX);
            const y1 = Math.min(dragStart.y, endY);
            const x2 = Math.max(dragStart.x, endX);
            const y2 = Math.max(dragStart.y, endY);
            const w = x2 - x1 + 1;
            const h = y2 - y1 + 1;

            const selTileData = [];
            const selObjectData = [];
            const selSecretData = [];

            for (let py = 0; py < h; py++) {
                for (let px = 0; px < w; px++) {
                    const idx = (y1 + py) * mapWidth + (x1 + px);
                    selTileData.push(tileMapData[idx]);
                    selObjectData.push(objectMapData[idx]);
                    selSecretData.push(secretMapData[idx]);
                }
            }
            setSelection({ x: x1, y: y1, w, h, tileData: selTileData, objectData: selObjectData, secretData: selSecretData });
            setDragStart(null);
        }
    };

    const moveSelection = (dx, dy) => {
        if (!selection) return;

        const newTileMap = [...tileMapData];
        const newObjectMap = [...objectMapData];
        const newSecretMap = [...secretMapData];

        for (let py = 0; py < selection.h; py++) {
            for (let px = 0; px < selection.w; px++) {
                const idx = (selection.y + py) * mapWidth + (selection.x + px);
                if (idx >= 0 && idx < newTileMap.length) {
                    newTileMap[idx] = null;
                    newObjectMap[idx] = null;
                    newSecretMap[idx] = null;
                }
            }
        }

        const newX = selection.x + dx;
        const newY = selection.y + dy;
        for (let py = 0; py < selection.h; py++) {
            for (let px = 0; px < selection.w; px++) {
                const destX = newX + px;
                const destY = newY + py;
                if (destX >= 0 && destX < mapWidth && destY >= 0 && destY < mapHeight) {
                    const destIdx = destY * mapWidth + destX;
                    const srcDataIdx = py * selection.w + px;

                    newTileMap[destIdx] = selection.tileData[srcDataIdx];
                    newObjectMap[destIdx] = selection.objectData[srcDataIdx];
                    newSecretMap[destIdx] = selection.secretData?.[srcDataIdx] || null;
                }
            }
        }

        setTileMapData(newTileMap);
        setObjectMapData(newObjectMap);
        setSecretMapData(newSecretMap);
        setSelection({ ...selection, x: newX, y: newY });
    };

    const handleResizeMouseDown = (direction) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const { mapWidth: startW, mapHeight: startH } = stateRef.current;
        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            if (direction === 'width') {
                const colsDiff = Math.round(dx / TILE_SIZE);
                if (startW + colsDiff !== stateRef.current.mapWidth) {
                    resizeMapData({
                        newWidth: startW + colsDiff,
                        newHeight: stateRef.current.mapHeight,
                        stateRef,
                        setMapWidth,
                        setMapHeight,
                        setTileMapData,
                        setObjectMapData,
                        setSecretMapData
                    });
                }
            } else if (direction === 'height') {
                const rowsDiff = Math.round(dy / TILE_SIZE);
                if (startH + rowsDiff !== stateRef.current.mapHeight) {
                    resizeMapData({
                        newWidth: stateRef.current.mapWidth,
                        newHeight: startH + rowsDiff,
                        stateRef,
                        setMapWidth,
                        setMapHeight,
                        setTileMapData,
                        setObjectMapData,
                        setSecretMapData
                    });
                }
            }
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handlePaletteSelect = (item, layer) => {
        setSelectedTile(item);
        setActiveLayer(layer);
        setActiveTool('brush');
        setSelection(null);
    };

    const totalTiles = mapWidth * mapHeight;
    const filledBlocks = tileMapData.filter(t => t !== null).length;
    const emptyBlocks = totalTiles - filledBlocks;
    const objectsCount = objectMapData.filter(o => o !== null).length;

    return (
        <div className="editor-wrapper" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            <NewMapModal
                isOpen={isNewMapModalOpen}
                tempMapName={tempMapName}
                setTempMapName={setTempMapName}
                tempCreatorName={tempCreatorName}
                setTempCreatorName={setTempCreatorName}
                confirmNewMap={confirmNewMap}
                onClose={() => setIsNewMapModalOpen(false)}
            />

            <div className="editor-container" style={{
                display: 'flex', height: '100%', flexDirection: 'row',
                filter: isNewMapModalOpen ? 'blur(4px) brightness(0.7)' : 'none',
                transition: 'filter 0.2s ease',
                pointerEvents: isNewMapModalOpen ? 'none' : 'auto'
            }}>
                <Toolbar
                    mapName={mapName}
                    creatorName={creatorName}
                    openNewMapModal={openNewMapModal}
                    saveMap={() => saveMap({
                        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData,
                        mapName, creatorName, createdAt,
                        selectedBackgroundImage, selectedBackgroundColor,
                        backgroundParallaxFactor, selectedBackgroundMusic,
                        registryItems, setCreatedAt
                    })}
                    loadMap={(event) => loadMap({
                        event, setMapWidth, setMapHeight, setMapName, setCreatorName,
                        setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
                        setBackgroundParallaxFactor, setSelectedBackgroundMusic,
                        setTileMapData, setObjectMapData, setSecretMapData
                    })}
                    showGrid={showGrid}
                    setShowGrid={setShowGrid}
                    clearMap={() => clearMap({ mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData })}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    brushSize={brushSize}
                    setBrushSize={setBrushSize}
                    activeLayer={activeLayer}
                    selection={selection}
                    moveSelection={moveSelection}
                    setSelection={setSelection}
                    selectedTile={selectedTile}
                    handlePaletteSelect={handlePaletteSelect}
                    blocks={blocks}
                    liquids={liquids}
                    entities={entities}
                    items={items}
                    interactables={interactables}
                    hazards={hazards}
                    secrets={secrets}
                    backgroundOptions={backgroundOptions}
                    selectedBackgroundImage={selectedBackgroundImage}
                    setSelectedBackgroundImage={setSelectedBackgroundImage}
                    selectedBackgroundColor={selectedBackgroundColor}
                    setSelectedBackgroundColor={setSelectedBackgroundColor}
                    backgroundParallaxFactor={backgroundParallaxFactor}
                    setBackgroundParallaxFactor={setBackgroundParallaxFactor}
                    musicOptions={musicOptions}
                    selectedBackgroundMusic={selectedBackgroundMusic}
                    setSelectedBackgroundMusic={setSelectedBackgroundMusic}
                    totalTiles={totalTiles}
                    filledBlocks={filledBlocks}
                    emptyBlocks={emptyBlocks}
                    objectsCount={objectsCount}
                />

                <Viewport
                    mapWidth={mapWidth}
                    mapHeight={mapHeight}
                    selectedBackgroundUrl={selectedBackgroundUrl}
                    selectedBackgroundColor={selectedBackgroundColor}
                    selectedBackgroundImage={selectedBackgroundImage}
                    showGrid={showGrid}
                    activeLayer={activeLayer}
                    activeTool={activeTool}
                    tileMapData={tileMapData}
                    objectMapData={objectMapData}
                    secretMapData={secretMapData}
                    registryItems={registryItems}
                    hoverIndex={hoverIndex}
                    brushSize={brushSize}
                    bucketPreviewIndices={bucketPreviewIndices}
                    selection={selection}
                    dragStart={dragStart}
                    isDragging={isDragging}
                    handleGridMouseDown={handleGridMouseDown}
                    handleGridMouseEnter={handleGridMouseEnter}
                    handleGridMouseUp={handleGridMouseUp}
                    handleGridMouseLeave={handleGridMouseLeave}
                    setIsDragging={setIsDragging}
                    handleResizeMouseDown={handleResizeMouseDown}
                />
            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getRegistry } from '../../../engine/registry';
import { TILE_SIZE } from '../../../constants/gameConstants';
import { saveMap, loadMap, clearMap, resizeMapData } from './mapOperations';
import { getFloodFillIndices, floodFill, paintTile } from './paintingTools';
import { loadBackgroundOptions, loadMusicOptions } from './assetLoaders';
import { Viewport } from './Viewport';
import { NewMapModal } from './NewMapModal';
import { ToolbarWindows } from './ToolbarWindows';
import { useGameEngine } from '../../../utilities/useGameEngine';
import PixiStage from '../game/PixiStage';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export const Editor = () => {
    // 1. Definējam registryItems pašā augšā
    const registryItems = useMemo(() => getRegistry() || [], []);
    const playerVisuals = useMemo(() => registryItems.find(item => item.id === 'player') || EMPTY_OBJECT, [registryItems]);

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
    const [selectionMode, setSelectionMode] = useState('cut'); // 'cut' or 'copy'
    const [isMovingSelection, setIsMovingSelection] = useState(false);
    const [previewPosition, setPreviewPosition] = useState(null);
    const [originalMapData, setOriginalMapData] = useState(null);
    const bucketTimerRef = useRef(null);
    const stateRef = useRef({ mapWidth, mapHeight, tileMapData, objectMapData, secretMapData });

    // Map metadata
    const [mapName, setMapName] = useState("New Map");
    const [creatorName, setCreatorName] = useState("Anonymous");
    const [createdAt, setCreatedAt] = useState(null);
    const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);
    const [tempMapName, setTempMapName] = useState("");
    const [tempCreatorName, setTempCreatorName] = useState("");

    // 2. NOŅEM ŠO RINDIŅU (tā vairs nav vajadzīga šeit):
    // const registryItems = getRegistry() || [];

    // Background and music options (memoized to avoid reloading every frame)
    const backgroundOptions = useMemo(() => loadBackgroundOptions(), []);
    const musicOptions = useMemo(() => loadMusicOptions(), []);

    // Background state - needed before Play/Pause state
    const [selectedBackgroundImage, setSelectedBackgroundImage] = useState(backgroundOptions[0]?.metaPath || null);
    const [backgroundParallaxFactor, setBackgroundParallaxFactor] = useState(0.3);
    const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#87CEEB');
    const [selectedBackgroundMusic, setSelectedBackgroundMusic] = useState(null);

    // 3. Definējam stabilu handleSaveMap funkciju
    const handleSaveMap = useCallback(() => {
        saveMap({
            mapWidth, mapHeight, tileMapData, objectMapData, secretMapData,
            mapName, creatorName, createdAt,
            selectedBackgroundImage, selectedBackgroundColor,
            backgroundParallaxFactor, selectedBackgroundMusic,
            registryItems, setCreatedAt
        });
    }, [
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData,
        mapName, creatorName, createdAt,
        selectedBackgroundImage, selectedBackgroundColor,
        backgroundParallaxFactor, selectedBackgroundMusic,
        registryItems
    ]);

    // Play/Pause/Reset state
    const [isPlayMode, setIsPlayMode] = useState(false);
    const [editorSnapshot, setEditorSnapshot] = useState(null);
    const [playerPosition, setPlayerPosition] = useState({ x: 100, y: 100 });
    const [revealedSecrets, setRevealedSecrets] = useState([]);
    const [playModeObjectData, setPlayModeObjectData] = useState([]);
    const [playModeSecretData, setPlayModeSecretData] = useState([]);

    // Game engine integration for Play mode
    const mapDataForGame = useMemo(() => ({
        meta: {
            width: mapWidth,
            height: mapHeight,
            tileSize: TILE_SIZE,
            backgroundImage: selectedBackgroundImage,
            backgroundColor: selectedBackgroundColor,
            backgroundParallaxFactor: backgroundParallaxFactor
        },
        layers: [
            { type: "tile", name: "background", data: tileMapData },
            { type: "object", name: "entities", data: playModeObjectData }
        ]
    }), [mapWidth, mapHeight, selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, tileMapData, playModeObjectData]);

    const handleGameOver = useCallback(() => {
        // On game over in editor, just pause
        setIsPlayMode(false);
    }, []);

    const handleStateUpdate = useCallback((newState, payload) => {
        // Update player position during play or handle events like item collection
        if (newState && typeof newState === 'object' && newState.x !== undefined && newState.y !== undefined) {
            setPlayerPosition({ x: newState.x, y: newState.y });
        } else if (newState === 'collectItem' && payload !== undefined) {
            setPlayModeObjectData(prev => {
                const newData = [...prev];
                newData[payload] = null;
                return newData;
            });
        }
    }, []);

    const handleRevealSecret = useCallback((secretIndex) => {
        setRevealedSecrets(prev => [...prev, secretIndex]);
    }, []);

    const gameEngineState = useGameEngine(
        isPlayMode ? mapDataForGame : null,
        isPlayMode ? tileMapData : [],
        isPlayMode ? playModeObjectData : [],
        isPlayMode ? playModeSecretData : [],
        revealedSecrets,
        registryItems,
        handleGameOver,
        handleStateUpdate,
        handleRevealSecret
    );

    useEffect(() => {
        stateRef.current = { mapWidth, mapHeight, tileMapData, objectMapData, secretMapData };
    }, [mapWidth, mapHeight, tileMapData, objectMapData, secretMapData]);

    useEffect(() => {
        const size = 15 * 20;
        setTileMapData(Array(size).fill(null));
        setObjectMapData(Array(size).fill(null));
        setSecretMapData(Array(size).fill(null));
    }, []);

    // Keyboard handler for Enter (commit) and Escape (cancel)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selection) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSelection();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, previewPosition, originalMapData, selectionMode]);

    const blocks = useMemo(() => registryItems.filter(item => item.name && item.name.startsWith('block.') && !(item.flags && item.flags.liquid)), [registryItems]);
    const liquids = useMemo(() => registryItems.filter(item => item.flags && item.flags.liquid), [registryItems]);
    const entities = useMemo(() => registryItems.filter(item => {
        if (!item.name || !item.name.startsWith('entities.')) return false;
        if (item.isHiddenInEditor) return false;
        return !item.type || item.type === 'default';
    }), [registryItems]);
    const items = useMemo(() => registryItems.filter(item => item.name && item.name.startsWith('item.')), [registryItems]);
    const interactables = useMemo(() => registryItems.filter(item => item.name && item.name.startsWith('interactable.')), [registryItems]);
    const hazards = useMemo(() => registryItems.filter(item => item.type === 'hazard'), [registryItems]);
    const secrets = useMemo(() => registryItems.filter(item => item.type === 'secret'), [registryItems]);

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

        // Check if clicking on existing selection to move it
        if (selection && previewPosition) {
            const x = index % mapWidth;
            const y = Math.floor(index / mapWidth);

            // Check if click is inside selection
            if (x >= previewPosition.x && x < previewPosition.x + selection.w &&
                y >= previewPosition.y && y < previewPosition.y + selection.h) {
                setIsMovingSelection(true);
                setIsDragging(true);
                return;
            }
        }

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
            setPreviewPosition(null);
            setOriginalMapData(null);
            setIsDragging(true);
        }
    };

    const handleGridMouseEnter = (index) => {
        setHoverIndex(index);

        // If moving selection, update preview position
        if (isMovingSelection && isDragging && previewPosition) {
            const x = index % mapWidth;
            const y = Math.floor(index / mapWidth);
            setPreviewPosition({ x, y });
            return;
        }

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
        if (isMovingSelection) {
            // Just stop moving, don't commit yet (wait for Enter)
            setIsMovingSelection(false);
            return;
        }

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

            // Save original map state
            setOriginalMapData({
                tileMap: [...tileMapData],
                objectMap: [...objectMapData],
                secretMap: [...secretMapData]
            });

            setSelection({ x: x1, y: y1, w, h, tileData: selTileData, objectData: selObjectData, secretData: selSecretData, originalX: x1, originalY: y1 });
            setPreviewPosition({ x: x1, y: y1 });
            setDragStart(null);
        }
    };

    const moveSelection = (dx, dy) => {
        if (!selection || !previewPosition) return;

        const newX = previewPosition.x + dx;
        const newY = previewPosition.y + dy;

        // Just update preview position
        setPreviewPosition({ x: newX, y: newY });
    };

    const commitSelection = () => {
        if (!selection || !previewPosition || !originalMapData) return;

        const newTileMap = [...originalMapData.tileMap];
        const newObjectMap = [...originalMapData.objectMap];
        const newSecretMap = [...originalMapData.secretMap];

        // If cut mode, clear original position
        if (selectionMode === 'cut') {
            for (let py = 0; py < selection.h; py++) {
                for (let px = 0; px < selection.w; px++) {
                    const idx = (selection.originalY + py) * mapWidth + (selection.originalX + px);
                    if (idx >= 0 && idx < newTileMap.length) {
                        newTileMap[idx] = null;
                        newObjectMap[idx] = null;
                        newSecretMap[idx] = null;
                    }
                }
            }
        }

        // Place selection at new position
        for (let py = 0; py < selection.h; py++) {
            for (let px = 0; px < selection.w; px++) {
                const destX = previewPosition.x + px;
                const destY = previewPosition.y + py;
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
        setSelection(null);
        setPreviewPosition(null);
        setOriginalMapData(null);
    };

    const cancelSelection = () => {
        setSelection(null);
        setPreviewPosition(null);
        setOriginalMapData(null);
        setIsMovingSelection(false);
    };

    const handleMapResize = (newWidth, newHeight) => {
        if (newWidth === mapWidth && newHeight === mapHeight) return;

        resizeMapData({
            newWidth,
            newHeight,
            stateRef,
            setMapWidth,
            setMapHeight,
            setTileMapData,
            setObjectMapData,
            setSecretMapData
        });
    };

    const handlePaletteSelect = (item, layer) => {
        setSelectedTile(item);
        setActiveLayer(layer);
        setActiveTool('brush');
        setSelection(null);
    };

    // Play/Pause/Reset handlers
    const handlePlay = () => {
        // Save snapshot of current state (original editor data)
        setEditorSnapshot({
            objectMapData: [...objectMapData],
            secretMapData: [...secretMapData],
            playerPosition: { ...playerPosition }
        });

        // Create copies for play mode (these will be modified by game engine)
        const playData = [...objectMapData];

        // Find player spawn position or use default center position
        let spawnIndex = playData.findIndex(id => id && id.includes('player'));
        if (spawnIndex === -1) {
            // No player found, place at center of map (or position 3,3)
            const spawnX = Math.min(3, mapWidth - 1);
            const spawnY = Math.min(3, mapHeight - 1);
            spawnIndex = spawnY * mapWidth + spawnX;
            // Add temporary player marker (use ID 'player' which is in registry)
            playData[spawnIndex] = 'player';
        }

        setPlayModeObjectData(playData);
        setPlayModeSecretData([...secretMapData]);
        setRevealedSecrets([]);

        setIsPlayMode(true);
    };

    const handlePause = () => {
        setIsPlayMode(false);
        // When pausing, update editor's objectMapData with current play state
        // This simulates "saving" the collected items during play
        const pauseData = [...playModeObjectData];

        // Remove temporary player if it was auto-added (not in original editor data)
        const originalHadPlayer = editorSnapshot.objectMapData.findIndex(id => id && id.includes('player')) !== -1;
        if (!originalHadPlayer) {
            const playerIndex = pauseData.findIndex(id => id && id.includes('player'));
            if (playerIndex !== -1) {
                pauseData[playerIndex] = null;
            }
        }

        setObjectMapData(pauseData);
        setSecretMapData([...playModeSecretData]);
    };

    const handleReset = () => {
        if (editorSnapshot && isPlayMode) {
            // Restore objects from snapshot but keep player position
            // This resets collected objects during play mode
            const resetData = [...editorSnapshot.objectMapData];

            // Re-add player at same spawn position
            let spawnIndex = resetData.findIndex(id => id && id.includes('player'));
            if (spawnIndex === -1) {
                const spawnX = Math.min(3, mapWidth - 1);
                const spawnY = Math.min(3, mapHeight - 1);
                spawnIndex = spawnY * mapWidth + spawnX;
                resetData[spawnIndex] = 'player';
            }

            setPlayModeObjectData(resetData);
            setPlayModeSecretData([...editorSnapshot.secretMapData]);
            setRevealedSecrets([]);
            // Player position is maintained by useGameEngine state
        }
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
                <ToolbarWindows
                    mapName={mapName}
                    creatorName={creatorName}
                    openNewMapModal={openNewMapModal}
                    saveMap={handleSaveMap} // 4. Izmanto jauno handleSaveMap
                    loadMap={(event) => loadMap({
                        event, setMapWidth, setMapHeight, setMapName, setCreatorName,
                        setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
                        setBackgroundParallaxFactor, setSelectedBackgroundMusic,
                        setTileMapData, setObjectMapData, setSecretMapData
                    })}
                    showGrid={showGrid}
                    setShowGrid={setShowGrid}
                    clearMap={() => clearMap({ mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData })}
                    isPlayMode={isPlayMode}
                    handlePlay={handlePlay}
                    handlePause={handlePause}
                    handleReset={handleReset}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    brushSize={brushSize}
                    setBrushSize={setBrushSize}
                    activeLayer={activeLayer}
                    selection={selection}
                    moveSelection={moveSelection}
                    setSelection={setSelection}
                    selectionMode={selectionMode}
                    setSelectionMode={setSelectionMode}
                    commitSelection={commitSelection}
                    cancelSelection={cancelSelection}
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
                    mapWidth={mapWidth}
                    mapHeight={mapHeight}
                    tileMapData={tileMapData}
                    objectMapData={objectMapData}
                    registryItems={registryItems}
                    onMapResize={handleMapResize}
                />

                {!isPlayMode ? (
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
                        previewPosition={previewPosition}
                        dragStart={dragStart}
                        isDragging={isDragging}
                        handleGridMouseDown={handleGridMouseDown}
                        handleGridMouseEnter={handleGridMouseEnter}
                        handleGridMouseUp={handleGridMouseUp}
                        handleGridMouseLeave={handleGridMouseLeave}
                        setIsDragging={setIsDragging}
                    />
                ) : (
                    <div style={{ flex: 1, position: 'relative', backgroundColor: '#000' }}>
                        <PixiStage
                            mapWidth={mapWidth}
                            mapHeight={mapHeight}
                            tileSize={TILE_SIZE}
                            tileMapData={tileMapData}
                            objectMapData={playModeObjectData}
                            secretMapData={playModeSecretData}
                            revealedSecrets={revealedSecrets}
                            registryItems={registryItems}
                            playerState={gameEngineState}
                            playerVisuals={playerVisuals}
                            backgroundImage={selectedBackgroundImage}
                            backgroundColor={selectedBackgroundColor}
                            backgroundParallaxFactor={backgroundParallaxFactor}
                            projectiles={gameEngineState?.projectiles || EMPTY_ARRAY}
                            healthBarEnabled={true}
                            oxygenBarEnabled={true}
                            lavaBarEnabled={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

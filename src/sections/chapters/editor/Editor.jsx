import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getRegistry } from '../../../engine/registry';
import { TILE_SIZE } from '../../../constants/gameConstants';
import { resizeMapData } from './editorTools/mapOperations';
import { loadBackgroundOptions, loadMusicOptions } from './assetLoaders';
import { Viewport } from './Viewport';
import { NewMapModal } from './editorTools/NewMapModal';
import { EditorScene } from './EditorScene';
import { EditorElements } from './EditorElements';
import { EditorTools } from './EditorTools';
import PixiStage from '../game/PixiStage';
import styled from 'styled-components';

// Custom Hooks
import { useEditorRegistry } from './hooks/useEditorRegistry';
import { useEditorSelection } from './hooks/useEditorSelection';
import { useEditorPlayMode } from './hooks/useEditorPlayMode';
import { useEditorOperations } from './hooks/useEditorOperations';
import { useEditorPainting } from './hooks/useEditorPainting';
import { useEditorMaps } from './hooks/useEditorMaps';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const MessageOverlay = styled.div`
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    text-align: center;
    pointer-events: none;
    z-index: 1500;
    
    h2 {
        font-size: 48px;
        color: white;
        text-shadow: 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5);
        margin: 0;
        padding: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 800;
        letter-spacing: 2px;
        opacity: ${props => props.$isVisible ? 1 : 0};
        transition: opacity 2s ease-in-out;
    }
`;

const GameOverOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 2500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.5s ease-out;

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

const GameOverTitle = styled.h1`
    font-size: 72px;
    margin: 0 0 30px 0;
    text-transform: uppercase;
    letter-spacing: 5px;
    color: #ff4444;
    text-shadow: 0 0 20px rgba(255, 0, 0, 0.5), 0 5px 15px rgba(0,0,0,0.8);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 900;
`;

const ReplayButton = styled.button`
    padding: 18px 50px;
    font-size: 28px;
    background: linear-gradient(180deg, #4CAF50, #2E7D32);
    color: white;
    border: 2px solid #fff;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    outline: none;

    &:hover {
        background: linear-gradient(180deg, #66BB6A, #388E3C);
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }

    &:active {
        transform: scale(0.98) translateY(0);
    }
`;

export const Editor = () => {
    const registryItems = useMemo(() => getRegistry() || [], []);
    const playerVisuals = useMemo(() => registryItems.find(item => item.id === 'player') || EMPTY_OBJECT, [registryItems]);

    // Basic Map State
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    const [tileMapData, setTileMapData] = useState([]);
    const [objectMapData, setObjectMapData] = useState([]);
    const [secretMapData, setSecretMapData] = useState([]);
    const [objectMetadata, setObjectMetadata] = useState({});
    const [selectedTile, setSelectedTile] = useState(null);
    const [showGrid, setShowGrid] = useState(true);
    const [showBackgroundImage, setShowBackgroundImage] = useState(true);

    // Tools & Modes State
    const [isDragging, setIsDragging] = useState(false);
    const [brushSize, setBrushSize] = useState(1);
    const [activeTool, setActiveTool] = useState('brush');
    const [activeLayer, setActiveLayer] = useState('tile');
    const [dragStart, setDragStart] = useState(null);
    const stateRef = useRef({ mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata });

    // Metadata State
    const [mapName, setMapName] = useState("New Map");
    const [creatorName, setCreatorName] = useState("Anonymous");
    const [createdAt, setCreatedAt] = useState(null);
    const [highlightedIndex, setHighlightedIndex] = useState(null);
    const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);
    const [isResizeWindowOpen, setIsResizeWindowOpen] = useState(false);
    const [tempMapName, setTempMapName] = useState("");
    const [tempCreatorName, setTempCreatorName] = useState("");
    const [activePanel, setActivePanel] = useState(null);

    // Asset Options
    const backgroundOptions = useMemo(() => loadBackgroundOptions(), []);
    const musicOptions = useMemo(() => loadMusicOptions(), []);

    // Background State
    const [selectedBackgroundImage, setSelectedBackgroundImage] = useState(null);
    const [backgroundParallaxFactor, setBackgroundParallaxFactor] = useState(0.3);
    const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#99C1F1');
    const [selectedBackgroundMusic, setSelectedBackgroundMusic] = useState(null);

    // Weather State
    const [weatherRain, setWeatherRain] = useState(0);
    const [weatherSnow, setWeatherSnow] = useState(0);
    const [weatherClouds, setWeatherClouds] = useState(0);
    const [weatherFog, setWeatherFog] = useState(0);
    const [weatherThunder, setWeatherThunder] = useState(0);

    const [playerPosition, setPlayerPosition] = useState({ x: 100, y: 100 });

    // Multi-map state
    const { 
        maps, setMaps, activeMapId, setActiveMapId, createMap: createNewMap, updateMapData, deleteMap 
    } = useEditorMaps();

    const switchMap = useCallback((newMapId, spawnTriggerId = null) => {
        if (newMapId === activeMapId) return;

        // 1. Save current map data to store
        updateMapData(activeMapId, {
            mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
            mapName, creatorName, createdAt,
            selectedBackgroundImage, selectedBackgroundColor,
            backgroundParallaxFactor, selectedBackgroundMusic,
            weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
            playerPosition
        });

        // 2. Load new map data
        const nextMap = maps[newMapId];
        if (nextMap) {
            setMapWidth(nextMap.mapWidth);
            setMapHeight(nextMap.mapHeight);
            setTileMapData(nextMap.tileMapData);
            setObjectMapData(nextMap.objectMapData);
            setSecretMapData(nextMap.secretMapData);
            setObjectMetadata(nextMap.objectMetadata || {});
            setMapName(nextMap.name);
            setCreatedAt(nextMap.createdAt || new Date().toISOString());
            setSelectedBackgroundImage(nextMap.selectedBackgroundImage);
            setSelectedBackgroundColor(nextMap.selectedBackgroundColor);
            setBackgroundParallaxFactor(nextMap.backgroundParallaxFactor || 0.3);
            setSelectedBackgroundMusic(nextMap.selectedBackgroundMusic);
            
            if (nextMap.weather) {
                setWeatherRain(nextMap.weather.rain || 0);
                setWeatherSnow(nextMap.weather.snow || 0);
                setWeatherClouds(nextMap.weather.clouds || 0);
                setWeatherFog(nextMap.weather.fog || 0);
                setWeatherThunder(nextMap.weather.thunder || 0);
            }
            
            if (nextMap.playerPosition) {
                setPlayerPosition(nextMap.playerPosition);
            }
            
            // If we have a spawnTriggerId, we might want to store it temporarily
            // so useEditorPlayMode can include it in mapDataForGame.meta
            // But actually, we can just update the map data in the store with this triggerId.
            if (spawnTriggerId !== null) {
                updateMapData(newMapId, { ...nextMap, spawnTriggerId });
            }

            setActiveMapId(newMapId);
        }
    }, [
        activeMapId, maps, updateMapData, setActiveMapId,
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
        mapName, creatorName, createdAt,
        selectedBackgroundImage, selectedBackgroundColor,
        backgroundParallaxFactor, selectedBackgroundMusic,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        playerPosition
    ]);

    const handleCreateMap = useCallback((type) => {
        const name = prompt(`Enter ${type} map name:`, `New ${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (name) {
            const newId = createNewMap(type, name, mapWidth, mapHeight);
            // Optionally switch to it immediately
            // switchMap(newId); 
        }
    }, [createNewMap, mapWidth, mapHeight]);

    // Update store when current map data changes (for minimap preview)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateMapData(activeMapId, {
                mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
                name: mapName,
                selectedBackgroundImage, selectedBackgroundColor
            });
        }, 1000); // Debounce store updates
        return () => clearTimeout(timeout);
    }, [activeMapId, updateMapData, mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, mapName, selectedBackgroundImage, selectedBackgroundColor]);

    const selectedBgOption = backgroundOptions.find((bg) => bg.metaPath === selectedBackgroundImage) || backgroundOptions[0];
    const selectedBackgroundUrl = selectedBgOption && selectedBackgroundImage ? selectedBgOption.src : null;

    // Use Custom Hooks
    const { 
        blocks, liquids, entities, decorations, items, interactables, hazards, secrets, weather, messages, alternativeSecrets, obstacles 
    } = useEditorRegistry(registryItems);

    const {
        selection, setSelection, selectionMode, setSelectionMode, previewPosition, setPreviewPosition,
        originalMapData, setOriginalMapData, moveSelection, commitSelection, cancelSelection
    } = useEditorSelection(mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, setTileMapData, setObjectMapData, setSecretMapData);

    const {
        isPlayMode, handlePlay, handlePause, handleReset, handleReplay,
        playModeObjectData, playModeSecretData, playModeWeather, gameMessage, revealedSecrets, gameEngineState, isGameOver
    } = useEditorPlayMode(
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, 
        selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, 
        registryItems, playerPosition, setPlayerPosition, setObjectMetadata,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        maps, activeMapId, switchMap, maps[activeMapId]?.spawnTriggerId,
        setTileMapData
    );

    const {
        handleSaveMap, handleLoadMap, handleClearMap, openNewMapModal, confirmNewMap
    } = useEditorOperations(
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
        mapName, creatorName, createdAt, selectedBackgroundImage, selectedBackgroundColor,
        backgroundParallaxFactor, selectedBackgroundMusic, registryItems, setCreatedAt,
        setMapWidth, setMapHeight, setMapName, setCreatorName,
        setSelectedBackgroundImage, setSelectedBackgroundColor,
        setBackgroundParallaxFactor, setSelectedBackgroundMusic,
        setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
        setIsNewMapModalOpen, setTempMapName, setTempCreatorName,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder,
        maps, setMaps, activeMapId, setActiveMapId
    );

    const {
        hoverIndex, setHoverIndex, bucketPreviewIndices, setBucketPreviewIndices,
        handleGridMouseDown, handleGridMouseMove, paintTile
    } = useEditorPainting(
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, 
        setTileMapData, setObjectMapData, setSecretMapData,
        activeTool, brushSize, activeLayer, selectedTile, selection, 
        setSelection, setPreviewPosition, setOriginalMapData, setDragStart, isDragging, setIsDragging,
        setActivePanel, setHighlightedIndex, registryItems
    );

    // Side Effects
    useEffect(() => {
        stateRef.current = { mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata };
    }, [mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata]);

    useEffect(() => {
        const size = 15 * 20;
        setTileMapData(Array(size).fill(null));
        setObjectMapData(Array(size).fill(null));
        setSecretMapData(Array(size).fill(null));
    }, []);

    const togglePanel = (panel) => {
        setActivePanel(prev => prev === panel ? null : panel);
    };

    const handleMapResize = (newWidth, newHeight) => {
        if (newWidth === mapWidth && newHeight === mapHeight) return;
        resizeMapData({
            newWidth, newHeight, stateRef, setMapWidth, setMapHeight,
            setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata
        });
    };

    const handlePaletteSelect = (item, layer) => {
        setSelectedTile(item);
        setActiveLayer(layer);
        setActiveTool('brush');
        setSelection(null);
    };

    // Grid Event Handlers
    const handleGridMouseEnter = (index) => handleGridMouseMove(index);
    
    const handleGridMouseUp = (index) => {
        if (activeTool === 'move' && isDragging && dragStart && index !== null) {
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

            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    const idx = y * mapWidth + x;
                    tileData.push(tileMapData[idx]);
                    objectData.push(objectMapData[idx]);
                    secretData.push(secretMapData[idx]);
                }
            }

            setSelection({
                x: x1, y: y1, w, h,
                originalX: x1, originalY: y1,
                tileData, objectData, secretData
            });
            setPreviewPosition({ x: x1, y: y1 });
            setOriginalMapData({
                tileMap: [...tileMapData],
                objectMap: [...objectMapData],
                secretMap: [...secretMapData]
            });
            setDragStart(null);
        }
        setIsDragging(false);
    };

    const handleGridMouseLeave = () => {
        setHoverIndex(null);
        setBucketPreviewIndices(new Set());
    };

    const totalTiles = mapWidth * mapHeight;
    const filledBlocks = tileMapData.filter(t => t !== null).length;
    const emptyBlocks = totalTiles - filledBlocks;
    const objectsCount = objectMapData.filter(o => o !== null).length;

    return (
        <div className="editor-wrapper" style={{ position: 'relative', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <NewMapModal
                isOpen={isNewMapModalOpen}
                tempMapName={tempMapName}
                setTempMapName={setTempMapName}
                tempCreatorName={tempCreatorName}
                setTempCreatorName={setTempCreatorName}
                confirmNewMap={() => confirmNewMap(tempMapName, tempCreatorName)}
                onClose={() => setIsNewMapModalOpen(false)}
            />

            <div className="editor-container" style={{
                display: 'flex', flex: 1, flexDirection: 'row',
                filter: isNewMapModalOpen ? 'blur(4px) brightness(0.7)' : 'none',
                transition: 'filter 0.2s ease',
                pointerEvents: isNewMapModalOpen ? 'none' : 'auto',
                overflow: 'hidden'
            }}>
                <EditorElements
                    mapName={mapName}
                    creatorName={creatorName}
                    openNewMapModal={openNewMapModal}
                    saveMap={handleSaveMap}
                    loadMap={handleLoadMap}
                    clearMap={handleClearMap}
                    isPlayMode={isPlayMode}
                    handlePaletteSelect={handlePaletteSelect}
                    selectedTile={selectedTile}
                    blocks={blocks}
                    liquids={liquids}
                    entities={entities}
                    items={items}
                    decorations={decorations}
                    interactables={interactables}
                    hazards={hazards}
                    secrets={secrets}
                    weather={weather}
                    messages={messages}
                    alternativeSecrets={alternativeSecrets}
                    obstacles={obstacles}
                    totalTiles={totalTiles}
                    filledBlocks={filledBlocks}
                    emptyBlocks={emptyBlocks}
                    objectsCount={objectsCount}
                    mapWidth={mapWidth}
                    mapHeight={mapHeight}
                    objectMapData={objectMapData}
                    objectMetadata={objectMetadata}
                    setObjectMetadata={setObjectMetadata}
                    registryItems={registryItems}
                    highlightedIndex={highlightedIndex}
                    setHighlightedIndex={setHighlightedIndex}
                    activePanel={activePanel}
                    setActivePanel={setActivePanel}
                    togglePanel={togglePanel}
                    maps={maps}
                />

                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                    <EditorTools
                        mapName={mapName}
                        creatorName={creatorName}
                        activePanel={activePanel}
                        togglePanel={togglePanel}
                        showGrid={showGrid}
                        setShowGrid={setShowGrid}
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
                        selectionMode={selectionMode}
                        setSelectionMode={setSelectionMode}
                        commitSelection={commitSelection}
                        cancelSelection={cancelSelection}
                        selectedTile={selectedTile}
                        handlePaletteSelect={handlePaletteSelect}
                        selectedBackgroundColor={selectedBackgroundColor}
                        setSelectedBackgroundColor={setSelectedBackgroundColor}
                        showBackgroundImage={showBackgroundImage}
                        setShowBackgroundImage={setShowBackgroundImage}
                    />
                    
                    <div style={{ display: 'flex', flex: 1, flexDirection: 'row', overflow: 'hidden' }}>

                    <EditorScene 
                        handleMapResize={handleMapResize}
                        isResizeWindowOpen={isResizeWindowOpen}
                        setIsResizeWindowOpen={setIsResizeWindowOpen}
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        tileMapData={tileMapData}
                        objectMapData={objectMapData}
                        objectMetadata={objectMetadata}
                        registryItems={registryItems}
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
                        weatherRain={weatherRain}
                        setWeatherRain={setWeatherRain}
                        weatherSnow={weatherSnow}
                        setWeatherSnow={setWeatherSnow}
                        weatherClouds={weatherClouds}
                        setWeatherClouds={setWeatherClouds}
                        weatherFog={weatherFog}
                        setWeatherFog={setWeatherFog}
                        weatherThunder={weatherThunder}
                        setWeatherThunder={setWeatherThunder}
                        // Multi-map props
                        maps={maps}
                        activeMapId={activeMapId}
                        switchMap={switchMap}
                        createMap={handleCreateMap}
                        deleteMap={deleteMap}
                        updateMapData={updateMapData}
                    />

                    {!isPlayMode ? (
                        <Viewport
                            mapWidth={mapWidth}
                            mapHeight={mapHeight}
                            selectedBackgroundUrl={selectedBackgroundUrl}
                            selectedBackgroundColor={selectedBackgroundColor}
                            selectedBackgroundImage={selectedBackgroundImage}
                            showBackgroundImage={showBackgroundImage}
                            showGrid={showGrid}
                            activeLayer={activeLayer}
                            activeTool={activeTool}
                            tileMapData={tileMapData}
                            objectMapData={objectMapData}
                            secretMapData={secretMapData}
                            objectMetadata={objectMetadata}
                            registryItems={registryItems}
                            hoverIndex={hoverIndex}
                            highlightedIndex={highlightedIndex}
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
                            weatherRain={weatherRain}
                            weatherSnow={weatherSnow}
                            weatherClouds={weatherClouds}
                            weatherFog={weatherFog}
                            weatherThunder={weatherThunder}
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
                                revealedSecrets={revealedSecrets || []}
                                registryItems={registryItems}
                                playerState={gameEngineState}
                                playerVisuals={playerVisuals}
                                projectiles={gameEngineState?.projectiles || []}
                                objectMetadata={objectMetadata}
                                backgroundImage={showBackgroundImage ? selectedBackgroundImage : null}
                                backgroundColor={selectedBackgroundColor}
                                backgroundParallaxFactor={backgroundParallaxFactor}
                                weatherRain={playModeWeather.rain}
                                weatherSnow={playModeWeather.snow}
                                weatherClouds={playModeWeather.clouds}
                                weatherFog={playModeWeather.fog}
                                weatherThunder={playModeWeather.thunder}
                                isEditor={false}
                                isEditorPlayMode={true}
                                showGrid={showGrid}
                            />
                            {isGameOver && (
                                <GameOverOverlay>
                                    <GameOverTitle>Game Over</GameOverTitle>
                                    <ReplayButton onClick={handleReplay}>
                                        REPLAY ↻
                                    </ReplayButton>
                                </GameOverOverlay>
                            )}
                            {gameMessage.text && (
                                <MessageOverlay $isVisible={gameMessage.isVisible}>
                                    <h2>{gameMessage.text}</h2>
                                </MessageOverlay>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);
};

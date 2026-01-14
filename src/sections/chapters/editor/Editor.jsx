import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getRegistry } from '../../../engine/registry';
import { TILE_SIZE } from '../../../constants/gameConstants';
import { resizeMapData } from './editorTools/mapOperations';
import { loadBackgroundOptions, loadMusicOptions } from './assetLoaders';
import { Viewport } from './Viewport';
import { NewMapModal } from './editorTools/NewMapModal';
import { EditorScene } from './EditorScene';
import { EditorTools } from './EditorTools';
import PixiStage from '../game/PixiStage';

// Custom Hooks
import { useEditorRegistry } from './hooks/useEditorRegistry';
import { useEditorSelection } from './hooks/useEditorSelection';
import { useEditorPlayMode } from './hooks/useEditorPlayMode';
import { useEditorOperations } from './hooks/useEditorOperations';
import { useEditorPainting } from './hooks/useEditorPainting';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

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
    const [selectedBackgroundImage, setSelectedBackgroundImage] = useState(backgroundOptions[0]?.metaPath || null);
    const [backgroundParallaxFactor, setBackgroundParallaxFactor] = useState(0.3);
    const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#87CEEB');
    const [selectedBackgroundMusic, setSelectedBackgroundMusic] = useState(null);

    const [playerPosition, setPlayerPosition] = useState({ x: 100, y: 100 });

    const selectedBgOption = backgroundOptions.find((bg) => bg.metaPath === selectedBackgroundImage) || backgroundOptions[0];
    const selectedBackgroundUrl = selectedBgOption && selectedBackgroundImage ? selectedBgOption.src : null;

    // Use Custom Hooks
    const { 
        blocks, liquids, entities, decorations, items, interactables, hazards, secrets 
    } = useEditorRegistry(registryItems);

    const {
        selection, setSelection, selectionMode, setSelectionMode, previewPosition, setPreviewPosition,
        originalMapData, setOriginalMapData, moveSelection, commitSelection, cancelSelection
    } = useEditorSelection(mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, setTileMapData, setObjectMapData, setSecretMapData);

    const {
        isPlayMode, handlePlay, handlePause, handleReset, playModeObjectData, playModeSecretData, gameEngineState
    } = useEditorPlayMode(
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, 
        selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, 
        registryItems, playerPosition, setPlayerPosition, setObjectMetadata
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
        setIsNewMapModalOpen, setTempMapName, setTempCreatorName
    );

    const {
        hoverIndex, setHoverIndex, bucketPreviewIndices, setBucketPreviewIndices,
        handleGridMouseDown, handleGridMouseMove, paintTile
    } = useEditorPainting(
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, 
        setTileMapData, setObjectMapData, setSecretMapData,
        activeTool, brushSize, activeLayer, selectedTile, selection, 
        setSelection, setPreviewPosition, setOriginalMapData, setDragStart, setIsDragging
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
        setIsDragging(false);
        // Add more logic if needed
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
                display: 'flex', flex: 1, flexDirection: 'column',
                filter: isNewMapModalOpen ? 'blur(4px) brightness(0.7)' : 'none',
                transition: 'filter 0.2s ease',
                pointerEvents: isNewMapModalOpen ? 'none' : 'auto',
                overflow: 'hidden'
            }}>
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
                />
                
                <div style={{ display: 'flex', flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
                    <EditorScene
                        mapName={mapName}
                        creatorName={creatorName}
                        handleMapResize={handleMapResize}
                        isResizeWindowOpen={isResizeWindowOpen}
                        setIsResizeWindowOpen={setIsResizeWindowOpen}
                        openNewMapModal={openNewMapModal}
                        saveMap={handleSaveMap}
                        loadMap={handleLoadMap}
                        clearMap={handleClearMap}
                        isPlayMode={isPlayMode}
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
                        decorations={decorations}
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
                        objectMetadata={objectMetadata}
                        setObjectMetadata={setObjectMetadata}
                        registryItems={registryItems}
                        highlightedIndex={highlightedIndex}
                        setHighlightedIndex={setHighlightedIndex}
                        activePanel={activePanel}
                        setActivePanel={setActivePanel}
                        togglePanel={togglePanel}
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
                                revealedSecrets={[]}
                                registryItems={registryItems}
                                playerState={gameEngineState}
                                playerVisuals={playerVisuals}
                                objectMetadata={objectMetadata}
                                backgroundImage={selectedBackgroundImage}
                                backgroundColor={selectedBackgroundColor}
                                backgroundParallaxFactor={backgroundParallaxFactor}
                                isPlayMode={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

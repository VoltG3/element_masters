import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { MapResizer } from './scene/MapResizer';
import { Minimap } from './tools/Minimap';
import { sidebarButtonStyle, activeSidebarButtonStyle, panelHeaderStyle } from './constants';

// Panels
import { OperationsPanel } from './scene/OperationsPanel';
import { PalettePanel } from './scene/PalettePanel';
import { BackgroundPanel } from './scene/BackgroundPanel';
import { MusicPanel } from './scene/MusicPanel';
import { StatisticsPanel } from './scene/StatisticsPanel';
import { ObjectPropsPanel } from './scene/ObjectPropsPanel';

export const NavigationScene = ({
    mapName,
    creatorName,
    handleMapResize,
    isResizeWindowOpen,
    setIsResizeWindowOpen,
    openNewMapModal,
    saveMap,
    loadMap,
    clearMap,
    isPlayMode,
    activeTool,
    setActiveTool,
    brushSize,
    setBrushSize,
    activeLayer,
    selection,
    moveSelection,
    setSelection,
    selectionMode,
    setSelectionMode,
    commitSelection,
    cancelSelection,
    selectedTile,
    handlePaletteSelect,
    blocks,
    liquids,
    entities,
    items,
    decorations,
    interactables,
    hazards,
    secrets,
    backgroundOptions,
    selectedBackgroundImage,
    setSelectedBackgroundImage,
    selectedBackgroundColor,
    setSelectedBackgroundColor,
    backgroundParallaxFactor,
    setBackgroundParallaxFactor,
    musicOptions,
    selectedBackgroundMusic,
    setSelectedBackgroundMusic,
    totalTiles,
    filledBlocks,
    emptyBlocks,
    objectsCount,
    mapWidth,
    mapHeight,
    tileMapData,
    objectMapData,
    objectMetadata,
    setObjectMetadata,
    registryItems,
    highlightedIndex,
    setHighlightedIndex,
    activePanel,
    setActivePanel,
    togglePanel
}) => {
    const [isMinimapOpen, setIsMinimapOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const rightSidebarStyle = {
        position: 'absolute',
        top: '70px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1001
    };

    const panelTitles = {
        map: 'Operations',
        palette: 'Palette',
        background: 'Background',
        music: 'Music',
        stats: 'Statistics',
        props: 'Object Properties'
    };

    return (
        <div style={{ display: 'contents' }}>
            {/* Sidebar Left Icons */}
            <div style={{
                width: '60px',
                height: '100%',
                backgroundColor: '#222',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '10px',
                zIndex: 1001,
                borderRight: '1px solid #000',
                flexShrink: 0
            }}>
                <div onClick={() => togglePanel('map')} style={activePanel === 'map' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Map Controls">⚙️</div>
                <div onClick={() => togglePanel('palette')} style={activePanel === 'palette' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Palette">🧱</div>
                <div onClick={() => togglePanel('background')} style={activePanel === 'background' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Background">🖼️</div>
                <div onClick={() => togglePanel('music')} style={activePanel === 'music' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Music">🎵</div>
                <div onClick={() => togglePanel('stats')} style={activePanel === 'stats' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Statistics">📊</div>
                <div onClick={() => togglePanel('props')} style={activePanel === 'props' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Object Properties">📋</div>
            </div>

            {/* Sidebar Fixed Panel Content */}
            {activePanel && (
                <div style={{
                    width: '320px',
                    height: '100%',
                    backgroundColor: '#fff',
                    borderRight: '1px solid #ddd',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    zIndex: 1000,
                    transition: 'width 0.2s ease'
                }}>
                    {/* Panel Header */}
                    <div style={panelHeaderStyle}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{panelTitles[activePanel]}</span>
                        <button 
                            onClick={() => setActivePanel(null)} 
                            style={{ 
                                border: 'none', 
                                background: 'none', 
                                cursor: 'pointer', 
                                fontSize: '16px', 
                                padding: '0 5px',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >✕</button>
                    </div>

                    {/* Panel Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {activePanel === 'map' && (
                            <OperationsPanel 
                                openNewMapModal={openNewMapModal}
                                saveMap={saveMap}
                                loadMap={loadMap}
                                clearMap={clearMap}
                                mapName={mapName}
                                creatorName={creatorName}
                            />
                        )}

                        {activePanel === 'palette' && (
                            <PalettePanel 
                                isPlayMode={isPlayMode}
                                blocks={blocks}
                                liquids={liquids}
                                entities={entities}
                                decorations={decorations}
                                items={items}
                                interactables={interactables}
                                hazards={hazards}
                                secrets={secrets}
                                handlePaletteSelect={handlePaletteSelect}
                                selectedTile={selectedTile}
                            />
                        )}

                        {activePanel === 'background' && (
                            <BackgroundPanel 
                                backgroundOptions={backgroundOptions}
                                selectedBackgroundImage={selectedBackgroundImage}
                                setSelectedBackgroundImage={setSelectedBackgroundImage}
                                selectedBackgroundColor={selectedBackgroundColor}
                                backgroundParallaxFactor={backgroundParallaxFactor}
                                setBackgroundParallaxFactor={setBackgroundParallaxFactor}
                            />
                        )}

                        {activePanel === 'music' && (
                            <MusicPanel 
                                musicOptions={musicOptions}
                                selectedBackgroundMusic={selectedBackgroundMusic}
                                setSelectedBackgroundMusic={setSelectedBackgroundMusic}
                            />
                        )}

                        {activePanel === 'stats' && (
                            <StatisticsPanel 
                                totalTiles={totalTiles}
                                mapWidth={mapWidth}
                                mapHeight={mapHeight}
                                filledBlocks={filledBlocks}
                                objectsCount={objectsCount}
                                emptyBlocks={emptyBlocks}
                            />
                        )}

                        {activePanel === 'props' && (
                            <ObjectPropsPanel 
                                objectMapData={objectMapData}
                                registryItems={registryItems}
                                mapWidth={mapWidth}
                                objectMetadata={objectMetadata}
                                highlightedIndex={highlightedIndex}
                                setHighlightedIndex={setHighlightedIndex}
                                setObjectMetadata={setObjectMetadata}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Right side buttons */}
            <div style={rightSidebarStyle}>
                <div onClick={() => setIsMinimapOpen(!isMinimapOpen)} style={isMinimapOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Minimap">🗺️</div>
                <div onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={isSettingsOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Settings">🛠️</div>
                <div onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} style={isResizeWindowOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Resize Map">📐</div>
            </div>

            {/* Floating Windows (Minimap / Settings) */}
            {isMinimapOpen && (
                <DraggableWindow
                    title="Minimap"
                    defaultPosition={{ x: window.innerWidth - 340, y: 80 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsMinimapOpen(false)}
                >
                    <Minimap
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        tileMapData={tileMapData}
                        objectMapData={objectMapData}
                        objectMetadata={objectMetadata}
                        registryItems={registryItems}
                    />
                </DraggableWindow>
            )}

            {isSettingsOpen && (
                <DraggableWindow
                    title="Settings"
                    defaultPosition={{ x: window.innerWidth - 340, y: 400 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsSettingsOpen(false)}
                >
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>empty</div>
                </DraggableWindow>
            )}

            {isResizeWindowOpen && (
                <DraggableWindow
                    title="Resize Map"
                    defaultPosition={{ x: 400, y: 100 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsResizeWindowOpen(false)}
                >
                    <MapResizer
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        onResize={handleMapResize}
                    />
                </DraggableWindow>
            )}
        </div>
    );
};

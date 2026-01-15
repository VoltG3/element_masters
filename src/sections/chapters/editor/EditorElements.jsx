import React from 'react';
import { sidebarButtonStyle, activeSidebarButtonStyle, panelHeaderStyle } from './styles/EditorElementsButtonStyle';

// Panels
import { OperationsPanel } from './editorElements/OperationsPanel';
import { PalettePanel } from './editorElements/PalettePanel';
import { BackgroundPanel } from './editorElements/BackgroundPanel';
import { MusicPanel } from './editorElements/MusicPanel';
import { StatisticsPanel } from './editorElements/StatisticsPanel';
import { ObjectPropsPanel } from './editorElements/ObjectPropsPanel';

export const EditorElements = ({
    mapName,
    creatorName,
    openNewMapModal,
    saveMap,
    loadMap,
    clearMap,
    isPlayMode,
    handlePaletteSelect,
    selectedTile,
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
        </div>
    );
};

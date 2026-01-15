import React from 'react';
import { 
    SidebarContainer,
    ElementEditorButton,
    PanelContainer,
    PanelHeader,
    PanelBody,
    CloseButton
} from './styles/EditorElementsButtonStyle';

// Panels
import { OperationsPanel } from './editorElements/OperationsPanel';
import { PalettePanel } from './editorElements/PalettePanel';
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
        stats: 'Statistics',
        props: 'Object Properties'
    };

    return (
        <div style={{ display: 'contents' }}>
            {/* Sidebar Left Icons */}
            <SidebarContainer>
                <ElementEditorButton onClick={() => togglePanel('map')} $active={activePanel === 'map'} title="Map Controls">⚙️</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('palette')} $active={activePanel === 'palette'} title="Palette">🧱</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('stats')} $active={activePanel === 'stats'} title="Statistics">📊</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('props')} $active={activePanel === 'props'} title="Object Properties">📋</ElementEditorButton>
            </SidebarContainer>

            {/* Sidebar Fixed Panel Content */}
            {activePanel && (
                <PanelContainer>
                    {/* Panel Header */}
                    <PanelHeader>
                        <span>{panelTitles[activePanel]}</span>
                        <CloseButton onClick={() => setActivePanel(null)}>✕</CloseButton>
                    </PanelHeader>

                    {/* Panel Body */}
                    <PanelBody>
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
                    </PanelBody>
                </PanelContainer>
            )}
        </div>
    );
};

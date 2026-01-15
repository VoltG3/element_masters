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
    obstacles,
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
        blocks: 'Blocks',
        liquids: 'Liquids (Blocks)',
        decorations: 'Decorations',
        entities: 'Entities (Objects)',
        items: 'Items (Objects)',
        interactables: 'Interactables',
        hazards: 'Hazards',
        secrets: 'Secrets',
        obstacles: 'Obstacles',
        stats: 'Statistics',
        props: 'Object Properties'
    };

    return (
        <div style={{ display: 'contents' }}>
            {/* Sidebar Left Icons */}
            <SidebarContainer>
                <ElementEditorButton onClick={() => togglePanel('map')} $active={activePanel === 'map'} title="Map Controls">⚙️</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('blocks')} $active={activePanel === 'blocks'} title="Blocks">🧱</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('liquids')} $active={activePanel === 'liquids'} title="Liquids">💧</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('decorations')} $active={activePanel === 'decorations'} title="Decorations">🏺</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('entities')} $active={activePanel === 'entities'} title="Entities">👾</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('items')} $active={activePanel === 'items'} title="Items">✨</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('interactables')} $active={activePanel === 'interactables'} title="Interactables">🚪</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('hazards')} $active={activePanel === 'hazards'} title="Hazards">☠️</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('secrets')} $active={activePanel === 'secrets'} title="Secrets">🕵️</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('obstacles')} $active={activePanel === 'obstacles'} title="Obstacles">🌲</ElementEditorButton>
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

                        {(activePanel === 'blocks' || 
                          activePanel === 'liquids' || 
                          activePanel === 'decorations' || 
                          activePanel === 'entities' || 
                          activePanel === 'items' || 
                          activePanel === 'interactables' || 
                          activePanel === 'hazards' || 
                          activePanel === 'secrets' ||
                          activePanel === 'obstacles') && (
                            <PalettePanel 
                                isPlayMode={isPlayMode}
                                category={activePanel}
                                blocks={blocks}
                                liquids={liquids}
                                entities={entities}
                                decorations={decorations}
                                items={items}
                                interactables={interactables}
                                hazards={hazards}
                                secrets={secrets}
                                obstacles={obstacles}
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

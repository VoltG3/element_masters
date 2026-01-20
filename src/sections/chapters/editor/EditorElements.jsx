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
    mapDescription,
    setMapName,
    setCreatorName,
    setMapDescription,
    openNewMapModal,
    openBuiltInModal,
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
    weather,
    messages,
    alternativeSecrets,
    obstacles,
    totalTiles,
    filledBlocks,
    emptyBlocks,
    objectsCount,
    mapWidth,
    mapHeight,
    objectMapData,
    secretMapData,
    objectMetadata,
    setObjectMetadata,
    registryItems,
    highlightedIndex,
    setHighlightedIndex,
    activePanel,
    setActivePanel,
    togglePanel,
    maps,
    createMap
}) => {
    const [lastPanel, setLastPanel] = React.useState(null);

    React.useEffect(() => {
        if (activePanel) {
            setLastPanel(activePanel);
        }
    }, [activePanel]);

    const displayPanel = activePanel || lastPanel;

    const panelTitles = {
        map: 'Operations',
        blocks: 'Blocks',
        liquids: 'Liquids (Blocks)',
        decorations: 'Decorations',
        entities: 'Entities (Objects)',
        items: 'Items (Objects)',
        interactables: 'Interactables',
        hazards: 'Hazards',
        secrets: 'Sectors',
        obstacles: 'Obstacles',
        stats: 'Statistics',
        props: 'Object Properties'
    };

    return (
        <div style={{ display: 'flex', height: '100%', position: 'relative', zIndex: 1001 }}>
            {/* Sidebar Left Icons */}
            <SidebarContainer>
                <ElementEditorButton onClick={() => togglePanel('map')} $active={activePanel === 'map'} title="Map Controls">⚙️</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('blocks')} $active={activePanel === 'blocks'} title="Blocks">🧱</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('liquids')} $active={activePanel === 'liquids'} title="Liquids">💧</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('decorations')} $active={activePanel === 'decorations'} title="Decorations">🌲</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('obstacles')} $active={activePanel === 'obstacles'} title="Obstacles">🏺</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('items')} $active={activePanel === 'items'} title="Items">✨</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('entities')} $active={activePanel === 'entities'} title="Entities">👾</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('interactables')} $active={activePanel === 'interactables'} title="Interactables">🚪</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('hazards')} $active={activePanel === 'hazards'} title="Hazards">☠️</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('secrets')} $active={activePanel === 'secrets'} title="Sectors">√2</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('stats')} $active={activePanel === 'stats'} title="Statistics">📊</ElementEditorButton>
                <ElementEditorButton onClick={() => togglePanel('props')} $active={activePanel === 'props'} title="Object Properties">📋</ElementEditorButton>
            </SidebarContainer>

            {/* Sidebar Fixed Panel Content */}
            <PanelContainer $isOpen={!!activePanel}>
                {displayPanel && (
                    <>
                        {/* Panel Header */}
                        <PanelHeader>
                            <span>{panelTitles[displayPanel]}</span>
                            <CloseButton onClick={() => setActivePanel(null)}>✕</CloseButton>
                        </PanelHeader>

                        {/* Panel Body */}
                        <PanelBody>
                            {displayPanel === 'map' && (
                                <OperationsPanel 
                                    openNewMapModal={openNewMapModal}
                                    openBuiltInModal={openBuiltInModal}
                                    saveMap={saveMap}
                                    loadMap={loadMap}
                                    clearMap={clearMap}
                                    mapName={mapName}
                                    creatorName={creatorName}
                                    mapDescription={mapDescription}
                                    setMapName={setMapName}
                                    setCreatorName={setCreatorName}
                                    setMapDescription={setMapDescription}
                                />
                            )}

                            {(displayPanel === 'blocks' || 
                              displayPanel === 'liquids' || 
                              displayPanel === 'decorations' || 
                              displayPanel === 'entities' || 
                              displayPanel === 'items' || 
                              displayPanel === 'interactables' || 
                              displayPanel === 'hazards' || 
                              displayPanel === 'secrets' ||
                              displayPanel === 'obstacles') && (
                                <PalettePanel 
                                    isPlayMode={isPlayMode}
                                    category={displayPanel}
                                    blocks={blocks}
                                    liquids={liquids}
                                    entities={entities}
                                    decorations={decorations}
                                    items={items}
                                    interactables={interactables}
                                    hazards={hazards}
                                    secrets={secrets}
                                    weather={weather}
                                    messages={messages}
                                    alternativeSecrets={alternativeSecrets}
                                    obstacles={obstacles}
                                    handlePaletteSelect={handlePaletteSelect}
                                    selectedTile={selectedTile}
                                />
                            )}


                            {displayPanel === 'stats' && (
                                <StatisticsPanel 
                                    totalTiles={totalTiles}
                                    mapWidth={mapWidth}
                                    mapHeight={mapHeight}
                                    filledBlocks={filledBlocks}
                                    objectsCount={objectsCount}
                                    emptyBlocks={emptyBlocks}
                                />
                            )}

                            {displayPanel === 'props' && (
                                <ObjectPropsPanel 
                                    objectMapData={objectMapData}
                                    secretMapData={secretMapData}
                                    registryItems={registryItems}
                                    mapWidth={mapWidth}
                                    objectMetadata={objectMetadata}
                                    highlightedIndex={highlightedIndex}
                                    setHighlightedIndex={setHighlightedIndex}
                                    setObjectMetadata={setObjectMetadata}
                                    maps={maps}
                                    createMap={createMap}
                                />
                            )}
                        </PanelBody>
                    </>
                )}
            </PanelContainer>
        </div>
    );
};

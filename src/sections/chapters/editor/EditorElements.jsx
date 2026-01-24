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
    activeMapId,
    createMap
}) => {
    const [lastPanel, setLastPanel] = React.useState(null);
    const [pinnedPanel, setPinnedPanel] = React.useState(null);
    const hoverTimerRef = React.useRef(null);

    React.useEffect(() => {
        if (activePanel) {
            setLastPanel(activePanel);
        }
    }, [activePanel]);

    const displayPanel = activePanel || lastPanel;

    const clearHoverTimer = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    };

    const handleIconClick = (panel) => {
        clearHoverTimer();
        if (pinnedPanel === panel) {
            setPinnedPanel(null);
            setActivePanel(null);
            return;
        }
        setPinnedPanel(panel);
        setActivePanel(panel);
    };

    const handleIconMouseEnter = (panel) => {
        if (pinnedPanel) return;
        clearHoverTimer();
        setActivePanel(panel);
    };

    const handleIconMouseLeave = () => {
        if (pinnedPanel) return;
        clearHoverTimer();
        hoverTimerRef.current = setTimeout(() => {
            setActivePanel(null);
        }, 120);
    };

    const handlePanelMouseEnter = () => {
        if (pinnedPanel) return;
        clearHoverTimer();
    };

    const handlePanelMouseLeave = () => {
        if (pinnedPanel) return;
        clearHoverTimer();
        setActivePanel(null);
    };

    const panelTitles = {
        map: 'Operations',
        blocks: 'Blocks',
        liquids: 'Liquids (Blocks)',
        decorations: 'Decorations',
        entities: 'Entities',
        items: 'Items',
        interactables: 'Interactables',
        hazards: 'Hazards',
        secrets: 'Sectors',
        weather: 'Weather',
        messages: 'Messages',
        obstacles: 'Obstacles',
        stats: 'Statistics',
        props: 'Object Properties'
    };

    return (
        <div style={{ display: 'flex', height: '100%', position: 'relative', zIndex: 1001 }}>
            {/* Sidebar Left Icons */}
            <SidebarContainer>
                <ElementEditorButton onClick={() => handleIconClick('map')} onMouseEnter={() => handleIconMouseEnter('map')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'map'} title="Map Controls">⚙️</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('blocks')} onMouseEnter={() => handleIconMouseEnter('blocks')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'blocks'} title="Blocks">🧱</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('liquids')} onMouseEnter={() => handleIconMouseEnter('liquids')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'liquids'} title="Liquids">💧</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('decorations')} onMouseEnter={() => handleIconMouseEnter('decorations')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'decorations'} title="Decorations">🌲</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('obstacles')} onMouseEnter={() => handleIconMouseEnter('obstacles')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'obstacles'} title="Obstacles">🏺</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('items')} onMouseEnter={() => handleIconMouseEnter('items')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'items'} title="Items">✨</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('entities')} onMouseEnter={() => handleIconMouseEnter('entities')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'entities'} title="Entities">👾</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('interactables')} onMouseEnter={() => handleIconMouseEnter('interactables')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'interactables'} title="Interactables">🚪</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('hazards')} onMouseEnter={() => handleIconMouseEnter('hazards')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'hazards'} title="Hazards">☠️</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('secrets')} onMouseEnter={() => handleIconMouseEnter('secrets')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'secrets'} title="Sectors">√2</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('weather')} onMouseEnter={() => handleIconMouseEnter('weather')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'weather'} title="Weather">∑</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('messages')} onMouseEnter={() => handleIconMouseEnter('messages')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'messages'} title="Messages">𝔐</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('stats')} onMouseEnter={() => handleIconMouseEnter('stats')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'stats'} title="Statistics">📊</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('props')} onMouseEnter={() => handleIconMouseEnter('props')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'props'} title="Object Properties">📋</ElementEditorButton>
            </SidebarContainer>

            {/* Sidebar Fixed Panel Content */}
            <PanelContainer $isOpen={!!activePanel} onMouseEnter={handlePanelMouseEnter} onMouseLeave={handlePanelMouseLeave}>
                {displayPanel && (
                    <>
                        {/* Panel Header */}
                        <PanelHeader>
                            <span>{panelTitles[displayPanel]}</span>
                            <CloseButton onClick={() => { setPinnedPanel(null); setActivePanel(null); }}>✕</CloseButton>
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
                              displayPanel === 'weather' ||
                              displayPanel === 'messages' ||
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
                                    activeMapId={activeMapId}
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

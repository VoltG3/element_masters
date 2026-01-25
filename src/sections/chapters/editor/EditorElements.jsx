import React from 'react';
import { useTranslation } from 'react-i18next';
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
    crackableWalls,
    pushableWalls,
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
    const { t } = useTranslation('editor_elements');
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
        map: t('EDITOR_ELEMENTS_PANEL_OPERATIONS'),
        blocks: t('EDITOR_ELEMENTS_PANEL_BLOCKS'),
        liquids: t('EDITOR_ELEMENTS_PANEL_LIQUIDS'),
        decorations: t('EDITOR_ELEMENTS_PANEL_DECORATIONS'),
        entities: t('EDITOR_ELEMENTS_PANEL_ENTITIES'),
        items: t('EDITOR_ELEMENTS_PANEL_ITEMS'),
        interactables: t('EDITOR_ELEMENTS_PANEL_INTERACTABLES'),
        hazards: t('EDITOR_ELEMENTS_PANEL_HAZARDS'),
        secrets: t('EDITOR_ELEMENTS_PANEL_SECTORS'),
        weather: t('EDITOR_ELEMENTS_PANEL_WEATHER'),
        messages: t('EDITOR_ELEMENTS_PANEL_MESSAGES'),
        obstacles: t('EDITOR_ELEMENTS_PANEL_OBSTACLES'),
        stats: t('EDITOR_ELEMENTS_PANEL_STATISTICS'),
        props: t('EDITOR_ELEMENTS_PANEL_PROPERTIES')
    };

    return (
        <div style={{ display: 'flex', height: '100%', position: 'relative', zIndex: 1001 }}>
            {/* Sidebar Left Icons */}
            <SidebarContainer>
                <ElementEditorButton onClick={() => handleIconClick('map')} onMouseEnter={() => handleIconMouseEnter('map')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'map'} title={t('EDITOR_ELEMENTS_ICON_MAP_CONTROLS')}>⚙️</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('blocks')} onMouseEnter={() => handleIconMouseEnter('blocks')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'blocks'} title={t('EDITOR_ELEMENTS_ICON_BLOCKS')}>🧱</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('liquids')} onMouseEnter={() => handleIconMouseEnter('liquids')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'liquids'} title={t('EDITOR_ELEMENTS_ICON_LIQUIDS')}>💧</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('decorations')} onMouseEnter={() => handleIconMouseEnter('decorations')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'decorations'} title={t('EDITOR_ELEMENTS_ICON_DECORATIONS')}>🌲</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('obstacles')} onMouseEnter={() => handleIconMouseEnter('obstacles')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'obstacles'} title={t('EDITOR_ELEMENTS_ICON_OBSTACLES')}>🏺</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('items')} onMouseEnter={() => handleIconMouseEnter('items')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'items'} title={t('EDITOR_ELEMENTS_ICON_ITEMS')}>✨</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('entities')} onMouseEnter={() => handleIconMouseEnter('entities')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'entities'} title={t('EDITOR_ELEMENTS_ICON_ENTITIES')}>👾</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('interactables')} onMouseEnter={() => handleIconMouseEnter('interactables')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'interactables'} title={t('EDITOR_ELEMENTS_ICON_INTERACTABLES')}>🚪</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('hazards')} onMouseEnter={() => handleIconMouseEnter('hazards')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'hazards'} title={t('EDITOR_ELEMENTS_ICON_HAZARDS')}>☠️</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('secrets')} onMouseEnter={() => handleIconMouseEnter('secrets')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'secrets'} title={t('EDITOR_ELEMENTS_ICON_SECTORS')}>√2</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('weather')} onMouseEnter={() => handleIconMouseEnter('weather')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'weather'} title={t('EDITOR_ELEMENTS_ICON_WEATHER')}>∑</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('messages')} onMouseEnter={() => handleIconMouseEnter('messages')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'messages'} title={t('EDITOR_ELEMENTS_ICON_MESSAGES')}>𝔐</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('stats')} onMouseEnter={() => handleIconMouseEnter('stats')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'stats'} title={t('EDITOR_ELEMENTS_ICON_STATISTICS')}>📊</ElementEditorButton>
                <ElementEditorButton onClick={() => handleIconClick('props')} onMouseEnter={() => handleIconMouseEnter('props')} onMouseLeave={handleIconMouseLeave} $active={activePanel === 'props'} title={t('EDITOR_ELEMENTS_ICON_PROPERTIES')}>📋</ElementEditorButton>
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
                                    crackableWalls={crackableWalls}
                                    pushableWalls={pushableWalls}
                                    obstacles={obstacles}
                                    handlePaletteSelect={handlePaletteSelect}
                                    selectedTile={selectedTile}
                                    objectMetadata={objectMetadata}
                                    setObjectMetadata={setObjectMetadata}
                                    objectMapData={objectMapData}
                                    highlightedIndex={highlightedIndex}
                                    setHighlightedIndex={setHighlightedIndex}
                                    registryItems={registryItems}
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
                                    objectMapData={objectMapData}
                                    registryItems={registryItems}
                                    maps={maps}
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

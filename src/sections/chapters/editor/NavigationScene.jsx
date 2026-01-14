import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { NavigationElements } from './NavigationElements';
import { MapResizer } from './scene/MapResizer';
import { Minimap } from './tools/Minimap';
import AnimatedItem from '../../../utilities/AnimatedItem';
import BackgroundMusicPlayer from '../../../utilities/BackgroundMusicPlayer';
import { buttonStyle, activeButtonStyle } from './constants';

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

    const sidebarButtonStyle = {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backgroundColor: '#333',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '20px',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    };

    const activeSidebarButtonStyle = {
        ...sidebarButtonStyle,
        backgroundColor: '#2196F3',
        borderColor: '#1E88E5',
        transform: 'scale(1.05)'
    };

    const rightSidebarStyle = {
        position: 'absolute',
        top: '70px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1001
    };

    const renderPaletteItem = (item, color, layer) => {
        const hasImage = !!(item.texture || (Array.isArray(item.textures) && item.textures.length > 0));
        const editorIcon = item.editorIcon;
        const isLiquid = !!(item.flags && item.flags.liquid);
        const isWater = !!(item.flags && item.flags.water);
        const isLava = !!(item.flags && item.flags.lava);
        const isSecret = item.type === 'secret';
        const swatchStyle = isWater
            ? { background: 'linear-gradient(180deg,#2a5d8f,#174369)' }
            : (isLava ? { background: 'linear-gradient(180deg,#6b1a07,#c43f0f)' } : { background: '#eee' });

        return (
            <div
                key={item.id}
                onClick={() => handlePaletteSelect(item, layer)}
                title={item.name}
                style={{
                    border: selectedTile?.id === item.id ? `2px solid ${color}` : '1px solid #ccc',
                    cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
                    position: 'relative'
                }}
            >
                {isSecret ? (
                    <div style={{
                        width: '100%', height: '100%', borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.filterColorInEditor || item.filterColor || 'rgba(0, 0, 0, 0.5)',
                        color: '#fff', fontSize: 8, textAlign: 'center', lineHeight: 1.1, fontWeight: 'bold'
                    }}>
                        {item.editorIcon || (item.subtype === 'above' ? 'ABOVE' : 'BELOW')}
                    </div>
                ) : editorIcon ? (
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                        {editorIcon}
                    </div>
                ) : hasImage ? (
                    <AnimatedItem
                        textures={item.textures}
                        texture={item.texture}
                        speed={item.animationSpeed}
                        spriteSheet={item.spriteSheet}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        alt={item.name}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%', borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                        fontSize: 10, textAlign: 'center', lineHeight: 1.1,
                        ...swatchStyle
                    }}>
                        {isLiquid ? (isWater ? 'WATER' : (isLava ? 'LAVA' : 'LIQ')) : (item.name || '—')}
                    </div>
                )}
            </div>
        );
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
                    {/* Panel Header - Styled like NavigationTools */}
                    <div style={{
                        padding: '8px 15px',
                        backgroundColor: '#f0f0f0',
                        borderBottom: '1px solid #ddd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        height: '32px',
                        boxSizing: 'border-box',
                        color: '#333'
                    }}>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button 
                                            onClick={openNewMapModal} 
                                            style={{ ...buttonStyle, height: '40px', width: '100%', margin: 0, gap: '8px' }}
                                            title="New Map"
                                        >
                                            <span style={{ fontSize: '18px' }}>📄</span>
                                            <span>New</span>
                                        </button>
                                        <button 
                                            onClick={saveMap} 
                                            style={{ ...buttonStyle, height: '40px', width: '100%', margin: 0, gap: '8px' }}
                                            title="Save Map"
                                        >
                                            <span style={{ fontSize: '18px' }}>💾</span>
                                            <span>Save</span>
                                        </button>
                                        <label 
                                            style={{ ...buttonStyle, height: '40px', width: '100%', margin: 0, gap: '8px', cursor: 'pointer' }}
                                            title="Load Map"
                                        >
                                            <span style={{ fontSize: '18px' }}>📂</span>
                                            <span>Load</span>
                                            <input type="file" accept=".json,.txt" onChange={loadMap} style={{ display: 'none' }} />
                                        </label>
                                        <button 
                                            onClick={clearMap} 
                                            style={{ ...buttonStyle, height: '40px', width: '100%', margin: 0, gap: '8px', color: '#d32f2f' }}
                                            title="Clear Map"
                                        >
                                            <span style={{ fontSize: '18px' }}>🗑️</span>
                                            <span>Clear</span>
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <div style={{ fontSize: '13px', marginBottom: '5px' }}>Map: <strong>{mapName}</strong></div>
                                    <div style={{ fontSize: '13px' }}>Author: <strong>{creatorName}</strong></div>
                                </div>
                            </div>
                        )}

                        {activePanel === 'palette' && (
                            isPlayMode ? (
                                <div style={{ padding: '20px', fontSize: '14px', color: '#666', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                                    Palette disabled during Play mode
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <NavigationElements title="Blocks (Background)" isOpenDefault={true}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {blocks.map(b => renderPaletteItem(b, 'blue', 'tile'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Liquids (Blocks)" isOpenDefault={false}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {liquids.map(li => renderPaletteItem(li, 'blue', 'tile'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Entities (Objects)" isOpenDefault={true}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {entities.map(e => renderPaletteItem(e, 'red', 'object'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Decorations" isOpenDefault={true}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {decorations && decorations.map(d => renderPaletteItem(d, 'purple', 'object'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Items (Objects)" isOpenDefault={true}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {items.map(i => renderPaletteItem(i, 'green', 'object'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Interactables" isOpenDefault={true}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {interactables.map(i => renderPaletteItem(i, 'purple', 'object'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Hazards" isOpenDefault={true}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {hazards.map(h => renderPaletteItem(h, 'orange', 'object'))}
                                        </div>
                                    </NavigationElements>

                                    <NavigationElements title="Secrets" isOpenDefault={false}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {secrets && secrets.map(s => renderPaletteItem(s, 'purple', 'secret'))}
                                        </div>
                                    </NavigationElements>
                                </div>
                            )
                        )}

                        {activePanel === 'background' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <section>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>Background Image</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                        <div onClick={() => setSelectedBackgroundImage(null)}
                                            style={{
                                                border: selectedBackgroundImage ? '1px solid #ccc' : '2px solid #2196F3',
                                                borderRadius: '6px', padding: '4px', cursor: 'pointer', background: '#fff',
                                                boxShadow: !selectedBackgroundImage ? '0 0 8px rgba(33, 150, 243, 0.3)' : 'none'
                                            }}
                                            title="Solid Color">
                                            <div style={{ width: '100%', height: '60px', background: selectedBackgroundColor, display: 'block', borderRadius: '4px' }} />
                                            <div style={{ fontSize: '11px', textAlign: 'center', paddingTop: '5px', fontWeight: !selectedBackgroundImage ? 'bold' : 'normal' }}>Solid Color</div>
                                        </div>
                                        {backgroundOptions.map((bg) => (
                                            <div key={bg.name} onClick={() => setSelectedBackgroundImage(bg.metaPath)}
                                                style={{
                                                    border: selectedBackgroundImage === bg.metaPath ? '2px solid #2196F3' : '1px solid #ccc',
                                                    borderRadius: '6px', padding: '4px', cursor: 'pointer', background: '#fff',
                                                    boxShadow: selectedBackgroundImage === bg.metaPath ? '0 0 8px rgba(33, 150, 243, 0.3)' : 'none'
                                                }}
                                                title={bg.name}>
                                                <img src={bg.src} alt={bg.name} style={{ width: '100%', height: '60px', objectFit: 'cover', display: 'block', borderRadius: '4px' }} />
                                                <div style={{ fontSize: '11px', textAlign: 'center', paddingTop: '5px', fontWeight: selectedBackgroundImage === bg.metaPath ? 'bold' : 'normal' }}>{bg.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                    <div style={{ marginBottom: '0px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Parallax Effect:</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="range" min="0" max="1" step="0.05" value={backgroundParallaxFactor}
                                                onChange={(e) => setBackgroundParallaxFactor(parseFloat(e.target.value))}
                                                style={{ flex: 1 }} />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '35px' }}>{backgroundParallaxFactor.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activePanel === 'music' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <section>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Background Music</span>
                                    <select
                                        value={selectedBackgroundMusic || ''}
                                        onChange={(e) => setSelectedBackgroundMusic(e.target.value || null)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '10px' }}>
                                        <option value="">— No Music —</option>
                                        {musicOptions.map(m => (
                                            <option key={m.name} value={m.metaPath}>{m.name}</option>
                                        ))}
                                    </select>
                                    <BackgroundMusicPlayer metaPath={selectedBackgroundMusic} enabled={true} volume={0.4} />
                                    <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                        Status: {selectedBackgroundMusic ? 'Music selected' : 'Silence'}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activePanel === 'stats' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ padding: '15px', backgroundColor: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
                                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>Total Map Area: <strong>{totalTiles}</strong> tiles</div>
                                    <div style={{ fontSize: '13px', color: '#0050b3' }}>Dimensions: {mapWidth} x {mapHeight}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ padding: '12px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#389e0d' }}>{filledBlocks}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>FILLED BLOCKS</div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591', textAlign: 'center' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d46b08' }}>{objectsCount}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>OBJECTS</div>
                                    </div>
                                </div>
                                <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#666' }}>{emptyBlocks}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>EMPTY SPACE</div>
                                </div>
                            </div>
                        )}

                        {activePanel === 'props' && (
                            <div style={{ padding: '0' }}>
                                <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                                    Configure triggers for Portals and Targets.
                                    <br />
                                    <strong>1.</strong> Place a <strong>Portal</strong> and a <strong>Portal Target</strong> from the palette.
                                    <br />
                                    <strong>2.</strong> Link them by giving them the <strong>same Trigger ID</strong> here.
                                    <br />
                                    <i style={{ fontSize: '11px' }}>* Tip: You can see visual links between them in the editor and minimap.</i>
                                </p>
                                <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                                    {objectMapData.map((id, index) => {
                                        if (!id) return null;
                                        const def = registryItems.find(r => r.id === id);
                                        if (!def || (!id.includes('portal') && !id.includes('target') && id !== 'portal_target')) return null;

                                        const x = index % mapWidth;
                                        const y = Math.floor(index / mapWidth);
                                        const metadata = objectMetadata[index] || {};
                                        const isHighlighted = highlightedIndex === index;

                                        return (
                                            <div key={index} 
                                                onMouseEnter={() => setHighlightedIndex(index)}
                                                onMouseLeave={() => setHighlightedIndex(null)}
                                                style={{
                                                    padding: '10px',
                                                    border: isHighlighted ? '1px solid gold' : '1px solid #eee',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '5px',
                                                    backgroundColor: isHighlighted ? '#fffde7' : '#f9f9f9',
                                                    marginBottom: '5px',
                                                    borderRadius: '4px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        {id.includes('portal') && !id.includes('target') ? '🔵' : '🎯'} {def.name}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                        <span style={{ color: '#666', fontSize: '11px' }}>({x}, {y})</span>
                                                        <button 
                                                            onClick={() => {
                                                                const el = document.querySelector(`.viewport`);
                                                                if (el) {
                                                                    const scrollX = x * 32 - el.clientWidth / 2 + 16;
                                                                    const scrollY = y * 32 - el.clientHeight / 2 + 16;
                                                                    el.scrollTo({ left: scrollX, top: scrollY, behavior: 'smooth' });
                                                                }
                                                            }}
                                                            style={{ 
                                                                padding: '2px 6px', fontSize: '10px', cursor: 'pointer',
                                                                backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '3px'
                                                            }}
                                                            title="Scroll to this object"
                                                        >
                                                            Locate
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Trigger ID:</label>
                                                    <input
                                                        type="number"
                                                        value={metadata.triggerId || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            setObjectMetadata(prev => ({
                                                                ...prev,
                                                                [index]: { ...prev[index], triggerId: isNaN(val) ? null : val }
                                                            }));
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '4px 8px',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '4px',
                                                            fontSize: '13px',
                                                            backgroundColor: isHighlighted ? '#fff' : '#f0f0f0'
                                                        }}
                                                        placeholder="Enter ID (e.g. 1)"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {objectMapData.filter(id => id && (id.includes('portal') || id.includes('target'))).length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#999', marginTop: '20px', fontSize: '14px' }}>
                                            No portals or targets found on map.
                                        </p>
                                    )}
                                </div>
                            </div>
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

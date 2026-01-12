import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { PaletteSection } from './PaletteSection';
import { Minimap } from './Minimap';
import { MapResizer } from './MapResizer';
import AnimatedItem from '../../../utilities/AnimatedItem';
import BackgroundMusicPlayer from '../../../utilities/BackgroundMusicPlayer';
import { buttonStyle, activeButtonStyle } from './constants';

export const ToolbarWindows = ({
    mapName,
    creatorName,
    openNewMapModal,
    saveMap,
    loadMap,
    showGrid,
    setShowGrid,
    clearMap,
    isPlayMode,
    handlePlay,
    handlePause,
    handleReset,
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
    onMapResize,
    highlightedIndex,
    setHighlightedIndex
}) => {
    const [activePanel, setActivePanel] = useState(null); // 'map', 'tools', 'palette', 'bg', 'stats', 'props'
    const [isMinimapOpen, setIsMinimapOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isResizeWindowOpen, setIsResizeWindowOpen] = useState(false);

    const togglePanel = (panel) => {
        setActivePanel(prev => prev === panel ? null : panel);
    };

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

    const panelStyle = {
        position: 'absolute',
        top: 0,
        left: '60px',
        width: '320px',
        height: '100%',
        backgroundColor: '#fff',
        boxShadow: '2px 0 10px rgba(0,0,0,0.2)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #ddd',
        overflowY: 'auto',
        padding: '20px',
        boxSizing: 'border-box'
    };

    const rightSidebarStyle = {
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 101
    };

    const panelHeaderStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '2px solid #eee',
        paddingBottom: '10px'
    };

    const panelTitleStyle = {
        margin: 0,
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333'
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
                        background: item.filterColor || 'rgba(0, 0, 0, 0.5)',
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

    const BlockEraser = () => (
        <div onClick={() => { handlePaletteSelect(null, 'tile'); }} title="Erase Blocks (Background)"
            style={{
                border: (selectedTile === null && activeLayer === 'tile') ? `2px solid blue` : '1px solid #ccc',
                cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#f0f8ff', fontSize: '16px', color: 'blue'
            }}>
            ⌫B
        </div>
    );

    const ObjectEraser = () => (
        <div onClick={() => { handlePaletteSelect(null, 'object'); }} title="Erase Objects (Entities/Items)"
            style={{
                border: (selectedTile === null && activeLayer === 'object') ? `2px solid red` : '1px solid #ccc',
                cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#fff0f0', fontSize: '16px', color: 'red'
            }}>
            ⌫O
        </div>
    );

    const SecretEraser = () => (
        <div onClick={() => { handlePaletteSelect(null, 'secret'); }} title="Erase Secrets"
            style={{
                border: (selectedTile === null && activeLayer === 'secret') ? `2px solid purple` : '1px solid #ccc',
                cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#f8f0ff', fontSize: '16px', color: 'purple'
            }}>
            ⌫S
        </div>
    );


    return (
        <div style={{ display: 'contents' }}>
            {/* Sidebar Left */}
            <div style={{
                width: '60px',
                height: '100%',
                backgroundColor: '#222',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '20px',
                zIndex: 102,
                borderRight: '1px solid #000',
                flexShrink: 0
            }}>
                <div onClick={() => togglePanel('map')} style={activePanel === 'map' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Map Controls">⚙️</div>
                <div onClick={() => togglePanel('tools')} style={activePanel === 'tools' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Tools">🖌️</div>
                <div onClick={() => togglePanel('palette')} style={activePanel === 'palette' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Palette">🧱</div>
                <div onClick={() => togglePanel('bg')} style={activePanel === 'bg' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Background & Music">🖼️</div>
                <div onClick={() => togglePanel('stats')} style={activePanel === 'stats' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Statistics">📊</div>
                <div onClick={() => togglePanel('props')} style={activePanel === 'props' ? activeSidebarButtonStyle : sidebarButtonStyle} title="Object Properties">📋</div>
            </div>

            {/* Panels */}
            {activePanel === 'map' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <h3 style={panelTitleStyle}>Map Controls</h3>
                        <button onClick={() => setActivePanel(null)} style={{ ...buttonStyle, margin: 0 }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
                            <div style={{ fontSize: '13px', marginBottom: '5px' }}>Map: <strong>{mapName}</strong></div>
                            <div style={{ fontSize: '13px' }}>Author: <strong>{creatorName}</strong></div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <button onClick={openNewMapModal} style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: '#fff', borderColor: '#388E3C', flex: '1' }}>New</button>
                            <button onClick={saveMap} style={{ ...buttonStyle, flex: '1' }}>Save</button>
                            <label style={{ ...buttonStyle, flex: '1' }}>Load <input type="file" accept=".json,.txt" onChange={loadMap} style={{ display: 'none' }} /></label>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <button onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} style={{ ...(isResizeWindowOpen ? activeButtonStyle : buttonStyle), flex: '1' }} title="Resize Map">📐 Resize</button>
                            <button onClick={() => setShowGrid(!showGrid)} style={{ ...(showGrid ? activeButtonStyle : buttonStyle), flex: '1' }}>{showGrid ? 'Hide Grid' : 'Show Grid'} #</button>
                            <button onClick={clearMap} style={{ ...buttonStyle, color: 'red', flex: '1' }} title="Clear Map">✕ Clear</button>
                        </div>

                        <div style={{ borderTop: '2px solid #eee', paddingTop: '15px', marginTop: '5px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>PLAY MODE</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!isPlayMode ? (
                                    <button onClick={handlePlay} style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: '#fff', borderColor: '#388E3C', flex: '1', height: '40px', fontSize: '16px' }} title="Play from current position">▶ Play</button>
                                ) : (
                                    <>
                                        <button onClick={handlePause} style={{ ...buttonStyle, backgroundColor: '#FF9800', color: '#fff', borderColor: '#F57C00', flex: '1', height: '40px' }} title="Pause and return to editor">⏸ Pause</button>
                                        <button onClick={handleReset} style={{ ...buttonStyle, backgroundColor: '#2196F3', color: '#fff', borderColor: '#1976D2', flex: '1', height: '40px' }} title="Reset collected objects">↻ Reset</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activePanel === 'tools' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <h3 style={panelTitleStyle}>Tools & Erase</h3>
                        <button onClick={() => setActivePanel(null)} style={{ ...buttonStyle, margin: 0 }}>✕</button>
                    </div>
                    {isPlayMode ? (
                        <div style={{ padding: '20px', fontSize: '14px', color: '#666', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                            Tools disabled during Play mode
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <section>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#555' }}>DRAWING TOOLS</span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setActiveTool('brush')} style={{ ...(activeTool === 'brush' ? activeButtonStyle : buttonStyle), width: '40px', height: '40px', fontSize: '20px', margin: 0 }}>🖌️</button>
                                    <button onClick={() => setActiveTool('bucket')} style={{ ...(activeTool === 'bucket' ? activeButtonStyle : buttonStyle), width: '40px', height: '40px', fontSize: '20px', margin: 0 }}>🪣</button>
                                    <button onClick={() => setActiveTool('move')} style={{ ...(activeTool === 'move' ? activeButtonStyle : buttonStyle), width: '40px', height: '40px', fontSize: '20px', margin: 0 }}>✋</button>
                                </div>
                            </section>

                            {activeTool === 'brush' && (
                                <section style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>BRUSH SIZE</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {[1, 2, 3, 4, 5].map(size => (
                                            <button key={size} onClick={() => setBrushSize(size)}
                                                style={{ ...(brushSize === size ? activeButtonStyle : buttonStyle), padding: '0 10px', minWidth: '35px', height: '35px' }}>
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section style={{ padding: '10px', backgroundColor: activeLayer === 'tile' ? '#e6f7ff' : (activeLayer === 'object' ? '#fff1f0' : '#f8f0ff'), borderRadius: '6px', border: '1px solid #ccc' }}>
                                <span style={{ fontSize: '13px' }}>Active Layer: <strong>{activeLayer === 'tile' ? '🟦 Background' : (activeLayer === 'object' ? '🟥 Objects' : '🟪 Secrets')}</strong></span>
                            </section>

                            {activeTool === 'move' && (
                                <section style={{ backgroundColor: '#fffbe6', padding: '10px', borderRadius: '6px', border: '1px solid #ffe58f' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>SELECTION MODE</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setSelectionMode('cut')} style={{ ...(selectionMode === 'cut' ? activeButtonStyle : buttonStyle), flex: 1 }}>✂️ Cut</button>
                                        <button onClick={() => setSelectionMode('copy')} style={{ ...(selectionMode === 'copy' ? activeButtonStyle : buttonStyle), flex: 1 }}>📋 Copy</button>
                                    </div>
                                </section>
                            )}

                            {activeTool === 'move' && selection && (
                                <section style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                                    <span style={{ fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Selection Active</span>
                                    <div style={{ fontSize: '11px', marginBottom: '10px', lineHeight: '1.4' }}>
                                        • Drag with mouse or use arrows<br/>
                                        • Press <strong>Enter</strong> to confirm<br/>
                                        • Press <strong>Esc</strong> to cancel
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                        <button onClick={() => moveSelection(0, -1)} style={{ ...buttonStyle, margin: 0 }}>▲</button>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => moveSelection(-1, 0)} style={{ ...buttonStyle, margin: 0 }}>◀</button>
                                            <button onClick={() => moveSelection(1, 0)} style={{ ...buttonStyle, margin: 0 }}>▶</button>
                                        </div>
                                        <button onClick={() => moveSelection(0, 1)} style={{ ...buttonStyle, margin: 0 }}>▼</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                        <button onClick={commitSelection} style={{ ...buttonStyle, backgroundColor: '#28a745', color: '#fff', flex: 1, height: '35px' }}>✓ Confirm</button>
                                        <button onClick={cancelSelection} style={{ ...buttonStyle, backgroundColor: '#dc3545', color: '#fff', flex: 1, height: '35px' }}>✕ Cancel</button>
                                    </div>
                                </section>
                            )}

                            <section>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#555' }}>ERASERS</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <BlockEraser />
                                    <ObjectEraser />
                                    <SecretEraser />
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            )}

            {activePanel === 'palette' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <h3 style={panelTitleStyle}>Palette</h3>
                        <button onClick={() => setActivePanel(null)} style={{ ...buttonStyle, margin: 0 }}>✕</button>
                    </div>
                    {isPlayMode ? (
                        <div style={{ padding: '20px', fontSize: '14px', color: '#666', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                            Palette disabled during Play mode
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <PaletteSection title="Blocks (Background)" isOpenDefault={true}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {blocks.map(b => renderPaletteItem(b, 'blue', 'tile'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Liquids (Blocks)" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {liquids.map(li => renderPaletteItem(li, 'blue', 'tile'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Entities (Objects)" isOpenDefault={true}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {entities.map(e => renderPaletteItem(e, 'red', 'object'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Decorations" isOpenDefault={true}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {decorations && decorations.map(d => renderPaletteItem(d, 'purple', 'object'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Items (Objects)" isOpenDefault={true}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {items.map(i => renderPaletteItem(i, 'green', 'object'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Interactables" isOpenDefault={true}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {interactables.map(i => renderPaletteItem(i, 'purple', 'object'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Hazards" isOpenDefault={true}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {hazards.map(h => renderPaletteItem(h, 'orange', 'object'))}
                                </div>
                            </PaletteSection>

                            <PaletteSection title="Secrets" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {secrets && secrets.map(s => renderPaletteItem(s, 'purple', 'secret'))}
                                </div>
                            </PaletteSection>
                        </div>
                    )}
                </div>
            )}

            {activePanel === 'bg' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <h3 style={panelTitleStyle}>Background & Music</h3>
                        <button onClick={() => setActivePanel(null)} style={{ ...buttonStyle, margin: 0 }}>✕</button>
                    </div>
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
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Parallax Effect:</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="range" min="0" max="1" step="0.05" value={backgroundParallaxFactor}
                                        onChange={(e) => setBackgroundParallaxFactor(parseFloat(e.target.value))}
                                        style={{ flex: 1 }} />
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '35px' }}>{backgroundParallaxFactor.toFixed(2)}</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Background Color:</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="color" value={selectedBackgroundColor}
                                        onChange={(e) => setSelectedBackgroundColor(e.target.value)}
                                        style={{ width: '40px', height: '40px', border: 'none', padding: 0, cursor: 'pointer' }} />
                                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{selectedBackgroundColor.toUpperCase()}</span>
                                </div>
                            </div>
                        </section>

                        <section style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
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
                </div>
            )}

            {activePanel === 'stats' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <h3 style={panelTitleStyle}>Statistics</h3>
                        <button onClick={() => setActivePanel(null)} style={{ ...buttonStyle, margin: 0 }}>✕</button>
                    </div>
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
                </div>
            )}

            {activePanel === 'props' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <h3 style={{ margin: 0 }}>Object Properties</h3>
                        <div onClick={() => setActivePanel(null)} style={{ cursor: 'pointer' }}>✕</div>
                    </div>
                    <div style={{ padding: '10px 0' }}>
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
                </div>
            )}

            {/* Right side buttons */}
            <div style={rightSidebarStyle}>
                <div onClick={() => setIsMinimapOpen(!isMinimapOpen)} style={isMinimapOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Minimap">🗺️</div>
                <div onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={isSettingsOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Settings">🛠️</div>
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
                    title="Editor Settings"
                    defaultPosition={{ x: window.innerWidth - 340, y: 400 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsSettingsOpen(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px' }}>Show Grid:</span>
                            <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? activeButtonStyle : buttonStyle}>
                                {showGrid ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px' }}>Brush Size:</span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setBrushSize(s)} style={{ ...(brushSize === s ? activeButtonStyle : buttonStyle), minWidth: '25px', padding: 0 }}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px' }}>
                            <button onClick={clearMap} style={{ ...buttonStyle, color: 'red', width: '100%' }}>✕ Clear Entire Map</button>
                        </div>
                    </div>
                </DraggableWindow>
            )}

            {/* Resize Map Popup */}
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
                        onResize={onMapResize}
                    />
                </DraggableWindow>
            )}
        </div>
    );
};

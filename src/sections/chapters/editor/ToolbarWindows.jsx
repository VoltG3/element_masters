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
    registryItems,
    onMapResize
}) => {
    const [isResizeWindowOpen, setIsResizeWindowOpen] = useState(false);
    const renderPaletteItem = (item, color, layer) => {
        const hasImage = !!(item.texture || (Array.isArray(item.textures) && item.textures.length > 0));
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
                        {item.subtype === 'above' ? 'ABOVE' : 'BELOW'}
                    </div>
                ) : hasImage ? (
                    <AnimatedItem
                        textures={item.textures}
                        texture={item.texture}
                        speed={item.animationSpeed}
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

    // State to track window heights
    const [heights, setHeights] = useState([37, 37, 37, 37, 37]); // Default header height
    const baseY = 60;
    const startX = 20;

    const handleHeightChange = useCallback((index, h) => {
        setHeights(prev => {
            if (prev[index] === h) return prev;
            const newHeights = [...prev];
            newHeights[index] = h;
            return newHeights;
        });
    }, []);

    // Calculate Y positions based on accumulated heights
    const positions = useMemo(() => {
        return heights.reduce((acc, height, index) => {
            const y = index === 0 ? baseY : acc[index - 1].y + heights[index - 1];
            acc.push({ x: startX, y });
            return acc;
        }, []);
    }, [heights]);

    return (
        <>
            {/* Window 1: Map Controls */}
            <DraggableWindow
                title="Map Controls"
                defaultPosition={positions[0]}
                defaultWidth={300}
                isOpenDefault={false}
                onHeightChange={(h) => handleHeightChange(0, h)}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px' }}>Map Name: <strong>{mapName}</strong></div>
                    <div style={{ fontSize: '12px' }}>Creator: <strong>{creatorName}</strong></div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        <button onClick={openNewMapModal} style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: '#fff', borderColor: '#388E3C' }}>New</button>
                        <button onClick={saveMap} style={buttonStyle}>Save</button>
                        <label style={buttonStyle}>Load <input type="file" accept=".json,.txt" onChange={loadMap} style={{ display: 'none' }} /></label>
                        <button onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} style={isResizeWindowOpen ? activeButtonStyle : buttonStyle} title="Resize Map">📐</button>
                        <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? activeButtonStyle : buttonStyle}>#</button>
                        <button onClick={clearMap} style={{ ...buttonStyle, color: 'red' }} title="Clear Map">✕</button>
                    </div>

                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '5px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>PLAY MODE</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {!isPlayMode ? (
                                <button onClick={handlePlay} style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: '#fff', borderColor: '#388E3C' }} title="Play from current position">▶ Play</button>
                            ) : (
                                <>
                                    <button onClick={handlePause} style={{ ...buttonStyle, backgroundColor: '#FF9800', color: '#fff', borderColor: '#F57C00' }} title="Pause and return to editor">⏸ Pause</button>
                                    <button onClick={handleReset} style={{ ...buttonStyle, backgroundColor: '#2196F3', color: '#fff', borderColor: '#1976D2' }} title="Reset collected objects">↻ Reset</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </DraggableWindow>

            {/* Window 2: Tools */}
            <DraggableWindow
                title="Tools & Erase"
                defaultPosition={positions[1]}
                defaultWidth={300}
                isOpenDefault={false}
                onHeightChange={(h) => handleHeightChange(1, h)}
            >
                {isPlayMode ? (
                    <div style={{ padding: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                        Tools disabled during Play mode
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>TOOLS</span>
                            <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeButtonStyle : buttonStyle}>🖌️</button>
                            <button onClick={() => setActiveTool('bucket')} style={activeTool === 'bucket' ? activeButtonStyle : buttonStyle}>🪣</button>
                            <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeButtonStyle : buttonStyle}>✋</button>
                        </div>

                        {(activeTool === 'brush') && (
                            <div style={{ marginTop: '5px' }}>
                                <span style={{ fontSize: '11px', marginRight: '5px' }}>Size:</span>
                                {[1, 2, 3, 4, 5].map(size => (
                                    <button key={size} onClick={() => setBrushSize(size)}
                                        style={{ ...(brushSize === size ? activeButtonStyle : buttonStyle), padding: '0 6px', minWidth: '20px' }}>
                                        {size}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '10px', padding: '5px', backgroundColor: activeLayer === 'tile' ? '#e6f7ff' : (activeLayer === 'object' ? '#fff1f0' : '#f8f0ff'), borderRadius: '4px', border: '1px solid #ccc' }}>
                            <span style={{ fontSize: '11px' }}>Active: <strong>{activeLayer === 'tile' ? '🟦 Background' : (activeLayer === 'object' ? '🟥 Objects' : '🟪 Secrets')}</strong></span>
                        </div>

                        {activeTool === 'move' && (
                            <div style={{ marginTop: '10px' }}>
                                <span style={{ fontSize: '11px', display: 'block', marginBottom: '5px' }}>Selection Mode:</span>
                                <button
                                    onClick={() => setSelectionMode('cut')}
                                    style={selectionMode === 'cut' ? activeButtonStyle : buttonStyle}
                                    title="Cut (move)"
                                >
                                    ✂️ Cut
                                </button>
                                <button
                                    onClick={() => setSelectionMode('copy')}
                                    style={selectionMode === 'copy' ? activeButtonStyle : buttonStyle}
                                    title="Copy (duplicate)"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        )}

                        {activeTool === 'move' && selection && (
                            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                                <span style={{ fontSize: '11px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Selection Active</span>
                                <div style={{ fontSize: '10px', marginBottom: '5px' }}>
                                    • Drag with mouse or use arrows<br/>
                                    • Press <strong>Enter</strong> to confirm<br/>
                                    • Press <strong>Esc</strong> to cancel
                                </div>
                                <div style={{ marginTop: '5px' }}>
                                    <button onClick={() => moveSelection(0, -1)} style={buttonStyle}>▲</button>
                                    <div style={{ display: 'inline-block' }}>
                                        <button onClick={() => moveSelection(-1, 0)} style={buttonStyle}>◀</button>
                                        <button onClick={() => moveSelection(1, 0)} style={buttonStyle}>▶</button>
                                    </div>
                                    <button onClick={() => moveSelection(0, 1)} style={buttonStyle}>▼</button>
                                </div>
                                <div style={{ marginTop: '5px' }}>
                                    <button onClick={commitSelection} style={{ ...buttonStyle, backgroundColor: '#28a745', color: '#fff' }}>✓ Confirm</button>
                                    <button onClick={cancelSelection} style={{ ...buttonStyle, backgroundColor: '#dc3545', color: '#fff' }}>✕ Cancel</button>
                                </div>
                            </div>
                        )}
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ERASERS</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <BlockEraser />
                            <ObjectEraser />
                            <SecretEraser />
                        </div>
                    </div>
                </div>
                )}
            </DraggableWindow>

            {/* Window 3: Blocks/Liquids/Entities */}
            <DraggableWindow
                title="Blocks / Liquids / Entities"
                defaultPosition={positions[2]}
                defaultWidth={300}
                isOpenDefault={false}
                onHeightChange={(h) => handleHeightChange(2, h)}
            >
                {isPlayMode ? (
                    <div style={{ padding: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                        Palette disabled during Play mode
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <PaletteSection title="Blocks (Background)" isOpenDefault={true}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {blocks.map(b => renderPaletteItem(b, 'blue', 'tile'))}
                            </div>
                        </PaletteSection>

                        <PaletteSection title="Liquids (Blocks)" isOpenDefault={true}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {liquids.map(li => renderPaletteItem(li, 'blue', 'tile'))}
                            </div>
                        </PaletteSection>

                        <PaletteSection title="Entities (Objects)">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {entities.map(e => renderPaletteItem(e, 'red', 'object'))}
                            </div>
                        </PaletteSection>

                        <PaletteSection title="Items (Objects)">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {items.map(i => renderPaletteItem(i, 'green', 'object'))}
                            </div>
                        </PaletteSection>

                        <PaletteSection title="interactables (Objects)">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {interactables.map(i => renderPaletteItem(i, 'purple', 'object'))}
                            </div>
                        </PaletteSection>

                        <PaletteSection title="Hazards (Objects)">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {hazards.map(h => renderPaletteItem(h, 'orange', 'object'))}
                            </div>
                        </PaletteSection>

                        <PaletteSection title="Secrets">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {secrets && secrets.map(s => renderPaletteItem(s, 'purple', 'secret'))}
                            </div>
                        </PaletteSection>
                    </div>
                )}
            </DraggableWindow>

            {/* Window 4: Background & Music */}
            <DraggableWindow
                title="Background & Music"
                defaultPosition={positions[3]}
                defaultWidth={300}
                isOpenDefault={false}
                onHeightChange={(h) => handleHeightChange(3, h)}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Background Image</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            <div onClick={() => setSelectedBackgroundImage(null)}
                                style={{
                                    border: selectedBackgroundImage ? '1px solid #ccc' : '2px solid #4CAF50',
                                    borderRadius: '4px', padding: '2px', cursor: 'pointer', background: '#fff'
                                }}
                                title="Solid Color">
                                <div style={{ width: '100%', height: '48px', background: selectedBackgroundColor, display: 'block', borderRadius: '2px' }} />
                                <div style={{ fontSize: '10px', textAlign: 'center', paddingTop: '2px' }}>Solid Color</div>
                            </div>
                            {backgroundOptions.map((bg) => (
                                <div key={bg.name} onClick={() => setSelectedBackgroundImage(bg.metaPath)}
                                    style={{
                                        border: selectedBackgroundImage === bg.metaPath ? '2px solid #4CAF50' : '1px solid #ccc',
                                        borderRadius: '4px', padding: '2px', cursor: 'pointer', background: '#fff'
                                    }}
                                    title={bg.name}>
                                    <img src={bg.src} alt={bg.name} style={{ width: '100%', height: '48px', objectFit: 'cover', display: 'block' }} />
                                    <div style={{ fontSize: '10px', textAlign: 'center', paddingTop: '2px' }}>{bg.name}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px' }}>Parallax: </label>
                            <input type="range" min="0" max="1" step="0.05" value={backgroundParallaxFactor}
                                onChange={(e) => setBackgroundParallaxFactor(parseFloat(e.target.value))} />
                            <span style={{ fontSize: '12px' }}>{backgroundParallaxFactor.toFixed(2)}</span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px' }}>Background Color:</label>
                            <input type="color" value={selectedBackgroundColor}
                                onChange={(e) => setSelectedBackgroundColor(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Background Music</span>
                        <select
                            value={selectedBackgroundMusic || ''}
                            onChange={(e) => setSelectedBackgroundMusic(e.target.value || null)}
                            style={{ width: '100%', padding: '6px', fontSize: '12px', marginBottom: '8px' }}>
                            <option value="">— None —</option>
                            {musicOptions.map(m => (
                                <option key={m.name} value={m.metaPath}>{m.name}</option>
                            ))}
                        </select>
                        <BackgroundMusicPlayer metaPath={selectedBackgroundMusic} enabled={true} volume={0.4} />
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '5px' }}>
                            Selected: {selectedBackgroundMusic ? selectedBackgroundMusic.split('/').pop() : 'None'}
                        </div>
                    </div>
                </div>
            </DraggableWindow>

            {/* Window 5: Statistics */}
            <DraggableWindow
                title="Statistics"
                defaultPosition={positions[4]}
                defaultWidth={300}
                isOpenDefault={false}
                onHeightChange={(h) => handleHeightChange(4, h)}
            >
                <div style={{ fontSize: '11px' }}>
                    <div style={{ marginBottom: '4px' }}>Size: <strong>{totalTiles}</strong> tiles</div>
                    <div style={{ marginBottom: '4px', color: 'blue' }}>🟦 Filled Blocks: <strong>{filledBlocks}</strong></div>
                    <div style={{ marginBottom: '4px', color: '#666' }}>⬜ Empty Blocks: <strong>{emptyBlocks}</strong></div>
                    <div style={{ marginBottom: '4px', color: 'red' }}>🟥 Objects Count: <strong>{objectsCount}</strong></div>
                </div>
            </DraggableWindow>

            {/* Window 6: Minimap - Right side */}
            <DraggableWindow
                title="Minimap"
                defaultPosition={{ x: window.innerWidth - 320, y: 60 }}
                defaultWidth={300}
                isOpenDefault={false}
            >
                <Minimap
                    mapWidth={mapWidth}
                    mapHeight={mapHeight}
                    tileMapData={tileMapData}
                    objectMapData={objectMapData}
                    registryItems={registryItems}
                />
            </DraggableWindow>

            {/* Window 7: Map Resizer - Right side, only when open */}
            {isResizeWindowOpen && (
                <DraggableWindow
                    title="Resize Map"
                    defaultPosition={{ x: window.innerWidth - 320, y: 280 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                >
                    <MapResizer
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        onResize={onMapResize}
                    />
                </DraggableWindow>
            )}
        </>
    );
};

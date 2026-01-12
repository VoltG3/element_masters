import React from 'react';
import { buttonStyle, activeButtonStyle } from './constants';
import { PaletteSection } from './PaletteSection';
import AnimatedItem from '../../../utilities/AnimatedItem';
import BackgroundMusicPlayer from '../../../utilities/BackgroundMusicPlayer';

export const Toolbar = ({
    mapName,
    creatorName,
    openNewMapModal,
    saveMap,
    loadMap,
    showGrid,
    setShowGrid,
    clearMap,
    activeTool,
    setActiveTool,
    brushSize,
    setBrushSize,
    activeLayer,
    selection,
    moveSelection,
    setSelection,
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
    objectsCount
}) => {
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
                        {item.editorIcon || (item.subtype === 'above' ? 'ABOVE' : 'BELOW')}
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

    return (
        <div className="toolbar" style={{ width: '280px', padding: '15px', borderRight: '1px solid #ccc', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f8f8' }}>
            <div style={{ marginBottom: '15px' }}>
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '12px' }}>Map Name: <strong>{mapName}</strong></div>
                    <div style={{ fontSize: '12px' }}>Creator: <strong>{creatorName}</strong></div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <button onClick={openNewMapModal} style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: '#fff', borderColor: '#388E3C' }}>New</button>
                    <button onClick={saveMap} style={buttonStyle}>Save</button>
                    <label style={buttonStyle}>Load <input type="file" accept=".json,.txt" onChange={loadMap} style={{ display: 'none' }} /></label>
                    <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? activeButtonStyle : buttonStyle}>#</button>
                    <button onClick={clearMap} style={{ ...buttonStyle, color: 'red' }} title="Clear Map">✕</button>
                </div>

                <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>TOOLS</span>
                    <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeButtonStyle : buttonStyle}>🖌️</button>
                    <button onClick={() => setActiveTool('bucket')} style={activeTool === 'bucket' ? activeButtonStyle : buttonStyle}>🪣</button>
                    <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeButtonStyle : buttonStyle}>✋</button>

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

                    {activeTool === 'move' && selection && (
                        <div style={{ marginTop: '5px' }}>
                            <span style={{ fontSize: '11px', display: 'block' }}>Move Selection:</span>
                            <button onClick={() => moveSelection(0, -1)} style={buttonStyle}>▲</button>
                            <div style={{ display: 'inline-block' }}>
                                <button onClick={() => moveSelection(-1, 0)} style={buttonStyle}>◀</button>
                                <button onClick={() => moveSelection(1, 0)} style={buttonStyle}>▶</button>
                            </div>
                            <button onClick={() => moveSelection(0, 1)} style={buttonStyle}>▼</button>
                            <button onClick={() => setSelection(null)} style={{ ...buttonStyle, color: 'red', marginLeft: '5px' }}>✕</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="palette" style={{ flex: 1, overflowY: 'auto' }}>
                <PaletteSection title="Erasers" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <BlockEraser />
                        <ObjectEraser />
                        <SecretEraser />
                    </div>
                </PaletteSection>

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

                <PaletteSection title="Background Image" isOpenDefault={true}>
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
                </PaletteSection>

                <PaletteSection title="Background Music" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <select
                            value={selectedBackgroundMusic || ''}
                            onChange={(e) => setSelectedBackgroundMusic(e.target.value || null)}
                            style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                            <option value="">— None —</option>
                            {musicOptions.map(m => (
                                <option key={m.name} value={m.metaPath}>{m.name}</option>
                            ))}
                        </select>
                        <BackgroundMusicPlayer metaPath={selectedBackgroundMusic} enabled={true} volume={0.4} />
                        <div style={{ fontSize: '11px', color: '#555' }}>
                            Selected: {selectedBackgroundMusic ? selectedBackgroundMusic.split('/').pop() : 'None'}
                        </div>
                    </div>
                </PaletteSection>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #ccc', fontSize: '11px', backgroundColor: '#eee', padding: '10px' }}>
                <div style={{ marginBottom: '4px' }}>Size: <strong>{totalTiles}</strong> tiles</div>
                <div style={{ marginBottom: '4px', color: 'blue' }}>🟦 Filled Blocks: <strong>{filledBlocks}</strong></div>
                <div style={{ marginBottom: '4px', color: '#666' }}>⬜ Empty Blocks: <strong>{emptyBlocks}</strong></div>
                <div style={{ marginBottom: '4px', color: 'red' }}>🟥 Objects Count: <strong>{objectsCount}</strong></div>
            </div>
        </div>
    );
};

import React from 'react';
import { buttonStyle as baseButtonStyle, activeButtonStyle as baseActiveButtonStyle } from '../constants';

export const HeaderTools = ({ 
    showGrid, 
    setShowGrid,
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
    selectionMode,
    setSelectionMode,
    commitSelection,
    cancelSelection,
    selectedTile,
    handlePaletteSelect,
    selectedBackgroundColor,
    setSelectedBackgroundColor
}) => {
    const buttonStyle = {
        ...baseButtonStyle,
        margin: 0,
        height: '28px',
        fontSize: '11px',
        padding: '0 10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const activeButtonStyle = {
        ...baseActiveButtonStyle,
        margin: 0,
        height: '28px',
        fontSize: '11px',
        padding: '0 10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const toolButtonStyle = {
        ...buttonStyle,
        width: '28px',
        height: '28px',
        padding: 0,
        fontSize: '16px'
    };

    const activeToolButtonStyle = {
        ...activeButtonStyle,
        width: '28px',
        height: '28px',
        padding: 0,
        fontSize: '16px'
    };

    const eraserButtonStyle = (layer, color) => {
        const isActive = selectedTile === null && activeLayer === layer;
        return {
            ...toolButtonStyle,
            fontSize: '12px',
            fontWeight: 'bold',
            color: isActive ? '#fff' : color,
            backgroundColor: isActive ? color : '#f0f0f0',
            borderColor: isActive ? color : '#333'
        };
    };

    const dangerButtonStyle = {
        ...buttonStyle,
        color: '#d32f2f'
    };

    const playButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#4CAF50',
        color: '#fff',
        borderColor: '#388E3C'
    };

    const pauseButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#FF9800',
        color: '#fff',
        borderColor: '#F57C00'
    };

    const hoverStyle = (e, active = false) => {
        e.currentTarget.style.backgroundColor = active ? '#aaa' : '#ccc';
    };
    
    const unhoverStyle = (e, active = false) => {
        e.currentTarget.style.backgroundColor = active ? '#aaa' : '#f0f0f0';
    };

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isPlayMode && (
                <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid #ddd', paddingRight: '8px', marginRight: '4px', alignItems: 'center' }}>
                    {/* Active Layer Indicator */}
                    <div style={{ 
                        padding: '0 8px', 
                        height: '28px', 
                        backgroundColor: activeLayer === 'tile' ? '#e6f7ff' : (activeLayer === 'object' ? '#fff1f0' : '#f9f0ff'),
                        border: '1px solid',
                        borderColor: activeLayer === 'tile' ? '#91d5ff' : (activeLayer === 'object' ? '#ffa39e' : '#d3adf7'),
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '9px',
                        fontWeight: '800',
                        color: activeLayer === 'tile' ? '#1890ff' : (activeLayer === 'object' ? '#f5222d' : '#722ed1'),
                        textTransform: 'uppercase',
                        marginRight: '8px',
                        whiteSpace: 'nowrap'
                    }}>
                        Layer: {activeLayer === 'tile' ? 'Blocks' : (activeLayer === 'object' ? 'Objects' : 'Secrets')}
                    </div>

                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeToolButtonStyle : toolButtonStyle} title="Brush (B)">🖌️</button>
                        <button onClick={() => setActiveTool('bucket')} style={activeTool === 'bucket' ? activeToolButtonStyle : toolButtonStyle} title="Fill Bucket (F)">🪣</button>
                        <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeToolButtonStyle : toolButtonStyle} title="Move Selection (M)">✋</button>
                    </div>

                    {activeTool === 'brush' && (
                        <div style={{ display: 'flex', gap: '2px', marginLeft: '5px', paddingLeft: '5px', borderLeft: '1px solid #ddd' }}>
                            {[1, 2, 3, 4, 5].map(size => (
                                <button key={size} onClick={() => setBrushSize(size)}
                                    style={{ ...(brushSize === size ? activeButtonStyle : buttonStyle), width: '28px', height: '28px', padding: 0, justifyContent: 'center', fontSize: '13px' }}>
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '2px', marginLeft: '5px', paddingLeft: '5px', borderLeft: '1px solid #ddd' }}>
                        <button onClick={() => handlePaletteSelect(null, 'tile')} style={eraserButtonStyle('tile', 'blue')} title="Erase Blocks">⌫B</button>
                        <button onClick={() => handlePaletteSelect(null, 'object')} style={eraserButtonStyle('object', 'red')} title="Erase Objects">⌫O</button>
                        <button onClick={() => handlePaletteSelect(null, 'secret')} style={eraserButtonStyle('secret', 'purple')} title="Erase Secrets">⌫S</button>
                    </div>

                    {activeTool === 'move' && (
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '5px', paddingLeft: '5px', borderLeft: '1px solid #ddd' }}>
                            <button onClick={() => setSelectionMode('cut')} style={selectionMode === 'cut' ? activeButtonStyle : buttonStyle} title="Cut Selection">✂️</button>
                            <button onClick={() => setSelectionMode('copy')} style={selectionMode === 'copy' ? activeButtonStyle : buttonStyle} title="Copy Selection">📋</button>
                            
                            {selection && (
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button onClick={commitSelection} style={{ ...buttonStyle, backgroundColor: '#28a745', color: '#fff' }} title="Confirm Selection">✓</button>
                                    <button onClick={cancelSelection} style={{ ...buttonStyle, backgroundColor: '#dc3545', color: '#fff' }} title="Cancel Selection">✕</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <button 
                onClick={() => setShowGrid(!showGrid)} 
                style={showGrid ? activeButtonStyle : buttonStyle}
                onMouseEnter={hoverStyle}
                onMouseLeave={(e) => unhoverStyle(e, showGrid)}
                title={showGrid ? "Hide Grid Lines" : "Show Grid Lines"}
            >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{showGrid ? '▦' : '▢'}</span>
                <span>Grid</span>
            </button>

            {!isPlayMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px', paddingLeft: '8px', borderLeft: '1px solid #ddd' }}>
                    <span style={{ fontSize: '9px', color: '#666', fontWeight: '800', textTransform: 'uppercase' }}>BG Color:</span>
                    <input 
                        type="color" 
                        value={selectedBackgroundColor}
                        onChange={(e) => setSelectedBackgroundColor(e.target.value)}
                        style={{ 
                            width: '24px', 
                            height: '24px', 
                            border: '1px solid #333', 
                            padding: '1px', 
                            cursor: 'pointer',
                            backgroundColor: '#fff',
                            borderRadius: '3px',
                            boxSizing: 'border-box'
                        }} 
                        title="Background Color"
                    />
                </div>
            )}

            <div style={{ marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid #ddd', display: 'flex', gap: '4px' }}>
                {!isPlayMode ? (
                    <button 
                        onClick={handlePlay} 
                        style={playButtonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
                        title="Play Map"
                    >
                        <span style={{ fontSize: '15px' }}>▶</span>
                        <span>Play</span>
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={handlePause} 
                            style={pauseButtonStyle}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fb8c00'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF9800'}
                            title="Pause/Editor"
                        >
                            <span style={{ fontSize: '15px' }}>⏸</span>
                            <span>Pause</span>
                        </button>
                        <button 
                            onClick={handleReset} 
                            style={activeButtonStyle}
                            onMouseEnter={hoverStyle}
                            onMouseLeave={(e) => unhoverStyle(e, true)}
                            title="Reset State"
                        >
                            <span style={{ fontSize: '15px' }}>↻</span>
                            <span>Reset</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

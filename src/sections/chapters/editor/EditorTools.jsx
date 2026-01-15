import React from 'react';
import { 
    panelHeaderStyle, 
    buttonStyle, 
    activeButtonStyle,
    toolButtonStyle,
    activeToolButtonStyle,
    playButtonStyle,
    pauseButtonStyle,
    headerBarStyle,
    toolsGroupStyle,
    toolsInnerGroupStyle,
    layerIndicatorStyle,
    brushSizeButtonStyle,
    activeBrushSizeButtonStyle,
    confirmButtonStyle,
    cancelButtonStyle,
    bgColorContainerStyle,
    bgColorInputStyle,
    infoContainerStyle,
    infoItemStyle,
    infoLabelStyle,
    infoValueStyle
} from './styles/EditorToolsButtonStyle';

export const EditorTools = ({
    mapName, 
    creatorName, 
    activePanel, 
    togglePanel,
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
    const getEraserButtonStyle = (layer, color) => {
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

    const getLayerIndicatorStyle = () => {
        const colors = {
            tile: { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' },
            object: { bg: '#fff1f0', border: '#ffa39e', text: '#f5222d' },
            secret: { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' }
        };
        const active = colors[activeLayer] || colors.tile;
        return {
            ...layerIndicatorStyle,
            backgroundColor: active.bg,
            borderColor: active.border,
            color: active.text
        };
    };

    const hoverStyle = (e, active = false) => {
        e.currentTarget.style.backgroundColor = active ? '#aaa' : '#ccc';
    };
    
    const unhoverStyle = (e, active = false) => {
        e.currentTarget.style.backgroundColor = active ? '#aaa' : '#f0f0f0';
    };

    return (
        <div style={{ display: 'contents' }}>
            {/* Main Header Bar */}
            <div style={headerBarStyle}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isPlayMode && (
                        <div style={toolsGroupStyle}>
                            {/* Active Layer Indicator */}
                            <div style={getLayerIndicatorStyle()}>
                                Layer: {activeLayer === 'tile' ? 'Blocks' : (activeLayer === 'object' ? 'Objects' : 'Secrets')}
                            </div>

                            <div style={{ display: 'flex', gap: '2px' }}>
                                <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeToolButtonStyle : toolButtonStyle} title="Brush (B)">🖌️</button>
                                <button onClick={() => setActiveTool('bucket')} style={activeTool === 'bucket' ? activeToolButtonStyle : toolButtonStyle} title="Fill Bucket (F)">🪣</button>
                                <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeToolButtonStyle : toolButtonStyle} title="Move Selection (M)">✋</button>
                            </div>

                            {activeTool === 'brush' && (
                                <div style={toolsInnerGroupStyle}>
                                    {[1, 2, 3, 4, 5].map(size => (
                                        <button key={size} onClick={() => setBrushSize(size)}
                                            style={brushSize === size ? activeBrushSizeButtonStyle : brushSizeButtonStyle}
                                            onMouseEnter={hoverStyle}
                                            onMouseLeave={(e) => unhoverStyle(e, brushSize === size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div style={toolsInnerGroupStyle}>
                                <button onClick={() => handlePaletteSelect(null, 'tile')} style={getEraserButtonStyle('tile', 'blue')} title="Erase Blocks">⌫B</button>
                                <button onClick={() => handlePaletteSelect(null, 'object')} style={getEraserButtonStyle('object', 'red')} title="Erase Objects">⌫O</button>
                                <button onClick={() => handlePaletteSelect(null, 'secret')} style={getEraserButtonStyle('secret', 'purple')} title="Erase Secrets">⌫S</button>
                            </div>

                            {activeTool === 'move' && (
                                <div style={toolsInnerGroupStyle}>
                                    <button onClick={() => setSelectionMode('cut')} style={selectionMode === 'cut' ? activeButtonStyle : buttonStyle} title="Cut Selection">✂️</button>
                                    <button onClick={() => setSelectionMode('copy')} style={selectionMode === 'copy' ? activeButtonStyle : buttonStyle} title="Copy Selection">📋</button>
                                    
                                    {selection && (
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button onClick={commitSelection} style={confirmButtonStyle} title="Confirm Selection">✓</button>
                                            <button onClick={cancelSelection} style={cancelButtonStyle} title="Cancel Selection">✕</button>
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
                    </button>

                    {!isPlayMode && (
                        <div style={bgColorContainerStyle}>
                            <input 
                                type="color" 
                                value={selectedBackgroundColor}
                                onChange={(e) => setSelectedBackgroundColor(e.target.value)}
                                style={bgColorInputStyle} 
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

                <div style={infoContainerStyle}>
                    <div style={infoItemStyle}>
                        <span style={infoLabelStyle}>Map:</span>
                        <span style={infoValueStyle}>{mapName}</span>
                    </div>
                    <div style={infoItemStyle}>
                        <span style={infoLabelStyle}>By:</span>
                        <span style={infoValueStyle}>{creatorName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

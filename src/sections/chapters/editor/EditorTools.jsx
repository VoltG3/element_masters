import React from 'react';
import { 
    headerBarStyle, 
    toolsGroupStyle, 
    toolsInnerGroupStyle, 
    layerIndicatorStyle, 
    bgColorContainerStyle, 
    bgColorInputStyle, 
    infoContainerStyle, 
    infoItemStyle, 
    infoLabelStyle, 
    infoValueStyle, 
    ToolsEditorButton,
    toolButtonStyle
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
            backgroundColor: isActive ? color : '#333',
            borderColor: isActive ? color : '#555'
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

    return (
        <div style={{ display: 'contents' }}>
            {/* Main Header Bar */}
            <div style={headerBarStyle}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isPlayMode && (
                        <div style={toolsGroupStyle}>


                            <div style={{ display: 'flex', gap: '2px' }}>
                                <ToolsEditorButton onClick={() => setActiveTool('brush')} $active={activeTool === 'brush'} $square title="Brush (B)">🖌️</ToolsEditorButton>
                                <ToolsEditorButton onClick={() => setActiveTool('bucket')} $active={activeTool === 'bucket'} $square title="Fill Bucket (F)">🪣</ToolsEditorButton>
                                <ToolsEditorButton onClick={() => setActiveTool('move')} $active={activeTool === 'move'} $square title="Move Selection (M)">✋</ToolsEditorButton>
                            </div>

                            {activeTool === 'brush' && (
                                <div style={toolsInnerGroupStyle}>
                                    {['I', 'II', 'III', 'IV', 'V'].map((roman, idx) => {
                                        const size = idx + 1;
                                        return (
                                            <ToolsEditorButton key={size} onClick={() => setBrushSize(size)} $active={brushSize === size} $square title={`Brush Size ${size}`}>
                                                {roman}
                                            </ToolsEditorButton>
                                        );
                                    })}
                                </div>
                            )}

                            <div style={toolsInnerGroupStyle}>
                                <button onClick={() => handlePaletteSelect(null, 'tile')} style={getEraserButtonStyle('tile', 'blue')} title="Erase Blocks">⌫B</button>
                                <button onClick={() => handlePaletteSelect(null, 'object')} style={getEraserButtonStyle('object', 'red')} title="Erase Objects">⌫O</button>
                                <button onClick={() => handlePaletteSelect(null, 'secret')} style={getEraserButtonStyle('secret', 'purple')} title="Erase Secrets">⌫S</button>
                            </div>

                            {activeTool === 'move' && (
                                <div style={toolsInnerGroupStyle}>
                                    <ToolsEditorButton onClick={() => setSelectionMode('cut')} $active={selectionMode === 'cut'} $square title="Cut Selection">✂️</ToolsEditorButton>
                                    <ToolsEditorButton onClick={() => setSelectionMode('copy')} $active={selectionMode === 'copy'} $square title="Copy Selection">📋</ToolsEditorButton>
                                    <ToolsEditorButton onClick={commitSelection} $square title="Paste Selection">📥</ToolsEditorButton>
                                    {selection && (
                                        <ToolsEditorButton onClick={commitSelection} $square title="Confirm Selection">✓</ToolsEditorButton>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <ToolsEditorButton 
                        onClick={() => setShowGrid(!showGrid)} 
                        $active={showGrid}
                        $square
                        title={showGrid ? "Hide Grid Lines" : "Show Grid Lines"}
                    >
                        {showGrid ? '▦' : '▢'}
                    </ToolsEditorButton>

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

                    <div style={{ marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid #444', display: 'flex', gap: '4px' }}>
                        {!isPlayMode ? (
                            <ToolsEditorButton 
                                onClick={handlePlay} 
                                $variant="play"
                                $small
                                title="Play Map"
                            >
                                <span>▶</span>
                                <span>Play</span>
                            </ToolsEditorButton>
                        ) : (
                            <>
                                <ToolsEditorButton 
                                    onClick={handlePause} 
                                    $variant="pause"
                                    $small
                                    title="Pause/Editor"
                                >
                                    <span>⏸</span>
                                    <span>Pause</span>
                                </ToolsEditorButton>
                                <ToolsEditorButton 
                                    onClick={handleReset} 
                                    $small
                                    title="Reset State"
                                >
                                    <span>↻</span>
                                    <span>Reset</span>
                                </ToolsEditorButton>
                            </>
                        )}
                    </div>
                </div>
                {/* Active Layer Indicator */}
                <div style={getLayerIndicatorStyle()}>
                    Layer: {activeLayer === 'tile' ? 'Blocks' : (activeLayer === 'object' ? 'Objects' : 'Secrets')}
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

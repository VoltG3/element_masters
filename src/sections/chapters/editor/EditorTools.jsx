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
    EraserButtonContainer,
    EraserButtonInner
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
    setSelectedBackgroundColor,
    showBackgroundImage,
    setShowBackgroundImage
}) => {
    const getEraserData = (layer) => {
        const isActive = selectedTile === null && activeLayer === layer;
        const colors = {
            tile: { bg: '#e6f7ff', text: '#1890ff' },
            object: { bg: '#fff1f0', text: '#f5222d' },
            secret: { bg: '#f9f0ff', text: '#722ed1' }
        };
        const active = colors[layer] || colors.tile;
        return {
            isActive,
            bgColor: active.bg,
            textColor: active.text
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!isPlayMode && (
                            <div style={toolsGroupStyle}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <ToolsEditorButton onClick={() => setActiveTool('brush')} $active={activeTool === 'brush'} $square title="Brush (B)">🖌️</ToolsEditorButton>
                                    <ToolsEditorButton onClick={() => setActiveTool('bucket')} $active={activeTool === 'bucket'} $square title="Fill Bucket (F)">🪣</ToolsEditorButton>
                                    <ToolsEditorButton onClick={() => setActiveTool('move')} $active={activeTool === 'move'} $square title="Move Selection (M)">✋</ToolsEditorButton>
                                </div>

                                <div style={toolsInnerGroupStyle}>
                                    {['I', 'II', 'III', 'IV', 'V'].map((roman, idx) => {
                                        const size = idx + 1;
                                        const isDisabled = activeTool !== 'brush';
                                        return (
                                            <ToolsEditorButton 
                                                key={size} 
                                                onClick={() => !isDisabled && setBrushSize(size)} 
                                                $active={brushSize === size && !isDisabled} 
                                                $square 
                                                title={isDisabled ? "Brush size (Only for Brush tool)" : `Brush Size ${size}`}
                                                style={{ 
                                                    opacity: isDisabled ? 0.4 : 1,
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    position: 'relative'
                                                }}
                                            >
                                                {roman}
                                                {isDisabled && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '2px',
                                                        backgroundColor: '#f5222d',
                                                        transform: 'rotate(-45deg)',
                                                        top: '50%',
                                                        left: 0,
                                                        zIndex: 1
                                                    }} />
                                                )}
                                            </ToolsEditorButton>
                                        );
                                    })}
                                </div>

                                <div style={toolsInnerGroupStyle}>
                                    {['tile', 'object', 'secret'].map(layer => {
                                        const { isActive, bgColor, textColor } = getEraserData(layer);
                                        return (
                                            <EraserButtonContainer 
                                                key={layer}
                                                onClick={() => handlePaletteSelect(null, layer)}
                                                $active={isActive}
                                                title={`Erase ${layer === 'tile' ? 'Blocks' : (layer === 'object' ? 'Objects' : 'Secrets')}`}
                                            >
                                                <EraserButtonInner $bgColor={bgColor} $textColor={textColor} $active={isActive}>
                                                    ⌫{layer === 'tile' ? 'B' : (layer === 'object' ? 'O' : 'S')}
                                                </EraserButtonInner>
                                            </EraserButtonContainer>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <ToolsEditorButton 
                                        onClick={() => setShowBackgroundImage(!showBackgroundImage)} 
                                        $active={showBackgroundImage}
                                        $square
                                        title={showBackgroundImage ? "Hide Background Image" : "Show Background Image"}
                                    >
                                        🖼️
                                    </ToolsEditorButton>

                                    <ToolsEditorButton 
                                        onClick={() => setShowGrid(!showGrid)} 
                                        $active={showGrid}
                                        $square
                                        title={showGrid ? "Hide Grid Lines" : "Show Grid Lines"}
                                    >
                                        <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {showGrid ? '▦' : '▢'}
                                        </span>
                                    </ToolsEditorButton>
                                </div>

                                <div style={toolsInnerGroupStyle}>
                                    {['cut', 'copy'].map(mode => {
                                        const isDisabled = activeTool !== 'move';
                                        return (
                                            <ToolsEditorButton 
                                                key={mode}
                                                onClick={() => !isDisabled && setSelectionMode(mode)} 
                                                $active={selectionMode === mode && !isDisabled} 
                                                $square 
                                                title={isDisabled ? `${mode === 'cut' ? 'Cut' : 'Copy'} (Only for Move tool)` : `${mode === 'cut' ? 'Cut' : 'Copy'} Selection`}
                                                style={{ 
                                                    opacity: isDisabled ? 0.4 : 1,
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    position: 'relative'
                                                }}
                                            >
                                                {mode === 'cut' ? '✂️' : '📋'}
                                                {isDisabled && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '2px',
                                                        backgroundColor: '#f5222d',
                                                        transform: 'rotate(-45deg)',
                                                        top: '50%',
                                                        left: 0,
                                                        zIndex: 1
                                                    }} />
                                                )}
                                            </ToolsEditorButton>
                                        );
                                    })}
                                    <ToolsEditorButton 
                                        onClick={commitSelection} 
                                        $square 
                                        title={activeTool !== 'move' ? "Paste (Only for Move tool)" : "Paste Selection"}
                                        style={{ 
                                            opacity: activeTool !== 'move' ? 0.4 : 1,
                                            cursor: activeTool !== 'move' ? 'not-allowed' : 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        📥
                                        {activeTool !== 'move' && (
                                            <div style={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '2px',
                                                backgroundColor: '#f5222d',
                                                transform: 'rotate(-45deg)',
                                                top: '50%',
                                                left: 0,
                                                zIndex: 1
                                            }} />
                                        )}
                                    </ToolsEditorButton>
                                    {selection && (
                                        <div style={{ display: 'flex', gap: '5px', marginLeft: '5px', borderLeft: '1px solid #ccc', paddingLeft: '5px' }}>
                                            <ToolsEditorButton onClick={commitSelection} $square title="Confirm Selection (Enter)" style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }}>✓</ToolsEditorButton>
                                            <ToolsEditorButton onClick={cancelSelection} $square title="Cancel Selection (Esc)" style={{ backgroundColor: '#fff1f0', color: '#f5222d' }}>✕</ToolsEditorButton>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {isPlayMode && (
                             <ToolsEditorButton 
                                onClick={() => setShowGrid(!showGrid)} 
                                $active={showGrid}
                                $square
                                title={showGrid ? "Hide Grid Lines" : "Show Grid Lines"}
                            >
                                <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {showGrid ? '▦' : '▢'}
                                </span>
                            </ToolsEditorButton>
                        )}
                    </div>


                    <div style={{ display: 'flex', gap: '10px' }}>
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

                        {!isPlayMode ? (
                            <ToolsEditorButton 
                                onClick={handlePlay} 
                                $variant="play"
                                $square
                                title="Play Map"
                            >
                                <span>▶</span>
                            </ToolsEditorButton>
                        ) : (
                            <>
                                <ToolsEditorButton 
                                    onClick={handlePause} 
                                    $variant="pause"
                                    $square
                                    title="Pause/Editor"
                                >
                                    <span>⏸</span>
                                </ToolsEditorButton>
                                <ToolsEditorButton 
                                    onClick={handleReset} 
                                    $square
                                    title="Reset State"
                                >
                                    <span>↻</span>
                                </ToolsEditorButton>
                            </>
                        )}
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

import React from 'react';
import { 
    headerBarStyle, 
    toolsGroupStyle, 
    toolsInnerGroupStyle, 
    layerIndicatorStyle, 
    bgColorContainerStyle, 
    bgColorInputStyle, 
    PlayButtonContainer,
    PlayButtonInner,
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

    const StrikeThrough = () => (
        <div style={{
            position: 'absolute',
            width: '100%',
            height: '2px',
            backgroundColor: '#f5222d',
            transform: 'rotate(-45deg)',
            top: '50%',
            left: 0,
            zIndex: 2,
            pointerEvents: 'none'
        }} />
    );

    return (
        <div style={{ display: 'contents' }}>
            {/* Main Header Bar */}
            <div style={headerBarStyle}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={toolsGroupStyle}>

                        {/* Brush - Bucket - Move */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[
                                { id: 'brush', icon: '🖌️', title: 'Brush (B)' },
                                { id: 'bucket', icon: '🪣', title: 'Fill Bucket (F)' },
                                { id: 'move', icon: '✋', title: 'Move Selection (M)' }
                            ].map(tool => (
                                <ToolsEditorButton
                                    key={tool.id}
                                    onClick={() => !isPlayMode && setActiveTool(tool.id)}
                                    $active={activeTool === tool.id && !isPlayMode}
                                    $square
                                    title={isPlayMode ? "Disabled in Play Mode" : tool.title}
                                    style={{
                                        opacity: isPlayMode ? 0.4 : 1,
                                        cursor: isPlayMode ? 'not-allowed' : 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    {tool.icon}
                                    {isPlayMode && <StrikeThrough />}
                                </ToolsEditorButton>
                            ))}
                        </div>

                        {/* Cut - Copy - Paste */}
                        <div style={toolsInnerGroupStyle}>
                            {['cut', 'copy'].map(mode => {
                                const isDisabled = isPlayMode || activeTool !== 'move';
                                return (
                                    <ToolsEditorButton
                                        key={mode}
                                        onClick={() => !isDisabled && setSelectionMode(mode)}
                                        $active={selectionMode === mode && !isDisabled}
                                        $square
                                        title={isPlayMode ? "Disabled in Play Mode" : (isDisabled ? `${mode === 'cut' ? 'Cut' : 'Copy'} (Only for Move tool)` : `${mode === 'cut' ? 'Cut' : 'Copy'} Selection`)}
                                        style={{
                                            opacity: isDisabled ? 0.4 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        {mode === 'cut' ? '✂️' : '📋'}
                                        {isDisabled && <StrikeThrough />}
                                    </ToolsEditorButton>
                                );
                            })}
                            <ToolsEditorButton
                                onClick={() => !isPlayMode && activeTool === 'move' && commitSelection()}
                                $square
                                title={isPlayMode ? "Disabled in Play Mode" : (activeTool !== 'move' ? "Paste (Only for Move tool)" : "Paste Selection")}
                                style={{
                                    opacity: (isPlayMode || activeTool !== 'move') ? 0.4 : 1,
                                    cursor: (isPlayMode || activeTool !== 'move') ? 'not-allowed' : 'pointer',
                                    position: 'relative'
                                }}
                            >
                                📥
                                {(isPlayMode || activeTool !== 'move') && <StrikeThrough />}
                            </ToolsEditorButton>
                            {selection && !isPlayMode && (
                                <div style={{ display: 'flex', gap: '5px', marginLeft: '5px', borderLeft: '1px solid #ccc', paddingLeft: '5px' }}>
                                    <ToolsEditorButton onClick={commitSelection} $square title="Confirm Selection (Enter)" style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }}>✓</ToolsEditorButton>
                                    <ToolsEditorButton onClick={cancelSelection} $square title="Cancel Selection (Esc)" style={{ backgroundColor: '#fff1f0', color: '#f5222d' }}>✕</ToolsEditorButton>
                                </div>
                            )}
                        </div>

                        {/* Size */}
                        <div style={toolsInnerGroupStyle}>
                            {['I', 'II', 'III', 'IV', 'V'].map((roman, idx) => {
                                const size = idx + 1;
                                const isDisabled = isPlayMode || activeTool !== 'brush';
                                return (
                                    <ToolsEditorButton 
                                        key={size} 
                                        onClick={() => !isDisabled && setBrushSize(size)} 
                                        $active={brushSize === size && !isDisabled} 
                                        $square 
                                        title={isPlayMode ? "Disabled in Play Mode" : (isDisabled ? "Brush size (Only for Brush tool)" : `Brush Size ${size}`)}
                                        style={{ 
                                            opacity: isDisabled ? 0.4 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        {roman}
                                        {isDisabled && <StrikeThrough />}
                                    </ToolsEditorButton>
                                );
                            })}
                        </div>

                        {/* Layers: Block - Object - Sector */}
                        <div style={toolsInnerGroupStyle}>
                            {['tile', 'object', 'secret'].map(layer => {
                                const { isActive, bgColor, textColor } = getEraserData(layer);
                                const isDisabled = isPlayMode;
                                return (
                                    <EraserButtonContainer 
                                        key={layer}
                                        onClick={() => !isDisabled && handlePaletteSelect(null, layer)}
                                        $active={isActive && !isDisabled}
                                        title={isDisabled ? "Disabled in Play Mode" : `Erase ${layer === 'tile' ? 'Blocks' : (layer === 'object' ? 'Objects' : 'Sectors')}`}
                                        style={{ 
                                            opacity: isDisabled ? 0.4 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        <EraserButtonInner $bgColor={bgColor} $textColor={textColor} $active={isActive && !isDisabled}>
                                            ⌫{layer === 'tile' ? 'B' : (layer === 'object' ? 'O' : 'S')}
                                        </EraserButtonInner>
                                        {isDisabled && <StrikeThrough />}
                                    </EraserButtonContainer>
                                );
                            })}
                        </div>

                        {/* Background Immage */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <ToolsEditorButton
                                onClick={() => !isPlayMode && setShowBackgroundImage(!showBackgroundImage)}
                                $active={showBackgroundImage && !isPlayMode}
                                $square
                                title={isPlayMode ? "Disabled in Play Mode" : (showBackgroundImage ? "Hide Background Image" : "Show Background Image")}
                                style={{
                                    opacity: isPlayMode ? 0.4 : 1,
                                    cursor: isPlayMode ? 'not-allowed' : 'pointer',
                                    position: 'relative'
                                }}
                            >
                                🖼️
                                {isPlayMode && <StrikeThrough />}
                            </ToolsEditorButton>

                            {/* Grid */}
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

                        {/* Background Color Picker */}
                        <div style={bgColorContainerStyle}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={selectedBackgroundColor}
                                    onChange={(e) => !isPlayMode && setSelectedBackgroundColor(e.target.value)}
                                    style={{
                                        ...bgColorInputStyle,
                                        opacity: isPlayMode ? 0.4 : 1,
                                        cursor: isPlayMode ? 'not-allowed' : 'pointer'
                                    }}
                                    title={isPlayMode ? "Disabled in Play Mode" : "Background Color"}
                                    disabled={isPlayMode}
                                />
                                {isPlayMode && <StrikeThrough />}
                            </div>
                        </div>

                        {/* Active Layer Indicator */}
                        <div style={toolsInnerGroupStyle}>
                            <div style={getLayerIndicatorStyle()}>
                                Layer: {activeLayer === 'tile' ? 'Blocks' : (activeLayer === 'object' ? 'Objects' : 'Sectors')}
                            </div>
                        </div>

                    </div>
                </div>


                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <PlayButtonContainer onClick={isPlayMode ? handlePause : handlePlay} title={isPlayMode ? "Pause/Editor" : "Play Map"}>
                            <PlayButtonInner $variant={isPlayMode ? 'pause' : 'play'}>
                                <span>{isPlayMode ? '⏸' : '▶'}</span>
                            </PlayButtonInner>
                        </PlayButtonContainer>

                        <PlayButtonContainer onClick={handleReset} title="Reset State">
                            <PlayButtonInner>
                                <span>↻</span>
                            </PlayButtonInner>
                        </PlayButtonContainer>
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
        </div>
    );
};

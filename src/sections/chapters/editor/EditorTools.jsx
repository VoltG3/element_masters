import React from 'react';
import { 
    EditorToolsContainer,
    HeaderBar,
    ToolsSection,
    ToolsGroup,
    ToolsInnerGroup,
    ToolsRow,
    ToolsEditorButton,
    StrikeThrough,
    LayerIndicator,
    BgColorContainer,
    BgColorInputWrapper,
    BgColorInput,
    PlayButtonContainer,
    PlayButtonInner,
    InfoContainer,
    InfoItem,
    InfoLabel,
    InfoValue,
    EraserButtonContainer,
    EraserButtonInner,
    SelectionActions,
    ConfirmButton,
    CancelButton,
    GridIcon
} from './styles/EditorToolsButton';

export const EditorTools = (props) => {
    const {
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
        setShowBackgroundImage,
        isRoomAreaVisible,
        setIsRoomAreaVisible
    } = props;
    const getEraserData = (layer) => {
        const isActive = selectedTile === null && activeLayer === layer;
        const colors = {
            tile: { bg: '#e6f7ff', text: '#1890ff' },
            object: { bg: '#fff1f0', text: '#f5222d' },
            secret: { bg: '#f9f0ff', text: '#722ed1' },
            props: { bg: '#fffbe6', text: '#faad14' }
        };
        const active = colors[layer] || colors.tile;
        return {
            isActive,
            bgColor: active.bg,
            textColor: active.text
        };
    };

    const getLayerIndicatorData = () => {
        const colors = {
            tile: { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' },
            object: { bg: '#fff1f0', border: '#ffa39e', text: '#f5222d' },
            secret: { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' },
            props: { bg: '#fffbe6', border: '#ffe58f', text: '#faad14' }
        };
        const active = colors[activeLayer] || colors.tile;
        return {
            $bgColor: active.bg,
            $borderColor: active.border,
            $textColor: active.text
        };
    };

    return (
        <EditorToolsContainer>
            {/* Main Header Bar */}
            <HeaderBar>
                <ToolsSection>
                    <ToolsGroup>

                        {/* Brush - Bucket - Move - Area */}
                        <ToolsRow>
                            {[
                                { id: 'brush', icon: '🖌️', title: 'Brush (B)' },
                                { id: 'bucket', icon: '🪣', title: 'Fill Bucket (F)' },
                                { id: 'move', icon: '✋', title: 'Move Selection (M)' },
                                { id: 'area', icon: <span style={{fontSize: '14px', fontWeight: 'bold'}}>m<sup>2</sup></span>, title: 'Room Area Tool' }
                            ].map(tool => (
                                <ToolsEditorButton
                                    key={tool.id}
                                    onClick={() => !isPlayMode && setActiveTool(tool.id)}
                                    $active={activeTool === tool.id && !isPlayMode}
                                    $square
                                    $disabled={isPlayMode}
                                    title={isPlayMode ? "Disabled in Play Mode" : tool.title}
                                >
                                    {tool.icon}
                                    {isPlayMode && <StrikeThrough />}
                                </ToolsEditorButton>
                            ))}
                        </ToolsRow>

                        {/* Cut - Copy - Paste */}
                        <ToolsInnerGroup>
                            {['cut', 'copy'].map(mode => {
                                const isDisabled = isPlayMode || activeTool !== 'move';
                                return (
                                    <ToolsEditorButton
                                        key={mode}
                                        onClick={() => !isDisabled && setSelectionMode(mode)}
                                        $active={selectionMode === mode && !isDisabled}
                                        $square
                                        $disabled={isDisabled}
                                        title={isPlayMode ? "Disabled in Play Mode" : (isDisabled ? `${mode === 'cut' ? 'Cut' : 'Copy'} (Only for Move tool)` : `${mode === 'cut' ? 'Cut' : 'Copy'} Selection`)}
                                    >
                                        {mode === 'cut' ? '✂️' : '📋'}
                                        {isDisabled && <StrikeThrough />}
                                    </ToolsEditorButton>
                                );
                            })}
                            <ToolsEditorButton
                                onClick={() => !isPlayMode && activeTool === 'move' && commitSelection()}
                                $square
                                $disabled={isPlayMode || activeTool !== 'move'}
                                title={isPlayMode ? "Disabled in Play Mode" : (activeTool !== 'move' ? "Paste (Only for Move tool)" : "Paste Selection")}
                            >
                                📥
                                {(isPlayMode || activeTool !== 'move') && <StrikeThrough />}
                            </ToolsEditorButton>
                            {selection && !isPlayMode && (
                                <SelectionActions>
                                    <ConfirmButton onClick={commitSelection} $square title="Confirm Selection (Enter)">✓</ConfirmButton>
                                    <CancelButton onClick={cancelSelection} $square title="Cancel Selection (Esc)">✕</CancelButton>
                                </SelectionActions>
                            )}
                        </ToolsInnerGroup>

                        {/* Size */}
                        <ToolsInnerGroup>
                            {['I', 'II', 'III', 'IV', 'V'].map((roman, idx) => {
                                const size = idx + 1;
                                const isDisabled = isPlayMode || activeTool !== 'brush';
                                return (
                                    <ToolsEditorButton 
                                        key={size} 
                                        onClick={() => !isDisabled && setBrushSize(size)} 
                                        $active={brushSize === size && !isDisabled} 
                                        $square 
                                        $disabled={isDisabled}
                                        title={isPlayMode ? "Disabled in Play Mode" : (isDisabled ? "Brush size (Only for Brush tool)" : `Brush Size ${size}`)}
                                    >
                                        {roman}
                                        {isDisabled && <StrikeThrough />}
                                    </ToolsEditorButton>
                                );
                            })}
                        </ToolsInnerGroup>

                        {/* Background Immage */}
                        <ToolsRow>
                            <ToolsEditorButton
                                onClick={() => !isPlayMode && setShowBackgroundImage(!showBackgroundImage)}
                                $active={showBackgroundImage && !isPlayMode}
                                $square
                                $disabled={isPlayMode}
                                title={isPlayMode ? "Disabled in Play Mode" : (showBackgroundImage ? "Hide Background Image" : "Show Background Image")}
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
                                <GridIcon>
                                    {showGrid ? '▦' : '▢'}
                                </GridIcon>
                            </ToolsEditorButton>

                            {/* Room Area Visibility */}
                            <ToolsEditorButton
                                onClick={() => setIsRoomAreaVisible(!isRoomAreaVisible)}
                                $active={isRoomAreaVisible}
                                $square
                                title={isRoomAreaVisible ? "Hide Room Areas Overlay" : "Show Room Areas Overlay"}
                            >
                                <span style={{ fontSize: '14px' }}>🏠</span>
                            </ToolsEditorButton>

                            {/* Background Color Picker */}
                            <BgColorContainer>
                                <BgColorInputWrapper>
                                    <BgColorInput
                                        type="color"
                                        value={selectedBackgroundColor}
                                        onChange={(e) => !isPlayMode && setSelectedBackgroundColor(e.target.value)}
                                        title={isPlayMode ? "Disabled in Play Mode" : "Background Color"}
                                        disabled={isPlayMode}
                                    />
                                    {isPlayMode && <StrikeThrough />}
                                </BgColorInputWrapper>
                            </BgColorContainer>
                        </ToolsRow>



                        {/* Active Layer Indicator */}
                        <ToolsInnerGroup>
                            <LayerIndicator {...getLayerIndicatorData()}>
                                Layer: {activeLayer === 'tile' ? 'Blocks' : (activeLayer === 'object' ? 'Objects' : (activeLayer === 'secret' ? 'Sectors' : 'Properties'))}
                            </LayerIndicator>
                        </ToolsInnerGroup>

                        {/* Layers: Block - Object - Sector - Props */}
                        <ToolsInnerGroup>
                            {['tile', 'object', 'secret', 'props'].map(layer => {
                                const { isActive, bgColor, textColor } = getEraserData(layer);
                                const isDisabled = isPlayMode;
                                return (
                                    <EraserButtonContainer
                                        key={layer}
                                        onClick={() => !isDisabled && handlePaletteSelect(null, layer)}
                                        $active={isActive && !isDisabled}
                                        $disabled={isDisabled}
                                        title={isDisabled ? "Disabled in Play Mode" : `Erase ${layer === 'tile' ? 'Blocks' : (layer === 'object' ? 'Objects' : (layer === 'secret' ? 'Sectors' : 'Properties'))}`}
                                    >
                                        <EraserButtonInner $bgColor={bgColor} $textColor={textColor} $active={isActive && !isDisabled}>
                                            ⌫{layer === 'tile' ? 'B' : (layer === 'object' ? 'O' : (layer === 'secret' ? 'S' : 'P'))}
                                        </EraserButtonInner>
                                        {isDisabled && <StrikeThrough />}
                                    </EraserButtonContainer>
                                );
                            })}
                        </ToolsInnerGroup>

                        <ToolsInnerGroup>
                            <ToolsRow>
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
                            </ToolsRow>
                        </ToolsInnerGroup>
                    </ToolsGroup>
                </ToolsSection>


                <ToolsSection>
                    <InfoContainer>
                        <InfoItem>
                            <InfoLabel>Map:</InfoLabel>
                            <InfoValue>{mapName}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>By:</InfoLabel>
                            <InfoValue>{creatorName}</InfoValue>
                        </InfoItem>
                    </InfoContainer>
                </ToolsSection>
            </HeaderBar>
        </EditorToolsContainer>
    );
};

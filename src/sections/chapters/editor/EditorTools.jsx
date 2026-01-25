import React from 'react';
import { useTranslation } from 'react-i18next';
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
    BgTransparentButton,
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
    const { t } = useTranslation('editor_tools');
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
        showMessages,
        setShowMessages,
        isRoomAreaVisible,
        setIsRoomAreaVisible,
        showRoomMapContent,
        setShowRoomMapContent
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
                                { id: 'brush', icon: '🖌️', title: t('EDITOR_TOOLS_BRUSH_TITLE') },
                                { id: 'bucket', icon: '🪣', title: t('EDITOR_TOOLS_BUCKET_TITLE') },
                                { id: 'move', icon: '✋', title: t('EDITOR_TOOLS_MOVE_TITLE') },
                            ].map(tool => (
                                <ToolsEditorButton
                                    key={tool.id}
                                    onClick={() => !isPlayMode && setActiveTool(tool.id)}
                                    $active={activeTool === tool.id && !isPlayMode}
                                    $square
                                    $disabled={isPlayMode}
                                    title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : tool.title}
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
                                        title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : (isDisabled ? (mode === 'cut' ? t('EDITOR_TOOLS_CUT_ONLY_MOVE') : t('EDITOR_TOOLS_COPY_ONLY_MOVE')) : (mode === 'cut' ? t('EDITOR_TOOLS_CUT_SELECTION') : t('EDITOR_TOOLS_COPY_SELECTION')))}
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
                                title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : (activeTool !== 'move' ? t('EDITOR_TOOLS_PASTE_ONLY_MOVE') : t('EDITOR_TOOLS_PASTE_SELECTION'))}
                            >
                                📥
                                {(isPlayMode || activeTool !== 'move') && <StrikeThrough />}
                            </ToolsEditorButton>
                            {selection && !isPlayMode && (
                                <SelectionActions>
                                    <ConfirmButton onClick={commitSelection} $square title={t('EDITOR_TOOLS_CONFIRM_SELECTION')}>✓</ConfirmButton>
                                    <CancelButton onClick={cancelSelection} $square title={t('EDITOR_TOOLS_CANCEL_SELECTION')}>✕</CancelButton>
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
                                    title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : (isDisabled ? t('EDITOR_TOOLS_BRUSH_SIZE_ONLY') : t('EDITOR_TOOLS_BRUSH_SIZE', { size }))}
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
                                title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : (showBackgroundImage ? t('EDITOR_TOOLS_BACKGROUND_IMAGE_HIDE') : t('EDITOR_TOOLS_BACKGROUND_IMAGE_SHOW'))}
                            >
                                🖼️
                                {isPlayMode && <StrikeThrough />}
                            </ToolsEditorButton>

                            {/* Grid */}
                            <ToolsEditorButton
                                onClick={() => setShowGrid(!showGrid)}
                                $active={showGrid}
                                $square
                                title={showGrid ? t('EDITOR_TOOLS_GRID_HIDE') : t('EDITOR_TOOLS_GRID_SHOW')}
                            >
                                <GridIcon>
                                    {showGrid ? '▦' : '▢'}
                                </GridIcon>
                            </ToolsEditorButton>

                            {/* Messages Visibility */}
                            <ToolsEditorButton
                                onClick={() => setShowMessages(!showMessages)}
                                $active={showMessages}
                                $square
                                title={showMessages ? t('EDITOR_TOOLS_MESSAGES_HIDE') : t('EDITOR_TOOLS_MESSAGES_SHOW')}
                            >
                                𝔐
                            </ToolsEditorButton>

                            {/* Room Area Visibility */}
                            <ToolsEditorButton
                                onClick={() => setIsRoomAreaVisible(!isRoomAreaVisible)}
                                $active={isRoomAreaVisible}
                                $square
                                title={isRoomAreaVisible ? t('EDITOR_TOOLS_ROOM_AREA_HIDE') : t('EDITOR_TOOLS_ROOM_AREA_SHOW')}
                            >
                                <span style={{ fontSize: '14px' }}>🏠</span>
                            </ToolsEditorButton>

                            {/* Room Map Content Visibility */}
                            <ToolsEditorButton
                                onClick={() => setShowRoomMapContent(!showRoomMapContent)}
                                $active={showRoomMapContent}
                                $square
                                title={showRoomMapContent ? t('EDITOR_TOOLS_ROOM_CONTENT_HIDE') : t('EDITOR_TOOLS_ROOM_CONTENT_SHOW')}
                            >
                                <span style={{ fontSize: '14px' }}>👁️‍🗨️</span>
                            </ToolsEditorButton>

                            {/* Background Color Picker */}
                            <BgColorContainer>
                                <BgColorInputWrapper>
                                    <BgColorInput
                                        type="color"
                                        value={selectedBackgroundColor && selectedBackgroundColor !== 'transparent' ? selectedBackgroundColor : '#000000'}
                                        onChange={(e) => !isPlayMode && setSelectedBackgroundColor(e.target.value)}
                                        title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : t('EDITOR_TOOLS_BG_COLOR')}
                                        disabled={isPlayMode}
                                    />
                                    {isPlayMode && <StrikeThrough />}
                                </BgColorInputWrapper>
                                <BgTransparentButton 
                                    $active={selectedBackgroundColor === 'transparent'}
                                    onClick={() => !isPlayMode && setSelectedBackgroundColor('transparent')}
                                    title={isPlayMode ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : t('EDITOR_TOOLS_BG_TRANSPARENT')}
                                />
                            </BgColorContainer>
                        </ToolsRow>



                        {/* Active Layer Indicator */}
                        <ToolsInnerGroup>
                            <LayerIndicator {...getLayerIndicatorData()}>
                                {t('EDITOR_TOOLS_LAYER_LABEL', {
                                    layer: activeLayer === 'tile'
                                        ? t('EDITOR_TOOLS_LAYER_BLOCKS')
                                        : (activeLayer === 'object'
                                            ? t('EDITOR_TOOLS_LAYER_OBJECTS')
                                            : (activeLayer === 'secret'
                                                ? t('EDITOR_TOOLS_LAYER_SECTORS')
                                                : t('EDITOR_TOOLS_LAYER_PROPERTIES')))
                                })}
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
                                        title={isDisabled ? t('EDITOR_TOOLS_DISABLED_PLAY_MODE') : t('EDITOR_TOOLS_ERASE_LABEL', {
                                            layer: layer === 'tile'
                                                ? t('EDITOR_TOOLS_LAYER_BLOCKS')
                                                : (layer === 'object'
                                                    ? t('EDITOR_TOOLS_LAYER_OBJECTS')
                                                    : (layer === 'secret'
                                                        ? t('EDITOR_TOOLS_LAYER_SECTORS')
                                                        : t('EDITOR_TOOLS_LAYER_PROPERTIES')))
                                        })}
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
                                <PlayButtonContainer onClick={isPlayMode ? handlePause : handlePlay} title={isPlayMode ? t('EDITOR_TOOLS_PAUSE_TITLE') : t('EDITOR_TOOLS_PLAY_TITLE')}>
                                    <PlayButtonInner $variant={isPlayMode ? 'pause' : 'play'}>
                                        <span>{isPlayMode ? '⏸' : '▶'}</span>
                                    </PlayButtonInner>
                                </PlayButtonContainer>

                                <PlayButtonContainer onClick={handleReset} title={t('EDITOR_TOOLS_RESET_TITLE')}>
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
                            <InfoLabel>{t('EDITOR_TOOLS_INFO_MAP')}</InfoLabel>
                            <InfoValue>{mapName}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                            <InfoLabel>{t('EDITOR_TOOLS_INFO_BY')}</InfoLabel>
                            <InfoValue>{creatorName}</InfoValue>
                        </InfoItem>
                    </InfoContainer>
                </ToolsSection>
            </HeaderBar>
        </EditorToolsContainer>
    );
};

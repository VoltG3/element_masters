import React from 'react';
import { HeaderTools } from './editorTools/HeaderTools';

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
    return (
        <div style={{
            padding: '8px 15px',
            backgroundColor: '#f0f0f0',
            fontWeight: 'bold',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none',
            borderBottom: '1px solid #ddd',
            boxSizing: 'border-box',
            zIndex: 1000,
            position: 'relative'
        }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <HeaderTools 
                    showGrid={showGrid}
                    setShowGrid={setShowGrid}
                    isPlayMode={isPlayMode}
                    handlePlay={handlePlay}
                    handlePause={handlePause}
                    handleReset={handleReset}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    brushSize={brushSize}
                    setBrushSize={setBrushSize}
                    activeLayer={activeLayer}
                    selection={selection}
                    moveSelection={moveSelection}
                    selectionMode={selectionMode}
                    setSelectionMode={setSelectionMode}
                    commitSelection={commitSelection}
                    cancelSelection={cancelSelection}
                    selectedTile={selectedTile}
                    handlePaletteSelect={handlePaletteSelect}
                    selectedBackgroundColor={selectedBackgroundColor}
                    setSelectedBackgroundColor={setSelectedBackgroundColor}
                />
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: '#666', marginLeft: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>Map:</span>
                    <span style={{ color: '#000', fontSize: '12px' }}>{mapName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>By:</span>
                    <span style={{ color: '#000', fontSize: '12px' }}>{creatorName}</span>
                </div>
            </div>
        </div>
    );
};

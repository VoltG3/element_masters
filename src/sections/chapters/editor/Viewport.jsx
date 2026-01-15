import React from 'react';
import { ObjectLinks } from './viewport/ObjectLinks';
import { EditorTile } from './viewport/EditorTile';

export const Viewport = ({
    mapWidth,
    mapHeight,
    selectedBackgroundUrl,
    selectedBackgroundColor,
    selectedBackgroundImage,
    showGrid,
    activeLayer,
    activeTool,
    tileMapData,
    objectMapData,
    secretMapData,
    objectMetadata,
    registryItems,
    hoverIndex,
    highlightedIndex,
    brushSize,
    bucketPreviewIndices,
    selection,
    previewPosition,
    dragStart,
    isDragging,
    handleGridMouseDown,
    handleGridMouseEnter,
    handleGridMouseUp,
    handleGridMouseLeave,
    setIsDragging
}) => {
    return (
        <div className="viewport"
            style={{
                flex: 1, padding: '40px', backgroundColor: '#555',
                overflow: 'auto', position: 'relative', userSelect: 'none'
            }}
            onMouseUp={() => setIsDragging(false)}>
            <div style={{ position: 'relative', width: 'fit-content' }} onMouseLeave={handleGridMouseLeave}>
                
                <ObjectLinks 
                    mapWidth={mapWidth} 
                    mapHeight={mapHeight} 
                    objectMapData={objectMapData} 
                    objectMetadata={objectMetadata} 
                />

                <div
                    style={{
                        position: 'absolute', top: 0, left: 0,
                        width: mapWidth * 32, height: mapHeight * 32,
                        backgroundImage: selectedBackgroundUrl ? `url(${selectedBackgroundUrl})` : 'none',
                        backgroundColor: !selectedBackgroundUrl ? selectedBackgroundColor : 'transparent',
                        backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%',
                        zIndex: 0, pointerEvents: 'none'
                    }}
                />

                <div className="grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${mapWidth}, 32px)`,
                        gridTemplateRows: `repeat(${mapHeight}, 32px)`,
                        gap: '0px', border: '1px solid #444', backgroundColor: 'transparent',
                        backgroundImage: showGrid ? `
                            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                        ` : 'none',
                        backgroundSize: '32px 32px',
                        position: 'relative', cursor: activeTool === 'bucket' ? 'cell' : 'default',
                        zIndex: 1
                    }}>
                    {Array(mapWidth * mapHeight).fill(0).map((_, index) => {
                        const x = index % mapWidth;
                        const y = Math.floor(index / mapWidth);

                        let dTileId = tileMapData[index];
                        let dObjId = objectMapData[index];
                        let dSecId = secretMapData?.[index];

                        if (selection && previewPosition) {
                            const { w, h } = selection;
                            const px = previewPosition.x;
                            const py = previewPosition.y;
                            if (x >= px && x < px + w && y >= py && y < py + h) {
                                const idx = (y - py) * w + (x - px);
                                dTileId = selection.tileData[idx];
                                dObjId = selection.objectData[idx];
                                dSecId = selection.secretData?.[idx];
                            }
                        }

                        const tileObj = dTileId ? registryItems.find(r => r.id === dTileId) : null;
                        const objObj = dObjId ? registryItems.find(r => r.id === dObjId) : null;
                        const secretObj = dSecId ? registryItems.find(r => r.id === dSecId) : null;

                        let borderStyle = 'none';
                        let bgStyle = 'transparent';

                        if (activeTool === 'brush' && hoverIndex !== null) {
                            const hx = hoverIndex % mapWidth;
                            const hy = Math.floor(hoverIndex / mapWidth);
                            if (x >= hx && x < hx + brushSize && y >= hy && y < hy + brushSize) borderStyle = '2px solid red';
                        } else if (activeTool === 'bucket') {
                            if (bucketPreviewIndices.has(index)) { borderStyle = '1px dashed orange'; bgStyle = 'rgb(168,187,220)'; }
                            else if (hoverIndex === index) borderStyle = '2px solid orange';
                        } else if (activeTool === 'move') {
                            if (isDragging && dragStart && hoverIndex !== null) {
                                const hx = hoverIndex % mapWidth;
                                const hy = Math.floor(hoverIndex / mapWidth);
                                const minX = Math.min(dragStart.x, hx);
                                const minY = Math.min(dragStart.y, hy);
                                const maxX = Math.max(dragStart.x, hx);
                                const maxY = Math.max(dragStart.y, hy);
                                if (x >= minX && x <= maxX && y >= minY && y <= maxY) { borderStyle = '1px dashed blue'; bgStyle = 'rgba(0, 0, 255, 0.1)'; }
                            } else if (!isDragging && hoverIndex === index) borderStyle = '2px solid blue';
                        }

                        if (highlightedIndex === index) { borderStyle = '3px solid gold'; bgStyle = 'rgba(255, 215, 0, 0.4)'; }
                        
                        const selX = previewPosition ? previewPosition.x : (selection ? selection.x : 0);
                        const selY = previewPosition ? previewPosition.y : (selection ? selection.y : 0);
                        if (selection && x >= selX && x < selX + selection.w && y >= selY && y < selY + selection.h) {
                            if (previewPosition && (previewPosition.x !== selection.originalX || previewPosition.y !== selection.originalY)) {
                                borderStyle = '2px solid cyan'; bgStyle = 'rgba(0, 255, 255, 0.2)';
                            } else {
                                borderStyle = '1px dashed red'; bgStyle = 'rgba(255, 255, 0, 0.3)';
                            }
                        }

                        return (
                            <EditorTile 
                                key={index}
                                index={index}
                                x={x} y={y}
                                activeTool={activeTool}
                                tileObj={tileObj}
                                objObj={objObj}
                                secretObj={secretObj}
                                objectMetadata={objectMetadata}
                                borderStyle={borderStyle}
                                bgStyle={bgStyle}
                                handleGridMouseDown={handleGridMouseDown}
                                handleGridMouseEnter={handleGridMouseEnter}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

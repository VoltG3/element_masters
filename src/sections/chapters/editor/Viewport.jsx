import React from 'react';
import AnimatedItem from '../../../utilities/AnimatedItem';
import { TILE_SIZE } from '../../../constants/gameConstants';

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
    registryItems,
    hoverIndex,
    brushSize,
    bucketPreviewIndices,
    selection,
    dragStart,
    isDragging,
    handleGridMouseDown,
    handleGridMouseEnter,
    handleGridMouseUp,
    handleGridMouseLeave,
    setIsDragging,
    handleResizeMouseDown
}) => {
    return (
        <div className="viewport"
            style={{
                flex: 1, padding: '40px', backgroundColor: '#555',
                overflow: 'auto', position: 'relative', userSelect: 'none'
            }}
            onMouseUp={() => setIsDragging(false)}>
            <div style={{ position: 'relative', width: 'fit-content' }} onMouseLeave={handleGridMouseLeave}>
                {/* Background preview layer */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: mapWidth * 32,
                        height: mapHeight * 32,
                        backgroundImage: selectedBackgroundUrl ? `url(${selectedBackgroundUrl})` : 'none',
                        backgroundColor: !selectedBackgroundUrl ? selectedBackgroundColor : 'transparent',
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: 'auto 100%',
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}
                />
                <div className="grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${mapWidth}, 32px)`,
                        gridTemplateRows: `repeat(${mapHeight}, 32px)`,
                        gap: '0px',
                        border: '1px solid #444',
                        backgroundColor: 'transparent',
                        position: 'relative',
                        cursor: activeTool === 'bucket' ? 'cell' : 'default',
                        zIndex: 1
                    }}>
                    {Array(mapWidth * mapHeight).fill(0).map((_, index) => {
                        const tileId = tileMapData[index];
                        const objectId = objectMapData[index];
                        const secretId = secretMapData?.[index];
                        const tileObj = tileId ? registryItems.find(r => r.id === tileId) : null;
                        const objObj = objectId ? registryItems.find(r => r.id === objectId) : null;
                        const secretObj = secretId ? registryItems.find(r => r.id === secretId) : null;

                        const x = index % mapWidth;
                        const y = Math.floor(index / mapWidth);

                        let isSelected = false;
                        if (selection && x >= selection.x && x < selection.x + selection.w && y >= selection.y && y < selection.y + selection.h) {
                            isSelected = true;
                        }

                        let isMoveSelecting = false;
                        let isMoveHover = false;
                        if (activeTool === 'move') {
                            if (isDragging && dragStart && hoverIndex !== null) {
                                const hx = hoverIndex % mapWidth;
                                const hy = Math.floor(hoverIndex / mapWidth);
                                const sx = dragStart.x;
                                const sy = dragStart.y;
                                const minX = Math.min(sx, hx);
                                const minY = Math.min(sy, hy);
                                const maxX = Math.max(sx, hx);
                                const maxY = Math.max(sy, hy);
                                if (x >= minX && x <= maxX && y >= minY && y <= maxY) isMoveSelecting = true;
                            } else if (!isDragging && hoverIndex === index) {
                                isMoveHover = true;
                            }
                        }

                        let isBrushTarget = false;
                        if ((activeTool === 'brush') && hoverIndex !== null) {
                            const hx = hoverIndex % mapWidth;
                            const hy = Math.floor(hoverIndex / mapWidth);
                            if (x >= hx && x < hx + brushSize && y >= hy && y < hy + brushSize) isBrushTarget = true;
                        }

                        let isBucketTarget = false;
                        let isBucketPreview = false;
                        if (activeTool === 'bucket') {
                            if (bucketPreviewIndices.has(index)) isBucketPreview = true;
                            else if (hoverIndex === index) isBucketTarget = true;
                        }

                        let borderStyle = showGrid ? '0.5px solid rgba(128,128,128,0.5)' : 'none';
                        let bgStyle = 'transparent';

                        const isLiquidTile = !!(tileObj && tileObj.flags && tileObj.flags.liquid);
                        const isWaterTile = !!(tileObj && tileObj.flags && tileObj.flags.water);
                        const isLavaTile = !!(tileObj && tileObj.flags && tileObj.flags.lava);

                        if (isBrushTarget) borderStyle = '2px solid red';
                        else if (isBucketPreview) { borderStyle = '1px dashed orange'; bgStyle = 'rgb(168,187,220)'; }
                        else if (isBucketTarget) borderStyle = '2px solid orange';
                        else if (isMoveHover) borderStyle = '2px solid blue';
                        else if (isMoveSelecting) { borderStyle = '1px dashed blue'; bgStyle = 'rgba(0, 0, 255, 0.1)'; }
                        else if (isSelected) { borderStyle = '1px dashed red'; bgStyle = 'rgba(255, 255, 0, 0.3)'; }
                        else if (!showGrid) borderStyle = 'none';

                        let backgroundStyleObj = {};
                        if (bgStyle !== 'transparent') {
                            backgroundStyleObj.backgroundColor = bgStyle;
                        } else if (isLiquidTile) {
                            if (isWaterTile) {
                                backgroundStyleObj.background = 'linear-gradient(180deg, #2a5d8f, #174369)';
                            } else if (isLavaTile) {
                                backgroundStyleObj.background = 'linear-gradient(180deg, #6b1a07, #c43f0f)';
                            } else {
                                backgroundStyleObj.background = 'linear-gradient(180deg, #3a3a3a, #1e1e1e)';
                            }
                        }

                        return (
                            <div key={index}
                                onMouseDown={(e) => handleGridMouseDown(index, e)}
                                onMouseEnter={() => handleGridMouseEnter(index)}
                                onMouseUp={() => handleGridMouseUp(index)}
                                style={{
                                    width: '32px', height: '32px', border: borderStyle,
                                    zIndex: (isBrushTarget || isBucketTarget || isBucketPreview || isMoveHover || isMoveSelecting) ? 20 : (isSelected ? 15 : 1),
                                    boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                    ...backgroundStyleObj
                                }}>
                                {/* Background Layer (Tiles) */}
                                {tileObj && <AnimatedItem
                                    textures={tileObj.textures}
                                    texture={tileObj.texture}
                                    speed={tileObj.animationSpeed}
                                    style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
                                />}

                                {/* Foreground Layer (Objects) */}
                                {objObj && <AnimatedItem
                                    textures={objObj.textures}
                                    texture={objObj.texture}
                                    speed={objObj.animationSpeed}
                                    style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 3 }}
                                />}

                                {/* Secret Layer (Dark Filter) */}
                                {secretObj && (
                                    <div style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        background: secretObj.filterColor || 'rgba(0, 0, 0, 0.5)',
                                        zIndex: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '8px',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontWeight: 'bold',
                                        pointerEvents: 'none'
                                    }}>
                                        {secretObj.subtype === 'above' ? 'A' : 'B'}
                                    </div>
                                )}

                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }} />
                            </div>
                        );
                    })}
                </div>
                <div onMouseDown={handleResizeMouseDown('width')}
                    style={{
                        position: 'absolute', top: 0, right: -15, width: '15px', height: '100%',
                        backgroundColor: '#777', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderTopRightRadius: '5px', borderBottomRightRadius: '5px'
                    }}>
                    <span style={{ color: '#ccc', fontSize: '20px' }}>⋮</span>
                </div>
                <div onMouseDown={handleResizeMouseDown('height')}
                    style={{
                        position: 'absolute', bottom: -15, left: 0, width: '100%', height: '15px',
                        backgroundColor: '#777', cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderBottomLeftRadius: '5px', borderBottomRightRadius: '5px'
                    }}>
                    <span style={{ color: '#ccc', fontSize: '20px' }}>⋯</span>
                </div>
            </div>
        </div>
    );
};

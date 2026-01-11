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
                {/* Visual links between portals and targets */}
                <svg style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: mapWidth * 32,
                    height: mapHeight * 32,
                    zIndex: 10,
                    pointerEvents: 'none',
                    opacity: 0.6
                }}>
                    {(() => {
                        const links = [];
                        const portals = [];
                        const targets = [];

                        // Collect all portals and targets with Trigger IDs
                        objectMapData.forEach((id, index) => {
                            if (!id) return;
                            const metadata = objectMetadata?.[index];
                            if (!metadata || metadata.triggerId === undefined || metadata.triggerId === null) return;

                            const x = (index % mapWidth) * 32 + 16;
                            const y = Math.floor(index / mapWidth) * 32 + 16;

                            if (id.includes('portal') && !id.includes('target')) {
                                portals.push({ x, y, id: metadata.triggerId });
                            } else if (id.includes('target') || id === 'portal_target') {
                                targets.push({ x, y, id: metadata.triggerId });
                            }
                        });

                        // Draw lines between matching IDs
                        portals.forEach(p => {
                            targets.forEach(t => {
                                if (p.id === t.id) {
                                    links.push(
                                        <line
                                            key={`link-${p.x}-${p.y}-${t.x}-${t.y}`}
                                            x1={p.x} y1={p.y}
                                            x2={t.x} y2={t.y}
                                            stroke="#fff"
                                            strokeWidth="2"
                                            strokeDasharray="5,5"
                                        />
                                    );
                                }
                            });
                        });
                        return links;
                    })()}
                </svg>

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
                        const x = index % mapWidth;
                        const y = Math.floor(index / mapWidth);

                        // Check if this tile is in preview selection area
                        let displayTileId = tileMapData[index];
                        let displayObjectId = objectMapData[index];
                        let displaySecretId = secretMapData?.[index];

                        // If we have a preview position, check if this tile should show selection content
                        if (selection && previewPosition) {
                            const selX = previewPosition.x;
                            const selY = previewPosition.y;

                            if (x >= selX && x < selX + selection.w && y >= selY && y < selY + selection.h) {
                                // This tile is in the preview selection area
                                const offsetX = x - selX;
                                const offsetY = y - selY;
                                const selectionIndex = offsetY * selection.w + offsetX;

                                displayTileId = selection.tileData[selectionIndex];
                                displayObjectId = selection.objectData[selectionIndex];
                                displaySecretId = selection.secretData?.[selectionIndex];
                            }
                        }

                        const tileObj = displayTileId ? registryItems.find(r => r.id === displayTileId) : null;
                        const objObj = displayObjectId ? registryItems.find(r => r.id === displayObjectId) : null;
                        const secretObj = displaySecretId ? registryItems.find(r => r.id === displaySecretId) : null;

                        let isSelected = false;
                        let isPreviewSelection = false;

                        // Use previewPosition if available, otherwise use selection.x/y
                        const selX = previewPosition ? previewPosition.x : (selection ? selection.x : 0);
                        const selY = previewPosition ? previewPosition.y : (selection ? selection.y : 0);

                        if (selection && x >= selX && x < selX + selection.w && y >= selY && y < selY + selection.h) {
                            isSelected = true;
                            if (previewPosition && (previewPosition.x !== selection.originalX || previewPosition.y !== selection.originalY)) {
                                isPreviewSelection = true;
                            }
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
                        const isHighlighted = highlightedIndex === index;

                        const isLiquidTile = !!(tileObj && tileObj.flags && tileObj.flags.liquid);
                        const isWaterTile = !!(tileObj && tileObj.flags && tileObj.flags.water);
                        const isLavaTile = !!(tileObj && tileObj.flags && tileObj.flags.lava);

                        if (isBrushTarget) borderStyle = '2px solid red';
                        else if (isBucketPreview) { borderStyle = '1px dashed orange'; bgStyle = 'rgb(168,187,220)'; }
                        else if (isBucketTarget) borderStyle = '2px solid orange';
                        else if (isMoveHover) borderStyle = '2px solid blue';
                        else if (isMoveSelecting) { borderStyle = '1px dashed blue'; bgStyle = 'rgba(0, 0, 255, 0.1)'; }
                        else if (isHighlighted) { borderStyle = '3px solid gold'; bgStyle = 'rgba(255, 215, 0, 0.4)'; }
                        else if (isSelected) {
                            if (isPreviewSelection) {
                                borderStyle = '2px solid cyan';
                                bgStyle = 'rgba(0, 255, 255, 0.2)';
                            } else {
                                borderStyle = '1px dashed red';
                                bgStyle = 'rgba(255, 255, 0, 0.3)';
                            }
                        }
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
                                {tileObj && (
                                    tileObj.editorIcon ? (
                                        <div style={{ position: 'absolute', zIndex: 2, fontSize: '20px', fontWeight: 'bold' }}>
                                            {tileObj.editorIcon}
                                        </div>
                                    ) : (
                                        <AnimatedItem
                                            textures={tileObj.textures}
                                            texture={tileObj.texture}
                                            speed={tileObj.animationSpeed}
                                            spriteSheet={tileObj.spriteSheet}
                                            style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
                                        />
                                    )
                                )}

                                {/* Foreground Layer (Objects) */}
                                {objObj && (
                                    <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {objObj.editorIcon ? (
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', textShadow: '0 0 4px #000' }}>
                                                {objObj.editorIcon}
                                            </div>
                                        ) : (
                                            <AnimatedItem
                                                textures={objObj.textures}
                                                texture={objObj.texture}
                                                speed={objObj.animationSpeed}
                                                spriteSheet={objObj.spriteSheet}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        )}
                                        {/* Render Trigger ID if present */}
                                        {objectMetadata && objectMetadata[index] && objectMetadata[index].triggerId !== undefined && objectMetadata[index].triggerId !== null && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-15px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                backgroundColor: 'rgba(0,0,0,0.7)',
                                                color: '#fff',
                                                padding: '1px 4px',
                                                borderRadius: '3px',
                                                fontSize: '10px',
                                                whiteSpace: 'nowrap',
                                                zIndex: 10,
                                                border: '1px solid #fff'
                                            }}>
                                                ID: {objectMetadata[index].triggerId}
                                            </div>
                                        )}
                                    </div>
                                )}

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
            </div>
        </div>
    );
};

import React from 'react';
import AnimatedItem from '../../../../utilities/AnimatedItem';

export const EditorTile = React.memo(({
    index,
    x, y,
    activeTool,
    tileObj,
    objObj,
    secretObj,
    objectMetadata,
    isHighlighted,
    parentRegionIndex,
    borderStyle,
    bgStyle,
    handleGridMouseDown,
    handleGridMouseEnter,
    handleResizeStart,
    handleMoveStart,
    filter
}) => {
    const isLiquidTile = !!(tileObj && tileObj.flags && tileObj.flags.liquid);
    const isWaterTile = !!(tileObj && tileObj.flags && tileObj.flags.water);
    const isLavaTile = !!(tileObj && tileObj.flags && tileObj.flags.lava);
    const isQuicksandTile = !!(tileObj && tileObj.flags && tileObj.flags.quicksand);
    const isWaterfallTile = !!(tileObj && tileObj.flags && tileObj.flags.waterfall);
    const isLavaWaterfallTile = !!(tileObj && tileObj.flags && tileObj.flags.lava_waterfall);
    const isRadioactiveWaterTile = !!(tileObj && tileObj.flags && tileObj.flags.radioactive_water);
    const isRadioactiveWaterfallTile = !!(tileObj && tileObj.flags && tileObj.flags.radioactive_waterfall);

    const actualIndex = parentRegionIndex !== null ? parentRegionIndex : index;
    const triggerId = objectMetadata?.[actualIndex]?.triggerId;
    const intensity = objectMetadata?.[actualIndex]?.intensity;
    const width = objectMetadata?.[actualIndex]?.width || 1;
    const height = objectMetadata?.[actualIndex]?.height || 1;

    const handleMouseDown = (e) => {
        // If we're clicking a tile that's part of a region, we should interact with the anchor
        const targetIndex = parentRegionIndex !== null ? parentRegionIndex : index;
        
        if (activeTool === 'move') {
            const hasMovable = objectMetadata[targetIndex] || objObj || secretObj;
            if (hasMovable) {
                e.stopPropagation();
                handleMoveStart(targetIndex);
                return;
            }
        }
        handleGridMouseDown(index, e);
    };

    const isResizable = React.useMemo(() => {
        if (!objObj && !secretObj) return false;
        // Specifically requested to disable for these types
        if (secretObj && secretObj.type === 'secret') return false;
        if (objObj && (objObj.type === 'crack_block' || objObj.type === 'wolf_secret')) return false;
        return true;
    }, [objObj, secretObj]);

    const hasObjectOrSecret = objObj || secretObj || (parentRegionIndex !== null);

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseEnter={() => handleGridMouseEnter(index)}
            style={{
                width: '32px',
                height: '32px',
                border: borderStyle,
                backgroundColor: bgStyle,
                position: 'relative',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
                cursor: (activeTool === 'move' && hasObjectOrSecret) ? 'grab' : 'default'
            }}>
            
            {isHighlighted && parentRegionIndex === null && isResizable && (
                <>
                    {/* Resize Handles */}
                    {/* Right */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(index, 'right'); }}
                        style={{ position: 'absolute', right: `${-(width-1)*32 - 6}px`, top: '50%', transform: 'translateY(-50%)', width: '10px', height: '20px', backgroundColor: 'gold', border: '1px solid #000', borderRadius: '2px', zIndex: 100, cursor: 'ew-resize' }} 
                    />
                    {/* Left */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(index, 'left'); }}
                        style={{ position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)', width: '10px', height: '20px', backgroundColor: 'gold', border: '1px solid #000', borderRadius: '2px', zIndex: 100, cursor: 'ew-resize' }} 
                    />
                    {/* Bottom */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(index, 'bottom'); }}
                        style={{ position: 'absolute', bottom: `${-(height-1)*32 - 6}px`, left: '50%', transform: 'translateX(-50%)', width: '20px', height: '10px', backgroundColor: 'gold', border: '1px solid #000', borderRadius: '2px', zIndex: 100, cursor: 'ns-resize' }} 
                    />
                    {/* Top */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(index, 'top'); }}
                        style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '10px', backgroundColor: 'gold', border: '1px solid #000', borderRadius: '2px', zIndex: 100, cursor: 'ns-resize' }} 
                    />
                </>
            )}

            {/* Tile Layer */}
            {tileObj && (
                <div style={{ filter: filter ? filter('tile') : 'none', transition: 'filter 0.3s ease' }}>
                    {isLiquidTile ? (
                        <div style={{
                            width: '32px', height: '32px',
                            background: isLavaWaterfallTile ? 'rgba(255, 204, 0, 0.7)' : (isLavaTile ? 'rgba(255, 204, 0, 0.7)' : (isWaterTile || isWaterfallTile ? 'rgba(58, 127, 184, 0.7)' : (isQuicksandTile ? 'rgba(218, 165, 32, 0.7)' : (isRadioactiveWaterTile || isRadioactiveWaterfallTile ? 'rgba(50, 205, 50, 0.7)' : 'rgba(0, 255, 255, 0.3)')))),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px'
                        }}>
                            {isLavaWaterfallTile ? 'L.FALL' : (isLavaTile ? 'LAVA' : (isRadioactiveWaterfallTile ? 'RADFALL' : (isRadioactiveWaterTile ? 'RAD' : (isWaterTile ? 'WATER' : (isWaterfallTile ? 'FALL' : (isQuicksandTile ? 'QUICK' : 'LIQ'))))))}
                        </div>
                    ) : (
                        <AnimatedItem
                            textures={tileObj.textures}
                            texture={tileObj.texture}
                            speed={tileObj.animationSpeed}
                            spriteSheet={tileObj.spriteSheet}
                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                        />
                    )}
                </div>
            )}

            {/* Secret Layer */}
            {secretObj && (
                <div style={{
                    position: 'absolute', 
                    top: '0', left: '0',
                    width: `${width * 32}px`,
                    height: `${height * 32}px`,
                    backgroundColor: secretObj.filterColorInEditor || secretObj.filterColor || 'rgba(128, 0, 128, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '10px', fontWeight: 'bold', zIndex: 2,
                    filter: filter ? filter('secret') : 'none', transition: 'filter 0.3s ease',
                    border: '1px dashed rgba(255,255,255,0.5)',
                    boxSizing: 'border-box',
                    pointerEvents: 'none'
                }}>
                    {secretObj.editorIcon || 'SECRET'}
                </div>
            )}

            {/* Object Layer */}
            {objObj && (
                <div style={{
                    position: 'absolute', 
                    top: '2px',
                    left: '2px',
                    width: `${width * 32 - 4}px`,
                    height: `${height * 32 - 4}px`,
                    zIndex: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    filter: filter ? filter('object') : 'none', transition: 'filter 0.3s ease',
                    pointerEvents: 'none' // Let clicks pass through to the tile for resizing handles
                }}>
                    {objObj.editorIcon ? (
                        <span style={{ fontSize: '20px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)' }}>{objObj.editorIcon}</span>
                    ) : (
                        <AnimatedItem
                            textures={objObj.textures}
                            texture={objObj.texture}
                            speed={objObj.animationSpeed}
                            spriteSheet={objObj.spriteSheet}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)' }}
                        />
                    )}

                    {/* Trigger ID */}
                    {triggerId !== undefined && triggerId !== null && (
                        <div style={{
                            position: 'absolute', top: '-15px', left: '0',
                            backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '1px 4px',
                            borderRadius: '3px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10, border: '1px solid #fff'
                        }}>
                            ID: {triggerId}
                        </div>
                    )}

                    {/* Intensity */}
                    {intensity !== undefined && intensity !== null && objObj && (objObj.type === 'weather_trigger' || objObj.hasIntensity) && (
                        <div style={{
                            position: 'absolute', top: '-15px', right: '0',
                            backgroundColor: 'rgba(0,100,200,0.8)', color: '#fff', padding: '1px 4px',
                            borderRadius: '3px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 11, border: '1px solid #fff'
                        }}>
                            {intensity}%
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

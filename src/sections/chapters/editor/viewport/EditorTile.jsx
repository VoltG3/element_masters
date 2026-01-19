import React from 'react';
import AnimatedItem from '../../../../utilities/AnimatedItem';

export const EditorTile = ({
    index,
    x, y,
    activeTool,
    tileObj,
    objObj,
    secretObj,
    objectMetadata,
    borderStyle,
    bgStyle,
    handleGridMouseDown,
    handleGridMouseEnter,
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

    const triggerId = objectMetadata?.[index]?.triggerId;
    const intensity = objectMetadata?.[index]?.intensity;

    return (
        <div
            onMouseDown={(e) => handleGridMouseDown(index, e)}
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
                overflow: 'visible' // Allow trigger ID to overflow
            }}>
            {/* Tile Layer */}
            {tileObj && (
                <div style={{ filter: filter ? filter('tile') : 'none', transition: 'filter 0.3s ease' }}>
                    {isLiquidTile ? (
                        <div style={{
                            width: '32px', height: '32px',
                            background: isWaterTile ? 'rgba(58, 127, 184, 0.7)' : (isLavaTile ? 'rgba(255, 69, 0, 0.7)' : (isQuicksandTile ? 'rgba(218, 165, 32, 0.7)' : (isWaterfallTile ? 'rgba(58, 127, 184, 0.7)' : (isLavaWaterfallTile ? 'rgba(255, 69, 0, 0.7)' : (isRadioactiveWaterTile || isRadioactiveWaterfallTile ? 'rgba(50, 205, 50, 0.7)' : 'rgba(0, 255, 255, 0.3)'))))),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px'
                        }}>
                            {isWaterTile ? 'WATER' : (isLavaTile ? 'LAVA' : (isQuicksandTile ? 'QUICK' : (isWaterfallTile ? 'FALL' : (isLavaWaterfallTile ? 'L.FALL' : (isRadioactiveWaterTile ? 'RAD' : (isRadioactiveWaterfallTile ? 'RADFALL' : 'LIQ'))))))}
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
                    position: 'absolute', inset: 0,
                    backgroundColor: secretObj.filterColorInEditor || secretObj.filterColor || 'rgba(128, 0, 128, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '8px', fontWeight: 'bold', zIndex: 2,
                    filter: filter ? filter('secret') : 'none', transition: 'filter 0.3s ease'
                }}>
                    {secretObj.editorIcon || 'SECRET'}
                </div>
            )}

            {/* Object Layer */}
            {objObj && (
                <div style={{
                    position: 'absolute', inset: '2px', zIndex: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    filter: filter ? filter('object') : 'none', transition: 'filter 0.3s ease'
                }}>
                    {objObj.editorIcon ? (
                        <span style={{ fontSize: '20px' }}>{objObj.editorIcon}</span>
                    ) : (
                        <AnimatedItem
                            textures={objObj.textures}
                            texture={objObj.texture}
                            speed={objObj.animationSpeed}
                            spriteSheet={objObj.spriteSheet}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                    )}

                    {/* Trigger ID */}
                    {triggerId !== undefined && triggerId !== null && (
                        <div style={{
                            position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '1px 4px',
                            borderRadius: '3px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10, border: '1px solid #fff'
                        }}>
                            ID: {triggerId}
                        </div>
                    )}

                    {/* Intensity */}
                    {intensity !== undefined && intensity !== null && objObj && (objObj.type === 'weather_trigger' || objObj.hasIntensity) && (
                        <div style={{
                            position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
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
};

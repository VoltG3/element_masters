import React from 'react';
import AnimatedItem from '../../../../utilities/AnimatedItem';
import { getTutorialText } from '../../../../i18n/tutorialMessages';

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
    filter,
    mapType,
    isRoomAreaVisible,
    showRoomMapContent,
    showMessages
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
    const messageText = objectMetadata?.[actualIndex]?.message;
    const i18nChapter = objectMetadata?.[actualIndex]?.i18nChapter;
    const i18nId = objectMetadata?.[actualIndex]?.i18nId;
    const i18nText = objObj?.type === 'message_trigger' ? getTutorialText(i18nChapter, i18nId) : '';
    const resolvedMessageText = messageText || i18nText;
    
    // Dimensijas ņemam no tiešā indeksa, lai izvairītos no citu objektu (piem. Room Area) 
    // ietekmes uz 1x1 objektiem, kas atrodas to robežās.
    const width = Number(objectMetadata?.[index]?.width ?? objObj?.width ?? secretObj?.width ?? 1);
    const height = Number(objectMetadata?.[index]?.height ?? objObj?.height ?? secretObj?.height ?? 1);

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
        
        // Room areas (windows) on room maps are NOT resizable
        if (secretObj && secretObj.subtype === 'room' && mapType === 'room') return false;

        // Specifically requested to disable for these types, except Room Areas which MUST be resizable
        if (secretObj && secretObj.type === 'secret' && secretObj.subtype !== 'room') return false;
        if (objObj && (objObj.type === 'crack_block' || objObj.type === 'wolf_secret')) return false;
        return true;
    }, [objObj, secretObj, mapType]);

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
            {secretObj && (secretObj.subtype !== 'room' || isRoomAreaVisible || showRoomMapContent || activeTool === 'area' || mapType === 'room') && (
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
                    {mapType !== 'room' && (secretObj.editorIcon || 'SECRET')}
                </div>
            )}

            {/* Object Layer */}
            {objObj && (() => {
                const renderOffsetX = Number(objObj?.render?.offsetX) || 0;
                const renderOffsetY = Number(objObj?.render?.offsetY) || 0;
                const overlapX = Number(objObj?.render?.overlapX) || 0;
                const overlapY = Number(objObj?.render?.overlapY) || 0;
                const baseTop = objObj.type === 'decoration' ? 0 : 2;
                const baseLeft = objObj.type === 'decoration' ? 0 : 2;
                const baseWidth = objObj.type === 'decoration' ? (width * 32) : (width * 32 - 4);
                const baseHeight = objObj.type === 'decoration' ? (height * 32) : (height * 32 - 4);
                return (
                <div style={{
                    position: 'absolute', 
                    top: `${baseTop + renderOffsetY - overlapY / 2}px`,
                    left: `${baseLeft + renderOffsetX - overlapX / 2}px`,
                    width: `${baseWidth + overlapX}px`,
                    height: `${baseHeight + overlapY}px`,
                    zIndex: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    filter: filter ? filter('object') : 'none', transition: 'filter 0.3s ease',
                    pointerEvents: 'none' // Let clicks pass through to the tile for resizing handles
                }}>
                    {objObj.editorIcon ? (
                        <span style={{
                            fontSize: objObj.editorIcon === 'i18n' ? '12px' : '20px',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            border: '1px dashed rgba(255,255,255,0.3)',
                            color: '#222',
                            fontWeight: 700
                        }}>{objObj.editorIcon}</span>
                    ) : (
                        <AnimatedItem
                            textures={objObj.textures}
                            texture={objObj.texture}
                            speed={objObj.animationSpeed}
                            spriteSheet={objObj.spriteSheet}
                            frameIndex={objectMetadata?.[actualIndex]?.currentFrame !== undefined ? objectMetadata[actualIndex].currentFrame : (objObj.subtype === 'door' && mapType === 'room' ? (objObj.interaction?.frames?.inside || 2) : 0)}
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: objObj.type === 'decoration' ? 'cover' : 'contain', 
                                backgroundColor: objObj.type === 'decoration' ? 'transparent' : 'rgba(255,255,255,0.1)', 
                                border: objObj.type === 'decoration' ? 'none' : '1px dashed rgba(255,255,255,0.3)' 
                            }}
                        />
                    )}

                    {objObj.type === 'message_trigger' && (
                        <div style={{
                            position: 'absolute',
                            inset: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff9c4',
                            border: '1px solid #fbc02d',
                            color: '#333',
                            fontWeight: 700,
                            fontSize: (objObj.editorIcon === 'i18n' || objObj.i18nMessage) ? '12px' : '18px'
                        }}>
                            {objObj.editorIcon || (objObj.i18nMessage ? 'i18n' : '')}
                        </div>
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

                    {/* Message Bubble */}
                    {showMessages && objObj && objObj.type === 'message_trigger' && resolvedMessageText && (
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: '100%',
                            transform: 'translateX(-50%)',
                            marginBottom: '8px',
                            maxWidth: '140px',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            color: '#222',
                            border: '1px solid rgba(0,0,0,0.6)',
                            borderRadius: '8px',
                            padding: '4px 6px',
                            fontSize: '10px',
                            lineHeight: 1.2,
                            textAlign: 'center',
                            zIndex: 12,
                            pointerEvents: 'none'
                        }}>
                            {resolvedMessageText}
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: '-6px',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid rgba(255, 255, 255, 0.95)'
                            }} />
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: '-7px',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '7px solid transparent',
                                borderRight: '7px solid transparent',
                                borderTop: '7px solid rgba(0,0,0,0.6)',
                                zIndex: -1
                            }} />
                        </div>
                    )}
                </div>
                );
            })()}

            {/* Room Area Visibility Overlay */}
            {(isRoomAreaVisible || showRoomMapContent || activeTool === 'area') && secretObj && secretObj.subtype === 'room' && mapType !== 'room' && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: `${width * 32}px`,
                    height: `${height * 32}px`,
                    backgroundColor: 'rgba(255, 255, 0, 0.2)',
                    border: '2px solid gold',
                    boxSizing: 'border-box',
                    zIndex: 4,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textShadow: '0 0 2px #fff'
                }}>
                    <span style={{ fontSize: '14px' }}>🏠</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{objectMetadata?.[actualIndex]?.roomName || 'Unnamed'}</span>
                    <span style={{ fontSize: '9px' }}>{width}x{height}m</span>
                </div>
            )}
        </div>
    );
});

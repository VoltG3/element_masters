import React, { useCallback, useRef, useState } from 'react';
import { ObjectLinks } from './viewport/ObjectLinks';
import { EditorTile } from './viewport/EditorTile';
import PixiStage from '../game/PixiStage';
import AnimatedItem from '../../../utilities/AnimatedItem';

export const Viewport = ({
    mapWidth,
    mapHeight,
    selectedBackgroundUrl,
    selectedBackgroundColor,
    selectedBackgroundImage,
    showBackgroundImage,
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
    handleResizeStart,
    handleMoveStart,
    setIsDragging,
    selectedTile,
    weatherRain,
    weatherSnow,
    weatherClouds,
    weatherFog,
    weatherThunder,
    weatherLavaRain,
    weatherRadioactiveFog,
    weatherMeteorRain,
    mapType,
    isRoomAreaVisible,
    showRoomMapContent,
    showMessages,
    maps
}) => {
    const isEraserActive = activeTool === 'brush' && selectedTile === null;
    const isBrushActive = activeTool === 'brush';
    const isBucketActive = activeTool === 'bucket';
    const tileSize = 32;
    const gridRef = useRef(null);
    const [cursorIndex, setCursorIndex] = useState(null);

    const regions = React.useMemo(() => {
        const res = [];
        if (!objectMetadata) return res;
        for (const [idxStr, meta] of Object.entries(objectMetadata)) {
            if (meta.width > 1 || meta.height > 1) {
                const idx = parseInt(idxStr);
                res.push({ 
                    idx, 
                    x: idx % mapWidth, 
                    y: Math.floor(idx / mapWidth), 
                    w: meta.width || 1, 
                    h: meta.height || 1 
                });
            }
        }
        return res;
    }, [objectMetadata, mapWidth]);

    const roomAreas = React.useMemo(() => {
        const res = [];
        if (!secretMapData || !objectMetadata || !showRoomMapContent) return res;
        for (const [idxStr, meta] of Object.entries(objectMetadata)) {
            const idx = parseInt(idxStr);
            if (secretMapData[idx] === 'room_area' && meta.linkedMapId && maps[meta.linkedMapId]) {
                res.push({
                    id: meta.linkedMapId,
                    x: idx % mapWidth,
                    y: Math.floor(idx / mapWidth),
                    width: meta.width || 1,
                    height: meta.height || 1,
                    mapData: maps[meta.linkedMapId]
                });
            }
        }
        return res;
    }, [secretMapData, objectMetadata, showRoomMapContent, maps, mapWidth]);

    const getLayerColor = (layer, alpha = 0.5) => {
        if (layer === 'tile') return `rgba(24, 144, 255, ${alpha})`;
        if (layer === 'object') return `rgba(245, 34, 45, ${alpha})`;
        if (layer === 'secret') return `rgba(114, 46, 209, ${alpha})`;
        return `rgba(255, 255, 255, ${alpha})`;
    };

    const getGridStyles = () => {
        let color = 'rgba(255, 255, 255, 0.15)';
        let visible = showGrid;

        if (isEraserActive) {
            color = getLayerColor(activeLayer, 0.4);
            visible = true;
        } else if (isBrushActive || isBucketActive) {
            color = getLayerColor(activeLayer, 0.25);
            visible = true; // Auto-show grid when using drawing tools
        }

        return {
            backgroundImage: visible ? `
                linear-gradient(to right, ${color} 1px, transparent 1px),
                linear-gradient(to bottom, ${color} 1px, transparent 1px)
            ` : 'none',
            backgroundSize: '32px 32px'
        };
    };

    const getLayerFilter = useCallback((layer) => {
        if (!isEraserActive) return 'none';
        return activeLayer === layer ? 'none' : 'grayscale(100%) opacity(0.2) blur(2px)';
    }, [isEraserActive, activeLayer]);

    const getPlacementAnchor = useCallback((tile, layer) => {
        if (!tile) return { x: 0, y: 0 };
        if (layer !== 'object' && layer !== 'props') return { x: 0, y: 0 };
        const width = Number(tile.width ?? 1);
        const height = Number(tile.height ?? 1);
        if (tile.type === 'decoration' && (width > 1 || height > 1)) {
            return { x: Math.floor(width / 2), y: height - 1 };
        }
        return { x: 0, y: 0 };
    }, []);

    const handleGridMouseMove = useCallback((event) => {
        const rect = gridRef.current ? gridRef.current.getBoundingClientRect() : event.currentTarget.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        if (localX < 0 || localY < 0 || localX >= mapWidth * tileSize || localY >= mapHeight * tileSize) {
            handleGridMouseLeave();
            setCursorIndex(null);
            return;
        }
        const gridX = Math.floor(localX / tileSize);
        const gridY = Math.floor(localY / tileSize);
        if (gridX < 0 || gridY < 0 || gridX >= mapWidth || gridY >= mapHeight) return;
        const nextIndex = gridY * mapWidth + gridX;
        setCursorIndex(prev => (prev === nextIndex ? prev : nextIndex));
        handleGridMouseEnter(nextIndex);
    }, [handleGridMouseEnter, handleGridMouseLeave, mapWidth, mapHeight, tileSize]);

    const getOverlayColor = () => {
        if (!isEraserActive) return 'transparent';
        if (activeLayer === 'tile') return 'rgba(24, 144, 255, 0.25)'; // Blueish for blocks
        if (activeLayer === 'object') return 'rgba(245, 34, 45, 0.25)'; // Reddish for objects
        if (activeLayer === 'secret') return 'rgba(114, 46, 209, 0.25)'; // Purplish for secrets
        return 'transparent';
    };
    return (
        <div className="viewport"
            style={{
                flex: 1, padding: '40px', backgroundColor: '#555',
                overflow: 'auto', position: 'relative', userSelect: 'none'
            }}
            onMouseUp={() => handleGridMouseUp(hoverIndex)}
            onMouseMove={handleGridMouseMove}
            onContextMenu={(e) => e.preventDefault()}>
            <div
                style={{
                    position: 'relative',
                    width: mapWidth * tileSize,
                    height: mapHeight * tileSize,
                    overflow: 'hidden'
                }}
                onMouseLeave={() => {
                    handleGridMouseLeave();
                    setCursorIndex(null);
                }}
            >
                
                <ObjectLinks 
                    mapWidth={mapWidth} 
                    mapHeight={mapHeight} 
                    objectMapData={objectMapData} 
                    objectMetadata={objectMetadata} 
                />

                {/* Room Map Content Overlay */}
                {showRoomMapContent && roomAreas.map(room => (
                    <div
                        key={room.id}
                        style={{
                            position: 'absolute',
                            left: room.x * 32,
                            top: room.y * 32,
                            width: room.width * 32,
                            height: room.height * 32,
                            zIndex: 6,
                            pointerEvents: 'none',
                            overflow: 'hidden',
                            boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                            border: '2px solid #f39c12'
                        }}
                    >
                        <PixiStage 
                            mapWidth={room.mapData.mapWidth}
                            mapHeight={room.mapData.mapHeight}
                            tileSize={32}
                            tileMapData={room.mapData.tileMapData || []}
                            objectMapData={room.mapData.objectMapData || []}
                            secretMapData={room.mapData.secretMapData || []}
                            objectMetadata={room.mapData.objectMetadata || {}}
                            registryItems={registryItems}
                            backgroundColor={room.mapData.selectedBackgroundColor}
                            backgroundImage={room.mapData.selectedBackgroundImage}
                            backgroundParallaxFactor={room.mapData.backgroundParallaxFactor}
                            isEditor={true}
                            mapType={room.mapData.type || 'room'}
                        />
                    </div>
                ))}

                <div
                    style={{
                        position: 'absolute', top: 0, left: 0,
                        width: mapWidth * tileSize, height: mapHeight * tileSize,
                        backgroundImage: (selectedBackgroundUrl && showBackgroundImage && !isEraserActive) ? `url(${selectedBackgroundUrl})` : 'none',
                        backgroundColor: (isEraserActive || !showBackgroundImage || !selectedBackgroundUrl) ? selectedBackgroundColor : 'transparent',
                        backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%',
                        zIndex: 0, pointerEvents: 'none'
                    }}
                />

                <div
                    style={{
                        position: 'absolute', top: 0, left: 0,
                        width: mapWidth * tileSize, height: mapHeight * tileSize,
                        backgroundColor: getOverlayColor(),
                        zIndex: 5, pointerEvents: 'none',
                        transition: 'background-color 0.3s ease'
                    }}
                />

                {/* Top Grid Overlay */}
                <div
                    style={{
                        position: 'absolute', top: 0, left: 0,
                        width: mapWidth * tileSize, height: mapHeight * tileSize,
                        zIndex: 10, pointerEvents: 'none',
                        ...getGridStyles()
                    }}
                />

                {isBrushActive && selectedTile && (activeLayer === 'object' || activeLayer === 'props') && (cursorIndex !== null || hoverIndex !== null) && (
                    (() => {
                        const previewIndex = cursorIndex !== null ? cursorIndex : hoverIndex;
                        const anchor = getPlacementAnchor(selectedTile, activeLayer);
                        const gridX = previewIndex % mapWidth;
                        const gridY = Math.floor(previewIndex / mapWidth);
                        const previewX = (gridX - anchor.x) * tileSize;
                        const previewY = (gridY - anchor.y) * tileSize;
                        const previewW = Number(selectedTile.width ?? 1) * tileSize;
                        const previewH = Number(selectedTile.height ?? 1) * tileSize;
                        const renderOffsetX = Number(selectedTile?.render?.offsetX) || 0;
                        const renderOffsetY = Number(selectedTile?.render?.offsetY) || 0;
                        const overlapX = Number(selectedTile?.render?.overlapX) || 0;
                        const overlapY = Number(selectedTile?.render?.overlapY) || 0;

                        return (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: mapWidth * tileSize,
                                    height: mapHeight * tileSize,
                                    overflow: 'hidden',
                                    pointerEvents: 'none',
                                    zIndex: 9
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: previewX + renderOffsetX - overlapX / 2,
                                        top: previewY + renderOffsetY - overlapY / 2,
                                        width: previewW + overlapX,
                                        height: previewH + overlapY,
                                        opacity: 0.6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <AnimatedItem
                                        textures={selectedTile.textures}
                                        texture={selectedTile.texture}
                                        speed={selectedTile.animationSpeed}
                                        spriteSheet={selectedTile.spriteSheet}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: selectedTile.type === 'decoration' ? 'cover' : 'contain'
                                        }}
                                        alt={selectedTile.name}
                                    />
                                </div>
                            </div>
                        );
                    })()
                )}

                {/* Weather Effects Overlay */}
                {(weatherRain > 0 || weatherSnow > 0 || weatherClouds > 0 || weatherFog > 0 || weatherThunder > 0 || weatherLavaRain > 0 || weatherRadioactiveFog > 0 || weatherMeteorRain > 0) && (
                    <div
                        style={{
                            position: 'absolute', top: 0, left: 0,
                            width: mapWidth * 32, height: mapHeight * 32,
                            zIndex: 15, pointerEvents: 'none',
                        }}
                    >
                        <PixiStage 
                            mapWidth={mapWidth}
                            mapHeight={mapHeight}
                            tileSize={32}
                            tileMapData={[]}
                            objectMapData={[]}
                            registryItems={registryItems}
                            weatherRain={weatherRain}
                            weatherSnow={weatherSnow}
                            weatherClouds={weatherClouds}
                            weatherFog={weatherFog}
                            weatherThunder={weatherThunder}
                            weatherLavaRain={weatherLavaRain}
                            weatherRadioactiveFog={weatherRadioactiveFog}
                            weatherMeteorRain={weatherMeteorRain}
                            renderLayers={['weather']}
                            pointerEvents="none"
                        />
                    </div>
                )}

                <div className="grid"
                    ref={gridRef}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${mapWidth}, 32px)`,
                        gridTemplateRows: `repeat(${mapHeight}, 32px)`,
                        gap: '0px', border: '1px solid #444', backgroundColor: 'transparent',
                        position: 'relative', cursor: activeTool === 'bucket' ? 'cell' : 'default',
                        zIndex: 1
                    }}
                    onMouseMove={handleGridMouseMove}
                    onContextMenu={(e) => e.preventDefault()}>
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

                        const layerColor = getLayerColor(activeLayer, 1);

                        if (activeTool === 'brush' && hoverIndex !== null) {
                            const hx = hoverIndex % mapWidth;
                            const hy = Math.floor(hoverIndex / mapWidth);
                            if (x >= hx && x < hx + brushSize && y >= hy && y < hy + brushSize) {
                                borderStyle = `1px dashed ${layerColor}`;
                                if (isEraserActive) bgStyle = 'rgba(255, 0, 0, 0.1)';
                            }
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
                        } else if (activeTool === 'area') {
                            if (isDragging && dragStart && hoverIndex !== null) {
                                const hx = hoverIndex % mapWidth;
                                const hy = Math.floor(hoverIndex / mapWidth);
                                const minX = Math.min(dragStart.x, hx);
                                const minY = Math.min(dragStart.y, hy);
                                const maxX = Math.max(dragStart.x, hx);
                                const maxY = Math.max(dragStart.y, hy);
                                if (x >= minX && x <= maxX && y >= minY && y <= maxY) { 
                                    borderStyle = '1px dashed gold'; 
                                    bgStyle = 'rgba(255, 255, 0, 0.2)'; 
                                }
                            } else if (!isDragging && hoverIndex === index) borderStyle = '2px solid gold';
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

                        const parentRegion = regions.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

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
                                isHighlighted={highlightedIndex === index || (parentRegion && highlightedIndex === parentRegion.idx)}
                                parentRegionIndex={parentRegion ? parentRegion.idx : null}
                                borderStyle={borderStyle}
                                bgStyle={bgStyle}
                                handleGridMouseDown={handleGridMouseDown}
                                handleGridMouseEnter={handleGridMouseEnter}
                                handleResizeStart={handleResizeStart}
                                handleMoveStart={handleMoveStart}
                                filter={getLayerFilter}
                                mapType={mapType}
                                isRoomAreaVisible={isRoomAreaVisible}
                                showRoomMapContent={showRoomMapContent}
                                showMessages={showMessages}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

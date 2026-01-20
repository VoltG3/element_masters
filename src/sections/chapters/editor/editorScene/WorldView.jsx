import React, { useRef, useEffect, useMemo, useCallback } from 'react';

export const WorldView = ({
    maps,
    activeMapId,
    switchMap,
    registryItems,
    currentMapData,
    createMap,
    deleteMap,
    updateMapData,
    onAddRoomArea
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const mapLayoutsRef = useRef({});
    const dragRef = useRef(null); // { id, startX, startY, mapStartX, mapStartY }

    // Prepare all maps data, using live data for the active map
    const allMaps = useMemo(() => {
        const result = { ...maps };
        if (currentMapData && currentMapData.id && result[currentMapData.id]) {
            result[currentMapData.id] = {
                ...result[currentMapData.id],
                mapWidth: currentMapData.mapWidth,
                mapHeight: currentMapData.mapHeight,
                tileMapData: currentMapData.tileMapData,
                objectMapData: currentMapData.objectMapData,
                objectMetadata: currentMapData.objectMetadata,
                selectedBackgroundColor: currentMapData.selectedBackgroundColor
            };
        }
        return Object.values(result);
    }, [maps, currentMapData]);

    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Settings
        const baseTileSize = 4; // Each tile in world view
        
        // Sync mapLayoutsRef with allMaps, but preserve positions for maps being dragged
        const layouts = mapLayoutsRef.current;
        
        // Remove layouts for deleted maps
        const currentIds = new Set(allMaps.map(m => m.id));
        Object.keys(layouts).forEach(id => {
            if (!currentIds.has(id)) {
                delete layouts[id];
            }
        });

        allMaps.forEach(map => {
            const isDragging = dragRef.current && dragRef.current.id === map.id;
            const w = map.mapWidth * baseTileSize;
            const h = map.mapHeight * baseTileSize;

            if (!layouts[map.id]) {
                layouts[map.id] = { x: map.worldX || 0, y: map.worldY || 0, w, h, map };
            } else {
                layouts[map.id].w = w;
                layouts[map.id].h = h;
                layouts[map.id].map = map;
                // Update position from props ONLY if not currently dragging this map
                if (!isDragging) {
                    layouts[map.id].x = map.worldX || 0;
                    layouts[map.id].y = map.worldY || 0;
                }
            }
        });

        // Clear
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid (optional but helpful)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // 1. Draw Maps
        Object.values(layouts).forEach(layout => {
            const { x, y, w, h, map } = layout;
            const tileW = w / map.mapWidth;
            const tileH = h / map.mapHeight;

            // Background
            ctx.fillStyle = map.selectedBackgroundColor || '#87CEEB';
            ctx.fillRect(x, y, w, h);

            // Active indicator
            if (map.id === activeMapId) {
                ctx.strokeStyle = '#e3de0a';
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
            } else {
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, h);
            }

            // Name
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(map.name, x, y - 10);
            ctx.font = '10px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText(map.type, x, y + h + 12);

            // Delete button (X)
            if (map.id !== 'main') {
                ctx.fillStyle = '#ff4d4f';
                ctx.fillRect(x + w - 15, y - 25, 15, 15);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('×', x + w - 11, y - 13);
            }

            // Draw Tiles & Objects (simplified)
            for (let i = 0; i < map.mapWidth * map.mapHeight; i++) {
                const tx = (i % map.mapWidth) * tileW + x;
                const ty = Math.floor(i / map.mapWidth) * tileH + y;

                const tileId = map.tileMapData[i];
                const objId = map.objectMapData[i];

                if (tileId) {
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(tx, ty, Math.ceil(tileW), Math.ceil(tileH));
                }
                if (objId) {
                    if (objId.includes('portal') && !objId.includes('target')) {
                        ctx.fillStyle = '#007bff';
                    } else if (objId.includes('target') || objId === 'portal_target') {
                        ctx.fillStyle = '#ffc107';
                    } else {
                        ctx.fillStyle = '#dc3545';
                    }
                    ctx.fillRect(tx, ty, Math.ceil(tileW), Math.ceil(tileH));
                }
            }
        });

        // 2. Draw Connections
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;

        Object.values(layouts).forEach(sourceLayout => {
            const { map: sourceMap, x: sx, y: sy, w: sw, h: sh } = sourceLayout;
            const tileW = sw / sourceMap.mapWidth;
            const tileH = sh / sourceMap.mapHeight;

            const metadata = sourceMap.objectMetadata || {};
            
            for (let i = 0; i < sourceMap.mapWidth * sourceMap.mapHeight; i++) {
                const objId = sourceMap.objectMapData[i];
                if (!objId || !objId.includes('portal') || objId.includes('target')) continue;

                const meta = metadata[i];
                if (!meta || meta.triggerId === null || meta.triggerId === undefined) continue;

                const targetMapId = meta.targetMapId || sourceMap.id;
                const targetLayout = layouts[targetMapId];

                if (targetLayout) {
                    const { map: targetMap, x: tx, y: ty, w: tw, h: th } = targetLayout;
                    const tTileW = tw / targetMap.mapWidth;
                    const tTileH = th / targetMap.mapHeight;

                    // Find target object in target map
                    for (let j = 0; j < targetMap.mapWidth * targetMap.mapHeight; j++) {
                        const tObjId = targetMap.objectMapData[j];
                        if (!tObjId || (!tObjId.includes('target') && tObjId !== 'portal_target')) continue;

                        const tMeta = targetMap.objectMetadata?.[j];
                        if (tMeta && tMeta.triggerId === meta.triggerId) {
                            // Link found!
                            const startX = sx + (i % sourceMap.mapWidth) * tileW + tileW / 2;
                            const startY = sy + Math.floor(i / sourceMap.mapWidth) * tileH + tileH / 2;
                            const endX = tx + (j % targetMap.mapWidth) * tTileW + tTileW / 2;
                            const endY = ty + Math.floor(j / targetMap.mapWidth) * tTileH + tTileH / 2;

                            // Draw line
                            ctx.beginPath();
                            ctx.strokeStyle = (sourceMap.id === targetMap.id) ? '#fff' : '#00ff00';
                            ctx.moveTo(startX, startY);
                            
                            if (sourceMap.id !== targetMap.id) {
                                // Calculate mid points for a nicer curve
                                const cp1X = startX + (endX - startX) * 0.25;
                                const cp1Y = Math.min(startY, endY) - 100;
                                const cp2X = startX + (endX - startX) * 0.75;
                                const cp2Y = Math.min(startY, endY) - 100;
                                ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
                            } else {
                                ctx.lineTo(endX, endY);
                            }
                            ctx.stroke();

                            // Arrow head
                            const angle = Math.atan2(endY - startY, endX - startX);
                            ctx.save();
                            ctx.setLineDash([]);
                            ctx.translate(endX, endY);
                            ctx.rotate(angle);
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.lineTo(-10, -5);
                            ctx.lineTo(-10, 5);
                            ctx.closePath();
                            ctx.fillStyle = ctx.strokeStyle;
                            ctx.fill();
                            ctx.restore();
                            
                            break;
                        }
                    }
                }
            }
        });
    }, [allMaps, activeMapId]);

    useEffect(() => {
        draw();
    }, [allMaps, activeMapId]);

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const layouts = Object.values(mapLayoutsRef.current || {});
        
        // Check for delete button first
        for (const layout of layouts) {
            if (layout.map.id !== 'main') {
                const btnX = layout.x + layout.w - 15;
                const btnY = layout.y - 25;
                if (x >= btnX && x <= btnX + 15 && y >= btnY && y <= btnY + 15) {
                    if (window.confirm(`Delete map "${layout.map.name}"?`)) {
                        deleteMap(layout.map.id);
                    }
                    return;
                }
            }
        }

        // Check for map drag/select
        for (const layout of layouts) {
            if (x >= layout.x && x <= layout.x + layout.w &&
                y >= layout.y && y <= layout.y + layout.h) {
                
                if (e.detail === 2) { // Double click to switch
                    switchMap(layout.map.id);
                } else {
                    dragRef.current = {
                        id: layout.map.id,
                        startX: x,
                        startY: y,
                        mapStartX: layout.x,
                        mapStartY: layout.y
                    };
                }
                return;
            }
        }
    };

    const handleMouseMove = (e) => {
        if (!dragRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = x - dragRef.current.startX;
        const dy = y - dragRef.current.startY;

        const newX = Math.max(0, dragRef.current.mapStartX + dx);
        const newY = Math.max(0, dragRef.current.mapStartY + dy);

        // Update local layout for immediate visual feedback
        if (mapLayoutsRef.current[dragRef.current.id]) {
            mapLayoutsRef.current[dragRef.current.id].x = newX;
            mapLayoutsRef.current[dragRef.current.id].y = newY;
            draw();
        }
    };

    const handleMouseUp = (e) => {
        if (!dragRef.current) return;

        const layout = mapLayoutsRef.current[dragRef.current.id];
        if (layout) {
            updateMapData(dragRef.current.id, {
                worldX: layout.x,
                worldY: layout.y
            });
        }
        
        dragRef.current = null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                    onClick={() => createMap('overworld')}
                    style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                >
                    + Overworld
                </button>
                <button 
                    onClick={() => createMap('underworld')}
                    style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#5D4037', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                >
                    + Underworld
                </button>
                <button 
                    onClick={onAddRoomArea}
                    title="Mark Room Area on Map"
                    style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                >
                    + m<sup>2</sup>
                </button>
                <div style={{ marginLeft: 'auto', color: '#ccc', fontSize: '11px' }}>
                    Double-click map to select. Drag to move.
                </div>
            </div>

            <div ref={containerRef} style={{ width: '100%', height: '500px', backgroundColor: '#333', overflow: 'auto', borderRadius: '4px', position: 'relative', border: '1px solid #555' }}>
                <canvas
                    ref={canvasRef}
                    width={2000}
                    height={2000}
                    style={{ display: 'block', cursor: dragRef.current ? 'grabbing' : 'grab' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', pointerEvents: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, backgroundColor: '#fff', border: '1px dashed #fff' }}></div> Intra-map teleport</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, backgroundColor: '#00ff00', border: '1px dashed #00ff00' }}></div> Inter-map teleport</div>
                </div>
            </div>
        </div>
    );
};

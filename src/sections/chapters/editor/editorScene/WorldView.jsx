import React, { useRef, useEffect, useMemo } from 'react';

export const WorldView = ({
    maps,
    activeMapId,
    switchMap,
    registryItems,
    currentMapData
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const mapLayoutsRef = useRef({});

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Settings
        const mapScale = 0.5; // Scale down the minimaps further in world view
        const padding = 50;
        const baseTileSize = 4; // Each tile in world view
        
        // Calculate layouts
        let currentX = padding;
        let currentY = padding;
        let maxHeightInRow = 0;
        const mapLayouts = {};

        allMaps.forEach(map => {
            const w = map.mapWidth * baseTileSize;
            const h = map.mapHeight * baseTileSize;

            if (currentX + w + padding > canvas.width / dpr) {
                currentX = padding;
                currentY += maxHeightInRow + padding;
                maxHeightInRow = 0;
            }

            mapLayouts[map.id] = {
                x: currentX,
                y: currentY,
                w,
                h,
                map
            };

            currentX += w + padding;
            maxHeightInRow = Math.max(maxHeightInRow, h);
        });

        mapLayoutsRef.current = mapLayouts;

        // Resize canvas if needed (simplified)
        // canvas.height = currentY + maxHeightInRow + padding;

        // Clear
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Maps
        Object.values(mapLayouts).forEach(layout => {
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
            ctx.font = '12px Arial';
            ctx.fillText(map.name, x, y - 10);

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

        Object.values(mapLayouts).forEach(sourceLayout => {
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
                const targetLayout = mapLayouts[targetMapId];

                if (targetLayout) {
                    const { map: targetMap, x: tx, y: ty, w: tw, h: th } = targetLayout;
                    const tTileW = tw / targetMap.mapWidth;
                    const tTileH = th / targetMap.mapHeight;

                    // Find target object in target map
                    let targetFound = false;
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
                            
                            // If cross-map, draw a curve or intermediate points?
                            if (sourceMap.id !== targetMap.id) {
                                const cpX = (startX + endX) / 2;
                                const cpY = Math.min(startY, endY) - 50;
                                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
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
                            
                            targetFound = true;
                            break;
                        }
                    }
                }
            }
        });

    }, [allMaps, activeMapId]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '500px', backgroundColor: '#333', overflow: 'auto', borderRadius: '4px', position: 'relative' }}>
            <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                style={{ display: 'block', cursor: 'pointer' }}
                onClick={(e) => {
                    const rect = canvasRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    // Find which map was clicked
                    const layouts = Object.values(mapLayoutsRef.current || {});
                    for (const layout of layouts) {
                        if (x >= layout.x && x <= layout.x + layout.w &&
                            y >= layout.y && y <= layout.y + layout.h) {
                            switchMap(layout.map.id);
                            break;
                        }
                    }
                }}
            />
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, backgroundColor: '#fff', border: '1px dashed #fff' }}></div> Intra-map teleport</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, backgroundColor: '#00ff00', border: '1px dashed #00ff00' }}></div> Inter-map teleport</div>
            </div>
        </div>
    );
};

import React, { useRef, useEffect } from 'react';

export const Minimap = ({
    mapWidth,
    mapHeight,
    tileMapData,
    objectMapData,
    registryItems
}) => {
    const canvasRef = useRef(null);
    const minimapWidth = 250;
    const minimapHeight = 200;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const tileWidth = minimapWidth / mapWidth;
        const tileHeight = minimapHeight / mapHeight;

        // Clear canvas
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, minimapWidth, minimapHeight);

        // Draw tiles
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const index = y * mapWidth + x;
                const tileId = tileMapData[index];
                const objectId = objectMapData[index];

                const px = x * tileWidth;
                const py = y * tileHeight;

                // Draw tile
                if (tileId !== null) {
                    const tile = registryItems.find(item => item.id === tileId);
                    if (tile) {
                        if (tile.flags?.liquid) {
                            if (tile.flags.water) {
                                ctx.fillStyle = '#2a5d8f';
                            } else if (tile.flags.lava) {
                                ctx.fillStyle = '#c43f0f';
                            } else {
                                ctx.fillStyle = '#888';
                            }
                        } else {
                            // Solid block - darker color
                            ctx.fillStyle = '#654321';
                        }
                        ctx.fillRect(px, py, Math.ceil(tileWidth), Math.ceil(tileHeight));
                    }
                }

                // Draw object on top
                if (objectId !== null) {
                    const obj = registryItems.find(item => item.id === objectId);
                    if (obj) {
                        // Objects in bright colors
                        if (obj.name?.startsWith('entities.')) {
                            ctx.fillStyle = '#ff0000'; // Red for entities
                        } else if (obj.name?.startsWith('item.')) {
                            ctx.fillStyle = '#00ff00'; // Green for items
                        } else if (obj.name?.startsWith('interactable.')) {
                            ctx.fillStyle = '#ff00ff'; // Magenta for interactables
                        } else if (obj.type === 'hazard') {
                            ctx.fillStyle = '#ff8800'; // Orange for hazards
                        } else {
                            ctx.fillStyle = '#ffff00'; // Yellow for others
                        }
                        ctx.fillRect(px, py, Math.ceil(tileWidth), Math.ceil(tileHeight));
                    }
                }
            }
        }

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= mapWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * tileWidth, 0);
            ctx.lineTo(x * tileWidth, minimapHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= mapHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * tileHeight);
            ctx.lineTo(minimapWidth, y * tileHeight);
            ctx.stroke();
        }

    }, [mapWidth, mapHeight, tileMapData, objectMapData, registryItems]);

    return (
        <canvas
            ref={canvasRef}
            width={minimapWidth}
            height={minimapHeight}
            style={{
                width: '100%',
                height: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#87CEEB',
                imageRendering: 'pixelated'
            }}
        />
    );
};

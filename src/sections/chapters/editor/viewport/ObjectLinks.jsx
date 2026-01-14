import React from 'react';

export const ObjectLinks = ({ mapWidth, mapHeight, objectMapData, objectMetadata }) => {
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

    return (
        <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: mapWidth * 32,
            height: mapHeight * 32, // Note: mapHeight must be available
            zIndex: 10,
            pointerEvents: 'none',
            opacity: 0.6
        }}>
            {links}
        </svg>
    );
};

import React from 'react';

export const StatisticsPanel = ({ 
    totalTiles, 
    mapWidth, 
    mapHeight, 
    filledBlocks, 
    objectsCount, 
    emptyBlocks 
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '15px', backgroundColor: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>Total Map Area: <strong>{totalTiles}</strong> tiles</div>
                <div style={{ fontSize: '13px', color: '#0050b3' }}>Dimensions: {mapWidth} x {mapHeight}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#389e0d' }}>{filledBlocks}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>FILLED BLOCKS</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d46b08' }}>{objectsCount}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>OBJECTS</div>
                </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#666' }}>{emptyBlocks}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>EMPTY SPACE</div>
            </div>
        </div>
    );
};

import React from 'react';

const GameHeader = ({ health }) => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)', // Caurspīdīgs fons
            display: 'flex',
            justifyContent: 'flex-end', // Lai cipars būtu labajā pusē
            alignItems: 'center',
            padding: '0 20px',
            boxSizing: 'border-box',
            zIndex: 1000, // Virs visa pārējā
            pointerEvents: 'none' // Lai netraucē klikšķiem apakšā
        }}>
            <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'rgba(255, 50, 50, 0.9)', // Viegli sarkans
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                fontFamily: 'monospace'
            }}>
                ❤️ {health}
            </div>
        </div>
    );
};

export default GameHeader;
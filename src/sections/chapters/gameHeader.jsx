import React from 'react';

const GameHeader = ({ health, soundEnabled = false, onToggleSound }) => {
    const buttonStyle = {
        padding: '6px 10px',
        borderRadius: '4px',
        border: '1px solid',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        marginLeft: '12px',
        userSelect: 'none',
        backgroundColor: soundEnabled ? 'rgba(40, 140, 60, 0.9)' : 'rgba(160, 40, 40, 0.9)',
        borderColor: soundEnabled ? '#2e7d32' : '#7f1d1d',
        color: '#fff',
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)', // Caurspīdīgs fons
            display: 'flex',
            justifyContent: 'flex-end', // Labajā pusē
            alignItems: 'center',
            padding: '0 20px',
            boxSizing: 'border-box',
            zIndex: 1000, // Virs visa pārējā
            pointerEvents: 'none' // HUD nerada šķēršļus klikšķiem
        }}>
            <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'rgba(255, 50, 50, 0.9)', // Viegli sarkans
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                fontFamily: 'monospace',
                pointerEvents: 'none'
            }}>
                ❤️ {health}
            </div>
            <button
                onClick={() => {
                    if (typeof onToggleSound === 'function') onToggleSound();
                    try { window.dispatchEvent(new CustomEvent('game-sound-user-gesture')); } catch {}
                }}
                style={{ ...buttonStyle, pointerEvents: 'auto' }}
                title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
            >
                {soundEnabled ? 'Sound ON' : 'Sound OFF'}
            </button>
        </div>
    );
};

export default GameHeader;
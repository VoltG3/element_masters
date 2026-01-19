import React from 'react';
import { OperationButton, OperationLabel } from '../styles/EditorElementsButtonStyle';

export const OperationsPanel = ({ 
    openNewMapModal, 
    saveMap, 
    loadMap, 
    openBuiltInModal,
    clearMap, 
    mapName, 
    creatorName,
    mapDescription,
    setMapName,
    setCreatorName,
    setMapDescription
}) => {
    const inputStyle = {
        width: '100%',
        border: '1px solid transparent',
        background: 'transparent',
        padding: '4px 6px',
        fontSize: '13px',
        fontWeight: 'bold',
        outline: 'none',
        borderRadius: '4px',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
    };

    const handleFocus = (e) => {
        e.target.style.borderColor = '#2196F3';
        e.target.style.backgroundColor = '#fff';
        e.target.style.cursor = 'text';
    };

    const handleBlur = (e) => {
        e.target.style.borderColor = 'transparent';
        e.target.style.backgroundColor = 'transparent';
        e.target.style.cursor = 'pointer';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ 
                padding: '15px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px', 
                border: '1px solid #ddd', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px' 
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <OperationButton onClick={openNewMapModal} title="New Map">
                        <span style={{ fontSize: '18px' }}>📄</span>
                        <span>New</span>
                    </OperationButton>
                    <OperationButton onClick={saveMap} title="Save Map">
                        <span style={{ fontSize: '18px' }}>💾</span>
                        <span>Save</span>
                    </OperationButton>
                    <OperationLabel title="Load Map">
                        <span style={{ fontSize: '18px' }}>📂</span>
                        <span>Load</span>
                        <input type="file" accept=".json,.txt" onChange={loadMap} style={{ display: 'none' }} />
                    </OperationLabel>
                    <OperationButton onClick={openBuiltInModal} title="Built-in Maps">
                        <span style={{ fontSize: '18px' }}>📦</span>
                        <span>Built-in</span>
                    </OperationButton>
                    <OperationButton onClick={clearMap} $danger title="Clear Map">
                        <span style={{ fontSize: '18px' }}>🗑️</span>
                        <span>Clear</span>
                    </OperationButton>
                </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '2px', display: 'block' }}>MAP NAME</label>
                    <input 
                        value={mapName} 
                        onChange={(e) => setMapName(e.target.value)}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        title="Click to edit map name"
                    />
                </div>
                
                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '2px', display: 'block' }}>AUTHOR</label>
                    <input 
                        value={creatorName} 
                        onChange={(e) => setCreatorName(e.target.value)}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        title="Click to edit author"
                    />
                </div>

                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '2px', display: 'block' }}>DESCRIPTION</label>
                    <textarea 
                        value={mapDescription} 
                        onChange={(e) => setMapDescription(e.target.value)}
                        style={{ ...inputStyle, fontWeight: 'normal', minHeight: '60px', resize: 'vertical' }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        title="Click to edit description"
                    />
                </div>
            </div>
        </div>
    );
};

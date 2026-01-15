import React from 'react';
import { OperationButton, OperationLabel } from '../styles/EditorElementsButtonStyle';

export const OperationsPanel = ({ 
    openNewMapModal, 
    saveMap, 
    loadMap, 
    clearMap, 
    mapName, 
    creatorName 
}) => {
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
                    <OperationButton onClick={clearMap} $danger title="Clear Map">
                        <span style={{ fontSize: '18px' }}>🗑️</span>
                        <span>Clear</span>
                    </OperationButton>
                </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
                <div style={{ fontSize: '13px', marginBottom: '5px' }}>Map: <strong>{mapName}</strong></div>
                <div style={{ fontSize: '13px' }}>Author: <strong>{creatorName}</strong></div>
            </div>
        </div>
    );
};

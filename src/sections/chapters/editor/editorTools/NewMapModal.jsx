import React from 'react';
import { ToolsEditorButton } from '../styles/EditorToolsButton';
import { CloseButton } from '../styles/EditorElementsButtonStyle';

export const NewMapModal = ({
    isOpen,
    tempMapName,
    setTempMapName,
    tempCreatorName,
    setTempCreatorName,
    tempMapDescription,
    setTempMapDescription,
    confirmNewMap,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', width: '320px',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                <div style={{
                    padding: '12px 15px',
                    borderBottom: '2px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Create New Map</h3>
                    <CloseButton onClick={onClose}>✕</CloseButton>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>Map Name:</label>
                        <input
                            type="text"
                            value={tempMapName}
                            onChange={(e) => setTempMapName(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>Creator Nickname:</label>
                        <input
                            type="text"
                            value={tempCreatorName}
                            onChange={(e) => setTempCreatorName(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>Description:</label>
                        <textarea
                            value={tempMapDescription}
                            onChange={(e) => setTempMapDescription(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <ToolsEditorButton onClick={onClose} $variant="secondary" $small>
                            Cancel
                        </ToolsEditorButton>
                        <ToolsEditorButton onClick={() => confirmNewMap(tempMapName, tempCreatorName, tempMapDescription)} $variant="play" $small>
                            Create
                        </ToolsEditorButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

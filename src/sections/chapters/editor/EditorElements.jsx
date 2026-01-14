import React, { useState } from 'react';

export const EditorElements = ({ title, children, isOpenDefault = false }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);
    return (
        <div style={{ marginBottom: '5px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
            <div onClick={() => setIsOpen(!isOpen)} style={{ padding: '8px', cursor: 'pointer', backgroundColor: '#f0f0f0', fontWeight: 'bold', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                <span>{title}</span><span>{isOpen ? '▼' : '▶'}</span>
            </div>
            {isOpen && <div style={{ padding: '8px', maxHeight: '200px', overflowY: 'auto' }}>{children}</div>}
        </div>
    );
};

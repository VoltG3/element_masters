import React from 'react';
import BackgroundMusicPlayer from '../../../../utilities/BackgroundMusicPlayer';

export const MusicPanel = ({ 
    musicOptions, 
    selectedBackgroundMusic, 
    setSelectedBackgroundMusic 
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section>
                <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Background Music</span>
                <select
                    value={selectedBackgroundMusic || ''}
                    onChange={(e) => setSelectedBackgroundMusic(e.target.value || null)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '10px' }}>
                    <option value="">— No Music —</option>
                    {musicOptions.map(m => (
                        <option key={m.name} value={m.metaPath}>{m.name}</option>
                    ))}
                </select>
                <BackgroundMusicPlayer metaPath={selectedBackgroundMusic} enabled={true} volume={0.4} />
                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    Status: {selectedBackgroundMusic ? 'Music selected' : 'Silence'}
                </div>
            </section>
        </div>
    );
};

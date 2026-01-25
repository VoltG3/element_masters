import React from 'react';
import { useTranslation } from 'react-i18next';
export const MusicPanel = ({ 
    musicOptions, 
    selectedBackgroundMusic, 
    setSelectedBackgroundMusic 
}) => {
    const { t } = useTranslation('editor_scene');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section>
                <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{t('EDITOR_SCENE_MUSIC_TITLE')}</span>
                <select
                    value={selectedBackgroundMusic || ''}
                    onChange={(e) => setSelectedBackgroundMusic(e.target.value || null)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '10px' }}>
                    <option value="">{t('EDITOR_SCENE_MUSIC_NONE')}</option>
                    {musicOptions.map(m => (
                        <option key={m.name} value={m.metaPath}>{m.name}</option>
                    ))}
                </select>
                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    {t('EDITOR_SCENE_MUSIC_STATUS', {
                        status: selectedBackgroundMusic ? t('EDITOR_SCENE_MUSIC_STATUS_SELECTED') : t('EDITOR_SCENE_MUSIC_STATUS_SILENCE')
                    })}
                </div>
            </section>
        </div>
    );
};

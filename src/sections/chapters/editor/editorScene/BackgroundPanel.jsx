import React from 'react';
import { useTranslation } from 'react-i18next';

export const BackgroundPanel = ({ 
    backgroundOptions, 
    selectedBackgroundImage, 
    setSelectedBackgroundImage, 
    selectedBackgroundColor, 
    backgroundParallaxFactor, 
    setBackgroundParallaxFactor 
}) => {
    const { t } = useTranslation('editor_scene');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section>
                <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>{t('EDITOR_SCENE_BACKGROUND_IMAGE')}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div onClick={() => setSelectedBackgroundImage(null)}
                        style={{
                            border: selectedBackgroundImage ? '1px solid #ccc' : '2px solid #2196F3',
                            borderRadius: '6px', padding: '4px', cursor: 'pointer', background: '#fff',
                            boxShadow: !selectedBackgroundImage ? '0 0 8px rgba(33, 150, 243, 0.3)' : 'none'
                        }}
                        title={t('EDITOR_SCENE_BACKGROUND_SOLID')}>
                        <div style={{ width: '100%', height: '60px', background: selectedBackgroundColor, display: 'block', borderRadius: '4px' }} />
                        <div style={{ fontSize: '11px', textAlign: 'center', paddingTop: '5px', fontWeight: !selectedBackgroundImage ? 'bold' : 'normal' }}>{t('EDITOR_SCENE_BACKGROUND_SOLID')}</div>
                    </div>
                    {backgroundOptions.map((bg) => (
                        <div key={bg.name} onClick={() => setSelectedBackgroundImage(bg.metaPath)}
                            style={{
                                border: selectedBackgroundImage === bg.metaPath ? '2px solid #2196F3' : '1px solid #ccc',
                                borderRadius: '6px', padding: '4px', cursor: 'pointer', background: '#fff',
                                boxShadow: selectedBackgroundImage === bg.metaPath ? '0 0 8px rgba(33, 150, 243, 0.3)' : 'none'
                            }}
                            title={bg.name}>
                            <img src={bg.src} alt={bg.name} style={{ width: '100%', height: '60px', objectFit: 'cover', display: 'block', borderRadius: '4px' }} />
                            <div style={{ fontSize: '11px', textAlign: 'center', paddingTop: '5px', fontWeight: selectedBackgroundImage === bg.metaPath ? 'bold' : 'normal' }}>{bg.name}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <div style={{ marginBottom: '0px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>{t('EDITOR_SCENE_BACKGROUND_PARALLAX')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="range" min="0" max="1" step="0.05" value={backgroundParallaxFactor}
                            onChange={(e) => setBackgroundParallaxFactor(parseFloat(e.target.value))}
                            style={{ flex: 1 }} />
                        <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '35px' }}>{backgroundParallaxFactor.toFixed(2)}</span>
                    </div>
                </div>
            </section>
        </div>
    );
};

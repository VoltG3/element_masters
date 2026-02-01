import React from 'react';
import { useTranslation } from 'react-i18next';
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
    setMapDescription,
    mapType,
    updateMapData,
    activeMapId
}) => {
    const { t } = useTranslation('editor_elements');
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
                    <OperationButton onClick={openNewMapModal} title={t('EDITOR_ELEMENTS_OP_NEW_MAP_TITLE')}>
                        <span style={{ fontSize: '18px' }}>📄</span>
                        <span>{t('EDITOR_ELEMENTS_OP_NEW')}</span>
                    </OperationButton>
                    <OperationButton onClick={saveMap} title={t('EDITOR_ELEMENTS_OP_SAVE_MAP_TITLE')}>
                        <span style={{ fontSize: '18px' }}>💾</span>
                        <span>{t('EDITOR_ELEMENTS_OP_SAVE')}</span>
                    </OperationButton>
                    <OperationLabel title={t('EDITOR_ELEMENTS_OP_LOAD_MAP_TITLE')}>
                        <span style={{ fontSize: '18px' }}>📂</span>
                        <span>{t('EDITOR_ELEMENTS_OP_LOAD')}</span>
                        <input type="file" accept=".json,.txt" onChange={loadMap} style={{ display: 'none' }} />
                    </OperationLabel>
                    <OperationButton onClick={openBuiltInModal} title={t('EDITOR_ELEMENTS_OP_BUILT_IN_MAPS_TITLE')}>
                        <span style={{ fontSize: '18px' }}>📦</span>
                        <span>{t('EDITOR_ELEMENTS_OP_BUILT_IN')}</span>
                    </OperationButton>
                    <OperationButton onClick={clearMap} $danger title={t('EDITOR_ELEMENTS_OP_CLEAR_MAP_TITLE')}>
                        <span style={{ fontSize: '18px' }}>🗑️</span>
                        <span>{t('EDITOR_ELEMENTS_OP_CLEAR')}</span>
                    </OperationButton>
                </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '4px', display: 'block' }}>{t('EDITOR_ELEMENTS_OP_MAP_TYPE_LABEL')}</label>
                    <div style={{ display: 'flex', gap: '15px', padding: '4px 6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: mapType !== 'sea_rescue' ? 'bold' : 'normal' }}>
                            <input 
                                type="radio" 
                                name="mapType" 
                                checked={mapType !== 'sea_rescue'} 
                                onChange={() => updateMapData(activeMapId, { type: 'overworld' })}
                                style={{ cursor: 'pointer' }}
                            />
                            {t('EDITOR_ELEMENTS_OP_MAP_TYPE_DEFAULT')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: mapType === 'sea_rescue' ? 'bold' : 'normal' }}>
                            <input 
                                type="radio" 
                                name="mapType" 
                                checked={mapType === 'sea_rescue'} 
                                onChange={() => updateMapData(activeMapId, { type: 'sea_rescue' })}
                                style={{ cursor: 'pointer' }}
                            />
                            {t('EDITOR_ELEMENTS_OP_MAP_TYPE_SEA_RESCUE')}
                        </label>
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '2px', display: 'block' }}>{t('EDITOR_ELEMENTS_OP_MAP_NAME_LABEL')}</label>
                    <input 
                        value={mapName} 
                        onChange={(e) => setMapName(e.target.value)}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        title={t('EDITOR_ELEMENTS_OP_EDIT_MAP_NAME_TITLE')}
                    />
                </div>
                
                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '2px', display: 'block' }}>{t('EDITOR_ELEMENTS_OP_AUTHOR_LABEL')}</label>
                    <input 
                        value={creatorName} 
                        onChange={(e) => setCreatorName(e.target.value)}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        title={t('EDITOR_ELEMENTS_OP_EDIT_AUTHOR_TITLE')}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '6px', marginBottom: '2px', display: 'block' }}>{t('EDITOR_ELEMENTS_OP_DESCRIPTION_LABEL')}</label>
                    <textarea 
                        value={mapDescription} 
                        onChange={(e) => setMapDescription(e.target.value)}
                        style={{ ...inputStyle, fontWeight: 'normal', minHeight: '60px', resize: 'vertical' }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        title={t('EDITOR_ELEMENTS_OP_EDIT_DESCRIPTION_TITLE')}
                    />
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

export const StatisticsPanel = ({ 
    totalTiles, 
    mapWidth, 
    mapHeight, 
    filledBlocks, 
    objectsCount, 
    emptyBlocks 
}) => {
    const { t } = useTranslation('editor_elements');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '15px', backgroundColor: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <Trans i18nKey="EDITOR_ELEMENTS_STATS_TOTAL_AREA" t={t} values={{ count: totalTiles }} components={[<strong key="count" />]} />
                </div>
                <div style={{ fontSize: '13px', color: '#0050b3' }}>{t('EDITOR_ELEMENTS_STATS_DIMENSIONS', { width: mapWidth, height: mapHeight })}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#389e0d' }}>{filledBlocks}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_STATS_FILLED_BLOCKS')}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d46b08' }}>{objectsCount}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_STATS_OBJECTS')}</div>
                </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#666' }}>{emptyBlocks}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_STATS_EMPTY_SPACE')}</div>
            </div>
        </div>
    );
};

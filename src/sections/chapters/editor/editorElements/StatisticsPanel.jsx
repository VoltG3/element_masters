import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

export const StatisticsPanel = ({ 
    totalTiles, 
    mapWidth, 
    mapHeight, 
    filledBlocks, 
    objectsCount, 
    emptyBlocks,
    objectMapData,
    registryItems,
    maps
}) => {
    const { t } = useTranslation('editor_elements');
    const registryMap = registryItems && registryItems.__byId;
    const getDef = (id) => {
        if (!id) return null;
        if (registryMap && typeof registryMap.get === 'function') return registryMap.get(id) || null;
        return Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
    };

    let itemsCount = 0;
    let entitiesCount = 0;

    if (Array.isArray(objectMapData)) {
        objectMapData.forEach((id) => {
            if (!id) return;
            const def = getDef(id);
            if (!def) return;
            const name = (def.name || '').toLowerCase();
            if (name.startsWith('item.')) itemsCount += 1;
            if (def.type === 'entity' || def.subtype === 'tank' || def.subtype === 'platform' || name.includes('entities.')) {
                entitiesCount += 1;
            }
        });
    }

    const mapList = maps ? Object.values(maps) : [];
    const mapsTotal = mapList.length;
    const mapsOverworld = mapList.filter(m => m.type === 'overworld').length;
    const mapsUnderworld = mapList.filter(m => m.type === 'underworld').length;
    const mapsRooms = mapList.filter(m => m.type === 'room').length;
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', backgroundColor: '#eef7ff', borderRadius: '8px', border: '1px solid #b3d8ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1565c0' }}>{itemsCount}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_STATS_ITEMS')}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '8px', border: '1px solid #d1c4e9', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#5e35b1' }}>{entitiesCount}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_STATS_ENTITIES')}</div>
                </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#666' }}>{emptyBlocks}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_STATS_EMPTY_SPACE')}</div>
            </div>
            {mapsTotal > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>
                        {t('EDITOR_ELEMENTS_STATS_MAPS_TOTAL', { count: mapsTotal })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666' }}>
                        <span>{t('EDITOR_ELEMENTS_STATS_MAPS_OVERWORLD', { count: mapsOverworld })}</span>
                        <span>{t('EDITOR_ELEMENTS_STATS_MAPS_UNDERWORLD', { count: mapsUnderworld })}</span>
                        <span>{t('EDITOR_ELEMENTS_STATS_MAPS_ROOMS', { count: mapsRooms })}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

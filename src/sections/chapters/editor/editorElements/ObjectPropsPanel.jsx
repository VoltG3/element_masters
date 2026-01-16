import React from 'react';

export const ObjectPropsPanel = ({ 
    objectMapData, 
    registryItems, 
    mapWidth, 
    objectMetadata, 
    highlightedIndex, 
    setHighlightedIndex, 
    setObjectMetadata,
    maps
}) => {
    const mapList = Object.values(maps || {});
    const listRef = React.useRef(null);

    // Auto-scroll to highlighted item
    React.useEffect(() => {
        if (highlightedIndex !== null && listRef.current) {
            const highlightedElement = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div style={{ padding: '0' }}>
            <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                Configure triggers for Portals, Targets and Weather.
                <br />
                <strong>1.</strong> Place a <strong>Portal</strong>, <strong>Target</strong> or <strong>Weather Trigger</strong> from the palette.
                <br />
                <strong>2.</strong> Configure <strong>Trigger ID</strong> for links or <strong>Intensity</strong> for weather.
            </p>
            <div ref={listRef} style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {objectMapData.map((id, index) => {
                    if (!id) return null;
                    const def = registryItems.find(r => r.id === id);
                    if (!def || (!id.includes('portal') && !id.includes('target') && id !== 'portal_target' && def.type !== 'weather_trigger')) return null;

                    const x = index % mapWidth;
                    const y = Math.floor(index / mapWidth);
                    const metadata = objectMetadata[index] || {};
                    const isHighlighted = highlightedIndex === index;

                    return (
                        <div key={index} 
                            data-index={index}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onMouseLeave={() => setHighlightedIndex(null)}
                            style={{
                                padding: '10px',
                                border: isHighlighted ? '1px solid gold' : '1px solid #eee',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                backgroundColor: isHighlighted ? '#fffde7' : '#f9f9f9',
                                marginBottom: '5px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {def.type === 'weather_trigger' ? def.editorIcon : (id.includes('portal') && !id.includes('target') ? '🔵' : '🎯')} {def.displayName || def.name}
                                </span>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <span style={{ color: '#666', fontSize: '11px' }}>({x}, {y})</span>
                                    <button 
                                        onClick={() => {
                                            const el = document.querySelector(`.viewport`);
                                            if (el) {
                                                const scrollX = x * 32 - el.clientWidth / 2 + 16;
                                                const scrollY = y * 32 - el.clientHeight / 2 + 16;
                                                el.scrollTo({ left: scrollX, top: scrollY, behavior: 'smooth' });
                                            }
                                        }}
                                        style={{ 
                                            padding: '2px 6px', fontSize: '10px', cursor: 'pointer',
                                            backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '3px'
                                        }}
                                        title="Scroll to this object"
                                    >
                                        Locate
                                    </button>
                                </div>
                            </div>

                            {def.type !== 'weather_trigger' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Trigger ID:</label>
                                    <input
                                        type="number"
                                        value={metadata.triggerId || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setObjectMetadata(prev => ({
                                                ...prev,
                                                [index]: { ...prev[index], triggerId: isNaN(val) ? null : val }
                                            }));
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '4px 8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: isHighlighted ? '#fff' : '#f0f0f0'
                                        }}
                                        placeholder="Enter ID (e.g. 1)"
                                    />
                                </div>
                            )}

                            {def.type === 'weather_trigger' && def.hasIntensity && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Intensity (%):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={metadata.intensity !== undefined ? metadata.intensity : 50}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setObjectMetadata(prev => ({
                                                ...prev,
                                                [index]: { ...prev[index], intensity: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)) }
                                            }));
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '4px 8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: isHighlighted ? '#fff' : '#f0f0f0'
                                        }}
                                    />
                                </div>
                            )}

                            {id.includes('portal') && !id.includes('target') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Target Map:</label>
                                    <select
                                        value={metadata.targetMapId || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setObjectMetadata(prev => ({
                                                ...prev,
                                                [index]: { ...prev[index], targetMapId: val === '' ? null : val }
                                            }));
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '4px 8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: isHighlighted ? '#fff' : '#f0f0f0'
                                        }}
                                    >
                                        <option value="">Current Map</option>
                                        {mapList.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    );
                })}
                {objectMapData.filter(id => {
                    if (!id) return false;
                    const def = registryItems.find(r => r.id === id);
                    return id.includes('portal') || id.includes('target') || id === 'portal_target' || (def && def.type === 'weather_trigger');
                }).length === 0 && (
                    <p style={{ textAlign: 'center', color: '#999', marginTop: '20px', fontSize: '14px' }}>
                        No configurable objects found on map.
                    </p>
                )}
            </div>
        </div>
    );
};

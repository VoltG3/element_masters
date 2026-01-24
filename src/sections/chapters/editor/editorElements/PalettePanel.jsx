import React from 'react';
import { CollapsiblePanel } from './CollapsiblePanel';
import AnimatedItem from '../../../../utilities/AnimatedItem';

export const PalettePanel = ({ 
    isPlayMode, 
    category,
    blocks, 
    liquids, 
    entities, 
    decorations, 
    items, 
    interactables, 
    hazards, 
    secrets, 
    weather,
    messages,
    alternativeSecrets,
    obstacles,
    handlePaletteSelect, 
    selectedTile 
}) => {
    const renderPaletteItem = (item, color, layer) => {
        const hasImage = !!(item.texture || (Array.isArray(item.textures) && item.textures.length > 0));
        const editorIcon = item.editorIcon;
        const isLiquid = !!(item.flags && item.flags.liquid);
        const isWater = !!(item.flags && item.flags.water);
        const isLava = !!(item.flags && item.flags.lava);
        const isQuicksand = !!(item.flags && item.flags.quicksand);
        const isWaterfall = !!(item.flags && item.flags.waterfall);
        const isLavaWaterfall = !!(item.flags && item.flags.lava_waterfall);
        const isRadioactive = !!(item.flags && item.flags.radioactive);
        const isRadioactiveWaterfall = !!(item.flags && item.flags.radioactive_waterfall);
        const isSecret = item.type === 'secret';
        const isWeatherTrigger = item.type === 'weather_trigger';
        const isMessageTrigger = item.type === 'message_trigger';
        
        const swatchStyle = isLavaWaterfall
            ? { background: 'linear-gradient(180deg,#ffcc00,#ffff00)' }
            : (isLava ? { background: 'linear-gradient(180deg,#ffcc00,#ffff00)' }
            : (isWater || isWaterfall ? { background: 'linear-gradient(180deg,#3a7fb8,#5ba3d9)' }
            : (isQuicksand ? { background: 'linear-gradient(180deg,#a6915b,#7d6d42)' }
            : (isRadioactive || isRadioactiveWaterfall ? { background: 'linear-gradient(180deg,#1a5c1a,#32cd32)' }
            : { background: '#eee' }))));

        return (
            <div
                key={item.id}
                onClick={() => handlePaletteSelect(item, layer)}
                title={item.displayName || item.name}
                style={{
                    border: selectedTile?.id === item.id ? `2px solid ${color}` : '1px solid #ccc',
                    cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
                    position: 'relative'
                }}
            >
                {isSecret ? (
                    <div style={{
                        width: '100%', height: '100%', borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.filterColorInEditor || item.filterColor || 'rgba(0, 0, 0, 0.5)',
                        color: '#fff', fontSize: 8, textAlign: 'center', lineHeight: 1.1, fontWeight: 'bold'
                    }}>
                        {item.editorIcon || (item.subtype === 'above' ? 'ABOVE' : 'BELOW')}
                    </div>
                ) : (isWeatherTrigger || isMessageTrigger) ? (
                    <div style={{
                        width: '100%', height: '100%', borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isMessageTrigger ? '#fff9c4' : '#f0f4f8', 
                        border: isMessageTrigger ? '1px solid #fbc02d' : '1px solid #d1d9e6',
                        color: '#333', fontSize: '18px'
                    }}>
                        {item.editorIcon}
                    </div>
                ) : editorIcon ? (
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                        {editorIcon}
                    </div>
                ) : hasImage ? (
                    <AnimatedItem
                        textures={item.textures}
                        texture={item.texture}
                        speed={item.animationSpeed}
                        spriteSheet={item.spriteSheet}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        alt={item.name}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%', borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                        fontSize: 10, textAlign: 'center', lineHeight: 1.1,
                        ...swatchStyle
                    }}>
                        {isLiquid ? (isLavaWaterfall ? 'L.FALL' : (isLava ? 'LAVA' : (isRadioactiveWaterfall ? 'RADFALL' : (isRadioactive ? 'RAD' : (isWater ? 'WATER' : (isWaterfall ? 'FALL' : (isQuicksand ? 'QUICK' : 'LIQ'))))))) : (item.name || '—')}
                    </div>
                )}
            </div>
        );
    };

    if (isPlayMode) {
        return (
            <div style={{ padding: '20px', fontSize: '14px', color: '#666', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                Palette disabled during Play mode
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {category === 'blocks' && (() => {
                const getBlockGroup = (b) => {
                    if (b.editor?.group) return b.editor.group;
                    const name = (b.id || b.name || '').toLowerCase();
                    if (name.includes('brick')) return 'bricks';
                    if (name.includes('diorite') || name.includes('stone')) return 'stone';
                    if (name.includes('metal')) return 'metal';
                    if (name.includes('wood')) return 'wood';
                    return 'ground';
                };

                const groupOrder = [
                    { key: 'ground', title: 'Ground', color: 'blue', open: true },
                    { key: 'bricks', title: 'Bricks', color: 'blue', open: true },
                    { key: 'stone', title: 'Stone', color: 'blue', open: true },
                    { key: 'metal', title: 'Metal', color: 'blue', open: true },
                    { key: 'wood', title: 'Wood', color: 'blue', open: true }
                ];

                const withGroups = blocks.map(b => ({
                    item: b,
                    group: getBlockGroup(b)
                }));

                const sortBlocks = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const items = withGroups.filter(b => b.group === group.key).sort(sortBlocks);
                    if (items.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {items.map(b => renderPaletteItem(b.item, group.color, 'tile'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(b => !groupOrder.some(g => g.key === b.group)).sort(sortBlocks);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title="Other" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(b => renderPaletteItem(b.item, 'gray', 'tile'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'liquids' && (() => {
                const getLiquidGroup = (li) => {
                    if (li.editor?.group) return li.editor.group;
                    if (li.flags?.quicksand) return 'quicksand';
                    if (li.flags?.lava || li.flags?.lava_waterfall) return 'lava';
                    if (li.flags?.radioactive || li.flags?.radioactive_waterfall) return 'radiation';
                    if (li.flags?.water || li.flags?.waterfall) return 'water';
                    return 'other';
                };

                const groupOrder = [
                    { key: 'quicksand', title: 'Quicksand', color: 'goldenrod', open: true },
                    { key: 'water', title: 'Water', color: 'blue', open: true },
                    { key: 'lava', title: 'Lava', color: 'orange', open: true },
                    { key: 'radiation', title: 'Radiation', color: 'green', open: true }
                ];

                const withGroups = liquids.map(li => ({
                    item: li,
                    group: getLiquidGroup(li)
                }));

                const sortLiquids = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const items = withGroups.filter(li => li.group === group.key).sort(sortLiquids);
                    if (items.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {items.map(li => renderPaletteItem(li.item, group.color, 'tile'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(li => !groupOrder.some(g => g.key === li.group)).sort(sortLiquids);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                            title="Liquids support JSON overrides: liquid.overlay {color,alpha} and liquid.resources {oxygen,lavaResist,iceResist,strength,radioactivity,health} with enabled flags."
                            style={{ fontSize: '11px', color: '#666', cursor: 'help' }}
                        >
                            ℹ️ Liquid JSON overrides available (hover for details)
                        </div>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title="Other" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(li => renderPaletteItem(li.item, 'gray', 'tile'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'decorations' && (
                <CollapsiblePanel title="Decorations" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {decorations && decorations.map(d => renderPaletteItem(d, 'purple', 'object'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'entities' && (() => {
                const getEntityGroup = (e) => {
                    if (e.editor?.group) return e.editor.group;
                    const name = (e.id || e.name || '').toLowerCase();
                    if (name.includes('player')) return 'player';
                    return 'enemies';
                };

                const groupOrder = [
                    { key: 'player', title: 'Player', color: 'red', open: true },
                    { key: 'enemies', title: 'Enemies', color: 'red', open: true }
                ];

                const withGroups = entities.map(e => ({
                    item: e,
                    group: getEntityGroup(e)
                }));

                const sortEntities = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const groupItems = withGroups.filter(e => e.group === group.key).sort(sortEntities);
                    if (groupItems.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {groupItems.map(e => renderPaletteItem(e.item, group.color, 'object'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(e => !groupOrder.some(g => g.key === e.group)).sort(sortEntities);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                            title="Entities use editor metadata: editor.panel 'entities' and editor.group 'player' or 'enemies'."
                            style={{ fontSize: '11px', color: '#666', cursor: 'help' }}
                        >
                            ℹ️ Entities grouping is data-driven (hover for details)
                        </div>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title="Other" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(e => renderPaletteItem(e.item, 'gray', 'object'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'items' && (() => {
                const getItemGroup = (i) => {
                    if (i.editor?.group) return i.editor.group;
                    if (i.effect?.health) return 'health';
                    if (i.effect?.fireball) return 'ammunition';
                    return 'other';
                };

                const groupOrder = [
                    { key: 'health', title: 'Health', color: 'green', open: true },
                    { key: 'ammunition', title: 'Ammunition', color: 'green', open: true }
                ];

                const withGroups = items.map(i => ({
                    item: i,
                    group: getItemGroup(i)
                }));

                const sortItems = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const groupItems = withGroups.filter(i => i.group === group.key).sort(sortItems);
                    if (groupItems.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {groupItems.map(i => renderPaletteItem(i.item, group.color, 'object'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(i => !groupOrder.some(g => g.key === i.group)).sort(sortItems);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                            title="Items use editor metadata: editor.panel 'items' and editor.group 'health' or 'ammunition'."
                            style={{ fontSize: '11px', color: '#666', cursor: 'help' }}
                        >
                            ℹ️ Items grouping is data-driven (hover for details)
                        </div>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title="Other" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(i => renderPaletteItem(i.item, 'gray', 'object'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'interactables' && (() => {
                const getInteractableGroup = (i) => {
                    if (i.editor?.group) return i.editor.group;
                    if (i.subtype === 'door') return 'entrances';
                    if (i.subtype === 'platform' || i.subtype === 'arrow') return 'platforms';
                    if ((i.id || '').includes('portal') || (i.name || '').includes('portal')) return 'ports';
                    if (i.subtype === 'end') return 'ends';
                    const name = (i.id || i.name || '').toLowerCase();
                    if (name.includes('berry')) return 'harvestables';
                    if (name.includes('stone') || name.includes('wooden_box')) return 'physics';
                    if (name.includes('ice')) return 'blocks';
                    return 'other';
                };

                const groupOrder = [
                    { key: 'harvestables', title: 'Harvestables', color: 'purple', open: true },
                    { key: 'physics', title: 'Physic', color: 'purple', open: true },
                    { key: 'entrances', title: 'Entrences', color: 'purple', open: true },
                    { key: 'platforms', title: 'Platforms', color: 'purple', open: true },
                    { key: 'ports', title: 'Ports', color: 'purple', open: true },
                    { key: 'blocks', title: 'Blocks', color: 'purple', open: true },
                    { key: 'ends', title: 'Ends', color: 'purple', open: true }
                ];

                const withGroups = interactables.map(i => ({
                    item: i,
                    group: getInteractableGroup(i)
                }));

                const sortInteractables = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const items = withGroups.filter(i => i.group === group.key).sort(sortInteractables);
                    if (items.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {items.map(i => renderPaletteItem(i.item, group.color, 'object'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(i => !groupOrder.some(g => g.key === i.group)).sort(sortInteractables);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title="Other" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(i => renderPaletteItem(i.item, 'gray', 'object'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'hazards' && (() => {
                const getHazardGroup = (h) => {
                    if (h.editor?.group) return h.editor.group;
                    if (h.collision) return 'blocks';
                    return 'obstacles';
                };

                const groupOrder = [
                    { key: 'blocks', title: 'Hazards (Blocks)', color: 'orange', open: true },
                    { key: 'obstacles', title: 'Hazards (Obstacles)', color: 'brown', open: true }
                ];

                const withGroups = hazards.map(h => ({
                    item: h,
                    group: getHazardGroup(h)
                }));

                const sortHazards = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const items = withGroups.filter(h => h.group === group.key).sort(sortHazards);
                    if (items.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {items.map(h => renderPaletteItem(h.item, group.color, 'object'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(h => !groupOrder.some(g => g.key === h.group)).sort(sortHazards);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title="Hazards (Other)" isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(h => renderPaletteItem(h.item, 'gray', 'object'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'secrets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CollapsiblePanel title="m2 windows" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype === 'room').map(s => renderPaletteItem(s, 'purple', 'secret'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Open Area" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype === 'open').map(s => renderPaletteItem(s, 'purple', 'secret'))}
                        </div>
                    </CollapsiblePanel>
                    
                    <CollapsiblePanel title="Secret Area" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype !== 'open' && s.subtype !== 'room').map(s => renderPaletteItem(s, 'purple', 'secret'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Rain" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'rain').map(w => renderPaletteItem(w, 'blue', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Snow" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'snow').map(w => renderPaletteItem(w, 'blue', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Clouds" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'clouds').map(w => renderPaletteItem(w, 'blue', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Fog" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'fog').map(w => renderPaletteItem(w, 'blue', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Thunder" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'thunder').map(w => renderPaletteItem(w, 'blue', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Lava Rain" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'lavaRain').map(w => renderPaletteItem(w, 'red', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Radio Fog" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'radioactiveFog').map(w => renderPaletteItem(w, 'green', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Weather Meteor Rain" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'meteorRain').map(w => renderPaletteItem(w, 'orange', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Messages" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {messages && messages.map(m => renderPaletteItem(m, 'gold', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title="Alternative Secrets" isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {alternativeSecrets && alternativeSecrets.map(s => renderPaletteItem(s, 'purple', 'object'))}
                        </div>
                    </CollapsiblePanel>
                </div>
            )}

            {category === 'obstacles' && (
                <CollapsiblePanel title="Obstacles" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {obstacles && obstacles.length > 0 ? (
                            obstacles.map(o => renderPaletteItem(o, 'brown', 'object'))
                        ) : (
                            <div style={{ padding: '10px', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                No obstacles available yet
                            </div>
                        )}
                    </div>
                </CollapsiblePanel>
            )}
        </div>
    );
};

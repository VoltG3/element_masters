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
        const isSecret = item.type === 'secret';
        const isWeatherTrigger = item.type === 'weather_trigger';
        const isMessageTrigger = item.type === 'message_trigger';
        
        const swatchStyle = isWater
            ? { background: 'linear-gradient(180deg,#3a7fb8,#5ba3d9)' }
            : (isLava ? { background: 'linear-gradient(180deg,#6b1a07,#c43f0f)' } 
            : (isQuicksand ? { background: 'linear-gradient(180deg,#a6915b,#7d6d42)' } 
            : (isWaterfall ? { background: 'linear-gradient(180deg,#3a7fb8,#5ba3d9)' } 
            : (isLavaWaterfall ? { background: 'linear-gradient(180deg,#6b1a07,#c43f0f)' }
            : (isRadioactive ? { background: 'linear-gradient(180deg,#1a5c1a,#32cd32)' }
            : { background: '#eee' })))));

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
                        {isLiquid ? (isWater ? 'WATER' : (isLava ? 'LAVA' : (isQuicksand ? 'QUICK' : (isWaterfall ? 'FALL' : (isLavaWaterfall ? 'L.FALL' : (isRadioactive ? 'RAD' : 'LIQ')))))) : (item.name || '—')}
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
            {category === 'blocks' && (
                <CollapsiblePanel title="Blocks (Background)" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {blocks.map(b => renderPaletteItem(b, 'blue', 'tile'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'liquids' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CollapsiblePanel title="Liquids (Blocks)" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {liquids.filter(li => !li.flags?.radioactive).map(li => renderPaletteItem(li, 'blue', 'tile'))}
                        </div>
                    </CollapsiblePanel>
                    <CollapsiblePanel title="Radioactive" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {liquids.filter(li => li.flags?.radioactive).map(li => renderPaletteItem(li, 'green', 'tile'))}
                        </div>
                    </CollapsiblePanel>
                </div>
            )}

            {category === 'decorations' && (
                <CollapsiblePanel title="Decorations" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {decorations && decorations.map(d => renderPaletteItem(d, 'purple', 'object'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'entities' && (
                <CollapsiblePanel title="Entities (Objects)" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {entities.map(e => renderPaletteItem(e, 'red', 'object'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'items' && (
                <CollapsiblePanel title="Items (Objects)" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {items.map(i => renderPaletteItem(i, 'green', 'object'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'interactables' && (
                <CollapsiblePanel title="Interactables" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {interactables.map(i => renderPaletteItem(i, 'purple', 'object'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'hazards' && (
                <CollapsiblePanel title="Hazards" isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {hazards.map(h => renderPaletteItem(h, 'orange', 'object'))}
                    </div>
                </CollapsiblePanel>
            )}

            {category === 'secrets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CollapsiblePanel title="Open Area" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype === 'open').map(s => renderPaletteItem(s, 'purple', 'secret'))}
                        </div>
                    </CollapsiblePanel>
                    
                    <CollapsiblePanel title="Secret Area" isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype !== 'open').map(s => renderPaletteItem(s, 'purple', 'secret'))}
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

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsiblePanel } from './CollapsiblePanel';
import AnimatedItem from '../../../../utilities/AnimatedItem';
import i18n from '../../../../i18n/i18n';
import { getTutorialChapters, getTutorialItems } from '../../../../i18n/tutorialMessages';

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
    miniGames,
    weather,
    messages,
    crackableWalls,
    pushableWalls,
    obstacles,
    objectMetadata,
    setObjectMetadata,
    objectMapData,
    highlightedIndex,
    setHighlightedIndex,
    registryItems,
    handlePaletteSelect, 
    selectedTile 
}) => {
    const { t } = useTranslation('editor_elements');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [selectedMiniGame, setSelectedMiniGame] = useState('');

    const currentLang = i18n?.language || 'en';
    const tutorialChapters = useMemo(() => getTutorialChapters(currentLang), [currentLang]);
    const tutorialItems = useMemo(
        () => (selectedChapter ? getTutorialItems(selectedChapter, currentLang) : []),
        [selectedChapter, currentLang]
    );

    const miniGameGroups = useMemo(() => {
        if (!miniGames || miniGames.length === 0) return [];
        const groupOrder = new Map();
        miniGames.forEach(item => {
            const key = item.editor?.group || 'other';
            const order = item.editor?.groupOrder ?? item.editor?.order ?? 0;
            if (!groupOrder.has(key) || order < groupOrder.get(key)) {
                groupOrder.set(key, order);
            }
        });
        return Array.from(groupOrder.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([key]) => key);
    }, [miniGames]);

    const miniGameItems = useMemo(() => {
        if (!miniGames || !selectedMiniGame) return [];
        return miniGames
            .filter(item => (item.editor?.group || 'other') === selectedMiniGame)
            .sort((a, b) => {
                const ao = a.editor?.order ?? 0;
                const bo = b.editor?.order ?? 0;
                if (ao !== bo) return ao - bo;
                return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '');
            });
    }, [miniGames, selectedMiniGame]);

    const getMiniGameLabel = (key) => {
        if (key === 'sea_rescue') return t('EDITOR_ELEMENTS_MINI_GAMES_GROUP_SEA_RESCUE');
        if (key === 'other') return t('EDITOR_ELEMENTS_GROUP_OTHER');
        return key;
    };

    const getMiniGameLayer = (item) => {
        if (item.editor?.layer) return item.editor.layer;
        if (item.type === 'secret') return 'secret';
        if (item.id === 'minispill_sea_rescue_trigger') return 'object';
        return 'object';
    };

    useEffect(() => {
        if (!selectedChapter && tutorialChapters.length > 0) {
            setSelectedChapter(tutorialChapters[0]);
        } else if (selectedChapter && !tutorialChapters.includes(selectedChapter)) {
            setSelectedChapter(tutorialChapters[0] || '');
        }
    }, [tutorialChapters, selectedChapter]);

    useEffect(() => {
        if (!selectedMiniGame && miniGameGroups.length > 0) {
            setSelectedMiniGame(miniGameGroups[0]);
        } else if (selectedMiniGame && !miniGameGroups.includes(selectedMiniGame)) {
            setSelectedMiniGame(miniGameGroups[0] || '');
        }
    }, [miniGameGroups, selectedMiniGame]);

    const getLiquidLabel = ({
        isLavaWaterfall,
        isLava,
        isRadioactiveWaterfall,
        isRadioactive,
        isWater,
        isWaterfall,
        isQuicksand
    }) => {
        if (isLavaWaterfall) return t('EDITOR_ELEMENTS_LIQUID_LABEL_LFALL');
        if (isLava) return t('EDITOR_ELEMENTS_LIQUID_LABEL_LAVA');
        if (isRadioactiveWaterfall) return t('EDITOR_ELEMENTS_LIQUID_LABEL_RADFALL');
        if (isRadioactive) return t('EDITOR_ELEMENTS_LIQUID_LABEL_RAD');
        if (isWater) return t('EDITOR_ELEMENTS_LIQUID_LABEL_WATER');
        if (isWaterfall) return t('EDITOR_ELEMENTS_LIQUID_LABEL_FALL');
        if (isQuicksand) return t('EDITOR_ELEMENTS_LIQUID_LABEL_QUICK');
        return t('EDITOR_ELEMENTS_LIQUID_LABEL_LIQ');
    };

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
                        {item.editorIcon || (item.subtype === 'above' ? t('EDITOR_ELEMENTS_SECRET_ABOVE') : t('EDITOR_ELEMENTS_SECRET_BELOW'))}
                    </div>
                ) : (isWeatherTrigger || isMessageTrigger) ? (
                    hasImage ? (
                        <AnimatedItem
                            textures={item.textures}
                            texture={item.texture}
                            speed={item.animationSpeed}
                            spriteSheet={item.spriteSheet}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            alt={item.name}
                        />
                    ) : (
                        (() => {
                            const iconText = item.editorIcon || (item.i18nMessage ? 'i18n' : '');
                            return (
                        <div style={{
                            width: '100%', height: '100%', borderRadius: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isMessageTrigger ? '#fff9c4' : '#f0f4f8', 
                            border: isMessageTrigger ? '1px solid #fbc02d' : '1px solid #d1d9e6',
                            color: '#333', fontSize: (iconText === 'i18n' ? '12px' : '18px'), fontWeight: 700
                        }}>
                            {iconText}
                        </div>
                            );
                        })()
                    )
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
                        {isLiquid
                            ? getLiquidLabel({
                                isLavaWaterfall,
                                isLava,
                                isRadioactiveWaterfall,
                                isRadioactive,
                                isWater,
                                isWaterfall,
                                isQuicksand
                            })
                            : (item.name || '—')}
                    </div>
                )}
            </div>
        );
    };

    if (isPlayMode) {
        return (
            <div style={{ padding: '20px', fontSize: '14px', color: '#666', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                {t('EDITOR_ELEMENTS_PALETTE_DISABLED')}
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
                    { key: 'ground', title: t('EDITOR_ELEMENTS_BLOCK_GROUP_GROUND'), color: 'blue', open: true },
                    { key: 'bricks', title: t('EDITOR_ELEMENTS_BLOCK_GROUP_BRICKS'), color: 'blue', open: true },
                    { key: 'stone', title: t('EDITOR_ELEMENTS_BLOCK_GROUP_STONE'), color: 'blue', open: true },
                    { key: 'metal', title: t('EDITOR_ELEMENTS_BLOCK_GROUP_METAL'), color: 'blue', open: true },
                    { key: 'wood', title: t('EDITOR_ELEMENTS_BLOCK_GROUP_WOOD'), color: 'blue', open: true }
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
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_GROUP_OTHER')} isOpenDefault={false}>
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
                    { key: 'quicksand', title: t('EDITOR_ELEMENTS_LIQUID_GROUP_QUICKSAND'), color: 'goldenrod', open: true },
                    { key: 'water', title: t('EDITOR_ELEMENTS_LIQUID_GROUP_WATER'), color: 'blue', open: true },
                    { key: 'lava', title: t('EDITOR_ELEMENTS_LIQUID_GROUP_LAVA'), color: 'orange', open: true },
                    { key: 'radiation', title: t('EDITOR_ELEMENTS_LIQUID_GROUP_RADIATION'), color: 'green', open: true }
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
                            title={t('EDITOR_ELEMENTS_LIQUIDS_INFO_TITLE')}
                            style={{ fontSize: '11px', color: '#666', cursor: 'help' }}
                        >
                            ℹ️ {t('EDITOR_ELEMENTS_LIQUIDS_INFO_LABEL')}
                        </div>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_GROUP_OTHER')} isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(li => renderPaletteItem(li.item, 'gray', 'tile'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'decorations' && (() => {
                const getDecorationGroup = (d) => {
                    if (d.editor?.group) return d.editor.group;
                    return 'other';
                };

                const groupOrder = [
                    { key: 'trees', title: t('EDITOR_ELEMENTS_DECORATIONS_GROUP_TREES'), color: 'green', open: true }
                ];

                const withGroups = decorations.map(d => ({
                    item: d,
                    group: getDecorationGroup(d)
                }));

                const sortDecorations = (a, b) => {
                    const ao = a.item.editor?.order ?? 0;
                    const bo = b.item.editor?.order ?? 0;
                    if (ao !== bo) return ao - bo;
                    return (a.item.displayName || a.item.name || '').localeCompare(b.item.displayName || b.item.name || '');
                };

                const groupPanels = groupOrder.map(group => {
                    const items = withGroups.filter(d => d.group === group.key).sort(sortDecorations);
                    if (items.length === 0) return null;
                    return (
                        <CollapsiblePanel key={group.key} title={group.title} isOpenDefault={group.open}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {items.map(d => renderPaletteItem(d.item, group.color, 'object'))}
                            </div>
                        </CollapsiblePanel>
                    );
                }).filter(Boolean);

                const otherItems = withGroups.filter(d => !groupOrder.some(g => g.key === d.group)).sort(sortDecorations);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_GROUP_OTHER')} isOpenDefault={false}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {otherItems.map(d => renderPaletteItem(d.item, 'gray', 'object'))}
                                </div>
                            </CollapsiblePanel>
                        )}
                    </div>
                );
            })()}

            {category === 'entities' && (() => {
                const getEntityGroup = (e) => {
                    if (e.editor?.group) return e.editor.group;
                    const name = (e.id || e.name || '').toLowerCase();
                    if (name.includes('player')) return 'player';
                    if (name.includes('fish') || name.includes('animal')) return 'animals';
                    return 'enemies';
                };

                const groupOrder = [
                    { key: 'player', title: t('EDITOR_ELEMENTS_ENTITIES_GROUP_PLAYER'), color: 'red', open: true },
                    { key: 'animals', title: t('EDITOR_ELEMENTS_ENTITIES_GROUP_ANIMALS'), color: 'red', open: true },
                    { key: 'enemies', title: t('EDITOR_ELEMENTS_ENTITIES_GROUP_ENEMIES'), color: 'red', open: true }
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
                            title={t('EDITOR_ELEMENTS_ENTITIES_INFO_TITLE')}
                            style={{ fontSize: '11px', color: '#666', cursor: 'help' }}
                        >
                            ℹ️ {t('EDITOR_ELEMENTS_ENTITIES_INFO_LABEL')}
                        </div>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_GROUP_OTHER')} isOpenDefault={false}>
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
                    { key: 'health', title: t('EDITOR_ELEMENTS_ITEMS_GROUP_HEALTH'), color: 'green', open: true },
                    { key: 'ammunition', title: t('EDITOR_ELEMENTS_ITEMS_GROUP_AMMUNITION'), color: 'green', open: true }
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
                            title={t('EDITOR_ELEMENTS_ITEMS_INFO_TITLE')}
                            style={{ fontSize: '11px', color: '#666', cursor: 'help' }}
                        >
                            ℹ️ {t('EDITOR_ELEMENTS_ITEMS_INFO_LABEL')}
                        </div>
                        {groupPanels}
                        {otherItems.length > 0 && (
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_GROUP_OTHER')} isOpenDefault={false}>
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
                    if (i.subtype === 'ladder') return 'ledders';
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
                    { key: 'harvestables', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_HARVESTABLES'), color: 'purple', open: true },
                    { key: 'physics', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_PHYSIC'), color: 'purple', open: true },
                    { key: 'entrances', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_ENTRANCES'), color: 'purple', open: true },
                    { key: 'platforms', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_PLATFORMS'), color: 'purple', open: true },
                    { key: 'ledders', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_LEDDERS'), color: 'purple', open: true },
                    { key: 'ports', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_PORTS'), color: 'purple', open: true },
                    { key: 'blocks', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_BLOCKS'), color: 'purple', open: true },
                    { key: 'ends', title: t('EDITOR_ELEMENTS_INTERACTABLES_GROUP_ENDS'), color: 'purple', open: true }
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
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_GROUP_OTHER')} isOpenDefault={false}>
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
                    { key: 'blocks', title: t('EDITOR_ELEMENTS_HAZARDS_GROUP_BLOCKS'), color: 'orange', open: true },
                    { key: 'obstacles', title: t('EDITOR_ELEMENTS_HAZARDS_GROUP_OBSTACLES'), color: 'brown', open: true }
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
                            <CollapsiblePanel title={t('EDITOR_ELEMENTS_HAZARDS_OTHER')} isOpenDefault={false}>
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
                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_SECRETS_OPEN_AREA')} isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype === 'open').map(s => renderPaletteItem(s, 'purple', 'secret'))}
                        </div>
                    </CollapsiblePanel>
                    
                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_SECRETS_SECRET_AREA')} isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype !== 'open' && s.subtype !== 'room' && s.subtype !== 'animal_trigger').map(s => renderPaletteItem(s, 'purple', 'secret'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_SECRETS_CRACKABLE_WALL')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {crackableWalls && crackableWalls.map(s => renderPaletteItem(s, 'purple', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_SECRETS_PUSHABLE_WALL')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {pushableWalls && pushableWalls.map(s => renderPaletteItem(s, 'purple', 'object'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_SECRETS_ANIMAL_TRIGGERS')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {secrets && secrets.filter(s => s.subtype === 'animal_trigger').map(s => renderPaletteItem(s, 'purple', 'object'))}
                        </div>
                    </CollapsiblePanel>
                </div>
            )}

            {category === 'weather' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_RAIN')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'rain').map(w => renderPaletteItem(w, 'blue', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_SNOW')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'snow').map(w => renderPaletteItem(w, 'blue', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_CLOUDS')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'clouds').map(w => renderPaletteItem(w, 'blue', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_FOG')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'fog').map(w => renderPaletteItem(w, 'blue', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_THUNDER')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'thunder').map(w => renderPaletteItem(w, 'blue', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_LAVA_RAIN')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'lavaRain').map(w => renderPaletteItem(w, 'red', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_RADIO_FOG')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'radioactiveFog').map(w => renderPaletteItem(w, 'green', 'props'))}
                        </div>
                    </CollapsiblePanel>

                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_WEATHER_METEOR_RAIN')} isOpenDefault={false}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weather && weather.filter(w => w.weatherType === 'meteorRain').map(w => renderPaletteItem(w, 'orange', 'props'))}
                        </div>
                    </CollapsiblePanel>
                </div>
            )}

            {category === 'messages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CollapsiblePanel title={t('EDITOR_ELEMENTS_MESSAGES_TITLE')} isOpenDefault={true}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {messages && messages.map(m => renderPaletteItem(m, 'gold', 'props'))}
                        </div>
                    </CollapsiblePanel>
                    {selectedTile && (selectedTile.i18nMessage || selectedTile.type === 'message_trigger') && (
                        <CollapsiblePanel title={t('EDITOR_ELEMENTS_I18N_TITLE')} isOpenDefault={true}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {tutorialChapters.map(ch => (
                                        <button
                                            key={ch}
                                            onClick={() => setSelectedChapter(ch)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '11px',
                                                borderRadius: '4px',
                                                border: '1px solid #ccc',
                                                background: ch === selectedChapter ? '#f4c542' : '#f0f0f0',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {ch}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {tutorialItems.map(item => (
                                        <button
                                            key={`${selectedChapter}_${item.id}`}
                                            onClick={() => {
                                                let targetIndex = highlightedIndex;
                                                if ((targetIndex === null || targetIndex === undefined) && selectedTile?.id && objectMapData) {
                                                    const idx = objectMapData.findIndex(id => id === selectedTile.id);
                                                    if (idx >= 0) {
                                                        targetIndex = idx;
                                                        if (setHighlightedIndex) setHighlightedIndex(idx);
                                                    }
                                                }
                                                if (targetIndex === null || targetIndex === undefined) return;
                                                const objId = objectMapData?.[targetIndex];
                                                const objDef = registryItems?.find(r => r.id === objId);
                                                if (!objDef || objDef.type !== 'message_trigger') return;
                                                setObjectMetadata(prev => ({
                                                    ...prev,
                                                    [targetIndex]: {
                                                        ...prev[targetIndex],
                                                        i18nChapter: selectedChapter,
                                                        i18nId: item.id,
                                                        message: ''
                                                    }
                                                }));
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                padding: '6px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                background: '#fff',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <span style={{ fontSize: '11px', color: '#555' }}>{t('EDITOR_ELEMENTS_I18N_ID', { id: item.id })}</span>
                                            <span style={{ fontSize: '11px', color: '#222', flex: 1 }}>{item.text}</span>
                                        </button>
                                    ))}
                                </div>
                                {(highlightedIndex === null || highlightedIndex === undefined) && (
                                    <div style={{ fontSize: '11px', color: '#888' }}>
                                        {t('EDITOR_ELEMENTS_I18N_SELECT_HINT')}
                                    </div>
                                )}
                            </div>
                        </CollapsiblePanel>
                    )}
                </div>
            )}

            {category === 'minigames' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#f9f9f9', 
                        borderRadius: '8px', 
                        border: '1px solid #ddd', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px' 
                    }}>
                        <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginLeft: '2px', display: 'block', textTransform: 'uppercase' }}>
                            {t('EDITOR_ELEMENTS_MINI_GAMES_SELECT_LABEL')}
                        </label>
                        <select
                            value={selectedMiniGame}
                            onChange={(e) => setSelectedMiniGame(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                backgroundColor: '#fff',
                                outline: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {miniGameGroups.map(group => (
                                <option key={group} value={group}>
                                    {getMiniGameLabel(group)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 4px' }}>
                        {miniGameItems.length > 0 ? (
                            miniGameItems.map(item => renderPaletteItem(item, 'teal', getMiniGameLayer(item)))
                        ) : (
                            <div style={{ padding: '10px', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                {t('EDITOR_ELEMENTS_MINI_GAMES_EMPTY')}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {category === 'obstacles' && (
                <CollapsiblePanel title={t('EDITOR_ELEMENTS_OBSTACLES_TITLE')} isOpenDefault={true}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {obstacles && obstacles.length > 0 ? (
                            obstacles.map(o => renderPaletteItem(o, 'brown', 'object'))
                        ) : (
                            <div style={{ padding: '10px', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                {t('EDITOR_ELEMENTS_OBSTACLES_EMPTY')}
                            </div>
                        )}
                    </div>
                </CollapsiblePanel>
            )}
        </div>
    );
};

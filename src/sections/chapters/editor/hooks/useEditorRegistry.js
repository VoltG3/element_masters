import { useMemo } from 'react';

export const useEditorRegistry = (registryItems) => {
    const blocks = useMemo(() => 
        registryItems.filter(item => {
            if (!item.name || !item.name.startsWith('block.')) return false;
            if (item.flags && item.flags.liquid) return false;
            if (item.editor && item.editor.panel && item.editor.panel !== 'blocks') return false;
            return true;
        }), 
    [registryItems]);

    const liquids = useMemo(() => 
        registryItems.filter(item => item.flags && item.flags.liquid), 
    [registryItems]);

    const entities = useMemo(() => {
        const baseEntities = registryItems.filter(item => {
            if (!item.name || !item.name.toLowerCase().includes('entities.')) return false;
            if (item.isHiddenInEditor) return false;
            return !item.type || item.type === 'default' || item.type === 'entity' || item.subtype === 'tank';
        });

        const itemsToMove = registryItems.filter(item => 
            item.name && 
            item.name.startsWith('item.') && 
            item.id !== 'hertz_item' && 
            item.id !== 'fireball_ammo'
        );

        return [...baseEntities, ...itemsToMove];
    }, [registryItems]);

    const decorations = useMemo(() => 
        registryItems.filter(item => {
            if (item.type === 'decoration') return true;
            if (item.name && item.name.toLowerCase().includes('decoration.')) return true;
            if (item.id && item.id.includes('stone_pack')) return true;
            return false;
        }), 
    [registryItems]);

    const items = useMemo(() => 
        registryItems.filter(item => 
            item.name && 
            item.name.startsWith('item.') && 
            (item.id === 'hertz_item' || item.id === 'fireball_ammo')
        ), 
    [registryItems]);

    const interactables = useMemo(() => 
        registryItems.filter(item => {
            if (item.editor && item.editor.panel) return item.editor.panel === 'interactables';
            return item.type === 'interactable' || (item.name && item.name.startsWith('interactable.'));
        }), 
    [registryItems]);

    const hazards = useMemo(() => 
        registryItems.filter(item => item.type === 'hazard' || (item.name && item.name.startsWith('hazard.'))), 
    [registryItems]);

    const secrets = useMemo(() => 
        registryItems.filter(item => item.type === 'secret'), 
    [registryItems]);

    const weather = useMemo(() => 
        registryItems.filter(item => item.type === 'weather_trigger'), 
    [registryItems]);

    const messages = useMemo(() => 
        registryItems.filter(item => item.type === 'message_trigger'), 
    [registryItems]);

    const crackableWalls = useMemo(() => 
        registryItems.filter(item => item.type === 'crack_block'),
    [registryItems]);

    const pushableWalls = useMemo(() => 
        registryItems.filter(item => item.type === 'wolf_secret'),
    [registryItems]);

    const obstacles = useMemo(() => 
        registryItems.filter(item => item.type === 'obstacle' || (item.name && item.name.startsWith('obstacle.'))), 
    [registryItems]);

    return {
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
        crackableWalls,
        pushableWalls,
        obstacles
    };
};

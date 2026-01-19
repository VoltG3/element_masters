import { useState, useCallback } from 'react';

export const useEditorMaps = () => {
    const [maps, setMaps] = useState({
        'main': {
            id: 'main',
            name: 'Overworld',
            description: '',
            type: 'overworld',
            mapWidth: 20,
            mapHeight: 15,
            tileMapData: Array(20 * 15).fill(null),
            objectMapData: Array(20 * 15).fill(null),
            secretMapData: Array(20 * 15).fill(null),
            objectMetadata: {},
            selectedBackgroundImage: null,
            selectedBackgroundColor: '#99C1F1',
            backgroundParallaxFactor: 0.3,
            selectedBackgroundMusic: null,
            weather: {
                rain: 0,
                snow: 0,
                clouds: 0,
                fog: 0,
                thunder: 0,
                lavaRain: 0,
                radioactiveFog: 0,
                meteorRain: 0
            },
            playerPosition: { x: 100, y: 100 },
            worldX: 50,
            worldY: 50
        }
    });
    const [activeMapId, setActiveMapId] = useState('main');

    const createMap = useCallback((type, name, width = 20, height = 15) => {
        const id = `map_${Date.now()}`;
        
        // Find a good spot for new map
        const existingMaps = Object.values(maps);
        const maxY = Math.max(...existingMaps.map(m => m.worldY || 0), 0);
        
        const newMap = {
            id,
            name: name || (type === 'overworld' ? 'New Overworld' : 'New Underworld'),
            description: '',
            type,
            mapWidth: width,
            mapHeight: height,
            tileMapData: Array(width * height).fill(null),
            objectMapData: Array(width * height).fill(null),
            secretMapData: Array(width * height).fill(null),
            objectMetadata: {},
            selectedBackgroundImage: null,
            selectedBackgroundColor: type === 'overworld' ? '#99C1F1' : '#1a1a1a',
            backgroundParallaxFactor: 0.3,
            selectedBackgroundMusic: null,
            weather: {
                rain: 0,
                snow: 0,
                clouds: 0,
                fog: 0,
                thunder: 0,
                lavaRain: 0,
                radioactiveFog: 0,
                meteorRain: 0
            },
            playerPosition: null, // Only one map should have player eventually
            worldX: 50,
            worldY: maxY + 150
        };

        setMaps(prev => ({
            ...prev,
            [id]: newMap
        }));
        return id;
    }, []);

    const updateMapData = useCallback((id, data) => {
        setMaps(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                ...data
            }
        }));
    }, []);

    const deleteMap = useCallback((id) => {
        if (id === 'main') return; // Cannot delete main map
        setMaps(prev => {
            const newMaps = { ...prev };
            delete newMaps[id];
            return newMaps;
        });
        if (activeMapId === id) {
            setActiveMapId('main');
        }
    }, [activeMapId]);

    return {
        maps,
        setMaps,
        activeMapId,
        setActiveMapId,
        createMap,
        updateMapData,
        deleteMap
    };
};

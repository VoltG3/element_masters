import { useState, useCallback, useMemo } from 'react';
import { TILE_SIZE } from '../../../../constants/gameConstants';
import { useGameEngine } from '../../../../utilities/useGameEngine';

const EMPTY_ARRAY = [];

export const useEditorPlayMode = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, 
    selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, 
    registryItems, playerPosition, setPlayerPosition, setObjectMetadata
) => {
    const [isPlayMode, setIsPlayMode] = useState(false);
    const [editorSnapshot, setEditorSnapshot] = useState(null);
    const [revealedSecrets, setRevealedSecrets] = useState([]);
    const [playModeObjectData, setPlayModeObjectData] = useState([]);
    const [playModeSecretData, setPlayModeSecretData] = useState([]);

    const mapDataForGame = useMemo(() => ({
        meta: {
            width: mapWidth,
            height: mapHeight,
            tileSize: TILE_SIZE,
            backgroundImage: selectedBackgroundImage,
            backgroundColor: selectedBackgroundColor,
            backgroundParallaxFactor: backgroundParallaxFactor,
            objectMetadata: objectMetadata
        },
        layers: [
            { type: "tile", name: "background", data: tileMapData },
            { type: "object", name: "entities", data: playModeObjectData }
        ]
    }), [mapWidth, mapHeight, selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, tileMapData, playModeObjectData, objectMetadata]);

    const handleGameOver = useCallback(() => {
        setIsPlayMode(false);
    }, []);

    const handleStateUpdate = useCallback((newState, payload) => {
        if (newState && typeof newState === 'object' && newState.x !== undefined && newState.y !== undefined) {
            setPlayerPosition({ x: newState.x, y: newState.y });
        } else if (newState === 'collectItem' && payload !== undefined) {
            setPlayModeObjectData(prev => {
                const newData = [...prev];
                newData[payload] = null;
                return newData;
            });
        } else if (newState === 'objectDamage' && payload !== undefined) {
            const { index, damage } = payload;
            setObjectMetadata(prev => {
                const current = prev[index] || {};
                const objId = playModeObjectData[index];
                const def = registryItems.find(r => r.id === objId);
                if (!def) return prev;
                const maxH = def.maxHealth || 100;
                const newHealth = Math.max(0, (current.health !== undefined ? current.health : maxH) - damage);
                
                return {
                    ...prev,
                    [index]: { ...current, health: newHealth }
                };
            });
        }
    }, [playModeObjectData, registryItems, setPlayerPosition, setObjectMetadata]);

    const handleRevealSecret = useCallback((secretIndex) => {
        setRevealedSecrets(prev => [...prev, secretIndex]);
    }, []);

    const gameEngineState = useGameEngine(
        isPlayMode ? mapDataForGame : null,
        isPlayMode ? tileMapData : EMPTY_ARRAY,
        isPlayMode ? playModeObjectData : EMPTY_ARRAY,
        isPlayMode ? playModeSecretData : EMPTY_ARRAY,
        revealedSecrets,
        registryItems,
        handleGameOver,
        handleStateUpdate,
        handleRevealSecret,
        objectMetadata
    );

    const handlePlay = () => {
        setEditorSnapshot({
            objectMapData: [...objectMapData],
            secretMapData: [...secretMapData],
            objectMetadata: { ...objectMetadata },
            playerPosition: { ...playerPosition }
        });

        const playData = [...objectMapData];
        let spawnIndex = playData.findIndex(id => id && id.includes('player'));
        if (spawnIndex === -1) {
            const spawnX = Math.min(3, mapWidth - 1);
            const spawnY = Math.min(3, mapHeight - 1);
            spawnIndex = spawnY * mapWidth + spawnX;
            playData[spawnIndex] = 'player';
        }

        setPlayModeObjectData(playData);
        setPlayModeSecretData([...secretMapData]);
        setRevealedSecrets([]);
        setIsPlayMode(true);
    };

    const handlePause = () => {
        setIsPlayMode(false);
    };

    const handleReset = () => {
        if (editorSnapshot) {
            const resetData = [...editorSnapshot.objectMapData];
            let spawnIndex = resetData.findIndex(id => id && id.includes('player'));
            if (spawnIndex === -1) {
                const spawnX = Math.min(3, mapWidth - 1);
                const spawnY = Math.min(3, mapHeight - 1);
                spawnIndex = spawnY * mapWidth + spawnX;
                resetData[spawnIndex] = 'player';
            }

            setPlayModeObjectData(resetData);
            setPlayModeSecretData([...editorSnapshot.secretMapData]);
            setObjectMetadata({ ...editorSnapshot.objectMetadata });
            setRevealedSecrets([]);
        }
    };

    return {
        isPlayMode,
        setIsPlayMode,
        handlePlay,
        handlePause,
        handleReset,
        playModeObjectData,
        playModeSecretData,
        gameEngineState
    };
};

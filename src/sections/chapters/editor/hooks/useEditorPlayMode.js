import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TILE_SIZE } from '../../../../constants/gameConstants';
import { useGameEngine } from '../../../../utilities/useGameEngine';

const EMPTY_ARRAY = [];

export const useEditorPlayMode = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, 
    selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, 
    registryItems, playerPosition, setPlayerPosition, setObjectMetadata,
    weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
    maps, activeMapId, switchMap, spawnTriggerId
) => {
    const [isPlayMode, setIsPlayMode] = useState(false);
    const [editorSnapshot, setEditorSnapshot] = useState(null);
    const [revealedSecrets, setRevealedSecrets] = useState([]);
    const [playModeObjectData, setPlayModeObjectData] = useState([]);
    const [playModeSecretData, setPlayModeSecretData] = useState([]);
    const [playModeWeather, setPlayModeWeather] = useState({
        rain: 0, snow: 0, clouds: 0, fog: 0, thunder: 0
    });
    const [gameMessage, setGameMessage] = useState({ text: '', isVisible: false });
    const messageTimerRef = useRef(null);
    const lastSyncedMapIdRef = useRef(null);

    // Stability for engine initialization - only changes when map changes or play mode is toggled
    const engineInitId = useMemo(() => {
        return isPlayMode ? `${activeMapId}_${Date.now()}` : null;
    }, [isPlayMode, activeMapId]);

    // Derived data to ensure useGameEngine gets fresh data even before useEffect syncs state.
    // This prevents the engine from using old map data during initialization.
    const currentPlayObjectData = useMemo(() => {
        if (!isPlayMode) return EMPTY_ARRAY;
        if (lastSyncedMapIdRef.current !== activeMapId) {
            const playData = [...objectMapData];
            let spawnIndex = playData.findIndex(id => id && id.includes('player'));
            if (spawnIndex === -1 && (spawnTriggerId === null || spawnTriggerId === undefined)) {
                const spawnX = Math.min(3, mapWidth - 1);
                const spawnY = Math.min(3, mapHeight - 1);
                spawnIndex = spawnY * mapWidth + spawnX;
                playData[spawnIndex] = 'player';
            }
            return playData;
        }
        return playModeObjectData;
    }, [isPlayMode, activeMapId, playModeObjectData, objectMapData, spawnTriggerId, mapWidth, mapHeight]);

    const currentPlaySecretData = useMemo(() => {
        if (!isPlayMode) return EMPTY_ARRAY;
        if (lastSyncedMapIdRef.current !== activeMapId) return [...secretMapData];
        return playModeSecretData;
    }, [isPlayMode, activeMapId, playModeSecretData, secretMapData]);

    const mapDataForGame = useMemo(() => ({
        meta: {
            width: mapWidth,
            height: mapHeight,
            tileSize: TILE_SIZE,
            activeMapId: activeMapId,
            spawnTriggerId: spawnTriggerId,
            backgroundImage: selectedBackgroundImage,
            backgroundColor: selectedBackgroundColor,
            backgroundParallaxFactor: backgroundParallaxFactor,
            objectMetadata: objectMetadata,
            date_map_last_updated: engineInitId, 
            weather: {
                rain: isPlayMode ? playModeWeather.rain : weatherRain,
                snow: isPlayMode ? playModeWeather.snow : weatherSnow,
                clouds: isPlayMode ? playModeWeather.clouds : weatherClouds,
                fog: isPlayMode ? playModeWeather.fog : weatherFog,
                thunder: isPlayMode ? playModeWeather.thunder : weatherThunder
            }
        },
        maps: maps, // Project maps for inter-map teleports
        layers: [
            { type: "tile", name: "background", data: tileMapData },
            { type: "object", name: "entities", data: currentPlayObjectData }
        ]
    }), [
        mapWidth, mapHeight, activeMapId, spawnTriggerId, selectedBackgroundImage, selectedBackgroundColor, 
        backgroundParallaxFactor, tileMapData, currentPlayObjectData, objectMetadata,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        playModeWeather,
        isPlayMode, maps, engineInitId
    ]);

    // Synchronize play mode state when map changes (e.g., during inter-map teleport)
    useEffect(() => {
        if (isPlayMode && lastSyncedMapIdRef.current !== activeMapId) {
            const playData = [...objectMapData];
            
            let spawnIndex = playData.findIndex(id => id && id.includes('player'));
            if (spawnIndex === -1 && (spawnTriggerId === null || spawnTriggerId === undefined)) {
                const spawnX = Math.min(3, mapWidth - 1);
                const spawnY = Math.min(3, mapHeight - 1);
                spawnIndex = spawnY * mapWidth + spawnX;
                playData[spawnIndex] = 'player';
            }

            setPlayModeObjectData(playData);
            setPlayModeSecretData([...secretMapData]);
            setRevealedSecrets([]);
            lastSyncedMapIdRef.current = activeMapId;
        }
    }, [activeMapId, isPlayMode, objectMapData, secretMapData, mapWidth, mapHeight, spawnTriggerId]);

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
        } else if (newState === 'switchMap' && payload !== undefined) {
            const { targetMapId, triggerId } = payload;
            if (switchMap && targetMapId) {
                // We keep play mode active when switching maps via teleport
                switchMap(targetMapId, triggerId);
                // Note: triggerId will be picked up from the next activeMap's meta.spawnTriggerId
                // because switchMap updates the map data in Editor.jsx which then propagates back here.
            }
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
        } else if (newState === 'updateWeather' && payload) {
            const { type, value } = payload;
            setPlayModeWeather(prev => ({
                ...prev,
                [type]: value
            }));
            
            // Dispatch event for any UI components that might be listening
            const settingKey = 'weather' + type.charAt(0).toUpperCase() + type.slice(1);
            window.dispatchEvent(new CustomEvent('game-settings-update', { 
                detail: { [settingKey]: value } 
            }));
        } else if (newState === 'showMessage' && payload) {
            const { text, duration } = payload;
            
            if (messageTimerRef.current) {
                clearTimeout(messageTimerRef.current);
            }
            
            setGameMessage({ text, isVisible: true });
            
            messageTimerRef.current = setTimeout(() => {
                setGameMessage(prev => ({ ...prev, isVisible: false }));
                messageTimerRef.current = null;
            }, duration || 8000);
        }
    }, [playModeObjectData, registryItems, setPlayerPosition, setObjectMetadata, switchMap]);

    const handleRevealSecret = useCallback((secretIndex) => {
        setRevealedSecrets(prev => [...prev, secretIndex]);
    }, []);

    const gameEngineState = useGameEngine(
        isPlayMode ? mapDataForGame : null,
        isPlayMode ? tileMapData : EMPTY_ARRAY,
        isPlayMode ? currentPlayObjectData : EMPTY_ARRAY,
        isPlayMode ? currentPlaySecretData : EMPTY_ARRAY,
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
        setPlayModeWeather({
            rain: weatherRain,
            snow: weatherSnow,
            clouds: weatherClouds,
            fog: weatherFog,
            thunder: weatherThunder
        });
        setRevealedSecrets([]);
        lastSyncedMapIdRef.current = activeMapId;
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
            lastSyncedMapIdRef.current = activeMapId;
        }
    };

    return {
        isPlayMode,
        setIsPlayMode,
        handlePlay,
        handlePause,
        handleReset,
        playModeObjectData: currentPlayObjectData,
        playModeSecretData: currentPlaySecretData,
        playModeWeather,
        gameMessage,
        revealedSecrets,
        gameEngineState
    };
};

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TILE_SIZE } from '../../../../constants/gameConstants';
import { useGameEngine } from '../../../../utilities/useGameEngine';
import { applyWolfSecretShift, shouldRemoveCrackBlock } from '../../../../engine/gameplay/secrets';
import { shouldTriggerBreakEffect, getBreakEffectParams } from '../../../../engine/gameplay/breakEffects';

const EMPTY_ARRAY = [];

export const useEditorPlayMode = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata, 
    selectedBackgroundImage, selectedBackgroundColor, backgroundParallaxFactor, 
    registryItems, playerPosition, setPlayerPosition, setObjectMetadata,
    weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
    weatherLavaRain, weatherRadioactiveFog, weatherMeteorRain,
    maps, activeMapId, switchMap, spawnTriggerId,
    setTileMapData, updateMapData
) => {
    const [isPlayMode, setIsPlayMode] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [restartCounter, setRestartCounter] = useState(0);
    const [editorSnapshot, setEditorSnapshot] = useState(null);
    const [revealedSecrets, setRevealedSecrets] = useState([]);
    const [activeRoomIds, setActiveRoomIds] = useState(new Set());
    const [playModeObjectData, setPlayModeObjectData] = useState([]);
    const [playModeSecretData, setPlayModeSecretData] = useState([]);
    const [playModeWeather, setPlayModeWeather] = useState({
        rain: 0, snow: 0, clouds: 0, fog: 0, thunder: 0,
        lavaRain: 0, radioactiveFog: 0, meteorRain: 0
    });
    const [playModeMapsVersion, setPlayModeMapsVersion] = useState(0);
    const [gameMessage, setGameMessage] = useState({ text: '', isVisible: false });
    const messageTimerRef = useRef(null);
    const lastSyncedMapIdRef = useRef(null);
    const isPlayModeRef = useRef(isPlayMode);
    const playModeMapsRef = useRef({});

    useEffect(() => {
        isPlayModeRef.current = isPlayMode;
    }, [isPlayMode]);

    // Stability for engine initialization - only changes when map changes or play mode is toggled
    const engineInitId = useMemo(() => {
        return isPlayMode ? `${activeMapId}_${restartCounter}_${Date.now()}` : null;
    }, [isPlayMode, activeMapId, restartCounter]);

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

    const playModeMaps = useMemo(() => {
        if (!isPlayMode) return maps;
        const overrides = playModeMapsRef.current || {};
        const merged = { ...maps };
        Object.keys(overrides).forEach(id => {
            if (!merged[id]) return;
            merged[id] = {
                ...merged[id],
                objectMapData: overrides[id].objectMapData || merged[id].objectMapData,
                secretMapData: overrides[id].secretMapData || merged[id].secretMapData,
                objectMetadata: overrides[id].objectMetadata || merged[id].objectMetadata
            };
        });
        return merged;
    }, [isPlayMode, maps, playModeMapsVersion]);

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
            activeRoomIds: Array.from(activeRoomIds),
            date_map_last_updated: engineInitId, 
            weather: {
                rain: isPlayMode ? playModeWeather.rain : weatherRain,
                lavaRain: isPlayMode ? playModeWeather.lavaRain : weatherLavaRain,
                snow: isPlayMode ? playModeWeather.snow : weatherSnow,
                meteorRain: isPlayMode ? playModeWeather.meteorRain : weatherMeteorRain,
                clouds: isPlayMode ? playModeWeather.clouds : weatherClouds,
                fog: isPlayMode ? playModeWeather.fog : weatherFog,
                radioactiveFog: isPlayMode ? playModeWeather.radioactiveFog : weatherRadioactiveFog,
                thunder: isPlayMode ? playModeWeather.thunder : weatherThunder
            }
        },
        maps: playModeMaps, // Project maps for inter-map teleports
        layers: [
            { type: "tile", name: "background", data: tileMapData },
            { type: "object", name: "entities", data: currentPlayObjectData },
            { type: "secret", name: "secrets", data: currentPlaySecretData }
        ]
    }), [
        mapWidth, mapHeight, activeMapId, spawnTriggerId, selectedBackgroundImage, selectedBackgroundColor, 
        backgroundParallaxFactor, tileMapData, currentPlayObjectData, objectMetadata, activeRoomIds,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        weatherLavaRain, weatherRadioactiveFog, weatherMeteorRain,
        playModeWeather,
        isPlayMode, playModeMaps, engineInitId
    ]);

    // Synchronize play mode state when map changes (e.g., during inter-map teleport)
    useEffect(() => {
        if (isPlayMode && lastSyncedMapIdRef.current !== activeMapId) {
            const saved = playModeMapsRef.current?.[activeMapId];
            if (saved) {
                setPlayModeObjectData([...saved.objectMapData]);
                setPlayModeSecretData([...(saved.secretMapData || [])]);
                if (saved.objectMetadata) {
                    setObjectMetadata({ ...saved.objectMetadata });
                }
                setRevealedSecrets([]);
                if (messageTimerRef.current) {
                    clearTimeout(messageTimerRef.current);
                    messageTimerRef.current = null;
                }
                setGameMessage({ text: '', isVisible: false });
                lastSyncedMapIdRef.current = activeMapId;
                return;
            }
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
            if (messageTimerRef.current) {
                clearTimeout(messageTimerRef.current);
                messageTimerRef.current = null;
            }
            setGameMessage({ text: '', isVisible: false });
            lastSyncedMapIdRef.current = activeMapId;
        }
    }, [activeMapId, isPlayMode, objectMapData, secretMapData, mapWidth, mapHeight, spawnTriggerId]);

    const handleGameOver = useCallback(() => {
        setIsGameOver(true);
    }, []);

    const handleReplay = useCallback(() => {
        setIsGameOver(false);
        setRestartCounter(prev => prev + 1);
        setRevealedSecrets([]);
        if (editorSnapshot) {
            setPlayModeObjectData([...editorSnapshot.objectMapData]);
            setPlayModeSecretData([...editorSnapshot.secretMapData]);
            setObjectMetadata({ ...editorSnapshot.objectMetadata });
        }
    }, [editorSnapshot, setObjectMetadata]);

    const handleStateUpdate = useCallback((newState, payload) => {
        if (newState && typeof newState === 'object' && newState.x !== undefined && newState.y !== undefined) {
            setPlayerPosition({ x: newState.x, y: newState.y });
        } else if (newState === 'collectItem' && payload !== undefined) {
            const { index, mapId } = typeof payload === 'object' ? payload : { index: payload, mapId: null };
            if (!mapId || mapId === activeMapId) {
                setPlayModeObjectData(prev => {
                    const newData = [...prev];
                    newData[index] = null;
                    playModeMapsRef.current[activeMapId] = {
                        ...(playModeMapsRef.current[activeMapId] || {}),
                        objectMapData: newData
                    };
                    setPlayModeMapsVersion(v => v + 1);
                    return newData;
                });
            } else if (updateMapData && maps[mapId]) {
                const newData = [...(playModeMapsRef.current?.[mapId]?.objectMapData || maps[mapId].objectMapData || [])];
                newData[index] = null;
                playModeMapsRef.current[mapId] = {
                    ...(playModeMapsRef.current[mapId] || {}),
                    objectMapData: newData
                };
                setPlayModeMapsVersion(v => v + 1);
            }
        } else if (newState === 'interactable' && payload !== undefined) {
            const { index, mapId } = typeof payload === 'object' ? payload : { index: payload, mapId: null };
            if (!mapId || mapId === activeMapId) {
                setPlayModeObjectData(prev => {
                    const currentId = prev[index];
                    if (!currentId) return prev;
                    const newData = [...prev];
                    newData[index] = currentId + '_used';
                    playModeMapsRef.current[activeMapId] = {
                        ...(playModeMapsRef.current[activeMapId] || {}),
                        objectMapData: newData
                    };
                    setPlayModeMapsVersion(v => v + 1);
                    return newData;
                });
            } else if (updateMapData && maps[mapId]) {
                const mapObj = playModeMapsRef.current?.[mapId]?.objectMapData || maps[mapId].objectMapData || [];
                const currentId = mapObj[index];
                if (currentId) {
                    const newData = [...mapObj];
                    newData[index] = currentId + '_used';
                    playModeMapsRef.current[mapId] = {
                        ...(playModeMapsRef.current[mapId] || {}),
                        objectMapData: newData
                    };
                    setPlayModeMapsVersion(v => v + 1);
                }
            }
        } else if (newState === 'setObjectFrame' && payload !== undefined) {
            const { index, frame, mapId } = payload;
            if (!mapId || mapId === activeMapId) {
                setObjectMetadata(prev => {
                    const next = {
                        ...prev,
                        [index]: { ...prev[index], currentFrame: frame }
                    };
                    playModeMapsRef.current[activeMapId] = {
                        ...(playModeMapsRef.current[activeMapId] || {}),
                        objectMetadata: next
                    };
                    setPlayModeMapsVersion(v => v + 1);
                    return next;
                });
            } else if (updateMapData && maps[mapId]) {
                const newMeta = { ...((playModeMapsRef.current?.[mapId]?.objectMetadata) || maps[mapId].objectMetadata || {}) };
                newMeta[index] = { ...(newMeta[index] || {}), currentFrame: frame };
                playModeMapsRef.current[mapId] = {
                    ...(playModeMapsRef.current[mapId] || {}),
                    objectMetadata: newMeta
                };
                setPlayModeMapsVersion(v => v + 1);
            }
        } else if (newState === 'switchMap' && payload !== undefined) {
            const { targetMapId, triggerId } = payload;
            
            // Check if target is a room
            const targetMap = maps[targetMapId];
            if (targetMap && targetMap.type === 'room') {
                setActiveRoomIds(prev => {
                    const next = new Set(prev);
                    if (next.has(targetMapId)) next.delete(targetMapId);
                    else next.add(targetMapId);
                    return next;
                });
            } else if (targetMapId === 'main' && activeRoomIds.size > 0) {
                setActiveRoomIds(new Set());
            } else if (switchMap && targetMapId) {
                playModeMapsRef.current[activeMapId] = {
                    objectMapData: [...playModeObjectData],
                    secretMapData: [...playModeSecretData],
                    objectMetadata: { ...objectMetadata }
                };
                setPlayModeMapsVersion(v => v + 1);
                // We keep play mode active when switching maps via teleport
                switchMap(targetMapId, triggerId);
            }
        } else if (newState === 'objectDamage' && payload !== undefined) {
            const { index, damage } = payload;
            const objId = playModeObjectData[index];
            const def = registryItems.find(r => r.id === objId);
            if (!def) return;

            setObjectMetadata(prev => {
                const current = prev[index] || {};
                const maxH = def.maxHealth || 100;
                const newHealth = Math.max(0, (current.health !== undefined ? current.health : maxH) - damage);
                
                if (shouldRemoveCrackBlock(def, newHealth)) {
                    if (setTileMapData) {
                        setTileMapData(prevTiles => {
                            const newTiles = [...prevTiles];
                            newTiles[index] = null;
                            return newTiles;
                        });
                    }
                }

                if (shouldTriggerBreakEffect(def, newHealth) && !current.breakFxPlayed) {
                    const cfg = getBreakEffectParams(def);
                    if (cfg) {
                        const x = (index % mapWidth) * TILE_SIZE + TILE_SIZE / 2;
                        const y = Math.floor(index / mapWidth) * TILE_SIZE + TILE_SIZE / 2;
                        window.dispatchEvent(new CustomEvent('game-break-effect', {
                            detail: { x, y, config: cfg }
                        }));
                    }
                }

                return {
                    ...prev,
                    [index]: { ...current, health: newHealth, breakFxPlayed: current.breakFxPlayed || shouldTriggerBreakEffect(def, newHealth) }
                };
            });
            const nextMeta = {
                ...(objectMetadata || {}),
                [index]: {
                    ...(objectMetadata?.[index] || {}),
                    health: Math.max(0, ((objectMetadata?.[index]?.health ?? (def.maxHealth || 100)) - damage))
                }
            };
            playModeMapsRef.current[activeMapId] = {
                ...(playModeMapsRef.current[activeMapId] || {}),
                objectMetadata: nextMeta
            };
            setPlayModeMapsVersion(v => v + 1);

            const x = (index % mapWidth) * TILE_SIZE + TILE_SIZE / 2;
            const y = Math.floor(index / mapWidth) * TILE_SIZE;
            window.dispatchEvent(new CustomEvent('game-floating-text', {
                detail: { x, y, text: `-${damage}`, color: '#ff3b3b', amount: damage }
            }));
        } else if (newState === 'entityDamage' && payload) {
            const { x, y, amount } = payload;
            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(amount)) {
                window.dispatchEvent(new CustomEvent('game-floating-text', {
                    detail: { x, y, text: `-${Math.round(amount)}`, color: '#ff3b3b', amount }
                }));
            }
        } else if (newState === 'shiftTile' && payload !== undefined) {
            const { index, dx, dy } = payload;
            const mapIdAtStart = activeMapId;
            
            applyWolfSecretShift({
                index,
                dx,
                dy,
                mapWidth,
                mapHeight,
                getObjectId: idx => playModeObjectData[idx],
                getObjectDef: objId => registryItems.find(r => r.id === objId),
                moveTile: (from, to) => {
                    if (setTileMapData) {
                        setTileMapData(prevTiles => {
                            const newTiles = [...prevTiles];
                            newTiles[to] = newTiles[from];
                            newTiles[from] = null;
                            return newTiles;
                        });
                    }
                },
                moveObject: (from, to) => {
                    setPlayModeObjectData(prevObjs => {
                        const newObjs = [...prevObjs];
                        newObjs[to] = newObjs[from];
                        newObjs[from] = null;
                        playModeMapsRef.current[activeMapId] = {
                            ...(playModeMapsRef.current[activeMapId] || {}),
                            objectMapData: newObjs
                        };
                        setPlayModeMapsVersion(v => v + 1);
                        return newObjs;
                    });
                },
                moveMetadata: (from, to) => {
                    setObjectMetadata(prevMeta => {
                        const newMeta = { ...prevMeta };
                        if (newMeta[from]) {
                            newMeta[to] = newMeta[from];
                            delete newMeta[from];
                        }
                        playModeMapsRef.current[activeMapId] = {
                            ...(playModeMapsRef.current[activeMapId] || {}),
                            objectMetadata: newMeta
                        };
                        setPlayModeMapsVersion(v => v + 1);
                        return newMeta;
                    });
                },
                removeObject: idx => {
                    setPlayModeObjectData(prevObjs => {
                        const newObjs = [...prevObjs];
                        newObjs[idx] = null;
                        playModeMapsRef.current[activeMapId] = {
                            ...(playModeMapsRef.current[activeMapId] || {}),
                            objectMapData: newObjs
                        };
                        setPlayModeMapsVersion(v => v + 1);
                        return newObjs;
                    });
                },
                shouldCancel: () => !isPlayModeRef.current || activeMapId !== mapIdAtStart
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
        } else if (newState === 'weatherEffectHit' && payload) {
            const { type, data } = payload;
            window.dispatchEvent(new CustomEvent('weather-effect-hit', { detail: { type, data } }));
        } else if (newState === 'floatingText' && payload) {
            const { x, y, text, color, amount } = payload;
            if (Number.isFinite(x) && Number.isFinite(y) && text) {
                window.dispatchEvent(new CustomEvent('game-floating-text', {
                    detail: { x, y, text, color, amount }
                }));
            }
        } else if (newState === 'playerDamage' && payload !== undefined) {
            const { damage, x, y } = payload || {};
            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(damage)) {
                window.dispatchEvent(new CustomEvent('game-floating-text', {
                    detail: { x, y, text: `-${Math.round(damage)}`, color: '#ff3b3b', amount: damage }
                }));
            }
        }
    }, [activeMapId, maps, updateMapData, activeRoomIds, playModeObjectData, registryItems, setPlayerPosition, setObjectMetadata, switchMap, playModeSecretData, objectMetadata, mapWidth, mapHeight]);

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
        objectMetadata,
        Array.from(activeRoomIds),
        mapWidth,
        mapHeight
    );

    const handlePlay = () => {
        setEditorSnapshot({
            tileMapData: [...tileMapData],
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
        playModeMapsRef.current = {
            [activeMapId]: {
                objectMapData: playData,
                secretMapData: [...secretMapData],
                objectMetadata: { ...objectMetadata }
            }
        };
        setPlayModeMapsVersion(v => v + 1);
        setPlayModeWeather({
            rain: weatherRain,
            snow: weatherSnow,
            clouds: weatherClouds,
            fog: weatherFog,
            thunder: weatherThunder,
            lavaRain: weatherLavaRain,
            radioactiveFog: weatherRadioactiveFog,
            meteorRain: weatherMeteorRain
        });
        setRevealedSecrets([]);
        lastSyncedMapIdRef.current = activeMapId;
        setIsPlayMode(true);
        setIsGameOver(false); // Reset game over when starting play mode
    };

    const handlePause = () => {
        setIsPlayMode(false);
        setIsGameOver(false); // Reset game over when exiting play mode
        playModeMapsRef.current = {};
        setPlayModeMapsVersion(v => v + 1);
    };

    const handleReset = () => {
        if (editorSnapshot) {
            if (setTileMapData) {
                setTileMapData([...editorSnapshot.tileMapData]);
            }

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
            playModeMapsRef.current = {
                [activeMapId]: {
                    objectMapData: resetData,
                    secretMapData: [...editorSnapshot.secretMapData],
                    objectMetadata: { ...editorSnapshot.objectMetadata }
                }
            };
            setPlayModeMapsVersion(v => v + 1);
            lastSyncedMapIdRef.current = activeMapId;
        }
    };

    const handleForceStop = () => {
        setIsPlayMode(false);
        setIsGameOver(false);
        setEditorSnapshot(null);
        setPlayModeObjectData([]);
        setPlayModeSecretData([]);
        setRevealedSecrets([]);
        playModeMapsRef.current = {};
        lastSyncedMapIdRef.current = null;
        setPlayModeMapsVersion(v => v + 1);
    };

    return {
        isPlayMode,
        setIsPlayMode,
        isGameOver,
        handlePlay,
        handlePause,
        handleReset,
        handleForceStop,
        handleReplay,
        handleStateUpdate,
        playModeObjectData: currentPlayObjectData,
        playModeSecretData: currentPlaySecretData,
        playModeWeather,
        playModeMaps,
        gameMessage,
        revealedSecrets,
        activeRoomIds: Array.from(activeRoomIds),
        gameEngineState
    };
};

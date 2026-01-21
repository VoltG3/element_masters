import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TILE_SIZE } from '../../../../constants/gameConstants';
import { useGameEngine } from '../../../../utilities/useGameEngine';

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
    const [gameMessage, setGameMessage] = useState({ text: '', isVisible: false });
    const messageTimerRef = useRef(null);
    const lastSyncedMapIdRef = useRef(null);

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
        maps: maps, // Project maps for inter-map teleports
        layers: [
            { type: "tile", name: "background", data: tileMapData },
            { type: "object", name: "entities", data: currentPlayObjectData }
        ]
    }), [
        mapWidth, mapHeight, activeMapId, spawnTriggerId, selectedBackgroundImage, selectedBackgroundColor, 
        backgroundParallaxFactor, tileMapData, currentPlayObjectData, objectMetadata, activeRoomIds,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        weatherLavaRain, weatherRadioactiveFog, weatherMeteorRain,
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
                    return newData;
                });
            } else if (updateMapData && maps[mapId]) {
                const newData = [...(maps[mapId].objectMapData || [])];
                newData[index] = null;
                updateMapData(mapId, { objectMapData: newData });
            }
        } else if (newState === 'interactable' && payload !== undefined) {
            const { index, mapId } = typeof payload === 'object' ? payload : { index: payload, mapId: null };
            if (!mapId || mapId === activeMapId) {
                setPlayModeObjectData(prev => {
                    const currentId = prev[index];
                    if (!currentId) return prev;
                    const newData = [...prev];
                    newData[index] = currentId + '_used';
                    return newData;
                });
            } else if (updateMapData && maps[mapId]) {
                const currentId = maps[mapId].objectMapData?.[index];
                if (currentId) {
                    const newData = [...maps[mapId].objectMapData];
                    newData[index] = currentId + '_used';
                    updateMapData(mapId, { objectMapData: newData });
                }
            }
        } else if (newState === 'setObjectFrame' && payload !== undefined) {
            const { index, frame, mapId } = payload;
            if (!mapId || mapId === activeMapId) {
                setObjectMetadata(prev => ({
                    ...prev,
                    [index]: { ...prev[index], currentFrame: frame }
                }));
            } else if (updateMapData && maps[mapId]) {
                const newMeta = { ...(maps[mapId].objectMetadata || {}) };
                newMeta[index] = { ...(newMeta[index] || {}), currentFrame: frame };
                updateMapData(mapId, { objectMetadata: newMeta });
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
            } else if (targetMapId === 'main' && activeRoomIds.length > 0) {
                setActiveRoomIds(new Set());
            } else if (switchMap && targetMapId) {
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
                
                if (def.type === 'crack_block' && newHealth <= (def.passableHealthThreshold || 0)) {
                    if (setTileMapData) {
                        setTileMapData(prevTiles => {
                            const newTiles = [...prevTiles];
                            newTiles[index] = null;
                            return newTiles;
                        });
                    }
                }

                return {
                    ...prev,
                    [index]: { ...current, health: newHealth }
                };
            });
        } else if (newState === 'shiftTile' && payload !== undefined) {
            const { index, dx, dy } = payload;
            
            // Wolfenstein-style slow move: 1 block at a time
            let currentIdx = index;
            let remainingDx = dx;
            let remainingDy = dy;
            
            const moveStep = () => {
                if (remainingDx === 0 && remainingDy === 0) {
                    // Final removal of the trigger
                    setPlayModeObjectData(prevObjs => {
                        const newObjs = [...prevObjs];
                        newObjs[currentIdx] = null;
                        return newObjs;
                    });
                    return;
                }
                
                const stepX = remainingDx > 0 ? 1 : (remainingDx < 0 ? -1 : 0);
                const stepY = remainingDy > 0 ? 1 : (remainingDy < 0 ? -1 : 0);
                
                const tx = (currentIdx % mapWidth) + stepX;
                const ty = Math.floor(currentIdx / mapWidth) + stepY;
                
                if (tx >= 0 && tx < mapWidth && ty >= 0 && ty < mapHeight) {
                    const targetIndex = ty * mapWidth + tx;
                    
                    // Chain reaction logic
                    const isLastStepOfBatch = (Math.abs(remainingDx) === 1 && remainingDy === 0) || (Math.abs(remainingDy) === 1 && remainingDx === 0);
                    if (isLastStepOfBatch) {
                        const targetObjId = playModeObjectData[targetIndex];
                        const targetDef = registryItems.find(r => r.id === targetObjId);
                        if (targetDef && targetDef.type === 'wolf_secret') {
                            const extraX = Math.abs(targetDef.moveX || 3);
                            const extraY = Math.abs(targetDef.moveY || 3);
                            if (remainingDx !== 0) remainingDx += (remainingDx > 0 ? extraX : -extraX);
                            if (remainingDy !== 0) remainingDy += (remainingDy > 0 ? extraY : -extraY);
                        }
                    }

                    if (setTileMapData) {
                        setTileMapData(prevTiles => {
                            const newTiles = [...prevTiles];
                            newTiles[targetIndex] = newTiles[currentIdx];
                            newTiles[currentIdx] = null;
                            return newTiles;
                        });
                    }
                    
                    setPlayModeObjectData(prevObjs => {
                        const newObjs = [...prevObjs];
                        newObjs[targetIndex] = newObjs[currentIdx];
                        newObjs[currentIdx] = null;
                        return newObjs;
                    });
                    
                    setObjectMetadata(prevMeta => {
                        const newMeta = { ...prevMeta };
                        if (newMeta[currentIdx]) {
                            newMeta[targetIndex] = newMeta[currentIdx];
                            delete newMeta[currentIdx];
                        }
                        return newMeta;
                    });
                    
                    currentIdx = targetIndex;
                    remainingDx -= stepX;
                    remainingDy -= stepY;
                    
                    if (remainingDx !== 0 || remainingDy !== 0) {
                        setTimeout(moveStep, 250); // 250ms delay
                    } else {
                        // All steps finished, remove trigger
                        setPlayModeObjectData(prevObjs => {
                            const newObjs = [...prevObjs];
                            newObjs[currentIdx] = null;
                            return newObjs;
                        });
                    }
                } else {
                    // World bounds reached, remove trigger
                    setPlayModeObjectData(prevObjs => {
                        const newObjs = [...prevObjs];
                        newObjs[currentIdx] = null;
                        return newObjs;
                    });
                }
            };
            
            moveStep();
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
        }
    }, [activeMapId, maps, updateMapData, activeRoomIds, playModeObjectData, registryItems, setPlayerPosition, setObjectMetadata, switchMap]);

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
        Array.from(activeRoomIds)
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
            lastSyncedMapIdRef.current = activeMapId;
        }
    };

    return {
        isPlayMode,
        setIsPlayMode,
        isGameOver,
        handlePlay,
        handlePause,
        handleReset,
        handleReplay,
        handleStateUpdate,
        playModeObjectData: currentPlayObjectData,
        playModeSecretData: currentPlaySecretData,
        playModeWeather,
        gameMessage,
        revealedSecrets,
        activeRoomIds: Array.from(activeRoomIds),
        gameEngineState
    };
};

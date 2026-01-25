import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getRegistry, findItemById } from '../../../engine/registry';
import PixiStage from './PixiStage';
import { useGameEngine } from '../../../utilities/useGameEngine';
import GameHeader from './GameHeader';
import GameTerminal from './GameTerminal';
import GameSettings from './GameSettings';
import { findSpawnPosition } from '../../../engine/gameplay/interactables';
import { applyWolfSecretShift, shouldRemoveCrackBlock } from '../../../engine/gameplay/secrets';
import { shouldTriggerBreakEffect, getBreakEffectParams } from '../../../engine/gameplay/breakEffects';
import BackgroundMusicPlayer from '../../../utilities/BackgroundMusicPlayer';
import { setActiveMap, removeObjectAtIndex, removeTileAtIndex, moveTileInMap, moveObjectInMap, updateObjectAtIndex, updateObjectMetadata, setObjectTextureIndex, revealSecretZone, resetGame, setGameOver, toggleRoom, clearRooms } from '../../../store/slices/gameSlice';
import { setMapModalOpen, setCameraScrollX, setShouldCenterMap } from '../../../store/slices/uiSlice';
import errorHandler from '../../../services/errorHandler';
import styled from 'styled-components';
import MessageOverlay from '../shared/MessageOverlay';

import { BUILT_IN_MAPS } from '../../../constants/builtInMaps';
import { TILE_SIZE } from '../../../constants/gameConstants';

// Styled Components
const GameContainer = styled.div`
    position: relative;
    height: 100%;
    overflow: hidden;
    background-color: #333;
`;

const ModalOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    width: 900px;
    max-width: 95%;
    max-height: 85%;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const ModalTitle = styled.h2`
    margin: 0;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
`;

const MapList = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 15px;
    padding: 5px;
`;

const MapCard = styled.div`
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    cursor: pointer;
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.2s ease;

    &:hover {
        background-color: #f0f7ff;
        border-color: #2196f3;
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
`;

const MapTitle = styled.div`
    font-weight: bold;
    font-size: 16px;
    color: #333;
`;

const MapAuthor = styled.div`
    font-size: 12px;
    color: #666;
`;

const MapDescription = styled.div`
    font-size: 11px;
    color: #777;
    font-style: italic;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 45px;
`;

const MapInfo = styled.div`
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #eee;
    font-size: 11px;
    color: #555;
    display: flex;
    justify-content: space-between;
`;

const WinCounterOverlay = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 120px;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.5);
    z-index: 2000;
    pointer-events: none;
    font-family: 'Courier New', Courier, monospace;
`;

const GameOverOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 2500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.5s ease-out;

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

const GameOverTitle = styled.h1`
    font-size: 72px;
    margin: 0 0 30px 0;
    text-transform: uppercase;
    letter-spacing: 5px;
    color: #ff4444;
    text-shadow: 0 0 20px rgba(255, 0, 0, 0.5), 0 5px 15px rgba(0,0,0,0.8);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 900;
`;

const ReplayButton = styled.button`
    padding: 18px 50px;
    font-size: 28px;
    background: linear-gradient(180deg, #4CAF50, #2E7D32);
    color: white;
    border: 2px solid #fff;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    outline: none;

    &:hover {
        background: linear-gradient(180deg, #66BB6A, #388E3C);
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }

    &:active {
        transform: scale(0.98) translateY(0);
    }
`;

const ModalDivider = styled.div`
    border-top: 2px solid #eee;
    padding-top: 15px;
    margin-top: 10px;
`;

const FileUploadLabel = styled.label`
    padding: 8px 16px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    display: inline-block;
    width: 100%;
    box-sizing: border-box;

    &:hover {
        background-color: #1976D2;
    }
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const Viewport = styled.div`
    height: 100%;
    overflow: hidden;
    filter: ${props => props.$blurred ? 'blur(5px)' : 'none'};
    pointer-events: ${props => props.$blurred ? 'none' : 'auto'};
    transition: filter 0.3s ease;
`;

const GameCanvas = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #111;
`;

const PlaceholderMessage = styled.div`
    color: #777;
    font-size: 24px;
`;

export default function Game() {
    const { t } = useTranslation('game');
    const dispatch = useDispatch();
    const viewportRef = useRef(null);

    // Redux state
    const gameState = useSelector(state => state.game) || {};
    const uiState = useSelector(state => state.ui) || {};
    const {
        activeMapData = null,
        tileMapData = [],
        objectMapData = [],
        secretMapData = [],
        objectMetadata = {},
        revealedSecrets = [],
        objectTextureIndices = {},
        mapWidth = 20,
        mapHeight = 15,
        isGameOver = false,
        activeRoomIds = [],
        projectMaps = {}
    } = gameState;
    const {
        isMapModalOpen = true,
        cameraScrollX = 0,
        shouldCenterMap = false
    } = uiState;
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            const v = localStorage.getItem('game_sound_enabled');
            if (v === null) return false;
            return v !== '0';
        } catch {
            return false;
        }
    });

    // Runtime settings that can be changed from GameSettings on the fly
    const [runtimeSettings, setRuntimeSettings] = useState({});

    // In-game messages
    const [gameMessage, setGameMessage] = useState({ text: '', isVisible: false });
    const messageTimerRef = useRef(null);

    useEffect(() => {
        const onToggle = (e) => {
            const enabled = !!(e?.detail?.enabled);
            setSoundEnabled(enabled);
            try { localStorage.setItem('game_sound_enabled', enabled ? '1' : '0'); } catch {}
        };
        window.addEventListener('game-sound-toggle', onToggle);
        return () => window.removeEventListener('game-sound-toggle', onToggle);
    }, []);

    useEffect(() => {
        if (messageTimerRef.current) {
            clearTimeout(messageTimerRef.current);
            messageTimerRef.current = null;
        }
        setGameMessage({ text: '', isVisible: false });
    }, [activeMapData]);

    // Registry
    const registryItems = getRegistry() || [];

    const handleGameOver = () => {
        dispatch(setGameOver(true));
    };

    const handleReplay = () => {
        if (activeMapData) {
            console.log("Replaying map...");
            const mapToLoad = {
                ...activeMapData,
                meta: {
                    ...activeMapData.meta,
                    date_map_last_updated: new Date().toISOString()
                }
            };
            loadMapData(mapToLoad);
            dispatch(setGameOver(false));
        }
    };

    const playerStateRef = useRef(null);
    const activeMapIdRef = useRef(null);
    const isGameOverRef = useRef(false);

    useEffect(() => {
        const id = activeMapData?.meta?.activeMapId || activeMapData?.meta?.activeMap || 'main';
        activeMapIdRef.current = id;
    }, [activeMapData]);

    useEffect(() => {
        isGameOverRef.current = !!isGameOver;
    }, [isGameOver]);

    const handleStateUpdate = useCallback((action, payload) => {
        if (action === 'collectItem') {
            const { index, mapId } = typeof payload === 'object' ? payload : { index: payload, mapId: null };
            dispatch(removeObjectAtIndex({ index, mapId }));
        } else if (action === 'interactable') {
            const { index, mapId } = typeof payload === 'object' ? payload : { index: payload, mapId: null };
            
            const targetObjectData = (!mapId || mapId === 'main') ? objectMapData : (activeMapData?.maps?.[mapId]?.objectMapData || []);
            const currentId = targetObjectData[index];
            
            if (currentId) {
                dispatch(updateObjectAtIndex({ index, newId: currentId + '_used', mapId }));
            }
        } else if (action === 'setObjectFrame') {
            const { index, frame, mapId } = payload;
            dispatch(updateObjectMetadata({ index, metadata: { currentFrame: frame }, mapId }));
        } else if (action === 'switchMap') {
            const { targetMapId, triggerId } = payload;
            const projectMapsResolved = Object.keys(projectMaps || {}).length
                ? projectMaps
                : (activeMapData?.maps || activeMapData?.projectMaps || {});
            const targetMap = projectMapsResolved[targetMapId];
            
            if (targetMap && targetMap.type === 'room') {
                if (!activeRoomIds.includes(targetMapId)) {
                    dispatch(toggleRoom(targetMapId));
                }
                return;
            } else if (targetMapId === 'main' && activeRoomIds.length > 0) {
                dispatch(clearRooms());
                
                // Open the door at the exit target position to prevent getting stuck
                const spawn = findSpawnPosition(activeMapData, triggerId, 32);
                if (spawn) {
                    const spawnIdx = (Math.floor(spawn.y / 32) * mapWidth) + Math.floor(spawn.x / 32);
                    const spawnObjId = objectMapData[spawnIdx];
                    const spawnDef = registryItems.find(r => r.id === spawnObjId);
                    if (spawnDef && spawnDef.subtype === 'door') {
                        dispatch(updateObjectMetadata({ 
                            index: spawnIdx, 
                            metadata: { currentFrame: spawnDef.interaction?.frames?.opening || 1 } 
                        }));
                    }
                }
                return;
            }
            
            if (targetMap) {
                console.log(`Switching to map: ${targetMapId}, looking for trigger: ${triggerId}`);
                
                // Mēs varam vienkārši nodot visu projektu un pielikt spawnTriggerId
                const projectToLoad = {
                    ...activeMapData,
                    maps: projectMapsResolved,
                    meta: {
                        ...activeMapData.meta,
                        activeMapId: targetMapId,
                        spawnTriggerId: triggerId
                    }
                };
                
                loadMapData(projectToLoad);
            }
        } else if (action === 'objectDamage') {
            const { index, damage } = payload;
            const objId = objectMapData[index];
            if (objId) {
                const def = registryItems.find(r => r.id === objId);
                if (def && def.isDestructible) {
                    const currentMeta = objectMetadata[index] || {};
                    const maxH = def.maxHealth || 100;
                    const newHealth = Math.max(0, (currentMeta.health !== undefined ? currentMeta.health : maxH) - damage);
                    const metaPatch = { health: newHealth };
                    if (shouldTriggerBreakEffect(def, newHealth) && !currentMeta.breakFxPlayed) {
                        metaPatch.breakFxPlayed = true;
                        const cfg = getBreakEffectParams(def);
                        if (cfg) {
                            const x = (index % mapWidth) * TILE_SIZE + TILE_SIZE / 2;
                            const y = Math.floor(index / mapWidth) * TILE_SIZE + TILE_SIZE / 2;
                            window.dispatchEvent(new CustomEvent('game-break-effect', {
                                detail: { x, y, config: cfg }
                            }));
                        }
                    }
                    dispatch(updateObjectMetadata({ index, metadata: metaPatch }));

                    if (shouldRemoveCrackBlock(def, newHealth)) {
                        dispatch(removeTileAtIndex(index));
                    }

                    const x = (index % mapWidth) * TILE_SIZE + TILE_SIZE / 2;
                    const y = Math.floor(index / mapWidth) * TILE_SIZE;
                    window.dispatchEvent(new CustomEvent('game-floating-text', {
                        detail: { x, y, text: `-${damage}`, color: '#ff3b3b', amount: damage }
                    }));
                }
            }
        } else if (action === 'entityDamage' && payload) {
            const { x, y, amount } = payload;
            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(amount)) {
                window.dispatchEvent(new CustomEvent('game-floating-text', {
                    detail: { x, y, text: `-${Math.round(amount)}`, color: '#ff3b3b', amount }
                }));
            }
        } else if (action === 'shiftTile' && payload) {
            const { index, dx, dy } = payload;
            const mapIdAtStart = activeMapIdRef.current;
            applyWolfSecretShift({
                index,
                dx,
                dy,
                mapWidth,
                mapHeight,
                getObjectId: idx => objectMapData[idx],
                getObjectDef: objId => registryItems.find(r => r.id === objId),
                moveTile: (from, to) => dispatch(moveTileInMap({ fromIndex: from, toIndex: to })),
                moveObject: (from, to) => dispatch(moveObjectInMap({ fromIndex: from, toIndex: to })),
                removeObject: idx => dispatch(removeObjectAtIndex(idx)),
                shouldCancel: () => isGameOverRef.current || activeMapIdRef.current !== mapIdAtStart
            });
        } else if (action === 'playerDamage' && payload !== undefined) {
            const { damage, x, y } = payload || {};
            const ps = playerStateRef.current;
            const px = Number.isFinite(x) ? x : (ps?.x || 0) + (ps?.width || TILE_SIZE) / 2;
            const py = Number.isFinite(y) ? y : (ps?.y || 0);
            if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(damage)) {
                window.dispatchEvent(new CustomEvent('game-floating-text', {
                    detail: { x: px, y: py, text: `-${Math.round(damage)}`, color: '#ff3b3b', amount: damage }
                }));
            }
        } else if (action === 'floatingText' && payload) {
            const { x, y, text, color, amount } = payload;
            if (Number.isFinite(x) && Number.isFinite(y) && text) {
                window.dispatchEvent(new CustomEvent('game-floating-text', {
                    detail: { x, y, text, color, amount }
                }));
            }
        } else if (action === 'levelWin') {
            console.log("Level Win! Returning to map selection.");
            setTimeout(() => {
                alert("Level Complete!");
                dispatch(setMapModalOpen(true));
            }, 500);
        } else if (action === 'updateWeather' && payload) {
            const { type, value } = payload;
            const settingKey = 'weather' + type.charAt(0).toUpperCase() + type.slice(1); // e.g., weatherRain
            setRuntimeSettings(prev => ({ ...prev, [settingKey]: value }));
            
            // Dispatch event so UI components like GameSettings can update their state
            window.dispatchEvent(new CustomEvent('game-settings-update', { 
                detail: { [settingKey]: value } 
            }));
        } else if (action === 'weatherEffectHit' && payload) {
            const { type, data } = payload;
            // Šo darbību mēs izmantosim, lai nodotu informāciju dzinējam caur ref vai eventu
            // Bet labāk ir tieši izsaukt dzinēja funkciju, ja tāda ir.
            // Tā kā useGameEngine ir hook, mēs nevaram viegli izsaukt tā iekšējo funkciju.
            // Tomēr mēs varam izmantot window eventu vai ref.
            window.dispatchEvent(new CustomEvent('weather-effect-hit', { detail: { type, data } }));
        } else if (action === 'showMessage' && payload) {
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
    }, [dispatch, objectMapData, objectMetadata, registryItems]);

    // We no longer need 'engineMapData' with layers, as we pass objectMapData separately.
    // So we pass the original 'activeMapData' as first argument (for initialization to work correctly and not reset),
    // and 'objectMapData' as third argument for item checking.

    // Callback for revealing secret zones
    const handleRevealSecret = (indices) => {
        dispatch(revealSecretZone(indices));
    };

    // --- START ENGINE ---
    // Engine returns player coordinates and state
    // objectMapData contains dynamic data (removed items)
    const playerState = useGameEngine(
        activeMapData,
        tileMapData,
        objectMapData,
        secretMapData,
        revealedSecrets,
        registryItems,
        handleGameOver,
        handleStateUpdate,
        handleRevealSecret,
        objectMetadata,
        activeRoomIds,
        mapWidth,
        mapHeight
    );
    useEffect(() => {
        playerStateRef.current = playerState;
    }, [playerState]);

    // Iegūstam spēlētāja vizuālo izskatu (Texture)
    const playerVisuals = useMemo(() => {
        // Šeit varētu būt loģika, kas maina tekstūru atkarībā no playerState.direction vai playerState.vx
        // Pagaidām paņemam noklusēto
        return findItemById("player_default_100") || findItemById("player");
    }, []);
    // --- END ENGINE ---

    // Listen for runtime settings updates from GameSettings (live apply)
    useEffect(() => {
        const onSettingsUpdate = (e) => {
            const patch = (e && e.detail) || {};
            setRuntimeSettings(prev => ({ ...prev, ...patch }));
        };
        window.addEventListener('game-settings-update', onSettingsUpdate);
        return () => window.removeEventListener('game-settings-update', onSettingsUpdate);
    }, []);

    // Listen for navigation buttons
    useEffect(() => {
        const handleOpenModalEvent = () => {
            dispatch(setMapModalOpen(true));
            dispatch(setGameOver(false)); // Reset game over when opening new game modal
        };
        window.addEventListener('open-new-game-modal', handleOpenModalEvent);
        return () => window.removeEventListener('open-new-game-modal', handleOpenModalEvent);
    }, [dispatch]);

    // Mirror current effective runtime settings for other components to read (like GameSettings)
    useEffect(() => {
        try {
            const clouds = (runtimeSettings.weatherClouds ?? 0);
            const fog = (runtimeSettings.weatherFog ?? 0);
            const thunder = (runtimeSettings.weatherThunder ?? 0);
            window.__GAME_RUNTIME_SETTINGS__ = {
                ...(window.__GAME_RUNTIME_SETTINGS__ || {}),
                backgroundParallaxFactor: (runtimeSettings.backgroundParallaxFactor ?? activeMapData?.meta?.backgroundParallaxFactor ?? 0.3),
                weatherRain: (runtimeSettings.weatherRain ?? 0),
                weatherSnow: (runtimeSettings.weatherSnow ?? 0),
                weatherLavaRain: (runtimeSettings.weatherLavaRain ?? 0),
                weatherRadioactiveFog: (runtimeSettings.weatherRadioactiveFog ?? 0),
                weatherMeteorRain: (runtimeSettings.weatherMeteorRain ?? 0),
                weatherClouds: clouds,
                weatherFog: fog,
                weatherThunder: thunder,
                healthBarEnabled: (runtimeSettings.healthBarEnabled ?? true),
                oxygenBarEnabled: (runtimeSettings.oxygenBarEnabled ?? true),
                lavaBarEnabled: (runtimeSettings.lavaBarEnabled ?? true),
                waterSplashesEnabled: (runtimeSettings.waterSplashesEnabled ?? true),
                lavaEmbersEnabled: (runtimeSettings.lavaEmbersEnabled ?? true),
                roomBlurEnabled: (runtimeSettings.roomBlurEnabled ?? true),
                debugOverlayEnabled: (runtimeSettings.debugOverlayEnabled ?? false),
                // legacy mirror for compatibility (e.g., older UI)
                weatherFogLegacy: fog,
            };
        } catch {}
    }, [runtimeSettings, activeMapData]);

    const cloneMapData = (data) => {
        if (!data) return data;
        try {
            if (typeof structuredClone === 'function') {
                return structuredClone(data);
            }
        } catch {}
        try {
            return JSON.parse(JSON.stringify(data));
        } catch {
            return data;
        }
    };

    const loadMapData = (mapData) => {
        try {
            if (!mapData) {
                errorHandler.warn('loadMapData called with empty mapData', { component: 'Game' });
                return;
            }

            const sourceMapData = cloneMapData(mapData);
            let effectiveMapData = sourceMapData;
            
            // Atbalsts Version 2.0 (Multi-map project)
            if (sourceMapData.meta?.version === "2.0" && sourceMapData.maps) {
                const activeId = sourceMapData.meta.activeMapId || Object.keys(sourceMapData.maps)[0];
                const activeMap = sourceMapData.maps[activeId];
                
                if (activeMap) {
                    const activeLayers = activeMap.layers || [];
                    const bgLayer = activeLayers.find(l => l.name === 'background' || l.type === 'tile');
                    const objLayer = activeLayers.find(l => l.name === 'entities' || l.type === 'object');
                    const secretLayer = activeLayers.find(l => l.name === 'secrets' || l.type === 'secret');
                    const mapTileData = activeMap.tileMapData || bgLayer?.data;
                    const mapObjectData = activeMap.objectMapData || objLayer?.data;
                    const mapSecretData = activeMap.secretMapData || secretLayer?.data;

                    // Konvertējam uz formātu, ko saprot dzinējs un setActiveMap
                    effectiveMapData = {
                        ...sourceMapData, // Saglabājam visu projektu
                        meta: {
                            ...sourceMapData.meta,
                            width: activeMap.width,
                            height: activeMap.height,
                            name: activeMap.name,
                            backgroundImage: activeMap.backgroundImage,
                            backgroundColor: activeMap.backgroundColor,
                            backgroundMusic: activeMap.backgroundMusic,
                            backgroundParallaxFactor: activeMap.backgroundParallaxFactor,
                            weather: activeMap.weather,
                            objectMetadata: activeMap.objectMetadata || {},
                            playerPosition: activeMap.playerPosition
                        },
                        layers: [
                            { name: 'background', data: mapTileData || Array((activeMap.width || 0) * (activeMap.height || 0)).fill(null) },
                            { name: 'entities', data: mapObjectData || Array((activeMap.width || 0) * (activeMap.height || 0)).fill(null) },
                            { name: 'secrets', data: mapSecretData || Array((activeMap.width || 0) * (activeMap.height || 0)).fill(null) }
                        ]
                    };
                }
            }

            const nowIso = new Date().toISOString();
            if (!effectiveMapData.meta) effectiveMapData.meta = {};
            effectiveMapData.meta.date_map_last_updated = nowIso;

            const w = effectiveMapData.meta?.width || effectiveMapData.width || 20;
            const h = effectiveMapData.meta?.height || effectiveMapData.height || 15;

            let tileData = [];
            let objData = [];
            let secretData = [];

            if (effectiveMapData.layers) {
                const bgLayer = effectiveMapData.layers.find(l => l.name === 'background' || l.type === 'tile');
                tileData = bgLayer ? bgLayer.data : Array(w * h).fill(null);

                const objLayer = effectiveMapData.layers.find(l => l.name === 'entities' || l.type === 'object');
                objData = objLayer ? objLayer.data : Array(w * h).fill(null);

                const secretLayer = effectiveMapData.layers.find(l => l.name === 'secrets' || l.type === 'secret');
                secretData = secretLayer ? secretLayer.data : Array(w * h).fill(null);
            } else {
                tileData = effectiveMapData.tiles || Array(w * h).fill(null);
                objData = Array(w * h).fill(null);
                secretData = Array(w * h).fill(null);
            }

            // Update Redux store
            dispatch(setActiveMap({
                mapData: effectiveMapData,
                tileMapData: tileData,
                objectMapData: objData,
                secretMapData: secretData,
                mapWidth: w,
                mapHeight: h
            }));
            dispatch(setCameraScrollX(0));
            dispatch(setMapModalOpen(false));
            dispatch(setGameOver(false)); // Ensure game over is reset on map load

            errorHandler.info('Map loaded successfully', {
                component: 'Game',
                mapName: effectiveMapData.meta?.name || 'Unknown',
                dimensions: `${w}x${h}`
            });
        } catch (error) {
            errorHandler.error(error, {
                component: 'Game',
                function: 'loadMapData',
                mapData
            });
            alert('Error loading map. Check console for details.');
        }
    };

    const handleCustomMapUpload = (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const fileReader = new FileReader();
            fileReader.readAsText(file, "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const loaded = JSON.parse(e.target.result);
                    loadMapData(loaded);
                } catch (error) {
                    errorHandler.error(error, {
                        component: 'Game',
                        function: 'handleCustomMapUpload',
                        fileName: file.name
                    });
                    alert("Invalid map file! Check console for details.");
                }
            };
            fileReader.onerror = (error) => {
                errorHandler.error(error, {
                    component: 'Game',
                    function: 'handleCustomMapUpload',
                    fileName: file.name,
                    phase: 'fileReader'
                });
                alert("Error reading file!");
            };
        } catch (error) {
            errorHandler.error(error, {
                component: 'Game',
                function: 'handleCustomMapUpload'
            });
        }
    };

    const debugOverlayEnabled = !!(runtimeSettings.debugOverlayEnabled);
    const debugMapId = activeMapData?.meta?.activeMapId || activeMapData?.meta?.activeMap || 'main';

    return (
        <GameContainer onClick={() => {
            window.dispatchEvent(new CustomEvent('game-sound-user-gesture'));
        }}>
        
            {/* Game Header */}
            {/* UI Overlays */}
            {playerState?.isWinning && (
                <WinCounterOverlay>
                    {Math.floor(playerState.winCounter || 0)}
                </WinCounterOverlay>
            )}

            <MessageOverlay text={gameMessage.text} isVisible={gameMessage.isVisible} />

            <GameHeader 
                health={playerState.health} 
                maxHealth={playerState.maxHealth}
                ammo={playerState.ammo || 0} 
                oxygen={playerState.oxygen}
                maxOxygen={playerState.maxOxygen}
                lavaResist={playerState.lavaResist}
                maxLavaResist={playerState.maxLavaResist}
                iceResist={playerState.iceResist}
                maxIceResist={playerState.maxIceResist}
                strength={playerState.strength}
                maxStrength={playerState.maxStrength}
                radioactivity={playerState.radioactivity}
                maxRadioactivity={playerState.maxRadioactivity}
                inWater={playerState.inWater}
                liquidType={playerState.liquidType}
                onIce={playerState.onIce}
            />

            {debugOverlayEnabled && (
                <div style={{
                    position: 'absolute',
                    top: 70,
                    left: 70,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#eaeaea',
                    padding: '8px 10px',
                    fontSize: 11,
                    lineHeight: 1.4,
                    borderRadius: 4,
                    zIndex: 2100,
                    pointerEvents: 'none',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }}>
                    <div>Map: {debugMapId}</div>
                    <div>Pos: {Math.round(playerState.x || 0)}, {Math.round(playerState.y || 0)}</div>
                    <div>Room: {Array.isArray(activeRoomIds) && activeRoomIds.length ? activeRoomIds.join(', ') : 'none'}</div>
                    <div>Weather: rain {runtimeSettings.weatherRain ?? 0} | snow {runtimeSettings.weatherSnow ?? 0} | fog {runtimeSettings.weatherFog ?? 0}</div>
                    <div>Weather: lava {runtimeSettings.weatherLavaRain ?? 0} | radio {runtimeSettings.weatherRadioactiveFog ?? 0}</div>
                    <div>HP {Math.round(playerState.health || 0)} / {Math.round(playerState.maxHealth || 0)}</div>
                    <div>O2 {Math.round(playerState.oxygen || 0)} | Lava {Math.round(playerState.lavaResist || 0)} | Rad {Math.round(playerState.radioactivity || 0)}</div>
                </div>
            )}


            {isGameOver && (
                <GameOverOverlay>
                    <GameOverTitle>Game Over</GameOverTitle>
                    <ReplayButton onClick={handleReplay}>
                        REPLAY ↻
                    </ReplayButton>
                </GameOverOverlay>
            )}

            {isMapModalOpen && (
                <ModalOverlay>
                    <ModalContent>
                        <ModalTitle>{t('GAME_MAP_SELECT_TITLE')}</ModalTitle>
                        <MapList>
                            {BUILT_IN_MAPS.map((map, index) => {
                                const isV2 = map.meta?.version === "2.0";
                                const projectName = map.meta?.projectName || map.meta?.name || "Unnamed Map";
                                const author = map.meta?.author || "Unknown";
                                
                                let sizeInfo = "";
                                let subMapInfo = "";

                                if (isV2 && map.maps) {
                                    const mainMap = map.maps[map.meta?.activeMapId || 'main'] || Object.values(map.maps)[0];
                                    if (mainMap) {
                                        sizeInfo = `${mainMap.width}x${mainMap.height}`;
                                    }
                                    
                                    const mapValues = Object.values(map.maps);
                                    const overworldCount = mapValues.filter(m => m.type === 'overworld').length;
                                    const underworldCount = mapValues.filter(m => m.type === 'underworld').length;
                                    
                                    subMapInfo = ` (O:${overworldCount}, U:${underworldCount})`;
                                } else {
                                    sizeInfo = `${map.meta?.width || map.width || 0}x${map.meta?.height || map.height || 0}`;
                                }

                                return (
                                    <MapCard key={index} onClick={() => loadMapData(map)}>
                                        <div>
                                            <MapTitle>{projectName}</MapTitle>
                                            <MapAuthor>{t('GAME_MAP_BY', { author })}</MapAuthor>
                                        </div>
                                        {map.meta?.description && (
                                            <MapDescription title={map.meta.description}>
                                                {map.meta.description}
                                            </MapDescription>
                                        )}
                                        <MapInfo>
                                            <div>{t('GAME_MAP_SIZE', { size: `${sizeInfo}${subMapInfo}` })}</div>
                                        </MapInfo>
                                    </MapCard>
                                );
                            })}
                        </MapList>
                        <ModalDivider>
                            <FileUploadLabel>
                                📂 {t('GAME_MAP_LOAD_CUSTOM')}
                                <HiddenFileInput type="file" accept=".json" onChange={handleCustomMapUpload} />
                            </FileUploadLabel>
                        </ModalDivider>
                    </ModalContent>
                </ModalOverlay>
            )}

            <Viewport
                ref={viewportRef}
                $blurred={isMapModalOpen}
            >
                {activeMapData ? (
                    <GameCanvas>
                    
                        {/* PIXI RENDERER */}
                        <PixiStage
                            mapWidth={mapWidth}
                            mapHeight={mapHeight}
                            tileSize={32}
                            tileMapData={tileMapData}
                            objectMapData={objectMapData}
                            secretMapData={secretMapData}
                            revealedSecrets={revealedSecrets}
                            objectTextureIndices={objectTextureIndices}
                            registryItems={registryItems}
                            playerState={playerState}
                            playerVisuals={playerVisuals}
                            projectiles={playerState.projectiles || []}
                            objectMetadata={objectMetadata}
                            backgroundImage={activeMapData?.meta?.backgroundImage}
                            backgroundColor={activeMapData?.meta?.backgroundColor}
                            backgroundParallaxFactor={(runtimeSettings.backgroundParallaxFactor ?? activeMapData?.meta?.backgroundParallaxFactor)}
                            cameraScrollX={cameraScrollX}
                            weatherRain={runtimeSettings.weatherRain ?? 0}
                            weatherLavaRain={runtimeSettings.weatherLavaRain ?? 0}
                            weatherSnow={runtimeSettings.weatherSnow ?? 0}
                            weatherMeteorRain={runtimeSettings.weatherMeteorRain ?? 0}
                            weatherClouds={runtimeSettings.weatherClouds ?? 0}
                            weatherFog={runtimeSettings.weatherFog ?? 0}
                            weatherRadioactiveFog={runtimeSettings.weatherRadioactiveFog ?? 0}
                            weatherThunder={runtimeSettings.weatherThunder ?? 0}
                            onWeatherEffectHit={(type, data) => handleStateUpdate('weatherEffectHit', { type, data })}
                            healthBarEnabled={runtimeSettings.healthBarEnabled ?? true}
                            oxygenBarEnabled={runtimeSettings.oxygenBarEnabled ?? true}
                            lavaBarEnabled={runtimeSettings.lavaBarEnabled ?? true}
                            waterSplashesEnabled={runtimeSettings.waterSplashesEnabled ?? true}
                            lavaEmbersEnabled={runtimeSettings.lavaEmbersEnabled ?? true}
                            roomBlurEnabled={runtimeSettings.roomBlurEnabled ?? true}
                            debugOverlayEnabled={runtimeSettings.debugOverlayEnabled ?? false}
                            isEditor={false}
                            mapType={activeMapData?.type || 'overworld'}
                            activeRoomIds={activeRoomIds}
                            maps={projectMaps}
                        />

                    </GameCanvas>
                ) : (
                    <PlaceholderMessage>Select a map to start playing</PlaceholderMessage>
                )}
            </Viewport>

            {/* Background music runtime player */}
            <BackgroundMusicPlayer 
                metaPath={activeMapData?.meta?.backgroundMusic} 
                enabled={soundEnabled} 
                volume={0.6} 
                isInsideRoom={activeRoomIds.length > 0}
            />

            {/* Overlays at root level so they sit above the canvas and slide from the footer area */}
            <GameSettings />
            <GameTerminal />
        </GameContainer>
    );
}

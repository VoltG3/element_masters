import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRegistry, findItemById } from '../../../engine/registry';
import PixiStage from './PixiStage';
import { useGameEngine } from '../../../utilities/useGameEngine';
import GameHeader from './GameHeader';
import GameTerminal from './GameTerminal';
import GameSettings from './GameSettings';
import BackgroundMusicPlayer from '../../../utilities/BackgroundMusicPlayer';
import { setActiveMap, removeObjectAtIndex, updateObjectAtIndex, updateObjectMetadata, setObjectTextureIndex, revealSecretZone, resetGame } from '../../../store/slices/gameSlice';
import { setMapModalOpen, setCameraScrollX, setShouldCenterMap } from '../../../store/slices/uiSlice';
import { setSoundEnabled } from '../../../store/slices/settingsSlice';
import errorHandler from '../../../services/errorHandler';
import styled from 'styled-components';

// Import maps (static files usually need to be imported or fetched in React/Webpack)
import map1 from '../../../assets/maps/Temp_01.json';
import map2 from '../../../assets/maps/Temp_02.json';

// Simulate file list from folder
const BUILT_IN_MAPS = [map1, map2];

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
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    width: 500px;
    max-height: 80%;
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
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const MapCard = styled.div`
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 10px;
    cursor: pointer;
    background-color: #f9f9f9;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
        background-color: #e8e8e8;
    }
`;

const MapTitle = styled.div`
    font-weight: bold;
    font-size: 16px;
`;

const MapAuthor = styled.div`
    font-size: 12px;
    color: #666;
`;

const MapInfo = styled.div`
    text-align: right;
    font-size: 11px;
    color: #555;
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
    const dispatch = useDispatch();
    const viewportRef = useRef(null);

    // Redux state
    const { activeMapData, tileMapData, objectMapData, secretMapData, objectMetadata, revealedSecrets, objectTextureIndices, mapWidth, mapHeight } = useSelector(state => state.game);
    const { isMapModalOpen, cameraScrollX, shouldCenterMap } = useSelector(state => state.ui);
    const { sound } = useSelector(state => state.settings);
    const soundEnabled = sound.enabled;

    // Runtime settings that can be changed from GameSettings on the fly
    const [runtimeSettings, setRuntimeSettings] = useState({});

    // Registry
    const registryItems = getRegistry() || [];

    const handleGameOver = () => {
        // Reload current map using Redux
        if (activeMapData) {
            console.log("Game Over! Reloading map...");
            // Pievienojam timestamp, lai dzinējs zinātu, ka šis ir restarts/jauna ielāde
            const mapToLoad = {
                ...activeMapData,
                meta: {
                    ...activeMapData.meta,
                    date_map_last_updated: new Date().toISOString()
                }
            };
            loadMapData(mapToLoad);
        }
    };

    const handleStateUpdate = useCallback((action, payload) => {
        if (action === 'collectItem') {
            const indexToRemove = payload;
            dispatch(removeObjectAtIndex(indexToRemove));
        } else if (action === 'interactable') {
            const index = payload;
            // Switch interactable to "used" variant by changing ID
            // e.g., berry_bush_01 -> berry_bush_01_used
            const currentId = objectMapData[index];
            if (currentId) {
                dispatch(updateObjectAtIndex({ index, newId: currentId + '_used' }));
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
                    dispatch(updateObjectMetadata({ index, metadata: { health: newHealth } }));
                }
            }
        } else if (action === 'playerDamage' && payload !== undefined) {
            // Šeit mēs nevaram viegli atjaunināt Redux katrā kadrā,
            // bet varam atskaņot trāpījuma skaņu
            console.log("Player hit by entity!");
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
        objectMetadata
    );

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
        const handleOpenModalEvent = () => dispatch(setMapModalOpen(true));
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
                weatherClouds: clouds,
                weatherFog: fog,
                weatherThunder: thunder,
                healthBarEnabled: (runtimeSettings.healthBarEnabled ?? true),
                oxygenBarEnabled: (runtimeSettings.oxygenBarEnabled ?? true),
                lavaBarEnabled: (runtimeSettings.lavaBarEnabled ?? true),
                waterSplashesEnabled: (runtimeSettings.waterSplashesEnabled ?? true),
                lavaEmbersEnabled: (runtimeSettings.lavaEmbersEnabled ?? true),
                // legacy mirror for compatibility (e.g., older UI)
                weatherFogLegacy: fog,
            };
        } catch {}
    }, [runtimeSettings, activeMapData]);

    const loadMapData = (mapData) => {
        try {
            if (!mapData) {
                errorHandler.warn('loadMapData called with empty mapData', { component: 'Game' });
                return;
            }

            const w = mapData.meta?.width || mapData.width || 20;
            const h = mapData.meta?.height || mapData.height || 15;

            let tileData = [];
            let objData = [];
            let secretData = [];

            if (mapData.layers) {
                const bgLayer = mapData.layers.find(l => l.name === 'background');
                tileData = bgLayer ? bgLayer.data : Array(w * h).fill(null);

                const objLayer = mapData.layers.find(l => l.name === 'entities');
                objData = objLayer ? objLayer.data : Array(w * h).fill(null);

                const secretLayer = mapData.layers.find(l => l.name === 'secrets');
                secretData = secretLayer ? secretLayer.data : Array(w * h).fill(null);
            } else {
                tileData = mapData.tiles || Array(w * h).fill(null);
                objData = Array(w * h).fill(null);
                secretData = Array(w * h).fill(null);
            }

            // Debug logging
            console.log('[DEBUG] Loading map with secrets:', {
                hasSecretsLayer: !!mapData.layers?.find(l => l.name === 'secrets'),
                secretDataLength: secretData?.length,
                secretDataNonNull: secretData?.filter(s => s !== null).length,
                secretDataSample: secretData?.filter(s => s !== null).slice(0, 5)
            });

            // Update Redux store
            dispatch(setActiveMap({
                mapData,
                tileMapData: tileData,
                objectMapData: objData,
                secretMapData: secretData,
                mapWidth: w,
                mapHeight: h
            }));
            dispatch(setCameraScrollX(0));
            dispatch(setMapModalOpen(false));

            errorHandler.info('Map loaded successfully', {
                component: 'Game',
                mapName: mapData.meta?.name || 'Unknown',
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

    return (
        <GameContainer>
        
            {/* Game Header */}
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
                inWater={playerState.inWater}
                liquidType={playerState.liquidType}
                onIce={playerState.onIce}
            />


            {isMapModalOpen && (
                <ModalOverlay>
                    <ModalContent>
                        <ModalTitle>Select a Map</ModalTitle>
                        <MapList>
                            {BUILT_IN_MAPS.map((map, index) => (
                                <MapCard key={index} onClick={() => loadMapData(map)}>
                                    <div>
                                        <MapTitle>{map.meta?.name || "Unnamed Map"}</MapTitle>
                                        <MapAuthor>By: {map.meta?.author || "Unknown"}</MapAuthor>
                                    </div>
                                    <MapInfo>
                                        <div>Size: {map.meta?.width}x{map.meta?.height}</div>
                                    </MapInfo>
                                </MapCard>
                            ))}
                        </MapList>
                        <ModalDivider>
                            <FileUploadLabel>
                                📂 Load Custom Map from Computer
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
                            weatherSnow={runtimeSettings.weatherSnow ?? 0}
                            weatherClouds={runtimeSettings.weatherClouds ?? 0}
                            weatherFog={runtimeSettings.weatherFog ?? 0}
                            weatherThunder={runtimeSettings.weatherThunder ?? 0}
                            healthBarEnabled={runtimeSettings.healthBarEnabled ?? true}
                            oxygenBarEnabled={runtimeSettings.oxygenBarEnabled ?? true}
                            lavaBarEnabled={runtimeSettings.lavaBarEnabled ?? true}
                            waterSplashesEnabled={runtimeSettings.waterSplashesEnabled ?? true}
                            lavaEmbersEnabled={runtimeSettings.lavaEmbersEnabled ?? true}
                        />

                    </GameCanvas>
                ) : (
                    <PlaceholderMessage>Select a map to start playing</PlaceholderMessage>
                )}
            </Viewport>

            {/* Background music runtime player */}
            <BackgroundMusicPlayer metaPath={activeMapData?.meta?.backgroundMusic} enabled={soundEnabled} volume={0.6} />

            {/* Overlays at root level so they sit above the canvas and slide from the footer area */}
            <GameSettings />
            <GameTerminal />
        </GameContainer>
    );
}

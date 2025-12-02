import React, { useState, useEffect, useMemo, useRef } from 'react';
import GameRegistry, { findItemById } from '../../GameRegistry'; // Pievienojam findItemById
import PixiStage from './PixiStage';
import { useGameEngine } from '../../utilites/useGameEngine'; // Importējam dzinēju
import GameHeader from './gameHeader'; // JAUNS
import GameTerminal from './GameTerminal';
import GameSettings from './GameSettings';
import BackgroundMusicPlayer from '../../utilites/BackgroundMusicPlayer';

// Importējam kartes (React/Webpack vidē statiskie faili parasti jāimportē vai jāielādē caur fetch)
import map1 from '../../assets/maps/Temp_01.json';
import map2 from '../../assets/maps/Temp_02.json';
import map3 from '../../assets/maps/Temp_03.json';
import map4 from '../../assets/maps/Temp_04.json';
import map5 from '../../assets/maps/Temp_05.json';
import map6 from '../../assets/maps/Temp_06.json';

// Simulējam failu sarakstu no mapes
const BUILT_IN_MAPS = [map1, map2, map3, map4, map5, map6];

export default function Game() {
    const viewportRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [activeMapData, setActiveMapData] = useState(null);
    const [cameraScrollX, setCameraScrollX] = useState(0);
    // Runtime settings that can be changed from GameSettings on the fly
    const [runtimeSettings, setRuntimeSettings] = useState({});
    // Global sound toggle (persisted)
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            const v = localStorage.getItem('game_sound_enabled');
            return v === null ? false : v !== '0';
        } catch { return false; }
    });

    // Spēles dati no kartes
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    // Center small maps that don't require scrolling
    const [shouldCenter, setShouldCenter] = useState(false);
    const [tileMapData, setTileMapData] = useState([]);
    // JAUNS: Saglabājam arī objektu slāņa datus
    const [objectMapData, setObjectMapData] = useState([]);

    // Reģistrs
    const registryItems = Array.isArray(GameRegistry) ? GameRegistry : [];

    const handleGameOver = () => {
        // Pārlādējam esošo karti
        if (activeMapData) {
            console.log("Game Over! Reloading map...");
            // Lai React saprastu izmaiņas un tiešām pārlādētu,
            // mēs varam īslaicīgi notīrīt un tad uzstādīt atpakaļ, 
            // vai vienkārši izsaukt loadMapData vēlreiz (ja tas resetos state).
            // Bet tā kā loadMapData iestata state, tas var būt pietiekami, 
            // ja vien mapData objekts nav tieši tas pats references ziņā (ko React varētu ignorēt).
            // Drošāk ir nokopēt objektu.
            loadMapData({...activeMapData});
        }
    };

    // JAUNS: Funkcija itemu noņemšanai
    const handleStateUpdate = (action, payload) => {
        if (action === 'collectItem') {
            const indexToRemove = payload;
            setObjectMapData(prevData => {
                const newData = [...prevData];
                newData[indexToRemove] = null; // Izņemam itemu no kartes
                return newData;
            });
        }
    };

    // Mums vairs nevajag 'engineMapData' ar layers, jo mēs padodam objectMapData atsevišķi.
    // Tāpēc mēs padodam oriģinālo 'activeMapData' kā pirmo argumentu (lai inicializācija strādātu korekti un neresetotos),
    // un 'objectMapData' kā trešo argumentu priekš itemu pārbaudes.
    
    // --- START ENGINE ---
    // Dzinējs atgriež spēlētāja koordinātas un stāvokli
    // objectMapData satur dinamiskos datus (izņemtos itemus)
    const playerState = useGameEngine(activeMapData, tileMapData, objectMapData, registryItems, handleGameOver, handleStateUpdate);

    // Iegūstam spēlētāja vizuālo izskatu (Texture)
    const playerVisuals = useMemo(() => {
        // Šeit varētu būt loģika, kas maina tekstūru atkarībā no playerState.direction vai playerState.vx
        // Pagaidām paņemam noklusēto
        return findItemById("player_default_100") || findItemById("player");
    }, []);
    // --- END ENGINE ---

    // Determine if the map fits entirely in the viewport; if so, center it
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const recalc = () => {
            const vw = vp.clientWidth || 0;
            const vh = vp.clientHeight || 0;
            const cw = mapWidth * 32;
            const ch = mapHeight * 32;
            const fits = cw <= vw && ch <= vh;
            setShouldCenter(fits);
            if (fits) {
                // Ensure no residual scroll when centered
                if ((vp.scrollLeft || vp.scrollTop)) {
                    vp.scrollTo({ left: 0, top: 0, behavior: 'auto' });
                }
            }
        };
        recalc();
        window.addEventListener('resize', recalc);
        return () => window.removeEventListener('resize', recalc);
    }, [mapWidth, mapHeight, isModalOpen]);

    // Camera follow with horizontal dead-zone on large maps (disabled when map is centered)
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp || !activeMapData || isModalOpen || shouldCenter) return;

        const vw = vp.clientWidth || 0;
        const contentWidth = mapWidth * 32;
        const maxScrollLeft = Math.max(0, contentWidth - vw);

        const px = Number(playerState?.x) || 0;
        const pw = Number(playerState?.width) || 32;
        const playerCenter = px + pw / 2;

        const currentLeft = vp.scrollLeft || 0;
        const deadLeft = currentLeft + vw * 0.3;
        const deadRight = currentLeft + vw * 0.7;

        let targetLeft = currentLeft;
        if (playerCenter > deadRight) {
            targetLeft = playerCenter - vw * 0.7;
        } else if (playerCenter < deadLeft) {
            targetLeft = playerCenter - vw * 0.3;
        }
        targetLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));

        if (Math.abs(targetLeft - currentLeft) > 0.5) {
            vp.scrollTo({ left: targetLeft, top: 0, behavior: 'auto' });
        }
    }, [playerState, activeMapData, isModalOpen, mapWidth, shouldCenter]);

    // Listen for runtime settings updates from GameSettings (live apply)
    useEffect(() => {
        const onSettingsUpdate = (e) => {
            const patch = (e && e.detail) || {};
            setRuntimeSettings(prev => ({ ...prev, ...patch }));
        };
        window.addEventListener('game-settings-update', onSettingsUpdate);
        return () => window.removeEventListener('game-settings-update', onSettingsUpdate);
    }, []);

    // JAUNS: Klausāmies navigācijas pogas
    useEffect(() => {
        const handleOpenModalEvent = () => setIsModalOpen(true);
        window.addEventListener('open-new-game-modal', handleOpenModalEvent);
        return () => window.removeEventListener('open-new-game-modal', handleOpenModalEvent);
    }, []);

    // Mirror current effective runtime settings for other components to read (like GameSettings)
    useEffect(() => {
        try {
            window.__GAME_RUNTIME_SETTINGS__ = {
                ...(window.__GAME_RUNTIME_SETTINGS__ || {}),
                backgroundParallaxFactor: (runtimeSettings.backgroundParallaxFactor ?? activeMapData?.meta?.backgroundParallaxFactor ?? 0.3),
                weatherRain: (runtimeSettings.weatherRain ?? 0),
                weatherSnow: (runtimeSettings.weatherSnow ?? 0),
                weatherFog: (runtimeSettings.weatherFog ?? 0),
            };
        } catch {}
    }, [runtimeSettings, activeMapData]);

    const loadMapData = (mapData) => {
        if (!mapData) return;

        // Reset camera scroll when loading a new map
        setCameraScrollX(0);

        const w = mapData.meta?.width || mapData.width || 20;
        const h = mapData.meta?.height || mapData.height || 15;
        setMapWidth(w);
        setMapHeight(h);

        if (mapData.layers) {
            const bgLayer = mapData.layers.find(l => l.name === 'background');
            setTileMapData(bgLayer ? bgLayer.data : Array(w * h).fill(null));
        
            // JAUNS: Ielādējam entities slāni priekš items
            const objLayer = mapData.layers.find(l => l.name === 'entities');
            setObjectMapData(objLayer ? objLayer.data : Array(w * h).fill(null));

            // Mēs vairs neizmantojam 'entities' slāni renderēšanai pa tiešo,
            // jo dzinējs izmanto to, lai atrastu starta pozīciju, bet pēc tam
            // spēlētājs tiek renderēts dinamiski.
        } else {
            setTileMapData(mapData.tiles || Array(w * h).fill(null));
            setObjectMapData(Array(w * h).fill(null));
        }

        setActiveMapData(mapData);
        setIsModalOpen(false);
    };

    const handleCustomMapUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileReader = new FileReader();
            fileReader.readAsText(file, "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const loaded = JSON.parse(e.target.result);
                    loadMapData(loaded);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Invalid map file!");
                }
            };
        }
    };

    // Stili (kā iepriekš)
    const modalOverlayStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' };
    const modalContentStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '500px', maxHeight: '80%', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '15px' };
    const mapCardStyle = { border: '1px solid #ddd', borderRadius: '6px', padding: '10px', cursor: 'pointer', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const buttonStyle = { padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'center', display: 'inline-block' };

    return (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', backgroundColor: '#333' }}>
        
            {/* JAUNS: Game Header */}
            <GameHeader health={playerState.health} soundEnabled={soundEnabled} onToggleSound={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                try { localStorage.setItem('game_sound_enabled', next ? '1' : '0'); } catch {}
                try { window.dispatchEvent(new CustomEvent('game-sound-toggle', { detail: { enabled: next } })); } catch {}
                // Also signal a user gesture to unblock autoplay on first enable
                try { window.dispatchEvent(new CustomEvent('game-sound-user-gesture')); } catch {}
            }} />

        
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ margin: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Select a Map</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {BUILT_IN_MAPS.map((map, index) => (
                                <div key={index} style={mapCardStyle} onClick={() => loadMapData(map)}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{map.meta?.name || "Unnamed Map"}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>By: {map.meta?.author || "Unknown"}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
                                        <div>Size: {map.meta?.width}x{map.meta?.height}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ borderTop: '2px solid #eee', paddingTop: '15px', marginTop: '10px' }}>
                            <label style={{ ...buttonStyle, backgroundColor: '#2196F3', width: '100%', boxSizing: 'border-box' }}>
                                📂 Load Custom Map from Computer
                                <input type="file" accept=".json" onChange={handleCustomMapUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <div ref={viewportRef} onScroll={(e) => setCameraScrollX(e.currentTarget.scrollLeft || 0)} style={{ 
                height: '100%',
                display: shouldCenter ? 'flex' : 'block',
                alignItems: shouldCenter ? 'center' : 'stretch',
                justifyContent: shouldCenter ? 'center' : 'flex-start',
                overflow: 'auto',
                filter: isModalOpen ? 'blur(5px)' : 'none', pointerEvents: isModalOpen ? 'none' : 'auto', transition: 'filter 0.3s ease'
            }}>
                {activeMapData ? (
                    <div style={{ 
                        position: 'relative', // Lai player varētu pozicionēt absolute pret šo konteineri
                        width: mapWidth * 32,
                        height: mapHeight * 32,
                        border: '5px solid #222', boxShadow: '0 0 20px rgba(0,0,0,0.5)', backgroundColor: '#111'
                    }}>
                    
                        {/* PIXI RENDERER */}
                        <PixiStage
                            mapWidth={mapWidth}
                            mapHeight={mapHeight}
                            tileSize={32}
                            tileMapData={tileMapData}
                            objectMapData={objectMapData}
                            registryItems={registryItems}
                            playerState={playerState}
                            playerVisuals={playerVisuals}
                            backgroundImage={activeMapData?.meta?.backgroundImage}
                            backgroundColor={activeMapData?.meta?.backgroundColor}
                            backgroundParallaxFactor={(runtimeSettings.backgroundParallaxFactor ?? activeMapData?.meta?.backgroundParallaxFactor)}
                            cameraScrollX={cameraScrollX}
                            weatherRain={runtimeSettings.weatherRain ?? 0}
                            weatherSnow={runtimeSettings.weatherSnow ?? 0}
                            weatherFog={runtimeSettings.weatherFog ?? 0}
                        />

                    </div>
                ) : (
                    <div style={{ color: '#777', fontSize: '24px' }}>Select a map to start playing</div>
                )}
            </div>
            {/* Background music runtime player */}
            <BackgroundMusicPlayer metaPath={activeMapData?.meta?.backgroundMusic} enabled={soundEnabled} volume={0.6} />

            {/* Overlays at root level so they sit above the canvas and slide from the footer area */}
            <GameSettings />
            <GameTerminal />
        </div>
    );
}

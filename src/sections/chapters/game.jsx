import React, { useState, useEffect, useMemo, useRef } from 'react';
import GameRegistry, { findItemById } from '../../GameRegistry'; // Pievienojam findItemById
import PixiStage from './PixiStage';
import { useGameEngine } from '../../utilites/useGameEngine'; // Importējam dzinēju
import GameHeader from './gameHeader'; // JAUNS

// Importējam kartes (React/Webpack vidē statiskie faili parasti jāimportē vai jāielādē caur fetch)
import map1 from '../../assets/maps/Temp_01.json';
import map2 from '../../assets/maps/Temp_02.json';
import map3 from '../../assets/maps/Temp_03.json';
import map4 from '../../assets/maps/Temp_04.json';

// Simulējam failu sarakstu no mapes
const BUILT_IN_MAPS = [map1, map2, map3, map4];

export default function Game() {
    const viewportRef = useRef(null);
    const hasAutoScrolledRef = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [activeMapData, setActiveMapData] = useState(null);

    // Spēles dati no kartes
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
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

    // Auto-scroll once to bring player into view on large maps
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp || !activeMapData || isModalOpen) return;
        if (hasAutoScrolledRef.current) return;
        const px = Number(playerState?.x);
        const py = Number(playerState?.y);
        if (!Number.isFinite(px) || !Number.isFinite(py)) return;
        const contentWidth = mapWidth * 32;
        const contentHeight = mapHeight * 32;
        const vw = vp.clientWidth || 0;
        const vh = vp.clientHeight || 0;
        const targetLeft = Math.max(0, Math.min(contentWidth - vw, px - vw / 2));
        const targetTop = Math.max(0, Math.min(contentHeight - vh, py - vh / 2));
        vp.scrollTo({ left: targetLeft, top: targetTop, behavior: 'auto' });
        hasAutoScrolledRef.current = true;
    }, [activeMapData, playerState, mapWidth, mapHeight, isModalOpen]);

    // JAUNS: Klausāmies navigācijas pogas
    useEffect(() => {
        const handleOpenModalEvent = () => setIsModalOpen(true);
        window.addEventListener('open-new-game-modal', handleOpenModalEvent);
        return () => window.removeEventListener('open-new-game-modal', handleOpenModalEvent);
    }, []);

    const loadMapData = (mapData) => {
        hasAutoScrolledRef.current = false;
        if (!mapData) return;

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
            <GameHeader health={playerState.health} />

            {!isModalOpen && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100 }}>
                    <button onClick={() => setIsModalOpen(true)} style={{ padding: '10px 20px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', textTransform: 'uppercase', fontSize: '12px' }}>
                        New Game
                    </button>
                </div>
            )}
        
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

            <div ref={viewportRef} style={{ 
                height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto',
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
                        />

                    </div>
                ) : (
                    <div style={{ color: '#777', fontSize: '24px' }}>Select a map to start playing</div>
                )}
            </div>
        </div>
    );
}

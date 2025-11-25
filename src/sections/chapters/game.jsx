import React, { useState, useEffect, useMemo } from 'react';
import GameRegistry from '../../GameRegistry';
import AnimatedItem from '../../utilites/AnimatedItem';

// Importējam kartes (React/Webpack vidē statiskie faili parasti jāimportē vai jāielādē caur fetch)
import map1 from '../../assets/maps/Temp_01.json';
import map2 from '../../assets/maps/Temp_02.json';
import map3 from '../../assets/maps/Temp_03.json';

// Simulējam failu sarakstu no mapes
const BUILT_IN_MAPS = [map1, map2, map3];

export default function Game() {
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [activeMap, setActiveMap] = useState(null);
    
    // Spēles dati
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    const [tileMapData, setTileMapData] = useState([]);
    const [objectMapData, setObjectMapData] = useState([]);

    // JAUNS: Klausāmies navigācijas pogas nospiešanu
    useEffect(() => {
        const handleOpenModalEvent = () => {
            setIsModalOpen(true);
        };

        // Pievienojam klausītāju
        window.addEventListener('open-new-game-modal', handleOpenModalEvent);

        // Notīrām klausītāju, kad komponente tiek aizvērta
        return () => {
            window.removeEventListener('open-new-game-modal', handleOpenModalEvent);
        };
    }, []);

    // Reģistra sagatavošana renderēšanai
    const registryItems = Array.isArray(GameRegistry) ? GameRegistry : [];

    const loadMapData = (mapData) => {
        if (!mapData) return;

        // Iestatām izmērus
        const w = mapData.meta?.width || mapData.width || 20;
        const h = mapData.meta?.height || mapData.height || 15;
        setMapWidth(w);
        setMapHeight(h);

        // Iestatām slāņus
        if (mapData.layers) {
            const bgLayer = mapData.layers.find(l => l.name === 'background');
            const objLayer = mapData.layers.find(l => l.name === 'entities');
            
            setTileMapData(bgLayer ? bgLayer.data : Array(w * h).fill(null));
            setObjectMapData(objLayer ? objLayer.data : Array(w * h).fill(null));
        } else {
            // Atbalsts vecākam formātam
            setTileMapData(mapData.tiles || Array(w * h).fill(null));
            setObjectMapData(Array(w * h).fill(null));
        }

        setActiveMap(mapData);
        setIsModalOpen(false); // Aizveram logu un noņemam blur
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

    // Stili
    const modalOverlayStyle = {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)'
    };

    const modalContentStyle = {
        backgroundColor: '#fff', padding: '20px', borderRadius: '8px',
        width: '500px', maxHeight: '80%', overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '15px'
    };

    const mapCardStyle = {
        border: '1px solid #ddd', borderRadius: '6px', padding: '10px',
        cursor: 'pointer', backgroundColor: '#f9f9f9',
        transition: 'transform 0.1s',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    };

    const buttonStyle = {
        padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white',
        border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
        textAlign: 'center', display: 'inline-block'
    };

    return (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', backgroundColor: '#333' }}>
            
            {/* MODĀLAIS LOGS */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ margin: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Select a Map</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {BUILT_IN_MAPS.map((map, index) => (
                                <div 
                                    key={index} 
                                    style={mapCardStyle}
                                    onClick={() => loadMapData(map)}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eef'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{map.meta?.name || "Unnamed Map"}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>By: {map.meta?.author || "Unknown"}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
                                        <div>Size: {map.meta?.width}x{map.meta?.height}</div>
                                        {map.statistics && (
                                            <>
                                                <div>Objects: {map.statistics.total_objects}</div>
                                                <div>Tiles: {map.statistics.filled_tiles}</div>
                                            </>
                                        )}
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

            {/* SPĒLES LAUKUMS (BLURRED JA MODĀLAIS LOGS VAĻĀ) */}
            <div style={{ 
                height: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                overflow: 'auto',
                filter: isModalOpen ? 'blur(5px)' : 'none',
                pointerEvents: isModalOpen ? 'none' : 'auto',
                transition: 'filter 0.3s ease'
            }}>
                {activeMap ? (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(${mapWidth}, 32px)`, 
                        gridTemplateRows: `repeat(${mapHeight}, 32px)`,
                        border: '5px solid #222',
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                        backgroundColor: '#111'
                    }}>
                         {Array(mapWidth * mapHeight).fill(0).map((_, index) => {
                            const tileId = tileMapData[index];
                            const objectId = objectMapData[index];
                            const tileObj = tileId ? registryItems.find(r => r.id === tileId) : null;
                            const objObj = objectId ? registryItems.find(r => r.id === objectId) : null;

                            return (
                                <div key={index} style={{ width: '32px', height: '32px', position: 'relative' }}>
                                    {/* Background Layer */}
                                    {tileObj && <AnimatedItem 
                                        textures={tileObj.textures} 
                                        texture={tileObj.texture} 
                                        speed={tileObj.animationSpeed}
                                        style={{ position:'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} 
                                    />}
                                    
                                    {/* Object Layer */}
                                    {objObj && <AnimatedItem 
                                        textures={objObj.textures} 
                                        texture={objObj.texture} 
                                        speed={objObj.animationSpeed}
                                        style={{ position:'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} 
                                    />}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ color: '#777', fontSize: '24px' }}>Select a map to start playing</div>
                )}
            </div>
        </div>
    );
}

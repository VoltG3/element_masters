import React, { useState, useEffect, useRef } from 'react';
import GameRegistry from '../../GameRegistry';
import AnimatedItem from '../../utilites/AnimatedItem';

// ... PaletteSection komponente ... (bez izmaiņām)
const PaletteSection = ({ title, children, isOpenDefault = false }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);
    return (
        <div style={{ marginBottom: '5px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
            <div onClick={() => setIsOpen(!isOpen)} style={{ padding: '8px', cursor: 'pointer', backgroundColor: '#f0f0f0', fontWeight: 'bold', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                <span>{title}</span><span>{isOpen ? '▼' : '▶'}</span>
            </div>
            {isOpen && <div style={{ padding: '8px', maxHeight: '200px', overflowY: 'auto' }}>{children}</div>}
        </div>
    );
};

export const Editor = () => {
// ... existing code (states, effects, helpers) ...
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    const [tileMapData, setTileMapData] = useState([]);
    const [objectMapData, setObjectMapData] = useState([]);
    const [selectedTile, setSelectedTile] = useState(null);
    const [showGrid, setShowGrid] = useState(true);

    const [isDragging, setIsDragging] = useState(false);
    const [brushSize, setBrushSize] = useState(1);
    const [activeTool, setActiveTool] = useState('brush');

    const [selection, setSelection] = useState(null);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [activeLayer, setActiveLayer] = useState('tile');
    const [dragStart, setDragStart] = useState(null);
    const [bucketPreviewIndices, setBucketPreviewIndices] = useState(new Set());
    const bucketTimerRef = useRef(null);
    const stateRef = useRef({ mapWidth, mapHeight, tileMapData, objectMapData });

    // JAUNIE STATE MAINĪGIE
    const [mapName, setMapName] = useState("New Map");
    const [creatorName, setCreatorName] = useState("Anonymous");
    const [createdAt, setCreatedAt] = useState(null);
    const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);
    const [tempMapName, setTempMapName] = useState("");
    const [tempCreatorName, setTempCreatorName] = useState("");

    useEffect(() => {
        stateRef.current = { mapWidth, mapHeight, tileMapData, objectMapData };
    }, [mapWidth, mapHeight, tileMapData, objectMapData]);

    useEffect(() => {
        const size = 15 * 20;
        setTileMapData(Array(size).fill(null));
        setObjectMapData(Array(size).fill(null));
    }, []);

    const registryItems = Array.isArray(GameRegistry) ? GameRegistry : [];
    const blocks = registryItems.filter(item => item.name && item.name.startsWith('block.'));
    const entities = registryItems.filter(item => { if (!item.name || !item.name.startsWith('entities.')) return false; return !item.type || item.type === 'default'; });
    const items = registryItems.filter(item => item.name && item.name.startsWith('item.'));
    const hazards = registryItems.filter(item => item.type === 'hazard');

    // Background images from src/assets/background
    const bgContext = require.context('../../assets/background', false, /\.(png|jpe?g|svg)$/);
    const backgroundOptions = bgContext.keys().map((key) => {
        const mod = bgContext(key);
        const url = mod.default || mod;
        const name = key.replace('./', '');
        return { key, name, src: url, metaPath: `/assets/background/${name}` };
    });

    const [selectedBackgroundImage, setSelectedBackgroundImage] = useState(backgroundOptions[0]?.metaPath || null);
    const [backgroundParallaxFactor, setBackgroundParallaxFactor] = useState(0.3);

    const baseButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #333', padding: '0 10px', height: '28px', backgroundColor: '#e0e0e0', marginRight: '5px', marginBottom: '5px', fontSize: '13px', color: '#000', borderRadius: '3px', userSelect: 'none', minWidth: '30px', boxSizing: 'border-box', textDecoration: 'none', lineHeight: 'normal' };
    const buttonStyle = { ...baseButtonStyle };
    const activeButtonStyle = { ...baseButtonStyle, backgroundColor: '#aaa', borderColor: '#000', fontWeight: 'bold' };

    // JAUNS: Funkcija lai atvērtu "New Map" modālo logu
    const openNewMapModal = () => {
        setTempMapName("New Map");
        setTempCreatorName(creatorName);
        setIsNewMapModalOpen(true);
    };

    // JAUNS: Funkcija lai apstiprinātu jaunas kartes izveidi
    const confirmNewMap = () => {
        if (window.confirm("Are you sure you want to create a new map? Unsaved changes will be lost.")) {
            const size = 20 * 15;
            setMapWidth(20);
            setMapHeight(15);
            setTileMapData(Array(size).fill(null));
            setObjectMapData(Array(size).fill(null));
            
            setMapName(tempMapName || "New Map");
            setCreatorName(tempCreatorName || "Anonymous");
            setCreatedAt(null);
            // defaults for background meta
            setSelectedBackgroundImage(backgroundOptions[0]?.metaPath || null);
            setBackgroundParallaxFactor(0.3);
            
            setIsNewMapModalOpen(false);
        }
    };

    const clearMap = () => {
        if (window.confirm("Are you sure you want to clear the map?")) {
            const size = mapWidth * mapHeight;
            setTileMapData(Array(size).fill(null));
            setObjectMapData(Array(size).fill(null));
            // Reset metadata on clear if needed, or keep author/name
        }
    };

    const saveMap = () => {
        const currentDate = new Date().toISOString();
        const createdDate = createdAt || currentDate;
        
        // Statistikas aprēķins
        const filledBlocks = tileMapData.filter(t => t !== null).length;
        const objectsCount = objectMapData.filter(o => o !== null).length;
        const itemsCount = objectMapData.filter(o => {
            if (!o) return false;
            const item = registryItems.find(r => r.id === o);
            return item && item.name && item.name.startsWith('item.');
        }).length;

        const mapData = {
            meta: { 
                width: mapWidth, 
                height: mapHeight, 
                tileSize: 32, 
                version: "1.0",
                name: mapName, // 1. Mapes nosaukums
                author: creatorName, // 2. Autora nickname
                date_map_created_at: createdDate, // 3. Izveides datums
                date_map_last_updated: currentDate, // 4. Pēdējās izmaiņas
                backgroundImage: selectedBackgroundImage || null, // 5. Fona bilde (seamless)
                backgroundParallaxFactor: backgroundParallaxFactor // 6. Parallakses koeficients
            },
            statistics: { // 5. Papildus statistika
                total_tiles: mapWidth * mapHeight,
                filled_tiles: filledBlocks,
                total_objects: objectsCount,
                total_items: itemsCount
            },
            layers: [ { type: "tile", name: "background", data: tileMapData }, { type: "object", name: "entities", data: objectMapData } ]
        };
        // Failā nosaukumā izmantojam kartes nosaukumu, aizvietojot atstarpes
        const fileName = `${mapName.replace(/\s+/g, '_')}.json`;
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        
        // Iestatām izveides datumu, ja tas vēl nebija
        if (!createdAt) setCreatedAt(currentDate);
    };

    const loadMap = (event) => {
        const fileReader = new FileReader();
        const file = event.target.files[0];
        if (file) {
            fileReader.readAsText(file, "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const loaded = JSON.parse(e.target.result);
                    if (loaded.meta) {
                        setMapWidth(loaded.meta.width); setMapHeight(loaded.meta.height);
                        
                        // Ielādējam metadatus
                        if (loaded.meta.name) setMapName(loaded.meta.name);
                        if (loaded.meta.author) setCreatorName(loaded.meta.author);
                        if (loaded.meta.date_map_created_at) setCreatedAt(loaded.meta.date_map_created_at);
                        // Jaunais: fona bilde un parallakse
                        if (typeof loaded.meta.backgroundImage !== 'undefined') {
                            setSelectedBackgroundImage(loaded.meta.backgroundImage);
                        } else {
                            setSelectedBackgroundImage(backgroundOptions[0]?.metaPath || null);
                        }
                        if (typeof loaded.meta.backgroundParallaxFactor !== 'undefined') {
                            setBackgroundParallaxFactor(loaded.meta.backgroundParallaxFactor);
                        } else {
                            setBackgroundParallaxFactor(0.3);
                        }
                        
                        const bgLayer = loaded.layers.find(l => l.name === 'background');
                        const objLayer = loaded.layers.find(l => l.name === 'entities');
                        if (bgLayer) setTileMapData(bgLayer.data); if (objLayer) setObjectMapData(objLayer.data);
                    } else {
                        // Vecais formāts vai cits fails
                        if (loaded.width) setMapWidth(loaded.width); if (loaded.height) setMapHeight(loaded.height);
                        if (loaded.tiles) setTileMapData(loaded.tiles);
                        setObjectMapData(Array(loaded.width * loaded.height).fill(null));
                    }
                } catch (error) { console.error("Error parsing JSON:", error); }
            };
        }
    };

    const getCurrentData = () => activeLayer === 'tile' ? tileMapData : objectMapData;
    const setCurrentData = (newData) => activeLayer === 'tile' ? setTileMapData(newData) : setObjectMapData(newData);

    const getFloodFillIndices = (startIndex) => {
        const currentData = getCurrentData();
        const startId = currentData[startIndex];
        const width = mapWidth; const height = mapHeight;
        const stack = [startIndex]; const visited = new Set(); const matchingIndices = [];
        while (stack.length > 0) {
            const idx = stack.pop();
            if (visited.has(idx)) continue;
            visited.add(idx);
            if (idx < 0 || idx >= currentData.length) continue;
            if (currentData[idx] !== startId) continue;
            matchingIndices.push(idx);
            const x = idx % width; const y = Math.floor(idx / width);
            if (x > 0) stack.push(idx - 1); if (x < width - 1) stack.push(idx + 1);
            if (y > 0) stack.push(idx - width); if (y < height - 1) stack.push(idx + width);
        }
        return matchingIndices;
    };

    const floodFill = (startIndex, targetId) => {
        const currentData = getCurrentData();
        const startId = currentData[startIndex];
        if (startId === targetId) return;
        const indices = getFloodFillIndices(startIndex);
        const newData = [...currentData];
        indices.forEach(idx => newData[idx] = targetId);
        setCurrentData(newData);
    };

    const paintTile = (index) => {
        const currentData = getCurrentData();
        const newData = [...currentData];
        const x = index % mapWidth; const y = Math.floor(index / mapWidth);
        for (let dy = 0; dy < brushSize; dy++) {
            for (let dx = 0; dx < brushSize; dx++) {
                const targetX = x + dx; const targetY = y + dy;
                if (targetX < mapWidth && targetY < mapHeight) {
                    const targetIndex = targetY * mapWidth + targetX;
                    newData[targetIndex] = selectedTile ? selectedTile.id : null;
                }
            }
        }
        setCurrentData(newData);
    };

    const handleGridMouseDown = (index, e) => {
        e.preventDefault();
        if (activeTool === 'brush') { setIsDragging(true); paintTile(index); }
        else if (activeTool === 'bucket') {
            const targetId = selectedTile ? selectedTile.id : null;
            floodFill(index, targetId); setBucketPreviewIndices(new Set());
        } else if (activeTool === 'move') {
            const x = index % mapWidth; const y = Math.floor(index / mapWidth);
            setDragStart({ x, y }); setSelection(null); setIsDragging(true);
        }
    };

    const handleGridMouseEnter = (index) => {
        setHoverIndex(index);
        if (bucketTimerRef.current) { clearTimeout(bucketTimerRef.current); bucketTimerRef.current = null; }
        setBucketPreviewIndices(new Set());
        if (activeTool === 'brush' && isDragging) paintTile(index);
        else if (activeTool === 'bucket' && !isDragging) {
            bucketTimerRef.current = setTimeout(() => {
                const indices = getFloodFillIndices(index); setBucketPreviewIndices(new Set(indices));
            }, 600);
        }
    };

    const handleGridMouseLeave = () => {
        setHoverIndex(null);
        if (bucketTimerRef.current) clearTimeout(bucketTimerRef.current);
        setBucketPreviewIndices(new Set());
    };

    const handleGridMouseUp = (index) => {
        setIsDragging(false);
        if (activeTool === 'move' && dragStart) {
            const endX = index % mapWidth; const endY = Math.floor(index / mapWidth);
            const x1 = Math.min(dragStart.x, endX); const y1 = Math.min(dragStart.y, endY);
            const x2 = Math.max(dragStart.x, endX); const y2 = Math.max(dragStart.y, endY);
            const w = x2 - x1 + 1; const h = y2 - y1 + 1;

            const selTileData = [];
            const selObjectData = [];

            for(let py=0; py<h; py++) {
                for(let px=0; px<w; px++) {
                    const idx = (y1 + py) * mapWidth + (x1 + px);
                    selTileData.push(tileMapData[idx]);
                    selObjectData.push(objectMapData[idx]);
                }
            }
            setSelection({ x: x1, y: y1, w, h, tileData: selTileData, objectData: selObjectData });
            setDragStart(null);
        }
    };

    const moveSelection = (dx, dy) => {
        if (!selection) return;

        const newTileMap = [...tileMapData];
        const newObjectMap = [...objectMapData];

        for(let py=0; py < selection.h; py++) {
            for(let px=0; px < selection.w; px++) {
                const idx = (selection.y + py) * mapWidth + (selection.x + px);
                if (idx >= 0 && idx < newTileMap.length) {
                    newTileMap[idx] = null;
                    newObjectMap[idx] = null;
                }
            }
        }

        const newX = selection.x + dx; const newY = selection.y + dy;
        for(let py=0; py < selection.h; py++) {
            for(let px=0; px < selection.w; px++) {
                const destX = newX + px; const destY = newY + py;
                if (destX >= 0 && destX < mapWidth && destY >= 0 && destY < mapHeight) {
                    const destIdx = destY * mapWidth + destX;
                    const srcDataIdx = py * selection.w + px;

                    newTileMap[destIdx] = selection.tileData[srcDataIdx];
                    newObjectMap[destIdx] = selection.objectData[srcDataIdx];
                }
            }
        }

        setTileMapData(newTileMap);
        setObjectMapData(newObjectMap);
        setSelection({ ...selection, x: newX, y: newY });
    };

    const resizeMapData = (newWidth, newHeight) => {
        const { mapWidth: oldW, mapHeight: oldH, tileMapData: oldTiles, objectMapData: oldObjs } = stateRef.current;
        if (newWidth < 1 || newHeight < 1) return; if (newWidth === oldW && newHeight === oldH) return;
        const resizeArray = (oldArr) => {
            const newArr = Array(newWidth * newHeight).fill(null);
            for (let y = 0; y < Math.min(oldH, newHeight); y++) {
                for (let x = 0; x < Math.min(oldW, newWidth); x++) newArr[y * newWidth + x] = oldArr[y * oldW + x];
            }
            return newArr;
        };
        setMapWidth(newWidth); setMapHeight(newHeight); setTileMapData(resizeArray(oldTiles)); setObjectMapData(resizeArray(oldObjs));
    };

    const handleResizeMouseDown = (direction) => (e) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        const { mapWidth: startW, mapHeight: startH } = stateRef.current;
        const TILE_SIZE = 32;
        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX; const dy = moveEvent.clientY - startY;
            if (direction === 'width') {
                const colsDiff = Math.round(dx / TILE_SIZE);
                if (startW + colsDiff !== stateRef.current.mapWidth) resizeMapData(startW + colsDiff, stateRef.current.mapHeight);
            } else if (direction === 'height') {
                const rowsDiff = Math.round(dy / TILE_SIZE);
                if (startH + rowsDiff !== stateRef.current.mapHeight) resizeMapData(stateRef.current.mapWidth, startH + rowsDiff);
            }
        };
        const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
        window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
    };

    const handlePaletteSelect = (item, layer) => {
        setSelectedTile(item);
        setActiveLayer(layer);
        setActiveTool('brush');
        setSelection(null);
    };

    // Paletes items ar animāciju
    const renderPaletteItem = (item, color, layer) => (
        <div
            key={item.id}
            onClick={() => handlePaletteSelect(item, layer)}
            title={item.name}
            style={{
                border: selectedTile?.id === item.id ? `2px solid ${color}` : '1px solid #ccc',
                cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'
            }}
        >
             <AnimatedItem 
                textures={item.textures} 
                texture={item.texture} 
                speed={item.animationSpeed} 
                style={{maxWidth:'100%', maxHeight:'100%', objectFit: 'contain'}} 
                alt={item.name}
             />
             {/* Fallback ja nav bildes */}
             {(!item.texture && (!item.textures || item.textures.length === 0)) && 
                <span style={{fontSize:'10px', overflow:'hidden'}}>{item.name}</span>
             }
        </div>
    );

    const BlockEraser = () => ( <div onClick={() => { setSelectedTile(null); setActiveLayer('tile'); setActiveTool('brush'); }} title="Erase Blocks (Background)" style={{ border: (selectedTile === null && activeLayer === 'tile') ? `2px solid blue` : '1px solid #ccc', cursor: 'pointer', padding: '2px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f8ff', fontSize: '16px', color: 'blue' }}>⌫B</div> );
    const ObjectEraser = () => ( <div onClick={() => { setSelectedTile(null); setActiveLayer('object'); setActiveTool('brush'); }} title="Erase Objects (Entities/Items)" style={{ border: (selectedTile === null && activeLayer === 'object') ? `2px solid red` : '1px solid #ccc', cursor: 'pointer', padding: '2px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0f0', fontSize: '16px', color: 'red' }}>⌫O</div> );

    const totalTiles = mapWidth * mapHeight; const filledBlocks = tileMapData.filter(t => t !== null).length; const emptyBlocks = totalTiles - filledBlocks; const objectsCount = objectMapData.filter(o => o !== null).length;

    // Definējam gridColor šeit, lai tas būtu pieejams renderēšanas daļā
    const gridColor = showGrid
        ? (activeLayer === 'tile' ? 'rgba(0, 0, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)')
        : 'transparent';

    return (
        <div className="editor-wrapper" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            {/* Modālais logs */}
            {isNewMapModalOpen && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#fff', padding: '20px', borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '300px',
                        display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Create New Map</h3>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Map Name:</label>
                            <input 
                                type="text" 
                                value={tempMapName} 
                                onChange={(e) => setTempMapName(e.target.value)}
                                style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Creator Nickname:</label>
                            <input 
                                type="text" 
                                value={tempCreatorName} 
                                onChange={(e) => setTempCreatorName(e.target.value)}
                                style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setIsNewMapModalOpen(false)} style={{ ...buttonStyle, backgroundColor: '#f0f0f0' }}>Cancel</button>
                            <button onClick={confirmNewMap} style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: 'white', borderColor: '#4CAF50' }}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Galvenais saturs ar blur efektu */}
            <div className="editor-container" style={{ 
                display: 'flex', height: '100%', flexDirection: 'row',
                filter: isNewMapModalOpen ? 'blur(4px) brightness(0.7)' : 'none',
                transition: 'filter 0.2s ease',
                pointerEvents: isNewMapModalOpen ? 'none' : 'auto'
            }}>
                {/* ... Toolbar ... */}
                <div className="toolbar" style={{ width: '280px', padding: '15px', borderRight: '1px solid #ccc', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f8f8' }}>
                    <div style={{ marginBottom: '15px' }}>
                        
                        <div style={{marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            <div style={{fontSize: '12px'}}>Map Name: <strong>{mapName}</strong></div>
                            <div style={{fontSize: '12px'}}>Creator: <strong>{creatorName}</strong></div>
                        </div>

                        <div style={{marginBottom: '10px'}}>
                            {/* Poga NEW */}
                            <button onClick={openNewMapModal} style={{...buttonStyle, backgroundColor: '#4CAF50', color: '#fff', borderColor: '#388E3C'}}>New</button> 
                            <button onClick={saveMap} style={buttonStyle}>Save</button> 
                            <label style={buttonStyle}>Load <input type="file" accept=".json,.txt" onChange={loadMap} style={{display: 'none'}} /></label> 
                            <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? activeButtonStyle : buttonStyle}>#</button> 
                            <button onClick={clearMap} style={{...buttonStyle, color: 'red'}} title="Clear Map">✕</button>
                        </div>
                        <div style={{borderTop: '1px solid #ddd', paddingTop: '10px', marginBottom: '10px'}}>
                            <span style={{fontSize: '12px', fontWeight: 'bold', display:'block', marginBottom:'5px'}}>TOOLS</span>
                            <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeButtonStyle : buttonStyle}>🖌️</button> <button onClick={() => setActiveTool('bucket')} style={activeTool === 'bucket' ? activeButtonStyle : buttonStyle}>🪣</button> <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeButtonStyle : buttonStyle}>✋</button>
                            {(activeTool === 'brush') && ( <div style={{marginTop: '5px'}}> <span style={{fontSize: '11px', marginRight: '5px'}}>Size:</span> {[1, 2, 3, 4, 5].map(size => ( <button key={size} onClick={() => setBrushSize(size)} style={{... (brushSize === size ? activeButtonStyle : buttonStyle), padding: '0 6px', minWidth: '20px'}}>{size}</button> ))} </div> )}
                            <div style={{marginTop: '10px', padding: '5px', backgroundColor: activeLayer === 'tile' ? '#e6f7ff' : '#fff1f0', borderRadius: '4px', border: '1px solid #ccc'}}> <span style={{fontSize: '11px'}}>Active: <strong>{activeLayer === 'tile' ? '🟦 Background' : '🟥 Objects'}</strong></span> </div>
                            {activeTool === 'move' && selection && ( <div style={{marginTop: '5px'}}> <span style={{fontSize: '11px', display:'block'}}>Move Selection:</span> <button onClick={() => moveSelection(0, -1)} style={buttonStyle}>▲</button> <div style={{display:'inline-block'}}> <button onClick={() => moveSelection(-1, 0)} style={buttonStyle}>◀</button> <button onClick={() => moveSelection(1, 0)} style={buttonStyle}>▶</button> </div> <button onClick={() => moveSelection(0, 1)} style={buttonStyle}>▼</button> <button onClick={() => setSelection(null)} style={{...buttonStyle, color: 'red', marginLeft: '5px'}}>✕</button> </div> )}
                        </div>
                    </div>
                     {/* ... */}
                     <div className="palette" style={{ flex: 1, overflowY: 'auto' }}>
                        <PaletteSection title="Erasers" isOpenDefault={true}> <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}> <BlockEraser /> <ObjectEraser /> </div> </PaletteSection>
                        <PaletteSection title="Blocks (Background)" isOpenDefault={true}> <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}> {blocks.map(b => renderPaletteItem(b, 'blue', 'tile'))} </div> </PaletteSection>
                        <PaletteSection title="Entities (Objects)"> <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}> {entities.map(e => renderPaletteItem(e, 'red', 'object'))} </div> </PaletteSection>
                        <PaletteSection title="Items (Objects)"> <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}> {items.map(i => renderPaletteItem(i, 'green', 'object'))} </div> </PaletteSection>
                         {/* JAUNS: Hazards sadaļa */}
                         <PaletteSection title="Hazards (Objects)">
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                 {hazards.map(h => renderPaletteItem(h, 'orange', 'object'))}
                             </div>
                         </PaletteSection>
                         {/* JAUNS: Background Image izvēle */}
                         <PaletteSection title="Background Image" isOpenDefault={true}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {backgroundOptions.map((bg) => (
                                    <div key={bg.name} onClick={() => setSelectedBackgroundImage(bg.metaPath)}
                                         style={{ border: selectedBackgroundImage === bg.metaPath ? '2px solid #4CAF50' : '1px solid #ccc', borderRadius: '4px', padding: '2px', cursor: 'pointer', background:'#fff' }}
                                         title={bg.name}
                                    >
                                        <img src={bg.src} alt={bg.name} style={{ width: '100%', height: '48px', objectFit: 'cover', display:'block' }} />
                                        <div style={{ fontSize: '10px', textAlign:'center', paddingTop:'2px' }}>{bg.name}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <label style={{ fontSize: '12px' }}>Parallax: </label>
                                <input type="range" min="0" max="1" step="0.05" value={backgroundParallaxFactor} onChange={(e) => setBackgroundParallaxFactor(parseFloat(e.target.value))} />
                                <span style={{ fontSize: '12px', marginLeft:'6px' }}>{backgroundParallaxFactor.toFixed(2)}</span>
                            </div>
                         </PaletteSection>
                    </div>
                    {/* ... Stats ... */}
                     <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #ccc', fontSize: '11px', backgroundColor: '#eee', padding: '10px' }}> <div style={{marginBottom: '4px'}}>Size: <strong>{mapWidth} x {mapHeight}</strong> ({totalTiles} tiles)</div> <div style={{marginBottom: '4px', color: 'blue'}}>🟦 Filled Blocks: <strong>{filledBlocks}</strong></div> <div style={{marginBottom: '4px', color: '#666'}}>⬜ Empty Blocks: <strong>{emptyBlocks}</strong></div> <div style={{marginBottom: '4px', color: 'red'}}>🟥 Objects Count: <strong>{objectsCount}</strong></div> </div>
                </div>

                {/* Viewport */}
                <div className="viewport" style={{ flex: 1, padding: '40px', backgroundColor: '#555', overflow: 'auto', position: 'relative', userSelect: 'none' }} onMouseUp={() => setIsDragging(false)}>
                    <div style={{ position: 'relative', width: 'fit-content' }} onMouseLeave={handleGridMouseLeave}>
                        <div className="grid"
                            style={{
                                display: 'grid', gridTemplateColumns: `repeat(${mapWidth}, 32px)`, gridTemplateRows: `repeat(${mapHeight}, 32px)`,
                                gap: showGrid ? '1px' : '0px', border: '1px solid #222', backgroundColor: '#222', position: 'relative',
                                cursor: activeTool === 'bucket' ? 'cell' : 'default'
                            }}
                        >
                            {Array(mapWidth * mapHeight).fill(0).map((_, index) => {
                                const tileId = tileMapData[index];
                                const objectId = objectMapData[index];
                                const tileObj = tileId ? registryItems.find(r => r.id === tileId) : null;
                                const objObj = objectId ? registryItems.find(r => r.id === objectId) : null;
                            
                                // TE MĒS IZMANTOJAM AnimatedItem GRIDĀ
                                // Svarīgi: AnimatedItem ir React komponente, tāpēc katra šūna būs nedaudz "smagāka" nekā vienkāršs <img>.
                                // Ar lielām kartēm (100x100) tas var ietekmēt veiktspēju. 
                                // Mazām kartēm (20x15) tas būs OK un izskatīsies dzīvīgi.

                                const x = index % mapWidth; const y = Math.floor(index / mapWidth);
                                // ... (highlight logic paliek tāds pats) ...
                                let isSelected = false; if (selection && x >= selection.x && x < selection.x + selection.w && y >= selection.y && y < selection.y + selection.h) isSelected = true;
                                let isMoveSelecting = false; let isMoveHover = false; if (activeTool === 'move') { if (isDragging && dragStart && hoverIndex !== null) { const hx = hoverIndex % mapWidth; const hy = Math.floor(hoverIndex / mapWidth); const sx = dragStart.x; const sy = dragStart.y; const minX = Math.min(sx, hx); const minY = Math.min(sy, hy); const maxX = Math.max(sx, hx); const maxY = Math.max(sy, hy); if (x >= minX && x <= maxX && y >= minY && y <= maxY) isMoveSelecting = true; } else if (!isDragging && hoverIndex === index) isMoveHover = true; }
                                let isBrushTarget = false; if ((activeTool === 'brush') && hoverIndex !== null) { const hx = hoverIndex % mapWidth; const hy = Math.floor(hoverIndex / mapWidth); if (x >= hx && x < hx + brushSize && y >= hy && y < hy + brushSize) isBrushTarget = true; }
                                let isBucketTarget = false; let isBucketPreview = false; if (activeTool === 'bucket') { if (bucketPreviewIndices.has(index)) isBucketPreview = true; else if (hoverIndex === index) isBucketTarget = true; }

                                // Izmantojam gridColor šeit
                                let borderStyle = `1px solid ${showGrid ? (activeLayer === 'tile' ? 'rgba(0, 0, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)') : 'transparent'}`;
                                let bgStyle = '#fff';
                                if (isBrushTarget) borderStyle = '2px solid red';
                                else if (isBucketPreview) { borderStyle = '1px dashed orange'; bgStyle = 'rgb(168,187,220)'; }
                                else if (isBucketTarget) borderStyle = '2px solid orange';
                                else if (isMoveHover) borderStyle = '2px solid blue';
                                else if (isMoveSelecting) { borderStyle = '1px dashed blue'; bgStyle = 'rgba(0, 0, 255, 0.1)'; }
                                else if (isSelected) { borderStyle = '1px dashed red'; bgStyle = 'rgba(255, 255, 0, 0.3)'; }
                                else if (!showGrid) borderStyle = 'none';

                                return (
                                    <div key={index}
                                        onMouseDown={(e) => handleGridMouseDown(index, e)}
                                        onMouseEnter={() => handleGridMouseEnter(index)}
                                        onMouseUp={() => handleGridMouseUp(index)}
                                        style={{
                                            width: '32px', height: '32px', backgroundColor: bgStyle, border: borderStyle,
                                            zIndex: (isBrushTarget || isBucketTarget || isBucketPreview || isMoveHover || isMoveSelecting) ? 20 : (isSelected ? 15 : 1),
                                            boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                                        }}
                                    >
                                        {/* Background Layer (Tiles) */}
                                        {tileObj && <AnimatedItem 
                                            textures={tileObj.textures} 
                                            texture={tileObj.texture} 
                                            speed={tileObj.animationSpeed}
                                            style={{ position:'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} 
                                        />}
                                    
                                        {/* Foreground Layer (Objects) */}
                                        {objObj && <AnimatedItem 
                                            textures={objObj.textures} 
                                            texture={objObj.texture} 
                                            speed={objObj.animationSpeed}
                                            style={{ position:'absolute', width: '100%', height: '100%', objectFit: 'contain', zIndex: 3 }} 
                                        />}
                                    
                                        <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10}} />
                                    </div>
                                );
                            })}
                        </div>
                        <div onMouseDown={handleResizeMouseDown('width')} style={{ position: 'absolute', top: 0, right: -15, width: '15px', height: '100%', backgroundColor: '#777', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTopRightRadius: '5px', borderBottomRightRadius: '5px' }}><span style={{color: '#ccc', fontSize: '20px'}}>⋮</span></div>
                        <div onMouseDown={handleResizeMouseDown('height')} style={{ position: 'absolute', bottom: -15, left: 0, width: '100%', height: '15px', backgroundColor: '#777', cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: '5px', borderBottomRightRadius: '5px' }}><span style={{color: '#ccc', fontSize: '20px'}}>⋯</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
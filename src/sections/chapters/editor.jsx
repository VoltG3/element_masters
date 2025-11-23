import React, { useState, useEffect, useRef } from 'react';
import GameRegistry from '../../GameRegistry';

export const Editor = () => {
    // Izmēri
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    
    // Dati - Tagad divi atsevišķi slāņi
    const [tileMapData, setTileMapData] = useState([]); // Tikai bloki (background)
    const [objectMapData, setObjectMapData] = useState([]); // Entities un Items (foreground)

    const [selectedTile, setSelectedTile] = useState(null);
    const [showGrid, setShowGrid] = useState(true);

    // Rīki
    const [isDragging, setIsDragging] = useState(false);
    const [brushSize, setBrushSize] = useState(1);
    const [activeTool, setActiveTool] = useState('brush');
    const [selection, setSelection] = useState(null);
    const [hoverIndex, setHoverIndex] = useState(null);
    
    // Slāņu kontrole (automātiski tiek noteikta, bet var noderēt arī manuāli)
    const [activeLayer, setActiveLayer] = useState('tile'); // 'tile' vai 'object'

    const [bucketPreviewIndices, setBucketPreviewIndices] = useState(new Set());
    const bucketTimerRef = useRef(null);

    // Refs tagad satur abus map datus
    const stateRef = useRef({ mapWidth, mapHeight, tileMapData, objectMapData });
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
    const entities = registryItems.filter(item => {
        if (!item.name || !item.name.startsWith('entities.')) return false;
        return !item.type || item.type === 'default';
    });
    const items = registryItems.filter(item => item.name && item.name.startsWith('item.'));

    // --- Styles ---
    const baseButtonStyle = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        border: '1px solid #333', padding: '0 10px', height: '28px', backgroundColor: '#e0e0e0',
        marginRight: '5px', marginBottom: '5px', fontSize: '13px', color: '#000',
        borderRadius: '3px', userSelect: 'none', minWidth: '30px', boxSizing: 'border-box',
        textDecoration: 'none', lineHeight: 'normal'
    };
    const buttonStyle = { ...baseButtonStyle };
    const activeButtonStyle = { ...baseButtonStyle, backgroundColor: '#aaa', borderColor: '#000', fontWeight: 'bold' };

    // --- Map Operations ---
    const clearMap = () => {
        if (window.confirm("Are you sure you want to clear the map?")) {
            const size = mapWidth * mapHeight;
            setTileMapData(Array(size).fill(null));
            setObjectMapData(Array(size).fill(null));
        }
    };

    const saveMap = () => {
        // Strukturējam datus jaunajā formātā
        const mapData = {
            meta: {
                width: mapWidth,
                height: mapHeight,
                tileSize: 32,
                version: "1.0"
            },
            layers: [
                {
                    type: "tile",
                    name: "background",
                    data: tileMapData
                },
                {
                    type: "object",
                    name: "entities",
                    // Šeit mēs vienkāršības labad saglabājam kā masīvu (kā gridu), 
                    // bet varētu pārveidot par objektu sarakstu ar koordinātēm
                    data: objectMapData 
                }
            ]
        };
        
        const fileName = "level_01.json";
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const loadMap = (event) => {
        const fileReader = new FileReader();
        const file = event.target.files[0];
        if (file) {
            fileReader.readAsText(file, "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const loaded = JSON.parse(e.target.result);
                    // Atbalstam gan veco (plakano), gan jauno (slāņu) formātu
                    if (loaded.meta) {
                        setMapWidth(loaded.meta.width);
                        setMapHeight(loaded.meta.height);
                        // Ielādējam slāņus
                        const bgLayer = loaded.layers.find(l => l.name === 'background');
                        const objLayer = loaded.layers.find(l => l.name === 'entities');
                        
                        if (bgLayer) setTileMapData(bgLayer.data);
                        if (objLayer) setObjectMapData(objLayer.data);
                    } else {
                        // Fallback uz veco
                        if (loaded.width) setMapWidth(loaded.width);
                        if (loaded.height) setMapHeight(loaded.height);
                        if (loaded.tiles) setTileMapData(loaded.tiles);
                        // Vecajā nebija objektu slāņa
                        setObjectMapData(Array(loaded.width * loaded.height).fill(null));
                    }
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                }
            };
        }
    };

    // --- Helper to get active array based on layer ---
    const getCurrentData = () => activeLayer === 'tile' ? tileMapData : objectMapData;
    const setCurrentData = (newData) => activeLayer === 'tile' ? setTileMapData(newData) : setObjectMapData(newData);

    const getFloodFillIndices = (startIndex) => {
        const currentData = getCurrentData();
        const startId = currentData[startIndex];
        const width = mapWidth;
        const height = mapHeight;
        const stack = [startIndex];
        const visited = new Set();
        const matchingIndices = [];

        while (stack.length > 0) {
            const idx = stack.pop();
            if (visited.has(idx)) continue;
            visited.add(idx);

            if (idx < 0 || idx >= currentData.length) continue;
            if (currentData[idx] !== startId) continue;

            matchingIndices.push(idx);
            const x = idx % width;
            const y = Math.floor(idx / width);
            if (x > 0) stack.push(idx - 1);
            if (x < width - 1) stack.push(idx + 1);
            if (y > 0) stack.push(idx - width);
            if (y < height - 1) stack.push(idx + width);
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
        const x = index % mapWidth;
        const y = Math.floor(index / mapWidth);

        for (let dy = 0; dy < brushSize; dy++) {
            for (let dx = 0; dx < brushSize; dx++) {
                const targetX = x + dx;
                const targetY = y + dy;
                if (targetX < mapWidth && targetY < mapHeight) {
                    const targetIndex = targetY * mapWidth + targetX;
                    newData[targetIndex] = selectedTile ? selectedTile.id : null;
                }
            }
        }
        setCurrentData(newData);
    };

    // --- Mouse Handlers ---
    const [dragStart, setDragStart] = useState(null);

    const handleGridMouseDown = (index, e) => {
        e.preventDefault();
        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index);
        } else if (activeTool === 'bucket') {
            const targetId = selectedTile ? selectedTile.id : null;
            floodFill(index, targetId);
            setBucketPreviewIndices(new Set());
        } else if (activeTool === 'move') {
            const x = index % mapWidth;
            const y = Math.floor(index / mapWidth);
            setDragStart({ x, y });
            setSelection(null);
            setIsDragging(true);
        }
    };

    const handleGridMouseEnter = (index) => {
        setHoverIndex(index);
        if (bucketTimerRef.current) { clearTimeout(bucketTimerRef.current); bucketTimerRef.current = null; }
        setBucketPreviewIndices(new Set());

        if (activeTool === 'brush' && isDragging) {
            paintTile(index);
        } else if (activeTool === 'bucket' && !isDragging) {
            bucketTimerRef.current = setTimeout(() => {
                const indices = getFloodFillIndices(index);
                setBucketPreviewIndices(new Set(indices));
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
            // Move tool selection logic (tikai aktīvajam slānim)
            const endX = index % mapWidth;
            const endY = Math.floor(index / mapWidth);
            const x1 = Math.min(dragStart.x, endX); const y1 = Math.min(dragStart.y, endY);
            const x2 = Math.max(dragStart.x, endX); const y2 = Math.max(dragStart.y, endY);
            const w = x2 - x1 + 1; const h = y2 - y1 + 1;
            
            const currentData = getCurrentData();
            const selectionData = [];
            for(let py=0; py<h; py++) {
                for(let px=0; px<w; px++) {
                    const idx = (y1 + py) * mapWidth + (x1 + px);
                    selectionData.push(currentData[idx]);
                }
            }
            setSelection({ x: x1, y: y1, w, h, data: selectionData });
            setDragStart(null);
        }
    };

    const moveSelection = (dx, dy) => {
        if (!selection) return;
        const currentData = getCurrentData();
        const newData = [...currentData];
        
        // Clear old
        for(let py=0; py < selection.h; py++) {
            for(let px=0; px < selection.w; px++) {
                const idx = (selection.y + py) * mapWidth + (selection.x + px);
                if (idx >= 0 && idx < newData.length) newData[idx] = null;
            }
        }
        // Paste new
        const newX = selection.x + dx;
        const newY = selection.y + dy;
        for(let py=0; py < selection.h; py++) {
            for(let px=0; px < selection.w; px++) {
                const destX = newX + px;
                const destY = newY + py;
                if (destX >= 0 && destX < mapWidth && destY >= 0 && destY < mapHeight) {
                    const destIdx = destY * mapWidth + destX;
                    const srcDataIdx = py * selection.w + px;
                    newData[destIdx] = selection.data[srcDataIdx];
                }
            }
        }
        setCurrentData(newData);
        setSelection({ ...selection, x: newX, y: newY });
    };

    // Resize
    const resizeMapData = (newWidth, newHeight) => {
        const { mapWidth: oldW, mapHeight: oldH, tileMapData: oldTiles, objectMapData: oldObjs } = stateRef.current;
        if (newWidth < 1 || newHeight < 1) return;
        if (newWidth === oldW && newHeight === oldH) return;

        const resizeArray = (oldArr) => {
            const newArr = Array(newWidth * newHeight).fill(null);
            for (let y = 0; y < Math.min(oldH, newHeight); y++) {
                for (let x = 0; x < Math.min(oldW, newWidth); x++) {
                    newArr[y * newWidth + x] = oldArr[y * oldW + x];
                }
            }
            return newArr;
        };

        setMapWidth(newWidth);
        setMapHeight(newHeight);
        setTileMapData(resizeArray(oldTiles));
        setObjectMapData(resizeArray(oldObjs));
    };

    const handleResizeMouseDown = (direction) => (e) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        const { mapWidth: startW, mapHeight: startH } = stateRef.current;
        const TILE_SIZE = 32;

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
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

    // Palette Selection Handler - Automātiski maina slāni
    const handlePaletteSelect = (item, layer) => {
        setSelectedTile(item);
        setActiveLayer(layer);
        setActiveTool('brush'); // Reset tool to brush on selection
        setSelection(null); // Clear selection on new item pick
    };

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
            {item.textures && item.textures[0] ? <img src={item.textures[0]} alt={item.name} style={{maxWidth:'100%', maxHeight:'100%'}} /> :
             item.texture ? <img src={item.texture} alt={item.name} style={{maxWidth:'100%', maxHeight:'100%'}} /> :
             <span style={{fontSize:'10px', overflow:'hidden'}}>{item.name}</span>}
        </div>
    );

    // Aizstājam veco EraserItem ar diviem jauniem
    const BlockEraser = () => (
         <div
            onClick={() => { setSelectedTile(null); setActiveLayer('tile'); setActiveTool('brush'); }}
            title="Erase Blocks (Background)"
            style={{
                border: (selectedTile === null && activeLayer === 'tile') ? `2px solid blue` : '1px solid #ccc',
                cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f8ff', fontSize: '16px', color: 'blue'
            }}
        >
            ⌫B
        </div>
    );

    const ObjectEraser = () => (
         <div
            onClick={() => { setSelectedTile(null); setActiveLayer('object'); setActiveTool('brush'); }}
            title="Erase Objects (Entities/Items)"
            style={{
                border: (selectedTile === null && activeLayer === 'object') ? `2px solid red` : '1px solid #ccc',
                cursor: 'pointer', padding: '2px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0f0', fontSize: '16px', color: 'red'
            }}
        >
            ⌫O
        </div>
    );

    return (
        <div className="editor-container" style={{ display: 'flex', height: '100vh', flexDirection: 'row' }}>
            {/* Sidebar */}
            <div className="toolbar" style={{ width: '280px', padding: '15px', borderRight: '1px solid #ccc', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f8f8' }}>
                {/* ... Save/Load buttons section ... */}
                <div style={{ marginBottom: '15px' }}>
                   {/* ... existing buttons ... */}
                   <div style={{marginBottom: '10px'}}>
                        <button onClick={saveMap} style={buttonStyle}>Save</button>
                        <label style={buttonStyle}>Load <input type="file" accept=".json,.txt" onChange={loadMap} style={{display: 'none'}} /></label>
                        <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? activeButtonStyle : buttonStyle}>#</button>
                        <button onClick={clearMap} style={{...buttonStyle, color: 'red'}} title="Clear Map">✕</button>
                    </div>

                    <div style={{borderTop: '1px solid #ddd', paddingTop: '10px', marginBottom: '10px'}}>
                        {/* ... Tools section ... */}
                        <span style={{fontSize: '12px', fontWeight: 'bold', display:'block', marginBottom:'5px'}}>TOOLS</span>
                        <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeButtonStyle : buttonStyle}>🖌️</button>
                        <button onClick={() => setActiveTool('bucket')} style={activeTool === 'bucket' ? activeButtonStyle : buttonStyle}>🪣</button>
                        <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeButtonStyle : buttonStyle}>✋</button>

                        {(activeTool === 'brush') && (
                            <div style={{marginTop: '5px'}}>
                                <span style={{fontSize: '11px', marginRight: '5px'}}>Size:</span>
                                {[1, 2, 3, 4, 5].map(size => (
                                    <button key={size} onClick={() => setBrushSize(size)} style={{... (brushSize === size ? activeButtonStyle : buttonStyle), padding: '0 6px', minWidth: '20px'}}>{size}</button>
                                ))}
                            </div>
                        )}
                        
                        {/* Indikators, kurš slānis aktīvs - noderīgs info */}
                        <div style={{marginTop: '10px', padding: '5px', backgroundColor: activeLayer === 'tile' ? '#e6f7ff' : '#fff1f0', borderRadius: '4px', border: '1px solid #ccc'}}>
                            <span style={{fontSize: '11px'}}>Editing Layer: <br/><strong>{activeLayer === 'tile' ? '🟦 Background (Blocks)' : '🟥 Objects (Entities)'}</strong></span>
                        </div>
                        
                         {activeTool === 'move' && selection && (
                             <div style={{marginTop: '5px'}}>
                                <span style={{fontSize: '11px', display:'block'}}>Move Selection:</span>
                                <button onClick={() => moveSelection(0, -1)} style={buttonStyle}>▲</button>
                                <div style={{display:'inline-block'}}>
                                    <button onClick={() => moveSelection(-1, 0)} style={buttonStyle}>◀</button>
                                    <button onClick={() => moveSelection(1, 0)} style={buttonStyle}>▶</button>
                                </div>
                                <button onClick={() => moveSelection(0, 1)} style={buttonStyle}>▼</button>
                                <button onClick={() => setSelection(null)} style={{...buttonStyle, color: 'red', marginLeft: '5px'}}>✕</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="palette" style={{ flex: 1 }}>
                    <div style={{marginBottom: '10px'}}>
                        <h4>Erasers</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                             {/* Pievienojam abas pogas */}
                             <BlockEraser />
                             <ObjectEraser />
                        </div>
                    </div>
                    <h4>Blocks (Background)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {blocks.map(b => renderPaletteItem(b, 'blue', 'tile'))}
                    </div>
                    <h4>Entities (Objects)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {entities.map(e => renderPaletteItem(e, 'red', 'object'))}
                    </div>
                    <h4>Items (Objects)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {items.map(i => renderPaletteItem(i, 'green', 'object'))}
                    </div>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #ccc', fontSize: '12px' }}>
                    Size: <strong>{mapWidth} x {mapHeight}</strong> | Tool: <strong>{activeTool}</strong>
                </div>
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
                        {/* Mēs iterējam cauri vienam masīvam, lai izveidotu grid šūnas, bet renderējam abus slāņus */}
                        {Array(mapWidth * mapHeight).fill(0).map((_, index) => {
                            const tileId = tileMapData[index];
                            const objectId = objectMapData[index];

                            // Get assets
                            const tileObj = tileId ? registryItems.find(r => r.id === tileId) : null;
                            const objObj = objectId ? registryItems.find(r => r.id === objectId) : null;

                            let tileImg = tileObj ? (tileObj.texture || (tileObj.textures && tileObj.textures[0])) : null;
                            let objImg = objObj ? (objObj.texture || (objObj.textures && objObj.textures[0])) : null;

                            const x = index % mapWidth;
                            const y = Math.floor(index / mapWidth);

                            // Highlights
                            let isSelected = false;
                            if (selection && x >= selection.x && x < selection.x + selection.w && y >= selection.y && y < selection.y + selection.h) isSelected = true;

                            let isMoveSelecting = false; let isMoveHover = false;
                            if (activeTool === 'move') {
                                if (isDragging && dragStart && hoverIndex !== null) {
                                    const hx = hoverIndex % mapWidth; const hy = Math.floor(hoverIndex / mapWidth);
                                    const sx = dragStart.x; const sy = dragStart.y;
                                    const minX = Math.min(sx, hx); const minY = Math.min(sy, hy);
                                    const maxX = Math.max(sx, hx); const maxY = Math.max(sy, hy);
                                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) isMoveSelecting = true;
                                } else if (!isDragging && hoverIndex === index) isMoveHover = true;
                            }

                            let isBrushTarget = false;
                            if ((activeTool === 'brush') && hoverIndex !== null) {
                                const hx = hoverIndex % mapWidth; const hy = Math.floor(hoverIndex / mapWidth);
                                if (x >= hx && x < hx + brushSize && y >= hy && y < hy + brushSize) isBrushTarget = true;
                            }
                            
                            let isBucketTarget = false; let isBucketPreview = false;
                             if (activeTool === 'bucket') {
                                if (bucketPreviewIndices.has(index)) isBucketPreview = true;
                                else if (hoverIndex === index) isBucketTarget = true;
                            }

                            let borderStyle = 'none';
                            let bgStyle = '#fff'; // Default background

                            if (isBrushTarget) borderStyle = '2px solid red';
                            else if (isBucketPreview) { borderStyle = '1px dashed orange'; bgStyle = 'rgba(255, 165, 0, 0.3)'; }
                            else if (isBucketTarget) borderStyle = '2px solid orange';
                            else if (isMoveHover) borderStyle = '2px solid blue';
                            else if (isMoveSelecting) { borderStyle = '1px dashed blue'; bgStyle = 'rgba(0, 0, 255, 0.1)'; }
                            else if (isSelected) { borderStyle = '1px dashed red'; bgStyle = 'rgba(255, 255, 0, 0.3)'; }

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
                                    {tileImg && <img src={tileImg} style={{ position:'absolute', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', zIndex: 2 }} alt="" />}
                                    
                                    {/* Foreground Layer (Objects) */}
                                    {objImg && <img src={objImg} style={{ position:'absolute', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', zIndex: 3 }} alt="" />}
                                    
                                    {/* Overlay for events */}
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
    );
};
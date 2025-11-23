import React, { useState, useEffect, useRef } from 'react';
import GameRegistry from '../../GameRegistry';

export const Editor = () => {
    // 1. Definējam stāvokļus (State)
    const [mapWidth, setMapWidth] = useState(20);
    const [mapHeight, setMapHeight] = useState(15);
    const [currentMapData, setCurrentMapData] = useState([]);
    const [selectedTile, setSelectedTile] = useState(null);
    const [showGrid, setShowGrid] = useState(true);

    // Jauni stāvokļi
    const [isDragging, setIsDragging] = useState(false);
    const [brushSize, setBrushSize] = useState(1);
    const [activeTool, setActiveTool] = useState('brush');
    const [selection, setSelection] = useState(null);

    // Jauns stāvoklis priekš hover efekta
    const [hoverIndex, setHoverIndex] = useState(null);

    // Refs priekš resize loģikas
    const stateRef = useRef({ mapWidth, mapHeight, currentMapData });
    useEffect(() => {
        stateRef.current = { mapWidth, mapHeight, currentMapData };
    }, [mapWidth, mapHeight, currentMapData]);

    // Inicializējam tukšu karti pirmajā reizē
    useEffect(() => {
        const initialMap = Array(15 * 20).fill(null);
        setCurrentMapData(initialMap);
    }, []);

    const registryItems = Array.isArray(GameRegistry) ? GameRegistry : [];

    const blocks = registryItems.filter(item => item.name && item.name.startsWith('block.'));

    // Entities filtrēšana - parādīt tikai tās, kurām type="default" vai nav norādīts type
    const entities = registryItems.filter(item => {
        if (!item.name || !item.name.startsWith('entities.')) return false;
        return !item.type || item.type === 'default';
    });

    const items = registryItems.filter(item => item.name && item.name.startsWith('item.'));

    // Stili
    const baseButtonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: '1px solid #333',
        padding: '0 10px',
        height: '28px',
        backgroundColor: '#e0e0e0',
        marginRight: '5px',
        marginBottom: '5px',
        fontSize: '13px',
        color: '#000',
        borderRadius: '3px',
        userSelect: 'none',
        minWidth: '30px',
        boxSizing: 'border-box',
        textDecoration: 'none',
        lineHeight: 'normal'
    };

    const buttonStyle = { ...baseButtonStyle };
    const activeButtonStyle = { ...baseButtonStyle, backgroundColor: '#aaa', borderColor: '#000', fontWeight: 'bold' };

    const clearMap = () => {
        if (window.confirm("Are you sure you want to clear the map?")) {
            const emptyMap = Array(mapWidth * mapHeight).fill(null);
            setCurrentMapData(emptyMap);
        }
    };

    const saveMap = () => {
        const mapData = {
            width: mapWidth,
            height: mapHeight,
            tiles: currentMapData
        };
        const fileName = "level_01.json";
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
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
                    const loadedMap = JSON.parse(e.target.result);
                    if (loadedMap.width) setMapWidth(loadedMap.width);
                    if (loadedMap.height) setMapHeight(loadedMap.height);
                    if (loadedMap.tiles) setCurrentMapData(loadedMap.tiles);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                }
            };
        }
    };

    // --- Zīmēšanas loģika (Brush) ---
    const paintTile = (index) => {
        if (!selectedTile && activeTool === 'brush') return;

        const newData = [...currentMapData];
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
        setCurrentMapData(newData);
    };

    // --- Move Tool loģika ---
    const [dragStart, setDragStart] = useState(null);

    const handleGridMouseDown = (index, e) => {
        e.preventDefault();

        if (activeTool === 'brush') {
            setIsDragging(true);
            paintTile(index);
        } else if (activeTool === 'move') {
            const x = index % mapWidth;
            const y = Math.floor(index / mapWidth);
            setDragStart({ x, y });
            setSelection(null); 
            setIsDragging(true); // Svarīgi: aktivizējam vilkšanas stāvokli arī "rokai"
        }
    };

    const handleGridMouseEnter = (index) => {
        setHoverIndex(index); // Atjauninām hover index
        if (activeTool === 'brush' && isDragging) {
            paintTile(index);
        }
    };

    const handleGridMouseLeave = () => {
        setHoverIndex(null); // Kad pamet grid, noņemam highlight
    };

    const handleGridMouseUp = (index) => {
        setIsDragging(false);

        if (activeTool === 'move' && dragStart) {
            const endX = index % mapWidth;
            const endY = Math.floor(index / mapWidth);

            const x1 = Math.min(dragStart.x, endX);
            const y1 = Math.min(dragStart.y, endY);
            const x2 = Math.max(dragStart.x, endX);
            const y2 = Math.max(dragStart.y, endY);

            const w = x2 - x1 + 1;
            const h = y2 - y1 + 1;

            const selectionData = [];
            for(let py=0; py<h; py++) {
                for(let px=0; px<w; px++) {
                    const idx = (y1 + py) * mapWidth + (x1 + px);
                    selectionData.push(currentMapData[idx]);
                }
            }

            setSelection({ x: x1, y: y1, w, h, data: selectionData });
            setDragStart(null);
        }
    };

    // Pārvietošanas darbības
    const moveSelection = (dx, dy) => {
        if (!selection) return;

        const newMap = [...currentMapData];

        // 1. Izdzēšam veco vietu
        for(let py=0; py < selection.h; py++) {
            for(let px=0; px < selection.w; px++) {
                const idx = (selection.y + py) * mapWidth + (selection.x + px);
                if (idx >= 0 && idx < newMap.length) {
                    newMap[idx] = null;
                }
            }
        }

        // 2. Aprēķinam jauno pozīciju
        const newX = selection.x + dx;
        const newY = selection.y + dy;

        // 3. Iezīmējam jaunajā vietā
        for(let py=0; py < selection.h; py++) {
            for(let px=0; px < selection.w; px++) {
                const destX = newX + px;
                const destY = newY + py;

                if (destX >= 0 && destX < mapWidth && destY >= 0 && destY < mapHeight) {
                    const destIdx = destY * mapWidth + destX;
                    const srcDataIdx = py * selection.w + px;
                    newMap[destIdx] = selection.data[srcDataIdx];
                }
            }
        }

        setCurrentMapData(newMap);
        setSelection({ ...selection, x: newX, y: newY });
    };


    const resizeMapData = (newWidth, newHeight) => {
        const { mapWidth: oldW, mapHeight: oldH, currentMapData: oldData } = stateRef.current;
        if (newWidth < 1 || newHeight < 1) return;
        if (newWidth === oldW && newHeight === oldH) return;

        const newMapData = Array(newWidth * newHeight).fill(null);
        for (let y = 0; y < Math.min(oldH, newHeight); y++) {
            for (let x = 0; x < Math.min(oldW, newWidth); x++) {
                const oldIndex = y * oldW + x;
                const newIndex = y * newWidth + x;
                newMapData[newIndex] = oldData[oldIndex];
            }
        }
        setMapWidth(newWidth);
        setMapHeight(newHeight);
        setCurrentMapData(newMapData);
    };

    const handleResizeMouseDown = (direction) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const { mapWidth: startW, mapHeight: startH } = stateRef.current;
        const TILE_SIZE = 32;

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            if (direction === 'width') {
                const colsDiff = Math.round(dx / TILE_SIZE);
                const newW = startW + colsDiff;
                if (newW !== stateRef.current.mapWidth) resizeMapData(newW, stateRef.current.mapHeight);
            } else if (direction === 'height') {
                const rowsDiff = Math.round(dy / TILE_SIZE);
                const newH = startH + rowsDiff;
                if (newH !== stateRef.current.mapHeight) resizeMapData(stateRef.current.mapWidth, newH);
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const renderPaletteItem = (item, color) => (
        <div
            key={item.id}
            onClick={() => { setSelectedTile(item); setActiveTool('brush'); }}
            title={item.name}
            style={{
                border: selectedTile?.id === item.id ? `2px solid ${color}` : '1px solid #ccc',
                cursor: 'pointer',
                padding: '2px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff'
            }}
        >
            {item.textures && item.textures[0] ?
                <img src={item.textures[0]} alt={item.name} style={{maxWidth:'100%', maxHeight:'100%'}} /> :
                item.texture ?
                    <img src={item.texture} alt={item.name} style={{maxWidth:'100%', maxHeight:'100%'}} /> :
                    <span style={{fontSize:'10px', overflow:'hidden'}}>{item.name}</span>
            }
        </div>
    );

    return (
        <div className="editor-container" style={{ display: 'flex', height: '100vh', flexDirection: 'row' }}>
            <div className="toolbar" style={{ width: '280px', padding: '15px', borderRight: '1px solid #ccc', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f8f8' }}>
                <div style={{ marginBottom: '15px' }}>
                    <div style={{marginBottom: '10px'}}>
                        <button onClick={saveMap} style={buttonStyle}>Save</button>
                        <label style={buttonStyle}>
                            Load
                            <input type="file" accept=".json,.txt" onChange={loadMap} style={{display: 'none'}} />
                        </label>
                        <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? activeButtonStyle : buttonStyle}>#</button>
                        <button onClick={clearMap} style={{...buttonStyle, color: 'red'}} title="Clear Map">✕</button>
                    </div>

                    <div style={{borderTop: '1px solid #ddd', paddingTop: '10px', marginBottom: '10px'}}>
                        <span style={{fontSize: '12px', fontWeight: 'bold', display:'block', marginBottom:'5px'}}>TOOLS</span>

                        <button onClick={() => setActiveTool('brush')} style={activeTool === 'brush' ? activeButtonStyle : buttonStyle} title="Brush">
                            🖌️
                        </button>

                        <button onClick={() => setActiveTool('move')} style={activeTool === 'move' ? activeButtonStyle : buttonStyle} title="Move Area">
                            ✋
                        </button>

                        {activeTool === 'brush' && (
                            <div style={{marginTop: '5px'}}>
                                <span style={{fontSize: '11px', marginRight: '5px'}}>Size:</span>
                                <button onClick={() => setBrushSize(1)} style={brushSize === 1 ? activeButtonStyle : buttonStyle}>1</button>
                                <button onClick={() => setBrushSize(2)} style={brushSize === 2 ? activeButtonStyle : buttonStyle}>2</button>
                                <button onClick={() => setBrushSize(3)} style={brushSize === 3 ? activeButtonStyle : buttonStyle}>3</button>
                            </div>
                        )}

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
                    <h4>Blocks</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {blocks.map(b => renderPaletteItem(b, 'blue'))}
                    </div>

                    <h4>Entities</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {entities.map(e => renderPaletteItem(e, 'red'))}
                    </div>

                    <h4>Items</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {items.map(i => renderPaletteItem(i, 'green'))}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #ccc', fontSize: '12px' }}>
                    Size: <strong>{mapWidth} x {mapHeight}</strong> | Tool: <strong>{activeTool}</strong>
                </div>
            </div>

            <div
                className="viewport"
                style={{ flex: 1, padding: '40px', backgroundColor: '#555', overflow: 'auto', position: 'relative', userSelect: 'none' }}
                onMouseUp={() => setIsDragging(false)}
            >
                <div style={{ position: 'relative', width: 'fit-content' }} onMouseLeave={handleGridMouseLeave}>

                    <div
                        className="grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${mapWidth}, 32px)`,
                            gridTemplateRows: `repeat(${mapHeight}, 32px)`,
                            gap: showGrid ? '1px' : '0px',
                            border: '1px solid #222',
                            backgroundColor: '#222',
                            position: 'relative'
                        }}
                    >
                        {currentMapData.map((tileId, index) => {
                            const obj = registryItems.find(r => r.id === tileId);
                            let imgSrc = null;
                            if (obj) {
                                if (obj.texture) imgSrc = obj.texture;
                                else if (obj.textures && obj.textures.length > 0) imgSrc = obj.textures[0];
                            }

                            // Aprēķinām koordinātes
                            const x = index % mapWidth;
                            const y = Math.floor(index / mapWidth);

                            // 1. Selection Highlight (Move Tool - Finalized)
                            let isSelected = false;
                            if (selection) {
                                if (x >= selection.x && x < selection.x + selection.w &&
                                    y >= selection.y && y < selection.y + selection.h) {
                                    isSelected = true;
                                }
                            }

                            // 2. Move Tool Preview (Selecting & Hover)
                            let isMoveSelecting = false;
                            let isMoveHover = false;

                            if (activeTool === 'move') {
                                // Ja velkam (turot peli)
                                if (isDragging && dragStart && hoverIndex !== null) {
                                    const hx = hoverIndex % mapWidth;
                                    const hy = Math.floor(hoverIndex / mapWidth);
                                    
                                    const startX = dragStart.x;
                                    const startY = dragStart.y;

                                    // Aprēķinām taisnstūri starp sākuma punktu un pašreizējo peli
                                    const minX = Math.min(startX, hx);
                                    const minY = Math.min(startY, hy);
                                    const maxX = Math.max(startX, hx);
                                    const maxY = Math.max(startY, hy);

                                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                                        isMoveSelecting = true;
                                    }
                                } 
                                // Ja tikai kustinam peli (nevelkot)
                                else if (!isDragging && hoverIndex === index) {
                                    isMoveHover = true;
                                }
                            }

                            // 3. Brush Highlight (Brush Tool)
                            let isBrushTarget = false;
                            if (activeTool === 'brush' && hoverIndex !== null) {
                                const hx = hoverIndex % mapWidth;
                                const hy = Math.floor(hoverIndex / mapWidth);
                                
                                if (x >= hx && x < hx + brushSize &&
                                    y >= hy && y < hy + brushSize) {
                                    isBrushTarget = true;
                                }
                            }

                            // Nosakām stilus prioritārā secībā
                            let borderStyle = 'none';
                            let bgStyle = '#fff';

                            if (isBrushTarget) {
                                borderStyle = '2px solid red';
                                // bgStyle paliek balts vai caurspīdīgs, lai redzētu apakšā
                            } else if (isMoveHover) {
                                borderStyle = '2px solid blue'; // Zils rāmītis "rokai"
                            } else if (isMoveSelecting) {
                                borderStyle = '1px dashed blue';
                                bgStyle = 'rgba(0, 0, 255, 0.1)'; // Gaiši zils fons vilkšanas laikā
                            } else if (isSelected) {
                                borderStyle = '1px dashed red';
                                bgStyle = 'rgba(255, 255, 0, 0.3)';
                            }

                            return (
                                <div
                                    key={index}
                                    onMouseDown={(e) => handleGridMouseDown(index, e)}
                                    onMouseEnter={() => handleGridMouseEnter(index)}
                                    onMouseUp={() => handleGridMouseUp(index)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        backgroundColor: bgStyle,
                                        border: borderStyle,
                                        zIndex: (isBrushTarget || isMoveHover || isMoveSelecting) ? 20 : (isSelected ? 15 : 1),
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                    }}
                                >
                                    {imgSrc && <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} alt="" />}
                                    <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10}} />
                                </div>
                            );
                        })}
                    </div>

                    <div
                        onMouseDown={handleResizeMouseDown('width')}
                        style={{ position: 'absolute', top: 0, right: -15, width: '15px', height: '100%', backgroundColor: '#777', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTopRightRadius: '5px', borderBottomRightRadius: '5px' }}
                    >
                        <span style={{color: '#ccc', fontSize: '20px'}}>⋮</span>
                    </div>
                    <div
                        onMouseDown={handleResizeMouseDown('height')}
                        style={{ position: 'absolute', bottom: -15, left: 0, width: '100%', height: '15px', backgroundColor: '#777', cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: '5px', borderBottomRightRadius: '5px' }}
                    >
                        <span style={{color: '#ccc', fontSize: '20px'}}>⋯</span>
                    </div>

                </div>
            </div>
        </div>
    );
};
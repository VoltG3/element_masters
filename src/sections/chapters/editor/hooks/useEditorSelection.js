import { useState, useEffect } from 'react';

export const useEditorSelection = (mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, setTileMapData, setObjectMapData, setSecretMapData) => {
    const [selection, setSelection] = useState(null);
    const [selectionMode, setSelectionMode] = useState('cut'); // 'cut' or 'copy'
    const [previewPosition, setPreviewPosition] = useState(null);
    const [originalMapData, setOriginalMapData] = useState(null);

    // Keyboard handler for Enter (commit) and Escape (cancel)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selection) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSelection();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, previewPosition, originalMapData, selectionMode]);

    const moveSelection = (dx, dy) => {
        if (!selection || !previewPosition) return;
        setPreviewPosition({ 
            x: previewPosition.x + dx, 
            y: previewPosition.y + dy 
        });
    };

    const commitSelection = () => {
        if (!selection || !previewPosition || !originalMapData) return;

        const newTileMap = [...originalMapData.tileMap];
        const newObjectMap = [...originalMapData.objectMap];
        const newSecretMap = [...originalMapData.secretMap];

        // If cut mode, clear original position
        if (selectionMode === 'cut') {
            for (let py = 0; py < selection.h; py++) {
                for (let px = 0; px < selection.w; px++) {
                    const idx = (selection.originalY + py) * mapWidth + (selection.originalX + px);
                    if (idx >= 0 && idx < newTileMap.length) {
                        newTileMap[idx] = null;
                        newObjectMap[idx] = null;
                        newSecretMap[idx] = null;
                    }
                }
            }
        }

        // Place selection at new position
        for (let py = 0; py < selection.h; py++) {
            for (let px = 0; px < selection.w; px++) {
                const destX = previewPosition.x + px;
                const destY = previewPosition.y + py;
                if (destX >= 0 && destX < mapWidth && destY >= 0 && destY < mapHeight) {
                    const destIdx = destY * mapWidth + destX;
                    const srcDataIdx = py * selection.w + px;

                    newTileMap[destIdx] = selection.tileData[srcDataIdx];
                    newObjectMap[destIdx] = selection.objectData[srcDataIdx];
                    newSecretMap[destIdx] = selection.secretData?.[srcDataIdx] || null;
                }
            }
        }

        setTileMapData(newTileMap);
        setObjectMapData(newObjectMap);
        setSecretMapData(newSecretMap);
        setSelection(null);
        setPreviewPosition(null);
        setOriginalMapData(null);
    };

    const cancelSelection = () => {
        setSelection(null);
        setPreviewPosition(null);
        setOriginalMapData(null);
    };

    return {
        selection,
        setSelection,
        selectionMode,
        setSelectionMode,
        previewPosition,
        setPreviewPosition,
        originalMapData,
        setOriginalMapData,
        moveSelection,
        commitSelection,
        cancelSelection
    };
};

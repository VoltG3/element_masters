import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const EditorMapResizer = ({
    mapWidth,
    mapHeight,
    onResize
}) => {
    const { t } = useTranslation('editor_scene');
    const MIN_SIZE = 5;
    const MAX_WIDTH = 300;
    const MAX_HEIGHT = 100;
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startSize, setStartSize] = useState({ width: mapWidth, height: mapHeight });
    const [startMousePos, setStartMousePos] = useState({ x: 0, y: 0 });
    const [inputSize, setInputSize] = useState({ width: String(mapWidth), height: String(mapHeight) });

    useEffect(() => {
        setInputSize({ width: String(mapWidth), height: String(mapHeight) });
    }, [mapWidth, mapHeight]);

    // Calculate display size (each block is represented by 10px)
    const displayWidth = mapWidth * 10;
    const displayHeight = mapHeight * 10;

    const handleCornerMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setStartSize({ width: mapWidth, height: mapHeight });
        setStartMousePos({ x: e.clientX, y: e.clientY });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const dx = e.clientX - startMousePos.x;
            const dy = e.clientY - startMousePos.y;

            // Each 10px of drag = 1 block
            const blocksX = Math.round(dx / 10);
            const blocksY = Math.round(dy / 10);

            const newWidth = Math.max(MIN_SIZE, Math.min(MAX_WIDTH, startSize.width + blocksX));
            const newHeight = Math.max(MIN_SIZE, Math.min(MAX_HEIGHT, startSize.height + blocksY));

            if (newWidth !== mapWidth || newHeight !== mapHeight) {
                onResize(newWidth, newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, startMousePos, startSize, mapWidth, mapHeight, onResize]);

    const parseSize = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return null;
        return Math.round(parsed);
    };

    const applyInputResize = () => {
        const widthValue = parseSize(inputSize.width);
        const heightValue = parseSize(inputSize.height);

        if (widthValue === null || heightValue === null) {
            setInputSize({ width: String(mapWidth), height: String(mapHeight) });
            return;
        }

        const newWidth = Math.max(MIN_SIZE, Math.min(MAX_WIDTH, widthValue));
        const newHeight = Math.max(MIN_SIZE, Math.min(MAX_HEIGHT, heightValue));

        setInputSize({ width: String(newWidth), height: String(newHeight) });
        if (newWidth !== mapWidth || newHeight !== mapHeight) {
            onResize(newWidth, newHeight);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyInputResize();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
                {t('EDITOR_SCENE_RESIZER_LABEL')}{' '}
                <span style={{ color: '#4CAF50' }}>{mapWidth} x {mapHeight}</span>{' '}
                {t('EDITOR_SCENE_RESIZER_BLOCKS')}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#555' }}>
                    {t('EDITOR_SCENE_RESIZER_WIDTH')}
                    <input
                        type="number"
                        min={MIN_SIZE}
                        max={MAX_WIDTH}
                        step="1"
                        value={inputSize.width}
                        onChange={(e) => setInputSize(prev => ({ ...prev, width: e.target.value }))}
                        onKeyDown={handleInputKeyDown}
                        style={{ width: '72px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </label>
                <span style={{ fontSize: '14px', color: '#666', paddingBottom: '6px' }}>×</span>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#555' }}>
                    {t('EDITOR_SCENE_RESIZER_HEIGHT')}
                    <input
                        type="number"
                        min={MIN_SIZE}
                        max={MAX_HEIGHT}
                        step="1"
                        value={inputSize.height}
                        onChange={(e) => setInputSize(prev => ({ ...prev, height: e.target.value }))}
                        onKeyDown={handleInputKeyDown}
                        style={{ width: '72px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </label>
                <button
                    type="button"
                    onClick={applyInputResize}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #4CAF50',
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}
                >
                    {t('EDITOR_SCENE_RESIZER_APPLY')}
                </button>
            </div>

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: displayWidth + 'px',
                    height: displayHeight + 'px',
                    border: '2px solid #4CAF50',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#2e7d32',
                    fontWeight: 'bold',
                    userSelect: 'none',
                    minWidth: '50px',
                    minHeight: '50px'
                }}
            >
                {mapWidth} × {mapHeight}

                {/* Resize handle - bottom right corner */}
                <div
                    onMouseDown={handleCornerMouseDown}
                    style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        width: '15px',
                        height: '15px',
                        backgroundColor: '#4CAF50',
                        cursor: 'nwse-resize',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 10
                    }}
                />
            </div>

            <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                💡 {t('EDITOR_SCENE_RESIZER_HINT_LINE1')}<br/>
                {t('EDITOR_SCENE_RESIZER_HINT_LINE2')}
            </div>
        </div>
    );
};

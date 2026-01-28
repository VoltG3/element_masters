import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const EditorMapResizer = ({
    mapWidth,
    mapHeight,
    onResize
}) => {
    const { t } = useTranslation('editor_scene');
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startSize, setStartSize] = useState({ width: mapWidth, height: mapHeight });
    const [startMousePos, setStartMousePos] = useState({ x: 0, y: 0 });

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

            const newWidth = Math.max(5, Math.min(100, startSize.width + blocksX));
            const newHeight = Math.max(5, Math.min(100, startSize.height + blocksY));

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
                {t('EDITOR_SCENE_RESIZER_LABEL')}{' '}
                <span style={{ color: '#4CAF50' }}>{mapWidth} x {mapHeight}</span>{' '}
                {t('EDITOR_SCENE_RESIZER_BLOCKS')}
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

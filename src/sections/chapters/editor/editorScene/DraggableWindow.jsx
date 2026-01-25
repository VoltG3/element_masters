import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

let topZIndex = 1002;

export const DraggableWindow = ({
    title,
    children,
    defaultPosition = { x: 20, y: 20 },
    defaultWidth = 280,
    isOpenDefault = true,
    onHeightChange
}) => {
    const { t } = useTranslation('editor_scene');
    const [position] = useState(defaultPosition);
    const [zIndex, setZIndex] = useState(() => {
        topZIndex += 1;
        return topZIndex;
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [currentPosition, setCurrentPosition] = useState(defaultPosition);
    const [isMinimized, setIsMinimized] = useState(!isOpenDefault);
    const [isClosed, setIsClosed] = useState(false);
    const [hasBeenDragged, setHasBeenDragged] = useState(false);
    const windowRef = useRef(null);

    // Update position from parent when not dragged
    useEffect(() => {
        if (!hasBeenDragged) {
            setCurrentPosition(defaultPosition);
        }
    }, [defaultPosition, hasBeenDragged]);

    const lastHeightRef = useRef(0);

    // Notify parent about height changes
    useEffect(() => {
        if (windowRef.current && onHeightChange) {
            const height = windowRef.current.offsetHeight;
            if (height !== lastHeightRef.current) {
                lastHeightRef.current = height;
                onHeightChange(height);
            }
        }
    });

    useEffect(() => {
        if (isDragging) {
            const handleMouseMove = (e) => {
                setCurrentPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
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
        }
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e) => {
        if (windowRef.current) {
            topZIndex += 1;
            setZIndex(topZIndex);
            const rect = windowRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDragging(true);
            setHasBeenDragged(true);
        }
    };

    if (isClosed) return null;

    return (
        <div
            ref={windowRef}
            style={{
                position: 'fixed',
                left: currentPosition.x,
                top: currentPosition.y,
                width: defaultWidth,
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: zIndex,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh',
                overflow: 'hidden'
            }}
        >
            {/* Window Header */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    padding: '12px 15px',
                    backgroundColor: '#fff',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                    borderBottom: '2px solid #eee',
                    color: '#333'
                }}
            >
                <span>{title}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(!isMinimized);
                        }}
                        style={{
                            background: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            color: '#333'
                        }}
                        title={isMinimized ? t('EDITOR_SCENE_WINDOW_MAXIMIZE') : t('EDITOR_SCENE_WINDOW_MINIMIZE')}
                    >
                        {isMinimized ? '□' : '−'}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsClosed(true);
                        }}
                        style={{
                            background: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            color: '#333',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                        title={t('EDITOR_SCENE_WINDOW_CLOSE')}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Window Content */}
            {!isMinimized && (
                <div
                    style={{
                        padding: '15px',
                        overflowY: 'auto',
                        flex: 1
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
};

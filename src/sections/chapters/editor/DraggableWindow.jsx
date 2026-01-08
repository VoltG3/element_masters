import React, { useState, useRef, useEffect } from 'react';

export const DraggableWindow = ({
    title,
    children,
    defaultPosition = { x: 20, y: 20 },
    defaultWidth = 280,
    isOpenDefault = true,
    onHeightChange
}) => {
    const [position] = useState(defaultPosition);
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

    // Notify parent about height changes
    useEffect(() => {
        if (windowRef.current && onHeightChange) {
            const height = windowRef.current.offsetHeight;
            onHeightChange(height);
        }
    }, [isMinimized, onHeightChange]);

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
                backgroundColor: '#f8f8f8',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh'
            }}
        >
            {/* Window Header */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    padding: '8px 10px',
                    backgroundColor: '#e0e0e0',
                    borderTopLeftRadius: '4px',
                    borderTopRightRadius: '4px',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                    borderBottom: '1px solid #ccc'
                }}
            >
                <span>{title}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(!isMinimized);
                        }}
                        style={{
                            background: '#ffc107',
                            border: 'none',
                            borderRadius: '2px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                        title={isMinimized ? "Maximize" : "Minimize"}
                    >
                        {isMinimized ? '▢' : '−'}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsClosed(true);
                        }}
                        style={{
                            background: '#f44336',
                            border: 'none',
                            borderRadius: '2px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Window Content */}
            {!isMinimized && (
                <div
                    style={{
                        padding: '10px',
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

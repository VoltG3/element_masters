import React, { useState } from 'react';
import { DraggableWindow } from './editorScene/DraggableWindow';
import { EditorMapResizer } from './editorScene/EditorMapResizer';
import { Minimap } from './editorScene/Minimap';
import { sidebarButtonStyle, activeSidebarButtonStyle } from './styles/EditorSceneButtonStyle';

export const EditorScene = ({
    handleMapResize,
    isResizeWindowOpen,
    setIsResizeWindowOpen,
    mapWidth,
    mapHeight,
    tileMapData,
    objectMapData,
    objectMetadata,
    registryItems
}) => {
    const [isMinimapOpen, setIsMinimapOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const rightSidebarStyle = {
        position: 'absolute',
        top: '70px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1001
    };

    return (
        <div style={{ display: 'contents' }}>
            {/* Right side buttons */}
            <div style={rightSidebarStyle}>
                <div onClick={() => setIsMinimapOpen(!isMinimapOpen)} style={isMinimapOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Minimap">🗺️</div>
                <div onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={isSettingsOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Settings">🛠️</div>
                <div onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} style={isResizeWindowOpen ? activeSidebarButtonStyle : sidebarButtonStyle} title="Resize Map">📐</div>
            </div>

            {/* Floating Windows (Minimap / Settings) */}
            {isMinimapOpen && (
                <DraggableWindow
                    title="Minimap"
                    defaultPosition={{ x: window.innerWidth - 340, y: 80 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsMinimapOpen(false)}
                >
                    <Minimap
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        tileMapData={tileMapData}
                        objectMapData={objectMapData}
                        objectMetadata={objectMetadata}
                        registryItems={registryItems}
                    />
                </DraggableWindow>
            )}

            {isSettingsOpen && (
                <DraggableWindow
                    title="Settings"
                    defaultPosition={{ x: window.innerWidth - 340, y: 400 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsSettingsOpen(false)}
                >
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>empty</div>
                </DraggableWindow>
            )}

            {isResizeWindowOpen && (
                <DraggableWindow
                    title="Resize Map"
                    defaultPosition={{ x: 400, y: 100 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsResizeWindowOpen(false)}
                >
                    <EditorMapResizer
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        onResize={handleMapResize}
                    />
                </DraggableWindow>
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { DraggableWindow } from './editorScene/DraggableWindow';
import { EditorMapResizer } from './editorScene/EditorMapResizer';
import { Minimap } from './editorScene/Minimap';
import { ElementEditorButton, RightSidebarContainer } from './styles/EditorSceneButtonStyle';

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

    return (
        <div style={{ display: 'contents' }}>
            {/* Right side buttons */}
            <RightSidebarContainer>
                <ElementEditorButton onClick={() => setIsMinimapOpen(!isMinimapOpen)} $active={isMinimapOpen} title="Minimap">🗺️</ElementEditorButton>
                <ElementEditorButton onClick={() => setIsSettingsOpen(!isSettingsOpen)} $active={isSettingsOpen} title="Settings">🛠️</ElementEditorButton>
                <ElementEditorButton onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} $active={isResizeWindowOpen} title="Resize Map">📐</ElementEditorButton>
            </RightSidebarContainer>

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

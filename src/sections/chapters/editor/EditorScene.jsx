import React, { useState } from 'react';
import { DraggableWindow } from './editorScene/DraggableWindow';
import { EditorMapResizer } from './editorScene/EditorMapResizer';
import { Minimap } from './editorScene/Minimap';
import { WorldView } from './editorScene/WorldView';
import { BackgroundPanel } from './editorScene/BackgroundPanel';
import { MusicPanel } from './editorScene/MusicPanel';
import { WeatherPanel } from './editorScene/WeatherPanel';
import { SceneEditorButton, RightSidebarContainer } from './styles/EditorSceneButtonStyle';

export const EditorScene = ({
    handleMapResize,
    isResizeWindowOpen,
    setIsResizeWindowOpen,
    mapWidth,
    mapHeight,
    tileMapData,
    objectMapData,
    objectMetadata,
    registryItems,
    backgroundOptions,
    selectedBackgroundImage,
    setSelectedBackgroundImage,
    selectedBackgroundColor,
    setSelectedBackgroundColor,
    backgroundParallaxFactor,
    setBackgroundParallaxFactor,
    musicOptions,
    selectedBackgroundMusic,
    setSelectedBackgroundMusic,
    weatherRain,
    setWeatherRain,
    weatherSnow,
    setWeatherSnow,
    weatherClouds,
    setWeatherClouds,
    weatherFog,
    setWeatherFog,
    weatherThunder,
    setWeatherThunder,
    // New props for multi-map
    maps,
    activeMapId,
    switchMap,
    createMap,
    deleteMap,
    updateMapData
}) => {
    const [isMinimapOpen, setIsMinimapOpen] = useState(false);
    const [isWorldViewOpen, setIsWorldViewOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
    const [isMusicOpen, setIsMusicOpen] = useState(false);

    return (
        <div style={{ display: 'contents' }}>
            {/* Right side buttons */}
            <RightSidebarContainer>
                <SceneEditorButton onClick={() => setIsMinimapOpen(!isMinimapOpen)} $active={isMinimapOpen} title="Maps & Minimap">🗺️</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsWorldViewOpen(!isWorldViewOpen)} $active={isWorldViewOpen} title="Project World View">🌐</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsBackgroundOpen(!isBackgroundOpen)} $active={isBackgroundOpen} title="Background">🖼️</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsMusicOpen(!isMusicOpen)} $active={isMusicOpen} title="Music">
                    <span style={{ color: '#fff' }}>𝄞</span>
                </SceneEditorButton>
                <SceneEditorButton onClick={() => setIsSettingsOpen(!isSettingsOpen)} $active={isSettingsOpen} title="Settings">🛠️</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} $active={isResizeWindowOpen} title="Resize Map">📐</SceneEditorButton>
            </RightSidebarContainer>

            {/* Floating Windows */}
            {isMinimapOpen && (
                <DraggableWindow
                    title="Active Map Minimap"
                    defaultPosition={{ x: window.innerWidth - 340, y: 80 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsMinimapOpen(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '5px' }}>
                        <Minimap
                            mapWidth={mapWidth}
                            mapHeight={mapHeight}
                            tileMapData={tileMapData}
                            objectMapData={objectMapData}
                            objectMetadata={objectMetadata}
                            registryItems={registryItems}
                            backgroundColor={selectedBackgroundColor}
                        />
                        <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
                            {maps[activeMapId]?.name || 'Current Map'}
                        </div>
                    </div>
                </DraggableWindow>
            )}

            {isWorldViewOpen && (
                <DraggableWindow
                    title="Project World View"
                    defaultPosition={{ x: 100, y: 100 }}
                    defaultWidth={800}
                    isOpenDefault={true}
                    onClose={() => setIsWorldViewOpen(false)}
                >
                    <WorldView 
                        maps={maps}
                        activeMapId={activeMapId}
                        switchMap={switchMap}
                        registryItems={registryItems}
                        createMap={createMap}
                        deleteMap={deleteMap}
                        updateMapData={updateMapData}
                        // Current map live data
                        currentMapData={{
                            id: activeMapId,
                            mapWidth,
                            mapHeight,
                            tileMapData,
                            objectMapData,
                            objectMetadata,
                            selectedBackgroundColor
                        }}
                    />
                </DraggableWindow>
            )}

            {isBackgroundOpen && (
                <DraggableWindow
                    title="Background"
                    defaultPosition={{ x: window.innerWidth - 340, y: 80 }}
                    defaultWidth={320}
                    isOpenDefault={true}
                    onClose={() => setIsBackgroundOpen(false)}
                >
                    <BackgroundPanel 
                        backgroundOptions={backgroundOptions}
                        selectedBackgroundImage={selectedBackgroundImage}
                        setSelectedBackgroundImage={setSelectedBackgroundImage}
                        selectedBackgroundColor={selectedBackgroundColor}
                        backgroundParallaxFactor={backgroundParallaxFactor}
                        setBackgroundParallaxFactor={setBackgroundParallaxFactor}
                    />
                </DraggableWindow>
            )}

            {isMusicOpen && (
                <DraggableWindow
                    title="Music"
                    defaultPosition={{ x: window.innerWidth - 340, y: 300 }}
                    defaultWidth={320}
                    isOpenDefault={true}
                    onClose={() => setIsMusicOpen(false)}
                >
                    <MusicPanel 
                        musicOptions={musicOptions}
                        selectedBackgroundMusic={selectedBackgroundMusic}
                        setSelectedBackgroundMusic={setSelectedBackgroundMusic}
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
                    <WeatherPanel 
                        weatherRain={weatherRain}
                        setWeatherRain={setWeatherRain}
                        weatherSnow={weatherSnow}
                        setWeatherSnow={setWeatherSnow}
                        weatherClouds={weatherClouds}
                        setWeatherClouds={setWeatherClouds}
                        weatherFog={weatherFog}
                        setWeatherFog={setWeatherFog}
                        weatherThunder={weatherThunder}
                        setWeatherThunder={setWeatherThunder}
                    />
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

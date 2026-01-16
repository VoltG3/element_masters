import React, { useState } from 'react';
import { DraggableWindow } from './editorScene/DraggableWindow';
import { EditorMapResizer } from './editorScene/EditorMapResizer';
import { Minimap } from './editorScene/Minimap';
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
    createMap
}) => {
    const [isMinimapOpen, setIsMinimapOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
    const [isMusicOpen, setIsMusicOpen] = useState(false);

    return (
        <div style={{ display: 'contents' }}>
            {/* Right side buttons */}
            <RightSidebarContainer>
                <SceneEditorButton onClick={() => setIsMinimapOpen(!isMinimapOpen)} $active={isMinimapOpen} title="Maps & Minimap">🗺️</SceneEditorButton>
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
                    title="Maps & Minimap"
                    defaultPosition={{ x: window.innerWidth - 340, y: 80 }}
                    defaultWidth={300}
                    isOpenDefault={true}
                    onClose={() => setIsMinimapOpen(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '5px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                                onClick={() => createMap('overworld')}
                                style={{ flex: 1, padding: '5px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px' }}
                            >
                                + Overworld
                            </button>
                            <button 
                                onClick={() => createMap('underworld')}
                                style={{ flex: 1, padding: '5px', cursor: 'pointer', backgroundColor: '#5D4037', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px' }}
                            >
                                + Underworld
                            </button>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {Object.values(maps).map(map => (
                                <div key={map.id} onClick={() => switchMap(map.id)} style={{ cursor: 'pointer', border: activeMapId === map.id ? '2px solid #e3de0a' : '1px solid #555', padding: '2px', borderRadius: '4px', backgroundColor: activeMapId === map.id ? '#444' : 'transparent' }}>
                                    <div style={{ fontSize: '12px', color: '#fff', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{map.name} ({map.type})</span>
                                        {activeMapId === map.id && <span style={{ color: '#e3de0a' }}>● Active</span>}
                                    </div>
                                    <Minimap
                                        mapWidth={map.mapWidth}
                                        mapHeight={map.mapHeight}
                                        tileMapData={map.tileMapData}
                                        objectMapData={map.objectMapData}
                                        objectMetadata={map.objectMetadata}
                                        registryItems={registryItems}
                                        backgroundColor={map.selectedBackgroundColor}
                                        // For the active map, use current data from props (live preview)
                                        {...(activeMapId === map.id ? {
                                            mapWidth,
                                            mapHeight,
                                            tileMapData,
                                            objectMapData,
                                            objectMetadata,
                                            backgroundColor: selectedBackgroundColor
                                        } : {})}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
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

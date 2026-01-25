import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './editorScene/DraggableWindow';
import { EditorMapResizer } from './editorScene/EditorMapResizer';
import { Minimap } from './editorScene/Minimap';
import { WorldView } from './editorScene/WorldView';
import { BackgroundPanel } from './editorScene/BackgroundPanel';
import { MusicPanel } from './editorScene/MusicPanel';
import { WeatherPanel } from './editorScene/WeatherPanel';
import { SceneEditorButton, RightSidebarContainer } from './styles/EditorSceneButtonStyle';
import BackgroundMusicPlayer from '../../../utilities/BackgroundMusicPlayer';

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
    weatherLavaRain,
    setWeatherLavaRain,
    weatherRadioactiveFog,
    setWeatherRadioactiveFog,
    weatherMeteorRain,
    setWeatherMeteorRain,
    // New props for multi-map
    maps,
    activeMapId,
    switchMap,
    createMap,
    deleteMap,
    updateMapData,
    isWorldViewOpen,
    setIsWorldViewOpen,
    onAddRoomArea,
    showRoomMapContent,
    activeRoomIds
}) => {
    const { t } = useTranslation('editor_scene');
    const [isMinimapOpen, setIsMinimapOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
    const [isMusicOpen, setIsMusicOpen] = useState(false);

    return (
        <div style={{ display: 'contents' }}>
            <BackgroundMusicPlayer 
                metaPath={selectedBackgroundMusic} 
                enabled={true} 
                volume={0.4} 
                isInsideRoom={activeRoomIds?.length > 0}
            />
            {/* Right side buttons */}
            <RightSidebarContainer>
                <SceneEditorButton onClick={() => setIsMinimapOpen(!isMinimapOpen)} $active={isMinimapOpen} title={t('EDITOR_SCENE_BUTTON_MAPS_MINIMAP')}>🗺️</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsWorldViewOpen(!isWorldViewOpen)} $active={isWorldViewOpen} title={t('EDITOR_SCENE_BUTTON_WORLD_VIEW')}>🌐</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsBackgroundOpen(!isBackgroundOpen)} $active={isBackgroundOpen} title={t('EDITOR_SCENE_BUTTON_BACKGROUND')}>🖼️</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsMusicOpen(!isMusicOpen)} $active={isMusicOpen} title={t('EDITOR_SCENE_BUTTON_MUSIC')}>
                    <span style={{ color: '#fff' }}>𝄞</span>
                </SceneEditorButton>
                <SceneEditorButton onClick={() => setIsSettingsOpen(!isSettingsOpen)} $active={isSettingsOpen} title={t('EDITOR_SCENE_BUTTON_SETTINGS')}>🛠️</SceneEditorButton>
                <SceneEditorButton onClick={() => setIsResizeWindowOpen(!isResizeWindowOpen)} $active={isResizeWindowOpen} title={t('EDITOR_SCENE_BUTTON_RESIZE')}>📐</SceneEditorButton>
            </RightSidebarContainer>

            {/* Floating Windows */}
            {isMinimapOpen && (
                <DraggableWindow
                    title={t('EDITOR_SCENE_WINDOW_MINIMAP')}
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
                            {maps[activeMapId]?.name || t('EDITOR_SCENE_MINIMAP_CURRENT_MAP')}
                        </div>
                    </div>
                </DraggableWindow>
            )}

            {isWorldViewOpen && (
                <DraggableWindow
                    title={t('EDITOR_SCENE_WINDOW_WORLD_VIEW')}
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
                        onAddRoomArea={onAddRoomArea}
                        showRoomMapContent={showRoomMapContent}
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
                    title={t('EDITOR_SCENE_WINDOW_BACKGROUND')}
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
                    title={t('EDITOR_SCENE_WINDOW_MUSIC')}
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
                    title={t('EDITOR_SCENE_WINDOW_SETTINGS')}
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
                        weatherLavaRain={weatherLavaRain}
                        setWeatherLavaRain={setWeatherLavaRain}
                        weatherRadioactiveFog={weatherRadioactiveFog}
                        setWeatherRadioactiveFog={setWeatherRadioactiveFog}
                        weatherMeteorRain={weatherMeteorRain}
                        setWeatherMeteorRain={setWeatherMeteorRain}
                    />
                </DraggableWindow>
            )}

            {isResizeWindowOpen && (
                <DraggableWindow
                    title={t('EDITOR_SCENE_WINDOW_RESIZE')}
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

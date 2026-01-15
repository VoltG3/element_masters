import { useCallback } from 'react';
import { saveMap, loadMap, clearMap } from '../editorTools/mapOperations';

export const useEditorOperations = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
    mapName, creatorName, createdAt,
    selectedBackgroundImage, selectedBackgroundColor,
    backgroundParallaxFactor, selectedBackgroundMusic,
    registryItems, setCreatedAt,
    setMapWidth, setMapHeight, setMapName, setCreatorName,
    setSelectedBackgroundImage, setSelectedBackgroundColor,
    setBackgroundParallaxFactor, setSelectedBackgroundMusic,
    setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
    setIsNewMapModalOpen, setTempMapName, setTempCreatorName,
    weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
    setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder
) => {
    const handleSaveMap = useCallback(() => {
        saveMap({
            mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
            mapName, creatorName, createdAt,
            selectedBackgroundImage, selectedBackgroundColor,
            backgroundParallaxFactor, selectedBackgroundMusic,
            registryItems, setCreatedAt,
            weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder
        });
    }, [
        mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
        mapName, creatorName, createdAt,
        selectedBackgroundImage, selectedBackgroundColor,
        backgroundParallaxFactor, selectedBackgroundMusic,
        registryItems, setCreatedAt,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder
    ]);

    const handleLoadMap = useCallback((event) => {
        loadMap({
            event, setMapWidth, setMapHeight, setMapName, setCreatorName,
            setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
            setBackgroundParallaxFactor, setSelectedBackgroundMusic,
            setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
            setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder
        });
    }, [
        setMapWidth, setMapHeight, setMapName, setCreatorName,
        setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
        setBackgroundParallaxFactor, setSelectedBackgroundMusic,
        setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
        setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder
    ]);

    const handleClearMap = useCallback(() => {
        clearMap({ 
            mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata 
        });
    }, [mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata]);

    const openNewMapModal = () => {
        setTempMapName(mapName);
        setTempCreatorName(creatorName);
        setIsNewMapModalOpen(true);
    };

    const confirmNewMap = (tempMapName, tempCreatorName) => {
        setMapName(tempMapName || "New Map");
        setCreatorName(tempCreatorName || "Anonymous");
        setCreatedAt(new Date().toISOString());
        
        const size = mapWidth * mapHeight;
        setTileMapData(Array(size).fill(null));
        setObjectMapData(Array(size).fill(null));
        setSecretMapData(Array(size).fill(null));
        setObjectMetadata({});
        
        setIsNewMapModalOpen(false);
    };

    return {
        handleSaveMap,
        handleLoadMap,
        handleClearMap,
        openNewMapModal,
        confirmNewMap
    };
};

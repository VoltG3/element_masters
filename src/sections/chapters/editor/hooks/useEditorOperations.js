import { useCallback } from 'react';
import { saveMap, loadMap, loadBuiltInMap, clearMap } from '../editorTools/mapOperations';

export const useEditorOperations = (
    mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
    mapName, creatorName, mapDescription, createdAt,
    selectedBackgroundImage, selectedBackgroundColor,
    backgroundParallaxFactor, selectedBackgroundMusic, playerPosition,
    registryItems, setCreatedAt,
    setMapWidth, setMapHeight, setMapName, setCreatorName, setMapDescription,
    setSelectedBackgroundImage, setSelectedBackgroundColor,
    setBackgroundParallaxFactor, setSelectedBackgroundMusic, setPlayerPosition,
    setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
    setIsNewMapModalOpen, setTempMapName, setTempCreatorName, setTempMapDescription,
    weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
    weatherLavaRain, weatherRadioactiveFog, weatherMeteorRain,
    setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder,
    setWeatherLavaRain, setWeatherRadioactiveFog, setWeatherMeteorRain,
    // Multi-map props
    maps, setMaps, activeMapId, setActiveMapId
) => {
    const handleSaveMap = useCallback(() => {
        // Construct the updated maps object with current active map data
        // to ensure latest changes are saved even if debounce hasn't run
        const currentMapData = {
            ...maps[activeMapId],
            mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
            name: mapName,
            description: mapDescription,
            selectedBackgroundImage, selectedBackgroundColor,
            backgroundParallaxFactor, selectedBackgroundMusic,
            weather: {
                rain: weatherRain,
                snow: weatherSnow,
                clouds: weatherClouds,
                fog: weatherFog,
                thunder: weatherThunder,
                lavaRain: weatherLavaRain,
                radioactiveFog: weatherRadioactiveFog,
                meteorRain: weatherMeteorRain
            },
            playerPosition
        };

        const updatedMaps = {
            ...maps,
            [activeMapId]: currentMapData
        };

        saveMap({
            maps: updatedMaps, 
            activeMapId,
            mapName, creatorName, mapDescription, createdAt,
            registryItems, setCreatedAt
        });
    }, [
        maps, activeMapId, mapWidth, mapHeight, tileMapData, objectMapData, secretMapData, objectMetadata,
        mapName, creatorName, mapDescription, createdAt, selectedBackgroundImage, selectedBackgroundColor,
        backgroundParallaxFactor, selectedBackgroundMusic, playerPosition, registryItems, setCreatedAt,
        weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder,
        weatherLavaRain, weatherRadioactiveFog, weatherMeteorRain
    ]);

    const handleLoadMap = useCallback((event) => {
        loadMap({
            event, setMapWidth, setMapHeight, setMapName, setCreatorName, setMapDescription,
            setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
            setBackgroundParallaxFactor, setSelectedBackgroundMusic, setPlayerPosition,
            setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
            setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder,
            setWeatherLavaRain, setWeatherRadioactiveFog, setWeatherMeteorRain,
            setMaps, setActiveMapId
        });
    }, [
        setMapWidth, setMapHeight, setMapName, setCreatorName, setMapDescription,
        setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
        setBackgroundParallaxFactor, setSelectedBackgroundMusic, setPlayerPosition,
        setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
        setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder,
        setWeatherLavaRain, setWeatherRadioactiveFog, setWeatherMeteorRain,
        setMaps, setActiveMapId
    ]);

    const handleLoadBuiltInMap = useCallback((mapData) => {
        loadBuiltInMap({
            mapData, setMapWidth, setMapHeight, setMapName, setCreatorName, setMapDescription,
            setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
            setBackgroundParallaxFactor, setSelectedBackgroundMusic, setPlayerPosition,
            setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
            setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder,
            setWeatherLavaRain, setWeatherRadioactiveFog, setWeatherMeteorRain,
            setMaps, setActiveMapId
        });
    }, [
        setMapWidth, setMapHeight, setMapName, setCreatorName, setMapDescription,
        setCreatedAt, setSelectedBackgroundImage, setSelectedBackgroundColor,
        setBackgroundParallaxFactor, setSelectedBackgroundMusic, setPlayerPosition,
        setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata,
        setWeatherRain, setWeatherSnow, setWeatherClouds, setWeatherFog, setWeatherThunder,
        setWeatherLavaRain, setWeatherRadioactiveFog, setWeatherMeteorRain,
        setMaps, setActiveMapId
    ]);

    const handleClearMap = useCallback(() => {
        clearMap({ 
            mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata 
        });
    }, [mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata]);

    const openNewMapModal = () => {
        setTempMapName(mapName);
        setTempCreatorName(creatorName);
        setTempMapDescription(mapDescription);
        setIsNewMapModalOpen(true);
    };

    const confirmNewMap = (tempMapName, tempCreatorName, tempMapDescription) => {
        setMapName(tempMapName || "New Map");
        setCreatorName(tempCreatorName || "Anonymous");
        setMapDescription(tempMapDescription || "");
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
        handleLoadBuiltInMap,
        handleClearMap,
        openNewMapModal,
        confirmNewMap
    };
};

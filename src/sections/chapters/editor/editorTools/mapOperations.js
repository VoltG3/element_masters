import saveFile from '../../../../utilities/saveFile';
import errorHandler from '../../../../services/errorHandler';

export const saveMap = async ({
    maps,
    activeMapId,
    mapName,
    creatorName,
    createdAt,
    registryItems,
    setCreatedAt
}) => {
    const currentDate = new Date().toISOString();
    const createdDate = createdAt || currentDate;

    const projectData = {
        meta: {
            version: "2.0",
            projectName: mapName,
            author: creatorName,
            date_created: createdDate,
            date_last_updated: currentDate,
            activeMapId: activeMapId
        },
        maps: {}
    };

    // Serialize all maps
    Object.values(maps).forEach(map => {
        const filledBlocks = map.tileMapData.filter(t => t !== null).length;
        const objectsCount = map.objectMapData.filter(o => o !== null).length;
        
        projectData.maps[map.id] = {
            id: map.id,
            name: map.name,
            type: map.type,
            width: map.mapWidth,
            height: map.mapHeight,
            backgroundImage: map.selectedBackgroundImage || null,
            backgroundColor: map.selectedBackgroundColor || null,
            backgroundParallaxFactor: map.backgroundParallaxFactor || 0.3,
            backgroundMusic: map.selectedBackgroundMusic || null,
            weather: map.weather || { rain: 0, snow: 0, clouds: 0, fog: 0, thunder: 0 },
            objectMetadata: map.objectMetadata || {},
            playerPosition: map.playerPosition || null,
            worldX: map.worldX || 0,
            worldY: map.worldY || 0,
            statistics: {
                total_tiles: map.mapWidth * map.mapHeight,
                filled_tiles: filledBlocks,
                total_objects: objectsCount
            },
            layers: [
                { type: "tile", name: "background", data: map.tileMapData },
                { type: "object", name: "entities", data: map.objectMapData },
                { type: "secret", name: "secrets", data: map.secretMapData || Array(map.mapWidth * map.mapHeight).fill(null) }
            ]
        };
    });

    const fileName = `${mapName.replace(/\s+/g, '_')}.json`;
    const json = JSON.stringify(projectData, null, 2);

    try {
        const saved = await saveFile(json, fileName, 'application/json');
        if (saved) {
            if (!createdAt) setCreatedAt(currentDate);
            errorHandler.info('Project saved successfully', {
                component: 'Editor',
                projectName: mapName,
                fileName,
                mapsCount: Object.keys(maps).length
            });
        }
    } catch (error) {
        errorHandler.error(error, {
            component: 'Editor',
            function: 'saveMap',
            mapName,
            fileName
        });
        alert('Failed to save project. Check console for details.');
    }
};

export const loadMap = ({
    event,
    setMapWidth,
    setMapHeight,
    setMapName,
    setCreatorName,
    setCreatedAt,
    setSelectedBackgroundImage,
    setSelectedBackgroundColor,
    setBackgroundParallaxFactor,
    setSelectedBackgroundMusic,
    setTileMapData,
    setObjectMapData,
    setSecretMapData,
    setObjectMetadata,
    setWeatherRain,
    setWeatherSnow,
    setWeatherClouds,
    setWeatherFog,
    setWeatherThunder,
    // Multi-map setters
    setMaps,
    setActiveMapId
}) => {
    const fileReader = new FileReader();
    const file = event.target.files[0];
    if (file) {
        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = (e) => {
            try {
                const loaded = JSON.parse(e.target.result);
                
                // Check for multi-map format (version 2.0)
                if (loaded.meta && loaded.meta.version === "2.0" && loaded.maps) {
                    const projectMaps = {};
                    
                    Object.keys(loaded.maps).forEach(mapId => {
                        const m = loaded.maps[mapId];
                        const bgLayer = m.layers.find(l => l.type === 'tile');
                        const objLayer = m.layers.find(l => l.type === 'object');
                        const secretLayer = m.layers.find(l => l.type === 'secret');
                        
                        projectMaps[mapId] = {
                            id: mapId,
                            name: m.name,
                            type: m.type || 'overworld',
                            mapWidth: m.width,
                            mapHeight: m.height,
                            tileMapData: bgLayer ? bgLayer.data : Array(m.width * m.height).fill(null),
                            objectMapData: objLayer ? objLayer.data : Array(m.width * m.height).fill(null),
                            secretMapData: secretLayer ? secretLayer.data : Array(m.width * m.height).fill(null),
                            objectMetadata: m.objectMetadata || {},
                            selectedBackgroundImage: m.backgroundImage,
                            selectedBackgroundColor: m.backgroundColor,
                            backgroundParallaxFactor: m.backgroundParallaxFactor || 0.3,
                            selectedBackgroundMusic: m.backgroundMusic,
                            weather: m.weather || { rain: 0, snow: 0, clouds: 0, fog: 0, thunder: 0 },
                            playerPosition: m.playerPosition || null,
                            worldX: m.worldX || 0,
                            worldY: m.worldY || 0
                        };
                    });
                    
                    setMaps(projectMaps);
                    setMapName(loaded.meta.projectName || "Loaded Project");
                    setCreatorName(loaded.meta.author || "Anonymous");
                    setCreatedAt(loaded.meta.date_created || new Date().toISOString());
                    
                    const activeId = loaded.meta.activeMapId || Object.keys(projectMaps)[0];
                    setActiveMapId(activeId);
                    
                    const activeMap = projectMaps[activeId];
                    if (activeMap) {
                        setMapWidth(activeMap.mapWidth);
                        setMapHeight(activeMap.mapHeight);
                        setTileMapData(activeMap.tileMapData);
                        setObjectMapData(activeMap.objectMapData);
                        setSecretMapData(activeMap.secretMapData);
                        setObjectMetadata(activeMap.objectMetadata);
                        setSelectedBackgroundImage(activeMap.selectedBackgroundImage);
                        setSelectedBackgroundColor(activeMap.selectedBackgroundColor);
                        setBackgroundParallaxFactor(activeMap.backgroundParallaxFactor);
                        setSelectedBackgroundMusic(activeMap.selectedBackgroundMusic);
                        
                        setWeatherRain(activeMap.weather.rain);
                        setWeatherSnow(activeMap.weather.snow);
                        setWeatherClouds(activeMap.weather.clouds);
                        setWeatherFog(activeMap.weather.fog);
                        setWeatherThunder(activeMap.weather.thunder);
                    }
                    
                    errorHandler.info('Project loaded successfully', {
                        component: 'Editor',
                        projectName: loaded.meta.projectName
                    });
                } else if (loaded.meta) {
                    // Legacy 1.0 format
                    setMapWidth(loaded.meta.width);
                    setMapHeight(loaded.meta.height);

                    if (loaded.meta.name) setMapName(loaded.meta.name);
                    if (loaded.meta.author) setCreatorName(loaded.meta.author);
                    if (loaded.meta.date_map_created_at) setCreatedAt(loaded.meta.date_map_created_at);

                    const bgLayer = loaded.layers.find(l => l.name === 'background');
                    const objLayer = loaded.layers.find(l => l.name === 'entities');
                    const secretLayer = loaded.layers.find(l => l.name === 'secrets');
                    
                    const singleMap = {
                        id: 'main',
                        name: loaded.meta.name || "Main Map",
                        type: 'overworld',
                        mapWidth: loaded.meta.width,
                        mapHeight: loaded.meta.height,
                        tileMapData: bgLayer ? bgLayer.data : Array(loaded.meta.width * loaded.meta.height).fill(null),
                        objectMapData: objLayer ? objLayer.data : Array(loaded.meta.width * loaded.meta.height).fill(null),
                        secretMapData: secretLayer ? secretLayer.data : Array(loaded.meta.width * loaded.meta.height).fill(null),
                        objectMetadata: loaded.meta.objectMetadata || {},
                        selectedBackgroundImage: loaded.meta.backgroundImage,
                        selectedBackgroundColor: loaded.meta.backgroundColor,
                        backgroundParallaxFactor: loaded.meta.backgroundParallaxFactor || 0.3,
                        selectedBackgroundMusic: loaded.meta.backgroundMusic,
                        weather: loaded.meta.weather || { rain: 0, snow: 0, clouds: 0, fog: 0, thunder: 0 },
                        playerPosition: null
                    };

                    setMaps({ 'main': singleMap });
                    setActiveMapId('main');

                    if (bgLayer) setTileMapData(bgLayer.data);
                    if (objLayer) setObjectMapData(objLayer.data);
                    if (secretLayer) setSecretMapData(secretLayer.data);
                    
                    // Set other states
                    if (loaded.meta.backgroundImage) setSelectedBackgroundImage(loaded.meta.backgroundImage);
                    if (loaded.meta.backgroundColor) setSelectedBackgroundColor(loaded.meta.backgroundColor);
                    if (loaded.meta.backgroundParallaxFactor !== undefined) setBackgroundParallaxFactor(loaded.meta.backgroundParallaxFactor);
                    if (loaded.meta.backgroundMusic) setSelectedBackgroundMusic(loaded.meta.backgroundMusic);
                    if (loaded.meta.objectMetadata) setObjectMetadata(loaded.meta.objectMetadata);
                    if (loaded.meta.weather) {
                        setWeatherRain(loaded.meta.weather.rain || 0);
                        setWeatherSnow(loaded.meta.weather.snow || 0);
                        setWeatherClouds(loaded.meta.weather.clouds || 0);
                        setWeatherFog(loaded.meta.weather.fog || 0);
                        setWeatherThunder(loaded.meta.weather.thunder || 0);
                    }

                    errorHandler.info('Map loaded successfully (Converted to Project)', {
                        component: 'Editor',
                        mapName: loaded.meta.name
                    });
                } else {
                    // Oldest format
                    if (loaded.width) setMapWidth(loaded.width);
                    if (loaded.height) setMapHeight(loaded.height);
                    if (loaded.tiles) setTileMapData(loaded.tiles);
                    setObjectMapData(Array(loaded.width * loaded.height).fill(null));

                    errorHandler.warn('Loaded map in legacy format', {
                        component: 'Editor',
                        fileName: file.name
                    });
                }
            } catch (error) {
                errorHandler.error(error, {
                    component: 'Editor',
                    function: 'loadMap',
                    fileName: file.name
                });
                alert('Error loading map. Check console for details.');
            }
        };
        fileReader.onerror = (error) => {
            errorHandler.error(error, {
                component: 'Editor',
                function: 'loadMap',
                fileName: file.name,
                phase: 'fileReader'
            });
            alert('Error reading file!');
        };
    }
};

export const clearMap = ({ mapWidth, mapHeight, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata }) => {
    if (window.confirm("Are you sure you want to clear the map?")) {
        const size = mapWidth * mapHeight;
        setTileMapData(Array(size).fill(null));
        setObjectMapData(Array(size).fill(null));
        setSecretMapData(Array(size).fill(null));
        setObjectMetadata({});
    }
};

export const resizeMapData = ({ newWidth, newHeight, stateRef, setMapWidth, setMapHeight, setTileMapData, setObjectMapData, setSecretMapData, setObjectMetadata }) => {
    const { mapWidth: oldW, mapHeight: oldH, tileMapData: oldTiles, objectMapData: oldObjs, secretMapData: oldSecrets, objectMetadata: oldMeta } = stateRef.current;
    if (newWidth < 1 || newHeight < 1) return;
    if (newWidth === oldW && newHeight === oldH) return;

    const resizeArray = (oldArr) => {
        const newArr = Array(newWidth * newHeight).fill(null);
        if (!oldArr) return newArr;
        for (let y = 0; y < Math.min(oldH, newHeight); y++) {
            for (let x = 0; x < Math.min(oldW, newWidth); x++) {
                newArr[y * newWidth + x] = oldArr[y * oldW + x];
            }
        }
        return newArr;
    };

    const resizeMetadata = (oldM) => {
        const newM = {};
        if (!oldM) return newM;
        for (let y = 0; y < Math.min(oldH, newHeight); y++) {
            for (let x = 0; x < Math.min(oldW, newWidth); x++) {
                const oldIdx = y * oldW + x;
                const newIdx = y * newWidth + x;
                if (oldM[oldIdx]) {
                    newM[newIdx] = oldM[oldIdx];
                }
            }
        }
        return newM;
    };

    setMapWidth(newWidth);
    setMapHeight(newHeight);
    setTileMapData(resizeArray(oldTiles));
    setObjectMapData(resizeArray(oldObjs));
    setSecretMapData(resizeArray(oldSecrets));
    setObjectMetadata(resizeMetadata(oldMeta));
};

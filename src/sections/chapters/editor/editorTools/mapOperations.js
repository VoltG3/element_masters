import saveFile from '../../../../utilities/saveFile';
import errorHandler from '../../../../services/errorHandler';

export const saveMap = async ({
    mapWidth,
    mapHeight,
    tileMapData,
    objectMapData,
    secretMapData,
    objectMetadata,
    mapName,
    creatorName,
    createdAt,
    selectedBackgroundImage,
    selectedBackgroundColor,
    backgroundParallaxFactor,
    selectedBackgroundMusic,
    registryItems,
    setCreatedAt,
    weatherRain,
    weatherSnow,
    weatherClouds,
    weatherFog,
    weatherThunder
}) => {
    const currentDate = new Date().toISOString();
    const createdDate = createdAt || currentDate;

    // Statistics calculation
    const filledBlocks = tileMapData.filter(t => t !== null).length;
    const objectsCount = objectMapData.filter(o => o !== null).length;
    const itemsCount = objectMapData.filter(o => {
        if (!o) return false;
        const item = registryItems.find(r => r.id === o);
        return item && item.name && item.name.startsWith('item.');
    }).length;

    const mapData = {
        meta: {
            width: mapWidth,
            height: mapHeight,
            tileSize: 32,
            version: "1.0",
            name: mapName,
            author: creatorName,
            date_map_created_at: createdDate,
            date_map_last_updated: currentDate,
            backgroundImage: selectedBackgroundImage || null,
            backgroundColor: selectedBackgroundImage ? null : selectedBackgroundColor,
            backgroundParallaxFactor: backgroundParallaxFactor,
            backgroundMusic: selectedBackgroundMusic || null,
            weather: {
                rain: weatherRain || 0,
                snow: weatherSnow || 0,
                clouds: weatherClouds || 0,
                fog: weatherFog || 0,
                thunder: weatherThunder || 0
            },
            objectMetadata: objectMetadata || {}
        },
        statistics: {
            total_tiles: mapWidth * mapHeight,
            filled_tiles: filledBlocks,
            total_objects: objectsCount,
            total_items: itemsCount
        },
        layers: [
            { type: "tile", name: "background", data: tileMapData },
            { type: "object", name: "entities", data: objectMapData },
            { type: "secret", name: "secrets", data: secretMapData || Array(mapWidth * mapHeight).fill(null) }
        ]
    };

    const fileName = `${mapName.replace(/\s+/g, '_')}.json`;
    const json = JSON.stringify(mapData, null, 2);

    try {
        const saved = await saveFile(json, fileName, 'application/json');
        if (saved) {
            if (!createdAt) setCreatedAt(currentDate);
            errorHandler.info('Map saved successfully', {
                component: 'Editor',
                mapName,
                fileName,
                dimensions: `${mapWidth}x${mapHeight}`
            });
        }
    } catch (error) {
        errorHandler.error(error, {
            component: 'Editor',
            function: 'saveMap',
            mapName,
            fileName
        });
        alert('Failed to save map. Check console for details.');
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
    setWeatherThunder
}) => {
    const fileReader = new FileReader();
    const file = event.target.files[0];
    if (file) {
        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = (e) => {
            try {
                const loaded = JSON.parse(e.target.result);
                if (loaded.meta) {
                    setMapWidth(loaded.meta.width);
                    setMapHeight(loaded.meta.height);

                    if (loaded.meta.name) setMapName(loaded.meta.name);
                    if (loaded.meta.author) setCreatorName(loaded.meta.author);
                    if (loaded.meta.date_map_created_at) setCreatedAt(loaded.meta.date_map_created_at);

                    if (typeof loaded.meta.backgroundImage !== 'undefined' && loaded.meta.backgroundImage) {
                        setSelectedBackgroundImage(loaded.meta.backgroundImage);
                    } else {
                        setSelectedBackgroundImage(null);
                    }
                    if (typeof loaded.meta.backgroundColor !== 'undefined' && loaded.meta.backgroundColor) {
                        setSelectedBackgroundColor(loaded.meta.backgroundColor);
                    }
                    if (typeof loaded.meta.backgroundParallaxFactor !== 'undefined') {
                        setBackgroundParallaxFactor(loaded.meta.backgroundParallaxFactor);
                    } else {
                        setBackgroundParallaxFactor(0.3);
                    }
                    if (typeof loaded.meta.backgroundMusic !== 'undefined' && loaded.meta.backgroundMusic) {
                        const m = loaded.meta.backgroundMusic;
                        const normalized = typeof m === 'string' ? m.replace('/sound/background/', '/assets/sound/background/') : m;
                        setSelectedBackgroundMusic(normalized);
                    } else {
                        setSelectedBackgroundMusic(null);
                    }

                    if (loaded.meta.objectMetadata) {
                        setObjectMetadata(loaded.meta.objectMetadata);
                    } else {
                        setObjectMetadata({});
                    }

                    if (loaded.meta.weather) {
                        setWeatherRain(loaded.meta.weather.rain || 0);
                        setWeatherSnow(loaded.meta.weather.snow || 0);
                        setWeatherClouds(loaded.meta.weather.clouds || 0);
                        setWeatherFog(loaded.meta.weather.fog || 0);
                        setWeatherThunder(loaded.meta.weather.thunder || 0);
                    } else {
                        setWeatherRain(0);
                        setWeatherSnow(0);
                        setWeatherClouds(0);
                        setWeatherFog(0);
                        setWeatherThunder(0);
                    }

                    const bgLayer = loaded.layers.find(l => l.name === 'background');
                    const objLayer = loaded.layers.find(l => l.name === 'entities');
                    const secretLayer = loaded.layers.find(l => l.name === 'secrets');
                    if (bgLayer) setTileMapData(bgLayer.data);
                    if (objLayer) setObjectMapData(objLayer.data);
                    if (secretLayer) {
                        setSecretMapData(secretLayer.data);
                    } else {
                        setSecretMapData(Array(loaded.meta.width * loaded.meta.height).fill(null));
                    }

                    errorHandler.info('Map loaded successfully', {
                        component: 'Editor',
                        mapName: loaded.meta.name,
                        dimensions: `${loaded.meta.width}x${loaded.meta.height}`
                    });
                } else {
                    // Old format
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

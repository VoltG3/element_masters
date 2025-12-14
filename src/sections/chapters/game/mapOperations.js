import errorHandler from '../../../services/errorHandler';

// Load map data into Redux store
export const loadMapData = (mapData, dispatch, actions) => {
  try {
    if (!mapData) {
      errorHandler.warn('loadMapData called with empty mapData', { component: 'Game' });
      return;
    }

    const w = mapData.meta?.width || mapData.width || 20;
    const h = mapData.meta?.height || mapData.height || 15;

    let tileData = [];
    let objData = [];
    let secretData = [];

    if (mapData.layers) {
      const bgLayer = mapData.layers.find(l => l.name === 'background');
      tileData = bgLayer ? bgLayer.data : Array(w * h).fill(null);

      const objLayer = mapData.layers.find(l => l.name === 'entities');
      objData = objLayer ? objLayer.data : Array(w * h).fill(null);

      const secretLayer = mapData.layers.find(l => l.name === 'secrets');
      secretData = secretLayer ? secretLayer.data : Array(w * h).fill(null);
    } else {
      tileData = mapData.tiles || Array(w * h).fill(null);
      objData = Array(w * h).fill(null);
      secretData = Array(w * h).fill(null);
    }

    // Debug logging
    console.log('[DEBUG] Loading map with secrets:', {
      hasSecretsLayer: !!mapData.layers?.find(l => l.name === 'secrets'),
      secretDataLength: secretData?.length,
      secretDataNonNull: secretData?.filter(s => s !== null).length,
      secretDataSample: secretData?.filter(s => s !== null).slice(0, 5)
    });

    // Update Redux store
    dispatch(actions.setActiveMap({
      mapData,
      tileMapData: tileData,
      objectMapData: objData,
      secretMapData: secretData,
      mapWidth: w,
      mapHeight: h
    }));
    dispatch(actions.setCameraScrollX(0));
    dispatch(actions.setMapModalOpen(false));

    errorHandler.info('Map loaded successfully', {
      component: 'Game',
      mapName: mapData.meta?.name || 'Unknown',
      dimensions: `${w}x${h}`
    });
  } catch (error) {
    errorHandler.error(error, {
      component: 'Game',
      function: 'loadMapData',
      mapData
    });
    alert('Error loading map. Check console for details.');
  }
};

// Handle custom map file upload
export const handleCustomMapUpload = (event, dispatch, actions) => {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      try {
        const loaded = JSON.parse(e.target.result);
        loadMapData(loaded, dispatch, actions);
      } catch (error) {
        errorHandler.error(error, {
          component: 'Game',
          function: 'handleCustomMapUpload',
          fileName: file.name
        });
        alert("Invalid map file! Check console for details.");
      }
    };
    fileReader.onerror = (error) => {
      errorHandler.error(error, {
        component: 'Game',
        function: 'handleCustomMapUpload',
        fileName: file.name,
        phase: 'fileReader'
      });
      alert("Error reading file!");
    };
  } catch (error) {
    errorHandler.error(error, {
      component: 'Game',
      function: 'handleCustomMapUpload'
    });
  }
};

/**
 * Game Slice
 * Manages game-level state (maps, registry, game status)
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeMapData: null,
  tileMapData: [],
  objectMapData: [],
  secretMapData: [],
  objectMetadata: {}, // Track metadata per object position { index: { health: 100, etc } }
  revealedSecrets: [], // Track which secret zones have been revealed (array of indices)
  objectTextureIndices: {}, // Track texture index per object position { index: textureIndex }
  mapWidth: 20,
  mapHeight: 15,
  projectMaps: {}, // For Project v2.0 (multi-map)
  isLoading: false,
  error: null,
  isPaused: false,
  isGameOver: false,
  activeRoomIds: [], // IDs of currently active rooms (overlays)
  seaRescuePoints: 0,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setActiveMap: (state, action) => {
      let { mapData, tileMapData, objectMapData, secretMapData, mapWidth, mapHeight } = action.payload;

      // Migration for Sea Rescue boxes (ID change)
      const migrateBoxes = (data) => {
        if (!data || !Array.isArray(data)) return;
        for (let i = 0; i < data.length; i++) {
          if (data[i] === 'minispill_sea_rescue_box') {
            data[i] = 'minispill_sea_rescue_box0';
          }
        }
      };

      if (objectMapData) migrateBoxes(objectMapData);
      
      // Migrate all maps in project
      if (mapData?.maps) {
        Object.values(mapData.maps).forEach(m => {
          const mapObjectData = m.objectMapData || m.layers?.find(l => l.name === 'entities' || l.type === 'object')?.data;
          if (mapObjectData) migrateBoxes(mapObjectData);
        });
      }

      state.activeMapData = mapData;
      state.tileMapData = tileMapData;
      state.objectMapData = objectMapData;
      state.secretMapData = secretMapData || [];
      state.objectMetadata = mapData?.meta?.objectMetadata || mapData?.objectMetadata || {}; // Load initial metadata from map
      state.revealedSecrets = []; // Reset revealed secrets on new map
      state.objectTextureIndices = {}; // Reset texture indices on new map
      state.mapWidth = mapWidth;
      state.mapHeight = mapHeight;
      state.activeRoomIds = []; // Reset active rooms on new map load
      state.isGameOver = false;
      state.seaRescuePoints = 0; // Reset points on new map load

      // If this is a project (v2.0) with multiple maps
      if (mapData?.maps) {
        state.projectMaps = mapData.maps;
      }
    },
    updateObjectMap: (state, action) => {
      state.objectMapData = action.payload;
    },
    updateObjectMetadata: (state, action) => {
      const { index, metadata, mapId } = action.payload;
      const activeId = state.activeMapData?.meta?.activeMapId || state.activeMapData?.meta?.activeMap || 'main';
      const targetId = mapId || activeId;
      if (!mapId || mapId === 'main') {
        state.objectMetadata[index] = {
          ...(state.objectMetadata[index] || {}),
          ...metadata
        };
        if (state.projectMaps[targetId]) {
          if (!state.projectMaps[targetId].objectMetadata) {
            state.projectMaps[targetId].objectMetadata = {};
          }
          state.projectMaps[targetId].objectMetadata[index] = {
            ...(state.projectMaps[targetId].objectMetadata[index] || {}),
            ...metadata
          };
        }
      } else if (state.projectMaps[mapId]) {
        if (mapId === activeId) {
          state.objectMetadata[index] = {
            ...(state.objectMetadata[index] || {}),
            ...metadata
          };
        }
        if (!state.projectMaps[mapId].objectMetadata) {
          state.projectMaps[mapId].objectMetadata = {};
        }
        state.projectMaps[mapId].objectMetadata[index] = {
          ...(state.projectMaps[mapId].objectMetadata[index] || {}),
          ...metadata
        };
      }
    },
    removeObjectAtIndex: (state, action) => {
      const { index, mapId } = typeof action.payload === 'object' ? action.payload : { index: action.payload, mapId: null };
      const activeId = state.activeMapData?.meta?.activeMapId || state.activeMapData?.meta?.activeMap || 'main';
      const targetId = mapId || activeId;
      if (!mapId || mapId === 'main') {
        if (state.objectMapData[index] !== undefined) {
          state.objectMapData[index] = null;
        }
        if (state.projectMaps[targetId]) {
          const room = state.projectMaps[targetId];
          if (!room.objectMapData) {
            const layerData = room.layers?.find(l => l.name === 'entities' || l.type === 'object')?.data;
            room.objectMapData = layerData ? [...layerData] : [];
          } else {
            room.objectMapData = [...room.objectMapData];
          }
          if (index >= 0 && index < room.objectMapData.length) {
            room.objectMapData[index] = null;
          }
        }
      } else if (state.projectMaps[mapId]) {
        if (mapId === activeId) {
          if (state.objectMapData[index] !== undefined) {
            state.objectMapData[index] = null;
          }
        }
        const room = state.projectMaps[mapId];
        if (!room.objectMapData) {
          const layerData = room.layers?.find(l => l.name === 'entities' || l.type === 'object')?.data;
          room.objectMapData = layerData ? [...layerData] : [];
        } else {
          // Make sure we are working with a fresh array if we want to trigger changes reliably
          room.objectMapData = [...room.objectMapData];
        }
        
        if (index >= 0 && index < room.objectMapData.length) {
          room.objectMapData[index] = null;
        }
      }
    },
    removeTileAtIndex: (state, action) => {
      const index = action.payload;
      if (state.tileMapData[index] !== undefined) {
        state.tileMapData[index] = null;
      }
    },
    moveTileInMap: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      const len = state.tileMapData.length;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= len || toIndex >= len) return;
      if (state.tileMapData[fromIndex] === undefined) return;
      state.tileMapData[toIndex] = state.tileMapData[fromIndex];
      state.tileMapData[fromIndex] = null;
    },
    moveObjectInMap: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      const len = state.objectMapData.length;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= len || toIndex >= len) return;
      if (state.objectMapData[fromIndex] === undefined) return;
      state.objectMapData[toIndex] = state.objectMapData[fromIndex];
      state.objectMapData[fromIndex] = null;
      
      // Move metadata as well
      if (state.objectMetadata[fromIndex]) {
        state.objectMetadata[toIndex] = state.objectMetadata[fromIndex];
        delete state.objectMetadata[fromIndex];
      }
    },
    updateObjectAtIndex: (state, action) => {
      const { index, newId, mapId } = action.payload;
      const activeId = state.activeMapData?.meta?.activeMapId || state.activeMapData?.meta?.activeMap || 'main';
      const targetId = mapId || activeId;
      if (!mapId || mapId === 'main') {
        if (state.objectMapData[index] !== undefined) {
          state.objectMapData[index] = newId;
        }
        if (state.projectMaps[targetId]) {
          const room = state.projectMaps[targetId];
          if (!room.objectMapData) {
            const layerData = room.layers?.find(l => l.name === 'entities' || l.type === 'object')?.data;
            room.objectMapData = layerData ? [...layerData] : [];
          } else {
            room.objectMapData = [...room.objectMapData];
          }
          if (index >= 0 && index < room.objectMapData.length) {
            room.objectMapData[index] = newId;
          }
        }
      } else if (state.projectMaps[mapId]) {
        if (mapId === activeId) {
          if (state.objectMapData[index] !== undefined) {
            state.objectMapData[index] = newId;
          }
        }
        const room = state.projectMaps[mapId];
        if (!room.objectMapData) {
          const layerData = room.layers?.find(l => l.name === 'entities' || l.type === 'object')?.data;
          room.objectMapData = layerData ? [...layerData] : [];
        } else {
          room.objectMapData = [...room.objectMapData];
        }
        if (index >= 0 && index < room.objectMapData.length) {
          room.objectMapData[index] = newId;
        }
      }
    },
    setObjectTextureIndex: (state, action) => {
      const { index, textureIndex } = action.payload;
      state.objectTextureIndices[index] = textureIndex;
    },
    revealSecretZone: (state, action) => {
      const indices = action.payload; // Array of tile indices to reveal
      // Add new indices to revealed array (avoid duplicates)
      indices.forEach(idx => {
        if (!state.revealedSecrets.includes(idx)) {
          state.revealedSecrets.push(idx);
        }
      });
    },
    toggleRoom: (state, action) => {
      const roomId = action.payload;
      if (state.activeRoomIds.includes(roomId)) {
        state.activeRoomIds = state.activeRoomIds.filter(id => id !== roomId);
      } else {
        state.activeRoomIds.push(roomId);
      }
    },
    clearRooms: (state) => {
      state.activeRoomIds = [];
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setPaused: (state, action) => {
      state.isPaused = action.payload;
    },
    setGameOver: (state, action) => {
      state.isGameOver = action.payload;
    },
    addSeaRescuePoints: (state, action) => {
      state.seaRescuePoints += action.payload;
    },
    captureSeaRescueBox: (state, action) => {
      const { triggerIndex, boxId, mapWidth } = action.payload;
      
      // Find the lowest available trigger in the same column
      const col = triggerIndex % mapWidth;
      const mapHeight = state.mapHeight;
      let targetIndex = -1;

      // Scan from bottom to top in the same column
      for (let y = mapHeight - 1; y >= 0; y--) {
        const idx = y * mapWidth + col;
        const objId = state.objectMapData[idx];
        
        if (objId === 'minispill_sea_rescue_trigger') {
          const meta = state.objectMetadata[idx] || {};
          if (!meta.capturedBoxId) {
            targetIndex = idx;
            break;
          }
        }
      }

      // If no empty trigger in column, use the one that was hit (fallback)
      const finalIndex = targetIndex !== -1 ? targetIndex : triggerIndex;
      
      state.objectMetadata[finalIndex] = {
        ...(state.objectMetadata[finalIndex] || {}),
        capturedBoxId: boxId
      };
    },
    resetGame: (state) => {
      return { ...initialState, activeMapData: state.activeMapData };
    },
  },
});

export const {
  setActiveMap,
  updateObjectMap,
  updateObjectMetadata,
  removeObjectAtIndex,
  removeTileAtIndex,
  moveTileInMap,
  moveObjectInMap,
  updateObjectAtIndex,
  setObjectTextureIndex,
  revealSecretZone,
  toggleRoom,
  clearRooms,
  setLoading,
  setError,
  setPaused,
  setGameOver,
  addSeaRescuePoints,
  captureSeaRescueBox,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;

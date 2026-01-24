/**
 * Redux Store Configuration
 * Centralized state management for the game
 */

import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './slices/gameSlice';
import uiReducer from './slices/uiSlice';

const store = configureStore({
  reducer: {
    game: gameReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['game/setActiveMap'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.projectiles', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['game.activeMapData'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;

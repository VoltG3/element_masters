/**
 * Settings Slice
 * Manages game settings (audio, graphics, controls, etc.)
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sound: {
    enabled: false,
    masterVolume: 1.0,
    sfxVolume: 0.5,
    musicVolume: 0.6,
  },
  graphics: {
    backgroundParallaxFactor: 0.3,
    weatherRain: 0,
    weatherSnow: 0,
    weatherClouds: 0,
    weatherFog: 0,
    weatherThunder: 0,
    roomBlurEnabled: true,
  },
  ui: {
    healthBarEnabled: true,
    oxygenBarEnabled: true,
    lavaBarEnabled: true,
    waterSplashesEnabled: true,
    lavaEmbersEnabled: true,
  },
  controls: {
    keyUp: 'w',
    keyDown: 's',
    keyLeft: 'a',
    keyRight: 'd',
    keyJump: 'Space',
    keyShoot: 'MouseLeft',
  },
};

// Load settings from localStorage
const loadSettings = () => {
  try {
    const saved = localStorage.getItem('game_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...initialState, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return initialState;
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadSettings(),
  reducers: {
    updateSettings: (state, action) => {
      const newState = { ...state, ...action.payload };
      // Save to localStorage
      try {
        localStorage.setItem('game_settings', JSON.stringify(newState));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
      return newState;
    },
    setSoundEnabled: (state, action) => {
      state.sound.enabled = action.payload;
      try {
        localStorage.setItem('game_sound_enabled', action.payload ? '1' : '0');
      } catch (error) {
        console.error('Failed to save sound setting:', error);
      }
    },
    setSoundVolume: (state, action) => {
      const { type, volume } = action.payload;
      if (type === 'master') state.sound.masterVolume = volume;
      else if (type === 'sfx') state.sound.sfxVolume = volume;
      else if (type === 'music') state.sound.musicVolume = volume;
    },
    setGraphicsSetting: (state, action) => {
      const { key, value } = action.payload;
      if (state.graphics[key] !== undefined) {
        state.graphics[key] = value;
      }
    },
    setUISetting: (state, action) => {
      const { key, value } = action.payload;
      if (state.ui[key] !== undefined) {
        state.ui[key] = value;
      }
    },
    setControlBinding: (state, action) => {
      const { key, value } = action.payload;
      if (state.controls[key] !== undefined) {
        state.controls[key] = value;
      }
    },
    resetSettings: () => {
      try {
        localStorage.removeItem('game_settings');
      } catch (error) {
        console.error('Failed to clear settings:', error);
      }
      return initialState;
    },
  },
});

export const {
  updateSettings,
  setSoundEnabled,
  setSoundVolume,
  setGraphicsSetting,
  setUISetting,
  setControlBinding,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;

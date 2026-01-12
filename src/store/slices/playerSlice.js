/**
 * Player Slice
 * Manages player state (position, health, resources, etc.)
 */

import { createSlice } from '@reduxjs/toolkit';
import { MAX_HEALTH, MAX_OXYGEN, MAX_LAVA_RESIST } from '../../constants/gameConstants';

const initialState = {
  x: 0,
  y: 0,
  width: 32,
  height: 32,
  vx: 0,
  vy: 0,
  isGrounded: false,
  direction: 1,
  animation: 'idle',
  health: 90,
  maxHealth: MAX_HEALTH,
  strength: 30,
  maxStrength: 100,
  ammo: 0,
  oxygen: MAX_OXYGEN,
  maxOxygen: MAX_OXYGEN,
  lavaResist: MAX_LAVA_RESIST,
  maxLavaResist: MAX_LAVA_RESIST,
  projectiles: [],
  inWater: false,
  headUnderWater: false,
  atSurface: false,
  liquidType: null,
  hitTimerMs: 0,
  isWinning: false,
  winCounter: 0,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    updateState: (state, action) => {
      return { ...state, ...action.payload };
    },
    setPosition: (state, action) => {
      const { x, y } = action.payload;
      state.x = x;
      state.y = y;
    },
    setVelocity: (state, action) => {
      const { vx, vy } = action.payload;
      state.vx = vx;
      state.vy = vy;
    },
    setHealth: (state, action) => {
      state.health = Math.max(0, Math.min(state.maxHealth, action.payload));
    },
    addHealth: (state, action) => {
      state.health = Math.max(0, Math.min(state.maxHealth, state.health + action.payload));
    },
    takeDamage: (state, action) => {
      state.health = Math.max(0, state.health - action.payload);
      state.hitTimerMs = Math.max(state.hitTimerMs, 500);
    },
    setAmmo: (state, action) => {
      state.ammo = Math.max(0, action.payload);
    },
    addAmmo: (state, action) => {
      state.ammo = Math.max(0, state.ammo + action.payload);
    },
    setOxygen: (state, action) => {
      state.oxygen = Math.max(0, Math.min(state.maxOxygen, action.payload));
    },
    setLavaResist: (state, action) => {
      state.lavaResist = Math.max(0, Math.min(state.maxLavaResist, action.payload));
    },
    setStrength: (state, action) => {
      state.strength = Math.max(0, Math.min(state.maxStrength, action.payload));
    },
    setProjectiles: (state, action) => {
      state.projectiles = action.payload;
    },
    addProjectile: (state, action) => {
      state.projectiles.push(action.payload);
    },
    removeProjectile: (state, action) => {
      state.projectiles = state.projectiles.filter(p => p.id !== action.payload);
    },
    setDirection: (state, action) => {
      state.direction = action.payload;
    },
    setAnimation: (state, action) => {
      state.animation = action.payload;
    },
    setGrounded: (state, action) => {
      state.isGrounded = action.payload;
    },
    setInWater: (state, action) => {
      state.inWater = action.payload;
    },
    setLiquidType: (state, action) => {
      state.liquidType = action.payload;
    },
    resetPlayer: () => initialState,
  },
});

export const {
  updateState,
  setPosition,
  setVelocity,
  setHealth,
  addHealth,
  takeDamage,
  setAmmo,
  addAmmo,
  setOxygen,
  setLavaResist,
  setStrength,
  setProjectiles,
  addProjectile,
  removeProjectile,
  setDirection,
  setAnimation,
  setGrounded,
  setInWater,
  setLiquidType,
  resetPlayer,
} = playerSlice.actions;

export default playerSlice.reducer;

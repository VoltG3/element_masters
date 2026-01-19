/**
 * Game Constants
 * All game-wide constants centralized in one place
 */

// Physics Constants
export const TILE_SIZE = 32;
export const GRAVITY = 0.6;
export const TERMINAL_VELOCITY = 12;
export const MOVE_SPEED = 4;
export const JUMP_FORCE = 10;

// Player Stats Constants
export const MAX_HEALTH = 100;
export const MAX_OXYGEN = 100;
export const MAX_LAVA_RESIST = 100;
export const MAX_ICE_RESIST = 100;
export const MAX_RADIOACTIVITY = 100;

// Combat Constants
export const SHOOT_COOLDOWN = 350; // milliseconds
export const HIT_FLASH_DURATION = 500; // milliseconds

// Animation Constants
export const IDLE_ANIMATION = 'idle';
export const RUN_ANIMATION = 'run';
export const JUMP_ANIMATION = 'jump';

// Liquid Constants
export const WATER_HORIZONTAL_DAMPING = 0.82;
export const LAVA_HORIZONTAL_DAMPING = 0.78;

// Default Liquid Parameters
export const DEFAULT_OXYGEN_PARAMS = {
  drainPerSecond: 20,
  regenPerSecond: 35,
  damagePerSecondWhenDepleted: 10,
};

export const DEFAULT_LAVA_PARAMS = {
  drainPerSecond: 25,
  regenPerSecond: 40,
  damagePerSecondWhenDepleted: 15,
};

// Timing Constants
export const HAZARD_DAMAGE_TICK_INTERVAL = 1000; // milliseconds
export const LIQUID_DAMAGE_TICK_INTERVAL = 1000; // milliseconds

// Direction Constants
export const DIRECTION_RIGHT = 1;
export const DIRECTION_LEFT = -1;

// Map Defaults
export const DEFAULT_MAP_WIDTH = 20;
export const DEFAULT_MAP_HEIGHT = 15;

// Viewport Constants
export const VIEWPORT_DEAD_ZONE_LEFT = 0.3;
export const VIEWPORT_DEAD_ZONE_RIGHT = 0.7;

// Sound Constants
export const DEFAULT_BACKGROUND_MUSIC_VOLUME = 0.6;
export const DEFAULT_SFX_VOLUME = 0.5;

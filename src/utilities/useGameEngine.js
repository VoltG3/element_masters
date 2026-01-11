import { useState, useEffect, useRef } from 'react';
import { useInput } from './useInput';
import { findItemById } from '../engine/registry';
import { checkHazardDamage, spawnProjectile as spawnProjectileExternal, collectItem, checkInteractables, updateProjectiles } from '../engine/gameplay';
import { checkSecretDetection } from '../engine/gameplay/secrets';
import { playSfx } from '../engine/audio';
import { updateFrame } from '../engine/loop/updateFrame';
import { getLiquidAtPixel, isLiquidAtPixel as isLiquidAtPixelUtil, sampleLiquidForAABB } from '../engine/liquids/liquidUtils';
import { isSolidAtPixel as isSolidAtPixelExternal, checkCollision as checkCollisionExternal } from '../engine/physics';
import {
    TILE_SIZE,
    GRAVITY,
    TERMINAL_VELOCITY,
    MOVE_SPEED,
    JUMP_FORCE,
    MAX_HEALTH,
    MAX_OXYGEN,
    MAX_LAVA_RESIST
} from '../constants/gameConstants';
import errorHandler from '../services/errorHandler';

// Helper: accept boolean or string values like "true"/"false"
const parseBool = (v, def = false) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
    return def;
};

// Modified arguments: added objectData, secretData, revealedSecrets, onRevealSecret
export const useGameEngine = (mapData, tileData, objectData, secretData, revealedSecrets, registryItems, onGameOver, onStateUpdate, onRevealSecret) => {
    const input = useInput();

    // Player state
    const [player, setPlayer] = useState({
        x: 0, // In pixels
        y: 0, // In pixels
        width: 32, // Default, will be overwritten from registry
        height: 32,
        vx: 0,
        vy: 0,
        isGrounded: false,
        direction: 1, // 1 right, -1 left
        animation: 'idle', // idle, run, jump
        health: 90, // Initial health (for testing, to allow picking up hearts)
        maxHealth: MAX_HEALTH,
        ammo: 0, // Fireball ammunition
        // New resources for display
        oxygen: MAX_OXYGEN,
        maxOxygen: MAX_OXYGEN,
        lavaResist: MAX_LAVA_RESIST,
        maxLavaResist: MAX_LAVA_RESIST,
        projectiles: [] // Active projectiles for rendering
  });

    // Ref objects for game logic
    const gameState = useRef({ ...player });               // Player state for loop (avoids closure issues)
    const requestRef = useRef();                           // requestAnimationFrame id
    const isInitialized = useRef(false);                   // Whether game is initialized
    const lastTimeRef = useRef(0);                         // Time between frames (δt)
    const hazardDamageAccumulatorRef = useRef(0);          // Accumulated time for hazard damage over time
    const lastHazardIndexRef = useRef(null);               // Last hazard tile index cache (to associate damage with specific hazard)
    const triggeredHazardsRef = useRef(new Set());         // Hazards with damageOnce: true that have already triggered
    const projectilesRef = useRef([]);                     // Active projectiles
    const shootCooldownRef = useRef(0);                    // Remaining cooldown time (ms)
    const projectileIdRef = useRef(1);                     // Auto-incrementing ID
    const soundEnabledRef = useRef(false);                 // Global sound toggle
    const audioCtxRef = useRef(null);                      // WebAudio context (fallback)
    const audioCtxUnlockedRef = useRef(false);             // Whether AudioContext is unlocked with user gesture
    const liquidDamageAccumulatorRef = useRef(0);          // Accumulated time for liquid DPS ticking (e.g., lava)
    const oxygenDepleteAccRef = useRef(0);                 // O2 depletion DPS accumulator
    const lavaDepleteAccRef = useRef(0);                   // Lava resist depletion DPS accumulator

    // Sync global sound toggle from localStorage and events
    useEffect(() => {
        try {
            const v = localStorage.getItem('game_sound_enabled');
            soundEnabledRef.current = (v === null ? false : v !== '0');
        } catch { soundEnabledRef.current = false; }
        const onToggle = (e) => {
            try {
                const enabled = !!(e?.detail?.enabled);
                soundEnabledRef.current = enabled;
            } catch {}
        };
        window.addEventListener('game-sound-toggle', onToggle);
        // AudioContext unlocking with user gesture (click on HUD button, etc.)
        const onUserGesture = () => {
            try {
                if (!audioCtxRef.current) {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    if (AC) audioCtxRef.current = new AC();
                }
                if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                    audioCtxRef.current.resume?.();
                }
                if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
                    audioCtxUnlockedRef.current = true;
                }
            } catch {}
        };
        window.addEventListener('game-sound-user-gesture', onUserGesture);
        return () => {
            window.removeEventListener('game-sound-toggle', onToggle);
            window.removeEventListener('game-sound-user-gesture', onUserGesture);
        };
    }, []);

    // Helper function: play SFX (delegated to GameEngine/audio)
    const playShotSfx = (url, volume) => {
        return playSfx({ soundEnabledRef, audioCtxRef, audioCtxUnlockedRef }, url, volume);
    };

    // Adapter: correctly calls GameEngine/checkHazardDamage with options object
    const checkHazardDamageWrapper = (currentX, currentY, mapWidth, objectLayerData, deltaMs) => {
        try {
            return checkHazardDamage({
                currentX,
                currentY,
                mapWidth,
                objectLayerData,
                deltaMs,
                registryItems,
                TILE_SIZE,
                MOVE_SPEED,
                JUMP_FORCE,
                hazardDamageAccumulatorRef,
                lastHazardIndexRef,
                triggeredHazardsRef,
                gameState
            });
        } catch (error) {
            errorHandler.error(error, {
                component: 'useGameEngine',
                function: 'checkHazardDamageWrapper',
                playerPosition: { x: currentX, y: currentY },
                mapWidth
            });
            return { damage: 0, damageType: null };
        }
    };

    // Track revealed secrets locally to prevent duplicate reveals before state updates
    const localRevealedRef = useRef(new Set());

    // Secrets detection wrapper
    const checkSecretsWrapper = (currentX, currentY, width, height, mapWidth, mapHeight) => {
        try {
            if (!secretData || !onRevealSecret) return;

            // Merge prop revealedSecrets with local tracking
            const mergedRevealed = [
                ...(revealedSecrets || []),
                ...Array.from(localRevealedRef.current)
            ];

            const indicesToReveal = checkSecretDetection({
                currentX,
                currentY,
                width,
                height,
                secretMapData: secretData,
                revealedSecrets: mergedRevealed,
                mapWidth,
                mapHeight,
                registryItems,
                TILE_SIZE
            });

            if (indicesToReveal && indicesToReveal.length > 0) {
                // Add to local tracking immediately (before state updates)
                indicesToReveal.forEach(idx => localRevealedRef.current.add(idx));
                onRevealSecret(indicesToReveal);
            }
        } catch (error) {
            errorHandler.error(error, {
                component: 'useGameEngine',
                function: 'checkSecretsWrapper',
                playerPosition: { x: currentX, y: currentY }
            });
        }
    };

    // Initialize player at starting position
    // Important: This effect now depends ONLY on mapData (which doesn't change when collecting items)
    useEffect(() => {
        // Reset hazard state when map changes
        isInitialized.current = false;
        lastTimeRef.current = 0;
        hazardDamageAccumulatorRef.current = 0;
        lastHazardIndexRef.current = null;
        triggeredHazardsRef.current = new Set();
        projectilesRef.current = [];
        shootCooldownRef.current = 0;
        projectileIdRef.current = 1;

        if (mapData && mapData.layers) {
            const mapW = mapData.meta?.width || mapData.width || 20;
            const mapH = mapData.meta?.height || mapData.height || 15;
            const objLayer = mapData.layers.find(l => l.name === 'entities');
            if (objLayer) {
                // Search for player (anything containing 'player')
                const startIndex = objLayer.data.findIndex(id => id && id.includes('player'));

                if (startIndex !== -1) {
                    let startX = (startIndex % mapW) * TILE_SIZE;
                    let startY = Math.floor(startIndex / mapW) * TILE_SIZE;

                    // Get data from registry
                    const playerId = objLayer.data[startIndex];
                    const registryPlayer = findItemById(playerId) || findItemById("player"); // Fallback to generic player
                    const maxHealth = Math.max(1, Number(registryPlayer?.maxHealth) || MAX_HEALTH);

                    // Completely overwrite gameState with default values + new position
                    gameState.current = {
                        x: startX,
                        y: startY,
                        width: (registryPlayer?.width || 1) * TILE_SIZE * 0.8,
                        height: (registryPlayer?.height || 1) * TILE_SIZE,
                        vx: 0,
                        vy: 0,
                        isGrounded: false,
                        direction: 1,
                        animation: 'idle',
                        health: Math.min(90, maxHealth), // Reset to 90 (not MAX) to allow testing items
                        maxHealth,
                        ammo: 0,
                        // resources
                        oxygen: MAX_OXYGEN,
                        maxOxygen: MAX_OXYGEN,
                        lavaResist: MAX_LAVA_RESIST,
                        maxLavaResist: MAX_LAVA_RESIST
                    };

                    // If start position sinks into block, move up to safe location
                    let guard = 0;
                    while (checkCollision(gameState.current.x, gameState.current.y, mapW, mapH) && guard < mapH) {
                        gameState.current.y = Math.max(0, gameState.current.y - TILE_SIZE);
                        guard++;
                    }
                    // Ensure we're not outside world boundaries horizontally
                    const maxXAtStart = mapW * TILE_SIZE - gameState.current.width;
                    gameState.current.x = Math.max(0, Math.min(gameState.current.x, maxXAtStart));

                    setPlayer({ ...gameState.current, projectiles: [] });
                    isInitialized.current = true;
                } else {
                    // If player not found in map, place at 0,0 or some safe location
                    gameState.current = {
                        ...gameState.current,
                        x: 0,
                        y: 0,
                        vx: 0,
                        vy: 0,
                        oxygen: MAX_OXYGEN,
                        maxOxygen: MAX_OXYGEN,
                        lavaResist: MAX_LAVA_RESIST,
                        maxLavaResist: MAX_LAVA_RESIST
                    };
                    setPlayer({ ...gameState.current, projectiles: [] });
                    isInitialized.current = true; // allow loop to work even without start position
                }
            } else {
                // No entities layer — still start game at 0,0
                gameState.current = {
                    ...gameState.current,
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    oxygen: MAX_OXYGEN,
                    maxOxygen: MAX_OXYGEN,
                    lavaResist: MAX_LAVA_RESIST,
                    maxLavaResist: MAX_LAVA_RESIST
                };
                setPlayer({ ...gameState.current, projectiles: [] });
                isInitialized.current = true;
            }
        }
    }, [mapData]);

    // Helper function for collisions (AABB Collision) with blocks (tile layer) — delegates to GameEngine/collision
    const checkCollision = (newX, newY, mapWidth, mapHeightParam) => {
        return checkCollisionExternal(
            newX,
            newY,
            mapWidth,
            mapHeightParam,
            TILE_SIZE,
            tileData,
            registryItems,
            gameState.current.width,
            gameState.current.height,
            secretData
        );
    };

    // Simple point solidity check for projectiles — delegates to GameEngine/collision
    const isSolidAtPixel = (wx, wy, mapWidthTiles, mapHeightTiles) => {
        return isSolidAtPixelExternal(
            wx,
            wy,
            mapWidthTiles,
            mapHeightTiles,
            TILE_SIZE,
            tileData,
            registryItems,
            secretData
        );
    };

    // New: water presence check at a world pixel
    const isWaterAtPixel = (wx, wy, mapWidthTiles, mapHeightTiles) => {
        // Strict: Only treat WATER as buoyant/swimmable in vertical physics
        const liq = getLiquidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems);
        return !!(liq && liq.type === 'water');
    };

    // Liquid sampling helper for update loop (AABB based)
    const sampleLiquid = (aabb, mapWidthTiles, mapHeightTiles) => {
        return sampleLiquidForAABB({
            x: aabb.x,
            y: aabb.y,
            width: aabb.width,
            height: aabb.height,
            TILE_SIZE,
            mapWidth: mapWidthTiles,
            mapHeight: mapHeightTiles,
            tileData,
            registryItems
        });
    };

    // Item collection — moved to GameEngine/collectItem

    // Helper function: create new projectile — moved to separate module
    const spawnProjectile = (originX, originY, direction) => {
        return spawnProjectileExternal({
            findItemById,
            TILE_SIZE,
            parseBool,
            projectilesRef,
            projectileIdRef,
            playShotSfx
        }, originX, originY, direction);
    };

    // Game Loop (delegated to GameEngine/updateFrame)
    const update = (timestamp) => {
        const ctx = {
            mapData,
            objectData,
            input,
            refs: { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef, liquidDamageAccumulatorRef, oxygenDepleteAccRef, lavaDepleteAccRef },
            constants: { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE },
            helpers: {
                checkCollision,
                isWaterAt: (wx, wy) => isWaterAtPixel(wx, wy, (mapData?.meta?.width || mapData?.width || 20), (mapData?.meta?.height || mapData?.height || 15)),
                getLiquidSample: ({ x, y, width, height, TILE_SIZE: TS, mapWidth, mapHeight }) =>
                    sampleLiquid({ x, y, width, height }, (mapData?.meta?.width || mapData?.width || 20), (mapData?.meta?.height || mapData?.height || 15))
            },
            actions: {
                collectItem: (x, y, mapWidth, objectLayer) =>
                    collectItem({ registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState }, x, y, mapWidth, objectLayer),
                checkInteractables: (x, y, mapWidth, objectLayer) =>
                    checkInteractables({ registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate, gameState }, x, y, mapWidth, objectLayer),
                checkHazardDamage: (x, y, mapWidth, objectLayer, deltaMs) =>
                    checkHazardDamageWrapper(x, y, mapWidth, objectLayer, deltaMs),
                checkSecrets: (x, y, width, height, mapWidth, mapHeight) =>
                    checkSecretsWrapper(x, y, width, height, mapWidth, mapHeight),
                spawnProjectile: (originX, originY, direction) =>
                    spawnProjectile(originX, originY, direction),
                updateProjectiles: (deltaMs, mapWidth, mapHeight) =>
                    updateProjectiles({ projectilesRef, TILE_SIZE, isSolidAtPixel, findItemById }, deltaMs, mapWidth, mapHeight),
                setPlayer: (next) => setPlayer(next),
                onGameOver
            }
        };
        const res = updateFrame(ctx, timestamp);
        if (res?.continue !== false) {
            requestRef.current = requestAnimationFrame(update);
        }
    };

    // Loop initialization / restart
    useEffect(() => {
        if (!mapData) return;
        requestRef.current = requestAnimationFrame(update);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [mapData, tileData, objectData]); // Restart loop if map or objects change

    return player;
};

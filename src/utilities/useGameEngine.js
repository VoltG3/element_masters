import { useState, useEffect, useRef } from 'react';
import { useInput } from './useInput';
import { findItemById } from '../engine/registry';
import { checkHazardDamage, spawnProjectile as spawnProjectileExternal, collectItem, checkInteractables, updateProjectiles } from '../engine/gameplay';
import { checkSecretDetection } from '../engine/gameplay/secrets';
import { playSfx } from '../engine/audio';
import { updateFrame } from '../engine/loop/updateFrame';
import { getLiquidAtPixel, isLiquidAtPixel as isLiquidAtPixelUtil, sampleLiquidForAABB } from '../engine/liquids/liquidUtils';
import { isSolidAtPixel as isSolidAtPixelExternal, checkCollision as checkCollisionExternal, getSurfaceProperties } from '../engine/physics';
import {
    TILE_SIZE,
    GRAVITY,
    TERMINAL_VELOCITY,
    MOVE_SPEED,
    JUMP_FORCE,
    MAX_HEALTH,
    MAX_OXYGEN,
    MAX_LAVA_RESIST,
    MAX_ICE_RESIST
} from '../constants/gameConstants';
import errorHandler from '../services/errorHandler';

// Helper: accept boolean or string values like "true"/"false"
const parseBool = (v, def = false) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
    return def;
};

// Modified arguments: added objectData, secretData, revealedSecrets, onRevealSecret, objectMetadata
export const useGameEngine = (mapData, tileData, objectData, secretData, revealedSecrets, registryItems, onGameOver, onStateUpdate, onRevealSecret, objectMetadata) => {
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
        iceResist: MAX_ICE_RESIST,
        maxIceResist: MAX_ICE_RESIST,
        strength: 30,
        maxStrength: 100,
        lastPushTime: 0,
        isWinning: false,
        winCounter: 0,
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
    const entitiesRef = useRef([]);                        // Active moving entities (tanks, etc.)

    // Refs for props to avoid stale closures in the game loop
    const onStateUpdateRef = useRef(onStateUpdate);
    const onRevealSecretRef = useRef(onRevealSecret);
    const onGameOverRef = useRef(onGameOver);
    const objectMetadataRef = useRef(objectMetadata);
    const revealedSecretsRef = useRef(revealedSecrets);

    useEffect(() => { onStateUpdateRef.current = onStateUpdate; }, [onStateUpdate]);
    useEffect(() => { onRevealSecretRef.current = onRevealSecret; }, [onRevealSecret]);
    useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);
    useEffect(() => { objectMetadataRef.current = objectMetadata; }, [objectMetadata]);
    useEffect(() => { revealedSecretsRef.current = revealedSecrets; }, [revealedSecrets]);

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
            if (!secretData || !onRevealSecretRef.current) return;

            // Merge prop revealedSecrets with local tracking
            const mergedRevealed = [
                ...(revealedSecretsRef.current || []),
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
                onRevealSecretRef.current(indicesToReveal);
            }
        } catch (error) {
            errorHandler.error(error, {
                component: 'useGameEngine',
                function: 'checkSecretsWrapper',
                playerPosition: { x: currentX, y: currentY }
            });
        }
    };

    const lastMapIdRef = useRef(null);

    // Initialize player at starting position
    useEffect(() => {
        if (!mapData) {
            isInitialized.current = false;
            lastMapIdRef.current = null;
            return;
        }

        // Unique identifier for the map session
        // We use created_at/updated time or just the object reference itself if it's a completely new load
        // In Game/index.jsx loadMapData creates a new object {...activeMapData} for reset.
        const meta = mapData.meta || {};
        const currentMapId = meta.date_map_last_updated || meta.date_map_created_at || mapData.name || 'default';
        const isNewMapLoad = currentMapId !== lastMapIdRef.current;

        // Ja spēle jau ir inicializēta UN tā ir tā pati karte, nemainām spēlētāja pozīciju
        // Tas novērš "reset" uz sākumu, kad spēlētājs paceļ itemu (kas maina mapData atsauci, bet ne saturu)
        // Atļaujam pārlādi, ja entītiju saraksts ir tukšs (drošībai)
        if (isInitialized.current && !isNewMapLoad && entitiesRef.current.length > 0) return;

        lastMapIdRef.current = currentMapId;

        // Reset state for new initialization
        lastTimeRef.current = 0;
        hazardDamageAccumulatorRef.current = 0;
        lastHazardIndexRef.current = null;
        triggeredHazardsRef.current = new Set();
        projectilesRef.current = [];
        entitiesRef.current = [];
        shootCooldownRef.current = 0;
        projectileIdRef.current = 1;

        if (mapData && mapData.layers) {
            const mapW = mapData.meta?.width || mapData.width || 20;
            const mapH = mapData.meta?.height || mapData.height || 15;
            
            // Search for entities in objectData
            const initialEntities = [];
            if (objectData && Array.isArray(objectData)) {
                objectData.forEach((id, idx) => {
                    if (id && !id.includes('player')) {
                        const def = findItemById(id) || registryItems.find(r => r.id === id);
                        const isEntity = def && (
                            def.type === 'entity' || 
                            def.subtype === 'tank' || 
                            def.subtype === 'platform' ||
                            def.isPushable ||
                            (def.name && def.name.toLowerCase().includes('entities.'))
                        );

                        if (isEntity) {
                            initialEntities.push({
                                id: `entity_${idx}_${Date.now()}_${idx}`,
                                defId: id,
                                def: def,
                                x: (idx % mapW) * TILE_SIZE,
                                y: Math.floor(idx / mapW) * TILE_SIZE,
                                width: (Number(def.width) || 1) * TILE_SIZE,
                                height: (Number(def.height) || 1) * TILE_SIZE,
                                vx: 0,
                                vy: 0,
                                health: def.maxHealth || 100,
                                direction: def.subtype === 'platform' ? 1 : (def.isPushable ? 1 : -1),
                                animation: (def.subtype === 'platform' || def.isPushable) ? 'idle' : 'move',
                                animFrame: 0,
                                animTimer: 0,
                                isGrounded: false,
                                shootCooldown: 0,
                                currentSpriteIndex: 0,
                                subtype: def.subtype || (def.isPushable ? 'pushable' : null)
                            });
                        }
                    }
                });
            }
            entitiesRef.current = initialEntities;

            const objLayer = mapData.layers.find(l => l.name === 'entities');
            if (objLayer) {
                // 1. Priority: spawnTriggerId hint (from inter-map teleport)
                const spawnTriggerId = mapData.meta?.spawnTriggerId;
                let startIndex = -1;

                if (spawnTriggerId !== undefined && spawnTriggerId !== null) {
                    startIndex = objLayer.data.findIndex((id, idx) => {
                        if (!id || (!id.includes('target') && id !== 'portal_target')) return false;
                        const meta = objectMetadataRef.current?.[idx] || mapData.meta?.objectMetadata?.[idx];
                        return meta && meta.triggerId === spawnTriggerId;
                    });
                }

                // 2. Fallback: Search for player (anything containing 'player')
                if (startIndex === -1) {
                    startIndex = objLayer.data.findIndex(id => id && id.includes('player'));
                }

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
                        maxLavaResist: MAX_LAVA_RESIST,
                        strength: Number(registryPlayer?.strength) || 30,
                        maxStrength: Number(registryPlayer?.maxStrength) || 100,
                        lastPushTime: 0,
                        isWinning: false,
                        winCounter: 0
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

                    setPlayer({ ...gameState.current, projectiles: [], entities: entitiesRef.current });
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
                        maxLavaResist: MAX_LAVA_RESIST,
                        strength: 30,
                        maxStrength: 100,
                        lastPushTime: 0
                    };
                    setPlayer({ ...gameState.current, projectiles: [], entities: entitiesRef.current });
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
                    maxLavaResist: MAX_LAVA_RESIST,
                    strength: 30,
                    maxStrength: 100,
                    lastPushTime: 0
                };
                setPlayer({ ...gameState.current, projectiles: [], entities: entitiesRef.current });
                isInitialized.current = true;
            }
        }
    }, [mapData]); // objectData removed - item collection shouldn't trigger re-initialization

    // Helper function for collisions (AABB Collision) with blocks (tile layer) — delegates to GameEngine/collision
    const checkCollision = (newX, newY, mapWidth, mapHeightParam, widthOverride, heightOverride) => {
        return checkCollisionExternal(
            newX,
            newY,
            mapWidth,
            mapHeightParam,
            TILE_SIZE,
            tileData,
            registryItems,
            widthOverride !== undefined ? widthOverride : gameState.current.width,
            heightOverride !== undefined ? heightOverride : gameState.current.height,
            secretData,
            objectData,
            objectMetadataRef.current || mapData?.meta?.objectMetadata
        );
    };

    // Simple point solidity check for projectiles — delegates to GameEngine/collision
    const isSolidAtPixel = (wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE_OVERRIDE, tileDataOverride, registryItemsOverride, secretDataOverride, objectDataOverride, objectMetadataOverride) => {
        return isSolidAtPixelExternal(
            wx,
            wy,
            mapWidthTiles,
            mapHeightTiles,
            TILE_SIZE_OVERRIDE || TILE_SIZE,
            tileDataOverride || tileData,
            registryItemsOverride || registryItems,
            secretDataOverride || secretData,
            objectDataOverride || objectData,
            objectMetadataOverride || objectMetadataRef.current || mapData?.meta?.objectMetadata
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
    const spawnProjectile = (originX, originY, direction, ownerId = 'player') => {
        return spawnProjectileExternal({
            findItemById,
            TILE_SIZE,
            parseBool,
            projectilesRef,
            projectileIdRef,
            playShotSfx
        }, originX, originY, direction, ownerId);
    };

    // Game Loop (delegated to GameEngine/updateFrame)
    const update = (timestamp) => {
        const ctx = {
            mapData,
            objectData,
            input,
            refs: { gameState, isInitialized, lastTimeRef, projectilesRef, entitiesRef, shootCooldownRef, liquidDamageAccumulatorRef, oxygenDepleteAccRef, lavaDepleteAccRef },
            constants: { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE },
            registryItems,
            helpers: {
                checkCollision,
                getSurfaceProperties: (x, y, w, h, mw, mh, ts, td, ri) => getSurfaceProperties(x, y, w, h, mw, mh, ts, td, ri),
                isWaterAt: (wx, wy) => isWaterAtPixel(wx, wy, (mapData?.meta?.width || mapData?.width || 20), (mapData?.meta?.height || mapData?.height || 15)),
                getLiquidSample: ({ x, y, width, height, TILE_SIZE: TS, mapWidth, mapHeight }) =>
                    sampleLiquid({ x, y, width, height }, (mapData?.meta?.width || mapData?.width || 20), (mapData?.meta?.height || mapData?.height || 15))
            },
            actions: {
                collectItem: (x, y, mapWidth, objectLayer) =>
                    collectItem({ registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate: onStateUpdateRef.current, gameState }, x, y, mapWidth, objectLayer),
                checkInteractables: (x, y, mapWidth, objectLayer) =>
                    checkInteractables({ registryItems, TILE_SIZE, MAX_HEALTH, playShotSfx, onStateUpdate: onStateUpdateRef.current, gameState, mapData }, x, y, mapWidth, objectLayer),
                checkHazardDamage: (x, y, mapWidth, objectLayer, deltaMs) =>
                    checkHazardDamageWrapper(x, y, mapWidth, objectLayer, deltaMs),
                checkSecrets: (x, y, width, height, mapWidth, mapHeight) =>
                    checkSecretsWrapper(x, y, width, height, mapWidth, mapHeight),
                spawnProjectile: (originX, originY, direction, ownerId) =>
                    spawnProjectile(originX, originY, direction, ownerId),
                playSfx: (url, volume) => playShotSfx(url, volume),
                updateProjectiles: (deltaMs, mapWidth, mapHeight) =>
                    updateProjectiles({ 
                        projectilesRef, 
                        entitiesRef,
                        playerState: gameState.current,
                        TILE_SIZE, 
                        isSolidAtPixel, 
                        findItemById, 
                        objectData, 
                        objectMetadata: objectMetadataRef.current || mapData?.meta?.objectMetadata, 
                        onStateUpdate: onStateUpdateRef.current
                    }, deltaMs, mapWidth, mapHeight),
                setPlayer: (next) => setPlayer(next),
                onGameOver: onGameOverRef.current
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
    }, [mapData, objectData]); // Restart loop if map or objects change

    return player;
};

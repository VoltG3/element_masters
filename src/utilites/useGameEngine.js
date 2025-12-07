import { useState, useEffect, useRef } from 'react';
import { useInput } from './useInput';
import { findItemById } from '../GameRegistry';
import { checkHazardDamage } from '../GameEngine/checkHazardDamage';
import { spawnProjectile as spawnProjectileExternal } from '../GameEngine/spawnProjectile';
import { collectItem } from '../GameEngine/collectItem';
import { updateProjectiles } from '../GameEngine/updateProjectiles';
import { playSfx } from '../GameEngine/audio';
import { updateFrame } from '../GameEngine/updateFrame';
import { getLiquidAtPixel, isLiquidAtPixel as isLiquidAtPixelUtil, sampleLiquidForAABB } from '../GameEngine/liquids/liquidUtils';
import {
    isSolidAtPixel as isSolidAtPixelExternal,
    checkCollision as checkCollisionExternal
} from '../GameEngine/collision';

const TILE_SIZE = 32;
const GRAVITY = 0.6;
const TERMINAL_VELOCITY = 12;
const MOVE_SPEED = 4;
const JUMP_FORCE = 10;
const MAX_HEALTH = 100; // Maksimālā veselība

// Helper: accept boolean or string values like "true"/"false"
const parseBool = (v, def = false) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
    return def;
};

// Izmainīts arguments: pievienots objectData
export const useGameEngine = (mapData, tileData, objectData, registryItems, onGameOver, onStateUpdate) => {
    const input = useInput();

    // Spēlētāja stāvoklis
    const [player, setPlayer] = useState({
        x: 0, // Pikseļos
        y: 0, // Pikseļos
        width: 32, // Noklusējums, tiks pārrakstīts no reģistra
        height: 32,
        vx: 0,
        vy: 0,
        isGrounded: false,
        direction: 1, // 1 pa labi, -1 pa kreisi
        animation: 'idle', // idle, run, jump
        health: 90, // Sākotnējā veselība (testam, lai var paņemt sirdi)
        maxHealth: MAX_HEALTH,
        ammo: 0, // Fireball munīcija
        projectiles: [] // Aktīvie šāvieni renderam
    });

    // Ref objekti spēles loģikai
    const gameState = useRef({ ...player });               // Spēlētāja stāvoklis loopam (izvairās no closure problēmām)
    const requestRef = useRef();                           // requestAnimationFrame id
    const isInitialized = useRef(false);                   // Vai spēle ir inicializēta
    const lastTimeRef = useRef(0);                         // Laiks starp frame'iem (δt)
    const hazardDamageAccumulatorRef = useRef(0);          // Uzkrātais laiks hazard damage laika gaitā
    const lastHazardIndexRef = useRef(null);               // Pēdējā hazard tile indeksa cache (lai saistītu damage ar konkrētu hazard)
    const triggeredHazardsRef = useRef(new Set());         // Hazardi ar damageOnce: true, kuri jau ir nostrādājuši
    const projectilesRef = useRef([]);                     // Aktīvie šāviņi
    const shootCooldownRef = useRef(0);                    // Atlikušais cooldown laiks (ms)
    const projectileIdRef = useRef(1);                     // Auto ID pieaugums
    const soundEnabledRef = useRef(false);                 // Globālais skaņas slēdzis
    const audioCtxRef = useRef(null);                      // WebAudio konteksts (fallbackam)
    const audioCtxUnlockedRef = useRef(false);             // Vai AudioContext ir atbloķēts ar user gesture
    const liquidDamageAccumulatorRef = useRef(0);          // Uzkrātais laiks šķidrumu DPS tiksēšanai

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
        // AudioContext atbloķēšana ar user gesture (klikšķis uz HUD pogas u.c.)
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

    // Palīgfunkcija: atskaņo SFX (deleģēts uz GameEngine/audio)
    const playShotSfx = (url, volume) => {
        return playSfx({ soundEnabledRef, audioCtxRef, audioCtxUnlockedRef }, url, volume);
    };

    // Adapteris: pareizi izsauc GameEngine/checkHazardDamage ar options objektu
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
        } catch (e) {
            // klusais sargs — neļaujam spēlei apstāties, ja ir kļūda
        }
    };

    // Inicializējam spēlētāju sākuma pozīcijā
    // Svarīgi: Šis efekts tagad ir atkarīgs TIKAI no mapData (kurš nemainās, kad savāc itemu)
    useEffect(() => {
        // Resetējam hazard stāvokli, kad nomainās karte
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
                // Meklējam spēlētāju (jebko kas satur 'player')
                const startIndex = objLayer.data.findIndex(id => id && id.includes('player'));

                if (startIndex !== -1) {
                    let startX = (startIndex % mapW) * TILE_SIZE;
                    let startY = Math.floor(startIndex / mapW) * TILE_SIZE;

                    // Iegūstam datus no registry
                    const playerId = objLayer.data[startIndex];
                    const registryPlayer = findItemById(playerId) || findItemById("player"); // Fallback uz generic player
                    const maxHealth = Math.max(1, Number(registryPlayer?.maxHealth) || MAX_HEALTH);

                    // Pilnībā pārrakstām gameState ar noklusētajām vērtībām + jauno pozīciju
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
                        health: Math.min(90, maxHealth), // Resetojam uz 90 (nevis MAX), lai var testēt itemus
                        maxHealth,
                        ammo: 0
                    };

                    // Ja starta pozīcija iegrimst blokā, pabīdam uz augšu līdz drošai vietai
                    let guard = 0;
                    while (checkCollision(gameState.current.x, gameState.current.y, mapW, mapH) && guard < mapH) {
                        gameState.current.y = Math.max(0, gameState.current.y - TILE_SIZE);
                        guard++;
                    }
                    // Pārliecināmies, ka neatradāmies ārpus pasaules robežām horizontāli
                    const maxXAtStart = mapW * TILE_SIZE - gameState.current.width;
                    gameState.current.x = Math.max(0, Math.min(gameState.current.x, maxXAtStart));

                    setPlayer({ ...gameState.current, projectiles: [] });
                    isInitialized.current = true;
                } else {
                    // Ja spēlētājs nav atrasts kartē, novietojam to 0,0 vai kādā drošā vietā
                    gameState.current = {
                        ...gameState.current,
                        x: 0,
                        y: 0,
                        vx: 0,
                        vy: 0
                    };
                    setPlayer({ ...gameState.current, projectiles: [] });
                    isInitialized.current = true; // ļaujam loopam darboties arī bez start pozīcijas
                }
            } else {
                // Nav entities slāņa — tomēr startējam spēli 0,0
                gameState.current = {
                    ...gameState.current,
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0
                };
                setPlayer({ ...gameState.current, projectiles: [] });
                isInitialized.current = true;
            }
        }
    }, [mapData]);

    // Palīgfunkcija sadursmēm (AABB Collision) ar blokiem (tile slānis) — delegē uz GameEngine/collision
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
            gameState.current.height
        );
    };

    // Vienkārša punkta cietuma pārbaude projektiliem — delegē uz GameEngine/collision
    const isSolidAtPixel = (wx, wy, mapWidthTiles, mapHeightTiles) => {
        return isSolidAtPixelExternal(
            wx,
            wy,
            mapWidthTiles,
            mapHeightTiles,
            TILE_SIZE,
            tileData,
            registryItems
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

    // Item savākšana — pārcelta uz GameEngine/collectItem

    // Palīgfunkcija: izveidot jaunu šāviņu — pārcelts uz atsevišķu moduli
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

    // Game Loop (deleģēts uz GameEngine/updateFrame)
    const update = (timestamp) => {
        const ctx = {
            mapData,
            objectData,
            input,
            refs: { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef, liquidDamageAccumulatorRef },
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
                checkHazardDamage: (x, y, mapWidth, objectLayer, deltaMs) =>
                    checkHazardDamageWrapper(x, y, mapWidth, objectLayer, deltaMs),
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

    // Loop inicializācija / restartēšana
    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [mapData, tileData, objectData]); // Restartējam loopu ja mainās karte vai objekti

    return player;
};

import { useState, useEffect, useRef } from 'react';
import { useInput } from './useInput';
import { findItemById } from '../GameRegistry';

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

    // Palīgfunkcija: atskaņo SFX vai WebAudio pīkstienu kā fallback
    const playShotSfx = (url, volume) => {
        try {
            if (!soundEnabledRef.current) return;
            const vol = Math.max(0, Math.min(1, volume ?? 1));
            // 1) mēģinām ar HTMLAudio
            if (url && typeof url === 'string' && url.length > 0) {
                try {
                    const audio = new Audio(url);
                    audio.volume = vol;
                    // ja atskaņošana neizdodas, izmantojam fallback
                    audio.addEventListener?.('error', () => {
                        try { audio.pause(); } catch {}
                        beepFallback(vol);
                    }, { once: true });
                    const p = audio.play?.();
                    if (p && typeof p.catch === 'function') p.catch(() => beepFallback(vol));
                    return;
                } catch {
                    // kritiens uz fallback
                }
            }
            // 2) fallback uz WebAudio pīkstienu
            beepFallback(vol);
        } catch {}
    };

    const beepFallback = (vol) => {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!audioCtxRef.current) audioCtxRef.current = new AC();
            const ctx = audioCtxRef.current;
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume?.();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            // neliels klikšķis ~500Hz uz 80ms
            osc.type = 'square';
            osc.frequency.setValueAtTime(520, now);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.05, vol * 0.2), now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch {}
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
                        health: 90, // Resetojam uz 90 (nevis MAX), lai var testēt itemus
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

    // Palīgfunkcija sadursmēm (AABB Collision) ar blokiem (tile slānis)
    const checkCollision = (newX, newY, mapWidth, mapHeightParam) => {
        const points = [
            { x: newX, y: newY }, // Top Left
            { x: newX + gameState.current.width - 0.01, y: newY }, // Top Right
            { x: newX, y: newY + gameState.current.height - 0.01 }, // Bottom Left
            { x: newX + gameState.current.width - 0.01, y: newY + gameState.current.height - 0.01 } // Bottom Right
        ];

        for (let p of points) {
            // Konvertējam pikseļus uz Grid koordinātām
            const gridX = Math.floor(p.x / TILE_SIZE);
            const gridY = Math.floor(p.y / TILE_SIZE);
            const index = gridY * mapWidth + gridX;

            // Pārbaudām vai ārpus kartes (tikai horizontāli un virs kartes)
            // Atļaujam krist uz leju (gridY >= mapHeight), lai varētu nomirt
            if (gridX < 0 || gridX >= mapWidth || gridY < 0) return true;

            // Ja esam zem kartes, tā nav sadursme, tas ir kritiens
            if (gridY >= mapHeightParam) continue;

            const tileId = tileData[index];
            if (tileId) {
                const tileDef = registryItems.find(r => r.id === tileId);
                // Ja blokam ir definēta sadursme
                if (tileDef && tileDef.collision) {
                    return true;
                }
            }
        }
        return false;
    };

    // JAUNS: Vienkārša punkta cietuma pārbaude projektiliem (pēc PixiStage loģikas)
    const isSolidAtPixel = (wx, wy, mapWidthTiles, mapHeightTiles) => {
        // Ļaujam kustību virs kartes
        if (wy < 0) return false;
        const gx = Math.floor(wx / TILE_SIZE);
        const gy = Math.floor(wy / TILE_SIZE);
        // Ārpus pasaules nav ciets (projektils vienkārši tiks izmests ārā ar robežu pārbaudi)
        if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) return false;
        const index = gy * mapWidthTiles + gx;
        const tileId = tileData[index];
        if (!tileId) return false;
        const tileDef = registryItems.find(r => r.id === tileId);
        if (!tileDef || !tileDef.collision) return false;
        if (tileDef.collision === true) return true;
        if (typeof tileDef.collision === 'object') {
            return !!(tileDef.collision.top || tileDef.collision.bottom || tileDef.collision.left || tileDef.collision.right);
        }
        return false;
    };

    // JAUNS: Pārbauda priekšmetu savākšanu
    const checkItemCollection = (currentX, currentY, mapWidth, objectLayerData) => {
        if (!objectLayerData) return;

        // Pārbaudām spēlētāja centru
        const centerX = currentX + gameState.current.width / 2;
        const centerY = currentY + gameState.current.height / 2;

        const gridX = Math.floor(centerX / TILE_SIZE);
        const gridY = Math.floor(centerY / TILE_SIZE);
        const index = gridY * mapWidth + gridX;

        // Pārbaude vai indekss ir derīgs
        if (index < 0 || index >= objectLayerData.length) return;

        const itemId = objectLayerData[index];
        if (itemId) {
            const itemDef = registryItems.find(r => r.id === itemId);

            // Ja tas ir "pickup" items un nav spēlētājs
            if (itemDef && itemDef.pickup && !itemId.includes('player')) {
                // Health pickup
                if (itemDef.effect && itemDef.effect.health) {
                    const healthBonus = parseInt(itemDef.effect.health, 10);

                    // Ja dzīvība ir pilna, nevaram paņemt
                    if (gameState.current.health >= MAX_HEALTH) {
                        return;
                    }

                    // Ja varam paņemt
                    const newHealth = Math.min(gameState.current.health + healthBonus, MAX_HEALTH);
                    gameState.current.health = newHealth;

                    // Atskaņojam item pickup SFX (ja definēts)
                    try {
                        const vol = Math.max(0, Math.min(1, itemDef?.sfxVolume ?? 1));
                        playShotSfx(itemDef?.sfx, vol);
                    } catch {}

                    // Paziņojam, ka items ir savākts (lai to izdzēstu no kartes)
                    if (onStateUpdate) {
                        onStateUpdate('collectItem', index);
                    }
                    return;
                }

                // Fireball ammo pickup
                if (itemDef.effect && itemDef.effect.fireball) {
                    const ammoBonus = parseInt(itemDef.effect.fireball, 10) || 0;
                    gameState.current.ammo = Math.max(0, (gameState.current.ammo || 0) + ammoBonus);

                    // Atskaņojam item pickup SFX (ja definēts)
                    try {
                        const vol = Math.max(0, Math.min(1, itemDef?.sfxVolume ?? 1));
                        playShotSfx(itemDef?.sfx, vol);
                    } catch {}
                    if (onStateUpdate) {
                        onStateUpdate('collectItem', index);
                    }
                    return;
                }
            }
        }
    };

    // 🧨 JAUNS: Hazard apstrāde (damageOnce, damagePerSecond, damageDirections)
    const checkHazardDamage = (currentX, currentY, mapWidth, objectLayerData, deltaMs) => {
        if (!objectLayerData) {
            hazardDamageAccumulatorRef.current = 0;
            lastHazardIndexRef.current = null;
            return;
        }

        const width = gameState.current.width;
        const height = gameState.current.height;

        // Ņemam spēlētāja "apakšas centru" (stāv uz kaut kā)
        const bottomCenterX = currentX + width / 2;
        const bottomCenterY = currentY + height - 1;

        const gridX = Math.floor(bottomCenterX / TILE_SIZE);
        const gridY = Math.floor(bottomCenterY / TILE_SIZE);
        const index = gridY * mapWidth + gridX;

        // Indeša pārbaude
        if (index < 0 || index >= objectLayerData.length) {
            hazardDamageAccumulatorRef.current = 0;
            lastHazardIndexRef.current = null;
            return;
        }

        const objId = objectLayerData[index];
        if (!objId) {
            hazardDamageAccumulatorRef.current = 0;
            lastHazardIndexRef.current = null;
            return;
        }

        const objDef = registryItems.find(r => r.id === objId);
        if (!objDef || objDef.type !== 'hazard') {
            hazardDamageAccumulatorRef.current = 0;
            lastHazardIndexRef.current = null;
            return;
        }

        // Aprēķinam relāciju starp spēlētāju un hazard tile (virziens no kā nāk damage)
        const playerLeft = currentX;
        const playerRight = currentX + width;
        const playerTop = currentY;
        const playerBottom = currentY + height;

        const tileLeft = gridX * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;
        const tileTop = gridY * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;

        // Vai vispār pārklājas horizontāli/vertikāli (drošībai)
        const overlapsHorizontally = playerRight > tileLeft && playerLeft < tileRight;
        const overlapsVertically = playerBottom > tileTop && playerTop < tileBottom;
        if (!overlapsHorizontally || !overlapsVertically) {
            hazardDamageAccumulatorRef.current = 0;
            lastHazardIndexRef.current = null;
            return;
        }

        // Virzienu noteikšana (kādā pusē spēlētājs atrodas attiecībā pret hazardu)
        const touchingTop = playerBottom <= tileTop + 4 && playerBottom >= tileTop;       // Spēlētājs stāv virsū
        const touchingBottom = playerTop >= tileBottom - 4 && playerTop <= tileBottom;    // Spēlētājs ir zem hazard
        const touchingLeft = playerRight <= tileRight && playerRight >= tileRight - 4;    // Spēlētājs ir pa kreisi
        const touchingRight = playerLeft >= tileLeft && playerLeft <= tileLeft + 4;       // Spēlētājs ir pa labi

        // damageDirections: ja nav definēts, uzskatām, ka hazard dara damage no visām pusēm
        const dirs = objDef.damageDirections || {
            top: true,
            bottom: true,
            left: true,
            right: true
        };

        const dirOK =
            (touchingTop && dirs.top) ||
            (touchingBottom && dirs.bottom) ||
            (touchingLeft && dirs.left) ||
            (touchingRight && dirs.right);

        if (!dirOK) {
            // Nav “aktīvs” šajā virzienā → neresetojam triggeredHazards (once),
            // bet neuzkrājam damagePerSecond.
            hazardDamageAccumulatorRef.current = 0;
            lastHazardIndexRef.current = null;
            return;
        }

        // Tagad tiešām uzskatām, ka spēlētājs saņem hazard damage
        lastHazardIndexRef.current = index;

        const damageOnce = !!objDef.damageOnce;
        const baseDamage = objDef.damage ?? 0;
        const dps = objDef.damagePerSecond ?? baseDamage; // Ja nav dps, izmanto damage kā vienību sekundē

        // Vienreizējs damage (piemēram, lāpstiņa, kas tikai vienu reizi aizskar)
        if (damageOnce) {
            if (!triggeredHazardsRef.current.has(index)) {
                triggeredHazardsRef.current.add(index);

                gameState.current.health = Math.max(0, gameState.current.health - baseDamage);

                // Neliels “pushback” efekts, lai justos, ka tiešām trāpīja
                if (touchingTop) {
                    // Ja uzkāpj virsū hazardam, drusku “atsperam” uz augšu
                    gameState.current.vy = -JUMP_FORCE * 0.4;
                } else if (touchingLeft) {
                    gameState.current.vx = -MOVE_SPEED * 1.5;
                } else if (touchingRight) {
                    gameState.current.vx = MOVE_SPEED * 1.5;
                }

                return; // once damage jau pielietots
            }
        } else {
            // Damage laika gaitā (damagePerSecond)
            hazardDamageAccumulatorRef.current += deltaMs;

            // Ja spēlētājs vairs nav uz tā paša hazard, resetojam
            if (lastHazardIndexRef.current !== index) {
                hazardDamageAccumulatorRef.current = 0;
            }

            // Kad uzkrātais laiks sasniedz 1 sekundi, uzliekam damage
            const TICK_MS = 1000; // 1 sekunde
            while (hazardDamageAccumulatorRef.current >= TICK_MS) {
                hazardDamageAccumulatorRef.current -= TICK_MS;
                gameState.current.health = Math.max(0, gameState.current.health - dps);
            }
        }
    };

    // Palīgfunkcija: izveidot jaunu šāviņu
    const spawnProjectile = (originX, originY, direction) => {
        const pDef = findItemById('fireball_basic');
        const id = projectileIdRef.current++;
        const w = Math.max(2, ((pDef?.width || 0.25) * TILE_SIZE));
        const h = Math.max(2, ((pDef?.height || 0.25) * TILE_SIZE));
        const speedPxPerSec = (pDef?.speed ? pDef.speed * 60 : 14 * 60);
        const vx = (direction >= 0 ? 1 : -1) * speedPxPerSec;
        const vy = 0;
        const life = Math.max(200, pDef?.lifespan || 600);
        // Ricochet toggle: prefer new key 'ricochetOnTiles', else fallback to 'collisionWithPenetration'
        const ricochetFlag = (typeof pDef?.ricochetOnTiles !== 'undefined')
            ? !!pDef.ricochetOnTiles
            : parseBool(pDef?.collisionWithPenetration, true); // default true to match previous behavior
        const proj = {
            id,
            x: originX,
            y: originY,
            vx,
            vy,
            w,
            h,
            life,
            defId: pDef?.id || 'fireball_basic',
            dir: direction >= 0 ? 1 : -1,
            // cache collision flags no reģistra
            cwt: !!(pDef && pDef.collisionWithTiles),
            hbs: Math.max(0.1, Math.min(1.0, (pDef?.hitboxScale ?? 1))),
            ric: ricochetFlag
        };
        projectilesRef.current.push(proj);

        // Play shot SFX (ar fallback)
        try {
            const vol = Math.max(0, Math.min(1, pDef?.sfxVolume ?? 1));
            playShotSfx(pDef?.sfx, vol);
        } catch {}
    };

    // Game Loop
    const update = (timestamp) => {
        // Keep RAF alive even if init not finished yet
        if (!isInitialized.current || !mapData) {
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        // Aprēķinām delta laiku (ms) kopš pēdējā frame
        if (!lastTimeRef.current) {
            lastTimeRef.current = timestamp;
        }
        const deltaMs = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Pause the game while terminal is open, but keep RAF alive and time in sync
        try {
            if (window.__GAME_TERMINAL_OPEN__) {
                requestRef.current = requestAnimationFrame(update);
                return;
            }
        } catch {}

        const mapWidth = mapData.meta?.width || mapData.width || 20;
        const mapHeight = mapData.meta?.height || mapData.height || 15;
        const keys = input.current;

        let {
            x,
            y,
            vx,
            vy,
            width,
            height,
            isGrounded,
            direction,
            animation,
            health
        } = gameState.current;

        // --- 1. Horizontālā kustība ---
        vx = 0;
        if (keys.a) {
            vx = -MOVE_SPEED;
            direction = -1;
        }
        if (keys.d) {
            vx = MOVE_SPEED;
            direction = 1;
        }

        // Pārbaudām horizontālo sadursmi un pielīdzinām pie sienas
        const proposedX = x + vx;
        if (checkCollision(proposedX, y, mapWidth, mapHeight)) {
            if (vx > 0) {
                // Kustība pa labi: pielīdzinām pie kreisās sienas malas
                x = Math.floor((proposedX + width) / TILE_SIZE) * TILE_SIZE - width;
            } else if (vx < 0) {
                // Kustība pa kreisi: pielīdzinām pie labās sienas malas
                x = Math.ceil(proposedX / TILE_SIZE) * TILE_SIZE;
            }
            vx = 0; // Apstājamies, ja siena
        } else {
            x = proposedX;
        }

        // --- 2. Vertikālā kustība (Gravitācija & Lēkšana) ---

        // Lēkšana
        if ((keys.space || keys.w) && isGrounded) {
            vy = -JUMP_FORCE;
            isGrounded = false;
            animation = 'jump';
        }

        // Gravitācija
        vy += GRAVITY;
        if (vy > TERMINAL_VELOCITY) vy = TERMINAL_VELOCITY;

        // Pārbaudām vertikālo sadursmi
        if (checkCollision(x, y + vy, mapWidth, mapHeight)) {
            // Ja krītam uz leju (vy > 0), tātad zeme
            if (vy > 0) {
                isGrounded = true;
                // "Pielīdzinām" pie Grid līnijas, lai neiegrimtu zemē
                y = Math.floor((y + vy + height) / TILE_SIZE) * TILE_SIZE - height;
                if (Math.abs(vx) > 0) {
                    animation = 'run';
                } else {
                    animation = 'idle';
                }
            }
            // Ja lecam uz augšu (vy < 0), tātad griesti
            else if (vy < 0) {
                y = Math.ceil((y + vy) / TILE_SIZE) * TILE_SIZE;
            }
            vy = 0;
        } else {
            isGrounded = false;
            y += vy;
            if (vy > 0) {
                animation = 'fall';
            }
        }

        // JAUNS: Pārbaudām itemu savākšanu pēc kustības
        checkItemCollection(x, y, mapWidth, objectData);

        // JAUNS: Pārbaudām hazard damage pēc kustības
        checkHazardDamage(x, y, mapWidth, objectData, deltaMs);

        // JAUNS: Šaušana ar peli (kreisā poga)
        shootCooldownRef.current = Math.max(0, (shootCooldownRef.current || 0) - deltaMs);
        const SHOOT_COOLDOWN_MS = 160; // vienkāršs cooldown
        if (keys.mouseLeft && shootCooldownRef.current <= 0 && (gameState.current.ammo || 0) > 0) {
            // izšaujam no spēlētāja centra malas atkarībā no virziena
            const originX = x + (direction >= 0 ? (width) : 0);
            const originY = y + height * 0.5;
            spawnProjectile(originX, originY, direction);
            gameState.current.ammo = Math.max(0, (gameState.current.ammo || 0) - 1);
            shootCooldownRef.current = SHOOT_COOLDOWN_MS;
        }

            // JAUNS: Atjaunojam šāviņus (ar rikošeta fiziku pret flīzēm)
        const dtProj = deltaMs / 1000;
        const worldW = mapWidth * TILE_SIZE;
        const worldH = mapHeight * TILE_SIZE;

        // Palīgfunkcija: AABB cietuma pārbaude punktiem (4 stūri)
        const isSolidRect = (cx, cy, hw, hh) => {
            const pts = [
                { x: cx - hw, y: cy - hh },
                { x: cx + hw, y: cy - hh },
                { x: cx - hw, y: cy + hh },
                { x: cx + hw, y: cy + hh },
            ];
            for (let k = 0; k < pts.length; k++) {
                const pt = pts[k];
                if (isSolidAtPixel(pt.x, pt.y, mapWidth, mapHeight)) return true;
            }
            return false;
        };

        if (projectilesRef.current.length) {
            for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
                const p = projectilesRef.current[i];

                // Bāzes parametri rikošetiem
                if (p.bounces == null) p.bounces = 0;
                const maxBounces = Number.isFinite(p.maxBounces) ? p.maxBounces : (findItemById(p.defId)?.maxBounces ?? 3);
                const bounceDamp = Number.isFinite(p.bounceDamping) ? p.bounceDamping : (findItemById(p.defId)?.bounceDamping ?? 0.6);
                const ricRand = Number.isFinite(p.ricochetRandom) ? p.ricochetRandom : (findItemById(p.defId)?.ricochetRandom ?? 0.15);

                // Aprēķinām apakš-soļus pēc ātruma, lai izvairītos no tuneļa efekta
                const maxDelta = Math.max(Math.abs(p.vx * dtProj), Math.abs(p.vy * dtProj));
                let steps = Math.ceil(maxDelta / 4);
                if (!Number.isFinite(steps) || steps < 1) steps = 1;
                steps = Math.min(steps, 20);
                const stepTime = dtProj / steps;

                let cx = p.x;
                let cy = p.y;
                const hw = (p.w * (p.hbs || 1)) * 0.5;
                const hh = (p.h * (p.hbs || 1)) * 0.5;

                let removed = false;

                for (let s = 0; s < steps; s++) {
                    // 1) kustība pa X
                    let nextX = cx + p.vx * stepTime;
                    if (p.cwt && isSolidRect(nextX, cy, hw, hh)) {
                        if (p.ric) {
                            // rikošets pa X asi
                            p.vx = -p.vx * bounceDamp;
                            // neliels trajektorijas sajaukums (atkarīgs no kopējā ātruma)
                            const sp = Math.max(40, Math.hypot(p.vx, p.vy));
                            const jitter = (Math.random() * 2 - 1) * sp * ricRand;
                            p.vy += jitter * 0.15;
                            p.bounces += 1;
                            p.life = Math.max(0, p.life - 80); // saīsina mūžu pēc trieciena
                            // neatjauninām X pozīciju šajā apakšsolī (paliek pie sienas malas)
                        } else {
                            removed = true;
                            break;
                        }
                    } else {
                        cx = nextX;
                    }

                    // 2) kustība pa Y
                    let nextY = cy + p.vy * stepTime;
                    if (p.cwt && isSolidRect(cx, nextY, hw, hh)) {
                        if (p.ric) {
                            // rikošets pa Y asi
                            p.vy = -p.vy * bounceDamp;
                            const sp = Math.max(40, Math.hypot(p.vx, p.vy));
                            const jitter = (Math.random() * 2 - 1) * sp * ricRand;
                            p.vx += jitter * 0.15;
                            p.bounces += 1;
                            p.life = Math.max(0, p.life - 80);
                            // neatjauninām Y pozīciju šajā apakšsolī
                        } else {
                            removed = true;
                            break;
                        }
                    } else {
                        cy = nextY;
                    }

                    // Aizsardzība pret iesprūšanu stūros: ja nokļūst solīdā, atbīdam atpakaļ un atspoguļojam abas ass
                    if (p.cwt && isSolidRect(cx, cy, hw, hh)) {
                        if (p.ric) {
                            // atspoguļojam abas asis un pabīdam minimāli ārā
                            p.vx = -p.vx * bounceDamp;
                            p.vy = -p.vy * bounceDamp;
                            p.bounces += 1;
                            cx -= Math.sign(p.vx || 1) * 0.5;
                            cy -= Math.sign(p.vy || 1) * 0.5;
                        } else {
                            removed = true;
                            break;
                        }
                    }

                    // pārtraucam, ja pārsniegts bounces limits vai mazs ātrums
                    const speedNow = Math.hypot(p.vx, p.vy);
                    if (p.bounces >= maxBounces || speedNow < 40) {
                        removed = true;
                        break;
                    }
                }

                if (removed) {
                    projectilesRef.current.splice(i, 1);
                    continue;
                }

                // pabeidzam atjaunināšanu
                p.x = cx;
                p.y = cy;
                p.life -= deltaMs;
                // atjauninām sprite virzienu
                p.dir = (p.vx >= 0 ? 1 : -1);

                // robežas un dzīves laiks
                if (p.life <= 0 || p.x < -64 || p.x > worldW + 64 || p.y < -64 || p.y > worldH + 64) {
                    projectilesRef.current.splice(i, 1);
                }
            }
        }

        // JAUNS: Game Over pārbaude pēc health (hazardi, u.c.)
        if (gameState.current.health <= 0) {
            gameState.current.health = 0;
            setPlayer({ ...gameState.current });

            if (onGameOver) {
                onGameOver();
            }
            // Apturam loopu, lai nešautu gameOver n-tās reizes
            isInitialized.current = false;
            return;
        }

        // JAUNS: Game Over pārbaude - ja nokrīt zem kartes
        if (y > worldH + 100) {
            if (onGameOver) {
                onGameOver();
            }
            isInitialized.current = false;
            return;
        }

        // Pasaules robežas (horizontāli): neļaujam iziet ārpus kartes
        const maxX = mapWidth * TILE_SIZE - width;
        if (x < 0) x = 0;
        if (x > maxX) x = Math.max(0, maxX);

        // Atjaunojam state ref
        gameState.current = {
            ...gameState.current,
            x,
            y,
            vx,
            vy,
            isGrounded,
            direction,
            animation
            // health paliek gameState.current.health, jo to mainījām hazard/item funkcijās
        };

        // React state atjaunojam, lai notiktu renderēšana
        setPlayer({ ...gameState.current, projectiles: projectilesRef.current.slice(0) });

        // Nākamais frame
        requestRef.current = requestAnimationFrame(update);
    };

    // Loop inicializācija / restartēšana
    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [mapData, tileData, objectData]); // Restartējam loopu ja mainās karte vai objekti

    return player;
};

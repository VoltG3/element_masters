import { useState, useEffect, useRef } from 'react';
import { useInput } from './useInput';
import { findItemById } from '../GameRegistry';

const TILE_SIZE = 32;
const GRAVITY = 0.6;
const TERMINAL_VELOCITY = 12;
const MOVE_SPEED = 4;
const JUMP_FORCE = 10;
const MAX_HEALTH = 100; // Maksimālā veselība

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
        health: 90 // Sākotnējā veselība (testam, lai var paņemt sirdi)
    });

    // Ref objekti spēles loģikai
    const gameState = useRef({ ...player });               // Spēlētāja stāvoklis loopam (izvairās no closure problēmām)
    const requestRef = useRef();                           // requestAnimationFrame id
    const isInitialized = useRef(false);                   // Vai spēle ir inicializēta
    const lastTimeRef = useRef(0);                         // Laiks starp frame'iem (δt)
    const hazardDamageAccumulatorRef = useRef(0);          // Uzkrātais laiks hazard damage laika gaitā
    const lastHazardIndexRef = useRef(null);               // Pēdējā hazard tile indeksa cache (lai saistītu damage ar konkrētu hazard)
    const triggeredHazardsRef = useRef(new Set());         // Hazardi ar damageOnce: true, kuri jau ir nostrādājuši

    // Inicializējam spēlētāju sākuma pozīcijā
    // Svarīgi: Šis efekts tagad ir atkarīgs TIKAI no mapData (kurš nemainās, kad savāc itemu)
    useEffect(() => {
        // Resetējam hazard stāvokli, kad nomainās karte
        isInitialized.current = false;
        lastTimeRef.current = 0;
        hazardDamageAccumulatorRef.current = 0;
        lastHazardIndexRef.current = null;
        triggeredHazardsRef.current = new Set();

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
                        health: 90 // Resetojam uz 90 (nevis MAX), lai var testēt itemus
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

                    setPlayer({ ...gameState.current });
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
                    setPlayer({ ...gameState.current });
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
                setPlayer({ ...gameState.current });
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

                // Loģika specifiskiem itemiem
                if (itemDef.effect && itemDef.effect.health) {
                    const healthBonus = parseInt(itemDef.effect.health, 10);

                    // Ja dzīvība ir pilna, nevaram paņemt
                    if (gameState.current.health >= MAX_HEALTH) {
                        return;
                    }

                    // Ja varam paņemt
                    const newHealth = Math.min(gameState.current.health + healthBonus, MAX_HEALTH);
                    gameState.current.health = newHealth;

                    // Paziņojam, ka items ir savākts (lai to izdzēstu no kartes)
                    if (onStateUpdate) {
                        onStateUpdate('collectItem', index);
                    }
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
        const mapPixelHeight = mapHeight * TILE_SIZE;
        if (y > mapPixelHeight + 100) {
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
        setPlayer({ ...gameState.current });

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

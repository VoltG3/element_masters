import { useState, useEffect, useRef } from 'react';
import { useInput } from './useInput';
import { findItemById } from '../GameRegistry';

const TILE_SIZE = 32;
const GRAVITY = 0.6;
const TERMINAL_VELOCITY = 12;
const MOVE_SPEED = 4;
const JUMP_FORCE = 10;
const MAX_HEALTH = 90;

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
        health: MAX_HEALTH // JAUNS: Izmantojam konstanti
    });

    const gameState = useRef({ ...player }); // Izmantojam ref lai izvairītos no closure problēmām loopā
    const requestRef = useRef();
    const isInitialized = useRef(false);

    // Inicializējam spēlētāju sākuma pozīcijā
    // Svarīgi: Šis efekts tagad ir atkarīgs TIKAI no mapData (kurš nemainās, kad savāc itemu)
    useEffect(() => {
        // JAUNS: Resetojam inicializācijas karogu un apturam loopu, kamēr meklējam jaunu pozīciju
        isInitialized.current = false;
    
        if (mapData && mapData.layers) {
            const objLayer = mapData.layers.find(l => l.name === 'entities');
            if (objLayer) {
                // Meklējam spēlētāju (jebko kas satur 'player')
                const startIndex = objLayer.data.findIndex(id => id && id.includes('player'));
            
                if (startIndex !== -1) {
                    const startX = (startIndex % mapData.meta.width) * TILE_SIZE;
                    const startY = Math.floor(startIndex / mapData.meta.width) * TILE_SIZE;
                
                    // Iegūstam datus no registry
                    const playerId = objLayer.data[startIndex];
                    const registryPlayer = findItemById(playerId) || findItemById("player"); // Fallback uz generic player

                    // JAUNS: Pilnībā pārrakstām gameState ar noklusētajām vērtībām + jauno pozīciju
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
                        health: MAX_HEALTH // Resetojam dzīvības sākumā
                    };
                
                    setPlayer(gameState.current);
                    isInitialized.current = true;
                } else {
                    // Ja spēlētājs nav atrasts kartē, novietojam to 0,0 vai kādā drošā vietā
                    // Tas novērš veco koordinātu saglabāšanos
                    gameState.current = {
                        ...gameState.current,
                        x: 0,
                        y: 0,
                        vx: 0, 
                        vy: 0
                    };
                    setPlayer(gameState.current);
                }
            }
        }
    }, [mapData]); // Šeit mapData ir tas, kas nāk no faila, un tas nemainās spēles laikā

    // Palīgfunkcija sadursmēm (AABB Collision)
    const checkCollision = (newX, newY, mapWidth) => {
        // ... existing code ...
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
            // JAUNS: Atļaujam krist uz leju (gridY >= mapHeight), lai varētu nomirt
            if (gridX < 0 || gridX >= mapWidth || gridY < 0) return true;
        
            // Ja esam zem kartes, tā nav sadursme, tas ir kritiens
            if (gridY >= mapData.meta.height) continue;

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

    // Game Loop
    const update = () => {
        if (!isInitialized.current || !mapData) return;

        const mapWidth = mapData.meta.width;
        const keys = input.current;
        let { x, y, vx, vy, width, height, isGrounded } = gameState.current;

        // ... existing code (movement & collision) ...
        // --- 1. Horizontālā kustība ---
        vx = 0;
        if (keys.a) {
            vx = -MOVE_SPEED;
            gameState.current.direction = -1;
        }
        if (keys.d) {
            vx = MOVE_SPEED;
            gameState.current.direction = 1;
        }

        // Pārbaudām horizontālo sadursmi
        if (checkCollision(x + vx, y, mapWidth)) {
            vx = 0; // Apstājamies, ja siena
        }
        x += vx;

        // --- 2. Vertikālā kustība (Gravitācija & Lēkšana) ---

        // Lēkšana
        if (keys.space && isGrounded) {
            vy = -JUMP_FORCE;
            isGrounded = false;
        }

        // Gravitācija
        vy += GRAVITY;
        if (vy > TERMINAL_VELOCITY) vy = TERMINAL_VELOCITY;

        // Pārbaudām vertikālo sadursmi
        // Pārbaudām nākotnes pozīciju
        if (checkCollision(x, y + vy, mapWidth)) {
            // Ja krītam uz leju (vy > 0), tātad zeme
            if (vy > 0) {
                isGrounded = true;
                // "Pielīdzinām" pie Grid līnijas, lai neiegrimtu zemē
                y = Math.floor((y + vy + height) / TILE_SIZE) * TILE_SIZE - height;
            }
            // Ja lecam uz augšu (vy < 0), tātad griesti
            else if (vy < 0) {
                y = Math.ceil((y + vy) / TILE_SIZE) * TILE_SIZE;
            }
            vy = 0;
        } else {
            isGrounded = false;
            y += vy;
        }

        // JAUNS: Pārbaudām itemu savākšanu pēc kustības
        // Izmantojam objectData argumentu (kas ir dinamiskais state no game.jsx)
        checkItemCollection(x, y, mapWidth, objectData);

        // JAUNS: Game Over pārbaude - ja nokrīt zem kartes
        const mapPixelHeight = mapData.meta.height * TILE_SIZE;
        if (y > mapPixelHeight + 100) {
            if (onGameOver) {
                onGameOver();
            }
            // Apturam loopu lai neizsauktu game over vairākas reizes
            isInitialized.current = false; 
        }

        // Atjaunojam state
        gameState.current = { ...gameState.current, x, y, vx, vy, isGrounded };

        // React state atjaunojam, lai notiktu renderēšana
        // (Reālā spēlē renderētu canvas, bet React DOM vajag state)
        setPlayer({ ...gameState.current });

        requestRef.current = requestAnimationFrame(update);
    };

    // Mainām dependency array: tagad loop restartējas, ja mainās objectData
    // Bet tas ir OK, jo update funkcija izmanto closure over objectData, 
    // tāpēc mums vajag restartēt loopu, lai tas redzētu jauno objectData.
    // SVARĪGI: Lai neresetotu spēlētāja pozīciju, useEffect ar setPlayer/initialization ir atsevišķs!
    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [mapData, tileData, objectData]); 

    return player;
};
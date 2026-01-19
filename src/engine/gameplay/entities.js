import { moveHorizontal } from '../physics/horizontal';
import { applyVerticalPhysics } from '../physics/vertical';

/**
 * Atjaunina visas aktīvās entītijas (piemēram, tankus).
 * @param {Object} ctx Konteksts ar nepieciešamajiem datiem un funkcijām
 * @param {number} deltaMs Laiks kopš pēdējā kadra
 */
export function updateEntities(ctx, deltaMs) {
  const {
    entitiesRef,
    gameState,
    mapWidth,
    mapHeight,
    TILE_SIZE,
    checkCollision,
    isLiquidAt,
    getLiquidSample,
    spawnProjectile,
    playSfx,
    constants,
    objectData,
    mapData,
    registryItems
  } = ctx;

  if (!entitiesRef.current || entitiesRef.current.length === 0) return;

  const { GRAVITY, TERMINAL_VELOCITY } = constants;
  const playerX = gameState.current.x;
  const playerY = gameState.current.y;

  // Mēs modificējam entītijas pa tiešo refā
  entitiesRef.current = entitiesRef.current.map(entity => {
    // 1. Ja entītija ir mirusi, apstrādājam sprādzienu vai noņemšanu
    if (entity.health <= 0) {
      if (!entity.isExploding) {
        entity.isExploding = true;
        entity.animation = 'explode';
        entity.animFrame = 0;
        entity.animTimer = 0;
        entity.vx = 0; // Apstājamies sprādziena laikā
        entity.vy = 0;
        entity.isGrounded = true; // Sprāgst uz zemes
      }
      
      const def = entity.def;
      const explodeAnim = def.spriteSheet?.animations?.explode || [];
      const totalFrames = explodeAnim.length;
      const frameDuration = 100; // ms uz kadru
      
      entity.animTimer += deltaMs;
      if (entity.animTimer >= frameDuration) {
        entity.animTimer = 0;
        entity.animFrame++;
        if (entity.animFrame >= totalFrames) {
          entity.shouldRemove = true;
        }
      }
      return entity;
    }

    const def = entity.def;
    
    // 1.2. Liquid damage (e.g. lava, radioactive water)
    const liquidSample = getLiquidSample ? getLiquidSample({
      x: entity.x,
      y: entity.y,
      width: entity.width,
      height: entity.height,
      TILE_SIZE,
      mapWidth,
      mapHeight
    }) : { inLiquid: false };

    if (liquidSample.inLiquid && liquidSample.params && liquidSample.params.dps > 0) {
      entity.liquidDamageAcc = (entity.liquidDamageAcc || 0) + deltaMs;
      while (entity.liquidDamageAcc >= 1000) {
        entity.liquidDamageAcc -= 1000;
        entity.health = Math.max(0, entity.health - liquidSample.params.dps);
      }
    } else {
      entity.liquidDamageAcc = 0;
    }

    // 1.3. Weather damage (Lava Rain, Radioactive Fog)
    const weather = mapData.weather || {};
    const lavaRainInt = Number(weather.lavaRain || 0);
    const radioFogInt = Number(weather.radioactiveFog || 0);

    if (lavaRainInt > 0 || radioFogInt > 0) {
      entity.weatherDamageAcc = (entity.weatherDamageAcc || 0) + deltaMs;
      if (entity.weatherDamageAcc >= 1000) {
        entity.weatherDamageAcc -= 1000;
        let totalWeatherDps = 0;
        if (lavaRainInt > 0) totalWeatherDps += (lavaRainInt / 100) * 10;
        if (radioFogInt > 0) totalWeatherDps += (radioFogInt / 100) * 5;
        
        if (totalWeatherDps > 0) {
          entity.health = Math.max(0, entity.health - totalWeatherDps);
        }
      }
    } else {
      entity.weatherDamageAcc = 0;
    }

    // 1.5. Pushable objektu (Akmeņu) fizika
    if (entity.subtype === 'pushable' || def?.isPushable) {
      const inLiquid = liquidSample.inLiquid;
      const liquidType = liquidSample.type;

      // Skaņas, ja iekrīt šķidrumā
      if (inLiquid && !entity.prevInLiquid) {
        if (liquidType === 'water' && def.sounds?.water_splash) {
          playSfx(def.sounds.water_splash, 0.4);
        } else if (liquidType === 'lava' && def.sounds?.lava_splash) {
          playSfx(def.sounds.lava_splash, 0.4);
        }
      }
      entity.prevInLiquid = inLiquid;

        // Horizontālā kustība ar berzi
        const mh = moveHorizontal({
          keys: {}, 
          state: { x: entity.x, y: entity.y, vx: entity.vx || 0, width: entity.width, height: entity.height, direction: entity.direction },
          MOVE_SPEED: 6.0, // Palielināts max ātrums akmeņiem (Supaplex stilā)
          TILE_SIZE,
          mapWidth,
          mapHeight,
          checkCollision: (nx, ny, mw, mh, w, h) => {
            // Pārbaudām statisko pasauli un citas entītijas
            if (checkCollision(nx, ny, mw, mh, w, h, entity.id)) return true;
            
            // Pārbaudām kolīziju ar spēlētāju
            const p = gameState.current;
            const ew = w || entity.width;
            const eh = h || entity.height;
            return (nx < p.x + p.width && nx + ew > p.x && ny < p.y + p.height && ny + eh > p.y);
          },
          friction: inLiquid ? 0.7 : 0.85,
          acceleration: 0.2
        });
        entity.x = mh.x;
        entity.vx = mh.vx;
        entity.direction = mh.direction;

      // Vertikālā fizika
      if (inLiquid && liquidType === 'lava') {
        // Lēna slīkšana lavā
        const sinkingSpeed = def.sinkingSpeed || 0.2;
        entity.vy = sinkingSpeed;
        entity.y += entity.vy;
        entity.isGrounded = false;
        
        // Pārbaudām vai neesam izgājuši cauri zemei lavā
        if (checkCollision(entity.x, entity.y, mapWidth, mapHeight, entity.width, entity.height, entity.id)) {
           // Atstumjam atpakaļ, ja atduras pret dibenu
           entity.y -= entity.vy;
           entity.vy = 0;
           entity.isGrounded = true;
        }
      } else {
        // Fall distance tracking: if falling, accumulate distance
        if (entity.isGrounded) {
          entity.fallDistance = 0;
        } else if ((entity.vy || 0) > 0) {
          entity.fallDistance = (entity.fallDistance || 0) + (entity.vy || 0);
        }

        // Standarta gravitācija (ūdenī lēnāka)
        const vp = applyVerticalPhysics({
          keys: {}, 
          x: entity.x,
          y: entity.y,
          vy: entity.vy || 0,
          isGrounded: entity.isGrounded,
          animation: 'idle',
          GRAVITY: inLiquid ? GRAVITY * 0.3 : GRAVITY,
          TERMINAL_VELOCITY,
          JUMP_FORCE: 0,
          TILE_SIZE,
          width: entity.width,
          height: entity.height,
          mapWidth,
          mapHeight,
          checkCollision: (nx, ny, mw, mh, w, h) => {
            // 1. Pārbaudām statisko pasauli un citas entītijas
            if (checkCollision(nx, ny, mw, mh, w, h, entity.id)) {
              // Ja mēs kaut kam uzkrītam un esam krituši pietiekami ilgi
              if ((entity.fallDistance || 0) >= TILE_SIZE * 0.8) {
                // Atrodam kuru entītiju mēs aizskārām (lai nogalinātu ienaidniekus)
                if (entitiesRef.current) {
                  for (const other of entitiesRef.current) {
                    if (other.id === entity.id || other.health <= 0 || other.subtype === 'platform' || other.subtype === 'pushable') continue;
                    
                    const hitOther = (
                      nx < other.x + other.width &&
                      nx + (w || entity.width) > other.x &&
                      ny < other.y + other.height &&
                      ny + (h || entity.height) > other.y
                    );
                    
                    if (hitOther) {
                      other.health = 0; // Nogalinām ienaidnieku
                      // Varētu atskaņot skaņu, ja tāda definēta
                      if (def.sounds?.kill_enemy) {
                        playSfx(def.sounds.kill_enemy, 0.5);
                      }
                    }
                  }
                }
              }
              return true;
            }
            
            // 2. Pārbaudām kolīziju ar spēlētāju
            const p = gameState.current;
            const ew = w || entity.width;
            const eh = h || entity.height;
            const hitPlayer = (nx < p.x + p.width && nx + ew > p.x && ny < p.y + p.height && ny + eh > p.y);
            
            if (hitPlayer) {
              // Ja akmens uzkrīt spēlētājam pēc brīva kritiena (vismaz 1 tukšs bloks)
              if ((entity.fallDistance || 0) >= TILE_SIZE * 0.8) {
                gameState.current.health = 0; // Fatal impact
              }
              return true;
            }
            
            return false;
          },
          isLiquidAt,
          vx: entity.vx
        });
        entity.y = vp.y;
        entity.vy = vp.vy;
        entity.isGrounded = vp.isGrounded;

        // --- ROLLING LOGIC (Supaplex style) ---
        // Akmeņi ripo lejā no citiem apaļiem objektiem vai pakāpieniem, ja ir brīva vieta sānā un pa diagonāli
        if (entity.isGrounded && Math.abs(entity.vx) < 0.1 && def.isRound) {
          const checkEmpty = (tx, ty) => !checkCollision(tx, ty, mapWidth, mapHeight, entity.width, entity.height, entity.id);
          
          // Mēģinām ripot pa KREISI
          const leftX = entity.x - TILE_SIZE;
          // canRollLeft: vai flīze pa kreisi ir brīva UN vai flīze pa kreisi uz leju ir brīva (tukšums/pakāpiens)
          const canRollLeft = checkEmpty(leftX, entity.y) && checkEmpty(leftX, entity.y + TILE_SIZE);
          
          if (canRollLeft) {
            // Ripojam pa kreisi. Palielināts ātrums (6.0), lai "veļas" ātrāk
            entity.vx = -6.0; 
          } else {
            // Mēģinām ripot pa LABI
            const rightX = entity.x + TILE_SIZE;
            const canRollRight = checkEmpty(rightX, entity.y) && checkEmpty(rightX, entity.y + TILE_SIZE);
            if (canRollRight) {
              entity.vx = 6.0;
            }
          }
        }

        // Atjaunojam rotāciju, ja akmens veļas (horizontal movement while grounded)
        if (entity.isGrounded && Math.abs(entity.vx) > 0.1 && def.isRound) {
          // Rotācija proporcionāla ātrumam (0.07 rad/px * vx)
          entity.rotation = (entity.rotation || 0) + (entity.vx * (deltaMs / 16.67) * 0.07);
        } else if (!entity.isGrounded && def.isRound) {
          // Arī krītot var nedaudz rotēt, ja ir bijis horizontāls ātrums
          entity.rotation = (entity.rotation || 0) + (entity.vx * (deltaMs / 16.67) * 0.03);
        }
      }

      // Animācija akmenim parasti ir statiska
      entity.animation = 'idle';
      entity.currentSpriteIndex = def.spriteSheet?.animations?.idle?.[0] || 0;

      return entity;
    }

    // Platformu loģika
    if (entity.subtype === 'platform') {
      const speed = def.speed || 1.5;
      const mapW = mapWidth;
      const mapH = mapHeight;
      
      // Meklējam bultiņas vairākos punktos (centrā un malās), lai nepalaistu garām
      const points = [
        { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 }, // Centrs
        { x: entity.x + 5, y: entity.y + entity.height / 2 },                // Kreisā mala
        { x: entity.x + entity.width - 5, y: entity.y + entity.height / 2 }  // Labā mala
      ];
      
      let arrowId = null;
      let foundArrowDef = null;

      for (const p of points) {
        const tx = Math.floor(p.x / TILE_SIZE);
        const ty = Math.floor(p.y / TILE_SIZE);
        
        if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) continue;
        const idx = ty * mapW + tx;

        // 1. Speciālais arrows slānis
        const arrowsLayer = ctx.mapData?.layers?.find(l => l.name === 'arrows' || l.name === 'Arrows')?.data;
        let id = arrowsLayer ? arrowsLayer[idx] : null;
        
        // 2. Objektu slānis
        if (!id && ctx.objectData) {
          id = ctx.objectData[idx];
        }

        if (id) {
          const aDef = ctx.registryItems.find(r => r.id === id);
          if (aDef && aDef.subtype === 'arrow') {
            arrowId = id;
            foundArrowDef = aDef;
            break; 
          }
        }
      }
      
      if (foundArrowDef) {
        // Mainām kustības virzienu atbilstoši bultiņai
        if (foundArrowDef.direction === 'up') { entity.vx = 0; entity.vy = -speed; }
        else if (foundArrowDef.direction === 'down') { entity.vx = 0; entity.vy = speed; }
        else if (foundArrowDef.direction === 'left') { entity.vx = -speed; entity.vy = 0; }
        else if (foundArrowDef.direction === 'right') { entity.vx = speed; entity.vy = 0; }
      }

      // Ja platforma vēl nekustas, iedodam tai sākuma impulsu
      if (entity.vx === 0 && entity.vy === 0) {
        entity.vx = speed;
      }

      // Kustība
      let nextX = entity.x + entity.vx * (deltaMs / 16.6);
      let nextY = entity.y + entity.vy * (deltaMs / 16.6);
      
      // Robežu pārbaude (neļaujam aizbraukt aiz kartes)
      const worldW = mapWidth * TILE_SIZE;
      const worldH = mapHeight * TILE_SIZE;
      
      if (nextX < 0) { 
        nextX = 0; 
        entity.vx = Math.abs(entity.vx); // Move Right
      } else if (nextX + entity.width > worldW) { 
        nextX = worldW - entity.width; 
        entity.vx = -Math.abs(entity.vx); // Move Left
      }
      
      if (nextY < 0) { 
        nextY = 0; 
        entity.vy = Math.abs(entity.vy); // Move Down
      } else if (nextY + entity.height > worldH) { 
        nextY = worldH - entity.height; 
        entity.vy = -Math.abs(entity.vy); // Move Up
      }
      
      entity.x = nextX;
      entity.y = nextY;

      // Spēlētāja "pārvešana"
      const player = gameState.current;
      const onPlatform = (
        player.x + player.width > entity.x &&
        player.x < entity.x + entity.width &&
        Math.abs((player.y + player.height) - entity.y) < 5 &&
        player.vy >= 0
      );

      if (onPlatform) {
        player.x += entity.vx * (deltaMs / 16.6);
        player.y = entity.y - player.height;
        player.vy = 0;
        player.isGrounded = true;
        
        // Atjauninam animāciju, lai nebūtu "fall" uz platformas
        if (Math.abs(player.vx) > 0.1) {
          player.animation = 'run';
        } else {
          player.animation = 'idle';
        }
      }

      return entity;
    }

    const ai = def.ai || {};
    const reactionDist = (ai.reactionDistance || 10) * TILE_SIZE;
    const shootDist = (ai.shootDistance || 8) * TILE_SIZE;
    const speed = def.speed || 1.2;

    const dx = playerX - entity.x;
    const dy = playerY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let keys = { a: false, d: false, w: false };

    // 2. AI Uzvedība
    if (dist < reactionDist) {
      // Sekojam spēlētājam
      if (dx > TILE_SIZE * 0.5) {
          keys.d = true;
          entity.direction = 1;
      } else if (dx < -TILE_SIZE * 0.5) {
          keys.a = true;
          entity.direction = -1;
      }

      // Lēkāšana, ja AI to atbalsta un priekšā ir šķērslis
      if (ai.canJump && entity.isGrounded) {
          const nextX = entity.x + entity.direction * 10;
          if (checkCollision(nextX, entity.y, mapWidth, mapHeight, entity.width, entity.height)) {
              keys.w = true;
          }
      }

      // Šaušana
      if (dist < shootDist) {
        if (entity.shootCooldown <= 0) {
           const facingPlayer = (dx > 0 && entity.direction > 0) || (dx < 0 && entity.direction < 0);
           // Tanks šauj, ja skatās uz spēlētāju vai ja tas ir pietiekami tuvu
           if (facingPlayer || dist < TILE_SIZE * 2) {
             entity.isShooting = true;
             entity.shootCooldown = ai.shootCooldown || 2000;
             
             // Izsaucam šāviņa izveidi
             if (typeof spawnProjectile === 'function') {
                // Novietojam šāviņu ārpus tanka korpusa (atkarībā no virziena)
                const spawnX = entity.x + (entity.width / 2) + (entity.direction * (entity.width / 2 + 10));
                const spawnY = entity.y + (entity.height * 0.4); // Nedaudz augstāk par centru (stobrs)
                
                spawnProjectile(
                  spawnX, 
                  spawnY, 
                  entity.direction,
                  entity.id
                );
             }
           }
        }
      }
    } else if (ai.patrol) {
      // Patruļēšanas režīms
      if (entity.direction > 0) keys.d = true;
      else keys.a = true;

    // Sienas un šķēršļu pārbaude, lai grieztos atpakaļ
    const nextX = entity.x + entity.direction * 10;
    let hitSomething = checkCollision(nextX, entity.y, mapWidth, mapHeight, entity.width, entity.height);

    // Tanku specifiskā kolīzija (ar spēlētāju un citiem tankiem)
    if (!hitSomething && entity.subtype === 'tank') {
      // 1. Pārbaude ar spēlētāju
      const p = gameState.current;
      if (nextX < p.x + p.width && nextX + entity.width > p.x && entity.y < p.y + p.height && entity.y + entity.height > p.y) {
        hitSomething = true;
      }

      // 2. Pārbaude ar citiem tankiem
      if (!hitSomething) {
        for (const other of entitiesRef.current) {
          if (other === entity || other.health <= 0 || other.isExploding) continue;
          if (other.subtype !== 'tank') continue;

          if (nextX < other.x + other.width && nextX + entity.width > other.x && entity.y < other.y + other.height && entity.y + entity.height > other.y) {
            hitSomething = true;
            // Liekam arī otram tankam mainīt virzienu, ja tie brauc viens otram virsū
            if ((entity.direction > 0 && other.direction < 0) || (entity.direction < 0 && other.direction > 0)) {
               other.direction *= -1;
            }
            break;
          }
        }
      }
    }

    if (hitSomething) {
      entity.direction *= -1;
    }
    
    // Platformas malas pārbaude
      if (ai.stayOnPlatform && entity.isGrounded) {
          const groundX = entity.x + (entity.direction > 0 ? entity.width : 0) + entity.direction * 5;
          const groundY = entity.y + entity.height + 5;
          if (!checkCollision(groundX, groundY, mapWidth, mapHeight, 2, 2)) {
              entity.direction *= -1;
          }
      }
    }

    // Cooldown atjaunošana
    if (entity.shootCooldown > 0) {
      entity.shootCooldown -= deltaMs;
      // Pēc 300ms pārtraucam šaušanas animāciju
      if (entity.shootCooldown < (ai.shootCooldown || 2000) - 300) {
        entity.isShooting = false;
      }
    }

    // 3. Fizika un kustība
    const frameSpeed = speed * (deltaMs / 16.67);
    
    const checkEntityCollision = (nx, ny) => {
        // Statiskā pasaule
        if (checkCollision(nx, ny, mapWidth, mapHeight, entity.width, entity.height)) return true;
        
        // Tankiem bloķējam ceļu, ja priekšā ir spēlētājs vai cits tanks
        if (entity.subtype === 'tank') {
            const p = gameState.current;
            if (nx < p.x + p.width && nx + entity.width > p.x && ny < p.y + p.height && ny + entity.height > p.y) return true;
            
            for (const other of entitiesRef.current) {
                if (other === entity || other.health <= 0 || other.isExploding) continue;
                if (other.subtype !== 'tank') continue;
                if (nx < other.x + other.width && nx + entity.width > other.x && ny < other.y + other.height && ny + entity.height > other.y) return true;
            }
        }
        return false;
    };

    const mh = moveHorizontal({
      keys,
      state: { 
        x: entity.x, 
        y: entity.y, 
        vx: entity.vx || 0,
        width: entity.width, 
        direction: entity.direction 
      },
      MOVE_SPEED: frameSpeed,
      TILE_SIZE,
      mapWidth,
      mapHeight,
      checkCollision: checkEntityCollision
    });
    entity.x = mh.x;
    entity.vx = mh.vx;
    entity.direction = mh.direction;

    const vp = applyVerticalPhysics({
      keys,
      x: entity.x,
      y: entity.y,
      vy: entity.vy,
      isGrounded: entity.isGrounded,
      animation: entity.animation,
      GRAVITY,
      TERMINAL_VELOCITY,
      JUMP_FORCE: ai.canJump ? 8 : 0,
      TILE_SIZE,
      width: entity.width,
      height: entity.height,
      mapWidth,
      mapHeight,
      checkCollision: checkEntityCollision,
      isLiquidAt: ctx.isLiquidAt,
      vx: entity.vx
    });
    entity.y = vp.y;
    entity.vy = vp.vy;
    entity.isGrounded = vp.isGrounded;

    // 4. Animācijas stāvokļa noteikšana
    if (entity.isShooting) {
      entity.animation = 'shoot';
    } else if (entity.health <= (def.maxHealth || 100) * 0.5) {
      entity.animation = 'move_damaged';
    } else if (entity.vx === 0 && entity.isGrounded) {
      entity.animation = 'idle';
    } else {
      entity.animation = 'move';
    }

    // Atjaunojam animācijas rāmi, ja tas nav sprādziens
    if (!entity.isExploding) {
        const anims = def.spriteSheet?.animations || {};
        let currentAnim = anims[entity.animation];
        
        // Rezerves varianti, ja specifiskā animācija nav atrasta
        if (!currentAnim || !Array.isArray(currentAnim) || currentAnim.length === 0) {
            currentAnim = anims['move'] || anims['idle'] || [0];
        }
        
        entity.animTimer = (entity.animTimer || 0) + deltaMs;
        const frameDur = 100; // ms
        if (entity.animTimer >= frameDur) {
            entity.animTimer = 0;
            entity.animFrame = (entity.animFrame || 0) + 1;
            if (entity.animFrame >= currentAnim.length) {
                entity.animFrame = 0;
            }
        }
        entity.currentSpriteIndex = currentAnim[entity.animFrame % currentAnim.length];
    } else {
        const explodeAnim = def.spriteSheet?.animations?.explode || [39];
        // Sprādziena animācija tiek vadīta augstāk (death sekcijā)
        entity.currentSpriteIndex = explodeAnim[Math.min(entity.animFrame, explodeAnim.length - 1)];
    }

    return entity;
  }).filter(e => !e.shouldRemove);
}

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
    spawnProjectile,
    constants
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
    
    // Platformu loģika
    if (entity.subtype === 'platform') {
      const speed = def.speed || 1.5;
      
      // Meklējam bultiņas pašreizējā pozīcijā
      const tileX = Math.floor((entity.x + entity.width / 2) / TILE_SIZE);
      const tileY = Math.floor((entity.y + entity.height / 2) / TILE_SIZE);
      
      // Pārbaudām speciālo "arrows" slāni vai parasto objektu slāni
      const arrowsLayer = ctx.mapData?.layers?.find(l => l.name === 'arrows' || l.name === 'Arrows')?.data;
      const arrowId = arrowsLayer ? arrowsLayer[tileY * mapWidth + tileX] : null;
      
      if (arrowId) {
        const arrowDef = ctx.registryItems[arrowId] || (Array.isArray(ctx.registryItems) ? ctx.registryItems.find(r => r.id === arrowId) : null);
        if (arrowDef && arrowDef.subtype === 'arrow') {
          if (arrowDef.direction === 'up') { entity.vx = 0; entity.vy = -speed; }
          else if (arrowDef.direction === 'down') { entity.vx = 0; entity.vy = speed; }
          else if (arrowDef.direction === 'left') { entity.vx = -speed; entity.vy = 0; }
          else if (arrowDef.direction === 'right') { entity.vx = speed; entity.vy = 0; }
        }
      }

      // Ja platforma vēl nekustas, iedodam tai sākuma impulsu (piemēram, pa labi)
      if (entity.vx === 0 && entity.vy === 0) {
        entity.vx = speed;
      }

      // Kustība
      entity.x += entity.vx * (deltaMs / 16.6);
      entity.y += entity.vy * (deltaMs / 16.6);

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

      // Sienas pārbaude, lai grieztos atpakaļ
      const nextX = entity.x + entity.direction * 10;
      if (checkCollision(nextX, entity.y, mapWidth, mapHeight, entity.width, entity.height)) {
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
    
    const mh = moveHorizontal({
      keys,
      state: { x: entity.x, y: entity.y, width: entity.width, direction: entity.direction },
      MOVE_SPEED: frameSpeed,
      TILE_SIZE,
      mapWidth,
      mapHeight,
      checkCollision: (nx, ny) => checkCollision(nx, ny, mapWidth, mapHeight, entity.width, entity.height)
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
      checkCollision: (nx, ny) => checkCollision(nx, ny, mapWidth, mapHeight, entity.width, entity.height),
      isWaterAt: ctx.isWaterAt,
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

// Projectile update and ricochet simulation extracted from useGameEngine.js

// ctx: { projectilesRef, entitiesRef, playerState, TILE_SIZE, isSolidAtPixel, findItemById, objectData, objectMetadata, tileData, secretData, registryItems, onStateUpdate, playSfx }
// updateProjectiles(ctx, deltaMs, mapWidth, mapHeight)
export function updateProjectiles(ctx, deltaMs, mapWidth, mapHeight) {
  const { projectilesRef, entitiesRef, playerState, TILE_SIZE, isSolidAtPixel, findItemById, objectData, objectMetadata, tileData, secretData, registryItems, onStateUpdate, playSfx } = ctx;
  const dtProj = deltaMs / 1000;
  const worldW = mapWidth * TILE_SIZE;
  const worldH = mapHeight * TILE_SIZE;
  const nowMs = Number(playerState?.timeMs) || 0;

  const isSolidRect = (cx, cy, hw, hh) => {
    const pts = [
      { x: cx - hw, y: cy - hh },
      { x: cx + hw, y: cy - hh },
      { x: cx - hw, y: cy + hh },
      { x: cx + hw, y: cy + hh },
    ];
    for (let k = 0; k < pts.length; k++) {
      const pt = pts[k];
      // Updated isSolidAtPixel call with all necessary layers
      if (isSolidAtPixel(pt.x, pt.y, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata)) return true;
    }
    return false;
  };

  const checkObjectHit = (cx, cy, hw, hh, isSeaRescueBox = false) => {
    if (!objectData) return null;
    const pts = [
        { x: cx - hw, y: cy - hh },
        { x: cx + hw, y: cy - hh },
        { x: cx - hw, y: cy + hh },
        { x: cx + hw, y: cy + hh },
        { x: cx, y: cy }
    ];
    for (const pt of pts) {
        const gx = Math.floor(pt.x / TILE_SIZE);
        const gy = Math.floor(pt.y / TILE_SIZE);
        if (gx < 0 || gy < 0 || gx >= mapWidth || gy >= mapHeight) continue;
        const index = gy * mapWidth + gx;
        const objId = objectData[index];
        if (objId) {
            // Special case for Sea Rescue Trigger - it should be hit from above
            if (isSeaRescueBox && objId === 'minispill_sea_rescue_trigger') {
              // We check if the projectile is moving downwards and hit the trigger
              return index;
            }

            const def = findItemById(objId);
            if (def && def.isDestructible) {
                // Check if already passable
                const currentMeta = objectMetadata?.[index] || {};
                const health = currentMeta.health !== undefined ? currentMeta.health : def.maxHealth;
                if (health > (def.passableHealthThreshold || 0)) {
                    return index;
                }
            }
        }
    }
    return null;
  };

  const checkEntityHit = (cx, cy, hw, hh, p) => {
    if (!entitiesRef?.current) return null;
    for (const ent of entitiesRef.current) {
        if (ent.health <= 0 || ent.isExploding) continue;
        if (ent.id === p.ownerId) continue; // Ignorējam izšāvēju

        const ex = ent.x;
        const ey = ent.y;
        const ew = ent.width;
        const eh = ent.height;
        if (cx + hw > ex && cx - hw < ex + ew &&
            cy + hh > ey && cy - hh < ey + eh) {
            return ent;
        }
    }
    return null;
  };

  const checkPlayerHit = (cx, cy, hw, hh, p) => {
    if (!playerState || p.ownerId === 'player') return false; // Ignorējam, ja izšāva spēlētājs
    
    const ex = playerState.x;
    const ey = playerState.y;
    const ew = playerState.width || TILE_SIZE;
    const eh = playerState.height || TILE_SIZE;
    if (cx + hw > ex && cx - hw < ex + ew &&
        cy + hh > ey && cy - hh < ey + eh) {
        return true;
    }
    return false;
  };

  if (!projectilesRef.current.length) return;

  for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
    const p = projectilesRef.current[i];

    if (p.bounces == null) p.bounces = 0;
    const maxBounces = Number.isFinite(p.maxBounces)
      ? p.maxBounces
      : (findItemById(p.defId)?.maxBounces ?? 3);
    const bounceDamp = Number.isFinite(p.bounceDamping)
      ? p.bounceDamping
      : (findItemById(p.defId)?.bounceDamping ?? 0.6);
    const ricRand = Number.isFinite(p.ricochetRandom)
      ? p.ricochetRandom
      : (findItemById(p.defId)?.ricochetRandom ?? 0.15);

    const maxDelta = Math.max(Math.abs(p.vx * dtProj), Math.abs(p.vy * dtProj));
    let steps = Math.ceil(maxDelta / 4);
    if (!Number.isFinite(steps) || steps < 1) steps = 1;
    steps = Math.min(steps, 20);
    const stepTime = dtProj / steps;

    let cx = p.x;
    let cy = p.y;

    if (p.isSeaRescueBox) {
      if (p.useSimplePhysics) {
        // Simple physics matching trajectory preview (no friction, constant G)
        const settings = findItemById('sea_rescue_settings')?.physics || {};
        const G = p.gravity || settings.gravity || 1600;
        p.vy += G * stepTime;
      } else {
        p.vy += (p.gravity || 0.5) * 60 * stepTime;
        p.vx *= (p.friction || 0.98);
        p.vy *= (p.friction || 0.98);
      }
    }

    const hw = (p.w * (p.hbs || 1)) * 0.5;
    const hh = (p.h * (p.hbs || 1)) * 0.5;

    let removed = false;

    for (let s = 0; s < steps; s++) {
      // Sea Rescue hit detection
      if (p.isSeaRescueBox) {
          const objIdx = checkObjectHit(cx, cy, hw, hh, true);
          if (objIdx !== null) {
              const hitObjId = objectData[objIdx];
              if (hitObjId === 'minispill_sea_rescue_trigger' && p.vy > 0) {
                  const boxDef = findItemById(p.defId);
                  const points = boxDef?.points || 10;
                  
                  if (typeof onStateUpdate === 'function') {
                      onStateUpdate('SEA_RESCUE_SCORE', { points, triggerIndex: objIdx, boxId: p.defId });
                  }
                  
                  if (typeof playSfx === 'function') playSfx('collect', 0.7);
                  
                  removed = true;
                  break;
              }
          }
      }

      // 1) X axis
      let nextX = cx + p.vx * stepTime;

      const hitEntX = checkEntityHit(nextX, cy, hw, hh, p);
      if (hitEntX) {
        hitEntX.health -= p.dmg || 10;
        const isFish = hitEntX.subtype === 'fish' || hitEntX.def?.subtype === 'fish' || hitEntX.def?.ai?.type === 'fish' || !!hitEntX.def?.fish;
        if (isFish && hitEntX.health > 0) {
          hitEntX.fishState = hitEntX.fishState || {};
          const panicMs = Number(hitEntX.def?.fish?.panicDurationMs) || 1200;
          hitEntX.fishState.panicUntil = Math.max(hitEntX.fishState.panicUntil || 0, nowMs + panicMs * 2);
        }
        if (isFish && playSfx) {
          const hitSound = hitEntX.def?.sounds?.hit || "/assets/sound/sfx/dammage/hit-flesh-03-266308.ogg";
          try { playSfx(hitSound, 0.4); } catch {}
        }
        if (onStateUpdate) {
          onStateUpdate('entityDamage', {
            x: hitEntX.x + hitEntX.width / 2,
            y: hitEntX.y,
            amount: p.dmg || 10
          });
        }
        removed = true;
        break;
      }

      const hitIdxX = checkObjectHit(nextX, cy, hw, hh);
      if (hitIdxX !== null) {
        if (onStateUpdate) onStateUpdate('objectDamage', { index: hitIdxX, damage: p.dmg || 10 });
        removed = true;
        break;
      }

      if (p.cwt && isSolidRect(nextX, cy, hw, hh)) {
        if (p.ric) {
          p.vx = -p.vx * bounceDamp;
          const sp = Math.max(40, Math.hypot(p.vx, p.vy));
          const jitter = (Math.random() * 2 - 1) * sp * ricRand;
          p.vy += jitter * 0.15;
          p.bounces += 1;
          p.life = Math.max(0, p.life - 80);
        } else {
          removed = true;
          break;
        }
      } else {
        cx = nextX;
      }

      // 2) Y axis
      let nextY = cy + p.vy * stepTime;
      
      const hitPlayerY = checkPlayerHit(cx, nextY, hw, hh, p);
      if (hitPlayerY) {
        if (playerState) {
          playerState.health = Math.max(0, (Number(playerState.health) || 0) - (p.dmg || 10));
        }
        if (onStateUpdate && playerState) {
          onStateUpdate('playerDamage', {
            damage: p.dmg || 10,
            x: playerState.x + (playerState.width || TILE_SIZE) / 2,
            y: playerState.y
          });
        }
        removed = true;
        break;
      }

      const hitEntY = checkEntityHit(cx, nextY, hw, hh, p);
      if (hitEntY) {
        hitEntY.health -= p.dmg || 10;
        const isFish = hitEntY.subtype === 'fish' || hitEntY.def?.subtype === 'fish' || hitEntY.def?.ai?.type === 'fish' || !!hitEntY.def?.fish;
        if (isFish && hitEntY.health > 0) {
          hitEntY.fishState = hitEntY.fishState || {};
          const panicMs = Number(hitEntY.def?.fish?.panicDurationMs) || 1200;
          hitEntY.fishState.panicUntil = Math.max(hitEntY.fishState.panicUntil || 0, nowMs + panicMs * 2);
        }
        if (isFish && playSfx) {
          const hitSound = hitEntY.def?.sounds?.hit || "/assets/sound/sfx/dammage/hit-flesh-03-266308.ogg";
          try { playSfx(hitSound, 0.4); } catch {}
        }
        if (onStateUpdate) {
          onStateUpdate('entityDamage', {
            x: hitEntY.x + hitEntY.width / 2,
            y: hitEntY.y,
            amount: p.dmg || 10
          });
        }
        removed = true;
        break;
      }

      const hitIdxY = checkObjectHit(cx, nextY, hw, hh);
      if (hitIdxY !== null) {
        if (onStateUpdate) onStateUpdate('objectDamage', { index: hitIdxY, damage: p.dmg || 10 });
        removed = true;
        break;
      }

      if (p.cwt && isSolidRect(cx, nextY, hw, hh)) {
        if (p.ric) {
          p.vy = -p.vy * bounceDamp;
          const sp = Math.max(40, Math.hypot(p.vx, p.vy));
          const jitter = (Math.random() * 2 - 1) * sp * ricRand;
          p.vx += jitter * 0.15;
          p.bounces += 1;
          p.life = Math.max(0, p.life - 80);
        } else {
          removed = true;
          break;
        }
      } else {
        cy = nextY;
      }

      // 3) Corner stuck safeguard
      if (p.cwt && isSolidRect(cx, cy, hw, hh)) {
        if (p.ric) {
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
    }

    p.x = cx;
    p.y = cy;

    p.life -= deltaMs;
    if (
      p.life <= 0 ||
      p.x < -32 ||
      p.y < -32 ||
      p.x > worldW + 32 ||
      p.y > worldH + 32 ||
      removed ||
      (p.bounces || 0) > (maxBounces || 0)
    ) {
      projectilesRef.current.splice(i, 1);
      continue;
    }
  }
}

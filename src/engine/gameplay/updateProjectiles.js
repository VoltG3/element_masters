// Projectile update and ricochet simulation extracted from useGameEngine.js

// ctx: { projectilesRef, entitiesRef, playerState, TILE_SIZE, isSolidAtPixel, findItemById, objectData, objectMetadata, tileData, secretData, registryItems, onStateUpdate, playSfx, getLiquidSample, refs, mapData }
// updateProjectiles(ctx, deltaMs, mapWidth, mapHeight)
export function updateProjectiles(ctx, deltaMs, mapWidth, mapHeight) {
  const { projectilesRef, entitiesRef, playerState, TILE_SIZE, isSolidAtPixel, findItemById, objectData, objectMetadata, tileData, secretData, registryItems, onStateUpdate, playSfx, getLiquidSample, refs, mapData } = ctx;
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

    const shipOffset = (playerState && (mapData?.meta?.activeMapType === 'sea_rescue' || 
                         (mapData?.maps && mapData.maps[mapData.meta?.activeMapId || 'main']?.type === 'sea_rescue'))) 
                       ? (playerState.x || 0) : 0;

    for (let k = 0; k < pts.length; k++) {
      const pt = pts[k];
      if (isSolidAtPixel(pt.x, pt.y, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata)) return true;
      
      if (shipOffset !== 0) {
        if (isSolidAtPixel(pt.x - shipOffset, pt.y, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems, secretData, objectData, objectMetadata)) return true;
      }
    }
    return false;
  };

  const getDestructibleIndex = (gx, gy) => {
    if (!objectData) return null;
    if (gx < 0 || gy < 0 || gx >= mapWidth || gy >= mapHeight) return null;
    const index = gy * mapWidth + gx;
    const objId = objectData[index];
    if (!objId) return null;
    const def = findItemById(objId);
    if (!def || !def.isDestructible) return null;
    const currentMeta = objectMetadata?.[index] || {};
    const maxHealth = def.maxHealth || 100;
    const health = currentMeta.health !== undefined ? currentMeta.health : maxHealth;
    const threshold = def.passableHealthThreshold || 0;
    if (health <= threshold) return null;
    return index;
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

    const shipOffset = (playerState && (mapData.meta?.activeMapType === 'sea_rescue' || 
                         (mapData.maps && mapData.maps[mapData.meta?.activeMapId || 'main']?.type === 'sea_rescue'))) 
                       ? (playerState.x || 0) : 0;

    for (const pt of pts) {
        // 1. Check static objects (Boxes in water)
        const gx = Math.floor(pt.x / TILE_SIZE);
        const gy = Math.floor(pt.y / TILE_SIZE);
        if (gx >= 0 && gy >= 0 && gx < mapWidth && gy < mapHeight) {
            const index = gy * mapWidth + gx;
            const objId = objectData[index];
            if (objId && objId.startsWith('minispill_sea_rescue_box')) {
                const def = findItemById(objId);
                if (def && def.isDestructible) {
                    const currentMeta = objectMetadata?.[index] || {};
                    const health = currentMeta.health !== undefined ? currentMeta.health : def.maxHealth;
                    if (health > (def.passableHealthThreshold || 0)) return index;
                }
            }
        }

        // Destructible objects (wooden box, crack block, etc.)
        if (!isSeaRescueBox) {
            const destructibleIdx = getDestructibleIndex(gx, gy);
            if (destructibleIdx !== null) return destructibleIdx;
        }

        // 2. Check moving objects (Ship & Triggers)
        const sgx = Math.floor((pt.x - shipOffset) / TILE_SIZE);
        const sgy = Math.floor(pt.y / TILE_SIZE);
        if (sgx >= 0 && sgy >= 0 && sgx < mapWidth && sgy < mapHeight) {
            const sindex = sgy * mapWidth + sgx;
            const sobjId = objectData[sindex];
            if (sobjId === 'minispill_sea_rescue_trigger' || sobjId === 'minispill_sea_rescue_ship') {
                if (isSeaRescueBox && sobjId === 'minispill_sea_rescue_trigger') {
                    return sindex;
                }
                const def = findItemById(sobjId);
                if (def && def.isDestructible) {
                    const currentMeta = objectMetadata?.[sindex] || {};
                    const health = currentMeta.health !== undefined ? currentMeta.health : def.maxHealth;
                    if (health > (def.passableHealthThreshold || 0)) return sindex;
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

  const getWaterSurfaceY = (x) => {
    if (!tileData || mapWidth <= 0 || mapHeight <= 0) return null;
    const gx = Math.floor(x / TILE_SIZE);
    if (gx < 0 || gx >= mapWidth) return null;
    for (let gy = 0; gy < mapHeight; gy++) {
      const idx = gy * mapWidth + gx;
      const id = tileData[idx];
      if (!id) continue;
      const def = findItemById(id);
      if (!def || !def.flags || !def.flags.liquid) continue;
      if (def.flags.water || def.flags.waterfall) {
        return gy * TILE_SIZE;
      }
    }
    return null;
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
    let removed = false;

    if (p.isSeaRescueBox) {
      const settings = findItemById('sea_rescue_settings')?.physics || {};
      const maxHeight = settings.maxFlightHeight || -10000;
      // Boundaries check for sea rescue boxes - allow much more space
      if (cx < -p.w - 1000 || cx > worldW + p.w + 1000 || cy < maxHeight || cy > worldH + 2000) {
        removed = true;
        projectilesRef.current.splice(i, 1);
        continue;
      }
      if (p.floating) {
        // Floating/Sinking logic
        p.floatTime = (p.floatTime || 0) + deltaMs;
        const boxDef = findItemById(p.defId);
        const floatMax = boxDef?.floatingDurationMs || 4000;
        
        const driftSettings = findItemById('sea_rescue_settings')?.drift || {};
        const driftSpeed = driftSettings.speed || 0.002;
        const driftAmp = driftSettings.amplitude || 5;

        if (p.floatTime < floatMax) { // Float for configurable time
            if (p.baseY === undefined) p.baseY = p.y;
            const targetY = p.baseY + Math.sin(p.floatTime * driftSpeed) * driftAmp;
            p.vy = (targetY - p.y) / dtProj;
            p.vx *= 0.92; // Slow down horizontal movement
            p.rotation = Math.sin(p.floatTime * driftSpeed * 0.5) * 0.1; // Balanced tilt
        } else {
            p.vy = 60; // Start sinking
            p.vx *= 0.98;
            p.rotation = (p.rotation || 0) + 0.02;
        }
        p.x += p.vx * dtProj;
        p.y += p.vy * dtProj;
        
        p.life -= deltaMs;

        // Remove if off-map or expired
        if (p.y > worldH + 2000 || p.life <= 0) removed = true;
        if (removed) {
            projectilesRef.current.splice(i, 1);
        }
        continue; // Skip standard movement
      }

      if (p.useSimplePhysics) {
        // Simple physics matching trajectory preview (no friction, constant G)
        const settings = findItemById('sea_rescue_settings')?.physics || {};
        const G = p.gravity || settings.gravity || 1600;
        p.vy += G * dtProj; // Use dtProj here for gravity step
      } else {
        p.vy += (p.gravity || 0.5) * 60 * dtProj;
        p.vx *= (p.friction || 0.98);
        p.vy *= (p.friction || 0.98);
      }
    }

    const hw = (p.w * (p.hbs || 1)) * 0.5;
    const hh = (p.h * (p.hbs || 1)) * 0.5;

    const isFishEntity = (ent) => {
      if (!ent) return false;
      const subtype = ent.subtype || ent.def?.subtype;
      const aiType = ent.def?.ai?.type;
      return subtype === 'fish' || aiType === 'fish' || !!ent.def?.fish;
    };

    for (let s = 0; s < steps; s++) {
      // Check if entering water (for Sea Rescue Boxes)
      if (p.isSeaRescueBox && getLiquidSample && !p.floating && p.vy > 0) {
          const sample = getLiquidSample({ x: cx, y: cy, width: p.w, height: p.h });
          if (sample?.inLiquid && sample?.type?.includes('water')) {
              p.floating = true;
              p.floatTime = 0;

              // Snap to surface for 50/50 visual effect
              const surfaceY = getWaterSurfaceY(cx);
              if (surfaceY !== null) {
                  p.y = surfaceY;
                  p.baseY = surfaceY;
                  cy = surfaceY;
              }

              const inSound = findItemById(p.defId)?.sounds?.water_in || "/assets/sound/sfx/water/out_splash-4-46870.ogg";
              if (playSfx) playSfx(inSound, 0.6);
              if (refs?.fx?.triggerSplash) refs.fx.triggerSplash(cx, cy);
              // Stop stepping, but DON'T set removed=true
              break;
          }
      }
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
                  
                  if (typeof playSfx === 'function') {
                      const collectSfx = "/assets/sound/sfx/zzox-fx_nite-hit-item.ogg";
                      playSfx(collectSfx, 0.7);
                  }
                  
                  removed = true;
                  break;
              }
          }
      }

      // 1) X axis
      let nextX = cx + p.vx * stepTime;

      const hitEntX = checkEntityHit(nextX, cy, hw, hh, p);
      if (hitEntX) {
        const isFish = isFishEntity(hitEntX);
        
        if (p.isSeaRescueBox) {
            if (isFish) {
                hitEntX.fishState = hitEntX.fishState || {};
                const hitCooldown = 500;
                const canPlaySound = !hitEntX.fishState.lastHitAt || (nowMs - hitEntX.fishState.lastHitAt > hitCooldown);
                const settings = findItemById('sea_rescue_settings')?.physics || {};
                const fishJumpImpulse = settings.fishJumpImpulse || -600;

                if (p.vy > 0 && p.y < hitEntX.y) {
                    hitEntX.health = 0;
                    if (playSfx && canPlaySound) {
                        playSfx(hitEntX.def?.sounds?.hit || "/assets/sound/sfx/dammage/hit-flesh-03-266308.ogg", 0.5);
                        hitEntX.fishState.lastHitAt = nowMs;
                    }
                } else if (p.vy < 0) {
                    hitEntX.attachedToProjectileId = p.id;
                    hitEntX.fishState.isAttached = true;
                    hitEntX.fishState.isJumping = false; // Stop jumping if attached
                    if (playSfx && canPlaySound) {
                        playSfx(hitEntX.def?.sounds?.water_out || "/assets/sound/sfx/water/in_fish-splashing-release-1-96870.ogg", 0.5);
                        hitEntX.fishState.lastHitAt = nowMs;
                    }
                } else {
                    hitEntX.fishState.isJumping = true;
                    hitEntX.fishState.jumpVx = -p.vx * 0.5;
                    hitEntX.fishState.jumpVy = -Math.abs(p.vy) * 0.5 + fishJumpImpulse;
                    hitEntX.fishState.jumpGravity = 900;
                    hitEntX.fishState.panicUntil = nowMs + 5000;
                    if (playSfx && canPlaySound) {
                        playSfx(hitEntX.def?.sounds?.water_out || "/assets/sound/sfx/water/in_fish-splashing-release-1-96870.ogg", 0.5);
                        hitEntX.fishState.lastHitAt = nowMs;
                    }
                }
            }
            // Sea Rescue boxes should NOT disappear when hitting entities
            cx = nextX;
            continue; 
        }

        hitEntX.health -= p.dmg || 10;
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

      const hitIdxX = !p.isSeaRescueBox ? checkObjectHit(nextX, cy, hw, hh) : null;
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
        const isFish = isFishEntity(hitEntY);
        
        if (p.isSeaRescueBox) {
            if (isFish) {
                hitEntY.fishState = hitEntY.fishState || {};
                const hitCooldown = 500;
                const canPlaySound = !hitEntY.fishState.lastHitAt || (nowMs - hitEntY.fishState.lastHitAt > hitCooldown);
                const settings = findItemById('sea_rescue_settings')?.physics || {};
                const fishJumpImpulse = settings.fishJumpImpulse || -600;

                if (p.vy > 0 && p.y < hitEntY.y) {
                    hitEntY.health = 0;
                    if (playSfx && canPlaySound) {
                        playSfx(hitEntY.def?.sounds?.hit || "/assets/sound/sfx/dammage/hit-flesh-03-266308.ogg", 0.5);
                        hitEntY.fishState.lastHitAt = nowMs;
                    }
                } else if (p.vy < 0) {
                    hitEntY.attachedToProjectileId = p.id;
                    hitEntY.fishState.isAttached = true;
                    hitEntY.fishState.isJumping = false; // Stop jumping if attached
                    if (playSfx && canPlaySound) {
                        playSfx(hitEntY.def?.sounds?.water_out || "/assets/sound/sfx/water/in_fish-splashing-release-1-96870.ogg", 0.5);
                        hitEntY.fishState.lastHitAt = nowMs;
                    }
                } else {
                    hitEntY.fishState.isJumping = true;
                    hitEntY.fishState.jumpVx = -p.vx * 0.5;
                    hitEntY.fishState.jumpVy = -Math.abs(p.vy) * 0.5 + fishJumpImpulse;
                    hitEntY.fishState.jumpGravity = 900;
                    hitEntY.fishState.panicUntil = nowMs + 5000;
                    if (playSfx && canPlaySound) {
                        playSfx(hitEntY.def?.sounds?.water_out || "/assets/sound/sfx/water/in_fish-splashing-release-1-96870.ogg", 0.5);
                        hitEntY.fishState.lastHitAt = nowMs;
                    }
                }
            }
            // Sea Rescue boxes should NOT disappear when hitting entities
            cy = nextY;
            continue; 
        }

        hitEntY.health -= p.dmg || 10;
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

      const hitIdxY = !p.isSeaRescueBox ? checkObjectHit(cx, nextY, hw, hh) : null;
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

    if (p.isSeaRescueBox) {
        p.life -= deltaMs;
        if (removed || p.life <= 0) {
            projectilesRef.current.splice(i, 1);
        }
        continue;
    }

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

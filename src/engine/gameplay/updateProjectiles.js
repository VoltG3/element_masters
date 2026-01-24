// Projectile update and ricochet simulation extracted from useGameEngine.js

// ctx: { projectilesRef, entitiesRef, playerState, TILE_SIZE, isSolidAtPixel, findItemById, objectData, objectMetadata, onStateUpdate }
// updateProjectiles(ctx, deltaMs, mapWidth, mapHeight)
export function updateProjectiles(ctx, deltaMs, mapWidth, mapHeight) {
  const { projectilesRef, entitiesRef, playerState, TILE_SIZE, isSolidAtPixel, findItemById, objectData, objectMetadata, onStateUpdate } = ctx;
  const dtProj = deltaMs / 1000;
  const worldW = mapWidth * TILE_SIZE;
  const worldH = mapHeight * TILE_SIZE;

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
      if (isSolidAtPixel(pt.x, pt.y, mapWidth, mapHeight, TILE_SIZE, null, null, null, objectData, objectMetadata)) return true;
    }
    return false;
  };

  const checkObjectHit = (cx, cy, hw, hh) => {
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
    const hw = (p.w * (p.hbs || 1)) * 0.5;
    const hh = (p.h * (p.hbs || 1)) * 0.5;

    let removed = false;

    for (let s = 0; s < steps; s++) {
      // 1) X axis
      let nextX = cx + p.vx * stepTime;
      
      const hitPlayerX = checkPlayerHit(nextX, cy, hw, hh, p);
      if (hitPlayerX) {
        if (playerState) {
          playerState.health = Math.max(0, (Number(playerState.health) || 0) - (p.dmg || 10));
        }
        if (onStateUpdate) onStateUpdate('playerDamage', { damage: p.dmg || 10 });
        removed = true;
        break;
      }

      const hitEntX = checkEntityHit(nextX, cy, hw, hh, p);
      if (hitEntX) {
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
        if (onStateUpdate) onStateUpdate('playerDamage', { damage: p.dmg || 10 });
        removed = true;
        break;
      }

      const hitEntY = checkEntityHit(cx, nextY, hw, hh, p);
      if (hitEntY) {
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

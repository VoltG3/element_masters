// Projectile update and ricochet simulation extracted from useGameEngine.js

// ctx: { projectilesRef, TILE_SIZE, isSolidAtPixel, findItemById }
// updateProjectiles(ctx, deltaMs, mapWidth, mapHeight)
export function updateProjectiles(ctx, deltaMs, mapWidth, mapHeight) {
  const { projectilesRef, TILE_SIZE, isSolidAtPixel, findItemById } = ctx;
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
      if (isSolidAtPixel(pt.x, pt.y, mapWidth, mapHeight)) return true;
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

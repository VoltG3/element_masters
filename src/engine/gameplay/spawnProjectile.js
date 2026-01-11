// Projectile spawning extracted from useGameEngine.js

export function spawnProjectile(ctx, originX, originY, direction, ownerId = 'player') {
  const { findItemById, TILE_SIZE, parseBool, projectilesRef, projectileIdRef, playShotSfx } = ctx;

  const pDef = findItemById('fireball_basic');
  const id = projectileIdRef.current++;
  const w = Math.max(2, ((pDef?.width || 0.25) * TILE_SIZE));
  const h = Math.max(2, ((pDef?.height || 0.25) * TILE_SIZE));
  const speedPxPerSec = (pDef?.speed ? pDef.speed * 60 : 14 * 60);
  const vx = (direction >= 0 ? 1 : -1) * speedPxPerSec;
  const vy = 0;
  const life = Math.max(200, pDef?.lifespan || 600);
  const ricochetFlag = (typeof pDef?.ricochetOnTiles !== 'undefined')
    ? !!pDef.ricochetOnTiles
    : parseBool(pDef?.collisionWithPenetration, true);

  const proj = {
    id,
    ownerId, // Tagad mēs zinām, kurš izšāva
    x: originX,
    y: originY,
    vx,
    vy,
    w,
    h,
    life,
    defId: pDef?.id || 'fireball_basic',
    dir: direction >= 0 ? 1 : -1,
    cwt: !!(pDef && pDef.collisionWithTiles),
    hbs: Math.max(0.1, Math.min(1.0, (pDef?.hitboxScale ?? 1))),
    ric: ricochetFlag,
    dmg: pDef?.damage || 10
  };
  projectilesRef.current.push(proj);

  try {
    const vol = Math.max(0, Math.min(1, pDef?.sfxVolume ?? 1));
    playShotSfx(pDef?.sfx, vol);
  } catch {}
}

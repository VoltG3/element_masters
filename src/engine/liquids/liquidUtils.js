// Generic liquid helpers (water, lava, etc.)
// Liquids are defined as blocks with flags.liquid === true and optional flags.water/flags.lava
// Optional physics params live under def.liquid: { buoyancy, drag:{x,y}, surface, swimmable, damagePerSecond }

/**
 * Sample registry tile definition at world pixel and return liquid info if present.
 * @param {number} wx world x in pixels
 * @param {number} wy world y in pixels
 * @param {number} mapWidthTiles
 * @param {number} mapHeightTiles
 * @param {number} TILE_SIZE
 * @param {Array<string|null>} tileData tile ids array (background layer)
 * @param {Array<object>} registryItems game registry array
 * @returns {null|{def:object, type:'water'|'lava'|'liquid', params:object}}
 */
export function getLiquidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems) {
  if (wy < 0) return null;
  const gx = Math.floor(wx / TILE_SIZE);
  const gy = Math.floor(wy / TILE_SIZE);
  if (gx < 0 || gy < 0 || gx >= mapWidthTiles || gy >= mapHeightTiles) return null;
  const idx = gy * mapWidthTiles + gx;
  const id = tileData[idx];
  if (!id) return null;
  const def = Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
  if (!def || !def.flags || !def.flags.liquid) return null;
  const type = def.flags.lava_waterfall ? 'lava_waterfall' :
               (def.flags.radioactive_waterfall ? 'radioactive_waterfall' :
               (def.flags.waterfall ? 'waterfall' :
               (def.flags.radioactive_water ? 'radioactive_water' :
               (def.flags.quicksand ? 'quicksand' :
               (def.flags.lava ? 'lava' :
               (def.flags.water ? 'water' : 'liquid'))))));
  const overlayColorRaw = def?.liquid?.overlay?.color ?? def?.liquid?.overlayColor ?? def?.tintBelowSurface;
  const overlayAlphaRaw = def?.liquid?.overlay?.alpha ?? def?.liquid?.overlayAlpha;
  const params = {
    buoyancy: Number(def?.liquid?.buoyancy),
    dragX: Number(def?.liquid?.drag?.x),
    dragY: Number(def?.liquid?.drag?.y),
    surface: !!def?.liquid?.surface,
    swimmable: def?.flags?.swimmable === true || def?.liquid?.swimmable === true,
    dps: Number(def?.liquid?.damagePerSecond),
    overlay: {
      color: Number(overlayColorRaw),
      alpha: Number(overlayAlphaRaw)
    },
    // Optional resource models
    oxygen: {
      drainPerSecond: Number(def?.liquid?.oxygen?.drainPerSecond),
      regenPerSecond: Number(def?.liquid?.oxygen?.regenPerSecond),
      damagePerSecondWhenDepleted: Number(def?.liquid?.oxygen?.damagePerSecondWhenDepleted)
    },
    resistance: {
      drainPerSecond: Number(def?.liquid?.resistance?.drainPerSecond),
      regenPerSecond: Number(def?.liquid?.resistance?.regenPerSecond),
      damagePerSecondWhenDepleted: Number(def?.liquid?.resistance?.damagePerSecondWhenDepleted)
    },
    resources: def?.liquid?.resources || {}
  };
  return { def, type, params };
}

/**
 * Convenience: returns whether any liquid exists at world pixel.
 */
export function isLiquidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems) {
  return !!getLiquidAtPixel(wx, wy, mapWidthTiles, mapHeightTiles, TILE_SIZE, tileData, registryItems);
}

/**
 * Compute liquid occupancy for a player AABB and derive head/feet status.
 * @returns { inLiquid:boolean, headUnder:boolean, atSurface:boolean, type:string|null, params:object }
 */
export function sampleLiquidForAABB({ x, y, width, height, TILE_SIZE, mapWidth, mapHeight, tileData, registryItems }) {
  const cx = x + width * 0.5;
  const headY = y + Math.min(4, height * 0.125);
  const chestY = y + height * 0.45;
  const feetY = y + height - 2;

  const feet = getLiquidAtPixel(cx, feetY, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems);
  const chest = getLiquidAtPixel(cx, chestY, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems);
  const head = getLiquidAtPixel(cx, headY, mapWidth, mapHeight, TILE_SIZE, tileData, registryItems);

  const candidate = feet || chest || head;
  if (!candidate) {
    return { inLiquid: false, headUnder: false, atSurface: false, type: null, params: null };
  }
  const type = candidate.type;
  const defaultOverlay = (() => {
    if (type.includes('lava')) return { color: 10914816, alpha: 0.25 };
    if (type === 'quicksand') return { color: 10916187, alpha: 0.2 };
    if (type === 'radioactive_water' || type === 'radioactive_waterfall') return { color: 1727514, alpha: 0.18 };
    return { color: 1919093, alpha: 0.15 };
  })();
  const rawOverlayColor = candidate.params?.overlay?.color;
  const rawOverlayAlpha = candidate.params?.overlay?.alpha;
  // Merge params with sane defaults if missing
  const p = {
    buoyancy: Number.isFinite(candidate.params.buoyancy) ? candidate.params.buoyancy : 0.5,
    dragX: Number.isFinite(candidate.params.dragX) ? candidate.params.dragX : 0.55,
    dragY: Number.isFinite(candidate.params.dragY) ? candidate.params.dragY : 0.65,
    surface: !!candidate.params.surface,
    swimmable: !!candidate.params.swimmable,
    dps: Number.isFinite(candidate.params.dps) ? Math.max(0, candidate.params.dps) : 0,
    overlay: {
      color: Number.isFinite(rawOverlayColor) ? rawOverlayColor : defaultOverlay.color,
      alpha: Number.isFinite(rawOverlayAlpha) ? rawOverlayAlpha : defaultOverlay.alpha
    },
    oxygen: {
      drainPerSecond: Number.isFinite(candidate.params?.oxygen?.drainPerSecond) ? Math.max(0, candidate.params.oxygen.drainPerSecond) : 20,
      regenPerSecond: Number.isFinite(candidate.params?.oxygen?.regenPerSecond) ? Math.max(0, candidate.params.oxygen.regenPerSecond) : 35,
      damagePerSecondWhenDepleted: Number.isFinite(candidate.params?.oxygen?.damagePerSecondWhenDepleted) ? Math.max(0, candidate.params.oxygen.damagePerSecondWhenDepleted) : 10
    },
    resistance: {
      drainPerSecond: Number.isFinite(candidate.params?.resistance?.drainPerSecond) ? Math.max(0, candidate.params.resistance.drainPerSecond) : 25,
      regenPerSecond: Number.isFinite(candidate.params?.resistance?.regenPerSecond) ? Math.max(0, candidate.params.resistance.regenPerSecond) : 40,
      damagePerSecondWhenDepleted: Number.isFinite(candidate.params?.resistance?.damagePerSecondWhenDepleted) ? Math.max(0, candidate.params.resistance.damagePerSecondWhenDepleted) : 15
    },
    resources: candidate.params?.resources || {}
  };
  const inLiquid = !!(feet || chest);
  const headUnder = !!head;
  const atSurface = inLiquid && !headUnder;
  return { inLiquid, headUnder, atSurface, type, params: p };
}

/**
 * Manage per-second liquid damage. Mutates gameState.current.health and hitTimer.
 * @param {{accRef: {current:number}, gameState: any, JUMP_FORCE?:number}} env
 * @param {number} deltaMs
 * @param {{ dps:number }} params
 */
export function tickLiquidDamage(env, deltaMs, params) {
  const dps = Math.max(0, Number(params?.dps) || 0);
  if (dps <= 0) { env.accRef.current = 0; return; }
  env.accRef.current += Math.max(0, Number(deltaMs) || 0);
  const TICK = 1000;
  while (env.accRef.current >= TICK) {
    env.accRef.current -= TICK;
    const cur = Number(env.gameState.current.health) || 0;
    env.gameState.current.health = Math.max(0, cur - dps);
    const HIT_FLASH_MS = 500;
    const prev = Number(env.gameState.current.hitTimerMs) || 0;
    env.gameState.current.hitTimerMs = Math.max(prev, HIT_FLASH_MS);
  }
}

export default {
  getLiquidAtPixel,
  isLiquidAtPixel,
  sampleLiquidForAABB,
  tickLiquidDamage
};

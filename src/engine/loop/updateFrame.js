// One-frame update orchestrator (migrated from GameEngine/updateFrame.js)
import { moveHorizontal } from '../physics/horizontal';
import { applyVerticalPhysics } from '../physics/vertical';
import { resolveInteractableContext } from '../gameplay/interactables/context';
import { tickLiquidDamage } from '../liquids/liquidUtils';
import { updateEntities } from '../gameplay/entities';
import { getWeatherDps, getMapWeather, getRadioactivityRates, weatherAffectsPlayer, weatherBlockedByCover } from '../gameplay/weatherDamage';
import { isCoveredFromAbove } from '../gameplay/weatherCover';

// updateFrame(ctx, timestamp) → { continue: boolean }
// ctx expects:
// - mapData, objectData
// - input
// - refs: { gameState, isInitialized, lastTimeRef, projectilesRef, shootCooldownRef, liquidDamageAccumulatorRef, oxygenDepleteAccRef, lavaDepleteAccRef }
// - constants: { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE }
// - helpers: { checkCollision, isLiquidAt, getLiquidSample }
// - actions: {
//     collectItem(x, y, mapWidth, objectData),
//     checkHazardDamage(x, y, mapWidth, objectData, deltaMs),
//     spawnProjectile(originX, originY, direction),
//     updateProjectiles(deltaMs, mapWidth, mapHeight),
//     setPlayer(nextState),
//     onGameOver()
//   }
export function updateFrame(ctx, timestamp) {
  const {
    mapData,
    objectData,
    input,
    refs,
    constants,
    helpers,
    actions,
    registryItems
  } = ctx;

  const { gameState, isInitialized, lastTimeRef, projectilesRef, entitiesRef, shootCooldownRef, liquidDamageAccumulatorRef, oxygenDepleteAccRef, lavaDepleteAccRef, weatherDamageAccRef, activeRoomIdsRef } = refs;
  const { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, MOVE_SPEED, JUMP_FORCE } = constants;
  const { checkCollision, isLiquidAt, getLiquidSample } = helpers;
  const { collectItem, checkInteractables, checkHazardDamage, checkSecrets, spawnProjectile, playSfx, updateProjectiles, setPlayer, onGameOver } = actions;

  // Keep RAF alive even if init not finished yet
  if (!isInitialized.current || !mapData) {
    return { continue: true };
  }

  // Delta time ms
  if (!lastTimeRef.current) {
    lastTimeRef.current = timestamp;
  }
  const deltaMs = timestamp - lastTimeRef.current;
  lastTimeRef.current = timestamp;

  // Pause while terminal is open
  try {
    if (window.__GAME_TERMINAL_OPEN__) {
      return { continue: true };
    }
  } catch {}

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
    ammo,
    iceResist,
    maxIceResist
  } = gameState.current;

  const dt = Math.max(0, deltaMs || 0);
  const physicsDt = Math.min(dt, 100);

  // 0.5) Resources update (before physics to affect them)
  // Ice resistance depletion: drains while on slippery surface; regenerates otherwise
  const layers = ctx.mapData.layers || [];
  const backgroundLayer = layers.find(l => l.name === 'background')?.data || [];
  const secretLayer = layers.find(l => l.name === 'secrets' || l.type === 'secret')?.data || [];
  const objectMetadata = mapData.meta?.objectMetadata || {};
  const surface = helpers.getSurfaceProperties ? helpers.getSurfaceProperties(x, y, width, height, mapWidth, mapHeight, TILE_SIZE, backgroundLayer, ctx.registryItems) : { friction: 0.8, acceleration: 0.2 };
  
  const isSlippery = surface.friction >= 0.9;
  let currentIceRes = Number(iceResist);
  const maxIce = Math.max(1, Number(maxIceResist || 100));
  if (!Number.isFinite(currentIceRes)) currentIceRes = maxIce;

  if (isSlippery) {
    currentIceRes -= (20 * dt) / 1000;
  } else {
    currentIceRes += (35 * dt) / 1000;
  }
  currentIceRes = Math.max(0, Math.min(maxIce, currentIceRes));
  gameState.current.iceResist = currentIceRes;

  let effectiveFriction = surface.friction;
  if (isSlippery && currentIceRes > 0) {
      const ratio = currentIceRes / maxIce;
      const targetFriction = 0.8;
      effectiveFriction = surface.friction - (surface.friction - targetFriction) * ratio;
  }

  // 1) Horizontal movement
  const checkCollisionExtended = (nx, ny, mw, mh, w, h) => {
    return checkCollision(nx, ny, mw, mh, w, h);
  };

  const mh = moveHorizontal({
    keys,
    state: { x, y, vx, width, direction, height },
    MOVE_SPEED,
    TILE_SIZE,
    mapWidth,
    mapHeight,
    checkCollision: checkCollisionExtended,
    friction: effectiveFriction,
    acceleration: isSlippery ? (currentIceRes > 0 ? 0.15 : surface.acceleration) : surface.acceleration,
    deltaMs: physicsDt
  });
  x = mh.x; vx = mh.vx; direction = mh.direction;

  // 1.1) Pushable objects logic (Stone pushing)
  let isPushing = false;
  let pushTarget = null;
  
  const currentStrength = gameState.current.strength || 30;
  const isAlreadyAtMax = currentStrength >= 99;
  const lastPushTime = gameState.current.lastPushTime || 0;
  const gracePeriod = 300; // ms, kurā strength nesamazinās pat ja kontakts pazūd uz brīdi

  if (entitiesRef.current) {
    // Ja jau stumjam ar pilnu jaudu, esam pielaidīgāki pret attālumu (histerēze), 
    // lai kompensētu nelielas fizikas dzinēja nobīdes.
    const pushDist = isAlreadyAtMax ? 15 : 5;
    const overlapDist = isAlreadyAtMax ? 12 : 5;

    for (const ent of entitiesRef.current) {
      if (ent.subtype === 'pushable' || ent.def?.isPushable) {
        // Pārbaudām vai spēlētājs ir blakus akmenim
        const isNextToLeft = (x + width + pushDist > ent.x) && (x + width <= ent.x + overlapDist) && (y + height > ent.y + 2) && (y < ent.y + ent.height - 2);
        const isNextToRight = (x - pushDist < ent.x + ent.width) && (x >= ent.x + ent.width - overlapDist) && (y + height > ent.y + 2) && (y < ent.y + ent.height - 2);

        if ((isNextToLeft && keys.d) || (isNextToRight && keys.a)) {
          isPushing = true;
          pushTarget = ent;
          break;
        }
      }
    }
  }

  if (isPushing) {
    gameState.current.strength = Math.min(100, currentStrength + (65 * dt) / 1000); // Aug par ~65% sekundē
    if (gameState.current.strength >= 100 && pushTarget) {
      // Pastumjam akmeni
      const pushForce = 2.0;
      pushTarget.vx = (x < pushTarget.x ? 1 : -1) * pushForce;
      gameState.current.lastPushTime = timestamp; 
      
      // Atskaņojam skaņu
      if (pushTarget.def?.sounds?.push && (!pushTarget.lastPushSoundTime || timestamp - pushTarget.lastPushSoundTime > 450)) {
        playSfx(pushTarget.def.sounds.push, 0.3);
        pushTarget.lastPushSoundTime = timestamp;
      }
    }
  } else {
    // Pārbaudām grace periodu pirms sākam samazināt spēku
    const timeSincePush = timestamp - lastPushTime;
    if (timeSincePush > gracePeriod) {
      if (currentStrength > 30) {
        gameState.current.strength = Math.max(30, currentStrength - (35 * dt) / 1000);
      } else {
        gameState.current.strength = 30;
      }
    }
  }

  // 1.9) Ladder check (allow climbing when overlapping ladder objects)
  const getDefById = (id) => {
    if (!id) return null;
    const map = registryItems && registryItems.__byId;
    if (map && typeof map.get === 'function') return map.get(id) || null;
    return Array.isArray(registryItems) ? registryItems.find(r => r.id === id) : null;
  };

  const findLadderAtPlayer = () => {
    if (!objectData || !registryItems) return null;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const ctxResolved = resolveInteractableContext({
      mapData,
      mapWidth,
      mapHeight,
      objectLayerData: objectData,
      mainObjectMetadata: objectMetadata,
      secretMapData: secretLayer,
      activeRoomIds: activeRoomIdsRef.current || mapData?.meta?.activeRoomIds,
      centerX,
      centerY,
      TILE_SIZE
    });
    const { activeObjectData, activeMetadata, activeMapWidth, activeMapHeight, offsetX, offsetY } = ctxResolved;
    if (!activeObjectData) return null;
    const localX = centerX - offsetX;
    const localY = centerY - offsetY;
    const gridX = Math.floor(localX / TILE_SIZE);
    const gridY = Math.floor(localY / TILE_SIZE);
    if (gridX < 0 || gridY < 0 || gridX >= activeMapWidth || gridY >= activeMapHeight) return null;
    let idx = gridY * activeMapWidth + gridX;
    let objId = activeObjectData[idx];
    if (!objId && activeMetadata) {
      for (const [idxStr, meta] of Object.entries(activeMetadata)) {
        const baseIdx = parseInt(idxStr, 10);
        const w = meta.width || 1;
        const h = meta.height || 1;
        if (w <= 1 && h <= 1) continue;
        const ox = baseIdx % activeMapWidth;
        const oy = Math.floor(baseIdx / activeMapWidth);
        if (gridX >= ox && gridX < ox + w && gridY >= oy && gridY < oy + h) {
          objId = activeObjectData[baseIdx];
          idx = baseIdx;
          break;
        }
      }
    }
    if (!objId) return null;
    const def = getDefById(objId);
    if (!def) return null;
    const isLadder = !!(def.flags?.ladder || def.subtype === 'ladder' || def.type === 'ladder');
    if (!isLadder) return null;
    return { def, index: idx };
  };

  const ladderInfo = findLadderAtPlayer();

  // 2) Vertical physics
  let vp = null;
  let remaining = physicsDt;
  let steps = 0;
  let prevInWater = !!gameState.current.inWater;
  if (ladderInfo && !keys?.space) {
    const ladderSpeed = Math.max(40, Number(ladderInfo.def?.ladder?.speed) || 120);
    const climbDir = (keys.w ? -1 : 0) + (keys.s ? 1 : 0);
    if (climbDir !== 0) {
      const proposedY = y + (climbDir * ladderSpeed) * (physicsDt / 1000);
      if (!checkCollisionExtended(x, proposedY, mapWidth, mapHeight, width, height)) {
        y = proposedY;
      }
      animation = 'climb';
    }
    vy = 0;
    isGrounded = false;
    vp = { y, vy, isGrounded, animation, inWater: false, headUnderWater: false, atSurface: false };
  } else {
    while (remaining > 0 && steps < 10) {
      const stepMs = Math.min(16.67, remaining);
      vp = applyVerticalPhysics({
        keys,
        x,
        y,
        vy,
        isGrounded,
        animation,
        GRAVITY,
        TERMINAL_VELOCITY,
        JUMP_FORCE,
        TILE_SIZE,
        width,
        height,
        mapWidth,
        mapHeight,
        checkCollision: checkCollisionExtended,
        vx,
        isLiquidAt: (wx, wy) => {
          try { return typeof isLiquidAt === 'function' ? isLiquidAt(wx, wy) : null; } catch { return null; }
        },
        prevInWater,
        deltaMs: stepMs
      });
      y = vp.y; vy = vp.vy; isGrounded = vp.isGrounded; animation = vp.animation;
      prevInWater = !!vp.inWater;
      remaining -= stepMs;
      steps++;
    }
  }
  const inWater = !!(vp ? vp.inWater : gameState.current.inWater);
  const headUnderWater = !!(vp ? vp.headUnderWater : gameState.current.headUnderWater);
  const atSurface = !!(vp ? vp.atSurface : gameState.current.atSurface);

  // 2.5) Generic liquid sampling (water, lava, etc.)
  let liquidType = null;
  let liquidParams = null;
  if (typeof getLiquidSample === 'function') {
    try {
      const sample = getLiquidSample({ x, y, width, height, TILE_SIZE, mapWidth, mapHeight });
      if (sample && sample.inLiquid) {
        liquidType = sample.type || null;
        liquidParams = sample.params || null;
      }
      // Reset DPS accumulator if we just left liquids
      if (!sample || !sample.inLiquid) {
        if (liquidDamageAccumulatorRef) liquidDamageAccumulatorRef.current = 0;
      }
    } catch {}
  }

  // Extra horizontal damping when in liquids
  if (inWater || liquidType) {
    if (liquidType === 'lava') {
      vx *= 0.78;
    } else if (liquidType === 'quicksand') {
      vx *= 0.72; // Quicksand is very thick
    } else {
      vx *= 0.82;
    }
  }

  // 2.6) Apply liquid damage-per-second if defined (e.g., lava)
  // Will be gated later for lava by resistance depletion; water dps usually 0.

    const resourceParams = liquidParams?.resources || {};
    const parseNumber = (v) => (v === null || v === undefined || v === '') ? null : Number(v);

  // 2.7) Resource bars logic (oxygen & lava resistance indicators)
  try {
    // Initialize defaults if missing
    const maxOxy = Math.max(1, Number(gameState.current.maxOxygen || 100));
    const maxLava = Math.max(1, Number(gameState.current.maxLavaResist || 100));
    let oxy = Number(gameState.current.oxygen);
    let lavaRes = Number(gameState.current.lavaResist);
    if (!Number.isFinite(oxy)) oxy = maxOxy;
    if (!Number.isFinite(lavaRes)) lavaRes = maxLava;
    // Resolve per-liquid parameters (with safe defaults)
    const oxyParams = resourceParams.oxygen || liquidParams?.oxygen || { drainPerSecond: 20, regenPerSecond: 35, damagePerSecondWhenDepleted: 10 };
    const lavaParams = resourceParams.lavaResist || liquidParams?.resistance || { drainPerSecond: 25, regenPerSecond: 40, damagePerSecondWhenDepleted: 15 };
    const iceParams = resourceParams.iceResist;
    const strengthParams = resourceParams.strength;

    // Oxygen: drains only while head is under water; otherwise regenerates to 100 even after leaving water
    const oxygenApplies = !!(resourceParams.oxygen || liquidType === 'water' || liquidType === 'quicksand' || liquidType === 'radioactive_water' || liquidType === 'waterfall' || liquidType === 'radioactive_waterfall');
    const oxygenEnabled = oxyParams?.enabled !== false;
    const oxyDrain = parseNumber(oxyParams?.drainPerSecond);
    const oxyRegen = parseNumber(oxyParams?.regenPerSecond);
    if (oxygenEnabled && headUnderWater && oxygenApplies && Number.isFinite(oxyDrain)) {
      oxy -= (Math.max(0, oxyDrain) * dt) / 1000;
    } else if (oxygenEnabled) {
      oxy += (Math.max(0, Number.isFinite(oxyRegen) ? oxyRegen : 0) * dt) / 1000;
    }
    // Clamp and write back
    oxy = Math.max(0, Math.min(maxOxy, oxy));
    gameState.current.oxygen = oxy;
    gameState.current.maxOxygen = maxOxy;

    // Lava resist depletion while in lava; regenerates outside
    const lavaApplies = !!(resourceParams.lavaResist || liquidType === 'lava' || liquidType === 'lava_waterfall');
    const lavaEnabled = lavaParams?.enabled !== false;
    const lavaDrain = parseNumber(lavaParams?.drainPerSecond);
    const lavaRegen = parseNumber(lavaParams?.regenPerSecond);
    if (lavaEnabled && lavaApplies && liquidType && liquidType.includes('lava') && Number.isFinite(lavaDrain)) {
      lavaRes -= (Math.max(0, lavaDrain) * dt) / 1000;
    } else if (lavaEnabled) {
      lavaRes += (Math.max(0, Number.isFinite(lavaRegen) ? lavaRegen : 0) * dt) / 1000;
    }
    lavaRes = Math.max(0, Math.min(maxLava, lavaRes));
    gameState.current.lavaResist = lavaRes;
    gameState.current.maxLavaResist = maxLava;

    // Ice resist & strength can be optionally affected by liquids
    const applyResource = (key, maxKey, params) => {
      if (!params || params.enabled === false) return;
      const drain = parseNumber(params.drainPerSecond);
      const regen = parseNumber(params.regenPerSecond);
      if (!Number.isFinite(drain) && !Number.isFinite(regen)) return;
      const maxVal = Math.max(1, Number(gameState.current[maxKey] || 100));
      let cur = Number(gameState.current[key]);
      if (!Number.isFinite(cur)) cur = maxVal;
      if (inWater || liquidType) {
        if (Number.isFinite(drain)) cur -= (Math.max(0, drain) * dt) / 1000;
      } else if (Number.isFinite(regen)) {
        cur += (Math.max(0, regen) * dt) / 1000;
      }
      cur = Math.max(0, Math.min(maxVal, cur));
      gameState.current[key] = cur;
      gameState.current[maxKey] = maxVal;
    };

    applyResource('iceResist', 'maxIceResist', iceParams);
    applyResource('strength', 'maxStrength', strengthParams);

    // Radioactivity: fills up in radioactive liquid; slowly returns to 20% outside
    const weatherNow = getMapWeather(mapData);
    const radioFogInt = Number(weatherNow.radioactiveFog || 0);
    const fogActive = weatherAffectsPlayer('radioactiveFog') && radioFogInt > 0;
    const maxRadio = Math.max(1, Number(gameState.current.maxRadioactivity || 100));
    let radio = Number(gameState.current.radioactivity);
    if (!Number.isFinite(radio)) radio = maxRadio * 0.2;

    const radioParams = resourceParams.radioactivity;
    const radioEnabled = radioParams?.enabled !== false;
    const radioBaseline = Number.isFinite(parseNumber(radioParams?.baselinePercent)) ? Math.max(0, Math.min(1, parseNumber(radioParams?.baselinePercent))) : 0.2;
    const radioGain = Number.isFinite(parseNumber(radioParams?.gainPerSecond)) ? Math.max(0, parseNumber(radioParams?.gainPerSecond)) : (liquidType === 'radioactive_water' || liquidType === 'radioactive_waterfall' ? 15 : 0);
    const radioDecay = Number.isFinite(parseNumber(radioParams?.decayPerSecond)) ? Math.max(0, parseNumber(radioParams?.decayPerSecond)) : 5;
    const radioRecover = Number.isFinite(parseNumber(radioParams?.recoverPerSecond)) ? Math.max(0, parseNumber(radioParams?.recoverPerSecond)) : 2;
    const radioApplies = !!(radioParams || liquidType === 'radioactive_water' || liquidType === 'radioactive_waterfall');

    if (radioEnabled && radioApplies && (liquidType === 'radioactive_water' || liquidType === 'radioactive_waterfall')) {
      radio += (radioGain * dt) / 1000; 
    } else if (radioEnabled && !fogActive) {
      const baseline = maxRadio * radioBaseline;
      if (radio > baseline) {
        radio -= (radioDecay * dt) / 1000;
      } else if (radio < baseline) {
        radio += (radioRecover * dt) / 1000;
      }
    }

    // Radioactivity resource changes from fog (deplete while fog is active)
    if (weatherAffectsPlayer('radioactiveFog')) {
      const rates = getRadioactivityRates();
      if (radioFogInt > 0 && rates.increase > 0) {
        const dec = (radioFogInt / 100) * rates.increase * (dt / 1000);
        radio -= dec;
      } else if (radioFogInt <= 0 && rates.decay > 0 && !fogActive) {
        const inc = rates.decay * (dt / 1000);
        radio += inc;
      }
    }

    radio = Math.max(0, Math.min(maxRadio, radio));
    gameState.current.radioactivity = radio;
    gameState.current.maxRadioactivity = maxRadio;

    // Apply depletion health damage when at zero and still in corresponding liquid
    const tickDepleteDps = (accRef, dpsValue) => {
      const v = Math.max(0, Number(dpsValue) || 0);
      if (v <= 0) { accRef.current = 0; return; }
      accRef.current += dt;
      const T = 1000;
      while (accRef.current >= T) {
        accRef.current -= T;
        gameState.current.health = Math.max(0, (Number(gameState.current.health) || 0) - v);
        // Hit flash
        const HIT_FLASH_MS = 500;
        const prev = Number(gameState.current.hitTimerMs) || 0;
        gameState.current.hitTimerMs = Math.max(prev, HIT_FLASH_MS);
      }
    };

    // Oxygen depleted and still underwater → damage
    if ((headUnderWater && oxygenApplies) && oxy <= 0) {
      tickDepleteDps(oxygenDepleteAccRef, oxyParams.damagePerSecondWhenDepleted);
    } else if (oxygenDepleteAccRef) {
      oxygenDepleteAccRef.current = 0;
    }

    // Lava resist depleted and still in lava → health damage model is gated by base DPS below
    if ((liquidType === 'lava' || liquidType === 'lava_waterfall') && lavaRes <= 0) {
      if (lavaDepleteAccRef) lavaDepleteAccRef.current = 0;
    } else if (lavaDepleteAccRef) {
      lavaDepleteAccRef.current = 0;
    }

    // Weather damage (Lava Rain, Radioactive Fog)
    const weather = weatherNow || getMapWeather(mapData);
    const lavaRainInt = Number(weather.lavaRain || 0);

    let lavaDps = weatherAffectsPlayer('lavaRain') ? getWeatherDps('lavaRain', lavaRainInt) : 0;
    const radioDps = weatherAffectsPlayer('radioactiveFog') ? getWeatherDps('radioactiveFog', radioFogInt) : 0;
    if (lavaDps > 0 && (inWater || (liquidType && liquidType.includes('water')))) {
      lavaDps = 0;
    }
    if (lavaDps > 0 && weatherBlockedByCover('lavaRain')) {
      try {
        const tileData = backgroundLayer;
        const secretData = secretLayer;
        const covered = isCoveredFromAbove({
          x: x + width / 2,
          y,
          mapWidth,
          mapHeight,
          TILE_SIZE,
          tileData,
          registryItems: ctx.registryItems,
          secretData,
          objectData,
          objectMetadata,
          maps: mapData.maps,
          activeRoomIds: activeRoomIdsRef?.current || mapData.meta?.activeRoomIds
        });
        if (covered) lavaDps = 0;
      } catch {}
    }
    const effectiveRadioDps = (radioDps > 0 && Number(radio) <= 0) ? radioDps : 0;
    const totalWeatherDps = lavaDps + effectiveRadioDps;

    if (totalWeatherDps > 0) {
      weatherDamageAccRef.current += dt;
      if (weatherDamageAccRef.current >= 1000) {
        weatherDamageAccRef.current -= 1000;
        gameState.current.health = Math.max(0, (Number(gameState.current.health) || 0) - totalWeatherDps);
        const HIT_FLASH_MS = 500;
        gameState.current.hitTimerMs = Math.max(Number(gameState.current.hitTimerMs) || 0, HIT_FLASH_MS);
        if (actions.onStateUpdate) {
          actions.onStateUpdate('playerDamage', {
            damage: totalWeatherDps,
            x: x + width / 2,
            y
          });
        }
      }
    } else {
      weatherDamageAccRef.current = 0;
    }

  } catch {}

  // 2.8) Base liquid DPS (e.g., lava) — only after resource logic so we can gate by resistance
  const healthEnabled = resourceParams?.health?.enabled !== false;
  const healthDpsOverride = (healthEnabled && resourceParams?.health && resourceParams.health.damagePerSecond !== null && resourceParams.health.damagePerSecond !== undefined)
    ? Number(resourceParams.health.damagePerSecond)
    : null;
  const effectiveDps = Number.isFinite(healthDpsOverride) ? Math.max(0, healthDpsOverride) : Number(liquidParams?.dps);
  if (liquidType && liquidParams && Number(effectiveDps) > 0) {
    try {
      if (liquidType && liquidType.includes('lava')) {
        const curRes = Math.max(0, Number(gameState.current.lavaResist));
        if (curRes <= 0) {
          tickLiquidDamage({ accRef: liquidDamageAccumulatorRef, gameState }, deltaMs, { dps: effectiveDps });
        } else {
          if (liquidDamageAccumulatorRef) liquidDamageAccumulatorRef.current = 0;
        }
      } else {
        // Other liquids (if any in future) apply their DPS normally
        tickLiquidDamage({ accRef: liquidDamageAccumulatorRef, gameState }, deltaMs, { dps: effectiveDps });
      }
    } catch {}
  } else {
    if (liquidDamageAccumulatorRef) liquidDamageAccumulatorRef.current = 0;
  }

  // 3) Item collection and triggers
  // Sync moved state to Ref so triggers can see it and modify it (Teleport, Knockback, etc.)
  gameState.current.x = x;
  gameState.current.y = y;
  gameState.current.vx = vx;
  gameState.current.vy = vy;
  gameState.current.isGrounded = isGrounded;
  gameState.current.animation = animation;

  collectItem(x, y, mapWidth, objectData);

  // 3.5) Interactables check (berry bushes etc.)
  try { checkInteractables(x, y, mapWidth, mapHeight, objectData); } catch {}

  // 4) Hazard damage check (bushes etc.)
  try { checkHazardDamage(x, y, mapWidth, objectData, deltaMs); } catch {}

  // Sync back from Ref in case triggers changed something
  x = gameState.current.x;
  y = gameState.current.y;
  vx = gameState.current.vx;
  vy = gameState.current.vy;

  // 4.5) Secrets detection and reveal
  try { if (checkSecrets) checkSecrets(x, y, width, height, mapWidth, mapHeight); } catch {}

  // 5) Shooting & projectiles
  // Cooldown update
  if (shootCooldownRef.current > 0) shootCooldownRef.current = Math.max(0, shootCooldownRef.current - deltaMs);
  // Get fresh ammo value after item collection
  const currentAmmo = Math.max(0, Number(gameState.current.ammo) || 0);
  if (keys?.mouseLeft && shootCooldownRef.current <= 0 && currentAmmo > 0) {
    const originX = x + (direction >= 0 ? width + 4 : -4);
    const originY = y + height / 2;
    spawnProjectile(originX, originY, direction >= 0 ? 1 : -1, 'player');
    shootCooldownRef.current = 350; // ms cooldown
    gameState.current.ammo = Math.max(0, currentAmmo - 1);
  }
  // Update existing projectiles
  try { updateProjectiles(deltaMs, mapWidth, mapHeight); } catch {}

  // 5.5) Update entities (tanks etc.)
  try {
    updateEntities({
      entitiesRef,
      gameState,
      mapData,
      objectData,
      mapWidth,
      mapHeight,
      TILE_SIZE,
      checkCollision,
      isLiquidAt,
      getLiquidSample,
      spawnProjectile,
      playSfx,
      constants,
      registryItems: ctx.registryItems,
      onStateUpdate: actions.onStateUpdate,
      activeRoomIds: activeRoomIdsRef?.current || mapData.meta?.activeRoomIds
    }, Math.min(dt, 100)); // Ierobežojam deltaMs uz 100ms, lai izvairītos no milzīgiem lēcieniem
    
    // Sinhronizējam lokālos mainīgos pēc entītiju (platformu) ietekmes
    x = gameState.current.x;
    y = gameState.current.y;
    vx = gameState.current.vx;
    vy = gameState.current.vy;
    isGrounded = gameState.current.isGrounded;
    animation = gameState.current.animation;
    
    // Kontaktbojājumi no entītijām
    const player = gameState.current;
    if (entitiesRef.current && entitiesRef.current.length > 0) {
      for (const ent of entitiesRef.current) {
        if (ent.health <= 0 || ent.isExploding) continue;
        
        // AABB pārbaude
        const hit = (
          player.x < ent.x + ent.width &&
          player.x + player.width > ent.x &&
          player.y < ent.y + ent.height &&
          player.y + player.height > ent.y
        );
        
        if (hit && Number(player.hitTimerMs) <= 0) {
          // Pievienojam nelielu atgrūdienu (knockback)
          const knockbackDir = player.x + player.width / 2 < ent.x + ent.width / 2 ? -1 : 1;
          gameState.current.vx = knockbackDir * 5;
          gameState.current.vy = -3;
          
          // Iestatām bezsmertības periodu un vizuālo flash
          gameState.current.hitTimerMs = 500;
          
          // Samazinām spēlētāja veselību
          gameState.current.health = Math.max(0, (Number(gameState.current.health) || 0) - 10);
          
          if (actions.onStateUpdate) {
            actions.onStateUpdate('playerDamage', { damage: 10, x: player.x + player.width / 2, y: player.y });
          }
        }
      }
    }
  } catch (e) {
    console.error("Entity update failed:", e);
  }

  // 6) Clamp player to world bounds horizontally; allow falling below map to trigger game over
  const maxX = mapWidth * TILE_SIZE - width;
  x = Math.max(0, Math.min(maxX, x));

  // 7) Win and Death check
  if (gameState.current.isWinning) {
    gameState.current.winCounter = (gameState.current.winCounter || 0) + (gameState.current.winCountSpeed || 10) * (deltaMs / 100);
    if (gameState.current.winCounter >= 100) {
      gameState.current.winCounter = 100;
      // Trigger level win event if needed
      if (actions.onStateUpdate) actions.onStateUpdate('levelWin');
    }
  }

  if ((Number(gameState.current.health) || 0) <= 0 || y > mapHeight * TILE_SIZE + 300) {
    try { onGameOver && onGameOver(); } catch {}
  }

  // 8) Decrement hit flash timer
  try {
    if (Number(gameState.current.hitTimerMs) > 0) {
      gameState.current.hitTimerMs = Math.max(0, Number(gameState.current.hitTimerMs) - deltaMs);
    }
  } catch {}

  // 9) Commit new state for renderer
  gameState.current = {
    ...gameState.current,
    x,
    y,
    vx,
    vy,
    width,
    height,
    isGrounded,
    direction,
    animation,
    inWater,
    headUnderWater,
    atSurface,
    liquidType: liquidType || null,
    liquidOverlay: liquidParams?.overlay || null,
    onIce: isSlippery
  };

  // Floating text deltas for player resources
  if (actions.onStateUpdate) {
    const floatState = gameState.current.floatingText || { prev: {}, acc: {} };
    const resources = [
      { key: 'health', color: '#ff3b3b' },
      { key: 'oxygen', color: '#2ecdf1' },
      { key: 'lavaResist', color: '#ffcc00' },
      { key: 'iceResist', color: '#a5f3fc' },
      { key: 'strength', color: '#8b5a2b' },
      { key: 'radioactivity', color: '#32cd32' }
    ];
    const baseX = x + width / 2;
    const baseY = y - 6;

    resources.forEach((res, idx) => {
      const cur = Number(gameState.current[res.key]) || 0;
      if (!Number.isFinite(floatState.prev[res.key])) {
        floatState.prev[res.key] = cur;
        floatState.acc[res.key] = 0;
        return;
      }
      const diff = cur - floatState.prev[res.key];
      if (diff !== 0) {
        floatState.acc[res.key] = (floatState.acc[res.key] || 0) + diff;
        if (Math.abs(floatState.acc[res.key]) >= 1) {
          const amt = Math.round(floatState.acc[res.key]);
          floatState.acc[res.key] -= amt;
          const sign = amt > 0 ? '+' : '';
          actions.onStateUpdate('floatingText', {
            x: baseX + (idx - 2.5) * 6,
            y: baseY,
            text: `${sign}${amt}`,
            color: res.color,
            amount: amt
          });
        }
      }
      floatState.prev[res.key] = cur;
    });

    gameState.current.floatingText = floatState;
  }

  setPlayer({ ...gameState.current, projectiles: projectilesRef.current || [], entities: entitiesRef.current || [] });

  return { continue: true };
}

export default null;

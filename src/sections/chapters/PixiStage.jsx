import React, { useEffect, useRef } from 'react';
import { Application, Container, Sprite, Texture, AnimatedSprite, Assets, TilingSprite, WRAP_MODES, BlurFilter, Graphics } from 'pixi.js';
import { TextureCache } from '../../Pixi/TextureCache';
import { ParallaxBackground } from '../../Pixi/layers/ParallaxBackground';
import { TileChunkLayer } from '../../Pixi/layers/TileChunkLayer';
import WeatherRain from './weatherRain';
import WeatherSnow from './weatherSnow';
import WeatherClouds from './weatherClouds';
import WeatherFog from './weatherFog';
import WeatherThunder from './weatherThunder';
import WaterSplashFX from './liquids/WaterSplashFX';
import LavaEmbers from './liquids/LavaEmbers';
import LavaSteamFX from './liquids/LavaSteamFX';
import HealthBar from '../../Pixi/ui/HealthBar';
import LiquidRegionSystem from './LiquidRegionSystem';

// Suppress noisy Pixi Assets warnings for inlined data URLs (we load textures directly)
Assets.setPreferences?.({ skipCacheIdWarning: true });

// Minimal Pixi-based stage that replaces DOM grid rendering
// Props:
// - mapWidth, mapHeight: grid dimensions in tiles
// - tileSize: pixel size of one tile (default 32)
// - tileMapData: array of IDs for background layer
// - objectMapData: array of IDs for entities layer (excluding player)
// - registryItems: array of registry entries with { id, texture, textures, animationSpeed, width, height }
// - playerState: { x, y, direction, animation, health, width, height }
// - playerVisuals: registry item to use for the player visuals
const PixiStage = ({
  mapWidth,
  mapHeight,
  tileSize = 32,
  tileMapData = [],
  objectMapData = [],
  registryItems = [],
  playerState,
  playerVisuals,
  backgroundImage,
  backgroundColor,
  backgroundParallaxFactor = 0.3,
  cameraScrollX = 0,
  weatherRain = 0,
  weatherSnow = 0,
  weatherClouds = 0,
  projectiles = [],
  healthBarEnabled = true,
  weatherFog = 0,
  weatherThunder = 0,
  oxygenBarEnabled = true,
  lavaBarEnabled = true,
  waterSplashesEnabled = true,
  lavaEmbersEnabled = true,
  }) => {
  const mountRef = useRef(null);
  const appRef = useRef(null);
  const parallaxRef = useRef(null);
  const parallaxSpriteRef = useRef(null);
  const parallaxHelperRef = useRef(null); // ParallaxBackground helper
  const cameraScrollRef = useRef(0);
  const parallaxFactorRef = useRef(Number(backgroundParallaxFactor) || 0.3);
  const bgRef = useRef(null);
  const bgAnimRef = useRef(null); // animated tiles container above baked chunks
  const bgChunkLayerRef = useRef(null); // TileChunkLayer instance
  const objBehindRef = useRef(null); // objects behind player
  const objFrontRef = useRef(null);  // objects above player
  const playerRef = useRef(null); // container holding default/target sprites
  const playerSpriteRefs = useRef({ def: null, hit: null });
  const playerHealthBarRef = useRef(null);
  const playerStateRef = useRef(null);
  const weatherLayerRef = useRef(null);
  const liquidLayerRef = useRef(null);
  const liquidSystemRef = useRef(null);
  const fogLayerRef = useRef(null); // reused as clouds overlay layer
  const weatherSystemsRef = useRef({ rain: null, snow: null, clouds: null, thunder: null });
  const projectilesLayerRef = useRef(null);
  const projectileSpritesRef = useRef(new Map()); // id -> sprite
  const projectilesPropRef = useRef([]);
  const pixiTextureCacheRef = useRef(null); // central TextureCache
  const hbEnabledRef = useRef(healthBarEnabled !== false);
  const oxyEnabledRef = useRef(oxygenBarEnabled !== false);
  const lavaEnabledRef = useRef(lavaBarEnabled !== false);
  const overlayLayerRef = useRef(null); // topmost overlay (underwater tint)
  const underwaterRef = useRef({ g: null, time: 0 });
  const waterFramesRef = useRef(null); // cached procedural water textures
  const lavaFramesRef = useRef(null);  // cached procedural lava textures
  const overlayHBRef = useRef(null);   // health bar rendered above water
  const oxygenBarRef = useRef(null);   // oxygen bar when in water
  const lavaBarRef = useRef(null);     // lava resistance bar when in lava
  const waterFxRef = useRef(null);     // water splash FX
  const lavaEmbersRef = useRef(null);  // lava ember FX
  const lavaSteamRef = useRef(null);   // lava steam FX (rain/snow impacts)
  const splashesEnabledRef = useRef(waterSplashesEnabled !== false);
  const embersEnabledRef = useRef(lavaEmbersEnabled !== false);
  const waterStateRef = useRef({ inWater: false, headUnder: false, vy: 0 });

  // keep latest player state and camera scroll for ticker without re-subscribing
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);
  useEffect(() => {
    projectilesPropRef.current = Array.isArray(projectiles) ? projectiles : [];
  }, [projectiles]);
  useEffect(() => {
    hbEnabledRef.current = healthBarEnabled !== false;
  }, [healthBarEnabled]);
  useEffect(() => {
    oxyEnabledRef.current = oxygenBarEnabled !== false;
  }, [oxygenBarEnabled]);
  useEffect(() => {
    lavaEnabledRef.current = lavaBarEnabled !== false;
  }, [lavaBarEnabled]);
  useEffect(() => {
    splashesEnabledRef.current = waterSplashesEnabled !== false;
  }, [waterSplashesEnabled]);
  useEffect(() => {
    embersEnabledRef.current = lavaEmbersEnabled !== false;
  }, [lavaEmbersEnabled]);
  useEffect(() => {
    cameraScrollRef.current = Number(cameraScrollX) || 0;
  }, [cameraScrollX]);
  useEffect(() => {
    parallaxFactorRef.current = Number(backgroundParallaxFactor) || 0.3;
  }, [backgroundParallaxFactor]);

  // Small helper cache for textures
  const textureCacheRef = useRef(new Map());
  const getTexture = (url) => {
    if (!url) return null;
    const cache = textureCacheRef.current;
    if (cache.has(url)) return cache.get(url);
    const tex = Texture.from(url);
    cache.set(url, tex);
    return tex;
  };

  // Background images resolver (from src/assets/background)
  // Meta stores `/assets/background/<name>`
  let bgContext;
  try {
    // webpack require.context (CRA)
    // relative to this file: '../../assets/background'
    bgContext = require.context('../../assets/background', false, /\.(png|jpe?g|svg)$/);
  } catch (e) {
    bgContext = null;
  }
  const resolveBackgroundUrl = (metaPath) => {
    if (!bgContext) return null;
    if (!metaPath) {
      const keys = bgContext.keys();
      if (keys && keys.length) {
        const mod = bgContext(keys[0]);
        return mod.default || mod;
      }
      return null;
    }
    const name = metaPath.split('/').pop();
    const rel = `./${name}`;
    try {
      const mod = bgContext(rel);
      return mod.default || mod;
    } catch (e) {
      // fallback to first available
      const keys = bgContext.keys();
      if (keys && keys.length) {
        const mod = bgContext(keys[0]);
        return mod.default || mod;
      }
      return null;
    }
  };

  // Build or rebuild parallax background via helper
  const rebuildParallax = () => {
    const app = appRef.current;
    const layer = parallaxRef.current;
    if (!app || !layer) return;

    if (!pixiTextureCacheRef.current) pixiTextureCacheRef.current = new TextureCache();
    if (!parallaxHelperRef.current) parallaxHelperRef.current = new ParallaxBackground(layer, pixiTextureCacheRef.current);

    const url = resolveBackgroundUrl(backgroundImage);
    parallaxHelperRef.current.build({
      worldWidth: mapWidth * tileSize,
      worldHeight: mapHeight * tileSize,
      url,
      color: backgroundColor,
      factor: parallaxFactorRef.current || 0.3,
    });
    parallaxSpriteRef.current = parallaxHelperRef.current.sprite;
  };

  // Convert ms-per-frame (JSON) to Pixi AnimatedSprite speed factor (1 = 60fps)
  const msToSpeed = (ms) => {
    const m = Number(ms);
    const msPerFrame = Number.isFinite(m) && m > 0 ? m : 500;
    const fps = 1000 / msPerFrame;
    return fps / 60; // Pixi speed factor
  };

  const getRegItem = (id) => registryItems.find((r) => r.id === id);

  // Solid collision helper for world tiles (used by weather systems)
  const isSolidAt = (wx, wy) => {
    // Allow particles (snow/rain) to spawn above the top edge and fall into the world.
    // Negative Y should NOT be treated as solid, otherwise flakes will "settle" off-screen.
    if (wy < 0) return false;
    // Keep left-of-world as solid to avoid pushing from outside horizontally.
    if (wx < 0) return true;
    const gx = Math.floor(wx / tileSize);
    const gy = Math.floor(wy / tileSize);
    if (gx < 0 || gy < 0 || gx >= mapWidth || gy >= mapHeight) return false; // below world is not solid
    const idx = gy * mapWidth + gx;
    const id = tileMapData[idx];
    if (!id) return false;
    const def = getRegItem(id);
    if (!def) return false;
    const c = def.collision;
    if (!c) return false;
    if (c === true) return true;
    if (typeof c === 'object') {
      return !!(c.top || c.bottom || c.left || c.right);
    }
    return false;
  };

  // Initialize Application
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: mapWidth * tileSize,
        height: mapHeight * tileSize,
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(true); return; }

      appRef.current = app;

      const bg = new Container();
      const bgAnim = new Container();
      const objBehind = new Container();
      const objFront = new Container();
      const playerLayer = new Container();
      const weatherLayer = new Container();
      const liquidLayer = new Container();
      const liquidFxLayer = new Container();
      const fogLayer = new Container();
      const projLayer = new Container();
      const overlayLayer = new Container();

      bgRef.current = bg;
      bgAnimRef.current = bgAnim;
      objBehindRef.current = objBehind;
      objFrontRef.current = objFront;

      // Parallax layer (behind everything)
      const parallaxLayer = new Container();
      parallaxRef.current = parallaxLayer;
      app.stage.addChild(parallaxLayer);
      // Objects and weather first
      app.stage.addChild(objBehind); // objects behind player
      app.stage.addChild(playerLayer);
      app.stage.addChild(projLayer); // projectiles above player
      app.stage.addChild(objFront); // objects above player
      // Weather renders below fog
      app.stage.addChild(weatherLayer);
      // Fog overlays objects and weather (Variant 1)
      app.stage.addChild(fogLayer);
      // Liquids should be visible like blocks even when fog is enabled → render ABOVE fog
      app.stage.addChild(liquidLayer);
      // Liquid FX (splashes/steam) must appear in front of liquids
      app.stage.addChild(liquidFxLayer);
      // Finally, tiles ("blocks") drawn last so they appear in front of fog (and in front of liquids)
      app.stage.addChild(bg);
      app.stage.addChild(bgAnim); // animated tiles above baked layer
      // Topmost overlay for effects like underwater tint
      app.stage.addChild(overlayLayer);

      weatherLayerRef.current = weatherLayer;
      liquidLayerRef.current = liquidLayer;
      // Assign overlay layer ref BEFORE attaching any custom properties to it
      overlayLayerRef.current = overlayLayer;
      // store FX layer ref
      const liquidFxLayerRefLocal = liquidFxLayer;
      // Save on ref object via a symbol-like property to avoid new ref declaration
      // We'll attach to overlayLayerRef to keep simple access (defensively check ref)
      try {
        if (overlayLayerRef.current) {
          overlayLayerRef.current.__liquidFxLayer = liquidFxLayerRefLocal;
        }
      } catch {}
      fogLayerRef.current = fogLayer;
      projectilesLayerRef.current = projLayer;

      // Preload textures to avoid Assets cache warnings for data URLs and ensure textures are ready
      try {
        const urlSet = new Set();
        const addUrl = (u) => { if (typeof u === 'string' && u.length) urlSet.add(u); };
        registryItems.forEach((def) => {
          addUrl(def?.texture);
          if (Array.isArray(def?.textures)) def.textures.forEach(addUrl);
        });
        if (playerVisuals) {
          addUrl(playerVisuals.texture);
          if (Array.isArray(playerVisuals.textures)) playerVisuals.textures.forEach(addUrl);
        }
        const bgUrl = resolveBackgroundUrl(backgroundImage);
        if (bgUrl) addUrl(bgUrl);
        const urls = Array.from(urlSet);
        if (urls.length) {
          await Assets.load(urls);
        }
      } catch (e) {
        console.warn('Pixi Assets preload encountered an issue (continuing):', e);
      }

      // Create player container with two variants: default and hit (target)
      const playerContainer = new Container();
      playerLayer.addChild(playerContainer);

      const buildSpriteFromDef = (def) => {
        if (!def) return null;
        let spr = null;
        if (Array.isArray(def.textures) && def.textures.length > 1) {
          const frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
          if (frames.length > 0) {
            spr = new AnimatedSprite(frames);
            spr.animationSpeed = msToSpeed(def.animationSpeed);
            spr.play();
          }
        }
        if (!spr) {
          const tex = getTexture(def.texture) || Texture.WHITE;
          spr = new Sprite(tex);
        }
        spr.anchor.set(0, 0);
        return spr;
      };

      // Default visuals from prop
      const defaultDef = playerVisuals || null;
      // Target visuals: try specific IDs
      const targetDef = Array.isArray(registryItems)
        ? (registryItems.find(r => r.id === 'player_target_100') || registryItems.find(r => r.id === 'player_target'))
        : null;

      const defSprite = buildSpriteFromDef(defaultDef) || new Sprite(Texture.WHITE);
      const hitSprite = buildSpriteFromDef(targetDef) || null;

      playerContainer.addChild(defSprite);
      if (hitSprite) playerContainer.addChild(hitSprite);

      // Health bar above player (reusable component)
      try {
        const hb = new HealthBar({ width: (playerState?.width) || tileSize, height: 4, offsetX: 0, offsetY: -5 });
        playerContainer.addChild(hb); // added last to render on top
        playerHealthBarRef.current = hb;
      } catch {}

      // Initial visibility
      defSprite.visible = true;
      if (hitSprite) hitSprite.visible = false;

      playerRef.current = playerContainer;
      playerSpriteRefs.current = { def: defSprite, hit: hitSprite };

      // Mount canvas
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(app.canvas);
      }

      // Build underwater overlay graphic (full-screen tint when submerged)
      try {
        const g = new Graphics();
        overlayLayer.addChild(g);
        underwaterRef.current.g = g;
        const redrawOverlay = () => {
          const W = mapWidth * tileSize;
          const H = mapHeight * tileSize;
          g.clear();
          g.beginFill(0x1d4875, 1); // deep blue tint
          g.drawRect(0, 0, W, H);
          g.endFill();
          g.alpha = 0; // initially hidden
          g.visible = false;
        };
        redrawOverlay();
      } catch {}

      // Build overlay bars (health over water, oxygen, lava)
      try {
        const makeBar = (colors) => new HealthBar({ width: (playerState?.width) || tileSize, height: 4, offsetX: 0, offsetY: 0, colors });
        // Health overlay bar (uses default colors from HealthBar)
        const hbOverlay = new HealthBar({ width: (playerState?.width) || tileSize, height: 4, offsetX: 0, offsetY: 0 });
        hbOverlay.visible = false;
        overlayLayer.addChild(hbOverlay);
        overlayHBRef.current = hbOverlay;
        // Oxygen bar (cyan/blue scheme)
        const oxyColors = { ok: 0x2ecdf1, warn: 0x3498db, danger: 0x1f6fb2 };
        const oxyBar = makeBar(oxyColors);
        oxyBar.visible = false;
        overlayLayer.addChild(oxyBar);
        oxygenBarRef.current = oxyBar;
        // Lava bar (orange/red scheme)
        const lavaColors = { ok: 0xffa229, warn: 0xff7b00, danger: 0xff3b1a };
        const lvBar = makeBar(lavaColors);
        lvBar.visible = false;
        overlayLayer.addChild(lvBar);
        lavaBarRef.current = lvBar;
      } catch {}

      // Handle WebGL context loss/restoration gracefully to avoid crashes
      if (app.canvas) {
        app.canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault(); // allow Pixi to handle restoration
          console.warn('WebGL context was lost. Attempting to restore...');
        });
        app.canvas.addEventListener('webglcontextrestored', () => {
          console.info('WebGL context restored. Rebuilding layers...');
          rebuildLayers();
          rebuildParallax();
          try {
            if (liquidSystemRef.current) liquidSystemRef.current.destroy();
          } catch {}
          try {
            liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { mapWidth, mapHeight, tileSize });
            liquidSystemRef.current.build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
          } catch (e) { console.warn('LiquidRegionSystem rebuild failed after context restore:', e); }
          // Rebuild ember surfaces after context restore
          try {
            if (lavaEmbersRef.current) {
              lavaEmbersRef.current.rebuildSurfaces({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
            }
          } catch {}
        });
      }

      // First draw of map layers
      rebuildLayers();
      // Initialize liquid regions
      try {
        if (liquidSystemRef.current) {
          liquidSystemRef.current.destroy();
        }
        liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { mapWidth, mapHeight, tileSize });
        liquidSystemRef.current.build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
      } catch (e) { console.warn('LiquidRegionSystem init failed:', e); }
      // FX systems
      try {
        // Ensure splashes render IN FRONT of water: parent to liquid FX layer if available
        const fxParent = overlayLayerRef.current?.__liquidFxLayer || liquidLayerRef.current;
        waterFxRef.current = new WaterSplashFX(fxParent);
      } catch {}
      try {
        const fxParent = overlayLayerRef.current?.__liquidFxLayer || liquidLayerRef.current;
        lavaSteamRef.current = new LavaSteamFX(fxParent);
      } catch {}
      try {
        lavaEmbersRef.current = new LavaEmbers(liquidLayerRef.current, { mapWidth, mapHeight, tileSize }, () => (embersEnabledRef.current ? 100 : 0));
        lavaEmbersRef.current.rebuildSurfaces({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
      } catch {}
      // Build or rebuild parallax background
      rebuildParallax();

      // Update player and parallax each frame
      app.ticker.add(() => {
        const s = playerStateRef.current;
        // Update player sprite if available
        if (s && playerRef.current) {
          const container = playerRef.current;
          const { def, hit } = playerSpriteRefs.current || {};

          // Resize child sprites to match player state
          if (def) { if (s.width) def.width = s.width; if (s.height) def.height = s.height; }
          if (hit) { if (s.width) hit.width = s.width; if (s.height) hit.height = s.height; }

          // Update health bar size and value
          const hb = playerHealthBarRef.current;
          if (hb) {
            const enabled = hbEnabledRef.current !== false;
            const inWater = !!s.inWater;
            const inLava = s.liquidType === 'lava';
            if (!enabled) {
              hb.visible = false;
            } else {
              // When in water or lava, hide the player-attached HB and use overlay version instead
              hb.visible = !(inWater || inLava);
              const effectiveWidth = s.width || (def?.width) || tileSize;
              hb.resize(effectiveWidth, 4);
              hb.y = -Math.max(4, Math.floor((s.height || def?.height || tileSize) * 0.12)); // small offset above sprite
              hb.update(s.health, (Number(s.maxHealth) || 100));
            }
          }

          // Choose which is visible based on hit timer
          const isHit = Number(s.hitTimerMs) > 0 && !!hit;
          if (def) def.visible = !isHit;
          if (hit) hit.visible = isHit;

          // Direction flip is applied to the container
          const dir = s.direction || 1;
          const mag = Math.abs(container.scale.x || 1);
          container.scale.x = dir >= 0 ? mag : -mag;

          // Position container; when flipped, offset by width
          const effectiveWidth = s.width || (def?.width) || tileSize;
          container.x = dir >= 0 ? (s.x || 0) : ((s.x || 0) + effectiveWidth);
          container.y = s.y || 0;
        }

        // Update parallax background tile offset based on camera scroll
        const f = parallaxFactorRef.current;
        const camX = cameraScrollRef.current || 0;
        if (parallaxHelperRef.current) {
          parallaxHelperRef.current.setScroll(camX, f);
        }

        // Weather update with delta time
        const dt = app.ticker?.deltaMS || 16.67;
        const systems = weatherSystemsRef.current;
        if (systems.rain) systems.rain.update(dt);
        if (systems.snow) systems.snow.update(dt);
        if (systems.clouds) systems.clouds.update(dt);
        if (systems.fog) systems.fog.update(dt);
        if (systems.thunder) systems.thunder.update(dt);
        // Liquids region update
        try { liquidSystemRef.current?.update(dt); } catch {}

        // FX systems update
        try { lavaEmbersRef.current?.update(dt); } catch {}
        try { waterFxRef.current?.update(dt); } catch {}
        try { lavaSteamRef.current?.update(dt); } catch {}

        // Underwater overlay animation (only for water) and water splash triggers
        try {
          const u = underwaterRef.current;
          const sNow = playerStateRef.current || {};
          if (u && u.g) {
            const submerged = !!(sNow && sNow.headUnderWater && sNow.liquidType === 'water');
            if (submerged) {
              u.time += dt;
              const pulse = 0.12 + 0.06 * Math.sin(u.time * 0.0025);
              u.g.visible = true;
              u.g.alpha = pulse; // subtle
            } else if (u.g.visible) {
              // fade out quickly
              u.g.alpha *= 0.85;
              if (u.g.alpha < 0.01) { u.g.alpha = 0; u.g.visible = false; }
            }
          }
          // Splash detection: transitions air<->water
          try {
            const prev = waterStateRef.current || { inWater: false, headUnder: false, vy: 0 };
            const nowInWater = !!sNow.inWater;
            const nowLiquid = sNow.liquidType;
            const centerX = (sNow.x || 0) + (sNow.width || tileSize) * 0.5;
            // Enter water
            if (splashesEnabledRef.current && nowLiquid === 'water' && nowInWater && !prev.inWater) {
              const sy = liquidSystemRef.current?.getSurfaceY?.('water', centerX);
              const vy = Number(sNow.vy) || 0;
              const strength = Math.min(3, Math.max(0.2, Math.abs(vy) * 0.12));
              waterFxRef.current?.trigger({ x: centerX, y: (Number.isFinite(sy) ? sy : (sNow.y || 0)), strength, upward: false });
              // Kick water surface ripple (larger on fast entry)
              try { liquidSystemRef.current?.addWave?.('water', centerX, Math.min(2.5, 0.6 + Math.abs(vy) * 0.08)); } catch {}
            }
            // Exit water
            if (splashesEnabledRef.current && prev.inWater && !nowInWater) {
              const sy = liquidSystemRef.current?.getSurfaceY?.('water', centerX);
              const vy = Number(sNow.vy) || 0;
              const strength = Math.min(3, Math.max(0.2, Math.abs(vy) * 0.08));
              waterFxRef.current?.trigger({ x: centerX, y: (Number.isFinite(sy) ? sy : (sNow.y || 0)), strength, upward: true });
              // Smaller ripple on exit
              try { liquidSystemRef.current?.addWave?.('water', centerX, Math.min(2.0, 0.4 + Math.abs(vy) * 0.05)); } catch {}
            }
            waterStateRef.current = { inWater: nowInWater, headUnder: !!sNow.headUnderWater, vy: Number(sNow.vy) || 0 };
          } catch {}
        } catch {}

        // Overlay bars update/positioning
        try {
          const s2 = playerStateRef.current || {};
          const effW = (s2.width || tileSize);
          const effH = (s2.height || tileSize);
          // Compute anchor top Y above player
          const baseYOffset = Math.max(4, Math.floor(effH * 0.12));
          const baseX = (s2.x || 0);
          const baseY = (s2.y || 0) - baseYOffset;

          // Overlay health when in water or lava
          const hbO = overlayHBRef.current;
          if (hbO) {
            const enabled = hbEnabledRef.current !== false;
            const show = enabled && (!!s2.inWater || s2.liquidType === 'lava');
            hbO.visible = !!show;
            if (show) {
              hbO.x = baseX;
              hbO.y = baseY;
              hbO.resize(effW, 4);
              hbO.update(s2.health, (Number(s2.maxHealth) || 100));
            }
          }

          // Compute stacking Y for additional bars
          let nextBarY = baseY;
          if (hbO && hbO.visible) nextBarY += 6;

          // Oxygen bar when in water OR when oxygen hasn't refilled to max yet
          const oxyBar = oxygenBarRef.current;
          if (oxyBar) {
            const enabled = oxyEnabledRef.current !== false;
            const maxOxy = Math.max(1, Number(s2.maxOxygen) || 100);
            const curOxy = Math.max(0, Number(s2.oxygen));
            const show = enabled && ((s2.liquidType === 'water' || s2.inWater) || (curOxy < maxOxy));
            oxyBar.visible = !!show;
            if (show) {
              oxyBar.x = baseX;
              oxyBar.y = nextBarY;
              oxyBar.resize(effW, 4);
              oxyBar.update((Number.isFinite(curOxy) ? curOxy : maxOxy), maxOxy);
              nextBarY += 6;
            }
          }

          // Lava bar when in lava OR when lavaResist hasn't refilled to max yet
          const lvBar = lavaBarRef.current;
          if (lvBar) {
            const enabled = lavaEnabledRef.current !== false;
            const maxLv = Math.max(1, Number(s2.maxLavaResist) || 100);
            const curLv = Math.max(0, Number(s2.lavaResist));
            const show = enabled && (s2.liquidType === 'lava' || (curLv < maxLv));
            lvBar.visible = !!show;
            if (show) {
              lvBar.x = baseX;
              lvBar.y = nextBarY;
              lvBar.resize(effW, 4);
              lvBar.update((Number.isFinite(curLv) ? curLv : maxLv), maxLv);
            }
          }
        } catch {}

        // Projectiles sync/update: create missing sprites, remove stale, update positions
        const layer = projectilesLayerRef.current;
        if (layer) {
          const map = projectileSpritesRef.current;
          const list = projectilesPropRef.current || [];
          const seen = new Set();
          for (let i = 0; i < list.length; i++) {
            const p = list[i];
            const key = p.id;
            seen.add(key);
            let spr = map.get(key);
            if (!spr) {
              const def = getRegItem(p.defId);
              if (def && Array.isArray(def.textures) && def.textures.length > 1) {
                const frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
                if (frames.length > 0) {
                  spr = new AnimatedSprite(frames);
                  spr.animationSpeed = msToSpeed(def.animationSpeed);
                  spr.play();
                }
              }
              if (!spr) {
                const tex = getTexture(getRegItem(p.defId)?.texture) || Texture.WHITE;
                spr = new Sprite(tex);
              }
              spr.anchor.set(0.5, 0.5);
              spr.width = Math.max(2, p.w || tileSize * 0.25);
              spr.height = Math.max(2, p.h || tileSize * 0.25);
              layer.addChild(spr);
              map.set(key, spr);
            }
            spr.x = p.x + (p.dir >= 0 ? 0 : 0);
            spr.y = p.y;
            const mag = Math.abs(spr.scale.x || 1);
            spr.scale.x = p.dir >= 0 ? mag : -mag;
          }
          // remove sprites that no longer exist
          for (const [key, spr] of map.entries()) {
            if (!seen.has(key)) {
              try { spr.parent && spr.parent.removeChild(spr); } catch {}
              try { spr.destroy && spr.destroy(); } catch {}
              map.delete(key);
            }
          }
        }
      });
    };

    const rebuildLayers = () => {
      const app = appRef.current;
      if (!app || !bgRef.current || !objBehindRef.current || !objFrontRef.current) return;

      // Clear previous
      bgRef.current.removeChildren();
      objBehindRef.current.removeChildren();
      objFrontRef.current.removeChildren();

      // Helper: resolve registry item by id
      const getDef = (id) => registryItems.find((r) => r.id === id);
      const isWaterDef = (def) => !!(def && def.flags && def.flags.water);
      const isLavaDef = (def) => !!(def && def.flags && def.flags.lava);

      // Generate procedural water frames (cached per tile size)
      const getWaterFrames = () => {
        if (waterFramesRef.current && waterFramesRef.current.size === tileSize) return waterFramesRef.current.frames;
        const frames = [];
        const F = 8; // frame count
        for (let i = 0; i < F; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileSize; canvas.height = tileSize;
          const ctx = canvas.getContext('2d');
          // background gradient
          const g = ctx.createLinearGradient(0, 0, 0, tileSize);
          g.addColorStop(0, '#2a5d8f');
          g.addColorStop(1, '#174369');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, tileSize, tileSize);
          // animated ripples via sine stripes
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#8fc0ff';
          const t = i / F;
          const bands = 3;
          for (let b = 0; b < bands; b++) {
            const y = Math.floor((tileSize / bands) * b + (tileSize / bands) * 0.5 + Math.sin((t + b * 0.33) * Math.PI * 2) * (tileSize * 0.08));
            ctx.fillRect(0, y, tileSize, Math.max(1, Math.floor(tileSize * 0.06)));
          }
          // soft top highlight
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#c9ecff';
          ctx.fillRect(0, 0, tileSize, Math.max(1, Math.floor(tileSize * 0.12)));
          const tex = Texture.from(canvas);
          frames.push(tex);
        }
        waterFramesRef.current = { size: tileSize, frames };
        return frames;
      };

      // Generate procedural lava frames (cached per tile size)
      const getLavaFrames = () => {
        if (lavaFramesRef.current && lavaFramesRef.current.size === tileSize) return lavaFramesRef.current.frames;
        const frames = [];
        const F = 8;
        for (let i = 0; i < F; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileSize; canvas.height = tileSize;
          const ctx = canvas.getContext('2d');
          // base gradient (dark red to orange)
          const g = ctx.createLinearGradient(0, 0, 0, tileSize);
          g.addColorStop(0, '#6b1a07');
          g.addColorStop(1, '#c43f0f');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, tileSize, tileSize);
          // glowing veins
          const t = i / F;
          ctx.globalAlpha = 0.3;
          for (let b = 0; b < 3; b++) {
            const y = Math.floor((tileSize / 3) * b + (tileSize / 3) * 0.5 + Math.sin((t * 2 + b * 0.6) * Math.PI * 2) * (tileSize * 0.1));
            const h = Math.max(1, Math.floor(tileSize * 0.07));
            const grad = ctx.createLinearGradient(0, y, 0, y + h);
            grad.addColorStop(0, '#ffed8a');
            grad.addColorStop(1, '#ff7b00');
            ctx.fillStyle = grad;
            ctx.fillRect(0, y, tileSize, h);
          }
          // bubbles/dots
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#ffd36e';
          const count = Math.max(2, Math.floor(tileSize * 0.12));
          for (let k = 0; k < count; k++) {
            const rx = Math.floor((k * 37 + i * 13) % tileSize);
            const ry = Math.floor((k * 53 + i * 29) % tileSize);
            ctx.fillRect(rx, ry, 1, 1);
          }
          const tex = Texture.from(canvas);
          frames.push(tex);
        }
        lavaFramesRef.current = { size: tileSize, frames };
        return frames;
      };

      // Background tiles (skip liquids here; they will be rendered by LiquidRegionSystem)
      for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = tileMapData[i];
        if (!id) continue;
        const def = getRegItem(id);
        if (!def) continue;

        let sprite;
        let frames = null;
        if (isWaterDef(def) || isLavaDef(def)) {
          // liquids are handled by LiquidRegionSystem; skip per-tile sprite
          continue;
        } else {
          if (Array.isArray(def.textures) && def.textures.length > 1) {
            frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
          }
          if (frames && frames.length > 0) {
            sprite = new AnimatedSprite(frames);
            sprite.animationSpeed = msToSpeed(def.animationSpeed);
            sprite.play();
          } else {
            const tex = getTexture(def.texture) || null;
            if (!tex) continue;
            sprite = new Sprite(tex);
          }
        }

        const x = (i % mapWidth) * tileSize;
        const y = Math.floor(i / mapWidth) * tileSize;
        sprite.x = x;
        sprite.y = y;
        sprite.width = tileSize;
        sprite.height = tileSize;
        bgRef.current.addChild(sprite);
      }

      // Objects (non-player)
      for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = objectMapData[i];
        if (!id || id.includes('player')) continue;
        const def = getRegItem(id);
        if (!def) continue;

        let sprite;
        let frames = null;
        if (Array.isArray(def.textures) && def.textures.length > 1) {
          frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
        }
        if (frames && frames.length > 0) {
          sprite = new AnimatedSprite(frames);
          sprite.animationSpeed = msToSpeed(def.animationSpeed);
          sprite.play();
        } else {
          const tex = getTexture(def.texture) || null;
          if (!tex) continue;
          sprite = new Sprite(tex);
        }

        const x = (i % mapWidth) * tileSize;
        const y = Math.floor(i / mapWidth) * tileSize;
        sprite.x = x;
        sprite.y = y;
        sprite.width = tileSize;
        sprite.height = tileSize;
        const renderAbove = !!def.renderAbovePlayer;
        if (renderAbove) {
          objFrontRef.current.addChild(sprite);
        } else {
          objBehindRef.current.addChild(sprite);
        }
      }
    };

    init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      // Destroy liquid system
      try { liquidSystemRef.current?.destroy(); } catch {}
      liquidSystemRef.current = null;
      // Destroy FX systems
      try { waterFxRef.current?.destroy(); } catch {}
      waterFxRef.current = null;
      try { lavaEmbersRef.current?.destroy(); } catch {}
      lavaEmbersRef.current = null;
      try { lavaSteamRef.current?.destroy(); } catch {}
      lavaSteamRef.current = null;
      // Destroy parallax helper and texture cache (releasing references only)
      try { parallaxHelperRef.current?.destroy(); } catch {}
      parallaxHelperRef.current = null;
      try { pixiTextureCacheRef.current?.clear?.(); } catch {}
      pixiTextureCacheRef.current = null;
      // Destroy weather systems
      try {
        weatherSystemsRef.current.rain?.destroy();
        weatherSystemsRef.current.snow?.destroy();
        weatherSystemsRef.current.fog?.destroy();
      } catch {}
      // destroy projectile sprites
      try {
        const map = projectileSpritesRef.current;
        for (const spr of map.values()) {
          try { spr.parent && spr.parent.removeChild(spr); } catch {}
          try { spr.destroy && spr.destroy(); } catch {}
        }
        projectileSpritesRef.current.clear();
      } catch {}
      textureCacheRef.current.forEach((t) => t.destroy && t.destroy(true));
      textureCacheRef.current.clear();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight, tileSize, playerVisuals]);

  // Rebuild layers when map data changes
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    // Rebuild background and object layers
    if (bgRef.current && objBehindRef.current && objFrontRef.current) {
      // Simple approach: full rebuild
      // Background
      bgRef.current.removeChildren();
      // Helpers for liquid rendering
      const isWaterDef = (def) => !!(def && def.flags && def.flags.water);
      const isLavaDef = (def) => !!(def && def.flags && def.flags.lava);
      const getWaterFrames = () => {
        if (waterFramesRef.current && waterFramesRef.current.size === tileSize) return waterFramesRef.current.frames;
        const frames = [];
        const F = 8;
        for (let i = 0; i < F; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileSize; canvas.height = tileSize;
          const ctx = canvas.getContext('2d');
          const g = ctx.createLinearGradient(0, 0, 0, tileSize);
          g.addColorStop(0, '#2a5d8f');
          g.addColorStop(1, '#174369');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, tileSize, tileSize);
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#8fc0ff';
          const t = i / F;
          const bands = 3;
          for (let b = 0; b < bands; b++) {
            const yb = Math.floor((tileSize / bands) * b + (tileSize / bands) * 0.5 + Math.sin((t + b * 0.33) * Math.PI * 2) * (tileSize * 0.08));
            ctx.fillRect(0, yb, tileSize, Math.max(1, Math.floor(tileSize * 0.06)));
          }
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#c9ecff';
          ctx.fillRect(0, 0, tileSize, Math.max(1, Math.floor(tileSize * 0.12)));
          const tex = Texture.from(canvas);
          frames.push(tex);
        }
        waterFramesRef.current = { size: tileSize, frames };
        return frames;
      };
      const getLavaFrames = () => {
        if (lavaFramesRef.current && lavaFramesRef.current.size === tileSize) return lavaFramesRef.current.frames;
        const frames = [];
        const F = 8;
        for (let i = 0; i < F; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileSize; canvas.height = tileSize;
          const ctx = canvas.getContext('2d');
          const g = ctx.createLinearGradient(0, 0, 0, tileSize);
          g.addColorStop(0, '#6b1a07');
          g.addColorStop(1, '#c43f0f');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, tileSize, tileSize);
          const t = i / F;
          ctx.globalAlpha = 0.3;
          for (let b = 0; b < 3; b++) {
            const yb = Math.floor((tileSize / 3) * b + (tileSize / 3) * 0.5 + Math.sin((t * 2 + b * 0.6) * Math.PI * 2) * (tileSize * 0.1));
            const h = Math.max(1, Math.floor(tileSize * 0.07));
            const grad = ctx.createLinearGradient(0, yb, 0, yb + h);
            grad.addColorStop(0, '#ffed8a');
            grad.addColorStop(1, '#ff7b00');
            ctx.fillStyle = grad;
            ctx.fillRect(0, yb, tileSize, h);
          }
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#ffd36e';
          const count = Math.max(2, Math.floor(tileSize * 0.12));
          for (let k = 0; k < count; k++) {
            const rx = Math.floor((k * 37 + i * 13) % tileSize);
            const ry = Math.floor((k * 53 + i * 29) % tileSize);
            ctx.fillRect(rx, ry, 1, 1);
          }
          const tex = Texture.from(canvas);
          frames.push(tex);
        }
        lavaFramesRef.current = { size: tileSize, frames };
        return frames;
      };

      // Background tiles (skip liquids; handled by LiquidRegionSystem)
      for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = tileMapData[i];
        if (!id) continue;
        const def = registryItems.find((r) => r.id === id);
        if (!def) continue;
        if (isWaterDef(def) || isLavaDef(def)) continue;

        let sprite;
        let frames = null;
        if (Array.isArray(def.textures) && def.textures.length > 1) {
          frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
        }
        if (frames && frames.length > 0) {
          sprite = new AnimatedSprite(frames);
          sprite.animationSpeed = msToSpeed(def.animationSpeed);
          sprite.play();
        } else {
          const tex = getTexture(def.texture) || null;
          if (!tex) continue;
          sprite = new Sprite(tex);
        }
        const x = (i % mapWidth) * tileSize;
        const y = Math.floor(i / mapWidth) * tileSize;
        sprite.x = x;
        sprite.y = y;
        sprite.width = tileSize;
        sprite.height = tileSize;
        bgRef.current.addChild(sprite);
      }

      // Rebuild liquid regions for new tile data
      try {
        if (liquidSystemRef.current) {
          liquidSystemRef.current.destroy();
        }
        if (liquidLayerRef.current) {
          liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { mapWidth, mapHeight, tileSize });
          liquidSystemRef.current.build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
        }
      } catch (e) { console.warn('LiquidRegionSystem rebuild failed (map data change):', e); }
      // Rebuild ember surfaces on map change
      try { lavaEmbersRef.current?.rebuildSurfaces({ mapWidth, mapHeight, tileSize, tileMapData, registryItems }); } catch {}

      // Objects
      objBehindRef.current.removeChildren();
      objFrontRef.current.removeChildren();
      for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = objectMapData[i];
        if (!id || id.includes('player')) continue;
        const def = registryItems.find((r) => r.id === id);
        if (!def) continue;

        let sprite;
        let frames = null;
        if (Array.isArray(def.textures) && def.textures.length > 1) {
          frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
        }
        if (frames && frames.length > 0) {
          sprite = new AnimatedSprite(frames);
          sprite.animationSpeed = msToSpeed(def.animationSpeed);
          sprite.play();
        } else {
          const tex = getTexture(def.texture) || null;
          if (!tex) continue;
          sprite = new Sprite(tex);
        }
        const x = (i % mapWidth) * tileSize;
        const y = Math.floor(i / mapWidth) * tileSize;
        sprite.x = x;
        sprite.y = y;
        sprite.width = tileSize;
        sprite.height = tileSize;
        const renderAbove = !!def.renderAbovePlayer;
        if (renderAbove) {
          objFrontRef.current.addChild(sprite);
        } else {
          objBehindRef.current.addChild(sprite);
        }
      }
    }
  }, [tileMapData, objectMapData, registryItems, mapWidth, mapHeight, tileSize]);

  // Weather systems lifecycle and intensity updates
  useEffect(() => {
    const app = appRef.current;
    const weatherLayer = weatherLayerRef.current;
    const fogLayer = fogLayerRef.current;
    if (!app || !weatherLayer || !fogLayer) return;

    const api = {
      isSolidAt,
      mapWidth,
      mapHeight,
      tileSize,
      // Liquids surface queries for weather interactions
      getLiquidSurfaceY: (type, x) => {
        try { return liquidSystemRef.current?.getSurfaceY?.(type, x); } catch { return null; }
      },
      // FX hooks for water/lava impacts from weather
      onWaterImpact: ({ x, strength = 0.8 }) => {
        try {
          const sy = liquidSystemRef.current?.getSurfaceY?.('water', x);
          if (Number.isFinite(sy)) waterFxRef.current?.trigger({ x, y: sy, strength: Math.max(0.2, Math.min(2, strength)), upward: false });
          // Also deform water surface with ripples
          try { liquidSystemRef.current?.addWave?.('water', x, Math.max(0.2, Math.min(2.2, strength))); } catch {}
        } catch {}
      },
      onLavaImpact: ({ x, y, strength = 0.6 }) => {
        try {
          const sy = liquidSystemRef.current?.getSurfaceY?.('lava', x);
          const yy = Number.isFinite(y) ? y : (Number.isFinite(sy) ? sy : null);
          if (yy != null) lavaSteamRef.current?.trigger({ x, y: yy, strength });
        } catch {}
      }
    };
    const getRainIntensity = () => Math.max(0, Math.min(100, Number(weatherRain) || 0));
    const getSnowIntensity = () => Math.max(0, Math.min(100, Number(weatherSnow) || 0));
    const getCloudsIntensity = () => Math.max(0, Math.min(100, Number(weatherClouds) || 0));
    const getThunderIntensity = () => Math.max(0, Math.min(100, Number(weatherThunder) || 0));

    // Always reset systems to apply possible dimension changes cleanly
    try { weatherSystemsRef.current.rain?.destroy(); } catch {}
    try { weatherSystemsRef.current.snow?.destroy(); } catch {}
    try { weatherSystemsRef.current.clouds?.destroy(); } catch {}
    try { weatherSystemsRef.current.fog?.destroy(); } catch {}
    try { weatherSystemsRef.current.thunder?.destroy(); } catch {}
    weatherSystemsRef.current.rain = null;
    weatherSystemsRef.current.snow = null;
    weatherSystemsRef.current.clouds = null;
    weatherSystemsRef.current.fog = null;
    weatherSystemsRef.current.thunder = null;

    // Rain
    if (getRainIntensity() > 0) {
      if (!weatherSystemsRef.current.rain) {
        weatherSystemsRef.current.rain = new WeatherRain(weatherLayer, api, getRainIntensity);
      }
      weatherSystemsRef.current.rain.setIntensity(getRainIntensity());
    } else {
      weatherSystemsRef.current.rain?.destroy();
      weatherSystemsRef.current.rain = null;
    }

    // Snow
    if (getSnowIntensity() > 0) {
      if (!weatherSystemsRef.current.snow) {
        weatherSystemsRef.current.snow = new WeatherSnow(weatherLayer, api, getSnowIntensity);
      }
      weatherSystemsRef.current.snow.setIntensity(getSnowIntensity());
    } else {
      weatherSystemsRef.current.snow?.destroy();
      weatherSystemsRef.current.snow = null;
    }

    // Clouds
    if (getCloudsIntensity() > 0) {
      if (!weatherSystemsRef.current.clouds) {
        weatherSystemsRef.current.clouds = new WeatherClouds(fogLayer, api, getCloudsIntensity);
      }
      weatherSystemsRef.current.clouds.setIntensity(getCloudsIntensity());
    } else {
      weatherSystemsRef.current.clouds?.destroy();
      weatherSystemsRef.current.clouds = null;
    }

    // Full-screen Fog overlay (affects entire screen)
    const getFogIntensity = () => Math.max(0, Math.min(100, Number(weatherFog) || 0));
    if (getFogIntensity() > 0) {
      if (!weatherSystemsRef.current.fog) {
        weatherSystemsRef.current.fog = new WeatherFog(fogLayer, api, getFogIntensity);
      }
      weatherSystemsRef.current.fog.setIntensity(getFogIntensity());
      // ensure fog overlay covers full current canvas size
      try { weatherSystemsRef.current.fog.resize(mapWidth * tileSize, mapHeight * tileSize); } catch {}
    } else {
      weatherSystemsRef.current.fog?.setIntensity(0);
    }

    // Thunder/Lightning (in weather layer, below fog)
    if (getThunderIntensity() > 0) {
      if (!weatherSystemsRef.current.thunder) {
        weatherSystemsRef.current.thunder = new WeatherThunder(weatherLayer, api, getThunderIntensity);
      }
      weatherSystemsRef.current.thunder.setIntensity(getThunderIntensity());
      try { weatherSystemsRef.current.thunder.resize(mapWidth * tileSize, mapHeight * tileSize); } catch {}
    } else {
      // We keep instance if present but set intensity to 0 or destroy? To free resources, destroy.
      try { weatherSystemsRef.current.thunder?.destroy(); } catch {}
      weatherSystemsRef.current.thunder = null;
    }

  }, [weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder, mapWidth, mapHeight, tileSize, tileMapData]);

  // Rebuild parallax when props change
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    rebuildParallax();
  }, [backgroundImage, backgroundColor, backgroundParallaxFactor, mapWidth, mapHeight, tileSize]);

  // Resize application when map size changes
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    app.renderer.resize(mapWidth * tileSize, mapHeight * tileSize);
    // Resize parallax background
    if (parallaxHelperRef.current) {
      parallaxHelperRef.current.resize(mapWidth * tileSize, mapHeight * tileSize);
    }
    // Resize fog overlay to match new world size
    try { weatherSystemsRef.current.fog?.resize(mapWidth * tileSize, mapHeight * tileSize); } catch {}
    try { weatherSystemsRef.current.thunder?.resize(mapWidth * tileSize, mapHeight * tileSize); } catch {}
    // FX resize (no-op for current implementations)
    try { waterFxRef.current?.resize(mapWidth * tileSize, mapHeight * tileSize); } catch {}
    try { lavaEmbersRef.current?.resize(mapWidth * tileSize, mapHeight * tileSize); } catch {}
    // Resize underwater overlay
    try {
      const g = underwaterRef.current?.g;
      if (g) {
        g.clear();
        g.beginFill(0x1d4875, 1);
        g.drawRect(0, 0, mapWidth * tileSize, mapHeight * tileSize);
        g.endFill();
        g.alpha = 0;
        g.visible = false;
      }
    } catch {}
  }, [mapWidth, mapHeight, tileSize]);

  return (
    <div
      ref={mountRef}
      style={{ width: mapWidth * tileSize, height: mapHeight * tileSize }}
    />
  );
};

export default PixiStage;

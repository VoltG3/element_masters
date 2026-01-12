import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Application, Container, Graphics, Assets } from 'pixi.js';
import { TextureCache } from '../../../../Pixi/TextureCache';
import { Rain as WeatherRain, Snow as WeatherSnow, Clouds as WeatherClouds, Fog as WeatherFog, Thunder as WeatherThunder } from '../../../../Pixi/effects/weather';
import { WaterSplashFX, LavaEmbers, LavaSteamFX, LiquidRegionSystem } from '../../../../Pixi/effects/liquids';
import HealthBar from '../../../../Pixi/ui/HealthBar';
import LAYERS from '../../../../renderer/stage/layers/LayerOrder';
import { clearTextureCache, createBackgroundResolver, createSolidChecker } from './helpers';
import { createWaterFrames, createLavaFrames } from './liquidRendering';
import { createParallaxManager } from './parallaxManager';
import { createPlayerContainer, updatePlayerSprite } from './playerManager';
import { syncProjectiles, cleanupProjectiles } from './projectileManager';
import { syncEntities, cleanupEntities } from './entityManager';
import { rebuildLayers } from './layerBuilder';

// Suppress noisy Pixi Assets warnings for inlined data URLs (we load textures directly)
Assets.setPreferences?.({
  skipCacheIdWarning: true,
  preferCreateImageBitmap: false, // Prevents WebGL warning: texImage: Alpha-premult and y-flip are deprecated
});

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const PixiStage = ({
  mapWidth,
  mapHeight,
  tileSize = 32,
  tileMapData = EMPTY_ARRAY,
  objectMapData = EMPTY_ARRAY,
  secretMapData = EMPTY_ARRAY,
  revealedSecrets = EMPTY_ARRAY,
  registryItems = EMPTY_ARRAY,
  playerState,
  playerVisuals,
  backgroundImage,
  backgroundColor,
  backgroundParallaxFactor = 0.3,
  cameraScrollX = 0,
  weatherRain = 0,
  weatherSnow = 0,
  weatherClouds = 0,
  projectiles = EMPTY_ARRAY,
  healthBarEnabled = true,
  objectMetadata = EMPTY_OBJECT,
  weatherFog = 0,
  weatherThunder = 0,
  oxygenBarEnabled = true,
  lavaBarEnabled = true,
  waterSplashesEnabled = true,
  lavaEmbersEnabled = true,
  isEditor = false,
}) => {
  const [isPixiReady, setIsPixiReady] = useState(false);

  const mountRef = useRef(null);
  const appRef = useRef(null);
  const parallaxRef = useRef(null);
  const parallaxManagerRef = useRef(null);
  const cameraScrollRef = useRef(0);
  const parallaxFactorRef = useRef(Number(backgroundParallaxFactor) || 0.3);
  const cameraPosRef = useRef({ x: 0, y: 0 });
  const bgRef = useRef(null);
  const bgAnimRef = useRef(null);
  const bgImageRef = useRef(backgroundImage);
  const bgColorRef = useRef(backgroundColor);
  const objBehindRef = useRef(null);
  const objFrontRef = useRef(null);
  const secretLayerRef = useRef(null);
  const playerRef = useRef(null);
  const playerLayerRef = useRef(null);
  const playerSpriteRefs = useRef({ def: null, hit: null });
  const playerHealthBarRef = useRef(null);
  const playerStateRef = useRef(null);
  const weatherLayerRef = useRef(null);
  const liquidLayerRef = useRef(null);
  const liquidSystemRef = useRef(null);
  const fogLayerRef = useRef(null);
  const weatherSystemsRef = useRef({ rain: null, snow: null, clouds: null, thunder: null });
  const projectilesLayerRef = useRef(null);
  const projectileSpritesRef = useRef(new Map());
  const entitiesLayerRef = useRef(null);
  const entitySpritesRef = useRef(new Map());
  const projectilesPropRef = useRef(EMPTY_ARRAY);
  const pixiTextureCacheRef = useRef(null);
  const hbEnabledRef = useRef(healthBarEnabled !== false);
  const oxyEnabledRef = useRef(oxygenBarEnabled !== false);
  const lavaEnabledRef = useRef(lavaBarEnabled !== false);
  const overlayLayerRef = useRef(null);
  const underwaterRef = useRef({ g: null, time: 0, targetAlpha: 0, currentAlpha: 0 });
  const waterFramesRef = useRef(null);
  const lavaFramesRef = useRef(null);
  const overlayHBRef = useRef(null);
  const oxygenBarRef = useRef(null);
  const lavaBarRef = useRef(null);
  const waterFxRef = useRef(null);
  const lavaEmbersRef = useRef(null);
  const lavaSteamRef = useRef(null);
  const splashesEnabledRef = useRef(waterSplashesEnabled !== false);
  const embersEnabledRef = useRef(lavaEmbersEnabled !== false);
  const waterStateRef = useRef({ inWater: false, headUnder: false, vy: 0 });

  // Keep latest state in refs for ticker
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
  useEffect(() => { projectilesPropRef.current = Array.isArray(projectiles) ? projectiles : []; }, [projectiles]);
  useEffect(() => { hbEnabledRef.current = healthBarEnabled !== false; }, [healthBarEnabled]);
  useEffect(() => { oxyEnabledRef.current = oxygenBarEnabled !== false; }, [oxygenBarEnabled]);
  useEffect(() => { lavaEnabledRef.current = lavaBarEnabled !== false; }, [lavaBarEnabled]);
  useEffect(() => { splashesEnabledRef.current = waterSplashesEnabled !== false; }, [waterSplashesEnabled]);
  useEffect(() => { embersEnabledRef.current = lavaEmbersEnabled !== false; }, [lavaEmbersEnabled]);
  useEffect(() => { cameraScrollRef.current = Number(cameraScrollX) || 0; }, [cameraScrollX]);
  useEffect(() => { parallaxFactorRef.current = Number(backgroundParallaxFactor) || 0.3; }, [backgroundParallaxFactor]);
  useEffect(() => { bgImageRef.current = backgroundImage; }, [backgroundImage]);
  useEffect(() => { bgColorRef.current = backgroundColor; }, [backgroundColor]);

  // Background resolver and solid checker (memoized per map)
  const resolveBackgroundUrl = useMemo(() => createBackgroundResolver(), []);
  const isSolidAt = useMemo(() => createSolidChecker(mapWidth, mapHeight, tileSize, tileMapData, registryItems), [mapWidth, mapHeight, tileSize, tileMapData, registryItems]);

  // Rebuild parallax helper
  const rebuildParallax = useCallback(() => {
    const layer = parallaxRef.current;
    if (!layer) return;
    if (!pixiTextureCacheRef.current) pixiTextureCacheRef.current = new TextureCache();
    if (!parallaxManagerRef.current) {
      parallaxManagerRef.current = createParallaxManager(layer, pixiTextureCacheRef.current);
    }
    
    const bgUrl = bgImageRef.current;
    const bgColor = bgColorRef.current;
    const factor = parallaxFactorRef.current || 0.3;

    parallaxManagerRef.current.build({
      worldWidth: mapWidth * tileSize,
      worldHeight: mapHeight * tileSize,
      url: bgUrl,
      color: bgColor,
      factor,
      resolveBackgroundUrl,
      minWidth: appRef.current?.screen?.width || 0,
      minHeight: appRef.current?.screen?.height || 0
    });
  }, [mapWidth, mapHeight, tileSize, resolveBackgroundUrl]);

  // Initialize Application
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      if (appRef.current) return;

      const app = new Application();
      try {
        await app.init({
          resizeTo: mountRef.current,
          backgroundAlpha: 0,
          antialias: false,
          autoDensity: true,
        });

        if (destroyed) {
          app.destroy(true, { children: true, texture: true });
          return;
        }

        if (!app.renderer) return;

        appRef.current = app;
        app.stage.sortableChildren = true;

        // Create layers
      const bg = new Container();
      const bgAnim = new Container();
      const objBehind = new Container();
      const objFront = new Container();
      const secretBelowLayer = new Container();
      const secretAboveLayer = new Container();
      const playerLayer = new Container();
      const entitiesLayer = new Container();
      const weatherLayer = new Container();
      const liquidLayer = new Container();
      const liquidFxLayer = new Container();
      const fogLayer = new Container();
      const projLayer = new Container();
      const overlayLayer = new Container();

      // Assign zIndex
      const parallaxLayer = new Container();
      parallaxLayer.zIndex = LAYERS.parallax;
      bg.zIndex = LAYERS.tiles;
      bgAnim.zIndex = LAYERS.tilesAnim;
      objBehind.zIndex = LAYERS.objBehind;
      objFront.zIndex = LAYERS.objFront;
      secretBelowLayer.zIndex = LAYERS.secretsBelow;
      secretAboveLayer.zIndex = LAYERS.secretsAbove;
      playerLayer.zIndex = LAYERS.player;
      entitiesLayer.zIndex = LAYERS.player;
      weatherLayer.zIndex = LAYERS.weather;
      fogLayer.zIndex = LAYERS.fog;
      liquidLayer.zIndex = LAYERS.liquids;
      liquidFxLayer.zIndex = LAYERS.liquidFx;
      projLayer.zIndex = LAYERS.projectiles;
      overlayLayer.zIndex = LAYERS.overlay;

      bgRef.current = bg;
      bgAnimRef.current = bgAnim;
      objBehindRef.current = objBehind;
      objFrontRef.current = objFront;
      secretLayerRef.current = { below: secretBelowLayer, above: secretAboveLayer };
      weatherLayerRef.current = weatherLayer;
      playerLayerRef.current = playerLayer;
      liquidLayerRef.current = liquidLayer;
      fogLayerRef.current = fogLayer;
      projectilesLayerRef.current = projLayer;
      entitiesLayerRef.current = entitiesLayer;
      overlayLayerRef.current = overlayLayer;
      parallaxRef.current = parallaxLayer;

      // Add all layers to stage
      app.stage.addChild(bg, bgAnim, parallaxLayer, objBehind, secretBelowLayer, playerLayer, entitiesLayer, projLayer, objFront, secretAboveLayer, weatherLayer, fogLayer, liquidLayer, liquidFxLayer, overlayLayer);

      // Preload textures to avoid Assets cache warnings and ensure textures are ready
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
        const bgUrl = resolveBackgroundUrl(bgImageRef.current);
        if (bgUrl) addUrl(bgUrl);
        const urls = Array.from(urlSet);
        if (urls.length) {
          console.log('[PixiStage] Preloading', urls.length, 'textures...');
          await Assets.load(urls);
          console.log('[PixiStage] Textures preloaded successfully');
        }
      } catch (e) {
        console.warn('Pixi Assets preload encountered an issue (continuing):', e);
      }

      // Create player
      const playerComponents = createPlayerContainer(playerVisuals, registryItems, playerState, tileSize);
      playerLayer.addChild(playerComponents.container);
      playerRef.current = playerComponents.container;
      playerSpriteRefs.current = playerComponents.sprites;
      playerHealthBarRef.current = playerComponents.healthBar;

      // Mount canvas - DROŠA PIEVIENOŠANA
      if (mountRef.current && app.renderer && app.canvas) {
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(app.canvas);
      }

      // Build underwater overlay
      const g = new Graphics();
      overlayLayer.addChild(g);
      underwaterRef.current.g = g;
      const W = mapWidth * tileSize;
      const H = mapHeight * tileSize;
      g.clear();
      g.rect(0, 0, W, H);
      g.fill({ color: 0x1d4875, alpha: 1 });
      g.alpha = 0;
      g.visible = false;

      // Build overlay bars
      const hbOverlay = new HealthBar({ width: (playerState?.width) || tileSize, height: 4, offsetX: 0, offsetY: 0 });
      hbOverlay.visible = false;
      overlayLayer.addChild(hbOverlay);
      overlayHBRef.current = hbOverlay;

      const oxyColors = { ok: 0x2ecdf1, warn: 0x3498db, danger: 0x1f6fb2 };
      const oxyBar = new HealthBar({ width: (playerState?.width) || tileSize, height: 4, offsetX: 0, offsetY: 0, colors: oxyColors });
      oxyBar.visible = false;
      overlayLayer.addChild(oxyBar);
      oxygenBarRef.current = oxyBar;

      const lavaColors = { ok: 0xffa229, warn: 0xff7b00, danger: 0xff3b1a };
      const lvBar = new HealthBar({ width: (playerState?.width) || tileSize, height: 4, offsetX: 0, offsetY: 0, colors: lavaColors });
      lvBar.visible = false;
      overlayLayer.addChild(lvBar);
      lavaBarRef.current = lvBar;

      // WebGL context loss/restore handlers
      if (app.canvas && app.renderer) {
        app.canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('WebGL context lost');
        });
        app.canvas.addEventListener('webglcontextrestored', () => {
          console.info('WebGL context restored');
          // No need to manually rebuild here as the main useEffect will catch app state or we can just trigger a state change if needed.
          // But Pixi v8 often recovers automatically. To be safe, we can force a rebuild by just waiting for next tick.
        });
      }

      // Initialize liquid system
      try {
        if (liquidSystemRef.current) liquidSystemRef.current.destroy();
        if (liquidLayerRef.current) {
          liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { mapWidth, mapHeight, tileSize });
        }
      } catch (e) { console.warn('LiquidRegionSystem init failed:', e); }

      // FX systems
      try { waterFxRef.current = new WaterSplashFX(liquidFxLayer); } catch {}
      try { lavaSteamRef.current = new LavaSteamFX(liquidFxLayer); } catch {}
      try {
        lavaEmbersRef.current = new LavaEmbers(liquidLayerRef.current, { mapWidth, mapHeight, tileSize }, () => (embersEnabledRef.current ? 100 : 0));
      } catch {}

      rebuildParallax();

      // Finalize initialization by setting appRef
      // This will trigger the second useEffect to build layers and player
      appRef.current = app;
      setIsPixiReady(true);
      app.ticker.add(() => {
        const s = playerStateRef.current;
        if (s && playerRef.current) {
          updatePlayerSprite(
            { container: playerRef.current, sprites: playerSpriteRefs.current, healthBar: playerHealthBarRef.current },
            s,
            tileSize,
            hbEnabledRef.current
          );
        }

        // Camera Follow
        const sw = app.screen.width;
        const sh = app.screen.height;
        const worldW = mapWidth * tileSize;
        const worldH = mapHeight * tileSize;

        if (s) {
          const targetX = (s.x || 0) + (s.width || tileSize) / 2;
          const targetY = (s.y || 0) + (s.height || tileSize) / 2;

          let camX = targetX - sw / 2;
          let camY = targetY - sh / 2;

          // Constraints with centering for small maps
          if (worldW < sw) {
            camX = (worldW - sw) / 2;
          } else {
            camX = Math.max(0, Math.min(camX, worldW - sw));
          }

          if (worldH < sh) {
            camY = (worldH - sh) / 2;
          } else {
            camY = Math.max(0, Math.min(camY, worldH - sh));
          }

          cameraPosRef.current = { x: camX, y: camY };
          app.stage.pivot.set(camX, camY);

          if (parallaxRef.current) {
            parallaxRef.current.position.set(camX, camY);
          }

          const f = parallaxFactorRef.current;
          if (parallaxManagerRef.current) {
            parallaxManagerRef.current.resize(worldW, worldH, sw, sh);
            parallaxManagerRef.current.setScroll(camX, f);
          }
        }

        // Weather
        const dt = app.ticker?.deltaMS || 16.67;
        const systems = weatherSystemsRef.current;
        if (systems.rain) systems.rain.update(dt);
        if (systems.snow) systems.snow.update(dt);
        if (systems.clouds) systems.clouds.update(dt);
        if (systems.fog) systems.fog.update(dt);
        if (systems.thunder) systems.thunder.update(dt);

        // Liquids
        try {
          if (liquidSystemRef.current && s) {
            liquidSystemRef.current.setPlayerState(s);
          }
          liquidSystemRef.current?.update(dt);
        } catch {}

        // FX
        try { lavaEmbersRef.current?.update(dt); } catch {}
        try { waterFxRef.current?.update(dt); } catch {}
        try { lavaSteamRef.current?.update(dt); } catch {}

        // Underwater/lava overlay with smooth fade-in/out
        try {
          const u = underwaterRef.current;
          const sNow = playerStateRef.current || {};

          // Safety check: ensure graphics object exists and is attached
          if (u && (!u.g || u.g.destroyed)) {
            const overlayL = overlayLayerRef.current;
            if (overlayL) {
              const g = new Graphics();
              overlayL.addChild(g);
              u.g = g;
              u.currentAlpha = 0;
              u.targetAlpha = 0;
              u.time = 0;
            }
          }

          if (u && u.g) {
            // Check if player is in water/lava (regardless of head position)
            const liquidType = sNow.liquidType;
            const inLiquid = !!(sNow && sNow.inWater && (liquidType === 'water' || liquidType === 'lava'));

            // Determine overlay color based on liquid type
            let overlayColor = 0x1d4875; // water (blue)
            if (liquidType === 'lava') {
              overlayColor = 0x8b2e0f; // lava (dark orange-red)
            }

            if (inLiquid) {
              u.time += dt;
              // Target alpha with pulse effect
              const pulseBase = 0.12 + 0.06 * Math.sin(u.time * 0.0025);
              u.targetAlpha = pulseBase;

              // Smooth fade-in: gradually approach target alpha
              const fadeSpeed = 0.01; // Faster fade-in for immediate visibility
              const alphaDiff = u.targetAlpha - u.currentAlpha;
              u.currentAlpha += alphaDiff * Math.min(1, dt * fadeSpeed);

              // Update color if liquid type changed (only when needed to avoid constant redraw)
              if (!u.g.visible || u.lastLiquidType !== liquidType) {
                u.g.clear();
                u.g.rect(0, 0, mapWidth * tileSize, mapHeight * tileSize);
                u.g.fill({ color: overlayColor, alpha: 1 });
                u.lastLiquidType = liquidType;
              }

              u.g.visible = true;
              u.g.alpha = u.currentAlpha;
            } else {
              // Smooth fade-out
              u.targetAlpha = 0;
              const fadeOutSpeed = 0.008; // Faster fade-out
              const alphaDiff = u.targetAlpha - u.currentAlpha;
              u.currentAlpha += alphaDiff * Math.min(1, dt * fadeOutSpeed);
              u.g.alpha = u.currentAlpha;

              if (u.currentAlpha < 0.01) {
                u.currentAlpha = 0;
                u.g.alpha = 0;
                u.g.visible = false;
                u.time = 0; // Reset time for next submersion
              }
            }
          }

          // Water splash detection
          try {
            const prev = waterStateRef.current || { inWater: false, headUnder: false, vy: 0 };
            const nowInWater = !!sNow.inWater;
            const nowLiquid = sNow.liquidType;
            const centerX = (sNow.x || 0) + (sNow.width || tileSize) * 0.5;

            if (splashesEnabledRef.current && nowLiquid === 'water' && nowInWater && !prev.inWater) {
              const sy = liquidSystemRef.current?.getSurfaceY?.('water', centerX);
              const vy = Number(sNow.vy) || 0;
              const strength = Math.min(3, Math.max(0.2, Math.abs(vy) * 0.12));
              waterFxRef.current?.trigger({ x: centerX, y: (Number.isFinite(sy) ? sy : (sNow.y || 0)), strength, upward: false });
              try { liquidSystemRef.current?.addWave?.('water', centerX, Math.min(2.5, 0.6 + Math.abs(vy) * 0.08)); } catch {}
            }
            if (splashesEnabledRef.current && prev.inWater && !nowInWater) {
              const sy = liquidSystemRef.current?.getSurfaceY?.('water', centerX);
              const vy = Number(sNow.vy) || 0;
              const strength = Math.min(3, Math.max(0.2, Math.abs(vy) * 0.08));
              waterFxRef.current?.trigger({ x: centerX, y: (Number.isFinite(sy) ? sy : (sNow.y || 0)), strength, upward: true });
              try { liquidSystemRef.current?.addWave?.('water', centerX, Math.min(2.0, 0.4 + Math.abs(vy) * 0.05)); } catch {}
            }
            waterStateRef.current = { inWater: nowInWater, headUnder: !!sNow.headUnderWater, vy: Number(sNow.vy) || 0 };
          } catch {}
        } catch {}

        // Overlay bars
        try {
          const s2 = playerStateRef.current || {};
          const effW = (s2.width || tileSize);
          const effH = (s2.height || tileSize);
          const baseYOffset = Math.max(4, Math.floor(effH * 0.12));
          const baseX = (s2.x || 0);
          const baseY = (s2.y || 0) - baseYOffset;

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

          let nextBarY = baseY;
          if (hbO && hbO.visible) nextBarY += 6;

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

        // Projectiles
        syncProjectiles(projectilesLayerRef.current, projectileSpritesRef.current, projectilesPropRef.current, registryItems, tileSize);

        // Entities
        const sNow = playerStateRef.current || {};
        syncEntities(entitiesLayerRef.current, entitySpritesRef.current, sNow.entities, registryItems, tileSize);
      });
    } catch (error) {
      console.error('PixiStage init failed:', error);
    }
  };

  init();

  return () => {
    destroyed = true;
    if (appRef.current) {
      const appToDestroy = appRef.current;
      appRef.current = null;
      appToDestroy.destroy(true, { children: true, texture: true });
    }
    try { liquidSystemRef.current?.destroy(); } catch {}
    try { waterFxRef.current?.destroy(); } catch {}
    try { lavaEmbersRef.current?.destroy(); } catch {}
    try { lavaSteamRef.current?.destroy(); } catch {}
    try { parallaxManagerRef.current?.destroy(); } catch {}
    parallaxManagerRef.current = null;
    try { pixiTextureCacheRef.current?.clear?.(); } catch {}
    try {
      weatherSystemsRef.current.rain?.destroy();
      weatherSystemsRef.current.snow?.destroy();
      weatherSystemsRef.current.fog?.destroy();
    } catch {}
    cleanupProjectiles(projectileSpritesRef.current);
    cleanupEntities(entitySpritesRef.current);
    clearTextureCache();
  };
  }, []);

  // Rebuild layers when map data changes
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    let active = true;

    const runRebuild = async () => {
        // Collect all textures to preload
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

        const urls = Array.from(urlSet);
        if (urls.length) {
            await Assets.load(urls);
        }

        if (!active || !appRef.current) return;

        if (bgRef.current && objBehindRef.current && objFrontRef.current) {
            rebuildLayers(
                { bgRef: bgRef.current, objBehindRef: objBehindRef.current, objFrontRef: objFrontRef.current, secretLayerRef: secretLayerRef.current },
                { mapWidth, mapHeight, tileSize, tileMapData, objectMapData, secretMapData, revealedSecrets, registryItems, objectMetadata, isEditor }
            );

            // Rebuild player visuals if visuals changed or player not created yet
            const pLayer = playerLayerRef.current;
            if (pLayer) {
                if (playerRef.current) {
                    pLayer.removeChild(playerRef.current);
                    try { playerRef.current.destroy({ children: true }); } catch {}
                }
                
                const playerComponents = createPlayerContainer(playerVisuals, registryItems, playerStateRef.current, tileSize);
                pLayer.addChild(playerComponents.container);
                playerRef.current = playerComponents.container;
                playerSpriteRefs.current = playerComponents.sprites;
                playerHealthBarRef.current = playerComponents.healthBar;
            }

            // Rebuild liquid regions only if tileMapData changed (not just revealedSecrets)
            // This prevents liquid "jumping" when revealing secrets
            const tileDataString = JSON.stringify(tileMapData);
            const prevTileDataString = liquidSystemRef.current?._lastTileData;
            if (tileDataString !== prevTileDataString) {
                try {
                    if (liquidSystemRef.current) liquidSystemRef.current.destroy();
                    if (liquidLayerRef.current) {
                        liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { mapWidth, mapHeight, tileSize });
                        liquidSystemRef.current.build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems });
                        liquidSystemRef.current._lastTileData = tileDataString; // Track what we built
                    }
                } catch (e) { console.warn('LiquidRegionSystem rebuild failed:', e); }
                try { lavaEmbersRef.current?.rebuildSurfaces({ mapWidth, mapHeight, tileSize, tileMapData, registryItems }); } catch {}
            }

            // Upload to GPU to avoid lazy initialization warnings
            if (app.renderer && app.renderer.prepare) {
                try {
                    await app.renderer.prepare.upload(app.stage);
                } catch (e) {
                    // Prepare might fail in some edge cases or context loss
                }
            }
        }
    };

    runRebuild();

    return () => { active = false; };
  }, [tileMapData, objectMapData, registryItems, mapWidth, mapHeight, tileSize, secretMapData, revealedSecrets, objectMetadata, playerVisuals, isPixiReady]);

  // Weather systems lifecycle
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
      getLiquidSurfaceY: (type, x) => {
        try { return liquidSystemRef.current?.getSurfaceY?.(type, x); } catch { return null; }
      },
      onWaterImpact: ({ x, strength = 0.8 }) => {
        try {
          const sy = liquidSystemRef.current?.getSurfaceY?.('water', x);
          if (Number.isFinite(sy)) waterFxRef.current?.trigger({ x, y: sy, strength: Math.max(0.2, Math.min(2, strength)), upward: false });
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

    // Reset systems
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
      weatherSystemsRef.current.rain = new WeatherRain(weatherLayer, api, getRainIntensity);
      weatherSystemsRef.current.rain.setIntensity(getRainIntensity());
    }

    // Snow
    if (getSnowIntensity() > 0) {
      weatherSystemsRef.current.snow = new WeatherSnow(weatherLayer, api, getSnowIntensity);
      weatherSystemsRef.current.snow.setIntensity(getSnowIntensity());
    }

    // Clouds
    if (getCloudsIntensity() > 0) {
      weatherSystemsRef.current.clouds = new WeatherClouds(fogLayer, api, getCloudsIntensity);
      weatherSystemsRef.current.clouds.setIntensity(getCloudsIntensity());
    }

    // Fog
    if (Number(weatherFog) > 0) {
      weatherSystemsRef.current.fog = new WeatherFog(fogLayer, api, () => Number(weatherFog) || 0);
      weatherSystemsRef.current.fog.setIntensity(Number(weatherFog) || 0);
    }

    // Thunder
    if (getThunderIntensity() > 0) {
      weatherSystemsRef.current.thunder = new WeatherThunder(fogLayer, api, getThunderIntensity);
      weatherSystemsRef.current.thunder.setIntensity(getThunderIntensity());
    }
  }, [weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder, mapWidth, mapHeight, tileSize, isSolidAt]);

  // Rebuild parallax when props change
  useEffect(() => {
    rebuildParallax();
  }, [backgroundImage, backgroundColor, rebuildParallax]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

PixiStage.propTypes = {
  mapWidth: PropTypes.number.isRequired,
  mapHeight: PropTypes.number.isRequired,
  tileSize: PropTypes.number,
  tileMapData: PropTypes.array,
  objectMapData: PropTypes.array,
  secretMapData: PropTypes.array,
  revealedSecrets: PropTypes.array,
  registryItems: PropTypes.array,
  playerState: PropTypes.object,
  playerVisuals: PropTypes.object,
  backgroundImage: PropTypes.string,
  backgroundColor: PropTypes.string,
  backgroundParallaxFactor: PropTypes.number,
  cameraScrollX: PropTypes.number,
  weatherRain: PropTypes.number,
  weatherSnow: PropTypes.number,
  weatherClouds: PropTypes.number,
  projectiles: PropTypes.array,
  healthBarEnabled: PropTypes.bool,
  objectMetadata: PropTypes.object,
  weatherFog: PropTypes.number,
  weatherThunder: PropTypes.number,
  oxygenBarEnabled: PropTypes.bool,
  lavaBarEnabled: PropTypes.bool,
  waterSplashesEnabled: PropTypes.bool,
  lavaEmbersEnabled: PropTypes.bool,
};

export default PixiStage;

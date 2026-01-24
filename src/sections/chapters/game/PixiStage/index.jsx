import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Application, Container, Graphics, Assets, BlurFilter, ColorMatrixFilter, Texture, Sprite } from 'pixi.js';
import { TextureCache } from '../../../../Pixi/TextureCache';
import { Rain as WeatherRain, Snow as WeatherSnow, Clouds as WeatherClouds, Fog as WeatherFog, Thunder as WeatherThunder, LavaRain as WeatherLavaRain, RadioactiveFog as WeatherRadioactiveFog, MeteorRain as WeatherMeteorRain } from '../../../../Pixi/effects/weather';
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
import { createFloatingTextLayer, createFloatingTextManager } from './floatingTextManager';

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
  weatherLavaRain = 0,
  weatherRadioactiveFog = 0,
  weatherMeteorRain = 0,
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
  isEditorPlayMode = false,
  mapType = 'overworld',
  activeRoomIds = EMPTY_ARRAY,
  maps = EMPTY_OBJECT,
  showGrid = false,
  renderLayers = null, // null means all layers, otherwise an array of layer names to show
  pointerEvents = 'auto',
  onWeatherEffectHit = null,
  roomBlurEnabled = true,
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
  const roomBgRef = useRef(null);
  const roomObjBehindRef = useRef(null);
  const roomObjFrontRef = useRef(null);
  const secretLayerRef = useRef(null);
  const playerRef = useRef(null);
  const playerLayerRef = useRef(null);
  const playerSpriteRefs = useRef({ def: null, hit: null });
  const playerHealthBarRef = useRef(null);
  const playerStateRef = useRef(null);
  const weatherLayerRef = useRef(null);
  const liquidLayerRef = useRef(null);
  const liquidBgLayerRef = useRef(null);
  const liquidSystemRef = useRef(null);
  const fogLayerRef = useRef(null);
  const weatherSystemsRef = useRef({ rain: null, snow: null, clouds: null, thunder: null, fog: null, lavaRain: null, radioactiveFog: null, meteorRain: null });
  const weatherPropsRef = useRef({ rain: 0, snow: 0, clouds: 0, fog: 0, thunder: 0, lavaRain: 0, radioactiveFog: 0, meteorRain: 0 });
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
  const gridRef = useRef(null);
  const showGridRef = useRef(showGrid);
  const roomBlurEnabledRef = useRef(roomBlurEnabled);
  const blurFilterRef = useRef(new BlurFilter({ strength: 0 }));
  const darkenFilterRef = useRef(new ColorMatrixFilter());
  const roomBrightnessFilterRef = useRef(new ColorMatrixFilter());
  const vignetteRef = useRef(null);
  const floatingLayerRef = useRef(null);
  const floatingManagerRef = useRef(null);

  // Keep latest state in refs for ticker
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
  useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);
  useEffect(() => { projectilesPropRef.current = Array.isArray(projectiles) ? projectiles : []; }, [projectiles]);
  useEffect(() => { hbEnabledRef.current = healthBarEnabled !== false; }, [healthBarEnabled]);
  useEffect(() => { oxyEnabledRef.current = oxygenBarEnabled !== false; }, [oxygenBarEnabled]);
  useEffect(() => { lavaEnabledRef.current = lavaBarEnabled !== false; }, [lavaBarEnabled]);
  useEffect(() => { splashesEnabledRef.current = waterSplashesEnabled !== false; }, [waterSplashesEnabled]);
  useEffect(() => { embersEnabledRef.current = lavaEmbersEnabled !== false; }, [lavaEmbersEnabled]);
  useEffect(() => { roomBlurEnabledRef.current = roomBlurEnabled; }, [roomBlurEnabled]);
  useEffect(() => { cameraScrollRef.current = Number(cameraScrollX) || 0; }, [cameraScrollX]);
  useEffect(() => { parallaxFactorRef.current = Number(backgroundParallaxFactor) || 0.3; }, [backgroundParallaxFactor]);
  useEffect(() => { bgImageRef.current = backgroundImage; }, [backgroundImage]);
  useEffect(() => { bgColorRef.current = backgroundColor; }, [backgroundColor]);

  // Sync weather props to ref for systems to read live
  useEffect(() => {
    weatherPropsRef.current = {
      rain: Number(weatherRain) || 0,
      snow: Number(weatherSnow) || 0,
      clouds: Number(weatherClouds) || 0,
      fog: Number(weatherFog) || 0,
      thunder: Number(weatherThunder) || 0,
      lavaRain: Number(weatherLavaRain) || 0,
      radioactiveFog: Number(weatherRadioactiveFog) || 0,
      meteorRain: Number(weatherMeteorRain) || 0,
    };
  }, [weatherRain, weatherSnow, weatherClouds, weatherFog, weatherThunder, weatherLavaRain, weatherRadioactiveFog, weatherMeteorRain]);

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

        // Enable z-index sorting for the main stage
        app.stage.sortableChildren = true;

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
      const roomBg = new Container();
      const roomObjBehind = new Container();
      const roomObjFront = new Container();
      const secretBelowLayer = new Container();
      const secretAboveLayer = new Container();
      const playerLayer = new Container();
      const entitiesLayer = new Container();
      const weatherLayer = new Container();
      const liquidBgLayer = new Container();
      const liquidLayer = new Container();
      const liquidFxLayer = new Container();
      const fogLayer = new Container();
      const projLayer = new Container();
      const vignetteLayer = new Container();
      const overlayLayer = new Container();
      const floatingLayer = createFloatingTextLayer();

      // Assign zIndex
      const parallaxLayer = new Container();
      parallaxLayer.zIndex = LAYERS.parallax;
      bg.zIndex = LAYERS.tiles;
      bgAnim.zIndex = LAYERS.tilesAnim;
      roomBg.zIndex = LAYERS.tiles + 1;
      objBehind.zIndex = LAYERS.objBehind;
      roomObjBehind.zIndex = LAYERS.objBehind + 1;
      objFront.zIndex = LAYERS.objFront;
      roomObjFront.zIndex = LAYERS.objFront + 1;
      secretBelowLayer.zIndex = LAYERS.secretsBelow;
      secretAboveLayer.zIndex = LAYERS.secretsAbove;
      playerLayer.zIndex = LAYERS.player;
      entitiesLayer.zIndex = LAYERS.player;
      weatherLayer.zIndex = LAYERS.weather;
      fogLayer.zIndex = LAYERS.fog;
      liquidBgLayer.zIndex = LAYERS.liquidBackground;
      liquidLayer.zIndex = LAYERS.liquids;
      liquidFxLayer.zIndex = LAYERS.liquidFx;
      projLayer.zIndex = LAYERS.projectiles;
      vignetteLayer.zIndex = LAYERS.overlay - 1;
      overlayLayer.zIndex = LAYERS.overlay;
      floatingLayer.zIndex = LAYERS.overlay + 1;

      bgRef.current = bg;
      bgAnimRef.current = bgAnim;
      objBehindRef.current = objBehind;
      objFrontRef.current = objFront;
      roomBgRef.current = roomBg;
      roomObjBehindRef.current = roomObjBehind;
      roomObjFrontRef.current = roomObjFront;
      secretLayerRef.current = { below: secretBelowLayer, above: secretAboveLayer };
      weatherLayerRef.current = weatherLayer;
      playerLayerRef.current = playerLayer;
      liquidBgLayerRef.current = liquidBgLayer;
      liquidLayerRef.current = liquidLayer;
      fogLayerRef.current = fogLayer;
      projectilesLayerRef.current = projLayer;
      entitiesLayerRef.current = entitiesLayer;
      vignetteRef.current = vignetteLayer;
      overlayLayerRef.current = overlayLayer;
      floatingLayerRef.current = floatingLayer;
      floatingManagerRef.current = createFloatingTextManager(floatingLayer);
    
      const gridGraphics = new Graphics();
      gridRef.current = gridGraphics;
      overlayLayer.addChild(gridGraphics);
      parallaxRef.current = parallaxLayer;

      // Add all layers to stage
      const allLayersMap = {
        background: [bg, bgAnim],
        parallax: [parallaxLayer],
        tiles: [bg, bgAnim], // Aliased for convenience
        objects: [objBehind, objFront, secretBelowLayer, secretAboveLayer, entitiesLayer, projLayer],
        player: [playerLayer],
        weather: [weatherLayer, fogLayer],
        liquids: [liquidBgLayer, liquidLayer, liquidFxLayer],
        overlay: [overlayLayer]
      };

      if (renderLayers) {
        renderLayers.forEach(layerName => {
          const layers = allLayersMap[layerName];
          if (layers) layers.forEach(l => {
            if (!app.stage.children.includes(l)) app.stage.addChild(l);
          });
        });
      } else {
        // Add layers in z-order priority (back to front) for stability
        app.stage.addChild(
          parallaxLayer,
          bg, bgAnim, 
          roomBg,
          liquidBgLayer, 
          objBehind, 
          roomObjBehind,
          secretBelowLayer, 
          playerLayer, 
          entitiesLayer, 
          projLayer, 
          objFront, 
          roomObjFront,
          secretAboveLayer, 
          weatherLayer, 
          fogLayer, 
          liquidLayer, 
          liquidFxLayer,
          vignetteLayer,
          overlayLayer,
          floatingLayer
        );
      }

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

      const lavaColors = { ok: 0xffcc00, warn: 0xffaa00, danger: 0xff8800 };
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
          liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { 
            mapWidth, 
            mapHeight, 
            tileSize,
            bgContainer: liquidBgLayerRef.current
          });
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
        if (gridRef.current) {
          gridRef.current.clear();
          if (showGridRef.current) {
            for (let x = 0; x <= mapWidth; x++) {
              gridRef.current.moveTo(x * tileSize, 0);
              gridRef.current.lineTo(x * tileSize, mapHeight * tileSize);
            }
            for (let y = 0; y <= mapHeight; y++) {
              gridRef.current.moveTo(0, y * tileSize);
              gridRef.current.lineTo(mapWidth * tileSize, y * tileSize);
            }
            gridRef.current.stroke({ width: 0.5, color: 0xffffff, alpha: 0.2 });
          }
        }

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

          // Use a small dead-zone/smooth follow to prevent 1px jitter from sub-pixel player movement
          const lastCam = cameraPosRef.current || { x: camX, y: camY, rawX: camX, rawY: camY };
          const smoothing = 0.2; // Lerp factor (0 to 1, higher is faster)
          const rawX = lastCam.rawX !== undefined ? lastCam.rawX : camX;
          const rawY = lastCam.rawY !== undefined ? lastCam.rawY : camY;
          
          const nextRawX = rawX + (camX - rawX) * smoothing;
          const nextRawY = rawY + (camY - rawY) * smoothing;

          cameraPosRef.current = { 
            x: Math.round(nextRawX), 
            y: Math.round(nextRawY),
            rawX: nextRawX,
            rawY: nextRawY
          };
          
          app.stage.pivot.set(Math.round(nextRawX), Math.round(nextRawY));
          
          window.__PLAYER_POS__ = { x: s.x, y: s.y };

          if (parallaxRef.current) {
            parallaxRef.current.position.set(nextRawX, nextRawY);
          }

          if (vignetteRef.current && vignetteRef.current.visible) {
            vignetteRef.current.position.set(nextRawX, nextRawY);
          }

          const f = parallaxFactorRef.current;
          if (parallaxManagerRef.current) {
            parallaxManagerRef.current.resize(worldW, worldH, sw, sh);
            parallaxManagerRef.current.setScroll(nextRawX, f);
          }
        }

        // Weather
        const dt = app.ticker?.deltaMS || 16.67;
        const systems = weatherSystemsRef.current;
        const swNow = app.screen.width;
        const shNow = app.screen.height;

        if (systems.rain) {
          if (systems.rain.resize) systems.rain.resize(swNow, shNow);
          systems.rain.update(dt);
        }
        if (systems.lavaRain) {
          if (systems.lavaRain.resize) systems.lavaRain.resize(swNow, shNow);
          systems.lavaRain.update(dt);
        }
        if (systems.snow) {
          if (systems.snow.resize) systems.snow.resize(swNow, shNow);
          systems.snow.update(dt);
        }
        if (systems.meteorRain) {
          if (systems.meteorRain.resize) systems.meteorRain.resize(swNow, shNow);
          systems.meteorRain.update(dt);
        }
        if (systems.clouds) {
          if (systems.clouds.resize) systems.clouds.resize(swNow, shNow);
          systems.clouds.update(dt);
        }
        if (systems.fog) {
          if (systems.fog.resize) systems.fog.resize(swNow, shNow);
          systems.fog.update(dt);
        }
        if (systems.radioactiveFog) {
          if (systems.radioactiveFog.resize) systems.radioactiveFog.resize(swNow, shNow);
          systems.radioactiveFog.update(dt);
        }
        if (systems.thunder) {
          if (systems.thunder.resize) systems.thunder.resize(swNow, shNow);
          systems.thunder.update(dt);
        }

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
            // Check if player's head is in water/lava for full overlay
            // If only body is in liquid, use a much subtler effect or none
            const liquidType = sNow.liquidType;
            const headUnder = !!(sNow && sNow.headUnderWater);
            const inLiquid = !!(sNow && sNow.inWater);
            
            const overlayCfg = sNow.liquidOverlay || null;
            const showOverlay = headUnder && !!overlayCfg;

            let overlayColor = 0x1d4875;
            let maxTargetAlpha = 0.15;

            if (overlayCfg) {
              if (Number.isFinite(overlayCfg.color)) overlayColor = overlayCfg.color;
              if (Number.isFinite(overlayCfg.alpha)) maxTargetAlpha = overlayCfg.alpha;
            }

            if (showOverlay) {
              u.time += dt;
              // Target alpha with pulse effect
              const pulseBase = (maxTargetAlpha * 0.8) + (maxTargetAlpha * 0.2) * Math.sin(u.time * 0.0025);
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

        // Floating texts
        floatingManagerRef.current?.update(dt);
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

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      floatingManagerRef.current?.add(detail);
    };
    window.addEventListener('game-floating-text', handler);
    return () => window.removeEventListener('game-floating-text', handler);
  }, []);

  useEffect(() => {
    const isInsideRoom = activeRoomIds && activeRoomIds.length > 0;
    const targetBlur = (isInsideRoom && roomBlurEnabled) ? 4 : 0;
    const roomBrightness = isInsideRoom ? 1.25 : 1.0; // Slightly brighter interior
    
    if (blurFilterRef.current) {
      blurFilterRef.current.strength = targetBlur;
    }

    if (darkenFilterRef.current) {
      darkenFilterRef.current.reset();
      if (isInsideRoom) {
        // Desaturate and darken background when inside
        darkenFilterRef.current.desaturate();
        darkenFilterRef.current.brightness(0.75, true);
      }
    }

    if (roomBrightnessFilterRef.current) {
      roomBrightnessFilterRef.current.reset();
      roomBrightnessFilterRef.current.brightness(roomBrightness, false);
    }

    if (vignetteRef.current) {
      vignetteRef.current.visible = isInsideRoom;
      if (isInsideRoom && !vignetteRef.current.children.length) {
        const sw = appRef.current?.screen?.width || 800;
        const sh = appRef.current?.screen?.height || 600;
        
        // Create programmatic vignette texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(256, 256, 100, 256, 256, 360);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        
        const tex = Texture.from(canvas);
        const sprite = new Sprite(tex);
        sprite.width = sw;
        sprite.height = sh;
        vignetteRef.current.addChild(sprite);
        
        // Also update sprite size on resize
        vignetteRef.current._vignetteSprite = sprite;
      }
      
      // Sync vignette position to camera (it should be screen-space)
      if (isInsideRoom && vignetteRef.current._vignetteSprite) {
        vignetteRef.current.x = cameraPosRef.current.x;
        vignetteRef.current.y = cameraPosRef.current.y;
        vignetteRef.current._vignetteSprite.width = appRef.current?.screen?.width || 800;
        vignetteRef.current._vignetteSprite.height = appRef.current?.screen?.height || 600;
      }
    }

    const layersToBlur = [
      bgRef.current,
      bgAnimRef.current,
      objBehindRef.current,
      objFrontRef.current,
      secretLayerRef.current?.below,
      secretLayerRef.current?.above,
      liquidBgLayerRef.current,
      liquidLayerRef.current,
      parallaxRef.current
    ];

    layersToBlur.forEach(layer => {
      if (layer) {
        if (!layer.filters) layer.filters = [];
        
        // Blur filter
        if (targetBlur > 0) {
          if (!layer.filters.includes(blurFilterRef.current)) {
            layer.filters = [...layer.filters, blurFilterRef.current];
          }
        } else {
          layer.filters = layer.filters.filter(f => f !== blurFilterRef.current);
        }

        // Darken/Desaturate filter (Background only)
        if (isInsideRoom) {
          if (!layer.filters.includes(darkenFilterRef.current)) {
            layer.filters = [...layer.filters, darkenFilterRef.current];
          }
        } else {
          layer.filters = layer.filters.filter(f => f !== darkenFilterRef.current);
        }

        if (layer.filters.length === 0) layer.filters = null;
      }
    });

    // Apply brightness to room layers
    const roomLayers = [
      roomBgRef.current,
      roomObjBehindRef.current,
      roomObjFrontRef.current
    ];

    roomLayers.forEach(layer => {
      if (layer) {
        if (!layer.filters) layer.filters = [];
        if (isInsideRoom) {
          if (!layer.filters.includes(roomBrightnessFilterRef.current)) {
            layer.filters = [...layer.filters, roomBrightnessFilterRef.current];
          }
        } else {
          layer.filters = layer.filters.filter(f => f !== roomBrightnessFilterRef.current);
        }
        if (layer.filters.length === 0) layer.filters = null;
      }
    });
  }, [activeRoomIds, roomBlurEnabled]);

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
                { 
                  bgRef: bgRef.current, 
                  objBehindRef: objBehindRef.current, 
                  objFrontRef: objFrontRef.current, 
                  roomBgRef: roomBgRef.current,
                  roomObjBehindRef: roomObjBehindRef.current,
                  roomObjFrontRef: roomObjFrontRef.current,
                  secretLayerRef: secretLayerRef.current 
                },
                { mapWidth, mapHeight, tileSize, tileMapData, objectMapData, secretMapData, revealedSecrets, registryItems, objectMetadata, isEditor, isEditorPlayMode, mapType, backgroundColor, activeRoomIds, maps }
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
                        liquidSystemRef.current = new LiquidRegionSystem(liquidLayerRef.current, { 
                            mapWidth, 
                            mapHeight, 
                            tileSize,
                            bgContainer: liquidBgLayerRef.current
                        });
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
  }, [tileMapData, objectMapData, registryItems, mapWidth, mapHeight, tileSize, secretMapData, revealedSecrets, objectMetadata, playerVisuals, isPixiReady, activeRoomIds, maps, mapType, backgroundColor]);

  // Weather systems lifecycle
  useEffect(() => {
    const app = appRef.current;
    const weatherLayer = weatherLayerRef.current;
    const fogLayer = fogLayerRef.current;
    if (!app || !weatherLayer || !fogLayer || !isPixiReady) return;

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
      },
      onMeteorHit: (data) => {
        if (typeof onWeatherEffectHit === 'function') {
          onWeatherEffectHit('meteor', data);
        }
      },
      getViewport: () => ({
        x: cameraPosRef.current.x,
        y: cameraPosRef.current.y,
        width: app.screen?.width || 800,
        height: app.screen?.height || 600
      })
    };

    const getRainIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.rain) || 0));
    const getSnowIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.snow) || 0));
    const getCloudsIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.clouds) || 0));
    const getThunderIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.thunder) || 0));
    const getFogIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.fog) || 0));
    const getLavaRainIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.lavaRain) || 0));
    const getRadioactiveFogIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.radioactiveFog) || 0));
    const getMeteorRainIntensity = () => Math.max(0, Math.min(100, Number(weatherPropsRef.current.meteorRain) || 0));

    // Initialize systems if they don't exist
    if (!weatherSystemsRef.current.rain) {
      weatherSystemsRef.current.rain = new WeatherRain(weatherLayer, api, getRainIntensity);
    }
    if (!weatherSystemsRef.current.lavaRain) {
      weatherSystemsRef.current.lavaRain = new WeatherLavaRain(weatherLayer, api, getLavaRainIntensity);
    }
    if (!weatherSystemsRef.current.snow) {
      weatherSystemsRef.current.snow = new WeatherSnow(weatherLayer, api, getSnowIntensity);
    }
    if (!weatherSystemsRef.current.meteorRain) {
      weatherSystemsRef.current.meteorRain = new WeatherMeteorRain(weatherLayer, api, getMeteorRainIntensity);
    }
    if (!weatherSystemsRef.current.clouds) {
      weatherSystemsRef.current.clouds = new WeatherClouds(fogLayer, api, getCloudsIntensity);
    }
    if (!weatherSystemsRef.current.fog) {
      weatherSystemsRef.current.fog = new WeatherFog(fogLayer, api, getFogIntensity);
    }
    if (!weatherSystemsRef.current.radioactiveFog) {
      weatherSystemsRef.current.radioactiveFog = new WeatherRadioactiveFog(fogLayer, api, getRadioactiveFogIntensity);
    }
    if (!weatherSystemsRef.current.thunder) {
      weatherSystemsRef.current.thunder = new WeatherThunder(fogLayer, api, getThunderIntensity);
    }

    // Return cleanup to destroy all when stage unmounts or map changes
    return () => {
      try { weatherSystemsRef.current.rain?.destroy(); } catch {}
      try { weatherSystemsRef.current.lavaRain?.destroy(); } catch {}
      try { weatherSystemsRef.current.snow?.destroy(); } catch {}
      try { weatherSystemsRef.current.meteorRain?.destroy(); } catch {}
      try { weatherSystemsRef.current.clouds?.destroy(); } catch {}
      try { weatherSystemsRef.current.fog?.destroy(); } catch {}
      try { weatherSystemsRef.current.radioactiveFog?.destroy(); } catch {}
      try { weatherSystemsRef.current.thunder?.destroy(); } catch {}
      weatherSystemsRef.current = { rain: null, lavaRain: null, snow: null, meteorRain: null, clouds: null, thunder: null, fog: null, radioactiveFog: null };
    };
  }, [mapWidth, mapHeight, tileSize, isSolidAt, isPixiReady]);

  // Rebuild parallax when props change
  useEffect(() => {
    rebuildParallax();
  }, [backgroundImage, backgroundColor, rebuildParallax]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', pointerEvents }} />;
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
  weatherLavaRain: PropTypes.number,
  weatherRadioactiveFog: PropTypes.number,
  weatherMeteorRain: PropTypes.number,
  oxygenBarEnabled: PropTypes.bool,
  lavaBarEnabled: PropTypes.bool,
  waterSplashesEnabled: PropTypes.bool,
  lavaEmbersEnabled: PropTypes.bool,
  roomBlurEnabled: PropTypes.bool,
  renderLayers: PropTypes.arrayOf(PropTypes.string),
  pointerEvents: PropTypes.string,
  onWeatherEffectHit: PropTypes.func,
};

export default PixiStage;

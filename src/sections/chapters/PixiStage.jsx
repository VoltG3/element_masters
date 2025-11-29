import React, { useEffect, useRef } from 'react';
import { Application, Container, Sprite, Texture, AnimatedSprite, Assets, TilingSprite, WRAP_MODES } from 'pixi.js';

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
  backgroundParallaxFactor = 0.3,
}) => {
  const mountRef = useRef(null);
  const appRef = useRef(null);
  const parallaxRef = useRef(null);
  const parallaxSpriteRef = useRef(null);
  const bgRef = useRef(null);
  const objRef = useRef(null);
  const playerRef = useRef(null);
  const playerStateRef = useRef(null);

  // keep latest player state for ticker without re-subscribing
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

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

  // Build or rebuild parallax tiling sprite layer
  const rebuildParallax = () => {
    const app = appRef.current;
    const layer = parallaxRef.current;
    if (!app || !layer) return;

    // Clear previous
    layer.removeChildren();
    parallaxSpriteRef.current = null;

    const url = resolveBackgroundUrl(backgroundImage);
    if (!url) return;

    // Ensure texture is created and repeatable
    const tex = getTexture(url);
    if (!tex) return;
    if (tex.baseTexture) {
      tex.baseTexture.wrapMode = WRAP_MODES.REPEAT;
    }

    const sprite = new TilingSprite({ texture: tex, width: mapWidth * tileSize, height: mapHeight * tileSize });
    sprite.tileScale.set(1, 1);
    sprite.x = 0;
    sprite.y = 0;
    layer.addChild(sprite);
    parallaxSpriteRef.current = sprite;
  };

  // Convert ms-per-frame (JSON) to Pixi AnimatedSprite speed factor (1 = 60fps)
  const msToSpeed = (ms) => {
    const m = Number(ms);
    const msPerFrame = Number.isFinite(m) && m > 0 ? m : 500;
    const fps = 1000 / msPerFrame;
    return fps / 60; // Pixi speed factor
  };

  const getRegItem = (id) => registryItems.find((r) => r.id === id);

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
      const obj = new Container();
      const playerLayer = new Container();

      bgRef.current = bg;
      objRef.current = obj;

      // Parallax layer (behind everything)
      const parallaxLayer = new Container();
      parallaxRef.current = parallaxLayer;
      app.stage.addChild(parallaxLayer);
      app.stage.addChild(bg);
      app.stage.addChild(obj);
      app.stage.addChild(playerLayer);

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

      // Create player sprite container
      let playerSprite = null;
      if (playerVisuals) {
        if (Array.isArray(playerVisuals.textures) && playerVisuals.textures.length > 1) {
          const frames = playerVisuals.textures.map((u) => getTexture(u)).filter(Boolean);
          if (frames.length > 0) {
            playerSprite = new AnimatedSprite(frames);
            playerSprite.animationSpeed = msToSpeed(playerVisuals.animationSpeed);
            playerSprite.play();
          }
        }
        if (!playerSprite) {
          const tex = getTexture(playerVisuals.texture) || Texture.WHITE;
          playerSprite = new Sprite(tex);
        }
      } else {
        // fallback placeholder
        playerSprite = new Sprite(Texture.WHITE);
        playerSprite.tint = 0x00ff00;
        playerSprite.width = tileSize;
        playerSprite.height = tileSize;
      }

      playerSprite.anchor.set(0, 0); // align top-left to match DOM positioning
      playerLayer.addChild(playerSprite);
      playerRef.current = playerSprite;

      // Mount canvas
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(app.canvas);
      }

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
        });
      }

      // First draw of map layers
      rebuildLayers();
      // Build or rebuild parallax background
      rebuildParallax();

      // Update player and parallax each frame
      app.ticker.add(() => {
        const s = playerStateRef.current;
        if (!s) return;

        // Update player sprite if available
        if (playerRef.current) {
          const p = playerRef.current;
          if (s.width) p.width = s.width;
          if (s.height) p.height = s.height;
          const dir = s.direction || 1;
          const mag = Math.abs(p.scale.x || 1);
          p.scale.x = dir >= 0 ? mag : -mag;
          const effectiveWidth = s.width || p.width || tileSize;
          p.x = dir >= 0 ? (s.x || 0) : ( (s.x || 0) + effectiveWidth );
          p.y = s.y || 0;
        }

        // Update parallax background tile offset
        if (parallaxSpriteRef.current) {
          // Move slower than foreground: factor in [0..1)
          const f = Number(backgroundParallaxFactor) || 0.3;
          // Negative to move in opposite direction of camera (assuming camera follows player)
          parallaxSpriteRef.current.tilePosition.x = -(s.x || 0) * f;
          parallaxSpriteRef.current.tilePosition.y = 0;
        }
      });
    };

    const rebuildLayers = () => {
      const app = appRef.current;
      if (!app || !bgRef.current || !objRef.current) return;

      // Clear previous
      bgRef.current.removeChildren();
      objRef.current.removeChildren();

      // Background tiles
      for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = tileMapData[i];
        if (!id) continue;
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
        objRef.current.addChild(sprite);
      }
    };

    init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
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
    if (bgRef.current && objRef.current) {
      // Simple approach: full rebuild
      // Background
      bgRef.current.removeChildren();
      for (let i = 0; i < mapWidth * mapHeight; i++) {
        const id = tileMapData[i];
        if (!id) continue;
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
        bgRef.current.addChild(sprite);
      }

      // Objects
      objRef.current.removeChildren();
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
        objRef.current.addChild(sprite);
      }
    }
  }, [tileMapData, objectMapData, registryItems, mapWidth, mapHeight, tileSize]);

  // Rebuild parallax when props change
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    rebuildParallax();
  }, [backgroundImage, backgroundParallaxFactor, mapWidth, mapHeight, tileSize]);

  // Resize application when map size changes
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    app.renderer.resize(mapWidth * tileSize, mapHeight * tileSize);
    // Resize parallax tiling sprite too
    if (parallaxSpriteRef.current) {
      parallaxSpriteRef.current.width = mapWidth * tileSize;
      parallaxSpriteRef.current.height = mapHeight * tileSize;
    }
  }, [mapWidth, mapHeight, tileSize]);

  return (
    <div
      ref={mountRef}
      style={{ width: mapWidth * tileSize, height: mapHeight * tileSize }}
    />
  );
};

export default PixiStage;

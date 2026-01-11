import { TilingSprite, Sprite, Texture, WRAP_MODES, BlurFilter, Assets } from 'pixi.js';

// Parallax background helper. Manages background layers (solid color and image).
export class ParallaxBackground {
  constructor(container, textureCache) {
    this.container = container;
    this.cache = textureCache;
    this.bgSprite = null; // Solid color layer
    this.imgSprite = null; // Image layer
    this._worldW = 0;
    this._worldH = 0;
    this._lastCameraX = 0;
    this._currentUrl = null;
  }

  build({ worldWidth, worldHeight, url, color, factor = 0.3, minWidth = 0, minHeight = 0 }) {
    if (!this.container) return;
    this.clear();

    const w = Math.max(worldWidth, minWidth);
    const h = Math.max(worldHeight, minHeight);

    this._worldW = worldWidth;
    this._worldH = worldHeight;
    this._currentUrl = url;

    // 1. Render solid color background FIRST (always present as base)
    const hex = (typeof color === 'string' && color.startsWith('#'))
      ? parseInt(color.slice(1), 16)
      : (Number(color) || 0x87CEEB);
    
    const solid = new Sprite(Texture.WHITE);
    solid.tint = hex;
    solid.width = w;
    solid.height = h;
    solid.alpha = 1.0;
    try {
      solid.filters = [new BlurFilter({ strength: 0.8, quality: 2 })];
    } catch {}
    this.container.addChild(solid);
    this.bgSprite = solid;

    // 2. If URL is provided, attempt to load and render image on top
    if (url) {
      const setupImage = (tex) => {
        if (!this.container || this._currentUrl !== url) return;
        
        // Remove old image if any
        if (this.imgSprite) {
          try { this.container.removeChild(this.imgSprite); } catch {}
          try { this.imgSprite.destroy(); } catch {}
          this.imgSprite = null;
        }

        if (!tex) {
          console.warn('[ParallaxBackground] setupImage called with no texture');
          return;
        }

        // Fix wrap mode for tiling
        if (tex.baseTexture) tex.baseTexture.wrapMode = WRAP_MODES.REPEAT;
        if (tex.source) tex.source.addressMode = 'repeat';

        const sprite = new TilingSprite({ texture: tex, width: w, height: h });
        const texH = (tex.height || (tex.source ? tex.source.height : 0) || 1);
        const scaleY = h / texH;
        sprite.tileScale.set(1, scaleY);
        sprite.alpha = 1.0;
        try {
          sprite.filters = [new BlurFilter({ strength: 1.2, quality: 2 })];
        } catch {}
        
        this.container.addChild(sprite);
        this.imgSprite = sprite;
        this.setScroll(this._lastCameraX || 0, factor);
      };

      // Try to get from Assets cache or Texture cache
      let tex = null;
      try {
        tex = Assets.get(url);
      } catch (e) {
        tex = this.cache?.get(url) || Texture.from(url);
      }

      const isValid = tex && (
        tex.valid || 
        (tex.baseTexture && tex.baseTexture.valid) || 
        (tex.source && tex.source.width > 0)
      );

      if (isValid) {
        console.log('[ParallaxBackground] Texture already ready');
        setupImage(tex);
      } else {
        console.log('[ParallaxBackground] Texture not ready, loading via Assets.load...');
        Assets.load(url).then((loadedTex) => {
          console.log('[ParallaxBackground] Texture loaded via Assets.load');
          setupImage(loadedTex);
        }).catch(err => {
          console.error('[ParallaxBackground] Failed to load background image:', url, err);
        });
      }
    }
  }

  setScroll(cameraX, factor = 0.3) {
    this._lastCameraX = cameraX;
    if (this.imgSprite && 'tilePosition' in this.imgSprite) {
      this.imgSprite.tilePosition.x = -cameraX * factor;
      this.imgSprite.tilePosition.y = 0;
    }
  }

  resize(worldWidth, worldHeight, minWidth = 0, minHeight = 0) {
    const w = Math.max(worldWidth, minWidth);
    const h = Math.max(worldHeight, minHeight);

    this._worldW = worldWidth;
    this._worldH = worldHeight;
    if (this.bgSprite) {
      this.bgSprite.width = w;
      this.bgSprite.height = h;
    }
    if (this.imgSprite) {
      this.imgSprite.width = w;
      this.imgSprite.height = h;
      const tex = this.imgSprite.texture;
      const texH = (tex?.height || (tex?.source ? tex.source.height : 0) || 1);
      if (this.imgSprite.tileScale && texH > 0) {
        const scaleY = h / texH;
        this.imgSprite.tileScale.set(1, scaleY);
      }
    }
  }

  clear() {
    if (this.bgSprite) {
      try { this.container.removeChild(this.bgSprite); } catch {}
      try { this.bgSprite.destroy(); } catch {}
      this.bgSprite = null;
    }
    if (this.imgSprite) {
      try { this.container.removeChild(this.imgSprite); } catch {}
      try { this.imgSprite.destroy(); } catch {}
      this.imgSprite = null;
    }
  }

  destroy() {
    this.clear();
    this.container = null;
    this.cache = null;
  }
}

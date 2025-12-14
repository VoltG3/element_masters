import { TilingSprite, Sprite, Texture, WRAP_MODES, BlurFilter } from 'pixi.js';

// Parallax background helper. Manages a single tiling sprite (or solid sprite) inside a given container.
// API:
//   const par = new ParallaxBackground(container, textureCache);
//   par.build({ worldWidth, worldHeight, url, color, factor });
//   par.setScroll(cameraX, factor);
//   par.destroy();
export class ParallaxBackground {
  constructor(container, textureCache) {
    this.container = container;
    this.cache = textureCache;
    this.sprite = null;
    this._worldW = 0;
    this._worldH = 0;
  }

  build({ worldWidth, worldHeight, url, color, factor = 0.3 }) {
    const layer = this.container;
    if (!layer) return;
    this.clear();

    this._worldW = worldWidth;
    this._worldH = worldHeight;

    if (url) {
      const tex = this.cache?.get(url) || Texture.from(url);

      // Validate texture is loaded and has dimensions
      if (!tex || (!tex.height && !tex.baseTexture?.height)) {
        console.warn('ParallaxBackground: invalid texture, falling back to solid color');
        // Fall through to solid color rendering below
      } else {
        if (tex?.baseTexture) tex.baseTexture.wrapMode = WRAP_MODES.REPEAT;

        const sprite = new TilingSprite({ texture: tex, width: worldWidth, height: worldHeight });
        // Fit the height exactly, preserve horizontal scale (tileScale.x = 1)
        const texH = (tex.height || tex.baseTexture?.height || 1);
        const scaleY = worldHeight / texH;
        sprite.tileScale.set(1, scaleY);
        sprite.x = 0;
        sprite.y = 0;
        sprite.alpha = 0.9;
        try {
          sprite.filters = [new BlurFilter({ strength: 1.2, quality: 2 })];
        } catch {}
        layer.addChild(sprite);
        this.sprite = sprite;
        // initial scroll
        this.setScroll(0, factor);
        return; // Exit early on success
      }
    }

    // Fallback: render solid color (if no url or texture invalid)
    {
      const hex = (typeof color === 'string' && color.startsWith('#'))
        ? parseInt(color.slice(1), 16)
        : (Number(color) || 0x87CEEB);
      const solid = new Sprite(Texture.WHITE);
      solid.tint = hex;
      solid.width = worldWidth;
      solid.height = worldHeight;
      solid.alpha = 0.95;
      try {
        solid.filters = [new BlurFilter({ strength: 0.8, quality: 2 })];
      } catch {}
      layer.addChild(solid);
      this.sprite = solid;
    }
  }

  setScroll(cameraX, factor = 0.3) {
    if (!this.sprite) return;
    if ('tilePosition' in this.sprite) {
      this.sprite.tilePosition.x = -cameraX * factor;
      this.sprite.tilePosition.y = 0;
    }
  }

  resize(worldWidth, worldHeight) {
    if (!this.sprite) return;
    this._worldW = worldWidth;
    this._worldH = worldHeight;
    this.sprite.width = worldWidth;
    this.sprite.height = worldHeight;
    const tex = this.sprite.texture;
    const texH = (tex?.height || tex?.baseTexture?.height || 1);
    if (this.sprite.tileScale && texH > 0) {
      const scaleY = worldHeight / texH;
      this.sprite.tileScale.set(1, scaleY);
    }
  }

  clear() {
    const layer = this.container;
    if (!layer) return;
    if (this.sprite) {
      try { layer.removeChild(this.sprite); } catch {}
      try { this.sprite.destroy?.(); } catch {}
      this.sprite = null;
    }
  }

  destroy() {
    this.clear();
    this.container = null;
    this.cache = null;
  }
}

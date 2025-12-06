// Lightweight texture cache around PIXI.Texture.from
// Usage:
//   const cache = new TextureCache();
//   const tex = cache.get(url);
//   cache.dispose(); // optional

import { Texture } from 'pixi.js';

export class TextureCache {
  constructor() {
    this._map = new Map();
  }

  get(url) {
    if (!url) return null;
    const m = this._map;
    if (m.has(url)) return m.get(url);
    const tex = Texture.from(url);
    m.set(url, tex);
    return tex;
  }

  has(url) {
    return this._map.has(url);
  }

  dispose(url) {
    // Do not destroy textures created by Texture.from (managed by Pixi's cache);
    // only release our Map reference.
    if (url && this._map.has(url)) this._map.delete(url);
  }

  clear() {
    this._map.clear();
  }
}

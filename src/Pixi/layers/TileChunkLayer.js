// TileChunkLayer: builds a static tile background using chunked RenderTextures
// to drastically reduce sprite count on large maps.
//
// Usage:
//   const layer = new TileChunkLayer(app, container, textureCache);
//   layer.build({ mapWidth, mapHeight, tileSize, tileMapData, registryItems, chunkSize:16 });
//   layer.destroy();

import { Container, Sprite, Texture, RenderTexture } from 'pixi.js';

export class TileChunkLayer {
  constructor(app, container, textureCache) {
    this.app = app;
    this.container = container; // parent PIXI.Container to hold chunk sprites
    this.cache = textureCache;
    this.chunkSize = 16;
    this._chunks = []; // sprites per chunk
    this._mapKey = '';
  }

  destroy() {
    this.clear();
    this.app = null;
    this.container = null;
    this.cache = null;
  }

  clear() {
    if (this._chunks) {
      for (let i = 0; i < this._chunks.length; i++) {
        const spr = this._chunks[i];
        if (!spr) continue;
        try { this.container?.removeChild(spr); } catch {}
        try { spr.texture?.destroy?.(true); } catch {}
        try { spr.destroy?.(); } catch {}
      }
    }
    this._chunks = [];
  }

  build(params) {
    const { mapWidth, mapHeight, tileSize, tileMapData, registryItems, chunkSize = 16 } = params || {};
    if (!this.app || !this.container) return;
    if (!Array.isArray(tileMapData) || !Array.isArray(registryItems)) return;
    this.chunkSize = Math.max(8, Math.min(64, chunkSize | 0 || 16));

    // If identical map key, skip rebuild
    const key = `${mapWidth}x${mapHeight}x${tileSize}#${tileMapData.length}`;
    if (key === this._mapKey && this._chunks.length) return;
    this._mapKey = key;

    this.clear();

    const app = this.app;
    const renderer = app.renderer;
    const worldW = mapWidth * tileSize;
    const worldH = mapHeight * tileSize;

    const getDef = (id) => registryItems.find(r => r.id === id);
    const getTex = (url) => this.cache?.get(url) || (url ? Texture.from(url) : null);

    const chunksX = Math.ceil(mapWidth / this.chunkSize);
    const chunksY = Math.ceil(mapHeight / this.chunkSize);

    for (let cy = 0; cy < chunksY; cy++) {
      for (let cx = 0; cx < chunksX; cx++) {
        const tilesW = Math.min(this.chunkSize, mapWidth - cx * this.chunkSize);
        const tilesH = Math.min(this.chunkSize, mapHeight - cy * this.chunkSize);
        const pxW = tilesW * tileSize;
        const pxH = tilesH * tileSize;

        // Build offscreen container for this chunk
        const off = new Container();
        off.x = 0; off.y = 0;

        let hasAny = false;

        for (let ty = 0; ty < tilesH; ty++) {
          for (let tx = 0; tx < tilesW; tx++) {
            const gx = cx * this.chunkSize + tx;
            const gy = cy * this.chunkSize + ty;
            const idx = gy * mapWidth + gx;
            const id = tileMapData[idx];
            if (!id) continue;
            const def = getDef(id);
            if (!def) continue;

            // Only static tiles here; animated tiles will be handled by PixiStage for now
            const isAnimated = Array.isArray(def.textures) && def.textures.length > 1;
            const url = isAnimated ? null : (def.texture || null);
            if (!url) continue;
            const tex = getTex(url);
            if (!tex) continue;
            const spr = new Sprite(tex);
            spr.x = tx * tileSize;
            spr.y = ty * tileSize;
            spr.width = tileSize;
            spr.height = tileSize;
            off.addChild(spr);
            hasAny = true;
          }
        }

        if (!hasAny) {
          // nothing in this chunk; skip creating RT
          off.destroy({ children: true });
          continue;
        }

        // Render to texture and create a single sprite
        const rt = RenderTexture.create({ width: pxW, height: pxH, resolution: renderer.resolution });
        renderer.render({ container: off, target: rt, clear: true });
        // Clean up offscreen
        off.destroy({ children: true });

        const chunkSprite = new Sprite(rt);
        chunkSprite.x = cx * this.chunkSize * tileSize;
        chunkSprite.y = cy * this.chunkSize * tileSize;
        this.container.addChild(chunkSprite);
        this._chunks.push(chunkSprite);
      }
    }
  }
}

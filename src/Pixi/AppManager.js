// Centralized Pixi.Application lifecycle manager
// Keeps a single PIXI Application per mounted PixiStage, handles resize and ticker.

import { Application } from 'pixi.js';

export class AppManager {
  constructor() {
    this.app = null;
    this._mountedEl = null;
    this._onResize = this._onResize.bind(this);
    this._resizeObserver = null;
  }

  init(mountEl, options = {}) {
    if (!mountEl) throw new Error('AppManager.init: mountEl is required');
    if (this.app) return this.app; // already initialized

    const {
      width = Math.max(1, mountEl.clientWidth || 640),
      height = Math.max(1, mountEl.clientHeight || 360),
      backgroundAlpha = 0,
      antialias = false,
      resolution = window.devicePixelRatio || 1,
      autoDensity = true,
      hello = false,
    } = options;

    const app = new Application({
      width,
      height,
      backgroundAlpha,
      antialias,
      resolution,
      autoDensity,
      hello,
    });
    this.app = app;
    this._mountedEl = mountEl;
    mountEl.appendChild(app.view);

    // Resize handling via ResizeObserver when available
    if ('ResizeObserver' in window) {
      this._resizeObserver = new ResizeObserver(() => this._onResize());
      this._resizeObserver.observe(mountEl);
    } else {
      window.addEventListener('resize', this._onResize);
    }

    return app;
  }

  _onResize() {
    if (!this.app || !this._mountedEl) return;
    const w = Math.max(1, this._mountedEl.clientWidth || 1);
    const h = Math.max(1, this._mountedEl.clientHeight || 1);
    this.app.renderer.resize(w, h);
  }

  addToStage(container) {
    if (!this.app || !container) return;
    this.app.stage.addChild(container);
  }

  removeFromStage(container) {
    if (!this.app || !container) return;
    this.app.stage.removeChild(container);
  }

  destroy() {
    try {
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      } else {
        window.removeEventListener('resize', this._onResize);
      }
    } catch {}
    if (this.app) {
      try { this.app.ticker.stop(); } catch {}
      try { this.app.destroy(true, { children: true, texture: false, baseTexture: false }); } catch {}
    }
    if (this._mountedEl && this._mountedEl.firstChild) {
      try { this._mountedEl.removeChild(this._mountedEl.firstChild); } catch {}
    }
    this.app = null;
    this._mountedEl = null;
  }
}

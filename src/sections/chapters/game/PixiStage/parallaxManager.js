import { ParallaxBackground } from '../../../../Pixi/layers/ParallaxBackground';

// Build or rebuild parallax background via helper
export const createParallaxManager = (parallaxLayer, textureCacheRef) => {
  let parallaxHelper = null;
  let parallaxSprite = null;

  const build = (options) => {
    const { worldWidth, worldHeight, url, color, factor, resolveBackgroundUrl, minWidth = 0, minHeight = 0 } = options;

    if (!parallaxHelper) {
      parallaxHelper = new ParallaxBackground(parallaxLayer, textureCacheRef);
    }

    // Resolve URL and validate it exists
    let resolvedUrl = null;
    if (url) {
      resolvedUrl = resolveBackgroundUrl ? resolveBackgroundUrl(url) : url;
    }

    // If no valid URL, pass null so ParallaxBackground uses solid color fallback
    parallaxHelper.build({
      worldWidth,
      worldHeight,
      url: resolvedUrl,
      color: color || '#87CEEB',
      factor: factor || 0.3,
      minWidth,
      minHeight
    });

    parallaxSprite = parallaxHelper.imgSprite || parallaxHelper.bgSprite;
  };

  const setScroll = (cameraX, factor) => {
    if (parallaxHelper) {
      parallaxHelper.setScroll(cameraX, factor);
    }
  };

  const resize = (worldWidth, worldHeight, minWidth = 0, minHeight = 0) => {
    if (parallaxHelper) {
      parallaxHelper.resize(worldWidth, worldHeight, minWidth, minHeight);
    }
  };

  const destroy = () => {
    if (parallaxHelper) {
      try {
        parallaxHelper.destroy();
      } catch (e) {
        // ignore
      }
      parallaxHelper = null;
      parallaxSprite = null;
    }
  };

  return {
    build,
    setScroll,
    resize,
    destroy,
    get sprite() {
      return parallaxHelper?.imgSprite || parallaxHelper?.bgSprite;
    },
    get helper() {
      return parallaxHelper;
    }
  };
};

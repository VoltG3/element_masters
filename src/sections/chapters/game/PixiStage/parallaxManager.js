import { ParallaxBackground } from '../../../../Pixi/layers/ParallaxBackground';

// Build or rebuild parallax background via helper
export const createParallaxManager = (parallaxLayer, textureCacheRef) => {
  let parallaxHelper = null;
  let parallaxSprite = null;

  const build = (options) => {
    const { worldWidth, worldHeight, url, color, factor, resolveBackgroundUrl } = options;

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
    });

    parallaxSprite = parallaxHelper.sprite;
  };

  const setScroll = (cameraX, factor) => {
    if (parallaxHelper) {
      parallaxHelper.setScroll(cameraX, factor);
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
    destroy,
    get sprite() {
      return parallaxSprite;
    },
    get helper() {
      return parallaxHelper;
    }
  };
};

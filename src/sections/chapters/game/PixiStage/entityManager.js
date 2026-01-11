import { Sprite, Texture, Rectangle } from 'pixi.js';
import { getTexture } from './helpers';

/**
 * Sinhronizē un atjaunina kustīgo entītiju (piem. tanku) spraitus.
 * @param {Container} entitiesLayer PixiJS konteiners entītijām
 * @param {Map} entitySpritesMap Map, kurā glabājas esošie spraiti (pēc ID)
 * @param {Array} entitiesList Entītiju saraksts no dzinēja
 * @param {Array} registryItems Reģistra elementi
 * @param {number} tileSize Flīzes izmērs pikseļos
 */
export const syncEntities = (entitiesLayer, entitySpritesMap, entitiesList, registryItems, tileSize) => {
  if (!entitiesLayer) return;

  const seen = new Set();
  const list = entitiesList || [];

  for (const ent of list) {
    const key = ent.id;
    seen.add(key);

    let spr = entitySpritesMap.get(key);
    const def = ent.def || {};

    if (!spr) {
      // Izveidojam jaunu spraitu ar baltu tekstūru kā aizvietotāju, kamēr lādējas īstā
      spr = new Sprite(Texture.WHITE);
      spr.anchor.set(0, 0);
      entitiesLayer.addChild(spr);
      entitySpritesMap.set(key, spr);
      spr._lastFrameIndex = -1;
    }

    // Atjaunojam tekstūru no spritesheet, ja nepieciešams
    const baseTexture = getTexture(def.texture);
    const source = baseTexture?.source;
    const isTextureReady = source && source.width > 1;

    if (def.spriteSheet && def.spriteSheet.enabled && isTextureReady) {
      const columns = def.spriteSheet.columns || 1;
      const frameIndex = ent.currentSpriteIndex !== undefined ? ent.currentSpriteIndex : 0;
      
      if (spr._lastFrameIndex !== frameIndex) {
        const texWidth = source.width;
        const texHeight = source.height;
        const totalSprites = def.spriteSheet.totalSprites || 1;

        // Ja kolonnu skaits JSONā ir nepareizs vai trūkst, mēģinām to aprēķināt
        let effectiveColumns = columns;
        if (!effectiveColumns || effectiveColumns <= 0) {
            effectiveColumns = Math.floor(texWidth / (def.spriteSheet.frameWidth || 32)) || 1;
        }

        const frameWidth = texWidth / effectiveColumns;
        const frameHeight = texHeight / Math.ceil(totalSprites / effectiveColumns);
        
        const col = frameIndex % effectiveColumns;
        const row = Math.floor(frameIndex / effectiveColumns);
        
        const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
        
        try {
            spr.texture = new Texture({
              source: source,
              frame: rect
            });
            spr._lastFrameIndex = frameIndex;
        } catch (e) {
            console.warn(`Failed to create texture for entity ${key} frame ${frameIndex}`, e);
            spr.texture = baseTexture;
        }
      }
    } else if (isTextureReady) {
      if (spr.texture !== baseTexture) {
        spr.texture = baseTexture;
        spr._lastFrameIndex = -1;
      }
    } else if (def.editorIcon) {
        // Ja nav tekstūras, bet ir ikona (piemēram, bultiņa, kaut gan tās te nevajadzētu būt kā entītijai)
        if (spr.texture !== Texture.WHITE) spr.texture = Texture.WHITE;
    }

    // Pozīcija un izmērs
    // Svarīgi: Vispirms iestatām izmēru, tad virzienu
    const targetWidth = ent.width || tileSize;
    const targetHeight = ent.height || tileSize;
    
    spr.width = targetWidth;
    spr.height = targetHeight;
    
    // Nodrošinām, ka scale nav 0 vai NaN (ja tekstūra bija dīvaina sākumā)
    if (!spr.scale.x || isNaN(spr.scale.x)) spr.scale.x = 1;
    if (!spr.scale.y || isNaN(spr.scale.y)) spr.scale.y = 1;

    // Virziens (flipping)
    const direction = ent.direction !== undefined ? ent.direction : 1;
    const absScaleX = Math.abs(spr.scale.x);
    spr.scale.x = direction >= 0 ? absScaleX : -absScaleX;
    
    // Pozicionēšana ņemot vērā flipping
    spr.x = ent.x + (direction < 0 ? targetWidth : 0);
    spr.y = ent.y;
  }

  // Noņemam spraitus entītijām, kas vairs neeksistē
  for (const [key, spr] of entitySpritesMap.entries()) {
    if (!seen.has(key)) {
      if (spr.parent) spr.parent.removeChild(spr);
      spr.destroy({ children: true, texture: false }); // Tekstūras koplietošanas dēļ tās neiznīcinām
      entitySpritesMap.delete(key);
    }
  }
};

/**
 * Attīra visus entītiju spraitus.
 */
export const cleanupEntities = (entitySpritesMap) => {
  for (const spr of entitySpritesMap.values()) {
    if (spr.parent) spr.parent.removeChild(spr);
    spr.destroy({ children: true, texture: false });
  }
  entitySpritesMap.clear();
};

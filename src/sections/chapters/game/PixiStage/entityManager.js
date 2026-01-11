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
      // Izveidojam jaunu spraitu
      spr = new Sprite(Texture.EMPTY);
      entitiesLayer.addChild(spr);
      entitySpritesMap.set(key, spr);
      spr._lastFrameIndex = -1;
    }

    // Atjaunojam tekstūru no spritesheet, ja nepieciešams
    if (def.spriteSheet && def.spriteSheet.enabled) {
      const columns = def.spriteSheet.columns || 1;
      const frameIndex = ent.currentSpriteIndex !== undefined ? ent.currentSpriteIndex : 0;
      
      if (spr._lastFrameIndex !== frameIndex) {
        const baseTexture = getTexture(def.texture);
        if (baseTexture && baseTexture.source) {
          const frameWidth = baseTexture.width / columns;
          const frameHeight = baseTexture.height / Math.ceil(def.spriteSheet.totalSprites / columns);
          
          const col = frameIndex % columns;
          const row = Math.floor(frameIndex / columns);
          
          const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
          
          spr.texture = new Texture({
            source: baseTexture.source,
            frame: rect
          });
          spr._lastFrameIndex = frameIndex;
        }
      }
    } else {
      const tex = getTexture(def.texture);
      if (tex && spr.texture !== tex) {
        spr.texture = tex;
      }
    }

    // Pozīcija un izmērs
    spr.width = ent.width || tileSize;
    spr.height = ent.height || tileSize;
    
    // Virziens (flipping)
    const direction = ent.direction !== undefined ? ent.direction : 1;
    const magX = Math.abs(spr.scale.x);
    spr.scale.x = direction >= 0 ? magX : -magX;
    
    // Ja anchor ir 0,0 (noklusējums), tad negatīvs scale.x nobīda zīmējumu pa kreisi no X punkta.
    // Tāpēc pieskaitām platumu, lai tas vizuāli paliktu tajā pašā vietā.
    spr.x = ent.x + (direction < 0 ? spr.width : 0);
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

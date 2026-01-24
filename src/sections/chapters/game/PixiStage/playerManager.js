import { Sprite, AnimatedSprite, Texture, Container, Text, Rectangle } from 'pixi.js';
import { getTexture, msToSpeed } from './helpers';
import HealthBar from '../../../../Pixi/ui/HealthBar';

// Build sprite from definition (static or animated)
export const buildSpriteFromDef = (def) => {
  if (!def) return null;

  let spr = null;
  if (Array.isArray(def.textures) && def.textures.length > 1) {
    const frames = def.textures.map((u) => getTexture(u)).filter(Boolean);
    if (frames.length > 0) {
      spr = new AnimatedSprite(frames);
      spr.animationSpeed = msToSpeed(def.animationSpeed);
      spr.play();
    }
  }

  // Static sprite sheet frame (grid-based)
  if (!spr && def.spriteSheet && def.spriteSheet.enabled && def.texture && Number.isFinite(Number(def.spriteSheet.frameIndex))) {
    const baseTexture = getTexture(def.texture);
    const source = baseTexture?.source;
    if (source && source.width > 1 && source.height > 1) {
      const totalSprites = Math.max(1, Number(def.spriteSheet.totalSprites) || 1);
      const columns = Math.max(1, Number(def.spriteSheet.columns) || 1);
      const rows = Math.ceil(totalSprites / columns);
      const frameWidth = Number(def.spriteSheet.frameWidth) || (source.width / columns);
      const frameHeight = Number(def.spriteSheet.frameHeight) || (source.height / rows);
      const frameIndex = Math.max(0, Math.min(totalSprites - 1, Number(def.spriteSheet.frameIndex)));
      const col = frameIndex % columns;
      const row = Math.floor(frameIndex / columns);
      const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
      spr = new Sprite(new Texture({ source, frame: rect }));
    }
  }

  // Ja nav tekstūru masīva vai tas ir tukšs, mēģinām parasto tekstūru
  if (!spr && def.texture) {
    const tex = getTexture(def.texture);
    if (tex) {
      spr = new Sprite(tex);
    }
  }

  // Ja joprojām nav spr (piemēram, nav tekstūras), pārbaudām editorIcon
  if (!spr && def.editorIcon) {
    spr = new Text({
        text: def.editorIcon,
        style: {
            fontSize: 24,
            fill: 0xffffff,
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: 0x000000,
            dropShadowBlur: 4,
            dropShadowDistance: 2
        }
    });
    // Centrējam tekstu tile ietvaros
    spr.anchor.set(0.5, 0.5);
    // Tā kā mēs lietojam anchor 0.5, mums būs jāpielāgo pozīcija vēlāk vai šeit
    // Bet buildSpriteFromDef parasti atgriež objektu, kura anchor ir (0,0) pēc noklusējuma
    // lai tas atbilstu tileSize pozicionēšanai.
    // Tāpēc iestatīsim anchor uz 0, bet nedaudz nobīdīsim?
    // Labāk lietot anchor 0.5 un layerBuilder-ī pieskaitīt tileSize/2.
  }

  if (!spr) {
    spr = new Sprite(Texture.WHITE);
  }

  if (spr instanceof Sprite) {
    spr.anchor.set(0, 0);
  } else if (spr instanceof Text) {
    // Tekstam mēs gribam, lai tas būtu centrā, tāpēc atstājam 0.5
  }
  
  return spr;
};

// Create player container with default and hit sprites
export const createPlayerContainer = (playerVisuals, registryItems, playerState, tileSize) => {
  const playerContainer = new Container();

  // Default visuals from prop
  const defaultDef = playerVisuals || null;

  // Target visuals: try specific IDs
  const targetDef = Array.isArray(registryItems)
    ? (registryItems.find(r => r.id === 'player_target_100') || registryItems.find(r => r.id === 'player_target'))
    : null;

  const defSprite = buildSpriteFromDef(defaultDef) || new Sprite(Texture.WHITE);
  const hitSprite = buildSpriteFromDef(targetDef) || null;

  playerContainer.addChild(defSprite);
  if (hitSprite) playerContainer.addChild(hitSprite);

  // Health bar above player
  let healthBar = null;
  try {
    healthBar = new HealthBar({
      width: (playerState?.width) || tileSize,
      height: 4,
      offsetX: 0,
      offsetY: -5
    });
    playerContainer.addChild(healthBar);
  } catch (e) {
    console.warn('Failed to create health bar:', e);
  }

  // Initial visibility
  defSprite.visible = true;
  if (hitSprite) hitSprite.visible = false;

  return {
    container: playerContainer,
    sprites: { def: defSprite, hit: hitSprite },
    healthBar
  };
};

// Update player sprite position, direction, and visibility
export const updatePlayerSprite = (refs, playerState, tileSize, healthBarEnabled) => {
  const { container, sprites, healthBar } = refs;
  if (!playerState || !container) return;

  const { def, hit } = sprites || {};

  // Resize child sprites to match player state
  if (def) {
    if (playerState.width) def.width = playerState.width;
    if (playerState.height) def.height = playerState.height;
  }
  if (hit) {
    if (playerState.width) hit.width = playerState.width;
    if (playerState.height) hit.height = playerState.height;
  }

  // Update health bar size and value
  if (healthBar) {
    const enabled = healthBarEnabled !== false;
    const inWater = !!playerState.inWater;
    const inLava = playerState.liquidType === 'lava';
    if (!enabled) {
      healthBar.visible = false;
    } else {
      // When in water or lava, hide the player-attached HB and use overlay version instead
      healthBar.visible = !(inWater || inLava);
      const effectiveWidth = playerState.width || (def?.width) || tileSize;
      healthBar.resize(effectiveWidth, 4);
      healthBar.y = -Math.max(4, Math.floor((playerState.height || def?.height || tileSize) * 0.12));
      healthBar.update(playerState.health, (Number(playerState.maxHealth) || 100));
    }
  }

  // Choose which sprite is visible based on hit timer
  const isHit = Number(playerState.hitTimerMs) > 0 && !!hit;
  if (def) def.visible = !isHit;
  if (hit) hit.visible = isHit;

  // Direction flip is applied to the container
  const dir = playerState.direction || 1;
  const mag = Math.abs(container.scale.x || 1);
  container.scale.x = dir >= 0 ? mag : -mag;

  // Position container; when flipped, offset by width
  const effectiveWidth = playerState.width || (def?.width) || tileSize;
  container.x = Math.round(dir >= 0 ? (playerState.x || 0) : ((playerState.x || 0) + effectiveWidth));
  container.y = Math.round(playerState.y || 0);
};

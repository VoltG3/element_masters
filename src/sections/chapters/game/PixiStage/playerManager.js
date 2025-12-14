import { Sprite, AnimatedSprite, Texture, Container } from 'pixi.js';
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
  if (!spr) {
    const tex = getTexture(def.texture) || Texture.WHITE;
    spr = new Sprite(tex);
  }
  spr.anchor.set(0, 0);
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
  container.x = dir >= 0 ? (playerState.x || 0) : ((playerState.x || 0) + effectiveWidth);
  container.y = playerState.y || 0;
};

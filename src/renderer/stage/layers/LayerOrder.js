// Centralized z-order constants for Pixi stage layers
// Higher numbers render above lower numbers when sortableChildren = true
export const LAYERS = Object.freeze({
  parallax: 10,
  tiles: 20,
  tilesAnim: 25,
  liquidBackground: 28,
  objBehind: 30,
  secretsBelow: 35,
  player: 40,
  liquids: 45,
  liquidFx: 48,
  projectiles: 50,
  objFront: 60,
  secretsAbove: 65,
  weather: 70,
  fog: 80,
  overlay: 110,
});

export default LAYERS;

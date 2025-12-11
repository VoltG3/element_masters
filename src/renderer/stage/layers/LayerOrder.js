// Centralized z-order constants for Pixi stage layers
// Higher numbers render above lower numbers when sortableChildren = true
export const LAYERS = Object.freeze({
  parallax: 10,
  objBehind: 20,
  player: 30,
  projectiles: 40,
  objFront: 50,
  weather: 60,
  fog: 70,
  liquids: 80,
  liquidFx: 90,
  tiles: 100,
  tilesAnim: 110,
  secrets: 115,
  overlay: 120,
});

export default LAYERS;

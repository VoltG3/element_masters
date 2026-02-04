import { Container, Text } from 'pixi.js';
import floatConfig from '../../../../assets/json/system/floating_text.json';

export const createFloatingTextManager = (layer) => {
  const items = [];
  const cfg = floatConfig || {};
  const defaultCfg = cfg.default || {};
  const critCfg = cfg.crit || {};

  const add = ({
    x,
    y,
    text,
    color,
    fontSize = 14,
    ttlMs = 900,
    amount,
    crit
  }) => {
    if (!layer || !Number.isFinite(x) || !Number.isFinite(y) || !text) return;

    const amountValue = Number.isFinite(amount) ? amount : null;
    const critThreshold = Number.isFinite(critCfg.threshold) ? critCfg.threshold : null;
    const isCrit = !!crit || (amountValue !== null && critThreshold !== null && Math.abs(amountValue) >= critThreshold);

    const baseColor = color ? String(color) : (defaultCfg.color || '#ff3b3b');
    const finalColor = isCrit ? (critCfg.color || baseColor) : baseColor;
    const finalFontSize = isCrit ? (critCfg.fontSize || Math.round((defaultCfg.fontSize || fontSize) * 1.2)) : (defaultCfg.fontSize || fontSize);
    const finalTtl = isCrit ? (critCfg.ttlMs || defaultCfg.ttlMs || ttlMs) : (defaultCfg.ttlMs || ttlMs);
    const riseSpeed = isCrit ? (critCfg.riseSpeed || defaultCfg.riseSpeed || 0.04) : (defaultCfg.riseSpeed || 0.04);
    const jitterX = Number.isFinite(defaultCfg.jitterX) ? defaultCfg.jitterX : 6;
    const jitterY = Number.isFinite(defaultCfg.jitterY) ? defaultCfg.jitterY : 2;
    const prefix = isCrit && typeof critCfg.prefix === 'string' ? critCfg.prefix : '';
    const suffix = isCrit && typeof critCfg.suffix === 'string' ? critCfg.suffix : '';
    const finalText = `${prefix}${text}${suffix}`;

    const label = new Text({
      text: String(finalText),
      style: {
        fontFamily: 'monospace',
        fontSize: finalFontSize,
        fill: finalColor,
        stroke: '#000000',
        strokeThickness: 2,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 2,
        dropShadowDistance: 1
      }
    });

    label.anchor.set(0.5, 1);
    const jitterXValue = (Math.random() * 2 - 1) * jitterX;
    const jitterYValue = (Math.random() * 2 - 1) * jitterY;
    label.position.set(x + jitterXValue, y + jitterYValue);
    layer.addChild(label);

    items.push({
      label,
      ttl: finalTtl,
      total: finalTtl,
      vy: -riseSpeed
    });
  };

  const update = (deltaMs) => {
    if (!items.length) return;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.ttl -= deltaMs;
      if (item.ttl <= 0) {
        try { item.label.destroy(); } catch {}
        items.splice(i, 1);
        continue;
      }
      item.label.y += item.vy * deltaMs;
      item.label.alpha = Math.max(0, item.ttl / item.total);
    }
  };

  return { add, update };
};

export const createFloatingTextLayer = () => new Container();

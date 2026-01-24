import { getMeteorBreakEffectConfig } from './meteorBreakEffects';

/**
 * Handles weather effect impacts like meteor strikes, lightning, etc.
 * This logic is decoupled from useGameEngine to allow for easier expansion.
 */
export const handleWeatherEffectHit = (type, data, context) => {
    if (!type || !data || !context) return;
    const { gameState, entitiesRef, onBreakEffect } = context;

    if (type === 'meteor') {
        const { x, y, size, isLarge, surfaceType } = data;
        const damage = isLarge ? 40 : 20;
        const radius = size * 1.5;

        // 1. Check player impact
        if (gameState && gameState.current) {
            const p = gameState.current;
            const dx = (p.x + p.width / 2) - x;
            const dy = (p.y + p.height / 2) - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius + p.width / 2) {
                gameState.current.health = Math.max(0, (Number(gameState.current.health) || 0) - damage);
                gameState.current.hitTimerMs = 500;
                // Add knockback
                if (dist > 0) {
                    gameState.current.vx += (dx / dist) * 10;
                    gameState.current.vy -= 5;
                } else {
                    gameState.current.vy -= 10; // direct hit
                }
            }
        }

        // 2. Check entities impact
        if (entitiesRef && entitiesRef.current) {
            entitiesRef.current.forEach(ent => {
                const edx = (ent.x + ent.width / 2) - x;
                const edy = (ent.y + ent.height / 2) - y;
                const edist = Math.sqrt(edx * edx + edy * edy);

                if (edist < radius + ent.width / 2) {
                    ent.health = Math.max(0, (ent.health || 0) - damage);
                    // Platforms don't take knockback, but others might
                    if (ent.subtype !== 'platform') {
                        if (edist > 0) {
                            ent.vx += (edx / edist) * 8;
                            ent.vy -= 3;
                        } else {
                            ent.vy -= 6;
                        }
                    }
                }
            });
        }

        const breakConfig = getMeteorBreakEffectConfig({ size, surfaceType });
        if (breakConfig && typeof onBreakEffect === 'function') {
            onBreakEffect({ x, y, config: breakConfig });
        }
    }

    // Future weather types can be added here
    // e.g., if (type === 'lightning') { ... }
};

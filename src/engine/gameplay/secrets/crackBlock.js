// Helpers for crack_block secret behavior

export function shouldRemoveCrackBlock(def, newHealth) {
  if (!def || def.type !== 'crack_block') return false;
  const threshold = def.passableHealthThreshold || 0;
  return newHealth <= threshold;
}

export default { shouldRemoveCrackBlock };

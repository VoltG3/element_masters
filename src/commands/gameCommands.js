// Simple command registry for in-game terminal
// Each command: { name, description, handler(input, ctx) => string | void }

const commands = [];

const register = (cmd) => {
  if (!cmd || !cmd.name) return;
  commands.push(cmd);
};

export const listCommands = () => commands.map(c => ({ name: c.name, description: c.description }));

export const executeCommand = (input, context = {}) => {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const [name, ...args] = raw.split(/\s+/);
  const cmd = commands.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (!cmd) {
    return `Unknown command: ${name}. Type 'help' to list commands.`;
  }
  try {
    const res = cmd.handler({ args, raw, context });
    return typeof res === 'string' ? res : '';
  } catch (e) {
    return `Error executing '${name}': ${e?.message || e}`;
  }
};

// Built-in: help
register({
  name: 'help',
  description: 'Show available commands',
  handler() {
    const list = listCommands()
      .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
      .join('\n');
    return list || 'No commands available.';
  }
});

// Built-in: clear
register({
  name: 'clear',
  description: 'Clear terminal output',
  handler() {
    // Signal to UI to clear output; UI can interpret special token
    try { window.dispatchEvent(new CustomEvent('game-terminal-clear')); } catch {}
    return '';
  }
});

// First requested command: settings
register({
  name: 'settings',
  description: "Open the draggable game settings window",
  handler() {
    try { window.dispatchEvent(new CustomEvent('game-open-settings')); } catch {}
    return 'Opening settings...';
  }
});

export default {
  register,
  listCommands,
  executeCommand,
};

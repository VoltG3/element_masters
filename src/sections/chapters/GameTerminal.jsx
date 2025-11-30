import React, { useEffect, useRef, useState } from 'react';
import { executeCommand } from '../../commands/gameCommands';

const panelStyleBase = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  height: '220px',
  backgroundColor: 'rgba(10, 10, 10, 0.95)',
  color: '#d6d6d6',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '12px',
  borderTop: '1px solid #333',
  boxShadow: '0 -6px 16px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 3000,
  transition: 'transform 160ms ease',
};

export default function GameTerminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(["Type 'help' to list commands. Press ESC to close."]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Toggle handler from global events
  useEffect(() => {
    const onToggle = () => setOpen(prev => !prev);
    const onClear = () => setLines([]);
    window.addEventListener('game-toggle-terminal', onToggle);
    window.addEventListener('game-terminal-clear', onClear);
    return () => {
      window.removeEventListener('game-toggle-terminal', onToggle);
      window.removeEventListener('game-terminal-clear', onClear);
    };
  }, []);

  // Track open state globally so input hook can disable movement
  useEffect(() => {
    try { window.__GAME_TERMINAL_OPEN__ = open; } catch {}
    if (open) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open]);

  // Close with ESC when focused
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-scroll to bottom when lines change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, open]);

  const onSubmit = (e) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    setLines(prev => [...prev, `> ${value}`]);
    const res = executeCommand(value, {});
    if (res) setLines(prev => [...prev, res]);
    setInput('');
  };

  const style = {
    ...panelStyleBase,
    transform: open ? 'translateY(0)' : 'translateY(100%)',
  };

  return (
    <div style={style} aria-hidden={!open}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #333', color: '#9cdcfe' }}>
        In-Game Terminal — press T to toggle
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.startsWith('>') ? '#dcdcaa' : '#d6d6d6' }}>{l}</div>
        ))}
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: '6px', padding: '8px', borderTop: '1px solid #333' }}>
        <span style={{ color: '#6a9955' }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #333', padding: '6px 8px', borderRadius: '3px', outline: 'none' }}
        />
        <button type="submit" style={{ background: '#0e639c', color: '#fff', border: '1px solid #0b5c8a', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer' }}>
          Run
        </button>
      </form>
    </div>
  );
}

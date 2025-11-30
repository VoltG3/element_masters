import React, { useEffect, useRef, useState } from 'react';

// Simple draggable, minimizable settings window.
// Opens when the custom event 'game-open-settings' is dispatched (from terminal command `settings`).
// Renders above the game canvas but below the in-game terminal.
export default function GameSettings() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState(() => {
    // Restore last position from localStorage if available
    try {
      const raw = localStorage.getItem('game_settings_pos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { left: 12, top: 64 };
  });

  const [size, setSize] = useState(() => {
    try {
      const raw = localStorage.getItem('game_settings_size');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { width: 300, height: 220 };
  });

  const draggingRef = useRef({ active: false, offsetX: 0, offsetY: 0 });

  // Restore minimized state
  useEffect(() => {
    try {
      const raw = localStorage.getItem('game_settings_min');
      if (raw) setMinimized(raw === '1');
    } catch {}
  }, []);

  // Open handler from global event
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setMinimized(false);
    };
    window.addEventListener('game-open-settings', onOpen);
    return () => window.removeEventListener('game-open-settings', onOpen);
  }, []);

  // Persist position and size/minimized
  useEffect(() => {
    try { localStorage.setItem('game_settings_pos', JSON.stringify(pos)); } catch {}
  }, [pos]);
  useEffect(() => {
    try { localStorage.setItem('game_settings_size', JSON.stringify(size)); } catch {}
  }, [size]);
  useEffect(() => {
    try { localStorage.setItem('game_settings_min', minimized ? '1' : '0'); } catch {}
  }, [minimized]);

  // Drag logic
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current.active) return;
      e.preventDefault();
      const nx = e.clientX - draggingRef.current.offsetX;
      const ny = e.clientY - draggingRef.current.offsetY;
      const maxL = Math.max(0, (window.innerWidth || 0) - size.width - 6);
      const maxT = Math.max(0, (window.innerHeight || 0) - (minimized ? 36 : size.height) - 6);
      setPos({
        left: Math.max(0, Math.min(maxL, nx)),
        top: Math.max(0, Math.min(maxT, ny)),
      });
    };
    const onUp = () => { draggingRef.current.active = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [size.width, size.height, minimized]);

  const onHeaderMouseDown = (e) => {
    draggingRef.current.active = true;
    draggingRef.current.offsetX = e.clientX - pos.left;
    draggingRef.current.offsetY = e.clientY - pos.top;
  };

  const onClose = () => setOpen(false);
  const onMinToggle = () => setMinimized((m) => !m);

  const onResizeMouseDown = (e) => {
    // Simple bottom-right resize drag
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;

    const move = (ev) => {
      const dw = ev.clientX - startX;
      const dh = ev.clientY - startY;
      const nw = Math.max(220, startW + dw);
      const nh = Math.max(140, startH + dh);
      setSize({ width: nw, height: nh });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;

  const panelStyle = {
    position: 'fixed',
    left: pos.left,
    top: pos.top,
    width: size.width,
    height: minimized ? 36 : size.height,
    background: 'rgba(20,20,20,0.96)',
    color: '#eaeaea',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    zIndex: 2600, // below terminal (3000), above canvas/HUD
    display: 'flex',
    flexDirection: 'column',
    userSelect: draggingRef.current.active ? 'none' : 'auto',
    overflow: 'hidden',
  };

  const headerStyle = {
    cursor: 'move',
    background: 'linear-gradient(180deg, #2a2a2a, #1c1c1c)',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #333',
    fontSize: 12,
  };

  const contentStyle = {
    flex: 1,
    display: minimized ? 'none' : 'block',
    padding: 10,
    overflow: 'auto',
    background: 'rgba(10,10,10,0.4)'
  };

  const buttonStyle = {
    background: '#0e639c',
    color: '#fff',
    border: '1px solid #0b5c8a',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    marginLeft: 6,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onMouseDown={onHeaderMouseDown}>
        <div style={{ fontWeight: 600, color: '#9cdcfe' }}>Game Settings</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={onMinToggle} title={minimized ? 'Expand' : 'Minimize'} style={buttonStyle}>
            {minimized ? '▢' : '—'}
          </button>
          <button onClick={onClose} title="Close" style={{ ...buttonStyle, background: '#a33', borderColor: '#822' }}>✕</button>
        </div>
      </div>

      <div style={contentStyle}>
        {/* Example settings content — extend as needed */}
        <section style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Audio</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, width: 120 }}>Master Volume</label>
            <input type="range" min="0" max="1" step="0.01" defaultValue={0.7} />
          </div>
        </section>
        <section style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Graphics</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <label style={{ fontSize: 12, width: 120 }}>Parallax Factor</label>
            <input type="range" min="0" max="1" step="0.05" defaultValue={0.3} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, width: 120 }}>VSync</label>
            <input type="checkbox" defaultChecked />
          </div>
        </section>
        <section>
          <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Gameplay</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, width: 120 }}>Invert Jump (W)</label>
            <input type="checkbox" />
          </div>
        </section>
      </div>

      {/* Resize handle */}
      {!minimized && (
        <div
          onMouseDown={onResizeMouseDown}
          title="Resize"
          style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize',
                   background: 'linear-gradient(135deg, transparent 0, transparent 50%, #666 50%, #666 100%)' }}
        />
      )}
    </div>
  );
}

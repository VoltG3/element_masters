import React, { useEffect, useRef, useState } from 'react';

// Simple draggable, minimizable settings window.
// Opens when the custom event 'game-open-settings' is dispatched (from terminal command `settings`).
// Renders above the game canvas but below the in-game terminal.
export default function GameSettings() {
  // Runtime-linked settings (live updates)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('game_settings_tab') || 'Audio';
    } catch {}
    return 'Audio';
  });
  const [parallax, setParallax] = useState(() => {
    try {
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.backgroundParallaxFactor === 'number') return g.backgroundParallaxFactor;
    } catch {}
    return 0.3;
  });
  const [rain, setRain] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_rain');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherRain === 'number') return Math.max(0, Math.min(100, g.weatherRain));
    } catch {}
    return 0;
  });
  const [snow, setSnow] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_snow');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherSnow === 'number') return Math.max(0, Math.min(100, g.weatherSnow));
    } catch {}
    return 0;
  });
  const [clouds, setClouds] = useState(() => {
    try {
      // New key first
      const lsNew = localStorage.getItem('game_weather_clouds');
      if (lsNew !== null) return Math.max(0, Math.min(100, parseInt(lsNew, 10) || 0));
      // Backward compatibility: read old fog key if exists
      const lsOld = localStorage.getItem('game_weather_fog');
      if (lsOld !== null) return Math.max(0, Math.min(100, parseInt(lsOld, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      // Prefer clouds but also accept legacy fog
      if (g && typeof g.weatherClouds === 'number') return Math.max(0, Math.min(100, g.weatherClouds));
      if (g && typeof g.weatherFog === 'number') return Math.max(0, Math.min(100, g.weatherFog));
    } catch {}
    return 0;
  });
  // New: Thunder (Lightning) intensity 0..100
  const [thunder, setThunder] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_thunder');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherThunder === 'number') return Math.max(0, Math.min(100, g.weatherThunder));
    } catch {}
    return 0;
  });
  // New: dedicated Fog density (0..100)
  const [fog, setFog] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_fog');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherFog === 'number') return Math.max(0, Math.min(100, g.weatherFog));
    } catch {}
    return 0;
  });
  // New: Lava Rain (0..100)
  const [lavaRain, setLavaRain] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_lavarain');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherLavaRain === 'number') return Math.max(0, Math.min(100, g.weatherLavaRain));
    } catch {}
    return 0;
  });
  // New: Radioactive Fog (0..100)
  const [radioactiveFog, setRadioactiveFog] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_radioactivefog');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherRadioactiveFog === 'number') return Math.max(0, Math.min(100, g.weatherRadioactiveFog));
    } catch {}
    return 0;
  });
  // New: Meteor Rain (0..100)
  const [meteorRain, setMeteorRain] = useState(() => {
    try {
      const ls = localStorage.getItem('game_weather_meteorrain');
      if (ls !== null) return Math.max(0, Math.min(100, parseInt(ls, 10) || 0));
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.weatherMeteorRain === 'number') return Math.max(0, Math.min(100, g.weatherMeteorRain));
    } catch {}
    return 0;
  });
  // UI: Health bar visibility
  const [healthBarEnabled, setHealthBarEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_ui_healthbar');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.healthBarEnabled === 'boolean') return g.healthBarEnabled;
    } catch {}
    return true;
  });
  // UI: Oxygen/Lava bars visibility
  const [oxygenBarEnabled, setOxygenBarEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_ui_oxygenbar');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.oxygenBarEnabled === 'boolean') return g.oxygenBarEnabled;
    } catch {}
    return true;
  });
  const [lavaBarEnabled, setLavaBarEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_ui_lavabar');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.lavaBarEnabled === 'boolean') return g.lavaBarEnabled;
    } catch {}
    return true;
  });
  const [debugOverlayEnabled, setDebugOverlayEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_debug_overlay');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.debugOverlayEnabled === 'boolean') return g.debugOverlayEnabled;
    } catch {}
    return false;
  });
  // FX toggles
  const [waterSplashesEnabled, setWaterSplashesEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_fx_water_splashes');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.waterSplashesEnabled === 'boolean') return g.waterSplashesEnabled;
    } catch {}
    return true;
  });
  const [lavaEmbersEnabled, setLavaEmbersEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_fx_lava_embers');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.lavaEmbersEnabled === 'boolean') return g.lavaEmbersEnabled;
    } catch {}
    return true;
  });
  const [roomBlurEnabled, setRoomBlurEnabled] = useState(() => {
    try {
      const ls = localStorage.getItem('game_graphics_room_blur');
      if (ls !== null) return ls !== '0';
      const g = window.__GAME_RUNTIME_SETTINGS__;
      if (g && typeof g.roomBlurEnabled === 'boolean') return g.roomBlurEnabled;
    } catch {}
    return true;
  });
  const [showCoordinates, setShowCoordinates] = useState(() => {
    try {
      const ls = localStorage.getItem('game_ui_show_coords');
      return ls === '1';
    } catch {}
    return false;
  });

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

  // Helper: clamp position so the window stays within viewport (with small margin)
  const clampPos = (p, sz, isMin) => {
    const margin = 12;
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 0) || 0;
    const vh = (typeof window !== 'undefined' ? window.innerHeight : 0) || 0;
    const maxL = Math.max(0, vw - (sz?.width || 300) - margin);
    const maxT = Math.max(0, vh - (isMin ? 36 : (sz?.height || 220)) - margin);
    let left = Number(p?.left);
    let top = Number(p?.top);
    if (!Number.isFinite(left)) left = margin;
    if (!Number.isFinite(top)) top = margin;
    left = Math.max(0, Math.min(maxL, left));
    top = Math.max(0, Math.min(maxT, top));
    return { left, top };
  };

  // Restore minimized state
  useEffect(() => {
    try {
      const raw = localStorage.getItem('game_settings_min');
      if (raw) setMinimized(raw === '1');
    } catch {}
  }, []);

  // Listen for runtime settings updates from game engine or other sources
  useEffect(() => {
    const onSettingsUpdate = (e) => {
      const patch = (e && e.detail) || {};
      if (patch.weatherRain !== undefined) setRain(patch.weatherRain);
      if (patch.weatherSnow !== undefined) setSnow(patch.weatherSnow);
      if (patch.weatherClouds !== undefined) setClouds(patch.weatherClouds);
      if (patch.weatherFog !== undefined) setFog(patch.weatherFog);
      if (patch.weatherThunder !== undefined) setThunder(patch.weatherThunder);
      if (patch.weatherLavaRain !== undefined) setLavaRain(patch.weatherLavaRain);
      if (patch.weatherRadioactiveFog !== undefined) setRadioactiveFog(patch.weatherRadioactiveFog);
      if (patch.weatherMeteorRain !== undefined) setMeteorRain(patch.weatherMeteorRain);
      if (patch.backgroundParallaxFactor !== undefined) setParallax(patch.backgroundParallaxFactor);
      if (patch.roomBlurEnabled !== undefined) setRoomBlurEnabled(!!patch.roomBlurEnabled);
      if (patch.healthBarEnabled !== undefined) setHealthBarEnabled(!!patch.healthBarEnabled);
      if (patch.oxygenBarEnabled !== undefined) setOxygenBarEnabled(!!patch.oxygenBarEnabled);
      if (patch.lavaBarEnabled !== undefined) setLavaBarEnabled(!!patch.lavaBarEnabled);
      if (patch.waterSplashesEnabled !== undefined) setWaterSplashesEnabled(!!patch.waterSplashesEnabled);
      if (patch.lavaEmbersEnabled !== undefined) setLavaEmbersEnabled(!!patch.lavaEmbersEnabled);
      if (patch.debugOverlayEnabled !== undefined) setDebugOverlayEnabled(!!patch.debugOverlayEnabled);
    };
    window.addEventListener('game-settings-update', onSettingsUpdate);
    return () => window.removeEventListener('game-settings-update', onSettingsUpdate);
  }, []);

  // Open handler from global event
  useEffect(() => {
    const onOpen = () => {
      // Ensure the window will be visible even if saved pos was off-screen
      setPos((p) => clampPos(p, size, false));
      setOpen(true);
      setMinimized(false);
      // Sync current values from global when opening
      try {
        const g = window.__GAME_RUNTIME_SETTINGS__ || {};
        if (typeof g.backgroundParallaxFactor === 'number') {
          setParallax(g.backgroundParallaxFactor);
        }
        if (typeof g.roomBlurEnabled === 'boolean') {
          setRoomBlurEnabled(g.roomBlurEnabled);
        }
        if (typeof g.weatherRain === 'number') setRain(Math.max(0, Math.min(100, g.weatherRain)));
        if (typeof g.weatherSnow === 'number') setSnow(Math.max(0, Math.min(100, g.weatherSnow)));
        if (typeof g.weatherClouds === 'number') setClouds(Math.max(0, Math.min(100, g.weatherClouds)));
        if (typeof g.weatherFog === 'number') setFog(Math.max(0, Math.min(100, g.weatherFog)));
        if (typeof g.weatherThunder === 'number') setThunder(Math.max(0, Math.min(100, g.weatherThunder)));
        if (typeof g.weatherLavaRain === 'number') setLavaRain(Math.max(0, Math.min(100, g.weatherLavaRain)));
        if (typeof g.weatherRadioactiveFog === 'number') setRadioactiveFog(Math.max(0, Math.min(100, g.weatherRadioactiveFog)));
        if (typeof g.weatherMeteorRain === 'number') setMeteorRain(Math.max(0, Math.min(100, g.weatherMeteorRain)));
        if (typeof g.healthBarEnabled === 'boolean') setHealthBarEnabled(!!g.healthBarEnabled);
        if (typeof g.oxygenBarEnabled === 'boolean') setOxygenBarEnabled(!!g.oxygenBarEnabled);
        if (typeof g.lavaBarEnabled === 'boolean') setLavaBarEnabled(!!g.lavaBarEnabled);
        if (typeof g.waterSplashesEnabled === 'boolean') setWaterSplashesEnabled(!!g.waterSplashesEnabled);
        if (typeof g.lavaEmbersEnabled === 'boolean') setLavaEmbersEnabled(!!g.lavaEmbersEnabled);
        if (typeof g.debugOverlayEnabled === 'boolean') setDebugOverlayEnabled(!!g.debugOverlayEnabled);
      } catch {}
      // Auto-close the in-game terminal when settings opens
      try { window.dispatchEvent(new CustomEvent('game-close-terminal')); } catch {}
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
  useEffect(() => {
    try { localStorage.setItem('game_settings_tab', String(activeTab)); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try { localStorage.setItem('game_ui_show_coords', showCoordinates ? '1' : '0'); } catch {}
  }, [showCoordinates]);

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

  // Re-clamp into viewport when window resizes while settings are open
  useEffect(() => {
    if (!open) return;
    const onResize = () => setPos((p) => clampPos(p, size, minimized));
    window.addEventListener('resize', onResize);
    // Run once immediately to correct if needed
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [open, size.width, size.height, minimized]);

  const onHeaderMouseDown = (e) => {
    draggingRef.current.active = true;
    draggingRef.current.offsetX = e.clientX - pos.left;
    draggingRef.current.offsetY = e.clientY - pos.top;
  };

  const onClose = () => setOpen(false);
  const onMinToggle = () => setMinimized((m) => !m);

  const emitUpdate = (patch) => {
    try {
      window.dispatchEvent(new CustomEvent('game-settings-update', { detail: patch }));
      // Mirror into a global bag for components that want to read without listeners
      window.__GAME_RUNTIME_SETTINGS__ = {
        ...(window.__GAME_RUNTIME_SETTINGS__ || {}),
        ...patch,
      };
    } catch {}
  };

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

  const tabsBarStyle = {
    display: minimized ? 'none' : 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderBottom: '1px solid #2a2a2a',
    background: 'rgba(0,0,0,0.25)',
    whiteSpace: 'nowrap',
    overflowX: 'auto'
  };
  const tabBtnStyle = (tab) => ({
    background: activeTab === tab ? '#1e1e1e' : 'transparent',
    color: activeTab === tab ? '#9cdcfe' : '#ddd',
    border: activeTab === tab ? '1px solid #3a3a3a' : '1px solid transparent',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
  });

  const renderAudio = () => (
    <section style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Audio</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, width: 120 }}>Master Volume</label>
        <input type="range" min="0" max="1" step="0.01" defaultValue={0.7} />
      </div>
    </section>
  );

  const renderGraphics = () => (
    <>
      <section style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Graphics</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Parallax Factor</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={Number.isFinite(parallax) ? parallax : 0.3}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setParallax(v);
              emitUpdate({ backgroundParallaxFactor: v });
            }}
          />
          <span style={{ fontSize: 12, width: 40, textAlign: 'right' }}>{(Number.isFinite(parallax) ? parallax : 0.3).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, width: 120 }}>VSync</label>
          <input type="checkbox" defaultChecked />
        </div>
      </section>
      {/* Keep existing Gameplay controls inside Graphics tab for now */}
      <section>
        <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Gameplay</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, width: 120 }}>Invert Jump (W)</label>
          <input type="checkbox" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Show Health Bar</label>
          <input
            type="checkbox"
            checked={!!healthBarEnabled}
            onChange={(e) => {
              const v = !!e.target.checked;
              setHealthBarEnabled(v);
              try { localStorage.setItem('game_ui_healthbar', v ? '1' : '0'); } catch {}
              emitUpdate({ healthBarEnabled: v });
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Show Oxygen Bar</label>
          <input
            type="checkbox"
            checked={!!oxygenBarEnabled}
            onChange={(e) => {
              const v = !!e.target.checked;
              setOxygenBarEnabled(v);
              try { localStorage.setItem('game_ui_oxygenbar', v ? '1' : '0'); } catch {}
              emitUpdate({ oxygenBarEnabled: v });
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Show Lava Bar</label>
          <input
            type="checkbox"
            checked={!!lavaBarEnabled}
            onChange={(e) => {
              const v = !!e.target.checked;
              setLavaBarEnabled(v);
              try { localStorage.setItem('game_ui_lavabar', v ? '1' : '0'); } catch {}
              emitUpdate({ lavaBarEnabled: v });
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Water Splashes</label>
          <input
            type="checkbox"
            checked={!!waterSplashesEnabled}
            onChange={(e) => {
              const v = !!e.target.checked;
              setWaterSplashesEnabled(v);
              try { localStorage.setItem('game_fx_water_splashes', v ? '1' : '0'); } catch {}
              emitUpdate({ waterSplashesEnabled: v });
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Blur in Room</label>
          <input
            type="checkbox"
            checked={!!roomBlurEnabled}
            onChange={(e) => {
              const v = !!e.target.checked;
              setRoomBlurEnabled(v);
              try { localStorage.setItem('game_graphics_room_blur', v ? '1' : '0'); } catch {}
              emitUpdate({ roomBlurEnabled: v });
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <label style={{ fontSize: 12, width: 120 }}>Show Coordinates</label>
          <input
            type="checkbox"
            checked={!!showCoordinates}
            onChange={(e) => {
              const v = !!e.target.checked;
              setShowCoordinates(v);
              emitUpdate({ showCoordinates: v });
            }}
          />
        </div>
        {showCoordinates && (
          <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#4ec9b0' }}>
            Pos: X={Math.round(window.__PLAYER_POS__?.x || 0)}, Y={Math.round(window.__PLAYER_POS__?.y || 0)}
          </div>
        )}
      </section>
    </>
  );

  const renderWeather = () => (
    <section style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Weather</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Lietus (Rain)</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(rain) ? rain : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setRain(v);
            try { localStorage.setItem('game_weather_rain', String(v)); } catch {}
            emitUpdate({ weatherRain: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(rain) ? rain : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Sniegs (Snow)</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(snow) ? snow : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setSnow(v);
            try { localStorage.setItem('game_weather_snow', String(v)); } catch {}
            emitUpdate({ weatherSnow: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(snow) ? snow : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Migla (Fog)</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(fog) ? fog : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setFog(v);
            try { localStorage.setItem('game_weather_fog', String(v)); } catch {}
            emitUpdate({ weatherFog: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(fog) ? fog : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Zibens (Thunder)</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(thunder) ? thunder : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setThunder(v);
            try { localStorage.setItem('game_weather_thunder', String(v)); } catch {}
            emitUpdate({ weatherThunder: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(thunder) ? thunder : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Mākoņi (Clouds)</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(clouds) ? clouds : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setClouds(v);
            try { localStorage.setItem('game_weather_clouds', String(v)); } catch {}
            emitUpdate({ weatherClouds: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(clouds) ? clouds : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Lavas lietus</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(lavaRain) ? lavaRain : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setLavaRain(v);
            try { localStorage.setItem('game_weather_lavarain', String(v)); } catch {}
            emitUpdate({ weatherLavaRain: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(lavaRain) ? lavaRain : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, width: 120 }}>Radioakt. migla</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(radioactiveFog) ? radioactiveFog : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setRadioactiveFog(v);
            try { localStorage.setItem('game_weather_radioactivefog', String(v)); } catch {}
            emitUpdate({ weatherRadioactiveFog: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(radioactiveFog) ? radioactiveFog : 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, width: 120 }}>Meteorītu lietus</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Number.isFinite(meteorRain) ? meteorRain : 0}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            setMeteorRain(v);
            try { localStorage.setItem('game_weather_meteorrain', String(v)); } catch {}
            emitUpdate({ weatherMeteorRain: v });
          }}
        />
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{Number.isFinite(meteorRain) ? meteorRain : 0}</span>
      </div>
    </section>
  );

  const renderDebug = () => (
    <section style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, marginBottom: 6, color: '#d6d6d6' }}>Debug</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, width: 160 }}>Show Debug Overlay</label>
        <input
          type="checkbox"
          checked={!!debugOverlayEnabled}
          onChange={(e) => {
            const v = !!e.target.checked;
            setDebugOverlayEnabled(v);
            try { localStorage.setItem('game_debug_overlay', v ? '1' : '0'); } catch {}
            emitUpdate({ debugOverlayEnabled: v });
          }}
        />
      </div>
    </section>
  );

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

      {/* Tabs bar: one-line menu */}
      <div style={tabsBarStyle}>
        {['Audio','Graphics','Weather','Debug'].map((t) => (
          <button key={t} style={tabBtnStyle(t)} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      <div style={contentStyle}>
        {activeTab === 'Audio' && renderAudio()}
        {activeTab === 'Graphics' && renderGraphics()}
        {activeTab === 'Weather' && renderWeather()}
        {activeTab === 'Debug' && renderDebug()}
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

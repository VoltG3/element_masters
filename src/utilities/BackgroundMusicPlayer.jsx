import React, { useEffect, useRef } from 'react';

// Lightweight background music player that resolves a meta path like
// "/sound/background/track.ogg" to a build URL via require.context and
// plays/pauses a looping HTMLAudioElement.
// Props:
// - metaPath: string | null — stored in map meta (e.g., "/sound/background/foo.ogg")
// - enabled: boolean — global sound toggle
// - volume: number (0..1)
// - isInsideRoom: boolean — apply muffled effect
export default function BackgroundMusicPlayer({ metaPath, enabled = false, volume = 0.6, isInsideRoom = false }) {
  const audioRef = useRef(null);
  const currentSrcRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const filterNodeRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Resolve ogg assets from src/assets/sound/background
  let musicContext = null;
  try {
    // utilities -> ../assets/sound/background
    musicContext = require.context('../assets/sound/background', false, /\.(ogg|mp3|wav|m4a)$/i);
  } catch (e) {
    musicContext = null;
  }

  const resolveUrl = (path) => {
    if (!path) return null;
    const name = path.split('/').pop();
    if (!name) return null;
    if (musicContext) {
      try {
        const mod = musicContext(`./${name}`);
        return mod.default || mod;
      } catch (e) {
        console.warn(`Background music not found: ${name}`);
      }
    }
    return null;
  };

  const cleanup = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
        currentSrcRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        sourceNodeRef.current = null;
        filterNodeRef.current = null;
        gainNodeRef.current = null;
      }
    } catch {}
  };

  const setupWebAudio = (audio) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      filter.type = 'lowpass';
      filter.frequency.value = isInsideRoom ? 800 : 22000;
      gain.gain.value = isInsideRoom ? 0.5 : 1.0;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      filterNodeRef.current = filter;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('Web Audio setup failed:', e);
    }
  };

  // Build/rebuild audio element when metaPath changes
  useEffect(() => {
    const url = resolveUrl(metaPath);

    // If unchanged, just update enabled/volume in next effect
    if (url && currentSrcRef.current === url && audioRef.current) {
      return () => {};
    }

    // Rebuild
    cleanup();
    if (!url) return () => {};

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    audioRef.current = audio;
    currentSrcRef.current = url;

    // Web Audio setup for filters
    setupWebAudio(audio);

    // Try to pre-play if enabled (may be blocked by autoplay policy)
    if (enabled) {
      audio.play().catch(() => {
        // Will try again on explicit user gesture via custom event
      });
    }

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaPath]);

  // React to enabled/volume/room changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Direct audio volume (without Web Audio or as fallback)
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    
    // Web Audio updates
    if (audioCtxRef.current) {
      if (filterNodeRef.current) {
        filterNodeRef.current.frequency.setTargetAtTime(isInsideRoom ? 800 : 22000, audioCtxRef.current.currentTime, 0.1);
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(isInsideRoom ? 0.4 : 1.0, audioCtxRef.current.currentTime, 0.1);
      }
      if (audioCtxRef.current.state === 'suspended' && enabled) {
        audioCtxRef.current.resume().catch(() => {});
      }
    }

    if (enabled) {
      // Attempt to play; may require user gesture
      audio.play().catch(() => {
        // try again on gesture event
      });
    } else {
      try { audio.pause(); } catch {}
    }
  }, [enabled, volume, isInsideRoom]);

  // Listen for a gesture-driven event to force playback immediately in handler
  useEffect(() => {
    const onGesture = () => {
      const audio = audioRef.current;
      if (audio && enabled) {
        audio.play().catch(() => {});
      }
    };
    const onToggle = (e) => {
      const val = !!(e && e.detail && e.detail.enabled);
      const audio = audioRef.current;
      if (!audio) return;
      if (val) {
        audio.play().catch(() => {});
      } else {
        try { audio.pause(); } catch {}
      }
    };
    window.addEventListener('game-sound-user-gesture', onGesture);
    window.addEventListener('game-sound-toggle', onToggle);
    return () => {
      window.removeEventListener('game-sound-user-gesture', onGesture);
      window.removeEventListener('game-sound-toggle', onToggle);
    };
  }, [enabled]);

  return null;
}

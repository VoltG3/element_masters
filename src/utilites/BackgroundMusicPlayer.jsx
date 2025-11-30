import React, { useEffect, useRef } from 'react';

// Lightweight background music player that resolves a meta path like
// "/sound/background/track.ogg" to a build URL via require.context and
// plays/pauses a looping HTMLAudioElement.
// Props:
// - metaPath: string | null — stored in map meta (e.g., "/sound/background/foo.ogg")
// - enabled: boolean — global sound toggle
// - volume: number (0..1)
export default function BackgroundMusicPlayer({ metaPath, enabled = false, volume = 0.6 }) {
  const audioRef = useRef(null);
  const currentSrcRef = useRef(null);

  // Resolve ogg assets primarily from src/assets/sound/background, fallback to src/sound/background
  let musicContextPrimary = null;
  let musicContextFallback = null;
  try {
    // utilites -> ../assets/sound/background
    musicContextPrimary = require.context('../assets/sound/background', false, /\.ogg$/);
  } catch (e) {
    musicContextPrimary = null;
  }
  try {
    // legacy location
    musicContextFallback = require.context('../sound/background', false, /\.ogg$/);
  } catch (e) {
    musicContextFallback = null;
  }

  const resolveUrl = (path) => {
    if (!path) return null;
    const name = path.split('/').pop();
    if (!name) return null;
    // Prefer primary assets folder
    if (musicContextPrimary) {
      try {
        const mod = musicContextPrimary(`./${name}`);
        return mod.default || mod;
      } catch {}
    }
    // Fallback legacy folder
    if (musicContextFallback) {
      try {
        const mod = musicContextFallback(`./${name}`);
        return mod.default || mod;
      } catch {}
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
    } catch {}
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

    // Try to pre-play if enabled (may be blocked by autoplay policy)
    if (enabled) {
      audio.play().catch(() => {
        // Will try again on explicit user gesture via custom event
      });
    }

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaPath]);

  // React to enabled/volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (enabled) {
      // Attempt to play; may require user gesture
      audio.play().catch(() => {
        // try again on gesture event
      });
    } else {
      try { audio.pause(); } catch {}
    }
  }, [enabled, volume]);

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

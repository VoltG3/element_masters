// Audio utilities extracted from useGameEngine.js

// Usage: playSfx({ soundEnabledRef, audioCtxRef, audioCtxUnlockedRef }, url, volume)
export function playSfx(ctx, url, volume) {
  const { soundEnabledRef, audioCtxRef } = ctx || {};
  try {
    if (!soundEnabledRef?.current) return;
    const vol = Math.max(0, Math.min(1, volume ?? 1));
    // 1) Try HTMLAudio first
    if (url && typeof url === 'string' && url.length > 0) {
      try {
        const audio = new Audio(url);
        audio.volume = vol;
        audio.addEventListener?.('error', () => {
          try { audio.pause(); } catch {}
          beepFallback(ctx, vol);
        }, { once: true });
        const p = audio.play?.();
        if (p && typeof p.catch === 'function') p.catch(() => beepFallback(ctx, vol));
        return;
      } catch {
        // fallback below
      }
    }
    // 2) Fallback beep via WebAudio
    beepFallback(ctx, vol);
  } catch {}
}

export function beepFallback(ctx, vol) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx?.audioCtxRef) return;
    if (!ctx.audioCtxRef.current) ctx.audioCtxRef.current = new AC();
    const audioCtx = ctx.audioCtxRef.current;
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume?.();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    // short square click ~520Hz for ~90ms
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.05, (vol ?? 0.2) * 0.2), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

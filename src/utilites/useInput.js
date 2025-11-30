import { useEffect, useRef } from 'react';

export const useInput = () => {
    const keys = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        space: false
    });

    useEffect(() => {
        const isTerminalOpen = () => {
            try { return !!window.__GAME_TERMINAL_OPEN__; } catch { return false; }
        };

        const clearKeys = () => {
            keys.current.w = false;
            keys.current.a = false;
            keys.current.s = false;
            keys.current.d = false;
            keys.current.space = false;
        };

        const handleKeyDown = (e) => {
            // Do not toggle when typing into inputs/textareas/contenteditable
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);

            // Toggle in-game terminal with 'T'
            if (!typing && e.code === 'KeyT' && !e.repeat) {
                try { window.dispatchEvent(new CustomEvent('game-toggle-terminal')); } catch {}
                clearKeys();
                // prevent game movement while toggling
                if (typeof e.preventDefault === 'function') e.preventDefault();
                return;
            }

            // Prevent browser scrolling / focus hijack for game controls only when NOT typing and terminal is closed
            if (!typing && !isTerminalOpen()) {
                switch (e.code) {
                    case 'KeyW':
                    case 'ArrowUp':
                    case 'KeyA':
                    case 'ArrowLeft':
                    case 'KeyS':
                    case 'ArrowDown':
                    case 'KeyD':
                    case 'ArrowRight':
                    case 'Space':
                        if (typeof e.preventDefault === 'function') e.preventDefault();
                        break;
                    default:
                        break;
                }
            }

            // If terminal is open, ignore gameplay inputs so player doesn't move while typing
            if (isTerminalOpen()) return;

            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    keys.current.w = true; break;
                case 'KeyA':
                case 'ArrowLeft':
                    keys.current.a = true; break;
                case 'KeyS':
                case 'ArrowDown':
                    keys.current.s = true; break;
                case 'KeyD':
                case 'ArrowRight':
                    keys.current.d = true; break;
                case 'Space': keys.current.space = true; break;
                default: break;
            }
        };

        const handleKeyUp = (e) => {
            // Allow closing terminal with Escape (terminal component also handles it)
            if (e.code === 'Escape') return;

            if (isTerminalOpen()) {
                // When terminal is open, we do not change gameplay key states here
                return;
            }

            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    keys.current.w = false; break;
                case 'KeyA':
                case 'ArrowLeft':
                    keys.current.a = false; break;
                case 'KeyS':
                case 'ArrowDown':
                    keys.current.s = false; break;
                case 'KeyD':
                case 'ArrowRight':
                    keys.current.d = false; break;
                case 'Space': keys.current.space = false; break;
                default: break;
            }
        };

        const onToggleTerminal = () => clearKeys();

        // non-passive to allow preventDefault on Space/Arrow keys
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp, { passive: false });
        window.addEventListener('game-toggle-terminal', onToggleTerminal);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { passive: false });
            window.removeEventListener('keyup', handleKeyUp, { passive: false });
            window.removeEventListener('game-toggle-terminal', onToggleTerminal);
        };
    }, []);

    return keys;
};
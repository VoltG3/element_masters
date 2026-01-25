import styled from "styled-components"
import { useTranslation } from "react-i18next"
import { useState, useRef, useEffect } from "react"

const NavButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;

    background-color: transparent;
    color: lightgray;
    border: 1px solid rgba(255, 255, 255, 0.3);
    //height: 36px;              /* fiksēts augstums desktop */
    padding: 0 10px;           /* horizontālais padding */
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    border-radius: 0;
    height: 36px;

    &:hover {
        background-color: #f4c542;
        color: #2a2a2a;
        border-color: #f4c542;
    }

    &.active {
        background-color: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.5);
        color: black;
    }
`

const SettingsButton = styled(NavButton)`
    ${props => props.$soundOff ? `
        animation: soundOffPulse 2s ease-in-out infinite;
        @keyframes soundOffPulse {
            0% { box-shadow: 0 0 0 rgba(86, 255, 138, 0.0); border-color: rgba(86, 255, 138, 0.3); color: #7dffb4; }
            50% { box-shadow: 0 0 12px rgba(86, 255, 138, 0.5); border-color: rgba(86, 255, 138, 0.9); color: #e8fff2; }
            100% { box-shadow: 0 0 0 rgba(86, 255, 138, 0.0); border-color: rgba(86, 255, 138, 0.3); color: #7dffb4; }
        }
    ` : ''}
`;

const DropdownContainer = styled.div`
    position: relative;
    display: flex;
`

const DropdownMenu = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    background-color: #333;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 10px;
    z-index: 2000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    min-width: 150px;
    margin-top: 5px;
`

const MenuItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    color: white;
    font-size: 12px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
        background-color: #444;
    }
`

const ToggleSwitch = styled.div`
    width: 34px;
    height: 18px;
    background-color: ${props => props.$active ? '#f4c542' : '#666'};
    border-radius: 9px;
    position: relative;
    transition: background-color 0.3s;

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${props => props.$active ? '18px' : '2px'};
        width: 14px;
        height: 14px;
        background-color: white;
        border-radius: 50%;
        transition: left 0.3s;
    }
`

export default function SectionHeaderNavigationLanguages() {
    const { i18n } = useTranslation();
    const dropdownRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            const v = localStorage.getItem('game_sound_enabled');
            if (v === null) return false;
            return v !== '0';
        } catch {
            return false;
        }
    });

    const currentLang = i18n.language || 'en'

    const handleLanguageChange = (newLang) => {
        i18n.changeLanguage(newLang)
    }

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        try { localStorage.setItem('game_sound_enabled', next ? '1' : '0'); } catch {}
        try { window.dispatchEvent(new CustomEvent('game-sound-toggle', { detail: { enabled: next } })); } catch {}
        try { window.dispatchEvent(new CustomEvent('game-sound-user-gesture')); } catch {}
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav style={{ display: "flex", gap: "0" }}>
            <NavButton
                className={currentLang === 'lv' ? 'active' : ''}
                onClick={() => handleLanguageChange('lv')}
            >
                LV
            </NavButton>

            <NavButton
                className={currentLang === 'no' ? 'active' : ''}
                onClick={() => handleLanguageChange('no')}
            >
                NO
            </NavButton>

            <NavButton
                className={currentLang === 'en' ? 'active' : ''}
                onClick={() => handleLanguageChange('en')}
            >
                EN
            </NavButton>

            <NavButton
                className={currentLang === 'ru' ? 'active' : ''}
                onClick={() => handleLanguageChange('ru')}
            >
                RU
            </NavButton>

            <NavButton
                className={currentLang === 'ja' ? 'active' : ''}
                onClick={() => handleLanguageChange('ja')}
            >
                JA
            </NavButton>

            <DropdownContainer ref={dropdownRef}>
                <SettingsButton
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    title="Settings"
                    $soundOff={!soundEnabled}
                >
                    ⚙️
                </SettingsButton>
                {isMenuOpen && (
                    <DropdownMenu>
                        <MenuItem onClick={toggleSound}>
                            <span>Sound Effects</span>
                            <ToggleSwitch $active={soundEnabled} />
                        </MenuItem>
                        <div style={{ height: '1px', backgroundColor: '#444', margin: '5px 0' }} />
                        <div style={{ padding: '5px 8px', fontSize: '10px', color: '#888' }}>
                            GAME SETTINGS
                        </div>
                    </DropdownMenu>
                )}
            </DropdownContainer>
        </nav>
    )
}

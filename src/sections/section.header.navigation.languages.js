import styled from "styled-components"
import { useTranslation } from "react-i18next"

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

export default function SectionHeaderNavigationLanguages() {
    const { i18n } = useTranslation();
    const currentLang = i18n.language || 'en'

    const handleLanguageChange = (newLang) => {
        i18n.changeLanguage(newLang)
    }

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
        </nav>
    )
}
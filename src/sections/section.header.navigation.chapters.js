import styled from "styled-components"
import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"

export const NavLinkButton = styled(NavLink)`
    display: flex;
    align-items: center;
    justify-content: center;

    background-color: transparent;
    color: lightgray;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 0 10px;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    border-radius: 0;
    text-decoration: none;

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

export function SectionHeaderNavigationChapters() {
    const { t } = useTranslation("navigation");
    const chapter_home = t("NAVIGATION_HOME")
    const chapter_game = t("NAVIGATION_NEW_GAME")
    const chapter_editor = t("NAVIGATION_EDITOR")
    const chapter_crystals = t("NAVIGATION_CRYSTALS")
    const chapter_repository = t("NAVIGATION_REPOSITORY")

    return (
        <nav style={{ display: "flex", gap: "0" }}>
            <NavLinkButton to="/" className={({ isActive }) => isActive ? "active" : ""}>
                { chapter_home }
            </NavLinkButton>

            <NavLinkButton to="/game" className={({ isActive }) => isActive ? "active" : ""}>
                { chapter_game }
            </NavLinkButton>

            <NavLinkButton to="/editor" className={({ isActive }) => isActive ? "active" : ""}>
                { chapter_editor }
            </NavLinkButton>

            <NavLinkButton to="/crystals" className={({ isActive }) => isActive ? "active" : ""}>
                { chapter_crystals }
            </NavLinkButton>

            <NavLinkButton to="/repository" className={({ isActive }) => isActive ? "active" : ""}>
                { chapter_repository }
            </NavLinkButton>
        </nav>
    )
}

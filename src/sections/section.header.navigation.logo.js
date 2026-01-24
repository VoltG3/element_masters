import styled from "styled-components"

const StyledLogo = styled.p`
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-transform: uppercase;
    margin: 0;
    line-height: 1.1;

    .tagline {
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        opacity: 0.7;
    }
`

export function SectionHeaderNavigationLogo() {
    const tag = (process.env.APP_GIT_TAG || '').trim();

    return (
        <StyledLogo>
            <span>Element Masters</span>
            {tag ? <span className="tagline">{tag.toLowerCase()}</span> : null}
        </StyledLogo>
    )
}

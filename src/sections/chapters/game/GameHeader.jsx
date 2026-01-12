import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const HeaderContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 110px;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    box-sizing: border-box;
    z-index: 1000;
    pointer-events: none;
`;

const AmmoDisplay = styled.div`
    font-size: 28px;
    font-weight: bold;
    color: rgba(255, 200, 50, 0.95);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-family: monospace;
    pointer-events: none;
`;

const RightSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
`;

const BarsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 200px;
`;

const BarWrapper = styled.div`
    width: 100%;
    height: 8px;
    background-color: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.4);
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.3);
`;

const BarFill = styled.div.attrs(props => ({
    style: {
        width: `${props.$percent}%`,
        backgroundColor: props.$color,
    },
}))`
    height: 100%;
    transition: width 0.3s ease;
`;

const BarLabel = styled.div`
    position: absolute;
    top: -12px;
    left: 0;
    font-size: 9px;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px black;
    pointer-events: none;
    white-space: nowrap;
    text-transform: uppercase;
`;

const GameHeader = ({ 
    health, 
    maxHealth = 100, 
    ammo = 0, 
    oxygen = 100, 
    maxOxygen = 100, 
    lavaResist = 100, 
    maxLavaResist = 100,
    iceResist = 100,
    maxIceResist = 100,
    strength = 30,
    maxStrength = 100,
    inWater = false,
    liquidType = null,
    onIce = false
}) => {
    const hpPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    const oxyPercent = Math.max(0, Math.min(100, (oxygen / maxOxygen) * 100));
    const lavaPercent = Math.max(0, Math.min(100, (lavaResist / maxLavaResist) * 100));
    const icePercent = Math.max(0, Math.min(100, (iceResist / maxIceResist) * 100));
    const strengthPercent = Math.max(0, Math.min(100, (strength / maxStrength) * 100));

    const showOxy = inWater || liquidType === 'water' || oxyPercent < 100;
    const showLava = liquidType === 'lava' || lavaPercent < 100;
    const showIce = onIce || icePercent < 100;
    const showStrength = strengthPercent > 30; // Rādīt tikai kad sāk augt vai ja gribam vienmēr? 
    // Uzdevumā teikts "jāpievieno vēlviena līnija", pieņemsim ka rādām vienmēr vai kad nepieciešams.
    // Bet ja default ir 30%, tad varbūt labāk rādīt vienmēr.

    return (
        <HeaderContainer>
            <AmmoDisplay>
                🔥 {ammo || 0}
            </AmmoDisplay>

            <RightSection>
                <BarsContainer style={{ gap: '12px' }}>
                    {/* HP Bar */}
                    <BarWrapper>
                        <BarLabel>HP: {Math.round(health)}%</BarLabel>
                        <BarFill $percent={hpPercent} $color="#ff3232" />
                    </BarWrapper>

                    {/* Oxygen Bar */}
                    <BarWrapper>
                        <BarLabel>O2: {Math.round(oxyPercent)}%</BarLabel>
                        <BarFill $percent={oxyPercent} $color="#2ecdf1" />
                    </BarWrapper>

                    {/* Lava Bar */}
                    <BarWrapper>
                        <BarLabel>LAVA: {Math.round(lavaPercent)}%</BarLabel>
                        <BarFill $percent={lavaPercent} $color="#ffa229" />
                    </BarWrapper>

                    {/* Ice Bar */}
                    <BarWrapper>
                        <BarLabel>ICE: {Math.round(icePercent)}%</BarLabel>
                        <BarFill $percent={icePercent} $color="#a5f3fc" />
                    </BarWrapper>

                    {/* Strength Bar */}
                    <BarWrapper>
                        <BarLabel>STRENGTH: {Math.round(strengthPercent)}%</BarLabel>
                        <BarFill $percent={strengthPercent} $color="#eab308" />
                    </BarWrapper>
                </BarsContainer>
            </RightSection>
        </HeaderContainer>
    );
};

GameHeader.propTypes = {
    health: PropTypes.number.isRequired,
    maxHealth: PropTypes.number,
    ammo: PropTypes.number,
    oxygen: PropTypes.number,
    maxOxygen: PropTypes.number,
    lavaResist: PropTypes.number,
    maxLavaResist: PropTypes.number,
    iceResist: PropTypes.number,
    maxIceResist: PropTypes.number,
    strength: PropTypes.number,
    maxStrength: PropTypes.number,
    inWater: PropTypes.bool,
    liquidType: PropTypes.string,
    onIce: PropTypes.bool
};

export default GameHeader;
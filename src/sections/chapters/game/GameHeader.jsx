import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import AnimatedItem from '../../../utilities/AnimatedItem';
import fireballA from '../../../assets/images/items/fireball_basic_A.png';
import fireballB from '../../../assets/images/items/fireball_basic_B.png';
import fireballC from '../../../assets/images/items/fireball_basic_C.png';
import fireballD from '../../../assets/images/items/fireball_basic_D.png';
import fishSprite from '../../../assets/images/entities/animals/fish_01.png';

const HeaderContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: auto;
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const FishDisplay = styled(AmmoDisplay)`
    color: rgba(140, 230, 255, 0.95);
`;

const SeaRescueDisplay = styled(AmmoDisplay)`
    color: #00ff00;
`;

const AmmoIcon = styled.span`
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    image-rendering: pixelated;
`;

const RightSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    //gap: 8px;
`;

const BarsContainer = styled.div`
    display: flex;
    flex-direction: column;
    //gap: 1px;
    width: 250px;
    padding-top: 5px;
    padding-bottom: 5px;
   // border: solid 1px red;
`;

const BarRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
`;

const BarWrapper = styled.div`
    flex: 1;
    height: 6px;
    background-color: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.4);
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
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
    width: 60px;
    font-size: 8px;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px black;
    pointer-events: none;
    white-space: nowrap;
    text-transform: uppercase;
    text-align: right;
`;

const GameHeader = ({ 
    health, 
    maxHealth = 100, 
    ammo = 0, 
    fishCount = 0,
    seaRescuePoints = 0,
    mapType = 'overworld',
    oxygen = 100, 
    maxOxygen = 100, 
    lavaResist = 100, 
    maxLavaResist = 100,
    iceResist = 100,
    maxIceResist = 100,
    strength = 30,
    maxStrength = 100,
    radioactivity = 20,
    maxRadioactivity = 100,
    inWater = false,
    liquidType = null,
    onIce = false
}) => {
    const hpPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    const oxyPercent = Math.max(0, Math.min(100, (oxygen / maxOxygen) * 100));
    const lavaPercent = Math.max(0, Math.min(100, (lavaResist / maxLavaResist) * 100));
    const icePercent = Math.max(0, Math.min(100, (iceResist / maxIceResist) * 100));
    const strengthPercent = Math.max(0, Math.min(100, (strength / maxStrength) * 100));
    const radioPercent = Math.max(0, Math.min(100, (radioactivity / maxRadioactivity) * 100));
    const fireballFrames = [fireballA, fireballB, fireballC, fireballD, fireballC, fireballB];

    return (
        <HeaderContainer>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <AmmoDisplay>
                    <AmmoIcon>
                        <AnimatedItem
                            textures={fireballFrames}
                            speed={300}
                            alt="Fireball ammo"
                            style={{ width: '22px', height: '22px', imageRendering: 'pixelated' }}
                        />
                    </AmmoIcon>
                    {ammo || 0}
                </AmmoDisplay>
                <FishDisplay>
                    <AmmoIcon>
                        <AnimatedItem
                            texture={fishSprite}
                            spriteSheet={{ enabled: true, columns: 2, totalSprites: 3, frameIndex: 0 }}
                            alt="Fish"
                            style={{ width: '22px', height: '22px', imageRendering: 'pixelated' }}
                        />
                    </AmmoIcon>
                    {fishCount || 0}
                </FishDisplay>
                {mapType === 'sea_rescue' && (
                    <SeaRescueDisplay style={{ marginLeft: '15px' }}>
                        Points: {seaRescuePoints}
                    </SeaRescueDisplay>
                )}
            </div>

            <RightSection>
                <BarsContainer>
                    {/* HP Bar */}
                    <BarRow>
                        <BarLabel>HP</BarLabel>
                        <BarWrapper>
                            <BarFill $percent={hpPercent} $color="#ff3232" />
                        </BarWrapper>
                    </BarRow>

                    {/* Oxygen Bar */}
                    <BarRow>
                        <BarLabel>OZ</BarLabel>
                        <BarWrapper>
                            <BarFill $percent={oxyPercent} $color="#2ecdf1" />
                        </BarWrapper>
                    </BarRow>

                    {/* Lava Bar */}
                    <BarRow>
                        <BarLabel>LAVA</BarLabel>
                        <BarWrapper>
                            <BarFill $percent={lavaPercent} $color="#ffcc00" />
                        </BarWrapper>
                    </BarRow>

                    {/* Ice Bar */}
                    <BarRow>
                        <BarLabel>ICE</BarLabel>
                        <BarWrapper>
                            <BarFill $percent={icePercent} $color="#a5f3fc" />
                        </BarWrapper>
                    </BarRow>

                    {/* Strength Bar */}
                    <BarRow>
                        <BarLabel>STRNGTH</BarLabel>
                        <BarWrapper>
                            <BarFill $percent={strengthPercent} $color="#8b5a2b" />
                        </BarWrapper>
                    </BarRow>

                    {/* Radioactivity Bar */}
                    <BarRow>
                        <BarLabel>RADIO</BarLabel>
                        <BarWrapper>
                            <BarFill $percent={radioPercent} $color="#32cd32" />
                        </BarWrapper>
                    </BarRow>
                </BarsContainer>
            </RightSection>
        </HeaderContainer>
    );
};

GameHeader.propTypes = {
    health: PropTypes.number.isRequired,
    maxHealth: PropTypes.number,
    ammo: PropTypes.number,
    fishCount: PropTypes.number,
    oxygen: PropTypes.number,
    maxOxygen: PropTypes.number,
    lavaResist: PropTypes.number,
    maxLavaResist: PropTypes.number,
    iceResist: PropTypes.number,
    maxIceResist: PropTypes.number,
    strength: PropTypes.number,
    maxStrength: PropTypes.number,
    radioactivity: PropTypes.number,
    maxRadioactivity: PropTypes.number,
    inWater: PropTypes.bool,
    liquidType: PropTypes.string,
    onIce: PropTypes.bool
};

export default GameHeader;

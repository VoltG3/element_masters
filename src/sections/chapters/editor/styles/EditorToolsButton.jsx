import styled from 'styled-components';

export const EditorToolsContainer = styled.div`
    display: contents;
`;

export const HeaderBar = styled.div`
    padding: 0 15px;
    background-color: #222;
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    font-size: 12px;
    height: 60px;
    box-sizing: border-box;
    color: #fff;
    z-index: 1000;
    position: relative;

    &::after {
        content: "";
        position: absolute;
        left: 60px;
        right: 0;
        bottom: 0;
        height: 1px;
        background-color: #000;
        pointer-events: none;
    }
`;

export const ToolsSection = styled.div`
    display: flex;
    gap: 15px;
    align-items: center;
`;

export const ToolsGroup = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

export const ToolsInnerGroup = styled.div`
    display: flex;
    gap: 10px;
`;

export const ToolsRow = styled.div`
    display: flex;
    gap: 10px;
`;

export const ToolsEditorButton = styled.button`
    min-width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    background-color: ${props => props.$active ? '#e3de0a' : (props.$variant === 'play' ? '#4CAF50' : (props.$variant === 'pause' ? '#FF9800' : (props.$variant === 'danger' ? '#dc3545' : (props.$variant === 'secondary' ? '#f0f0f0' : '#333'))))};
    color: ${props => props.$variant === 'secondary' ? '#333' : '#fff'};
    border: 1px solid ${props => props.$active ? '#1E88E5' : (props.$variant === 'play' ? '#388E3C' : (props.$variant === 'pause' ? '#F57C00' : (props.$variant === 'danger' ? '#c82333' : (props.$variant === 'secondary' ? '#ccc' : '#fff'))))};
    border-radius: 4px;
    font-size: ${props => props.$small ? '14px' : '20px'};
    font-weight: ${props => props.$variant === 'play' || props.$variant === 'pause' ? 'bold' : 'normal'};
    line-height: 1;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transform: ${props => props.$active ? 'scale(1.05)' : 'none'};
    padding: ${props => props.$square ? '0' : '0 15px'};
    width: ${props => props.$square ? '40px' : 'auto'};
    outline: none;
    user-select: none;
    opacity: ${props => props.$disabled ? 0.4 : 1};
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    position: relative;

    &:hover {
        background-color: ${props => props.$active ? '#fdfa9b' : (props.$variant === 'play' ? '#45a049' : (props.$variant === 'pause' ? '#fb8c00' : (props.$variant === 'danger' ? '#bd2130' : (props.$variant === 'secondary' ? '#e0e0e0' : '#444'))))};
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
        border: solid 1px #fff;
    }

    span {
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;

export const StrikeThrough = styled.div`
    position: absolute;
    width: 100%;
    height: 2px;
    background-color: #f5222d;
    transform: rotate(-45deg);
    top: 50%;
    left: 0;
    z-index: 2;
    pointer-events: none;
`;

export const LayerIndicator = styled.div`
    padding: 0 12px;
    height: 40px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    margin-right: 15px;
    margin-left: 15px;
    white-space: nowrap;
    border: 1px solid;
    box-sizing: border-box;
    background-color: ${props => props.$bgColor || '#e6f7ff'};
    border-color: ${props => props.$borderColor || '#91d5ff'};
    color: ${props => props.$textColor || '#1890ff'};
`;

export const BgColorContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

export const BgColorInputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

export const BgColorInput = styled.input`
    width: 40px;
    height: 40px;
    border: 1px solid #fff;
    padding: 4px;
    cursor: pointer;
    background-color: #333;
    border-radius: 4px;
    box-sizing: border-box;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    opacity: ${props => props.disabled ? 0.4 : 1};
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

export const BgTransparentButton = styled.div`
    width: 40px;
    height: 40px;
    border: 1px solid ${props => props.$active ? '#e3de0a' : '#fff'};
    padding: 4px;
    background-color: #333;
    border-radius: 4px;
    box-sizing: border-box;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;

    &:hover {
        transform: scale(1.05);
        background-color: #444;
    }

    &::after {
        content: "";
        width: 100%;
        height: 100%;
        background-image: 
            linear-gradient(45deg, #ccc 25%, transparent 25%), 
            linear-gradient(-45deg, #ccc 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #ccc 75%), 
            linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 8px 8px;
        background-position: 0 0, 0 4px, 4px 4px, 4px 0;
        background-color: #fff;
        opacity: 0.8;
        border-radius: 2px;
    }
`;

export const PlayButtonContainer = styled.div`
    width: 40px;
    height: 40px;
    border: 1px solid #fff;
    padding: 4px;
    cursor: pointer;
    background-color: #333;
    border-radius: 4px;
    box-sizing: border-box;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.05);
        background-color: #444;
    }

    &:active {
        transform: scale(0.95);
    }
`;

export const PlayButtonInner = styled.div`
    width: 100%;
    height: 100%;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.$variant === 'play' ? '#4CAF50' : (props.$variant === 'pause' ? '#FF9800' : '#333')};
    color: #fff;
    font-size: 18px;
    box-sizing: border-box;
`;

export const InfoContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
    color: #bbb;
    margin-left: auto;
`;

export const InfoItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const InfoLabel = styled.span`
    font-size: 11px;
    text-transform: uppercase;
    opacity: 0.8;
`;

export const InfoValue = styled.span`
    color: #fff;
    font-size: 12px;
`;

export const EraserButtonContainer = styled.div`
    width: 40px;
    height: 40px;
    border: 1px solid ${props => props.$active ? '#e3de0a' : '#fff'};
    padding: 4px;
    //cursor: pointer;
    background-color: #333;
    border-radius: 4px;
    box-sizing: border-box;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: ${props => props.$disabled ? 0.4 : 1};
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    position: relative;

    &:hover {
        transform: scale(1.05);
        background-color: #444;
    }

    &:active {
        transform: scale(0.95);
    }
`;

export const EraserButtonInner = styled.div`
    width: 100%;
    height: 100%;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.$active ? (props.$textColor || '#1890ff') : (props.$bgColor || '#f0f0f0')};
    color: ${props => props.$active ? '#fff' : (props.$textColor || '#000')};
    font-size: 11px;
    font-weight: bold;
    border: ${props => props.$active ? '1px solid #fff' : 'none'};
    box-sizing: border-box;
`;

export const SelectionActions = styled.div`
    display: flex;
    gap: 5px;
    margin-left: 5px;
    border-left: 1px solid #ccc;
    padding-left: 5px;
`;

export const ConfirmButton = styled(ToolsEditorButton)`
    background-color: #e6f7ff;
    color: #1890ff;
    
    &:hover {
        background-color: #bae7ff;
    }
`;

export const CancelButton = styled(ToolsEditorButton)`
    background-color: #fff1f0;
    color: #f5222d;

    &:hover {
        background-color: #ffccc7;
    }
`;

export const GridIcon = styled.span`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

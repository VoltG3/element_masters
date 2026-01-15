import styled from "styled-components";

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

/* Container */
export const headerBarStyle = {
    padding: '0 15px',
    backgroundColor: '#222',
    borderBottom: '1px solid #000',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    height: '60px',
    boxSizing: 'border-box',
    color: '#fff',
    zIndex: 1000,
    position: 'relative'
};

export const toolsGroupStyle = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
};

export const toolsInnerGroupStyle = {
    display: 'flex',
    gap: '10px'
};

export const layerIndicatorStyle = {
    padding: '0 12px',
    height: '40px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginRight: '15px',
    marginLeft: '15px',
    whiteSpace: 'nowrap',
    border: '1px solid',
    boxSizing: 'border-box'
};

export const bgColorContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
};

export const bgColorInputStyle = {
    width: '40px',
    height: '40px',
    border: '1px solid #fff',
    padding: '4px',
    cursor: 'pointer',
    backgroundColor: '#333',
    borderRadius: '4px',
    boxSizing: 'border-box',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
};

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

export const infoContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-start',
    color: '#bbb',
    marginLeft: 'auto'
};

export const infoItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
};

export const infoLabelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    opacity: 0.8
};

export const infoValueStyle = {
    color: '#fff',
    fontSize: '12px'
};

export const EraserButtonContainer = styled.div`
    width: 40px;
    height: 40px;
    border: 1px solid ${props => props.$active ? '#e3de0a' : '#fff'};
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

// Legacy support for small buttons (Erasers)
export const toolButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1px solid #333',
    padding: '0',
    height: '40px',
    width: '40px',
    backgroundColor: '#f0f0f0',
    fontSize: '12px',
    color: '#000',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
};

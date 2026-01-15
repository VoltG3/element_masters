import styled from 'styled-components';

export const SidebarContainer = styled.div`
    width: 60px;
    height: 100%;
    background-color: #222;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10px;
    z-index: 1001;
    border-right: 1px solid #000;
    flex-shrink: 0;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 0px;
        background: transparent;
    }
    
    -ms-overflow-style: none;
    scrollbar-width: none;
`;

export const ElementEditorButton = styled.button`
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: ${props => props.$active ? '#e3de0a' : '#333'};
    color: #fff;
    border: 1px solid ${props => props.$active ? '#1E88E5' : '#fff'};
    border-radius: 4px;
    margin-bottom: 10px;
    font-size: 20px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transform: ${props => props.$active ? 'scale(1.05)' : 'none'};
    padding: 0;
    outline: none;

    &:hover {
        background-color: ${props => props.$active ? '#fdfa9b' : '#444'};
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
        border: solid 1px #fff;
    }
`;

export const PanelContainer = styled.div`
    width: 320px;
    height: 100%;
    background-color: #fff;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 1000;
    transition: width 0.2s ease;
`;

export const PanelHeader = styled.div`
    padding: 8px 15px;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    font-size: 12px;
    height: 32px;
    box-sizing: border-box;
    color: #333;

    span {
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`;

export const PanelBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 15px;
`;

export const CloseButton = styled.button`
    border: none;
    background: none;
    cursor: pointer;
    font-size: 16px;
    padding: 0 5px;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;

    &:hover {
        color: #333;
    }
`;

export const OperationButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px solid #333;
    padding: 0 10px;
    height: 40px;
    width: 100%;
    background-color: #f0f0f0;
    font-size: 13px;
    color: ${props => props.$danger ? '#d32f2f' : '#000'};
    border-radius: 3px;
    user-select: none;
    box-sizing: border-box;
    transition: all 0.2s ease;
    gap: 8px;
    outline: none;

    &:hover {
        background-color: #e0e0e0;
        border-color: #000;
    }

    &:active {
        transform: scale(0.98);
    }
`;

// Also exporting as a label for file input usage in OperationsPanel
export const OperationLabel = styled.label`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px solid #333;
    padding: 0 10px;
    height: 40px;
    width: 100%;
    background-color: #f0f0f0;
    font-size: 13px;
    color: #000;
    border-radius: 3px;
    user-select: none;
    box-sizing: border-box;
    transition: all 0.2s ease;
    gap: 8px;

    &:hover {
        background-color: #e0e0e0;
        border-color: #000;
    }

    &:active {
        transform: scale(0.98);
    }
`;

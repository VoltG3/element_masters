import styled from 'styled-components';

export const SceneEditorButton = styled.button`
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

export const RightSidebarContainer = styled.div`
    position: absolute;
    top: 10px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1001;
`;

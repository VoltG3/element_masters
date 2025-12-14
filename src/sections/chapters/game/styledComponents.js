import styled from 'styled-components';

export const GameContainer = styled.div`
    position: relative;
    height: 100%;
    overflow: hidden;
    background-color: #333;
`;

export const ModalOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
`;

export const ModalContent = styled.div`
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    width: 500px;
    max-height: 80%;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

export const ModalTitle = styled.h2`
    margin: 0;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
`;

export const MapList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const MapCard = styled.div`
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 10px;
    cursor: pointer;
    background-color: #f9f9f9;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
        background-color: #e8e8e8;
    }
`;

export const MapTitle = styled.div`
    font-weight: bold;
    font-size: 16px;
`;

export const MapAuthor = styled.div`
    font-size: 12px;
    color: #666;
`;

export const MapInfo = styled.div`
    text-align: right;
    font-size: 11px;
    color: #555;
`;

export const ModalDivider = styled.div`
    border-top: 2px solid #eee;
    padding-top: 15px;
    margin-top: 10px;
`;

export const FileUploadLabel = styled.label`
    padding: 8px 16px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    display: inline-block;
    width: 100%;
    box-sizing: border-box;

    &:hover {
        background-color: #1976D2;
    }
`;

export const HiddenFileInput = styled.input`
    display: none;
`;

export const Viewport = styled.div`
    height: 100%;
    display: ${props => props.$centered ? 'flex' : 'block'};
    align-items: ${props => props.$centered ? 'center' : 'stretch'};
    justify-content: ${props => props.$centered ? 'center' : 'flex-start'};
    overflow: auto;
    filter: ${props => props.$blurred ? 'blur(5px)' : 'none'};
    pointer-events: ${props => props.$blurred ? 'none' : 'auto'};
    transition: filter 0.3s ease;
`;

export const GameCanvas = styled.div`
    position: relative;
    width: ${props => props.$width}px;
    height: ${props => props.$height}px;
    border: 5px solid #222;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    background-color: #111;
`;

export const PlaceholderMessage = styled.div`
    color: #777;
    font-size: 24px;
`;

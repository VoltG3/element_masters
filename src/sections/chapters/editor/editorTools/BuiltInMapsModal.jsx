import React from 'react';
import styled from 'styled-components';
import { BUILT_IN_MAPS } from '../../../../constants/builtInMaps';
import { CloseButton } from '../styles/EditorElementsButtonStyle';

const ModalOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    width: 900px;
    max-width: 95%;
    max-height: 85%;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-size: 24px;
    color: #333;
`;

const MapList = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 15px;
    padding: 5px;
`;

const MapCard = styled.div`
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    cursor: pointer;
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.2s ease;

    &:hover {
        background-color: #f0f7ff;
        border-color: #2196f3;
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
`;

const MapTitle = styled.div`
    font-weight: bold;
    font-size: 16px;
    color: #333;
`;

const MapAuthor = styled.div`
    font-size: 12px;
    color: #666;
`;

const MapDescription = styled.div`
    font-size: 11px;
    color: #777;
    font-style: italic;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 45px;
`;

const MapInfo = styled.div`
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #eee;
    font-size: 11px;
    color: #555;
    display: flex;
    justify-content: space-between;
`;

export const BuiltInMapsModal = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <ModalOverlay onClick={onClose}>
            <ModalContent onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Select a Built-in Map to Edit</ModalTitle>
                    <CloseButton onClick={onClose}>✕</CloseButton>
                </ModalHeader>
                
                <MapList>
                    {BUILT_IN_MAPS.map((map, index) => {
                        const isV2 = map.meta?.version === "2.0";
                        const projectName = map.meta?.projectName || map.meta?.name || "Unnamed Map";
                        const author = map.meta?.author || "Unknown";
                        const description = map.meta?.description || "";
                        
                        let sizeInfo = "";
                        let subMapInfo = "";

                        if (isV2 && map.maps) {
                            const mainMap = map.maps[map.meta?.activeMapId || 'main'] || Object.values(map.maps)[0];
                            if (mainMap) {
                                sizeInfo = `${mainMap.width}x${mainMap.height}`;
                            }
                            
                            const mapValues = Object.values(map.maps);
                            const overworldCount = mapValues.filter(m => m.type === 'overworld').length;
                            const underworldCount = mapValues.filter(m => m.type === 'underworld').length;
                            
                            subMapInfo = ` (O:${overworldCount}, U:${underworldCount})`;
                        } else {
                            sizeInfo = `${map.meta?.width || map.width || 0}x${map.meta?.height || map.height || 0}`;
                        }

                        return (
                            <MapCard key={index} onClick={() => {
                                onSelect(map);
                                onClose();
                            }}>
                                <div>
                                    <MapTitle>{projectName}</MapTitle>
                                    <MapAuthor>By: {author}</MapAuthor>
                                </div>
                                {description && (
                                    <MapDescription title={description}>
                                        {description}
                                    </MapDescription>
                                )}
                                <MapInfo>
                                    <div>Size: {sizeInfo}{subMapInfo}</div>
                                </MapInfo>
                            </MapCard>
                        );
                    })}
                </MapList>
            </ModalContent>
        </ModalOverlay>
    );
};

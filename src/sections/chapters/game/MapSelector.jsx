import React from 'react';
import {
  ModalOverlay,
  ModalContent,
  ModalTitle,
  MapList,
  MapCard,
  MapTitle,
  MapAuthor,
  MapInfo,
  ModalDivider,
  FileUploadLabel,
  HiddenFileInput
} from './styledComponents';

export const MapSelector = ({ builtInMaps, onSelectMap, onCustomMapUpload }) => {
  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>Select a Map</ModalTitle>
        <MapList>
          {builtInMaps.map((map, index) => (
            <MapCard key={index} onClick={() => onSelectMap(map)}>
              <div>
                <MapTitle>{map.meta?.name || "Unnamed Map"}</MapTitle>
                <MapAuthor>By: {map.meta?.author || "Unknown"}</MapAuthor>
              </div>
              <MapInfo>
                <div>Size: {map.meta?.width}x{map.meta?.height}</div>
              </MapInfo>
            </MapCard>
          ))}
        </MapList>
        <ModalDivider>
          <FileUploadLabel>
            📂 Load Custom Map from Computer
            <HiddenFileInput type="file" accept=".json" onChange={onCustomMapUpload} />
          </FileUploadLabel>
        </ModalDivider>
      </ModalContent>
    </ModalOverlay>
  );
};

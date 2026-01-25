import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Overlay = styled.div`
    position: absolute;
    top: 70px;
    left: 10%;
    transform: none;
    width: 80%;
    text-align: left;
    pointer-events: none;
    z-index: 1500;
    
    h2 {
        font-size: 22px;
        color: white;
        text-shadow: 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5);
        margin: 0;
        padding: 12px 14px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 800;
        letter-spacing: 0.5px;
        white-space: pre-line;
        line-height: 1;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        opacity: ${props => props.$isVisible ? 1 : 0};
        transition: opacity 2s ease-in-out;
    }
`;

export const MessageOverlay = ({ text, isVisible }) => {
    if (!text) return null;
    return (
        <Overlay $isVisible={isVisible}>
            <h2>{text}</h2>
        </Overlay>
    );
};

MessageOverlay.propTypes = {
    text: PropTypes.string,
    isVisible: PropTypes.bool
};

MessageOverlay.defaultProps = {
    text: '',
    isVisible: false
};

export default MessageOverlay;

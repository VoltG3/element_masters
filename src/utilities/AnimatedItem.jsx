import React, { useState, useEffect } from 'react';

const AnimatedItem = ({ textures, texture, speed, style, alt, className, spriteSheet }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        // Ja ir vairākas tekstūras, sākam animāciju
        if (textures && textures.length > 1) {
            const interval = setInterval(() => {
                setIndex((prevIndex) => (prevIndex + 1) % textures.length);
            }, speed || 500); // Noklusējuma ātrums 500ms

            return () => clearInterval(interval);
        }
    }, [textures, speed]);

    // Izvēlamies ko renderēt: animācijas kadru, vienīgo tekstūru vai statisko bildi
    let imgSrc = null;
    if (textures && textures.length > 0) {
        imgSrc = textures[index % textures.length];
    } else if (texture) {
        imgSrc = texture;
    }

    if (!imgSrc) return null;

    // Ja ir spraitšīts, rādām tikai pirmo kadru (vai citu, ja norādīts)
    if (spriteSheet && spriteSheet.enabled) {
        const columns = spriteSheet.columns || 1;
        const total = spriteSheet.totalSprites || 1;
        const rows = Math.ceil(total / columns);
        
        // Editorā parasti rādām pirmo kadru (index 0)
        const frameIndex = 0;
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);

        return (
            <div className={className} style={{
                ...style,
                overflow: 'hidden',
                display: 'inline-block',
                width: style?.width || '32px',
                height: style?.height || '32px',
                position: 'relative'
            }}>
                <img
                    src={imgSrc}
                    alt={alt || ''}
                    style={{
                        position: 'absolute',
                        width: `${columns * 100}%`,
                        height: `${rows * 100}%`,
                        left: `-${col * 100}%`,
                        top: `-${row * 100}%`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        display: 'block'
                    }}
                    draggable={false}
                />
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={alt || ''}
            style={style}
            className={className}
            draggable={false}
        />
    );
};

export default AnimatedItem;
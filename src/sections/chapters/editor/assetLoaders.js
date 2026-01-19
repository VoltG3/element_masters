export const loadBackgroundOptions = () => {
    const bgContext = require.context('../../../assets/background', false, /\.(png|jpe?g|svg|webp)$/i);
    return bgContext.keys().map((key) => {
        const mod = bgContext(key);
        const url = mod.default || mod;
        const name = key.replace('./', '');
        return { key, name, src: url, metaPath: `/assets/background/${name}` };
    });
};

export const loadMusicOptions = () => {
    const musicContext = require.context('../../../assets/sound/background', false, /\.(ogg|mp3|wav|m4a)$/i);
    return musicContext.keys().map((key) => {
        const mod = musicContext(key);
        const name = key.replace('./', '');
        return { key, name, src: (mod.default || mod), metaPath: `/assets/sound/background/${name}` };
    });
};

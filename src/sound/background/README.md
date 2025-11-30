Background music tracks

Place your .ogg files in this folder. The editor and runtime discover tracks via Webpack's require.context:
- Editor: require.context('../../sound/background', false, /\.ogg$/)
- Runtime player: require.context('../sound/background', false, /\.ogg$/)

Usage in map meta:
- meta.backgroundMusic: "/sound/background/<file>.ogg"

If this folder is empty, the app will build fine; the music dropdown will just list “— None —”.

const config = {
    apiUrl: (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:8000',

    logo: {
        URL_LOGO_01: '/assets/logo/Logo1.png',
        URL_LOGO_02: '/assets/logo/Logo2.png',
        URL_LOGO_03: '/assets/logo/Logo3.png',
        URL_LOGO_04: '/assets/logo/Logo4.png',
        URL_LOGO_05: '/assets/logo/Logo5.png',
    },

};

export default config
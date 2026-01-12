const PUBLIC_URL = (typeof process !== 'undefined' && process.env?.PUBLIC_URL) || '';

const config = {
    apiUrl: (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:8000',

    logo: {
        URL_LOGO_01: `${PUBLIC_URL}/assets/logo/Logo1.png`,
        URL_LOGO_02: `${PUBLIC_URL}/assets/logo/Logo2.png`,
        URL_LOGO_03: `${PUBLIC_URL}/assets/logo/Logo3.png`,
        URL_LOGO_04: `${PUBLIC_URL}/assets/logo/Logo4.png`,
        URL_LOGO_05: `${PUBLIC_URL}/assets/logo/Logo5.png`,
    },

};

export default config
import Logo1 from './assets/logo/Logo1.png';
import Logo2 from './assets/logo/Logo2.png';
import Logo3 from './assets/logo/Logo3.png';
import Logo4 from './assets/logo/Logo4.png';
import Logo5 from './assets/logo/Logo5.png';

const config = {
    apiUrl: (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:8000',

    logo: {
        URL_LOGO_01: Logo1,
        URL_LOGO_02: Logo2,
        URL_LOGO_03: Logo3,
        URL_LOGO_04: Logo4,
        URL_LOGO_05: Logo5,
    },

};

export default config

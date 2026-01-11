import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import lv_navigation_home from "./translations/lv/navigation_home.json"
import no_navigation_home from  "./translations/no/navigation_home.json"
import en_navigation_home from  "./translations/en/navigation_home.json"
import ru_navigation_home from  "./translations/ru/navigation_home.json"
import ja_navigation_home from  "./translations/ja/navigation_home.json"

const lv_navigation = {
    ...lv_navigation_home
}

const no_navigation = {
    ...no_navigation_home
}

const en_navigation = {
    ...en_navigation_home
}

const ru_navigation = {
    ...ru_navigation_home
}

const ja_navigation = {
    ...ja_navigation_home
}

i18n
    .use(initReactI18next)
    .init({
        lng: "en",
        fallbackLng: "en",
        supportedLngs: ["lv", "no", "en", "ru", "ja"],
        ns: ["navigation"],
        defaultNS: "navigation",
        interpolation: { escapeValue: false },
        resources: {
            lv: {
                navigation: lv_navigation
            },
            no: {
                navigation: no_navigation
            },
            en: {
                navigation: en_navigation
            },
            ru: {
                navigation: ru_navigation
            },
            ja: {
                navigation: ja_navigation
            },
        },
    })

export default i18n
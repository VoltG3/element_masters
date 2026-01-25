import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import lv_navigation_home from "./translations/lv/navigation_home.json"
import no_navigation_home from  "./translations/no/navigation_home.json"
import en_navigation_home from  "./translations/en/navigation_home.json"
import ru_navigation_home from  "./translations/ru/navigation_home.json"
import ja_navigation_home from  "./translations/ja/navigation_home.json"
import lv_tutorial_messages from "./translations/lv/tutorial_messages.json"
import no_tutorial_messages from "./translations/no/tutorial_messages.json"
import en_tutorial_messages from "./translations/en/tutorial_messages.json"
import ru_tutorial_messages from "./translations/ru/tutorial_messages.json"
import ja_tutorial_messages from "./translations/ja/tutorial_messages.json"
import en_game_map_selector from "./translations/en/game_map_selector.json"
import en_editor_elements from "./translations/en/editor_elements.json"
import en_editor_scene from "./translations/en/editor_scene.json"
import en_editor_tools from "./translations/en/editor_tools.json"

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
        ns: ["navigation", "tutorial", "game", "editor_elements", "editor_scene", "editor_tools"],
        defaultNS: "navigation",
        interpolation: { escapeValue: false },
        resources: {
            lv: {
                navigation: lv_navigation,
                tutorial: lv_tutorial_messages,
                game: {},
                editor_elements: {},
                editor_scene: {},
                editor_tools: {}
            },
            no: {
                navigation: no_navigation,
                tutorial: no_tutorial_messages,
                game: {},
                editor_elements: {},
                editor_scene: {},
                editor_tools: {}
            },
            en: {
                navigation: en_navigation,
                tutorial: en_tutorial_messages,
                game: en_game_map_selector,
                editor_elements: en_editor_elements,
                editor_scene: en_editor_scene,
                editor_tools: en_editor_tools
            },
            ru: {
                navigation: ru_navigation,
                tutorial: ru_tutorial_messages,
                game: {},
                editor_elements: {},
                editor_scene: {},
                editor_tools: {}
            },
            ja: {
                navigation: ja_navigation,
                tutorial: ja_tutorial_messages,
                game: {},
                editor_elements: {},
                editor_scene: {},
                editor_tools: {}
            },
        },
    })

export default i18n

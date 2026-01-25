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
import lv_game_map_selector from "./translations/lv/game_map_selector.json"
import no_game_map_selector from "./translations/no/game_map_selector.json"
import ru_game_map_selector from "./translations/ru/game_map_selector.json"
import ja_game_map_selector from "./translations/ja/game_map_selector.json"
import lv_editor_elements from "./translations/lv/editor_elements.json"
import no_editor_elements from "./translations/no/editor_elements.json"
import ru_editor_elements from "./translations/ru/editor_elements.json"
import ja_editor_elements from "./translations/ja/editor_elements.json"
import lv_editor_scene from "./translations/lv/editor_scene.json"
import no_editor_scene from "./translations/no/editor_scene.json"
import ru_editor_scene from "./translations/ru/editor_scene.json"
import ja_editor_scene from "./translations/ja/editor_scene.json"
import lv_editor_tools from "./translations/lv/editor_tools.json"
import no_editor_tools from "./translations/no/editor_tools.json"
import ru_editor_tools from "./translations/ru/editor_tools.json"
import ja_editor_tools from "./translations/ja/editor_tools.json"

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
                game: lv_game_map_selector,
                editor_elements: lv_editor_elements,
                editor_scene: lv_editor_scene,
                editor_tools: lv_editor_tools
            },
            no: {
                navigation: no_navigation,
                tutorial: no_tutorial_messages,
                game: no_game_map_selector,
                editor_elements: no_editor_elements,
                editor_scene: no_editor_scene,
                editor_tools: no_editor_tools
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
                game: ru_game_map_selector,
                editor_elements: ru_editor_elements,
                editor_scene: ru_editor_scene,
                editor_tools: ru_editor_tools
            },
            ja: {
                navigation: ja_navigation,
                tutorial: ja_tutorial_messages,
                game: ja_game_map_selector,
                editor_elements: ja_editor_elements,
                editor_scene: ja_editor_scene,
                editor_tools: ja_editor_tools
            },
        },
    })

export default i18n

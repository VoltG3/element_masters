import React, { createContext, useContext, useCallback, useEffect, useState } from "react"
import i18n from "../i18n/i18n"

const SUPPORTED_LANGS = ["lv", "no", "en", "ru", "ja"];
const DEFAULT_LANG = "lv"

const LangContext = createContext({
    currentLang: DEFAULT_LANG,
    changeLanguage: () => {},
})

export function useLanguage() {
    return useContext(LangContext)
}

export function LanguageProvider({ children }) {
    // Nolasa valodu no localStorage vai iestata DEFAULT
    const [currentLang, setCurrentLang] = useState(() => {
        try {
            const saved = localStorage.getItem("appLang")
            if (saved && SUPPORTED_LANGS.includes(saved)) return saved
        } catch {}
        return DEFAULT_LANG
    })

    // Funkcija valodas maiņai
    const changeLanguage = useCallback((toLang) => {
        if (!SUPPORTED_LANGS.includes(toLang) || toLang === currentLang) return

        try {
            localStorage.setItem("appLang", toLang)
        } catch {}

        setCurrentLang(toLang)
        i18n.changeLanguage(toLang)
    }, [currentLang])

    // Kad currentLang mainās → pārslēdz i18n
    useEffect(() => {
        if (i18n.language !== currentLang) {
            i18n.changeLanguage(currentLang);
        }
    }, [currentLang])

    return (
        <LangContext.Provider value={{ currentLang, changeLanguage }}>
            {children}
        </LangContext.Provider>
    )
}

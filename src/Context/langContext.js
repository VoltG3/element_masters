import React, { createContext, useContext, useCallback, useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import i18n from "../i18n/i18n"

const SUPPORTED_LANGS = ["lv", "no"]
const DEFAULT_LANG = "lv"

const LangContext = createContext({
  currentLang: DEFAULT_LANG,
  changeLanguage: (_to) => {},
})

export function useLanguage() {
  return useContext(LangContext)
}

export function LanguageProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang: routeLang } = useParams()

  const currentLang = SUPPORTED_LANGS.includes(routeLang) ? routeLang : DEFAULT_LANG

  const changeLanguage = useCallback(
    (toLang) => {
      if (!SUPPORTED_LANGS.includes(toLang) || toLang === currentLang) return

      try {
        localStorage.setItem("appLang", toLang)
      } catch {}

      // Pārliec i18n valodu
      i18n.changeLanguage(toLang)

      const parts = location.pathname.split("/").filter(Boolean);
      const [, ...rest] = parts
      const newPath = `/${toLang}/${rest.join("/") || "home"}`

      navigate(newPath, { replace: false })
    },
    [currentLang, location.pathname, navigate]
  )

  // Kad mainās URL valoda, pārslēdz i18n
  useEffect(() => {
    if (i18n.language !== currentLang) {
      i18n.changeLanguage(currentLang)
    }
  }, [currentLang])

  return (
    <LangContext.Provider value={{ currentLang, changeLanguage }}>
      { children }
    </LangContext.Provider>
  )
}
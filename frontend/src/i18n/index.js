import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import es from './locales/es.json'
import da from './locales/da.json'
import de from './locales/de.json'
import tr from './locales/tr.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es }, da: { translation: da }, de: { translation: de }, tr: { translation: tr } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'da', 'de', 'tr'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n

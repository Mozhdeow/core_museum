import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import enCommon from './locales/en/common.json';
import faCommon from './locales/fa/common.json'
import enAuth from './locales/en/auth.json';
import faAuth from './locales/fa/auth.json'
import enMuseum from './locales/en/museum.json';
import faMuseum from './locales/fa/museum.json'
import enAdmin from './locales/en/admin.json';
import faAdmin from './locales/fa/admin.json'
import enPhase2 from './locales/en/phase2.json'; import faPhase2 from './locales/fa/phase2.json'
import enLanding from './locales/en/landing.json'; import faLanding from './locales/fa/landing.json'

const saved = localStorage.getItem('core-locale')
export const LOCALES = {en: {label: 'EN', dir: 'ltr'}, fa: {label: 'FA', dir: 'rtl'}} as const

export function setDocumentDirection(locale: keyof typeof LOCALES) {
    const config = LOCALES[locale];
    document.documentElement.lang = locale;
    document.documentElement.dir = config.dir
    document.documentElement.dataset.locale = locale
}

void i18n.use(initReactI18next).init({
    resources: {
        en: {common: enCommon, auth: enAuth, museum: enMuseum, admin: enAdmin, phase2: enPhase2, landing: enLanding},
        fa: {common: faCommon, auth: faAuth, museum: faMuseum, admin: faAdmin, phase2: faPhase2, landing: faLanding},
    },
    lng: saved === 'fa' ? 'fa' : 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'museum', 'admin', 'phase2', 'landing'],
    interpolation: {escapeValue: false},
})
setDocumentDirection(i18n.language === 'fa' ? 'fa' : 'en')
export default i18n

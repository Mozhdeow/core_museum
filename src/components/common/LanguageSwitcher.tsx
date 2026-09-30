import {useTranslation} from 'react-i18next';
import i18n, {LOCALES, setDocumentDirection} from '@/i18n';
import {useAuthStore} from '@/features/auth/authStore'

export function LanguageSwitcher() {
    const {t} = useTranslation('common')
    const updateProfile = useAuthStore(s => s.updateProfile);
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)

    async function change(locale: 'en' | 'fa') {
        await i18n.changeLanguage(locale);
        localStorage.setItem('core-locale', locale);
        setDocumentDirection(locale);
        if (isAuthenticated) await updateProfile({preferred_locale: locale})
    }

    return <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/80 p-1"
                aria-label={t('language')}>
        {(['en', 'fa'] as const).map(locale => <button type="button" key={locale} onClick={() => void change(locale)}
                                                       className={`rounded-full px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors ${i18n.language === locale ? 'bg-orange text-black' : 'text-muted hover:text-ink'}`}
                                                       aria-pressed={i18n.language === locale}>{LOCALES[locale].label}</button>)}
    </div>
}

import {useEffect, useState} from 'react'
import {Link} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {Logo} from '@/components/common/Logo'
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher'
import {AudioToggle} from '@/components/common/AudioToggle'
import {useAuthStore} from '@/features/auth/authStore'

export function LandingNav() {
    const {t} = useTranslation('landing')
    const user = useAuthStore(s => s.user)
    const [scrolled, setScrolled] = useState(false)
    useEffect(() => {
        const update = () => setScrolled(window.scrollY > 36)
        update()
        window.addEventListener('scroll', update, {passive: true})
        return () => window.removeEventListener('scroll', update)
    }, [])
    return <header className={`landing-nav${scrolled ? ' is-scrolled' : ''}`}>
        <Logo/>
        <nav className="landing-nav__tools" aria-label={t('welcome')}>
            <LanguageSwitcher/>
            <AudioToggle compact/>
            <Link to={user ? '/profile' : '/login'}
                  className="landing-nav__account">{user ? t('profile') : t('signIn')}</Link>
        </nav>
    </header>
}

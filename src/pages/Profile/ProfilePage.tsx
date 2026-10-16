import {Link} from 'react-router-dom';
import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Logo} from '@/components/common/Logo';
import {useAuthStore} from '@/features/auth/authStore';
import {Button} from '@/components/ui/Button'
import {canUseContentWorkspace} from '@/features/auth/permissions'

export function ProfilePage() {
    const {t} = useTranslation('common');
    const user = useAuthStore(s => s.user); const profile = useAuthStore(s => s.profile); const updateProfile = useAuthStore(s => s.updateProfile); const [name,setName] = useState(profile?.full_name ?? user?.name ?? ''); const [locale,setLocale] = useState(profile?.preferred_locale ?? 'en'); const [saved,setSaved] = useState(false);
    // Profile is restored before protected routes render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { if (profile) { setName(profile.full_name ?? user?.name ?? ''); setLocale(profile.preferred_locale) } }, [profile, user?.name]);
    const signOut = useAuthStore(s => s.signOut);
    return <div className="min-h-screen bg-void p-5 md:p-10">
        <header className="flex items-center justify-between"><Logo/><Link to="/museum"
                                                                           className="font-mono text-xs uppercase tracking-widest text-muted hover:text-orange">{t('back')}</Link>
        </header>
        <main className="mx-auto max-w-2xl pt-24"><p className="mb-4 text-sm text-muted">{t('rbac.role',{ns:'admin'})}: {t(`rbac.roles.${user?.role==='visitor'?'user':user?.role ?? 'user'}`,{ns:'admin'})}</p>{canUseContentWorkspace(user?.role) && <Link className="button button-outline mb-5" to={user?.role==='admin'?'/admin/dashboard':'/admin/items'}>{t('rbac.workspace',{ns:'admin'})}</Link>}<span className="eyebrow">{t('profile')}</span><h1
            className="mt-5 font-display text-5xl">{user?.name ?? 'Archive visitor'}</h1>
            <div className="mt-10 grid gap-4 border-y border-border py-6 text-sm">
                <div className="flex justify-between"><span
                    className="text-muted">{t('email')}</span><span>{user?.email ?? 'visitor@core.archive'}</span></div>
                <div className="flex justify-between"><span className="text-muted">{t('status')}</span><span
                    className="text-cyan">{t('online')}</span></div>
                <label className="field-label"><span>{t('name')}</span><input className="field-input" value={name} onChange={e => setName(e.target.value)}/></label>
                <label className="field-label"><span>{t('language')}</span><select className="field-input" value={locale} onChange={e => setLocale(e.target.value as 'en'|'fa')}><option value="en">English</option><option value="fa">فارسی</option></select></label>
            </div>
            <Button variant="outline" onClick={() => void updateProfile({full_name:name,preferred_locale:locale}).then(() => setSaved(true))}>{saved ? t('save') : t('save')}</Button>
            <Button variant="outline" className="mt-8" onClick={() => void signOut()}>{t('logout')}</Button></main>
    </div>
}

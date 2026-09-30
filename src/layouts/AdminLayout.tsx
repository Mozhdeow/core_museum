import {NavLink, Outlet, Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {LayoutDashboard, Boxes, Tags, Map, Users, LogOut} from 'lucide-react';
import {Logo} from '@/components/common/Logo';
import {LanguageSwitcher} from '@/components/common/LanguageSwitcher';
import {useAuthStore} from '@/features/auth/authStore'

export function AdminLayout() {
    const {t} = useTranslation(['common', 'admin']);
    const signOut = useAuthStore(s => s.signOut);
    const links = [{to: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard')}, {
        to: '/admin/items',
        icon: Boxes,
        label: t('museumItems')
    }, {to: '/admin/categories', icon: Tags, label: t('categories')}, {
        to: '/admin/sections',
        icon: Map,
        label: t('sections')
    }, {to: '/admin/users', icon: Users, label: t('users')}];
    return <div className="min-h-screen bg-void text-ink">
        <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-border bg-surface p-6 lg:block"><Logo
            to="/admin/dashboard"/>
            <div className="mt-12 space-y-1">{links.map(({to, icon: Icon, label}) => <NavLink key={to} to={to}
                                                                                              className={({isActive}) => `flex items-center gap-3 border-s-2 px-3 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${isActive ? 'border-orange bg-elevated text-orange' : 'border-transparent text-muted hover:text-ink'}`}><Icon
                size={16}/>{label}</NavLink>)}</div>
            <button onClick={() => void signOut('admin')}
                    className="absolute inset-x-6 bottom-7 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted hover:text-red">
                <LogOut size={16}/>{t('logout')}</button>
        </aside>
        <header
            className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-border bg-void/90 p-4 backdrop-blur-lg lg:start-64 lg:px-8">
            <div className="flex items-center gap-4">
                <div className="lg:hidden"><Logo to="/admin/dashboard" compact/></div>
                <span
                    className="hidden font-mono text-xs uppercase tracking-widest text-muted md:inline">{t('admin')} / <span
                    className="text-orange">{t('online')}</span></span></div>
            <div className="flex items-center gap-2"><LanguageSwitcher/><Link to="/museum"
                                                                              className="button button-outline hidden py-2 text-[10px] md:block">{t('exit')} museum</Link>
            </div>
        </header>
        <nav className="fixed inset-x-0 top-[73px] z-20 flex gap-1 overflow-x-auto border-b border-border bg-surface p-2 lg:hidden">{links.map(({to, label}) => <NavLink key={to} to={to} className={({isActive}) => `whitespace-nowrap px-3 py-2 font-mono text-[9px] uppercase tracking-widest ${isActive ? 'bg-elevated text-orange' : 'text-muted'}`}>{label}</NavLink>)}</nav>
        <main className="min-h-screen pt-24 lg:ms-64"><Outlet/></main>
    </div>
}

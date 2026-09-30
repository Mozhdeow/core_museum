import {useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {ArrowUpRight, Check} from 'lucide-react';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {useAuthStore} from '@/features/auth/authStore';
import {authService} from '@/lib/services'

function AuthFrame({eyebrow, title, copy, children, footer}: {
    eyebrow: string;
    title: string;
    copy: string;
    children: React.ReactNode;
    footer: React.ReactNode
}) {
    return <div className="auth-panel glass w-full max-w-md p-6 md:p-10"><div className="mb-8 flex items-center justify-between"><span className="eyebrow">{eyebrow}</span><span className="font-mono text-[9px] tracking-[.18em] text-muted">CORE / 02</span></div><h1
        className="max-w-sm text-balance font-display text-3xl leading-tight text-ink md:text-4xl" dir="auto">{title}</h1><p
        className="mt-3 max-w-sm text-sm leading-7 text-muted" dir="auto">{copy}</p>{children}
        <div className="mt-8 border-t border-border pt-5 text-center text-xs text-muted">{footer}</div>
    </div>
}

export function LoginPage() {
    const {t} = useTranslation(['auth', 'common']);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const signIn = useAuthStore(s => s.signIn);
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: string } | null)?.from ?? '/museum';
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return setError(t('invalid'));
        try { await signIn({email, password}); navigate(from, {replace: true}) } catch { setError(t('invalid')) }
    };
    return <AuthFrame eyebrow={t('login')} title={t('welcomeBack')} copy={t('secureAuth')}
                      footer={<>{t('noAccount')} <Link to="/register"
                                                       className="text-orange hover:text-amber">{t('createAccount')}</Link></>}>
        <form className="mt-8 space-y-5" onSubmit={submit}><Input label={t('email')} type="email" value={email}
                                                                  onChange={e => setEmail(e.target.value)}
                                                                  autoComplete="email"/><Input label={t('password')}
                                                                                               type="password"
                                                                                               value={password}
                                                                                               onChange={e => setPassword(e.target.value)}
                                                                                               autoComplete="current-password"/>
            <div className="flex justify-end"><Link to="/forgot-password"
                                                    className="text-xs text-muted hover:text-orange">{t('forgotPassword')}</Link>
            </div>
            {error && <p className="text-xs text-red" role="alert">{error}</p>}<Button type="submit"
                                                                                       className="w-full">{t('signIn')}
                <ArrowUpRight size={15}/></Button></form>
    </AuthFrame>
}

export function RegisterPage() {
    const {t} = useTranslation(['auth', 'common']);
    const [form, setForm] = useState({name: '', email: '', password: '', confirm: ''});
    const [error, setError] = useState('');
    const register = useAuthStore(s => s.register);
    const navigate = useNavigate();
    const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(current => ({
        ...current,
        [key]: e.target.value
    }));
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.values(form).some(value => !value) || form.password !== form.confirm) return setError(t('invalid'));
        try { await register(form); navigate('/museum', {replace: true}) } catch (error) { setError(error instanceof Error && error.message === 'CONFIRM_EMAIL' ? t('confirmEmail') : t('invalid')) }
    };
    return <AuthFrame eyebrow={t('register')} title={t('createProfile')} copy={t('secureAuth')}
                      footer={<>{t('haveAccount')} <Link to="/login"
                                                         className="text-orange hover:text-amber">{t('login')}</Link></>}>
        <form className="mt-8 space-y-4" onSubmit={submit}><Input label={t('name')} value={form.name}
                                                                  onChange={update('name')} autoComplete="name"/><Input
            label={t('email')} type="email" value={form.email} onChange={update('email')} autoComplete="email"/><Input
            label={t('password')} type="password" value={form.password} onChange={update('password')}
            autoComplete="new-password"/><Input label={t('confirmPassword')} type="password" value={form.confirm}
                                                onChange={update('confirm')} autoComplete="new-password"/>{error &&
            <p className="text-xs text-red" role="alert">{error}</p>}<Button type="submit"
                                                                             className="mt-2 w-full">{t('createAccount')}
            <Check size={15}/></Button></form>
    </AuthFrame>
}

export function ForgotPasswordPage() {
    const {t} = useTranslation(['auth', 'common']);
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false); const [error, setError] = useState('');
    return <AuthFrame eyebrow={t('forgotPassword')} title={t('resetPassword')} copy={t('recoverCopy')}
                      footer={<Link to="/login" className="text-orange hover:text-amber">{t('back')}</Link>}>
        <form className="mt-8 space-y-5" onSubmit={e => {
            e.preventDefault();
            void authService.recoverPassword(email).then(() => setSent(true)).catch(() => setError(t('invalid')))
        }}><Input label={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)}/>{sent &&
            <p className="text-xs leading-6 text-cyan" role="status">{t('resetSent')}</p>}{error && <p className="text-xs text-red">{error}</p>}<Button type="submit"
                                                                                                 className="w-full">{t('continue')}
            <ArrowUpRight size={15}/></Button></form>
    </AuthFrame>
}

export function ResetPasswordPage() {
    const {t} = useTranslation(['auth', 'common']); const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState(''); const [message,setMessage] = useState(''); const [error,setError] = useState('');
    return <AuthFrame eyebrow={t('resetPassword')} title={t('resetPassword')} copy={t('recoverCopy')} footer={<Link to="/login" className="text-orange hover:text-amber">{t('back')}</Link>}>
        <form className="mt-8 space-y-5" onSubmit={async e => { e.preventDefault(); if (password.length < 8 || password !== confirm) return setError(t('invalid')); try { await (await import('@/lib/services')).supabaseAuthService.updatePassword(password); setMessage(t('passwordUpdated')); setError('') } catch { setError(t('invalid')) } }}>
            <Input label={t('password')} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"/><Input label={t('confirmPassword')} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password"/>{message && <p className="text-xs text-cyan">{message}</p>}{error && <p className="text-xs text-red">{error}</p>}<Button type="submit" className="w-full">{t('save')}</Button>
        </form>
    </AuthFrame>
}

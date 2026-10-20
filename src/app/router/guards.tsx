import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {useAuthStore} from '@/features/auth/authStore';
import {canUseContentWorkspace} from '@/features/auth/permissions';
import {PermissionDenied} from '@/components/common/PermissionDenied';

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const location = useLocation();

    if (isLoading && !isAuthenticated) {
        return (
            <div
                className="grid min-h-screen place-items-center bg-void font-mono text-xs uppercase tracking-widest text-muted">
                INITIALIZING CORE
            </div>
        );
    }

    return isAuthenticated ? (
        <div hidden={isLoading} inert={isLoading || undefined}><Outlet/></div>
    ) : (
        <Navigate
            to="/login"
            replace
            state={{from: location.pathname}}
        />
    );
}

export function AdminGuard({content = false}: { content?: boolean }) {
    const user = useAuthStore((state) => state.user);
    const authenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);

    if (isLoading && !authenticated) {
        return (
            <div
                className="grid min-h-screen place-items-center bg-void font-mono text-xs uppercase tracking-widest text-muted">
                INITIALIZING CORE
            </div>
        );
    }

    if (!authenticated) return <Navigate to="/admin" replace/>;
    return (content ? canUseContentWorkspace(user?.role) : user?.role === 'admin') ? (
        <div hidden={isLoading} inert={isLoading || undefined}><Outlet/></div>
    ) : (
        <PermissionDenied/>
    );
}

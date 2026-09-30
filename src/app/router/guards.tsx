import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="grid min-h-screen place-items-center bg-void font-mono text-xs uppercase tracking-widest text-muted">
                INITIALIZING CORE
            </div>
        );
    }

    return isAuthenticated ? (
        <Outlet />
    ) : (
        <Navigate
            to="/login"
            replace
            state={{ from: location.pathname }}
        />
    );
}

export function AdminGuard() {
    const isAdmin = useAuthStore((state) => state.isAdmin);
    const isLoading = useAuthStore((state) => state.isLoading);

    if (isLoading) {
        return (
            <div className="grid min-h-screen place-items-center bg-void font-mono text-xs uppercase tracking-widest text-muted">
                INITIALIZING CORE
            </div>
        );
    }

    return isAdmin ? (
        <Outlet />
    ) : (
        <Navigate to="/admin" replace />
    );
}
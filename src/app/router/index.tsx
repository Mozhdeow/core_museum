import {createBrowserRouter, Navigate} from 'react-router-dom';
import {RootLayout} from '@/layouts/RootLayout';
import {AuthLayout} from '@/layouts/AuthLayout';
import {MuseumLayout} from '@/layouts/MuseumLayout';
import {AdminLayout} from '@/layouts/AdminLayout';
import {LandingPage} from '@/pages/Landing/LandingPage';
import {LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage} from '@/pages/Auth/AuthPages';
import {MuseumPage} from '@/pages/Museum/MuseumPage';
import {ProfilePage} from '@/pages/Profile/ProfilePage';
import {AdminLoginPage, DashboardPage, ItemsPage, ItemFormPage, PlaceholderAdminPage} from '@/pages/Admin/AdminPages';
import {AdminUsersPage} from '@/pages/Admin/AdminUsersPage';
import {ProtectedRoute, AdminGuard} from './guards'

export const router = createBrowserRouter([{
    path: '/', element: <RootLayout/>, children: [
        {index: true, element: <LandingPage/>}, {
            element: <AuthLayout/>,
            children: [{path: 'login', element: <LoginPage/>}, {
                path: 'register',
                element: <RegisterPage/>
            }, {path: 'forgot-password', element: <ForgotPasswordPage/>}, {
                path: 'reset-password',
                element: <ResetPasswordPage/>
            }]
        },
        {
            element: <ProtectedRoute/>,
            children: [{
                element: <MuseumLayout/>,
                children: [{path: 'museum', element: <MuseumPage/>}]
            }, {path: 'profile', element: <ProfilePage/>}]
        },
        {path: 'admin', element: <AdminLoginPage/>}, {
            element: <AdminGuard content/>,
            children: [{
                element: <AdminLayout/>,
                children: [{
                    path: 'admin/items',
                    element: <ItemsPage/>
                }, {path: 'admin/items/new', element: <ItemFormPage/>}, {
                    path: 'admin/items/:id/edit',
                    element: <ItemFormPage/>
                }, {element:<AdminGuard/>,children:[
                    {path:'admin/dashboard',element:<DashboardPage/>},
                    {path:'admin/categories',element:<PlaceholderAdminPage section="categories"/>},
                    {path:'admin/sections',element:<PlaceholderAdminPage section="sections"/>},
                    {path:'admin/users',element:<AdminUsersPage/>},
                ]}]
            }]
        },
        {path: '*', element: <Navigate to="/" replace/>},
    ]
}])


import { StrictMode } from 'react'; import { createRoot } from 'react-dom/client'; import { RouterProvider } from 'react-router-dom'; import '@/i18n'; import { router } from '@/app/router'; import '@/styles/index.css'; import {initializeAuth} from '@/features/auth/authStore'
initializeAuth()
createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>)

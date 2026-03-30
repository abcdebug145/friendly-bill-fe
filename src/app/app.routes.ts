import { Routes } from '@angular/router';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { ResetPassword } from './pages/reset-password/reset-password';
import { VerifyEmail } from './pages/verify-email/verify-email';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'forgot-password', component: ForgotPassword },
    { path: 'reset-password', component: ResetPassword },
    { path: 'verify-email', component: VerifyEmail },
    {
        path: '',
        loadChildren: () => import('./admin').then((m) => m.AdminModule),
    },
    { path: '**', redirectTo: 'login' },
];

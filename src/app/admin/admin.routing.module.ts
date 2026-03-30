import { Routes } from '@angular/router';

import { AuthGuard } from '../core/auth/auth.guard';
import { AdminComponent } from './pages/admin.component';
import { Dashboard } from './pages/dashboard/dashboard.component';
import { Profile } from './pages/profile/profile.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'profile', component: Profile },
    ],
  },
];

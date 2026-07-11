import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent),
  },
  {
    path: 'jobs',
    loadComponent: () => import('./pages/jobs/jobs').then(m => m.JobsComponent),
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./pages/job-detail/job-detail').then(m => m.JobDetailComponent),
  },
  {
    path: 'employer/dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Employer'] },
    loadComponent: () => import('./pages/employer-dashboard/employer-dashboard').then(m => m.EmployerDashboardComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] },
    loadComponent: () => import('./pages/admin/admin-layout').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/admin/admin-dashboard').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./pages/admin/admin-users').then(m => m.AdminUsersComponent) },
      { path: 'withdrawals', loadComponent: () => import('./pages/admin/admin-withdrawals').then(m => m.AdminWithdrawalsComponent) },
      { path: 'disputes', loadComponent: () => import('./pages/admin/admin-disputes').then(m => m.AdminDisputesComponent) },
      { path: 'revenue', loadComponent: () => import('./pages/admin/admin-revenue').then(m => m.AdminRevenueComponent) },
      { path: 'payos-logs', loadComponent: () => import('./pages/admin/admin-payos').then(m => m.AdminPayosComponent) },
      { path: 'ledger', loadComponent: () => import('./pages/admin/admin-ledger').then(m => m.AdminLedgerComponent) },
    ]
  },
  {
    path: 'pricing',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Employer'] },
    loadComponent: () => import('./pages/pricing/pricing').then(m => m.PricingComponent),
  },
  {
    path: 'payment/success',
    loadComponent: () => import('./pages/payment/payment-success').then(m => m.PaymentSuccessComponent),
  },
  {
    path: 'payment/cancel',
    loadComponent: () => import('./pages/payment/payment-cancel').then(m => m.PaymentCancelComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

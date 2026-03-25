import { Routes } from '@angular/router';

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
    loadComponent: () => import('./pages/employer-dashboard/employer-dashboard').then(m => m.EmployerDashboardComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./pages/admin/admin-dashboard').then(m => m.AdminDashboardComponent),
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/admin-users').then(m => m.AdminUsersComponent),
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pages/pricing/pricing').then(m => m.PricingComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

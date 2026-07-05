import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const rolesData = route.data?.['roles'];
    const expectedRoles = Array.isArray(rolesData) ? rolesData.map((r: string) => r.toLowerCase()) : [];
    const user = authService.currentUser();

    if (authService.isLoggedIn() && user && user.role) {
      if (expectedRoles.length === 0 || expectedRoles.includes(user.role.toLowerCase())) {
        return true;
      }
    }

    console.warn('RoleGuard: Access denied. Expected roles:', expectedRoles, 'User role:', user?.role);
    router.navigate(['/']);
    return false;
  } catch (error) {
    console.error('RoleGuard error:', error);
    router.navigate(['/']);
    return false;
  }
};

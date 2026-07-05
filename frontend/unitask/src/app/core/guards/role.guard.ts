import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = (route.data['roles'] as Array<string>).map(r => r.toLowerCase());
  const user = authService.currentUser();

  if (authService.isLoggedIn() && user && expectedRoles.includes(user.role.toLowerCase())) {
    return true;
  }

  // Not authorized, redirect to home or login
  router.navigate(['/']);
  return false;
};

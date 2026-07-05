import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    if (authService.isLoggedIn()) {
      return true;
    }

    // Redirect to login page
    router.navigate(['/login']);
    return false;
  } catch (error) {
    console.error('AuthGuard error:', error);
    router.navigate(['/login']);
    return false;
  }
};

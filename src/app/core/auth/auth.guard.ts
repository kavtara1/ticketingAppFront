import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accessToken = authService.getAccessToken();

  if (!accessToken) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: state.url }
    });
  }

  return authService.ensureValidSession().pipe(
    map((isValid) => {
      if (isValid) {
        return true;
      }

      authService.logout();
      return router.createUrlTree(['/login'], {
        queryParams: { redirectTo: state.url }
      });
    })
  );
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../config/api.config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accessToken = authService.getAccessToken();
  const isAuthRequest =
    req.url.startsWith(API_ENDPOINTS.login) ||
    req.url.startsWith(API_ENDPOINTS.refreshToken) ||
    req.url.startsWith(API_ENDPOINTS.validateToken);

  if (isAuthRequest || !accessToken) {
    return next(req);
  }

  const authorizedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return next(authorizedRequest).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          if (!newAccessToken) {
            authService.logout();
            void router.navigate(['/login']);
            return throwError(() => error);
          }

          return next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              }
            })
          );
        }),
        catchError((refreshError) => {
          authService.logout();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};

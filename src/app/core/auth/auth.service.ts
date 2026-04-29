import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import { API_ENDPOINTS } from '../config/api.config';
import { AuthTokens, CurrentUser, TokenRefreshResponse, TokenValidationResponse } from './auth.models';

const ACCESS_TOKEN_KEY = 'ticketing.accessToken';
const REFRESH_TOKEN_KEY = 'ticketing.refreshToken';
const CURRENT_USER_KEY = 'ticketing.currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly accessToken = signal<string | null>(this.readToken(ACCESS_TOKEN_KEY));
  private readonly currentUser = signal<CurrentUser | null>(this.readCurrentUser());

  readonly isAuthenticated = this.accessToken.asReadonly();

  login(username: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(API_ENDPOINTS.login, { username, password })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    return this.readToken(REFRESH_TOKEN_KEY);
  }

  validateToken(token: string): Observable<TokenValidationResponse> {
    return this.http.post<TokenValidationResponse>(API_ENDPOINTS.validateToken, { token });
  }

  fetchCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(API_ENDPOINTS.me).pipe(tap((user) => this.storeCurrentUser(user)));
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUser();
  }

  getDepartmentRoute(department: string | null | undefined): string {
    const normalizedDepartment = department?.toLowerCase();

    if (normalizedDepartment === 'telephonegram') {
      return '/telephonegram';
    }

    if (normalizedDepartment === 'servicenet') {
      return '/servicenet';
    }

    return '/ticketingusers';
  }

  refreshAccessToken(): Observable<string | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return of(null);
    }

    return this.http
      .post<TokenRefreshResponse>(API_ENDPOINTS.refreshToken, { refresh: refreshToken })
      .pipe(
        map((response) => {
          this.setAccessToken(response.access);
          return response.access;
        }),
        catchError(() => of(null))
      );
  }

  ensureValidSession(): Observable<boolean> {
    const token = this.getAccessToken();
    if (!token) {
      return of(false);
    }

    return this.validateToken(token).pipe(
      switchMap((response) => (response.valid ? of(true) : this.tryRefreshSession())),
      catchError(() => this.tryRefreshSession())
    );
  }

  hasValidSession(): boolean {
    return Boolean(this.accessToken());
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    this.accessToken.set(tokens.access);
  }

  private setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    this.accessToken.set(token);
  }

  private tryRefreshSession(): Observable<boolean> {
    return this.refreshAccessToken().pipe(map((newToken) => Boolean(newToken)));
  }

  private readToken(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }

  private storeCurrentUser(user: CurrentUser): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private readCurrentUser(): CurrentUser | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const rawUser = localStorage.getItem(CURRENT_USER_KEY);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as CurrentUser;
    } catch {
      return null;
    }
  }
}

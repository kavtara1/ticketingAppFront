import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

import { API_ENDPOINTS } from '../config/api.config';
import { AuthTokens } from './auth.models';

const ACCESS_TOKEN_KEY = 'ticketing.accessToken';
const REFRESH_TOKEN_KEY = 'ticketing.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly accessToken = signal<string | null>(this.readToken(ACCESS_TOKEN_KEY));

  readonly isAuthenticated = this.accessToken.asReadonly();

  login(username: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(API_ENDPOINTS.login, { username, password })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.accessToken.set(null);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  hasValidSession(): boolean {
    return Boolean(this.accessToken());
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    this.accessToken.set(tokens.access);
  }

  private readToken(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }
}

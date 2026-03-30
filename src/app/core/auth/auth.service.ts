import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { enterNgZone } from '../utils/rxjs-zone';
import { RsaPasswordService } from './rsa-password.service';

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

interface TokenResponse {
  accessToken: string;
  refreshToken?: string | null;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

interface OAuth2LoginRequest {
  token: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Backend uses `server.servlet.context-path: /api`, so endpoints are `/api/auth/**`.
  // Dùng URL relative để dev server (proxy) có thể tránh lỗi CORS.
  private readonly apiBaseUrl = '/api/auth';
  private accessToken: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly rsaPassword: RsaPasswordService,
    private readonly ngZone: NgZone
  ) {}

  login(payload: LoginRequest): Observable<ApiResponse<TokenResponse>> {
    return from(this.rsaPassword.encryptPassword(payload.password)).pipe(
      enterNgZone(this.ngZone),
      switchMap((password) =>
        this.http.post<ApiResponse<TokenResponse>>(
          `${this.apiBaseUrl}/login`,
          { email: payload.email, password },
          { withCredentials: true }
        )
      ),
      enterNgZone(this.ngZone)
    );
  }

  register(payload: RegisterRequest): Observable<ApiResponse<void>> {
    return from(this.rsaPassword.encryptPassword(payload.password)).pipe(
      enterNgZone(this.ngZone),
      switchMap((password) =>
        this.http.post<ApiResponse<void>>(`${this.apiBaseUrl}/register`, {
          email: payload.email,
          username: payload.username,
          password,
          fullName: payload.fullName
        })
      ),
      enterNgZone(this.ngZone)
    );
  }

  oauth2Login(provider: string, token: string): Observable<ApiResponse<TokenResponse>> {
    const payload: OAuth2LoginRequest = { token };
    return this.http.post<ApiResponse<TokenResponse>>(`${this.apiBaseUrl}/oauth2/${provider}`, payload, {
      withCredentials: true
    });
  }

  saveTokens(tokens: TokenResponse): void {
    this.accessToken = tokens.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearSession(): void {
    this.accessToken = null;
  }

  /** Giải mã payload JWT để lấy email (subject). Không cần verify chữ ký phía FE. */
  getCurrentUserEmail(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return (payload.sub as string) || null;
    } catch {
      return null;
    }
  }

  refreshAccessToken(): Observable<ApiResponse<TokenResponse>> {
    return this.http.post<ApiResponse<TokenResponse>>(
      `${this.apiBaseUrl}/refresh-token`,
      {},
      { withCredentials: true }
    );
  }

  logout(): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.apiBaseUrl}/logout`,
      {},
      { withCredentials: true }
    );
  }

  verifyEmail(token: string): Observable<ApiResponse<void>> {
    return this.http.get<ApiResponse<void>>(`${this.apiBaseUrl}/verify-email`, {
      params: { token }
    });
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiBaseUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ApiResponse<void>> {
    return from(this.rsaPassword.encryptPassword(payload.newPassword)).pipe(
      enterNgZone(this.ngZone),
      switchMap((newPassword) =>
        this.http.post<ApiResponse<void>>(`${this.apiBaseUrl}/reset-password`, {
          token: payload.token,
          newPassword
        })
      ),
      enterNgZone(this.ngZone)
    );
  }
}

import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAccessToken();
    const headers: Record<string, string> = {
      'Accept-Language': this.i18n.currentLanguage(),
    };

    // Backend JWT filter chỉ cho phép đi qua nếu header `Authorization: Bearer <token>`.
    // Không gắn cho các endpoint public của auth.
    if (token && !this.isPublicAuthEndpoint(req.url) && !req.headers.has('Authorization')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const authReq = req.clone({ setHeaders: headers });
    return next.handle(authReq);
  }

  private isPublicAuthEndpoint(url: string): boolean {
    // Những URL này không cần Authorization.
    return (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/oauth2/') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/password-encryption-key')
    );
  }
}


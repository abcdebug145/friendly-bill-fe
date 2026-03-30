import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Bảo vệ các route cần đăng nhập.
 *
 * - Nếu đã có access token trong bộ nhớ → cho qua ngay.
 * - Nếu chưa có (ví dụ: user reload trang) → gọi refresh-token trước.
 *   • Refresh thành công → lưu token và cho qua.
 *   • Refresh thất bại → chuyển hướng về /login.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    if (this.authService.getAccessToken()) {
      return of(true);
    }

    return this.authService.refreshAccessToken().pipe(
      map((res) => {
        if (res?.data?.accessToken) {
          this.authService.saveTokens(res.data);
          return true;
        }
        return this.router.createUrlTree(['/login']);
      }),
      catchError(() => of(this.router.createUrlTree(['/login'])))
    );
  }
}

import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuthService } from '../../core/auth/auth.service';
import { OAUTH_CONFIG } from '../../core/auth/oauth.config';
import { UbButtonDirective } from '~/components/ui/button';

declare const google: any;

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, TranslatePipe, UbButtonDirective],
  templateUrl: './register.html'
})
export class Register {
  username = '';
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  private googleClientId = OAUTH_CONFIG.googleClientId;
  private facebookAppId = OAUTH_CONFIG.facebookAppId;
  private googleSdkLoaded = false;
  private facebookSdkLoaded = false;

  constructor(
    public i18n: I18nService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const verifyToken = params.get('verifyToken');
      if (!verifyToken) return;

      this.successMessage = '';
      this.errorMessage = '';
      this.authService.verifyEmail(verifyToken).subscribe({
        next: () => {
          this.successMessage = 'Xác thực email thành công. Đang chuyển tới trang đăng nhập...';
          this.flushView();
          setTimeout(() => void this.router.navigate(['/login']), 1200);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractApiErrorMessage(error, 'Link xác thực không hợp lệ hoặc đã hết hạn.');
          this.flushView();
        }
      });
    });
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.username || !this.firstName || !this.lastName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Vui lòng điền đầy đủ thông tin.';
      return;
    }

    if (!this.agreeTerms) {
      this.errorMessage = 'Vui lòng đồng ý điều khoản trước khi đăng ký.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.isSubmitting = true;

    this.authService
      .register({
        email: this.email,
        username: this.username.trim(),
        password: this.password,
        fullName: `${this.firstName} ${this.lastName}`.trim()
      })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.flushView();
        })
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.errorMessage = response.message || 'Đăng ký thất bại. Vui lòng thử lại.';
            this.flushView();
            return;
          }

          this.successMessage =
            response.message || 'Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.';
          this.flushView();
          setTimeout(() => {
            void this.router.navigate(['/login']);
          }, 1200);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractApiErrorMessage(error, 'Đăng ký thất bại. Vui lòng thử lại.');
          this.flushView();
        }
      });
  }

  private flushView(): void {
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  async registerWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    try {
      await this.loadGoogleSdk();
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.googleClientId,
        scope: 'openid email profile',
        callback: (response: any) => {
          const accessToken = response?.access_token;
          if (!accessToken) {
            this.errorMessage = 'Không lấy được token từ Google.';
            this.isSubmitting = false;
            this.flushView();
            return;
          }

          this.oauth2Register('google', accessToken);
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch {
      this.errorMessage = 'Không thể tải Google SDK. Vui lòng thử lại.';
      this.isSubmitting = false;
      this.flushView();
    }
  }

  async registerWithFacebook(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    try {
      await this.loadFacebookSdk();
      (window as any).FB.login(
        (response: any) => {
          const token = response?.authResponse?.accessToken;
          if (!token) {
            this.errorMessage = 'Không lấy được token từ Facebook.';
            this.isSubmitting = false;
            this.flushView();
            return;
          }

          this.oauth2Register('facebook', token);
        },
        { scope: 'email' }
      );
    } catch {
      this.errorMessage = 'Không thể tải Facebook SDK. Vui lòng thử lại.';
      this.isSubmitting = false;
      this.flushView();
    }
  }

  private oauth2Register(provider: string, token: string): void {
    this.authService
      .oauth2Login(provider, token)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.flushView();
        })
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.authService.saveTokens(response.data);
          }
          void this.router.navigate(['/dashboard']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractApiErrorMessage(error, 'Đăng ký OAuth2 thất bại. Vui lòng thử lại.');
          this.flushView();
        }
      });
  }

  private async loadGoogleSdk(): Promise<void> {
    if (this.googleSdkLoaded) {
      return;
    }

    const src = 'https://accounts.google.com/gsi/client';
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      this.googleSdkLoaded = true;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google SDK'));
      document.body.appendChild(script);
    });

    this.googleSdkLoaded = true;
  }

  private async loadFacebookSdk(): Promise<void> {
    if (this.facebookSdkLoaded) {
      return;
    }

    const src = 'https://connect.facebook.net/en_US/sdk.js';
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      this.facebookSdkLoaded = true;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      (window as any).fbAsyncInit = () => {
        (window as any).FB.init({
          appId: this.facebookAppId,
          cookie: true,
          xfbml: false,
          version: 'v18.0'
        });
        resolve();
      };

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.body.appendChild(script);
    });

    this.facebookSdkLoaded = true;
  }

  private extractApiErrorMessage(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const payload = httpError?.error;

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload) as { message?: string };
        return parsed.message || fallback;
      } catch {
        return payload || fallback;
      }
    }

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      return typeof message === 'string' && message ? message : fallback;
    }

    return fallback;
  }
}

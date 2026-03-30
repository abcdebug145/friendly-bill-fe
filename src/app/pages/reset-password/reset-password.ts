import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  token = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.token) {
      this.errorMessage = 'Link đặt lại mật khẩu không hợp lệ.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.isSubmitting = true;
    this.authService
      .resetPassword({ token: this.token, newPassword: this.password })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Đổi mật khẩu thành công. Đang chuyển tới đăng nhập...';
          setTimeout(() => void this.router.navigate(['/login']), 1200);
        },
        error: () => {
          this.errorMessage = 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
        },
      });
  }
}

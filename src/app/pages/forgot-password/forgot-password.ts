import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  email = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly authService: AuthService) {}

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.email.trim()) {
      this.errorMessage = 'Vui lòng nhập email.';
      return;
    }

    this.isSubmitting = true;
    this.authService
      .forgotPassword({ email: this.email.trim() })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.';
        },
        error: () => {
          this.successMessage = 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.';
        },
      });
  }
}

import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
})
export class VerifyEmail {
  status: 'loading' | 'success' | 'error' = 'loading';
  message = 'Đang xác thực email...';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status = 'error';
      this.message = 'Link xác thực không hợp lệ.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.status = 'success';
        this.message = 'Xác thực email thành công. Đang chuyển tới đăng nhập...';
        setTimeout(() => void this.router.navigate(['/login']), 1200);
      },
      error: () => {
        this.status = 'error';
        this.message = 'Link xác thực không hợp lệ hoặc đã hết hạn.';
      },
    });
  }
}

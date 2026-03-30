import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ProfileResponse, ProfileService } from '../../../core/services/profile.service';
import { UbButtonDirective } from '~/components/ui/button';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink, UbButtonDirective],
  templateUrl: './profile.component.html',
})
export class Profile implements OnInit {
  profile: ProfileResponse | null = null;
  fullName = '';
  phoneNumber = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  submittingProfile = false;
  submittingPassword = false;
  uploadingAvatar = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.profileService
      .getMe()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.profile = res.data ?? null;
          this.fullName = this.profile?.fullName ?? '';
          this.phoneNumber = this.profile?.phoneNumber ?? '';
        },
        error: () => (this.errorMessage = 'Không tải được hồ sơ.'),
      });
  }

  saveProfile(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.fullName.trim()) {
      this.errorMessage = 'Họ tên không được để trống.';
      return;
    }
    this.submittingProfile = true;
    this.profileService
      .updateMe({
        fullName: this.fullName.trim(),
        phoneNumber: this.phoneNumber.trim() || undefined,
        avatarUrl: this.profile?.avatarUrl,
      })
      .pipe(finalize(() => (this.submittingProfile = false)))
      .subscribe({
        next: (res) => {
          this.profile = res.data ?? this.profile;
          this.successMessage = 'Đã cập nhật hồ sơ.';
        },
        error: () => (this.errorMessage = 'Cập nhật hồ sơ thất bại.'),
      });
  }

  changePassword(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.newPassword.length < 6) {
      this.errorMessage = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      return;
    }
    this.submittingPassword = true;
    this.profileService
      .changePassword(this.oldPassword, this.newPassword)
      .pipe(finalize(() => (this.submittingPassword = false)))
      .subscribe({
        next: () => {
          this.oldPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.successMessage = 'Đã đổi mật khẩu.';
        },
        error: () => (this.errorMessage = 'Đổi mật khẩu thất bại. Kiểm tra mật khẩu cũ.'),
      });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingAvatar = true;
    this.profileService
      .uploadAvatar(file)
      .pipe(finalize(() => {
        this.uploadingAvatar = false;
        input.value = '';
      }))
      .subscribe({
        next: (res) => {
          if (res.data?.url) {
            this.profile = { ...(this.profile as ProfileResponse), avatarUrl: res.data.url };
            this.successMessage = 'Đã cập nhật ảnh đại diện.';
          }
        },
        error: () => (this.errorMessage = 'Tải ảnh đại diện thất bại.'),
      });
  }
}

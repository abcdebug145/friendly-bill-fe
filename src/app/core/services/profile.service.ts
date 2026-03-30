import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { RsaPasswordService } from '../auth/rsa-password.service';
import { enterNgZone } from '../utils/rxjs-zone';

export interface ProfileResponse {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  oauth2Provider?: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(
    private readonly http: HttpClient,
    private readonly rsaPassword: RsaPasswordService,
    private readonly ngZone: NgZone
  ) {}

  getMe(): Observable<ApiResponse<ProfileResponse>> {
    return this.http.get<ApiResponse<ProfileResponse>>('/api/users/me');
  }

  updateMe(request: UpdateProfileRequest): Observable<ApiResponse<ProfileResponse>> {
    return this.http.put<ApiResponse<ProfileResponse>>('/api/users/me', request);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<ApiResponse<void>> {
    return from(Promise.all([
      this.rsaPassword.encryptPassword(oldPassword),
      this.rsaPassword.encryptPassword(newPassword),
    ])).pipe(
      enterNgZone(this.ngZone),
      switchMap(([oldEncrypted, newEncrypted]) =>
        this.http.post<ApiResponse<void>>('/api/users/me/password', {
          oldPassword: oldEncrypted,
          newPassword: newEncrypted,
        })
      ),
      enterNgZone(this.ngZone)
    );
  }

  uploadAvatar(file: File): Observable<ApiResponse<{ url: string }>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>('/api/users/me/avatar', fd);
  }
}

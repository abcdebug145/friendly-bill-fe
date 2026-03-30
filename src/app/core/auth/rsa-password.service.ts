import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface ApiResponse<T> {
  message?: string;
  data?: T;
  success: boolean;
  code: number;
}

interface PasswordEncryptionKeyResponse {
  publicKeyPem: string;
}

/**
 * Mã hóa mật khẩu bằng RSA-OAEP SHA-256 (khớp BE: RSA/ECB/OAEPWithSHA-256AndMGF1Padding).
 */
@Injectable({ providedIn: 'root' })
export class RsaPasswordService {
  private readonly apiBaseUrl = '/api/auth';
  private cryptoKeyPromise: Promise<CryptoKey> | null = null;

  constructor(private readonly http: HttpClient) {}

  /** Gửi mật khẩu thuần → Base64 ciphertext (một lần gọi = một bản mã hóa mới). */
  async encryptPassword(plainPassword: string): Promise<string> {
    const key = await this.getPublicCryptoKey();
    const encoded = new TextEncoder().encode(plainPassword);
    const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
    return arrayBufferToBase64(cipher);
  }

  /** Quên cache public key (vd. sau khi BE đổi cặp khóa). */
  clearKeyCache(): void {
    this.cryptoKeyPromise = null;
  }

  private getPublicCryptoKey(): Promise<CryptoKey> {
    if (!this.cryptoKeyPromise) {
      this.cryptoKeyPromise = this.loadAndImportPublicKey();
    }
    return this.cryptoKeyPromise;
  }

  private async loadAndImportPublicKey(): Promise<CryptoKey> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<PasswordEncryptionKeyResponse>>(
        `${this.apiBaseUrl}/password-encryption-key`
      )
    );
    const pem = res?.data?.publicKeyPem;
    if (!pem) {
      throw new Error('Không lấy được public key mã hóa mật khẩu từ server.');
    }
    const spki = pemToArrayBuffer(pem);
    return crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(lines);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

import { Injectable, signal } from '@angular/core';
import { LanguageCode, TRANSLATIONS } from './translations';

const LANGUAGE_STORAGE_KEY = 'friendly-bill.language';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly currentLanguage = signal<LanguageCode>(this.getInitialLanguage());

  constructor() {
    this.applyDocumentLanguage(this.currentLanguage());
  }

  setLanguage(language: LanguageCode): void {
    if (this.currentLanguage() === language) {
      return;
    }

    this.currentLanguage.set(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    this.applyDocumentLanguage(language);
    window.location.reload();
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLanguage() === 'en' ? 'vi' : 'en');
  }

  t(key: string): string {
    const dictionary = TRANSLATIONS[this.currentLanguage()];
    const value = key
      .split('.')
      .reduce<unknown>((accumulator, segment) => {
        if (accumulator && typeof accumulator === 'object' && segment in accumulator) {
          return (accumulator as Record<string, unknown>)[segment];
        }
        return null;
      }, dictionary);

    return typeof value === 'string' ? value : key;
  }

  private getInitialLanguage(): LanguageCode {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'en' || storedLanguage === 'vi') {
      return storedLanguage;
    }

    const browserLanguage = navigator.language.toLowerCase();
    return browserLanguage.startsWith('vi') ? 'vi' : 'en';
  }

  private applyDocumentLanguage(language: LanguageCode): void {
    document.documentElement.lang = language;
  }
}

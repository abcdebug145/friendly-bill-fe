import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'friendly-bill.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<ThemeMode>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  private getInitialTheme(): ThemeMode {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: ThemeMode): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

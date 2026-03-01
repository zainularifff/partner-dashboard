import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Simpan status tema, secara lalai 'false' (Light Mode)
  public isDarkMode = new BehaviorSubject<boolean>(false);

  constructor() {
    // Ambil memori dari LocalStorage kalau bos pernah set Dark Mode sebelum ni
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.setDarkMode(true);
    }
  }

  toggleTheme() {
    this.setDarkMode(!this.isDarkMode.value);
  }

  setDarkMode(isDark: boolean) {
    this.isDarkMode.next(isDark);
    
    // Simpan ke LocalStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Masukkan class 'dark-theme' terus ke <body> tag html
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}
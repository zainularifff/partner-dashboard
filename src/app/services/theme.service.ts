// theme.service.ts
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkModeSubject = new BehaviorSubject<boolean>(true);
  isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // Check local storage for saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      this.setLightMode();
    } else {
      this.setDarkMode(); // Default dark
    }
  }

  toggleTheme() {
    if (this.isDarkModeSubject.value) {
      this.setLightMode();
    } else {
      this.setDarkMode();
    }
  }

  setDarkMode() {
    this.renderer.removeClass(document.body, 'light-mode');
    this.isDarkModeSubject.next(true);
    localStorage.setItem('theme', 'dark');
  }

  setLightMode() {
    this.renderer.addClass(document.body, 'light-mode');
    this.isDarkModeSubject.next(false);
    localStorage.setItem('theme', 'light');
  }
}
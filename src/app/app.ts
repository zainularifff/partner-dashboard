import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// 1. IMPORT THEME SERVICE
// Nota: Pastikan path (laluan) ini betul mengikut folder di mana anda simpan theme.service.ts
import { ThemeService } from './services/theme.service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent implements OnInit {
  title = 'partner-dashboard';
  isLoginPage = false;
  
  // 2. VARIABLE UNTUK KAWAL IKON (Bulan/Matahari)
  isDarkMode = false; 

  // 3. INJECT THEME SERVICE KE DALAM CONSTRUCTOR
  constructor(private router: Router, private themeService: ThemeService) {}

  ngOnInit() {
    // Fungsi memantau pertukaran URL (Sedia ada)
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginPage =
          event.urlAfterRedirects.includes('/login') || event.urlAfterRedirects === '/';
      }
    });

    // 4. FUNGSI MEMANTAU STATUS DARK MODE DARI SERVICE
    this.themeService.isDarkMode.subscribe((status) => {
      this.isDarkMode = status;
    });
  }

  // 5. FUNGSI UNTUK BUTANG TOGGLE DI SIDEBAR HTML
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    // Tambah logic clear session/token di sini
    console.log("Sesi ditamatkan.");
    this.router.navigate(['/login']);
  }
}
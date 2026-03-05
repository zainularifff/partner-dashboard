import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from './services/theme.service';
import { LoadingService } from './services/loading.service';

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
  isDarkMode = false;  // <-- GUNA NI, BUKAN isDarkMode$

  constructor(
    private router: Router, 
    private themeService: ThemeService,
    public loadingService: LoadingService
  ) {}

  ngOnInit() {
    // Monitor route changes
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginPage =
          event.urlAfterRedirects.includes('/login') || event.urlAfterRedirects === '/';
      }
    });

    // Monitor theme changes
    this.themeService.isDarkMode$.subscribe((status: boolean) => {
      this.isDarkMode = status;
      console.log('Theme changed:', status ? 'Dark' : 'Light');
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    console.log("Session End.");
    this.router.navigate(['/login']);
  }
}
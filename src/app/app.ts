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
  isDarkMode = false;

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
          event.urlAfterRedirects.includes('/login') || 
          event.urlAfterRedirects === '/';
        
        console.log('Route changed:', event.urlAfterRedirects, 'isLoginPage:', this.isLoginPage);
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

  openSettings() {
    console.log('Opening settings...');
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      this.router.navigate(['/settings']);
    }, 300);
  }

  logout() {
    console.log("Session End.");
    this.router.navigate(['/login']);
  }
}
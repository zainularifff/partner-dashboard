import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { MatIconModule } from '@angular/material/icon'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    CommonModule,
    MatIconModule 
  ], 
  templateUrl: './app.html', 
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  title = 'partner-dashboard';
  isLoginPage = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Fungsi ini akan sentiasa memantau pertukaran URL
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Semak jika URL sekarang adalah '/login' atau path asal '/' yang redirect ke login
        this.isLoginPage = event.urlAfterRedirects.includes('/login') || event.urlAfterRedirects === '/';
      }
    });
  }
}
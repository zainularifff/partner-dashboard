import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common'; // Added for basic directives
import { MatIconModule } from '@angular/material/icon'; // 1. Import the Icon Module

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    CommonModule,
    MatIconModule // 2. Add it here to fix NG8001
  ], 
  templateUrl: './app.html', 
  styleUrl: './app.scss'
})
export class AppComponent {
  title = 'partner-dashboard';
}

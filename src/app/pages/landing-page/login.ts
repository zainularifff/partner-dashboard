import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private router: Router) {}

  onLogin() {
    if (this.username && this.password) {
      console.log('Login successful', this.username);
      this.router.navigate(['/management']);
    } else {
      alert('Sila masukkan ID Pengguna dan Kata Laluan anda.');
    }
  }
}
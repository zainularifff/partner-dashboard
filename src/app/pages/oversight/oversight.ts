import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon'; // Ensure this is here

@Component({
  selector: 'app-oversight',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './oversight.html',
  styleUrl: './oversight.scss'
})
export class OversightComponent {
  
  // ADD THIS ARRAY: This is what the HTML is looking for
  leases = [
    { 
      name: 'KPM JKR HRPZ II (SI-HRPZ-II-001)', 
      startDate: '01/01/2024', 
      endDate: '01/01/2027', 
      progress: 45, 
      daysLeft: 420 
    },
    { 
      name: 'KKM JKR HSNZ (SI-HSNZ-002)', 
      startDate: '15/03/2024', 
      endDate: '15/03/2027', 
      progress: 30, 
      daysLeft: 610 
    },
    { 
      name: 'MOE SK TAMAN MELATI', 
      startDate: '10/06/2023', 
      endDate: '10/06/2026', 
      progress: 85, 
      daysLeft: 112 
    }
  ];

  constructor() {}
}

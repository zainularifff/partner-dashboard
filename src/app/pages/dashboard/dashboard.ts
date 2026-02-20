import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentApi } from '../../services/dashboard.api';
import { MatIconModule } from '@angular/material/icon'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatProgressBarModule], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {

  incidents: any[] = [];
  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0;

  // Variables for the Server Breakdown
  openCount70 = 0;
  openCount51 = 0;

  // --- NEW: DRILL-DOWN VARIABLES ---
  selectedFilter: string | null = null;
  selectedFilterLabel = '';
  filteredIncidents: any[] = [];

  // --- STATIC DATA FOR UI ---
  brandRows = [
    { name:'Apple',  total:1240, new:45, young:30, mid:15, mature:7, legacy:3 },
    { name:'Dell',   total:2850, new:20, young:35, mid:25, mature:12, legacy:8 },
    { name:'Lenovo', total:1920, new:18, young:28, mid:32, mature:14, legacy:8 },
    { name:'HP',     total:3100, new:10, young:20, mid:30, mature:25, legacy:15 }
  ];

  assetTotal = 4821;

  topFault = [
    { name:'Dell Latitude 5420', rate:14 },
    { name:'MacBook Pro M1', rate:8 },
    { name:'HP EliteBook 840', rate:5 },
    { name:'Lenovo T14s', rate:3 },
    { name:'Dell 7490', rate:2 }
  ];

  vendorHealth = [
    { label: 'SERVER .70', percent: 0, color: 'green', ip: '192.168.140.70' },
    { label: 'SERVER .51', percent: 0, color: 'orange', ip: '192.168.140.51' },
    { label: 'SYSTEM OVERALL', percent: 0, color: 'red', ip: 'all' }
  ];

  vendorRows = [
    { partner:'FGV Global', mttr:'2.4h', fcr:92, color:'green' },
    { partner:'Edaran Solutions', mttr:'4.8h', fcr:78, color:'orange' },
    { partner:'Ventrade Corp', mttr:'8.2h', fcr:65, color:'red' }
  ];

  constructor(
    private api: IncidentApi,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('1. Dashboard Component Loaded');
    
    this.api.list().subscribe({
      next: (rows) => {
        console.log('2. API Success! Rows received:', rows.length);
        
        this.incidents = rows.map(x => ({
          id: x.request_no,
          title: x.title, // Added this to capture the ticket title
          statusCode: Number(x.request_status),
          created: new Date(Number(x.request_time) * 1000), 
          origin: x.origin_ip
        }));

        this.calcKpi();
        console.log('3. KPIs Calculated. Open Count:', this.openCount);
      },
      error: (err) => {
        console.error('API FAILED:', err);
      }
    });
  }

  // --- NEW: DRILL-DOWN FUNCTION ---
  selectFilter(type: string) {
    this.router.navigate(['/incident-detail', type]);
    
    if (type === 'open') {
      this.selectedFilterLabel = 'Open Tickets';
      this.filteredIncidents = this.incidents.filter(x => x.statusCode === 0);
    } else if (type === 'pending') {
      this.selectedFilterLabel = 'Pending Tickets';
      this.filteredIncidents = this.incidents.filter(x => x.statusCode === 13);
    } else if (type === 'solved') {
      this.selectedFilterLabel = 'Solved Tickets';
      this.filteredIncidents = this.incidents.filter(x => x.statusCode === 2);
    } else if (type === 'lapsed') {
      this.selectedFilterLabel = 'SLA Lapsed Tickets';
      const now = new Date();
      this.filteredIncidents = this.incidents.filter(x => {
        if (x.statusCode === 2) return false;
        const diffDays = (now.getTime() - x.created.getTime()) / (1000 * 3600 * 24);
        return diffDays > 7;
      });
    }

    // Optional: Smooth scroll to the table at the bottom
    setTimeout(() => {
      document.querySelector('.detail-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  calcKpi() {
    this.solvedCount = this.incidents.filter(x => x.statusCode === 2).length;
    this.pendingCount = this.incidents.filter(x => x.statusCode === 13).length;
    this.openCount = this.incidents.filter(x => x.statusCode === 0).length;

    this.openCount70 = this.incidents.filter(x => x.origin === '192.168.140.70' && x.statusCode === 0).length;
    this.openCount51 = this.incidents.filter(x => x.origin === '192.168.140.51' && x.statusCode === 0).length;

    const now = new Date();
    this.lapsedCount = this.incidents.filter(x => {
      if (x.statusCode === 2) return false;
      const diffDays = (now.getTime() - x.created.getTime()) / (1000 * 3600 * 24);
      return diffDays > 7;
    }).length;

    this.updateServerHealth();
  }

  updateServerHealth() {
    this.vendorHealth.forEach(server => {
      const serverData = server.ip === 'all' 
        ? this.incidents 
        : this.incidents.filter(x => x.origin === server.ip);

      if (serverData.length > 0) {
        const solved = serverData.filter(x => x.statusCode === 2).length;
        server.percent = Math.round((solved / serverData.length) * 100);
      } else {
        server.percent = 0;
      }
    });
  }
}

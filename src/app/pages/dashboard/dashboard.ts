import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentApi } from '../../services/dashboard.api';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {

  // ===============================
  // 🔴 LIVE DATA FROM BACKEND
  // ===============================

  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0;
  openCount70 = 0;
  openCount51 = 0;
  assetTotal = 0;

  isLoading = true;

  // ===============================
  // 🟡 STATIC UI DATA (TEMP)
  // ===============================

  brandRows = [
    { name:'Apple',  total:1240, new:45, young:30, mid:15, mature:7, legacy:3 },
    { name:'Dell',   total:2850, new:20, young:35, mid:25, mature:12, legacy:8 },
    { name:'Lenovo', total:1920, new:18, young:28, mid:32, mature:14, legacy:8 },
    { name:'HP',     total:3100, new:10, young:20, mid:30, mature:25, legacy:15 }
  ];

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

  // ===============================
  // INIT
  // ===============================

  ngOnInit(): void {
    this.loadDashboard();
  }

  // ===============================
  // LOAD DASHBOARD DATA
  // ===============================

    loadDashboard(): void {
    this.isLoading = true;

    forkJoin({
      summary: this.api.getSummary(),
      assets: this.api.getAssetTotal()
    }).subscribe({
      next: ({ summary, assets }: any) => {

        // Summary
        this.openCount    = summary.openTotal ?? 0;
        this.openCount70  = summary.open70 ?? 0;
        this.openCount51  = summary.open51 ?? 0;
        this.pendingCount = summary.pendingTotal ?? 0;
        this.solvedCount  = summary.solvedTotal ?? 0;
        this.lapsedCount  = summary.lapsedTotal ?? 0;

        // Asset
        this.assetTotal = assets.totalAssets ?? 0;

        this.updateServerHealth();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Dashboard Load Error:', err);
        this.isLoading = false;
      }
    });
  }

  // ===============================
  // UPDATE SERVER HEALTH %
  // ===============================

  updateServerHealth(): void {

    const totalOpen = this.openCount;

    this.vendorHealth.forEach(server => {

      if (server.ip === '192.168.140.70') {
        server.percent = totalOpen > 0
          ? Math.round((this.openCount70 / totalOpen) * 100)
          : 0;
      }

      else if (server.ip === '192.168.140.51') {
        server.percent = totalOpen > 0
          ? Math.round((this.openCount51 / totalOpen) * 100)
          : 0;
      }

      else if (server.ip === 'all') {
        const totalProcessed = this.solvedCount + this.openCount;
        server.percent = totalProcessed > 0
          ? Math.round((this.solvedCount / totalProcessed) * 100)
          : 0;
      }

    });
  }

  // ===============================
  // NAVIGATION
  // ===============================

  selectFilter(type: string): void {
    this.router.navigate(['/incident-detail', type]);
  }

}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatProgressBarModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  // LIVE TOTALS
  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0; // Sekarang akan ikut logik > 7 hari dari backend
  assetTotal = 0;

  serverSummary: any = {};
  isLoading = true;

  // DYNAMIC SPINNERS ARRAY
  vendorHealth: any[] = [];

  // STATIC DUMMY DATA (REMAINED)
  brandRows = [
    { name: 'Apple', total: 1240, new: 45, young: 30, mid: 15, mature: 7, legacy: 3 },
    { name: 'Dell', total: 2850, new: 20, young: 35, mid: 25, mature: 12, legacy: 8 },
    { name: 'Lenovo', total: 1920, new: 18, young: 28, mid: 32, mature: 14, legacy: 8 },
    { name: 'HP', total: 3100, new: 10, young: 20, mid: 30, mature: 25, legacy: 15 },
  ];

  topFault = [
    { name: 'Dell Latitude 5420', rate: 14 },
    { name: 'MacBook Pro M1', rate: 8 },
    { name: 'HP EliteBook 840', rate: 5 },
    { name: 'Lenovo T14s', rate: 3 },
    { name: 'Dell 7490', rate: 2 },
  ];

  vendorRows = [
    { partner: 'FGV Global', mttr: '2.4h', fcr: 92, color: 'green' },
    { partner: 'Edaran Solutions', mttr: '4.8h', fcr: 78, color: 'orange' },
    { partner: 'Ventrade Corp', mttr: '8.2h', fcr: 65, color: 'red' },
  ];

  constructor(
    private api: IncidentApi,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;

    forkJoin({
      summary: this.api.getSummary(),
      assets: this.api.getAssetTotal(),
    }).subscribe({
      next: ({ summary, assets }: any) => {
        this.serverSummary = summary;
        this.assetTotal = assets.totalAssets ?? 0;

        this.openCount = summary.openTotal ?? 0;
        this.pendingCount = summary.pendingTotal ?? 0;
        this.solvedCount = summary.solvedTotal ?? 0;

        // ✅ GUNA TERUS DARI BACKEND
        this.lapsedCount = summary.lapsedTotal ?? 0;

        this.generateServerHealthSpinners(summary);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  generateServerHealthSpinners(summary: any): void {
    const healthData = [];
    const colors = ['green', 'orange', 'purple', 'cyan'];
    let colorIdx = 0;

    // Filter key 'open' untuk paparan per server
    const serverKeys = Object.keys(summary).filter(
      (k) => k.startsWith('open') && k !== 'openTotal',
    );

    serverKeys.forEach((key) => {
      const serverId = key.replace('open', '');
      const rawCount = summary[key];
      const percent = this.openCount > 0 ? Math.round((rawCount / this.openCount) * 100) : 0;

      healthData.push({
        label: `SERVER .${serverId}`,
        percent: percent,
        rawCount: rawCount,
        color: colors[colorIdx % colors.length],
        type: 'server',
      });
      colorIdx++;
    });

    // ✅ LOGIK BARU: SLA Achievement
    // Mengira peratusan tiket yang diselesaikan berbanding jumlah keseluruhan
    // (Boleh diubah mengikut keperluan perniagaan)
    const totalRequests = this.solvedCount + this.openCount + this.pendingCount;
    const slaAchievement =
      totalRequests > 0 ? Math.round((this.solvedCount / totalRequests) * 100) : 0;

    healthData.push({
      label: 'SLA ACHIEVEMENT', // Menukar 'SYSTEM OVERALL' kepada SLA
      percent: slaAchievement,
      color: slaAchievement > 80 ? 'green' : slaAchievement > 50 ? 'orange' : 'red',
      type: 'overall',
    });

    this.vendorHealth = healthData;
  }

  selectFilter(type: string): void {
    // Navigasi ke halaman detail dengan membawa data summary sedia ada
    this.router.navigate(['/incident-detail', type], {
      state: { counts: this.serverSummary },
    });
  }
}

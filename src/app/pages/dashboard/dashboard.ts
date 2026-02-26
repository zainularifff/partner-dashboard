import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentApi } from '../../services/dashboard.api';
import { Router, RouterLink } from '@angular/router'; // ✅ Router diimport dngn betul
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatMenuModule,
    MatCheckboxModule,
    MatTooltipModule,
    RouterLink,
    BaseChartDirective,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  // ================= LIVE TOTALS =================
  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0;
  assetTotal = 0;

  serverSummary: any = {};
  isLoading = true;

  // ================= DYNAMIC ARRAYS =================
  vendorHealth: any[] = [];
  topFault: any[] = [];
  brandRows: any[] = [];
  serverStats: any[] = [];
  selectedServers: string[] = [];

  // ================= BLUE PALETTE =================
  private bluePalette = [
    '#004a91', '#0061bd', '#007ee6', '#1a9bff', '#66bfff',
    '#87ceeb', '#b3d9ff', '#003366', '#002244', '#4da3ff',
  ];

  // ================= ASSET BREAKDOWN =================
  assetBreakdown: any = {
    glc: 0, fsi: 0, edu: 0, gov: 0,
    desktop: 0, laptop: 0, server: 0, others: 0,
  };

  // ================= VENDOR ROWS =================
  vendorRows = [
    { partner: 'FGV Global', mttr: '2.4h', fcr: 92, color: 'green' },
    { partner: 'Edaran Solutions', mttr: '4.8h', fcr: 78, color: 'orange' },
    { partner: 'Ventrade Corp', mttr: '8.2h', fcr: 65, color: 'red' },
  ];

  // ================= LEASES =================
  leases = [
    { name: 'KPM JKR HRPZ II', startDate: '01/01/2024', endDate: '01/01/2027', progress: 45, daysLeft: 420 },
    { name: 'KKM JKR HSNZ', startDate: '15/03/2024', endDate: '15/03/2027', progress: 30, daysLeft: 610 },
    { name: 'MOE SK TAMAN MELATI', startDate: '10/06/2023', endDate: '10/06/2026', progress: 85, daysLeft: 112 },
  ];

  // ================= DONUT CONFIG =================
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    layout: { padding: 10 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(30, 41, 59, 1)',
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => `${item.raw} Assets`,
        },
      },
    },
  };

  public doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: this.bluePalette,
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    }],
  };

  constructor(
    private api: IncidentApi,
    private router: Router, // ✅ Router diinisialisasi
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  toggleServerFilter(sourceKey: string): void {
    const index = this.selectedServers.indexOf(sourceKey);
    if (index > -1) {
      this.selectedServers.splice(index, 1);
    } else {
      this.selectedServers.push(sourceKey);
    }
    this.applyDashboardFilters();
  }

  clearServerFilters(): void {
    this.selectedServers = [];
    this.applyDashboardFilters();
  }

  applyDashboardFilters(): void {
    const clientId = this.selectedServers.join(',');
    this.loadDashboard(clientId);
    this.cdr.detectChanges();
  }

  assignFaultColor(index: number): string {
    return index === 0 ? '#22c55e' : '#0061bd';
  }

  loadDashboard(clientId: string = ''): void {
    this.isLoading = true;
    this.api.getClients().pipe(
      catchError(() => of([])),
      map((clients: any[]) => {
        this.serverStats = clients.map((c) => ({ label: c.label, sourceKey: c.id }));
        return this.serverStats;
      }),
    ).subscribe((clients) => {
      forkJoin({
        summary: this.api.getSummary(clientId).pipe(catchError(() => of({}))),
        faults: this.api.getTopFaults(clientId).pipe(catchError(() => of([]))),
        aging: this.api.getBrandAging(clientId).pipe(catchError(() => of([]))),
        assetSummary: this.api.getAssetSummary(clientId).pipe(catchError(() => of({}))),
        assetsPerClient: forkJoin(
          clients.map((c) =>
            this.api.getAssetTotal(c.sourceKey).pipe(
              map((res) => ({ label: c.label, total: res.totalAssets || 0 })),
              catchError(() => of({ label: c.label, total: 0 })),
            ),
          ),
        ),
      }).subscribe({
        next: ({ summary, faults, aging, assetSummary, assetsPerClient }: any) => {
          this.serverSummary = summary;
          this.openCount = summary.openTotal ?? 0;
          this.pendingCount = summary.pendingTotal ?? 0;
          this.solvedCount = summary.solvedTotal ?? 0;
          this.lapsedCount = summary.lapsedTotal ?? 0;

          this.assetBreakdown = assetSummary;
          this.assetTotal = assetSummary.totalAsset ?? 0;

          this.doughnutChartData = {
            labels: assetsPerClient.map((c: any) => c.label),
            datasets: [{ ...this.doughnutChartData.datasets[0], data: assetsPerClient.map((c: any) => c.total) }],
          };

          if (Array.isArray(faults)) {
            this.topFault = faults
              .filter((m: any) => m.name && !m.name.toLowerCase().includes('vmware'))
              .slice(0, 5)
              .map((m: any, index: number) => ({
                ...m,
                percent: m.rate || 0,
                color: this.assignFaultColor(index),
              }));
          }

          this.brandRows = Array.isArray(aging) ? aging : [];
          this.generateServerHealthSpinners(summary);

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading dashboard:', err);
          this.isLoading = false;
        },
      });
    });
  }

  generateServerHealthSpinners(summary: any): void {
    const healthData: any[] = [];
    const colors = ['green', 'orange', 'purple', 'cyan'];
    let colorIdx = 0;
    const serverKeys = Object.keys(summary).filter((k) => k.startsWith('open') && k !== 'openTotal');

    serverKeys.forEach((key) => {
      const serverId = key.replace('open', '');
      const rawCount = summary[key];
      const percent = this.openCount > 0 ? Math.round((rawCount / this.openCount) * 100) : 0;
      healthData.push({ label: `SERVER .${serverId}`, percent, rawCount, color: colors[colorIdx % colors.length], type: 'server' });
      colorIdx++;
    });

    const totalRequests = this.solvedCount + this.openCount + this.pendingCount;
    const slaAchievement = totalRequests > 0 ? Math.round((this.solvedCount / totalRequests) * 100) : 0;
    healthData.push({ label: 'SLA ACHIEVEMENT', percent: slaAchievement, color: slaAchievement > 80 ? 'green' : 'orange', type: 'overall' });
    this.vendorHealth = healthData;
  }

  // ✅ LOGIC NAVIGATION BRAND (FIXED)
  handleBrandClick(brandName: string): void {
    if (!brandName) return;
    
    if (brandName.toUpperCase() === 'OTHERS') {
      // 🚀 Redirect ke Grid Selector untuk brand-brand kecil
      this.router.navigate(['/brand-selector']);
    } else {
      // 📊 Redirect ke Breakdown Table (Level 2)
      this.router.navigate(['/brand-breakdown', brandName]);
    }
  }

  selectFilter(type: string): void {
    this.router.navigateByUrl('/incident-detail', {
      state: { type, counts: this.serverSummary, activeFilter: this.selectedServers.join(',') },
    });
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentApi } from '../../services/dashboard.api';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ✅ UI MATERIAL MODULES
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
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  // LIVE TOTALS
  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0;
  assetTotal = 0;

  serverSummary: any = {};
  isLoading = true;

  // DYNAMIC ARRAYS
  vendorHealth: any[] = [];
  topFault: any[] = [];
  brandRows: any[] = [];

  // ✅ DATA UNTUK DROPDOWN FILTER (CLIENTS)
  serverStats: any[] = [];

  // ✅ FILTER STATE
  selectedServers: string[] = [];

  // STATIC DUMMY DATA
  vendorRows = [
    { partner: 'FGV Global', mttr: '2.4h', fcr: 92, color: 'green' },
    { partner: 'Edaran Solutions', mttr: '4.8h', fcr: 78, color: 'orange' },
    { partner: 'Ventrade Corp', mttr: '8.2h', fcr: 65, color: 'red' },
  ];

  leases = [
    { name: 'KPM JKR HRPZ II', startDate: '01/01/2024', endDate: '01/01/2027', progress: 45, daysLeft: 420 },
    { name: 'KKM JKR HSNZ', startDate: '15/03/2024', endDate: '15/03/2027', progress: 30, daysLeft: 610 },
    { name: 'MOE SK TAMAN MELATI', startDate: '10/06/2023', endDate: '10/06/2026', progress: 85, daysLeft: 112 }
  ];

  constructor(
    private api: IncidentApi,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  // ✅ LOGIC: Toggle Client Filter
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
    console.log('Reloading Dashboard for Clients:', clientId || 'All');
    this.loadDashboard(clientId);
    this.cdr.detectChanges();
  }

  getBarColor(rate: number): string {
    if (rate <= 25) return 'blue';
    if (rate <= 50) return 'green';
    if (rate <= 75) return 'orange';
    return 'red';
  }

  loadDashboard(clientId: string = ''): void {
    this.isLoading = true;

    forkJoin({
      summary: this.api.getSummary(clientId).pipe(catchError(() => of({}))),
      assets: this.api.getAssetTotal(clientId).pipe(catchError(() => of({ totalAssets: 0 }))),
      faults: this.api.getTopFaults(clientId).pipe(catchError(() => of([]))),
      aging: this.api.getBrandAging(clientId).pipe(catchError(() => of([]))),
      // Senarai clients ditarik sekali sahaja
      clients: this.serverStats.length === 0 
        ? this.api.getClients().pipe(catchError(() => of([]))) 
        : of(null),
    }).subscribe({
      next: ({ summary, assets, faults, aging, clients }: any) => {
        this.serverSummary = summary;
        this.openCount = summary.openTotal ?? 0;
        this.pendingCount = summary.pendingTotal ?? 0;
        this.solvedCount = summary.solvedTotal ?? 0;
        this.lapsedCount = summary.lapsedTotal ?? 0;
        this.assetTotal = assets.totalAssets ?? 0;

        if (Array.isArray(faults)) {
          this.topFault = faults
            .filter((m: any) => m.name && !m.name.toLowerCase().includes('vmware'))
            .slice(0, 5);
        }

        this.brandRows = Array.isArray(aging) ? aging : [];

        // ✅ FIXED: Gunakan Spread Operator [...] untuk paksa UI update dropdown
        if (clients && Array.isArray(clients)) {
          this.serverStats = [...clients.map((c: any) => ({
            label: c.label,
            sourceKey: c.id,
          }))];
          console.log('Clients loaded into dropdown:', this.serverStats);
        }

        this.generateServerHealthSpinners(summary);
        this.isLoading = false;
        
        // Panggil detectChanges di hujung untuk pastikan dropdown & grid update
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Kritikal Error Dashboard:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  generateServerHealthSpinners(summary: any): void {
    const healthData: any[] = [];
    const colors = ['green', 'orange', 'purple', 'cyan'];
    let colorIdx = 0;

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

    const totalRequests = this.solvedCount + this.openCount + this.pendingCount;
    const slaAchievement = totalRequests > 0 ? Math.round((this.solvedCount / totalRequests) * 100) : 0;

    healthData.push({
      label: 'SLA ACHIEVEMENT',
      percent: slaAchievement,
      color: slaAchievement > 80 ? 'green' : slaAchievement > 50 ? 'orange' : 'red',
      type: 'overall',
    });

    this.vendorHealth = healthData;
  }

  selectFilter(type: string): void {
    this.router.navigate(['/incident-detail', type], {
      state: { 
        counts: this.serverSummary,
        activeFilter: this.selectedServers.join(',')
      },
    });
  }
}

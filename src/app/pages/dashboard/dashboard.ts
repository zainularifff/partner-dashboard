import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentApi } from '../../services/dashboard.api';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subject, Observable } from 'rxjs';
import { catchError, map, switchMap, takeUntil, take, shareReplay } from 'rxjs/operators';

// ✅ INTEGRASI CHART.JS
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
    CommonModule, MatIconModule, MatProgressSpinnerModule,
    MatProgressBarModule, MatMenuModule, MatCheckboxModule,
    MatTooltipModule, RouterLink, BaseChartDirective,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private clients$: Observable<any[]> | null = null;

  // LIVE TOTALS
  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0;
  assetTotal = 0;

  // WIDGET DATA (SECTOR & MACHINE)
  sectorStats = { glc: 0, fsi: 0, edu: 0, gov: 0 };
  machineStats = { desktop: 0, laptop: 0, server: 0, others: 0 };

  serverSummary: any = {};
  isLoading = true;

  // DYNAMIC ARRAYS
  vendorHealth: any[] = [];
  topFault: any[] = [];
  brandRows: any[] = [];
  serverStats: any[] = [];
  selectedServers: string[] = [];

  private bluePalette = ['#004a91', '#0061bd', '#007ee6', '#1a9bff', '#66bfff', '#87ceeb', '#b3d9ff', '#003366', '#002244', '#4da3ff'];

  vendorRows = [
    { partner: 'FGV Global', mttr: '2.4h', fcr: 92, color: 'green' },
    { partner: 'Edaran Solutions', mttr: '4.8h', fcr: 78, color: 'orange' },
    { partner: 'Ventrade Corp', mttr: '8.2h', fcr: 65, color: 'red' },
  ];

  leases = [
    { name: 'KPM JKR HRPZ II', startDate: '01/01/2024', endDate: '01/01/2027', progress: 45, daysLeft: 420 },
    { name: 'KKM JKR HSNZ', startDate: '15/03/2024', endDate: '15/03/2027', progress: 30, daysLeft: 610 },
    { name: 'MOE SK TAMAN MELATI', startDate: '10/06/2023', endDate: '10/06/2026', progress: 85, daysLeft: 112 },
  ];

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true, maintainAspectRatio: false, cutout: '80%', layout: { padding: 10 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true, position: 'nearest', yAlign: 'bottom', backgroundColor: 'rgba(30, 41, 59, 1)',
        displayColors: false, padding: 12,
        callbacks: { title: (items) => items[0].label, label: (item) => `${item.raw} Assets` }
      }
    }
  };

  public doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: this.bluePalette, borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6 }]
  };

  constructor(private api: IncidentApi, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.clients$ = this.api.getClients().pipe(shareReplay(1), catchError(() => of([])));
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(clientId: string = ''): void {
    this.isLoading = true;
    if (!this.clients$) return;

    this.clients$.pipe(
      take(1),
      switchMap((clients: any[]) => {
        this.serverStats = clients.map(c => ({ label: c.label, sourceKey: c.id }));
        const selectedKeys = clientId ? clientId.split(',') : [];
        const activeServers = selectedKeys.length > 0 
          ? clients.filter(c => selectedKeys.includes(c.id)) 
          : clients;

        return forkJoin({
          summary: this.api.getSummary(clientId).pipe(catchError(() => of({}))),
          faults: this.api.getTopFaults(clientId).pipe(catchError(() => of([]))),
          aging: this.api.getBrandAging(clientId).pipe(catchError(() => of([]))),
          assetSummary: this.api.getAssetSummary(clientId).pipe(catchError(() => of({}))),
          assetsPerClient: forkJoin(
            activeServers.map(c => this.api.getAssetTotal(c.id).pipe(
              map(res => ({ label: c.label, total: res.totalAssets || 0 })),
              catchError(() => of({ label: c.label, total: 0 }))
            ))
          )
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        const { summary, faults, aging, assetsPerClient, assetSummary } = res;

        this.openCount = summary.openTotal ?? 0;
        this.pendingCount = summary.pendingTotal ?? 0;
        this.solvedCount = summary.solvedTotal ?? 0;
        this.lapsedCount = summary.lapsedTotal ?? 0;

        this.assetTotal = assetSummary?.totalAsset ?? 0;
        this.sectorStats = {
          glc: assetSummary?.glc ?? 0,
          fsi: assetSummary?.fsi ?? 0,
          edu: assetSummary?.edu ?? 0,
          gov: assetSummary?.gov ?? 0
        };
        this.machineStats = {
          desktop: assetSummary?.desktop ?? 0,
          laptop: assetSummary?.laptop ?? 0,
          server: assetSummary?.server ?? 0,
          others: assetSummary?.others ?? 0
        };

        this.doughnutChartData = {
          labels: assetsPerClient.map((c: any) => c.label),
          datasets: [{
            ...this.doughnutChartData.datasets[0],
            data: assetsPerClient.map((c: any) => c.total)
          }]
        };

        if (Array.isArray(faults)) {
          this.topFault = faults
            .filter((m: any) => m.name && !m.name.toLowerCase().includes('vmware'))
            .slice(0, 5)
            .map((m: any, index: number) => ({
              ...m, rate: m.rate || 0, color: this.assignFaultColor(index)
            }));
        }

        // ✅ LOGIK MERGING BRAND AGING (Gabungkan ASUS Laptop + Desktop)
        if (Array.isArray(aging)) {
          const mergedMap = new Map<string, any>();
          aging.forEach((item: any) => {
            const brand = item.name;
            if (!mergedMap.has(brand)) {
              mergedMap.set(brand, { 
                name: brand, total: 0, 
                raw_n: 0, raw_s: 0, raw_ag: 0, raw_c: 0 
              });
            }
            const entry = mergedMap.get(brand);
            entry.total += item.total;
            entry.raw_n += (item.new / 100) * item.total;
            entry.raw_s += (item.standard / 100) * item.total;
            entry.raw_ag += (item.aging / 100) * item.total;
            entry.raw_c += (item.critical / 100) * item.total;
          });

          this.brandRows = Array.from(mergedMap.values()).map(b => ({
            name: b.name,
            total: b.total,
            new: Math.round((b.raw_n * 100) / b.total),
            standard: Math.round((b.raw_s * 100) / b.total),
            aging: Math.round((b.raw_ag * 100) / b.total),
            critical: Math.round((b.raw_c * 100) / b.total)
          })).sort((a, b) => b.total - a.total).slice(0, 7);
        }

        this.generateServerHealthSpinners(summary);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- UI CONTROLS ---
  toggleServerFilter(sourceKey: string): void {
    const index = this.selectedServers.indexOf(sourceKey);
    if (index > -1) this.selectedServers.splice(index, 1);
    else this.selectedServers.push(sourceKey);
    this.applyDashboardFilters();
  }

  clearServerFilters(): void {
    this.selectedServers = [];
    this.applyDashboardFilters();
  }

  applyDashboardFilters(): void {
    this.loadDashboard(this.selectedServers.join(','));
  }

  assignFaultColor(index: number): string {
    return index === 0 ? '#22c55e' : '#0061bd';
  }

  generateServerHealthSpinners(summary: any): void {
    const healthData: any[] = [];
    const colors = ['green', 'orange', 'purple', 'cyan'];
    let colorIdx = 0;
    const serverKeys = Object.keys(summary).filter(k => k.startsWith('open') && k !== 'openTotal');

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

  selectFilter(type: string): void {
    this.router.navigate(['/incident-detail', type], { state: { counts: this.serverSummary, activeFilter: this.selectedServers.join(',') } });
  }
}

import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './management.html',
  styleUrls: ['./management.scss'],
})
export class ManagementComponent implements OnInit, OnDestroy {
  stats: any = null;
  isLoading: boolean = false;
  isLoadingAi: boolean = true;
  aiSummary: string = '';
  keyAction: string = '';
  lastUpdated: Date = new Date();
  liveTimestamp: string = '';
  private timer: any;

  // === FINANCIAL METRICS ===
  totalCapexExposure: string = 'RM 5.40M';
  monthlyRecurringRevenue: string = 'RM 3.00M';
  osRiskExposure: string = 'RM 575k';
  revenueAtRisk: string = 'RM 1.2M';
  agingUnits: number = 4000;

  // === BIG 6 METRICS ===
  technicalEscalations: number = 10;
  portfolioDivergence = { value: 70, rate: '15.8' };
  utilizationRate: string = '87.6%';
  blindspotCount: number = 2300;
  operationalHealthScore: number = 92;

  // === ENHANCED METRICS ===
  growthTrend: string = '+12.5%';
  escalationRate: string = '+2.2%';

  // OS Risk
  osRiskLevel: string = 'HIGH';
  osRiskChange: string = '+8%';
  osBreakdownList = [
    { name: 'Win 7/XP/8', count: 650, percent: 57 },
    { name: 'Win 10 (Out)', count: 500, percent: 43 }
  ];

  // Revenue Breakdown
  revenueBreakdown = {
    entities: 3,
    units: 1250
  };

  mrrBreakdown = {
    trend: '+12.5%'
  };

  constructor(private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    this.startLiveTimestamp();
    setTimeout(() => {
      this.isLoading = false;
      this.isLoadingAi = false;
      this.aiSummary = `Executive Summary: Operational health is at ${this.operationalHealthScore}%. Growth is stable at ${this.growthTrend}, but oversight alert triggered for ${this.blindspotCount} unmonitored units. Critical revenue risk identified at ${this.revenueAtRisk} due to expiring contracts.`;
      this.keyAction = `Prioritize KKM's 45 Win10 units (EOL in 6 months) and PETRONAS legacy servers to mitigate RM 1.2M risk.`;
      this.cdr.detectChanges();
    }, 1500);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  startLiveTimestamp() {
    this.updateTimestamp();
    this.timer = setInterval(() => this.updateTimestamp(), 1000);
  }

  updateTimestamp() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    this.liveTimestamp = `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
    this.cdr.detectChanges();
  }

  onCardClick(type: string) {
    const routes: any = {
      'Project Portfolio': '/project',
      'Client Entities': '/client',
      'Risk Escalation': '/risk-escalation',
      'Asset Inventory': '/asset-utilization',
      'Capex': '/capex',
      'Portfolio Divergence': '/portfolio-analysis',
      'Revenue Risk': '/revenue-risk',
      'Monthly Revenue': '/revenue',
      'OS Risk': '/os-risk',
      'Service': '/service'
    };
    if (routes[type]) this.router.navigate([routes[type]]);
  }

  refreshBriefing() {
    this.isLoadingAi = true;
    setTimeout(() => {
      this.isLoadingAi = false;
      this.cdr.detectChanges();
    }, 800);
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { IncidentApi } from '../../services/dashboard.api';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './management.html',
  styleUrls: ['./management.scss'],
})
export class ManagementComponent implements OnInit {
  stats: any = null;
  isLoading: boolean = true;
  aiSummary: string = '';
  isLoadingAi: boolean = true;

  // --- STRATEGIC METRICS ---
  totalCapexExposure: string = 'RM 0';
  agingUnits: number = 0;
  monthlyRecurringRevenue: string = 'RM 0';

  // --- INSIGHT METRICS ---
  idleFinancialLoss: string = 'RM 0';
  osRiskExposure: string = 'RM 0';
  revenueAtRisk: string = 'RM 0';

  constructor(
    private api: IncidentApi,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchDashboardStats();
  }

  // 🛠️ HELPER: Format currency dengan safety check
  private formatCurrency(value: number | undefined | null): string {
    const num = value || 0; // Jika null/undefined, guna 0
    if (num >= 1000000000) {
      return `RM ${(num / 1000000000).toFixed(2)}B`;
    } else if (num >= 1000000) {
      return `RM ${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `RM ${Math.round(num / 1000)}k`;
    } else {
      return `RM ${num}`;
    }
  }

  fetchDashboardStats() {
    this.isLoading = true;
    this.api.getManagementStats().subscribe({
      next: (data) => {
        this.stats = data;

        // --- DATA SAFETY CHECK ---
        const deployedUnits = data.assets?.deployed || 0;
        const idleUnits = data.assets?.idle || 0;
        const capexExp = data.assets?.capexExposure || 0;
        const osRiskExp = data.risk_analysis?.financial_impact || 0;
        const idleLoss = data.assets?.idleLoss || 0;

        // --- STRATEGIC GRID ---
        this.agingUnits = idleUnits; 
        this.totalCapexExposure = this.formatCurrency(capexExp);
        this.monthlyRecurringRevenue = this.formatCurrency(deployedUnits * 150);

        // --- INSIGHT GRID ---
        // 1. OS Risk (RM 646k)
        this.osRiskExposure = this.formatCurrency(osRiskExp);
        
        // 2. Idle Loss (RM 17k)
        this.idleFinancialLoss = this.formatCurrency(idleLoss) + ' / mo';
        
        // 3. Revenue at Risk (FIXED NaN: Guna deployedUnits yang dah di-validate)
        const mrrValue = deployedUnits * 150;
        this.revenueAtRisk = this.formatCurrency(mrrValue * 0.2) + ' / mo';

        this.isLoading = false;
        this.generateAiInsight(data);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("❌ API Error:", err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  generateAiInsight(liveData: any) {
    if (!liveData) return;
    this.isLoadingAi = true;

    const active = liveData.portfolio?.active || 0;
    const visibility = liveData.visibility?.percentage || 0;
    const idle = liveData.assets?.idle || 0;
    const osRisk = liveData.risk_analysis?.total_units || 0;

    // AI Insight yang lebih dinamik merangkumi OS Risk baru
    const insight = `Operations report ${active} active projects with ${visibility}% visibility. Immediate attention required for ${osRisk} outdated OS units and ${idle} idle assets to mitigate a total financial exposure of ${this.osRiskExposure}.`;

    setTimeout(() => {
      this.aiSummary = insight;
      this.isLoadingAi = false;
      this.cdr.detectChanges();
    }, 1200);
  }
}
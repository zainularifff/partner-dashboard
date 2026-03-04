import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class ManagementComponent implements OnInit {
  stats: any = null;
  isLoading: boolean = false;
  isLoadingAi: boolean = true;
  aiSummary: string = '';

  // === 1. VARIABLES ASAL & FINANCIAL ===
  totalCapexExposure: string = 'RM 0';
  monthlyRecurringRevenue: string = 'RM 0';
  idleFinancialLoss: string = 'RM 0';
  osRiskExposure: string = 'RM 0';
  revenueAtRisk: string = 'RM 0';
  agingUnits: number = 0;
  
  // === 2. ESCALATION & SERVICE (LEVEL 2 INFO) ===
  majorEscalations: number = 0;
  escalationRate: string = '0%';

  // === 3. TAMBAHAN LOGIC LEVEL 1 (6 PILLARS) ===
  growthTrend: string = '';        // Pillar 1: Growth
  utilizationRate: string = '';    // Pillar 2: Efficiency
  blindspotCount: number = 0;      // Pillar 3: Oversight
  techDebtExposure: string = '';   // Pillar 4: Liability
  operationalHealthScore: number = 0; // Pillar 6: Financial Impact Score

  constructor(private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    this.runMockDashboard();
  }

  onCardClick(type: string) {
    if (type === 'Client Entities') {
      this.router.navigate(['/client']); // Hantar ke path 'client' yang ada dlm app.routes.ts
    } else if (type === 'Project Portfolio') {
      this.router.navigate(['/project']); 
    } else if (type === 'Risk Escalation') {
      this.router.navigate(['/risk-escalation']); 
    }
  }

  runMockDashboard() {
    this.isLoading = true;
    this.isLoadingAi = true;

    // Mock Data Lengkap mengikut 6 Pillar
    const mockData = {
      portfolio: { 
        total: 2, 
        active: 2, 
        inactive: 0, 
        partners: 6 
      },
      assets: { 
        total: 18500, 
        deployed: 16200, 
        idle: 2300,
        totalCapexExposure: 5400000 
      },
      helpdesk: { 
        total: 450, 
        l1_resolved: 380, 
        l2_escalated: 70, // Major isu yang naik ke Partner
        sla_compliance: 98.2, 
        avg_response: '18m' 
      },
      visibility: { 
        percentage: '87.5', 
        regional_health: [
          { name: 'Central', val: 100 },
          { name: 'Northern', val: 94 },
          { name: 'Southern', val: 88 }
        ] 
      },
      risk_analysis: { 
        financial_impact: 575000, 
        total_units: 1150,
        breakdown: {
          windows_7: 420,
          windows_xp: 150,
          windows_8: 80,
          windows_10_outdated: 500,
          aging_2_4_years: 6000,
          aging_4_years_plus: 4000
        },
        firmware_risk: 45
      }
    };

    setTimeout(() => {
      this.stats = mockData;

      // --- CALCULATING LEVEL 1 PILLARS ---
      
      // 1. Growth: Is operation expanding?
      this.growthTrend = '+12.5%'; 

      // 2. Efficiency: Capital generating revenue? (Deployed vs Total)
      const efficiency = (mockData.assets.deployed / mockData.assets.total) * 100;
      this.utilizationRate = efficiency.toFixed(1) + '%';

      // 3. Oversight: Unmonitored assets (Blindspots)
      this.blindspotCount = mockData.assets.total - mockData.assets.deployed;

      // 4. Liability: Future technical costs
      this.techDebtExposure = 'RM 2.1M'; // Combined Legacy & OS Risk
      
      // 5. Protection & Financial Impact
      this.totalCapexExposure = 'RM 5.40M';
      this.monthlyRecurringRevenue = 'RM 3.00M';
      this.osRiskExposure = 'RM 575k';
      this.revenueAtRisk = 'RM 1.2M';
      this.idleFinancialLoss = 'RM 240k';
      this.operationalHealthScore = 92; 

      // 6. Escalation Logic (Accountability)
      this.majorEscalations = mockData.helpdesk.l2_escalated;
      this.escalationRate = ((mockData.helpdesk.l2_escalated / mockData.helpdesk.total) * 100).toFixed(1) + '%';
      
      this.agingUnits = mockData.risk_analysis.breakdown.aging_4_years_plus;

      // Matikan Loading Screen
      this.isLoading = false;
      this.cdr.detectChanges();

      // AI Briefing Update
      setTimeout(() => {
        this.aiSummary = `Executive Summary: Operational health is at ${this.operationalHealthScore}%. 
        Growth is stable at ${this.growthTrend}, but oversight alert triggered for ${this.blindspotCount} unmonitored units. 
        Critical revenue risk identified at ${this.revenueAtRisk} due to expiring contracts.`;
        this.isLoadingAi = false;
        this.cdr.detectChanges();
      }, 1200);
    }, 1500);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './management.html', 
  styleUrls: ['./management.scss']
})
export class ManagementComponent implements OnInit {

  // --- THE BIG 4 (Level 1 Metrics - Leasing Focus) ---
  totalProjects: number = 15;
  activeProjects: number = 12;
  inactiveProjects: number = 3;

  totalClients: number = 42;

  totalAssets: number = 13450;
  deployedAssets: number = 12778;
  idleAssets: number = 672;

  agentVisibility: number = 98.5; // Percentage
  offlineAgents: number = 201;

  // --- STRATEGIC VALUE (Risk & Revenue) ---
  totalCapexExposure: string = 'RM 2.45M';
  agingUnits: number = 2400; // Units approaching EOL

  monthlyRecurringRevenue: string = 'RM 850k';
  expiringContracts: number = 3; // < 90 days

  // --- INSIGHTS ---
  idleFinancialLoss: string = 'RM 45,000 / mo';
  osRiskExposure: string = 'RM 120,000';
  revenueAtRisk: string = 'RM 320k / mo';

  // --- AI EXECUTIVE BRIEF ---
  aiSummary: string = '';
  isLoadingAi: boolean = true;

  constructor() { }

  ngOnInit(): void {
    // Simulasi loading AI Insight
    this.generateAiInsight();
  }

  generateAiInsight() {
    this.isLoadingAi = true;
    
    // Ayat AI yang direka khas untuk Hardware Leasing Partner
    const insights = [
      "Operasi mencatatkan 12 Projek dan 42 Klien aktif. Terdapat risiko keselamatan tinggi pada 1,240 PC dengan OS/BIOS lapuk yang boleh mengakibatkan penalti SLA. Anggaran CapEx untuk menggantikan 2,400 PC berikutan tamat tempoh sewa pada Q3 adalah RM 2.45M.",
      "Sebanyak 672 aset sedang berstatus 'Idle' menyebabkan potensi kebocoran pendapatan RM 45,000 bulan ini. Kadar ejen yang berfungsi ('Online') kekal stabil pada tahap 98.5%.",
      "MRR kekal pada paras RM 850k. Tumpuan utama pengurusan suku ini adalah memperbaharui 3 kontrak utama (KPM & KKM) yang menghampiri tempoh tamat pajakan bagi mengelakkan kerugian RM 320k sebulan."
    ];

    // Pilih insight pertama untuk demo
    // Boleh gunakan Math.random() untuk tukar-tukar insight
    setTimeout(() => {
      this.aiSummary = insights[0]; 
      this.isLoadingAi = false;
    }, 1500);
  }

  // --- NAVIGATION (Simulasi Drill-Down) ---
  navigateToProjectDetails() {
    console.log("Navigating to Level 2: Project Breakdown...");
    // this.router.navigate(['/projects']);
  }
}
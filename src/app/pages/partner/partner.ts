import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Service Imports
import { GeminiService } from '../../services/gemini-services'; 
import { IncidentApi } from '../../services/dashboard.api'; // Pastikan path ini betul

@Component({
  selector: 'app-partner',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './partner.html',
  styleUrls: ['./partner.scss']
})
export class PartnerComponent implements OnInit {
  // Services Injection
  private geminiService = inject(GeminiService) as any;
  private api = inject(IncidentApi); 
  
  // Variables
  private model: any; 
  isAnalyzing = false;
  aiResult: string = '';

  // Data Dashboard (UI State)
  vendorHealth = [
    { label: 'FGV OPS', percent: 92, matColor: 'primary' },
    { label: 'EDARAN OPS', percent: 78, matColor: 'accent' },
    { label: 'VENTRADE', percent: 65, matColor: 'warn' }
  ];

  stockData = {
    total: 4821,
    logisticCompliance: 92,
    fulfillmentRate: 78
  };

  reports = [
    { name: 'SLA Performance Report', status: 'Updated Today', icon: 'speed' },
    { name: 'Cost & Resource Analysis', status: 'Monthly Cycle', icon: 'payments' },
    { name: 'Asset Lifecycle Report', status: 'Ready for Review', icon: 'history' },
    { name: 'Customer Satisfaction (CSAT) Trends', status: 'Q1 Feedback', icon: 'thumb_up' }
  ];

  constructor() {}

  ngOnInit(): void {
    console.log('Partner Operational Dashboard Initialized');
    if (this.geminiService) {
      // Kita guna model yang paling stabil untuk v1beta
      this.model = this.geminiService.getModel();
    }
  }

  /**
   * Fungsi Utama: Menarik data dari semua API Backend (SQL)
   * dan menghantarnya ke Gemini untuk analisa strategik.
   */
  async generateAIAnalysis() {
    if (this.isAnalyzing || !this.model) return;
    this.isAnalyzing = true;
    this.aiResult = ''; 

    // SEDUT DATA HIDUP DARI BACKEND API (Endpoint #3, #6, #7, #10)
    forkJoin({
      summary: this.api.getSummary().pipe(catchError(() => of({ openTotal: 0, lapsedTotal: 0, solvedTotal: 0 }))),
      topFaults: this.api.getTopFaults().pipe(catchError(() => of([]))),
      aging: this.api.getBrandAging().pipe(catchError(() => of([]))),
      assetStats: this.api.getAssetSummary().pipe(catchError(() => of({ glc: 0, fsi: 0, gov: 0, totalAsset: 0 })))
    }).subscribe(async (data: any) => {
      
      // BINA PROMPT YANG MENGHUBUNGKAITKAN SEMUA DATA
      const context = `
        System: nPoints™ AISM Strategic Intelligence.
        Role: Chief Information Officer (CIO).

        LIVE OPERATIONAL DATA FROM SQL SERVERS:
        
        1. INCIDENT PERFORMANCE (SLA):
           - Total Tickets: ${data.summary.openTotal + data.summary.solvedTotal}
           - SLA Lapsed Tickets: ${data.summary.lapsedTotal} (Urgent)
           - Active Pending: ${data.summary.pendingTotal}
        
        2. ASSET LIFECYCLE RISKS:
           ${data.aging.slice(0, 5).map((b: any) => `- ${b.name}: ${b.critical}% Critical Attrition`).join('\n')}
        
        3. HARDWARE FAULT ANALYSIS:
           ${data.topFaults.slice(0, 3).map((f: any) => `- ${f.name}: ${f.rate}% Fault Rate`).join('\n')}
        
        4. SECTOR COMPOSITION:
           - GLC Assets: ${data.assetStats.glc}
           - FSI Assets: ${data.assetStats.fsi}
           - Gov/Edu Assets: ${data.assetStats.gov + data.assetStats.edu}

        TASK: 
        Analyze if the high 'SLA Lapsed' tickets correlate with the 'Critical Attrition' brands. 
        Provide a 3-sentence Executive Insight and one CapEx budget recommendation for the most at-risk sector.
      `;

      try {
        const result = await this.model.generateContent(context);
        const response = await result.response;
        this.aiResult = response.text(); // Paparkan di UI
      } catch (err) {
        console.error("Gemini Error:", err);
        this.aiResult = "AI Analysis failed to generate. Please check API connectivity.";
      } finally {
        this.isAnalyzing = false;
      }
    });
  }

  downloadReport(reportName: string) { alert(`Downloading ${reportName}...`); }
  onGenerateCustomReport(brand: string, period: string) { alert(`Generating ${brand} report for ${period}...`); }
}
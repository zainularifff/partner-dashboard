import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';

// Service Imports
import { GeminiService } from '../../services/gemini-services'; 
import { IncidentApi } from '../../services/dashboard.api';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './report.html',
  styleUrls: ['./report.scss']
})
export class ReportComponent implements OnInit {
  // Services Injection
  private geminiService = inject(GeminiService) as any;
  private api = inject(IncidentApi); 
  
  // Variables
  private model: any; 
  isAnalyzing = false;
  aiResult: string = '';
  selectedFormat: string = 'PDF';

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

  constructor(
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.show();
    
    setTimeout(() => {
      console.log('Partner Operational Dashboard Initialized');
      if (this.geminiService) {
        this.model = this.geminiService.getModel();
      }
      this.loadingService.hide();
    }, 1000);
  }

  // ==================== GEMINI AI ANALYSIS ====================

  async generateAIAnalysis() {
    if (this.isAnalyzing || !this.model) return;
    
    this.isAnalyzing = true;
    this.aiResult = ''; 
    this.loadingService.show();

    forkJoin({
      summary: this.api.getSummary().pipe(catchError(() => of({ openTotal: 0, lapsedTotal: 0, solvedTotal: 0, pendingTotal: 0 }))),
      topFaults: this.api.getTopFaults().pipe(catchError(() => of([]))),
      aging: this.api.getBrandAging().pipe(catchError(() => of([]))),
      assetStats: this.api.getAssetSummary().pipe(catchError(() => of({ glc: 0, fsi: 0, gov: 0, edu: 0, totalAsset: 0 })))
    }).subscribe(async (data: any) => {
      
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
        this.aiResult = response.text();
      } catch (err) {
        console.error("Gemini Error:", err);
        this.aiResult = "AI Analysis failed to generate. Please check API connectivity.";
      } finally {
        this.isAnalyzing = false;
        this.loadingService.hide();
      }
    });
  }

  // ==================== REPORT DATA ====================

  private getReportData(reportName: string): any {
    switch(reportName) {
      case 'SLA Performance Report':
        return {
          title: 'SLA Performance Report',
          date: new Date().toLocaleDateString(),
          data: {
            overall: '98.2%',
            byClient: [
              { client: 'KKM', sla: '72%', status: 'Critical' },
              { client: 'PETRONAS', sla: '85%', status: 'Warning' },
              { client: 'MOE', sla: '98%', status: 'Good' },
              { client: 'MINDEF', sla: '90%', status: 'Good' },
              { client: 'BANK', sla: '99%', status: 'Good' },
              { client: 'TM', sla: '97%', status: 'Good' }
            ],
            responseTime: '18m avg',
            tickets: { critical: 23, high: 35, medium: 26, low: 15 }
          }
        };
        
      case 'Cost & Resource Analysis':
        return {
          title: 'Cost & Resource Analysis',
          date: new Date().toLocaleDateString(),
          data: {
            monthlyRevenue: 'RM 3.00M',
            byClient: [
              { client: 'KKM', revenue: 'RM 1.2M', cost: 'RM 840k', margin: '30%' },
              { client: 'PETRONAS', revenue: 'RM 900k', cost: 'RM 630k', margin: '30%' },
              { client: 'MOE', revenue: 'RM 500k', cost: 'RM 350k', margin: '30%' },
              { client: 'MINDEF', revenue: 'RM 400k', cost: 'RM 280k', margin: '30%' }
            ],
            totalCost: 'RM 2.1M',
            netProfit: 'RM 900k'
          }
        };
        
      case 'Asset Lifecycle Report':
        return {
          title: 'Asset Lifecycle Report',
          date: new Date().toLocaleDateString(),
          data: {
            totalAssets: 18500,
            deployed: 16200,
            idle: 2300,
            osRisk: [
              { type: 'Win7/XP', count: 650, status: 'EOL' },
              { type: 'Win10 (Out)', count: 500, status: 'EOL 2025' },
              { type: 'Win10 (Current)', count: 1730, status: 'Good' },
              { type: 'Win11', count: 470, status: 'Good' }
            ],
            biosRisk: [
              { age: '<2 years', count: 1800 },
              { age: '2-4 years', count: 2200 },
              { age: '>4 years', count: 1200 }
            ]
          }
        };
        
      case 'Customer Satisfaction (CSAT) Trends':
        return {
          title: 'CSAT Trends - Q1 Feedback',
          date: new Date().toLocaleDateString(),
          data: {
            overall: '4.2/5.0',
            byClient: [
              { client: 'KKM', score: 4.0, trend: 'down' },
              { client: 'PETRONAS', score: 4.2, trend: 'up' },
              { client: 'MOE', score: 4.8, trend: 'up' },
              { client: 'MINDEF', score: 4.3, trend: 'up' },
              { client: 'BANK', score: 4.7, trend: 'up' },
              { client: 'TM', score: 4.1, trend: 'down' }
            ],
            topFeedback: [
              '"Fast response time" - MOE',
              '"Professional support" - BANK',
              '"Old hardware" - KKM'
            ]
          }
        };
        
      default:
        return { title: reportName, date: new Date().toLocaleDateString(), data: {} };
    }
  }

  // ==================== PDF EXPORT ====================

  downloadReport(reportName: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      const reportData = this.getReportData(reportName);
      this.generatePDF(reportName, reportData);
      this.loadingService.hide();
    }, 500);
  }

  private generatePDF(title: string, data: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to generate PDF');
      return;
    }
    
    const htmlContent = this.generateReportHTML(title, data);
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  private generateReportHTML(title: string, data: any): string {
    const fullDate = new Date().toLocaleString('en-MY', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>${title}</title>
          <style>
              /* ================= GLOBAL STYLES ================= */
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
              body {
                  font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                  background: #ffffff;
                  color: #1e293b;
                  line-height: 1.6;
                  padding: 30px;
              }

              /* ================= WATERMARK ================= */
              .watermark {
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(-45deg);
                  font-size: 80px;
                  font-weight: 800;
                  color: rgba(203, 213, 225, 0.15);
                  white-space: nowrap;
                  z-index: -1;
                  pointer-events: none;
                  text-transform: uppercase;
              }

              /* ================= COVER PAGE ================= */
              .cover-page {
                  height: 100vh;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  text-align: center;
                  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                  color: white;
                  margin: -30px -30px 30px -30px;
                  padding: 30px;
                  position: relative;
                  overflow: hidden;
              }

              .cover-page::before {
                  content: '';
                  position: absolute;
                  top: -50%;
                  right: -50%;
                  width: 200%;
                  height: 200%;
                  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                  opacity: 0.3;
              }

              .cover-logo {
                  font-size: 48px;
                  font-weight: 800;
                  margin-bottom: 20px;
                  position: relative;
                  z-index: 1;
              }

              .cover-logo span {
                  color: #3b82f6;
              }

              .cover-title {
                  font-size: 48px;
                  font-weight: 800;
                  margin-bottom: 20px;
                  position: relative;
                  z-index: 1;
                  max-width: 800px;
              }

              .cover-date {
                  font-size: 16px;
                  color: #94a3b8;
                  position: relative;
                  z-index: 1;
              }

              .cover-badge {
                  margin-top: 50px;
                  padding: 8px 20px;
                  background: rgba(255,255,255,0.1);
                  border-radius: 30px;
                  font-size: 14px;
                  color: #fbbf24;
                  position: relative;
                  z-index: 1;
              }

              /* ================= HEADER ================= */
              .report-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 30px;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #e2e8f0;
              }
              
              .logo-area {
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }
              
              .logo-icon {
                  width: 40px;
                  height: 40px;
                  background: linear-gradient(135deg, #2563eb, #3b82f6);
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 8px;
                  font-weight: bold;
                  font-size: 20px;
                  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
              }
              
              .logo-text {
                  font-size: 20px;
                  font-weight: 800;
                  color: #1e293b;
              }
              
              .logo-text span {
                  color: #2563eb;
              }
              
              .header-right {
                  text-align: right;
              }
              
              .report-title {
                  font-size: 28px;
                  font-weight: 800;
                  color: #1e293b;
                  margin-bottom: 5px;
              }
              
              .report-date {
                  color: #64748b;
                  font-size: 12px;
              }

              /* ================= EXECUTIVE SUMMARY ================= */
              .executive-summary {
                  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                  border-radius: 16px;
                  padding: 24px;
                  margin-bottom: 30px;
                  border-left: 4px solid #2563eb;
              }

              .executive-summary h2 {
                  font-size: 18px;
                  margin-bottom: 15px;
                  color: #0f172a;
                  display: flex;
                  align-items: center;
                  gap: 8px;
              }

              .executive-summary p {
                  color: #334155;
                  margin-bottom: 10px;
              }

              .executive-summary .highlight {
                  background: #2563eb;
                  color: white;
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  display: inline-block;
                  margin-right: 8px;
              }

              /* ================= METRICS CARDS ================= */
              .metrics-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 20px;
                  margin-bottom: 30px;
              }
              
              .metric-card {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 20px;
                  transition: all 0.2s;
                  position: relative;
                  overflow: hidden;
              }

              .metric-card::after {
                  content: '';
                  position: absolute;
                  top: 0;
                  right: 0;
                  width: 60px;
                  height: 60px;
                  background: linear-gradient(135deg, transparent 50%, rgba(37, 99, 235, 0.1) 50%);
              }
              
              .metric-label {
                  color: #64748b;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 8px;
                  font-weight: 600;
              }
              
              .metric-value {
                  font-size: 32px;
                  font-weight: 800;
                  color: #1e293b;
                  margin-bottom: 5px;
              }
              
              .metric-trend {
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  font-size: 12px;
              }
              
              .trend-up { color: #10b981; }
              .trend-down { color: #ef4444; }

              /* ================= SECTION HEADERS ================= */
              .section-title {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin: 40px 0 20px;
              }
              
              .section-icon {
                  width: 30px;
                  height: 30px;
                  background: #eff6ff;
                  color: #2563eb;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 8px;
                  font-size: 18px;
              }
              
              .section-title h2 {
                  font-size: 18px;
                  font-weight: 700;
                  color: #1e293b;
              }

              /* ================= TABLES ================= */
              .table-container {
                  background: white;
                  border-radius: 16px;
                  border: 1px solid #e2e8f0;
                  overflow: hidden;
                  margin-bottom: 30px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              }
              
              table {
                  width: 100%;
                  border-collapse: collapse;
              }
              
              th {
                  background: #f1f5f9;
                  padding: 14px 16px;
                  text-align: left;
                  font-size: 12px;
                  font-weight: 700;
                  color: #475569;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }
              
              td {
                  padding: 14px 16px;
                  border-bottom: 1px solid #e2e8f0;
                  font-size: 14px;
                  color: #334155;
              }
              
              tr:last-child td { border-bottom: none; }
              tr:hover td { background: #f8fafc; }

              /* Status Badges */
              .badge {
                  display: inline-block;
                  padding: 4px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 600;
                  text-align: center;
                  min-width: 70px;
              }
              
              .badge-critical { background: #fee2e2; color: #b91c1c; }
              .badge-warning { background: #fff3cd; color: #b45309; }
              .badge-good { background: #dcfce7; color: #15803d; }
              .badge-info { background: #e0f2fe; color: #0369a1; }

              /* ================= PROGRESS BARS ================= */
              .progress-container {
                  margin: 20px 0;
              }
              
              .progress-item {
                  margin-bottom: 15px;
              }
              
              .progress-header {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 5px;
                  font-size: 13px;
              }
              
              .progress-bar-bg {
                  width: 100%;
                  height: 8px;
                  background: #e2e8f0;
                  border-radius: 4px;
                  overflow: hidden;
              }
              
              .progress-fill {
                  height: 100%;
                  border-radius: 4px;
                  transition: width 0.3s;
              }

              /* ================= TWO COLUMN LAYOUT ================= */
              .two-column {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                  margin-bottom: 30px;
              }

              .info-card {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 20px;
              }

              .info-card h3 {
                  font-size: 14px;
                  margin-bottom: 15px;
                  color: #1e293b;
                  display: flex;
                  align-items: center;
                  gap: 6px;
              }

              .info-card h3 .icon {
                  color: #2563eb;
              }

              /* ================= AI INSIGHTS CARD ================= */
              .ai-card {
                  background: linear-gradient(135deg, #1e293b, #0f172a);
                  border-radius: 16px;
                  padding: 24px;
                  margin: 30px 0;
                  color: white;
                  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
              }
              
              .ai-header {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin-bottom: 15px;
              }
              
              .ai-header span { font-size: 24px; }
              .ai-header h3 { 
                  font-size: 14px; 
                  letter-spacing: 1px; 
                  color: #94a3b8; 
                  margin: 0;
              }
              
              .ai-content p { 
                  color: #e2e8f0; 
                  font-size: 15px; 
                  line-height: 1.7; 
                  margin-bottom: 15px; 
              }
              
              .ai-footer { 
                  color: #64748b; 
                  font-size: 11px; 
                  border-top: 1px solid rgba(255,255,255,0.1);
                  padding-top: 15px;
              }

              /* ================= RECOMMENDATION CARD ================= */
              .recommendation-card {
                  background: #eff6ff;
                  border: 1px solid #bfdbfe;
                  border-radius: 12px;
                  padding: 20px;
                  margin-bottom: 30px;
                  display: flex;
                  align-items: center;
                  gap: 15px;
              }
              
              .rec-icon {
                  background: #2563eb;
                  color: white;
                  width: 48px;
                  height: 48px;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 24px;
                  flex-shrink: 0;
              }
              
              .rec-content h3 { 
                  font-size: 16px; 
                  margin-bottom: 5px; 
                  color: #1e293b; 
              }
              
              .rec-content p { 
                  color: #334155; 
                  margin-bottom: 5px; 
              }
              
              .rec-content strong { 
                  color: #2563eb; 
              }

              /* ================= CHART ================= */
              .chart-container {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 20px;
                  margin-bottom: 30px;
              }

              .bar-chart {
                  display: flex;
                  align-items: flex-end;
                  gap: 20px;
                  height: 200px;
                  margin-top: 20px;
              }
              
              .bar {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 10px;
              }
              
              .bar-fill {
                  width: 60px;
                  border-radius: 6px 6px 0 0;
                  transition: height 0.3s;
              }
              
              .bar-label {
                  font-size: 12px;
                  color: #64748b;
              }

              /* ================= FOOTER ================= */
              .report-footer {
                  margin-top: 50px;
                  padding-top: 20px;
                  border-top: 1px solid #e2e8f0;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  font-size: 11px;
                  color: #94a3b8;
              }
              
              .footer-left { display: flex; gap: 20px; }
              .footer-right { text-align: right; }

              /* ================= PAGE BREAK ================= */
              .page-break {
                  page-break-before: always;
                  margin-top: 30px;
              }

              /* ================= PRINT STYLES ================= */
              @media print {
                  body { padding: 0.5in; }
                  .no-print { display: none; }
                  .page-break { page-break-before: always; }
              }
          </style>
      </head>
      <body>
          <!-- Cover Page -->
          <div class="cover-page">
              <div class="cover-logo">nPoints™ <span>AISM</span></div>
              <div class="cover-title">${title}</div>
              <div class="cover-date">Generated on ${data.date}</div>
              <div class="cover-badge">CONFIDENTIAL • EXECUTIVE SUMMARY</div>
          </div>

          <!-- Watermark -->
          <div class="watermark">nPoints™ AISM</div>

          <!-- Executive Summary -->
          <div class="executive-summary">
              <h2>📋 EXECUTIVE SUMMARY</h2>
              ${this.generateExecutiveSummary(title, data)}
          </div>

          <!-- Metrics Grid -->
          <div class="metrics-grid">
              ${this.generateMetrics(title, data)}
          </div>

          <!-- AI Insights -->
          <div class="ai-card">
              <div class="ai-header">
                  <span>🧠</span>
                  <h3>STRATEGIC AI INSIGHTS</h3>
              </div>
              <div class="ai-content">
                  ${this.generateAIContent(title, data)}
              </div>
              <div class="ai-footer">Analysis powered by Gemini 1.5 Flash • Based on Real-time SQL Data</div>
          </div>

          <!-- Client SLA Performance -->
          <div class="section-title">
              <div class="section-icon">📊</div>
              <h2>${title}</h2>
          </div>

          <div class="table-container">
              <table>
                  <thead>
                      <tr>${this.getTableHeaders(title)}</tr>
                  </thead>
                  <tbody>
                      ${this.generateTableRows(title, data)}
                  </tbody>
              </table>
          </div>

          <!-- Footer -->
          <div class="report-footer">
              <div class="footer-left">
                  <span>nPoints™ AISM Platform</span>
                  <span>Confidential</span>
              </div>
              <div class="footer-right">
                  <span>Page 1 • Generated on ${fullDate}</span>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  private generateExecutiveSummary(title: string, data: any): string {
    if (title.includes('SLA')) {
      return `
        <p><span class="highlight">OVERALL SLA</span> ${data.data.overall} with ${data.data.tickets.critical} critical tickets</p>
        <p><span class="highlight">TOP ISSUE</span> KKM at 72% SLA with 84 open tickets</p>
        <p><span class="highlight">RECOMMENDATION</span> Focus on KKM's legacy hardware refresh</p>
      `;
    } else if (title.includes('Cost')) {
      return `
        <p><span class="highlight">MONTHLY REVENUE</span> ${data.data.monthlyRevenue} with RM 2.1M cost</p>
        <p><span class="highlight">PROFIT MARGIN</span> 30% across all clients</p>
        <p><span class="highlight">TOP CONTRIBUTOR</span> KKM: RM 1.2M revenue</p>
      `;
    } else if (title.includes('Asset')) {
      return `
        <p><span class="highlight">TOTAL ASSETS</span> ${data.data.totalAssets} (${data.data.deployed} deployed)</p>
        <p><span class="highlight">AT RISK</span> ${data.data.osRisk[0].count + data.data.osRisk[1].count} units outdated</p>
        <p><span class="highlight">EOL ASSETS</span> ${data.data.osRisk[0].count} units need replacement</p>
      `;
    } else if (title.includes('CSAT')) {
      return `
        <p><span class="highlight">OVERALL CSAT</span> ${data.data.overall}</p>
        <p><span class="highlight">TOP PERFORMER</span> MOE: 4.8/5.0</p>
        <p><span class="highlight">NEEDS IMPROVEMENT</span> KKM: 4.0/5.0 (down trend)</p>
      `;
    }
    return '<p>No executive summary available</p>';
  }

  private generateMetrics(title: string, data: any): string {
    if (title.includes('SLA')) {
      return `
        <div class="metric-card">
          <div class="metric-label">Overall SLA</div>
          <div class="metric-value">${data.data.overall}</div>
          <div class="metric-trend"><span class="trend-up">↑ 2.1%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Critical Tickets</div>
          <div class="metric-value">${data.data.tickets.critical}</div>
          <div class="metric-trend"><span class="trend-down">↓ 5</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg Response</div>
          <div class="metric-value">${data.data.responseTime || '18m'}</div>
          <div class="metric-trend"><span class="trend-up">↑ 2m</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Tickets</div>
          <div class="metric-value">${Object.values(data.data.tickets).reduce((a: any, b: any) => a + b, 0)}</div>
          <div class="metric-trend">all priorities</div>
        </div>
      `;
    } else if (title.includes('Cost')) {
      return `
        <div class="metric-card">
          <div class="metric-label">Monthly Revenue</div>
          <div class="metric-value">${data.data.monthlyRevenue}</div>
          <div class="metric-trend"><span class="trend-up">↑ 12.5%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Cost</div>
          <div class="metric-value">${data.data.totalCost}</div>
          <div class="metric-trend">opex</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Net Profit</div>
          <div class="metric-value">${data.data.netProfit}</div>
          <div class="metric-trend"><span class="trend-up">↑ 8.3%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg Margin</div>
          <div class="metric-value">30%</div>
          <div class="metric-trend">per client</div>
        </div>
      `;
    } else if (title.includes('Asset')) {
      return `
        <div class="metric-card">
          <div class="metric-label">Total Assets</div>
          <div class="metric-value">${data.data.totalAssets}</div>
          <div class="metric-trend">all units</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Deployed</div>
          <div class="metric-value">${data.data.deployed}</div>
          <div class="metric-trend"><span class="trend-up">87.6%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">At Risk</div>
          <div class="metric-value">${data.data.osRisk[0].count + data.data.osRisk[1].count}</div>
          <div class="metric-trend"><span class="trend-down">outdated</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">EOL Assets</div>
          <div class="metric-value">${data.data.osRisk[0].count}</div>
          <div class="metric-trend"><span class="trend-down">critical</span></div>
        </div>
      `;
    } else if (title.includes('CSAT')) {
      return `
        <div class="metric-card">
          <div class="metric-label">Overall CSAT</div>
          <div class="metric-value">${data.data.overall}</div>
          <div class="metric-trend"><span class="trend-up">↑ 0.3</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Responses</div>
          <div class="metric-value">1,247</div>
          <div class="metric-trend">this quarter</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Top Score</div>
          <div class="metric-value">4.8</div>
          <div class="metric-trend">MOE</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Low Score</div>
          <div class="metric-value">4.0</div>
          <div class="metric-trend">KKM</div>
        </div>
      `;
    }
    return '';
  }

  private generateAIContent(title: string, data: any): string {
    if (title.includes('SLA')) {
      return `
        <p>KKM shows critical SLA performance at 72% with 84 open tickets, primarily linked to legacy hardware (5.2 years average age). Correlation analysis indicates that 60% of SLA lapses are attributed to devices with >4 years BIOS age. Immediate remediation on KKM's EOL assets could improve SLA by up to 15% within 60 days.</p>
        <p><strong>CapEx Recommendation:</strong> Allocate RM 2.8M for KKM fleet refresh in Q3 2026 to mitigate revenue risk of RM 720k/month.</p>
      `;
    } else if (title.includes('Cost')) {
      return `
        <p>KKM contributes 40% of total revenue (RM 1.2M) with 30% margin. PETRONAS shows stable growth at 15% YoY. Cost optimization opportunity identified in hardware maintenance (RM 150k potential savings).</p>
        <p><strong>Recommendation:</strong> Renegotiate maintenance contracts for legacy hardware to improve margin by 5%.</p>
      `;
    } else if (title.includes('Asset')) {
      return `
        <p>650 units on Windows 7/XP (EOL) pose critical security risk. 500 units on outdated Windows 10 versions need upgrade by October 2025. KKM has highest concentration of at-risk assets (365 units).</p>
        <p><strong>Recommendation:</strong> Prioritize KKM's Windows 7/XP devices for immediate replacement to mitigate security vulnerabilities.</p>
      `;
    } else if (title.includes('CSAT')) {
      return `
        <p>Overall CSAT improved to 4.2/5.0 (+0.3). MOE leads with 4.8/5.0 citing "fast response time". KKM feedback highlights "old hardware" as main concern, correlating with 72% SLA performance.</p>
        <p><strong>Recommendation:</strong> Address KKM hardware issues to improve CSAT and SLA simultaneously.</p>
      `;
    }
    return '<p>AI analysis unavailable for this report type.</p>';
  }

  private generateTableRows(title: string, data: any): string {
    let rows = '';
    
    if (title.includes('SLA')) {
      data.data.byClient.forEach((c: any) => {
        rows += `<tr>
          <td><strong>${c.client}</strong></td>
          <td>${c.sla}</td>
          <td><span class="badge badge-${c.status.toLowerCase()}">${c.status}</span></td>
          <td>${data.data.tickets.critical || 0}</td>
          <td style="color:${c.status === 'Critical' ? '#ef4444' : '#10b981'}">${c.status === 'Critical' ? '↑ +12' : '↓ -3'}</td>
        </tr>`;
      });
    } else if (title.includes('Cost')) {
      data.data.byClient.forEach((c: any) => {
        rows += `<tr>
          <td><strong>${c.client}</strong></td>
          <td>${c.revenue}</td>
          <td>${c.cost}</td>
          <td>${c.margin}</td>
          <td>30%</td>
        </tr>`;
      });
    } else if (title.includes('Asset')) {
      data.data.osRisk.forEach((o: any) => {
        rows += `<tr>
          <td><strong>${o.type}</strong></td>
          <td>${o.count}</td>
          <td><span class="badge ${o.status.includes('EOL') ? 'badge-critical' : 'badge-good'}">${o.status}</span></td>
          <td>${Math.round(o.count / data.data.totalAssets * 100)}%</td>
          <td>${o.status.includes('EOL') ? 'Immediate' : '2026'}</td>
        </tr>`;
      });
    } else if (title.includes('CSAT')) {
      data.data.byClient.forEach((c: any) => {
        rows += `<tr>
          <td><strong>${c.client}</strong></td>
          <td>${c.score}</td>
          <td><span class="badge ${c.trend === 'up' ? 'badge-good' : 'badge-critical'}">${c.trend}</span></td>
          <td>${c.score === 4.0 ? '84' : '15'}</td>
          <td>Q1 2026</td>
        </tr>`;
      });
    }
    
    return rows;
  }

  private getTableHeaders(title: string): string {
    if (title.includes('SLA')) return '<th>Client</th><th>SLA</th><th>Status</th><th>Tickets</th><th>Trend</th>';
    if (title.includes('Cost')) return '<th>Client</th><th>Revenue</th><th>Cost</th><th>Margin</th><th>Trend</th>';
    if (title.includes('Asset')) return '<th>OS Type</th><th>Count</th><th>Status</th><th>%</th><th>Timeline</th>';
    if (title.includes('CSAT')) return '<th>Client</th><th>Score</th><th>Trend</th><th>Tickets</th><th>Period</th>';
    return '<th>Item</th><th>Value</th><th>Status</th><th>%</th><th>Action</th>';
  }

  // ==================== EXCEL EXPORT ====================

  exportToExcel(reportName: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      const reportData = this.getReportData(reportName);
      const csv = this.convertToCSV(reportData);
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.loadingService.hide();
    }, 500);
  }

  private convertToCSV(data: any): string {
    let csv = `Report,${data.title}\n`;
    csv += `Date,${data.date}\n\n`;
    
    if (data.title.includes('SLA')) {
      csv += 'Client,SLA,Status\n';
      data.data.byClient.forEach((c: any) => {
        csv += `${c.client},${c.sla},${c.status}\n`;
      });
    } else if (data.title.includes('Cost')) {
      csv += 'Client,Revenue,Cost,Margin\n';
      data.data.byClient.forEach((c: any) => {
        csv += `${c.client},${c.revenue},${c.cost},${c.margin}\n`;
      });
    } else if (data.title.includes('Asset')) {
      csv += 'OS Type,Count,Status\n';
      data.data.osRisk.forEach((o: any) => {
        csv += `${o.type},${o.count},${o.status}\n`;
      });
    } else if (data.title.includes('CSAT')) {
      csv += 'Client,Score,Trend\n';
      data.data.byClient.forEach((c: any) => {
        csv += `${c.client},${c.score},${c.trend}\n`;
      });
    }
    
    return csv;
  }

  // ==================== CUSTOM REPORT ====================

  onGenerateCustomReport(brand: string, period: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      const reportName = `Custom Report - ${brand} (${period})`;
      const reportData = {
        title: reportName,
        date: new Date().toLocaleDateString(),
        data: {
          brand: brand,
          period: period,
          metrics: {
            totalAssets: Math.floor(Math.random() * 5000) + 1000,
            avgHealth: Math.floor(Math.random() * 20) + 75,
            tickets: Math.floor(Math.random() * 50) + 10,
            onlineRate: Math.floor(Math.random() * 15) + 80,
            topIssues: [
              'Outdated OS',
              'Legacy BIOS',
              'Network connectivity'
            ]
          }
        }
      };
      
      if (this.selectedFormat === 'PDF') {
        this.generatePDF(reportName, reportData);
      } else {
        this.exportToExcel(reportName);
      }
      
      this.loadingService.hide();
    }, 500);
  }
}
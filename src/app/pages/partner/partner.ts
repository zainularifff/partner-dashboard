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
import { IncidentApi } from '../../services/dashboard.api';

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

  constructor() {}

  ngOnInit(): void {
    console.log('Partner Operational Dashboard Initialized');
    if (this.geminiService) {
      this.model = this.geminiService.getModel();
    }
  }

  // ==================== GEMINI AI ANALYSIS ====================

  async generateAIAnalysis() {
    if (this.isAnalyzing || !this.model) return;
    this.isAnalyzing = true;
    this.aiResult = ''; 

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
    const reportData = this.getReportData(reportName);
    this.generatePDF(reportName, reportData);
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
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        h1 { color: #1e293b; font-size: 24px; margin-bottom: 5px; }
        .date { color: #64748b; font-size: 12px; margin-bottom: 30px; }
        h2 { color: #2563eb; font-size: 18px; margin: 20px 0 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        .critical { background: #fee2e2; color: #b91c1c; }
        .warning { background: #fff3cd; color: #b45309; }
        .good { background: #dcfce7; color: #15803d; }
        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
      </style>
    `;
    
    let tableRows = '';
    let summaryHtml = '';
    
    if (title.includes('SLA')) {
      summaryHtml = `<p><strong>Overall SLA:</strong> ${data.data.overall}</p>`;
      data.data.byClient.forEach((c: any) => {
        tableRows += `<tr>
          <td>${c.client}</td>
          <td>${c.sla}</td>
          <td><span class="badge ${c.status.toLowerCase()}">${c.status}</span></td>
        </tr>`;
      });
    } else if (title.includes('Cost')) {
      summaryHtml = `<p><strong>Monthly Revenue:</strong> ${data.data.monthlyRevenue}</p>`;
      data.data.byClient.forEach((c: any) => {
        tableRows += `<tr>
          <td>${c.client}</td>
          <td>${c.revenue}</td>
          <td>${c.cost}</td>
          <td>${c.margin}</td>
        </tr>`;
      });
    } else if (title.includes('Asset')) {
      summaryHtml = `<p><strong>Total Assets:</strong> ${data.data.totalAssets} (Deployed: ${data.data.deployed})</p>`;
      data.data.osRisk.forEach((o: any) => {
        tableRows += `<tr>
          <td>${o.type}</td>
          <td>${o.count}</td>
          <td><span class="badge ${o.status.includes('EOL') ? 'critical' : 'good'}">${o.status}</span></td>
        </tr>`;
      });
    } else if (title.includes('CSAT')) {
      summaryHtml = `<p><strong>Overall CSAT:</strong> ${data.data.overall}</p>`;
      data.data.byClient.forEach((c: any) => {
        tableRows += `<tr>
          <td>${c.client}</td>
          <td>${c.score}</td>
          <td><span class="badge ${c.trend === 'up' ? 'good' : 'critical'}">${c.trend}</span></td>
        </tr>`;
      });
    }
    
    return `
      <html>
        <head><title>${title}</title>${styles}</head>
        <body>
          <h1>${title}</h1>
          <div class="date">Generated: ${data.date}</div>
          
          ${summaryHtml}
          
          <h2>Details</h2>
          <table>
            <thead>
              <tr>${this.getTableHeaders(title)}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer">
            nPoints™ AISM Platform - Confidential<br>
            Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;
  }

  private getTableHeaders(title: string): string {
    if (title.includes('SLA')) return '<th>Client</th><th>SLA</th><th>Status</th>';
    if (title.includes('Cost')) return '<th>Client</th><th>Revenue</th><th>Cost</th><th>Margin</th>';
    if (title.includes('Asset')) return '<th>OS Type</th><th>Count</th><th>Status</th>';
    if (title.includes('CSAT')) return '<th>Client</th><th>Score</th><th>Trend</th>';
    return '<th>Item</th><th>Value</th>';
  }

  // ==================== EXCEL EXPORT ====================

  exportToExcel(reportName: string) {
    const reportData = this.getReportData(reportName);
    const csv = this.convertToCSV(reportData);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
  }
}
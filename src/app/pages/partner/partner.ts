import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
// KEMASKINI: Path diubah ke dua tingkat sahaja
import { GeminiService } from '../../services/gemini-services'; 

@Component({
  selector: 'app-partner',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  templateUrl: './partner.html',
  styleUrls: ['./partner.scss']
})
export class PartnerComponent implements OnInit {
  // Gunakan 'any' untuk mengelakkan ralat TS2571 jika path tidak stabil
  private geminiService = inject(GeminiService) as any;
  private model: any; 

  isAnalyzing = false;

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
    // Pastikan model diinisialisasi dengan selamat
    if (this.geminiService) {
      this.model = this.geminiService.getModel();
    }
  }

  async generateReport() {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    const context = `System: nPoints™ AISM. Data: ${this.vendorHealth.map(v => v.label + ' ' + v.percent + '%')}. Provide English summary.`;

    try {
      // Semakan keselamatan tambahan
      if (!this.model && this.geminiService) {
        this.model = this.geminiService.getModel();
      }

      const result = await this.model.generateContent(context);
      const response = await result.response;
      alert(`--- AI ANALYSIS ---\n\n${response.text()}`);
    } catch (error) {
      console.error(error);
      alert('AI Analysis failed. Please check your API key.');
    } finally {
      this.isAnalyzing = false;
    }
  }

  downloadReport(reportName: string) { alert(`Downloading ${reportName}...`); }
  onGenerateCustomReport(brand: string, period: string) { alert(`Generating ${brand} report...`); }
}
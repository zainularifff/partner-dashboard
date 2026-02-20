import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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

  // 1. DATA FOR: Multi-Client Operation Overview
  vendorHealth = [
    { label: 'FGV OPS', percent: 92, color: 'green', matColor: 'primary' },
    { label: 'EDARAN OPS', percent: 78, color: 'orange', matColor: 'accent' },
    { label: 'VENTRADE', percent: 65, color: 'red', matColor: 'warn' }
  ];

  // 2. DATA FOR: Inventory & Logistic Overview
  stockData = {
    total: 4821,
    logisticCompliance: 92,
    fulfillmentRate: 78
  };

  // 3. DATA FOR: Summary Reports (As per Slide)
  reports = [
    { name: 'SLA Performance Report', status: 'Updated Today', icon: 'speed' },
    { name: 'Cost & Resource Analysis', status: 'Monthly Cycle', icon: 'payments' },
    { name: 'Asset Lifecycle Report', status: 'Ready for Review', icon: 'history' },
    { name: 'Customer Satisfaction (CSAT) Trends', status: 'Q1 Feedback', icon: 'thumb_up' }
  ];

  constructor() {}

  ngOnInit(): void {
    console.log('Partner Operational Dashboard Initialized');
    // You can call your API here later to fill these variables
  }

  // Action for the 'Generate Partner Report' button
  generateReport() {
    alert('Generating Full Partner Analysis Report...');
  }

  // Action for individual download buttons
  downloadReport(reportName: string) {
    console.log(`Downloading: ${reportName}`);
    // Logic for PDF download goes here
  }
}

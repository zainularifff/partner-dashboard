import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-capex',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, NgApexchartsModule, FormsModule],
  templateUrl: './capex.html',
  styleUrls: ['./capex.scss']
})
export class CapexComponent implements OnInit {
  
  // Search
  searchQuery: string = '';
  filteredData: any[] = [];
  Math = Math;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  // KPI Data
  totalExposure: number = 5400000; // RM 5.4M
  assetsAtRisk: number = 3200;
  eolValue: number = 3200000; // RM 3.2M
  budget2025: number = 2800000; // RM 2.8M

  get eolPercentage(): number {
    return Math.round((this.eolValue / this.totalExposure) * 100);
  }

  // Breakdown by Entity
  entityBreakdown = [
    { name: 'KKM', value: 2800000, percentage: 52, color: '#ef4444' },
    { name: 'PETRONAS', value: 1500000, percentage: 28, color: '#f59e0b' },
    { name: 'MOE', value: 1100000, percentage: 20, color: '#10b981' }
  ];

  // Breakdown by Risk
  riskBreakdown = [
    { name: 'Critical (EOL)', value: 3200000, percentage: 59, color: '#ef4444' },
    { name: 'High Risk', value: 1400000, percentage: 26, color: '#f59e0b' },
    { name: 'Medium Risk', value: 800000, percentage: 15, color: '#3b82f6' }
  ];

  // Breakdown by Asset Type
  assetTypeBreakdown = [
    { name: 'Desktops', value: 2400000, percentage: 44, count: 1850 },
    { name: 'Laptops', value: 1800000, percentage: 33, count: 950 },
    { name: 'Servers', value: 800000, percentage: 15, count: 120 },
    { name: 'Network', value: 400000, percentage: 8, count: 280 }
  ];

  // Breakdown by Age Group
  ageBreakdown = [
    { name: '>5 years (EOL)', value: 3200000, percentage: 59, color: '#ef4444' },
    { name: '3-5 years', value: 1500000, percentage: 28, color: '#f59e0b' },
    { name: '<3 years', value: 700000, percentage: 13, color: '#10b981' }
  ];

  // Timeline Projection
  timelineData = [
    { year: 2025, value: 2800000, percentage: 52 },
    { year: 2026, value: 1600000, percentage: 30 },
    { year: 2027, value: 1000000, percentage: 18 }
  ];

  // Chart: Donut by Entity
  public entityDonut: any = {
    series: [52, 28, 20],
    chart: { type: "donut", height: 250 },
    labels: ["KKM", "PETRONAS", "MOE"],
    colors: ["#ef4444", "#f59e0b", "#10b981"],
    plotOptions: { pie: { donut: { size: '65%' } } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: (val: number) => val + '%' } }
  };

  // Chart: Bar by Asset Type
  public assetChart: any = {
    series: [{ name: "CAPEX (RM)", data: [2400000, 1800000, 800000, 400000] }],
    chart: { type: "bar", height: 250, toolbar: { show: false } },
    xaxis: { categories: ["Desktops", "Laptops", "Servers", "Network"] },
    colors: ["#3b82f6"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    tooltip: { 
      y: { 
        formatter: (val: number) => 'RM ' + (val / 1000000).toFixed(1) + 'M' 
      } 
    }
  };

  // Chart: Timeline projection
  public timelineChart: any = {
    series: [{ name: "CAPEX Projection", data: [2800000, 1600000, 1000000] }],
    chart: { type: "line", height: 200, toolbar: { show: false } },
    xaxis: { categories: ["2025", "2026", "2027"] },
    colors: ["#fbbf24"],
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 6 },
    tooltip: { 
      y: { 
        formatter: (val: number) => 'RM ' + (val / 1000000).toFixed(1) + 'M' 
      } 
    }
  };

  // Detailed table data
  tableData = [
    { 
      entity: 'KKM', 
      assetType: 'Desktops', 
      age: '5.2 years', 
      value: 1200000, 
      risk: 'Critical',
      riskColor: '#ef4444',
      eol: '2025 Q2'
    },
    { 
      entity: 'KKM', 
      assetType: 'Laptops', 
      age: '4.8 years', 
      value: 980000, 
      risk: 'Critical',
      riskColor: '#ef4444',
      eol: '2025 Q3'
    },
    { 
      entity: 'KKM', 
      assetType: 'Servers', 
      age: '6.1 years', 
      value: 620000, 
      risk: 'Critical',
      riskColor: '#ef4444',
      eol: '2025 Q1'
    },
    { 
      entity: 'PETRONAS', 
      assetType: 'Desktops', 
      age: '4.2 years', 
      value: 750000, 
      risk: 'High',
      riskColor: '#f59e0b',
      eol: '2026 Q1'
    },
    { 
      entity: 'PETRONAS', 
      assetType: 'Laptops', 
      age: '3.9 years', 
      value: 550000, 
      risk: 'High',
      riskColor: '#f59e0b',
      eol: '2026 Q2'
    },
    { 
      entity: 'PETRONAS', 
      assetType: 'Network', 
      age: '4.5 years', 
      value: 200000, 
      risk: 'High',
      riskColor: '#f59e0b',
      eol: '2025 Q4'
    },
    { 
      entity: 'MOE', 
      assetType: 'Desktops', 
      age: '2.8 years', 
      value: 450000, 
      risk: 'Medium',
      riskColor: '#3b82f6',
      eol: '2027 Q1'
    },
    { 
      entity: 'MOE', 
      assetType: 'Laptops', 
      age: '2.5 years', 
      value: 350000, 
      risk: 'Medium',
      riskColor: '#3b82f6',
      eol: '2027 Q2'
    },
    { 
      entity: 'MOE', 
      assetType: 'Network', 
      age: '3.2 years', 
      value: 300000, 
      risk: 'Medium',
      riskColor: '#3b82f6',
      eol: '2026 Q3'
    }
  ];

  // Paginated data
  paginatedData: any[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.show();
    
    setTimeout(() => {
      this.filteredData = [...this.tableData];
      this.updatePagination();
      this.loadingService.hide();
      console.log('CAPEX data loaded');
    }, 1000);
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
    this.goToPage(1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    this.paginatedData = this.filteredData.slice(start, start + this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  filterTable() {
    this.loadingService.show();
    
    setTimeout(() => {
      if (!this.searchQuery) {
        this.filteredData = [...this.tableData];
      } else {
        const q = this.searchQuery.toLowerCase();
        this.filteredData = this.tableData.filter(item => 
          item.entity.toLowerCase().includes(q) ||
          item.assetType.toLowerCase().includes(q) ||
          item.risk.toLowerCase().includes(q)
        );
      }
      
      this.updatePagination();
      this.loadingService.hide();
    }, 300);
  }

  getRiskColor(risk: string): string {
    switch(risk) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f59e0b';
      default: return '#3b82f6';
    }
  }

  formatMoney(value: number): string {
    if (value >= 1000000) {
      return 'RM ' + (value / 1000000).toFixed(1) + 'M';
    }
    return 'RM ' + (value / 1000).toFixed(0) + 'k';
  }

  goBack() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      
      if (document.referrer.includes('login')) {
        this.router.navigate(['/management']);
      } else {
        this.location.back();
      }
    }, 300);
  }

  onEntityClick(entity: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      this.router.navigate(['/client', entity.toLowerCase()]);
    }, 300);
  }

  generatePlan() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('CAPEX replacement plan generated!');
    }, 800);
  }

  exportData() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Exporting CAPEX data...');
    }, 500);
  }
}
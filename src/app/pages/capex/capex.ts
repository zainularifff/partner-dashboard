import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-capex',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, NgApexchartsModule, FormsModule],
  templateUrl: './capex.html',
  styleUrls: ['./capex.scss']
})
export class CapexComponent implements OnInit {
  
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';
  
  // Search
  searchQuery: string = '';
  filteredData: any[] = [];
  Math = Math;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  // KPI Data
  totalExposure: number = 0;
  assetsAtRisk: number = 0;
  eolValue: number = 0;
  budget2025: number = 0;

  // Years
  currentYear: number = new Date().getFullYear();
  nextYear: number = new Date().getFullYear() + 1;

  get eolPercentage(): number {
    return this.totalExposure > 0 ? Math.round((this.eolValue / this.totalExposure) * 100) : 0;
  }

  // Breakdown by Entity
  entityBreakdown: any[] = [];
  
  // Breakdown by Risk
  riskBreakdown: any[] = [];
  
  // Breakdown by Asset Type
  assetTypeBreakdown: any[] = [];
  
  // Breakdown by Age Group
  ageBreakdown: any[] = [];
  
  // Timeline Projection
  timelineData: any[] = [];

  // Chart: Donut by Entity
  public entityDonut: any = {
    series: [],
    chart: { type: "donut", height: 250 },
    labels: [],
    colors: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"],
    plotOptions: { pie: { donut: { size: '65%' } } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: (val: number) => val + '%' } }
  };

  // Chart: Bar by Asset Type
  public assetChart: any = {
    series: [{ name: "CAPEX (RM)", data: [] }],
    chart: { type: "bar", height: 250, toolbar: { show: false } },
    xaxis: { categories: [] },
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
    series: [{ name: "CAPEX Projection", data: [] }],
    chart: { type: "line", height: 200, toolbar: { show: false } },
    xaxis: { categories: [] },
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
  tableData: any[] = [];

  // Paginated data
  paginatedData: any[] = [];

  // All assets for processing
  allAssets: any[] = [];
  allClients: any[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadCapexData();
  }

  async loadCapexData() {
    try {
      // Load all data in parallel
      const [assets, clients, capex, criticalAsset, replacementCost] = await Promise.all([
        this.fetchData('/assets'),
        this.fetchData('/clients'),
        this.fetchData('/capex'),
        this.fetchData('/critical-asset-value'),
        this.fetchData('/replacement-cost')
      ]);

      console.log('Assets:', assets);
      console.log('Clients:', clients);
      console.log('CAPEX:', capex);
      console.log('Critical Asset:', criticalAsset);
      console.log('Replacement Cost:', replacementCost);

      // Store data
      if (assets && Array.isArray(assets)) {
        this.allAssets = assets;
      }

      if (clients && Array.isArray(clients)) {
        this.allClients = clients;
      }

      // Set KPI data
      if (capex?.summary) {
        this.totalExposure = capex.summary.rawValue || 0;
      }

      // Assets at risk from critical-asset-value
      if (criticalAsset?.success && criticalAsset.data) {
        this.assetsAtRisk = criticalAsset.data.total_units || 0;
        
        // Parse details to get entities
        const details = criticalAsset.data.details || '0 entities • 0 units';
        const matches = details.match(/(\d+).*?(\d+)/);
        if (matches) {
          const entities = parseInt(matches[1]) || 0;
        }
      }

      // EOL Value from replacement-cost
      if (replacementCost?.success && replacementCost.data) {
        const desktopValue = replacementCost.data.desktop_value || 0;
        const laptopValue = replacementCost.data.laptop_value || 0;
        const serverValue = replacementCost.data.server_value || 0;
        const othersValue = replacementCost.data.others_value || 0;
        
        this.eolValue = desktopValue + laptopValue + serverValue + othersValue;
      }

      // Budget 2025 - estimate 52% of total exposure
      this.budget2025 = Math.round(this.totalExposure * 0.52);

      // Process breakdowns
      this.processEntityBreakdown();
      this.processAssetTypeBreakdown(capex);
      this.processRiskBreakdown();
      this.processTimelineData();
      this.processTableData();

      // Update charts
      this.updateCharts();

      this.filteredData = [...this.tableData];
      this.updatePagination();
      
      this.loadingService.hide();
      console.log('✅ CAPEX data loaded from API');

    } catch (error) {
      console.error('Error loading CAPEX data:', error);
      this.loadingService.hide();
    }
  }

  private async fetchData(endpoint: string): Promise<any> {
    try {
      return await lastValueFrom(this.http.get(`${this.apiUrl}${endpoint}`));
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  private processEntityBreakdown() {
    // Group assets by client
    const clientMap = new Map();
    
    this.allAssets.forEach((asset: any) => {
      const clientName = asset.CustomerName || 'Unknown';
      const value = this.getAssetValue(asset);
      
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, { value: 0, assets: [] });
      }
      
      const clientData = clientMap.get(clientName);
      clientData.value += value;
      clientData.assets.push(asset);
    });

    // Convert to array and sort by value
    const clientArray = Array.from(clientMap.entries())
      .map(([name, data]: [string, any]) => ({
        name,
        value: data.value,
        assets: data.assets
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3); // Top 3 clients

    const total = clientArray.reduce((sum, item) => sum + item.value, 0);

    this.entityBreakdown = clientArray.map((item, index) => ({
      name: item.name,
      value: item.value,
      percentage: Math.round((item.value / total) * 100),
      color: this.entityDonut.colors[index % this.entityDonut.colors.length]
    }));

    // Update donut chart
    this.entityDonut.series = this.entityBreakdown.map(item => item.percentage);
    this.entityDonut.labels = this.entityBreakdown.map(item => item.name);
  }

  private processAssetTypeBreakdown(capexData: any) {
    if (capexData?.breakdown) {
      const total = capexData.breakdown.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0);
      
      this.assetTypeBreakdown = capexData.breakdown.map((item: any) => ({
        name: item.DeviceCategory || 'Other',
        value: item.total_value || 0,
        percentage: Math.round(((item.total_value || 0) / total) * 100),
        count: item.units || 0
      }));

      // Update bar chart
      this.assetChart.series = [{ 
        name: "CAPEX (RM)", 
        data: this.assetTypeBreakdown.map(item => item.value) 
      }];
      this.assetChart.xaxis.categories = this.assetTypeBreakdown.map(item => item.name);
    }
  }

  private processRiskBreakdown() {
    const critical = this.allAssets.filter((a: any) => a.PCAge > 5).reduce((sum, a) => sum + this.getAssetValue(a), 0);
    const high = this.allAssets.filter((a: any) => a.PCAge > 3 && a.PCAge <= 5).reduce((sum, a) => sum + this.getAssetValue(a), 0);
    const medium = this.allAssets.filter((a: any) => a.PCAge <= 3).reduce((sum, a) => sum + this.getAssetValue(a), 0);
    
    const total = critical + high + medium;

    this.riskBreakdown = [
      { name: 'Critical (EOL)', value: critical, percentage: Math.round((critical / total) * 100), color: '#ef4444' },
      { name: 'High Risk', value: high, percentage: Math.round((high / total) * 100), color: '#f59e0b' },
      { name: 'Medium Risk', value: medium, percentage: Math.round((medium / total) * 100), color: '#3b82f6' }
    ].filter(item => item.value > 0);
  }

  private processTimelineData() {
    // Simple projection: 50% in 2025, 30% in 2026, 20% in 2027
    this.timelineData = [
      { year: 2025, value: Math.round(this.eolValue * 0.52), percentage: 52 },
      { year: 2026, value: Math.round(this.eolValue * 0.30), percentage: 30 },
      { year: 2027, value: Math.round(this.eolValue * 0.18), percentage: 18 }
    ];

    // Update timeline chart
    this.timelineChart.series = [{ 
      name: "CAPEX Projection", 
      data: this.timelineData.map(item => item.value) 
    }];
    this.timelineChart.xaxis.categories = this.timelineData.map(item => item.year.toString());
  }

  private processTableData() {
    this.tableData = this.allAssets
      .filter((asset: any) => asset.PCAge > 3) // Only show assets at risk
      .map((asset: any) => ({
        entity: asset.CustomerName || 'Unknown',
        assetType: asset.DeviceCategory || 'Other',
        age: (asset.PCAge || 0).toFixed(1) + ' years',
        value: this.getAssetValue(asset),
        risk: this.getRiskLevel(asset.PCAge),
        riskColor: this.getRiskColor(asset.PCAge),
        eol: this.getEOLDate(asset.PCAge)
      }))
      .sort((a, b) => b.value - a.value);
  }

  private getAssetValue(asset: any): number {
    const values: any = {
      'Desktop': 3500,
      'Laptop': 4500,
      'Server': 15000
    };
    return (values[asset.DeviceCategory] || 2000);
  }

  private getRiskLevel(age: number): string {
    if (age > 5) return 'Critical';
    if (age > 3) return 'High';
    return 'Medium';
  }

  private getRiskColor(age: number): string {
    if (age > 5) return '#ef4444';
    if (age > 3) return '#f59e0b';
    return '#3b82f6';
  }

  private getEOLDate(age: number): string {
    const currentYear = new Date().getFullYear();
    if (age > 5) return `${currentYear} Q${Math.ceil(age % 4)}`;
    if (age > 3) return `${currentYear + 1} Q${Math.ceil(age % 4)}`;
    return `${currentYear + 2} Q${Math.ceil(age % 4)}`;
  }

  private updateCharts() {
    // Force chart update
    this.entityDonut = { ...this.entityDonut };
    this.assetChart = { ...this.assetChart };
    this.timelineChart = { ...this.timelineChart };
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

  getRiskColorFromRisk(risk: string): string {
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
      
      const criticalCount = this.allAssets.filter((a: any) => a.PCAge > 5).length;
      const highCount = this.allAssets.filter((a: any) => a.PCAge > 3 && a.PCAge <= 5).length;
      
      alert(`✅ CAPEX Replacement Plan Generated!\n\n` +
            `Critical assets (EOL): ${criticalCount} units\n` +
            `High risk assets: ${highCount} units\n` +
            `Total budget required: ${this.formatMoney(this.eolValue)}\n\n` +
            `Recommended:\n` +
            `1. Replace critical assets in 2025 (RM ${this.formatMoney(this.timelineData[0]?.value || 0)})\n` +
            `2. Schedule high risk assets for 2026\n` +
            `3. Monitor medium risk assets`);
    }, 800);
  }

  exportData() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      
      const headers = ['Entity', 'Asset Type', 'Age', 'Value', 'Risk', 'EOL Date'];
      const rows = this.tableData.map(item => [
        item.entity,
        item.assetType,
        item.age,
        item.value,
        item.risk,
        item.eol
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `capex-exposure-${new Date().getTime()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }, 500);
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service'; // <-- IMPORT LOADING SERVICE

@Component({
  selector: 'app-risk-escalation',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, NgApexchartsModule, FormsModule],
  templateUrl: './risk.html',
  styleUrls: ['./risk.scss']
})
export class RiskComponent implements OnInit {
  
  // Search
  searchQuery: string = '';
  filteredRiskData: any[] = [];

  // Data Risk per Client
  riskData = [
    { 
      client: 'KKM', 
      osRisk: 'High', osVersion: 'Win 10 (Build 19041)', 
      biosRisk: 'Critical', biosAge: '5.2 Years',
      openTickets: 84, slaStatus: '72%',
      trend: 'up'
    },
    { 
      client: 'MOE', 
      osRisk: 'Low', osVersion: 'Win 11 (23H2)', 
      biosRisk: 'Low', biosAge: '1.5 Years',
      openTickets: 15, slaStatus: '98%',
      trend: 'down'
    },
    { 
      client: 'PETRONAS', 
      osRisk: 'Medium', osVersion: 'Win 10 (Latest)', 
      biosRisk: 'Medium', biosAge: '3.8 Years',
      openTickets: 42, slaStatus: '85%',
      trend: 'stable'
    }
  ];

  // Entity Breakdown for Progress Bars
  entityBreakdown = [
    { name: 'KKM', value: 84, percentage: 59, color: '#ef4444' },
    { name: 'PETRONAS', value: 42, percentage: 30, color: '#f59e0b' },
    { name: 'MOE', value: 15, percentage: 11, color: '#10b981' }
  ];

  // Chart: OS Compliance vs BIOS Aging
  public riskChart: any = {
    series: [
      { name: "Outdated OS %", data: [45, 5, 20] },
      { name: "Legacy BIOS %", data: [60, 10, 35] }
    ],
    chart: { 
      type: "bar", 
      height: 250, 
      stacked: true,
      toolbar: { show: false },
      events: {
        click: (event: any, chartContext: any, config: any) => {
          this.onChartClick(config);
        }
      }
    },
    xaxis: { categories: ["KKM", "MOE", "PETRONAS"] },
    colors: ["#f43f5e", "#fbbf24"],
    plotOptions: { 
      bar: { 
        horizontal: true,
        borderRadius: 4
      } 
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val: number) => val + '%' } }
  };

  // Trend Chart
  public trendChart: any = {
    series: [
      { name: "KKM", data: [65, 72, 78, 84, 82, 79] },
      { name: "PETRONAS", data: [30, 35, 38, 42, 41, 40] },
      { name: "MOE", data: [18, 16, 15, 15, 14, 12] }
    ],
    chart: { 
      type: "line", 
      height: 200,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    xaxis: { 
      categories: ["W18", "W19", "W20", "W21", "W22", "W23"],
      labels: { show: true, style: { fontSize: '10px' } }
    },
    colors: ["#f43f5e", "#f59e0b", "#10b981"],
    stroke: { curve: "smooth", width: 2 },
    markers: { size: 4 },
    grid: { show: false },
    annotations: {
      points: [{
        x: "W22",
        y: 84,
        marker: { size: 5, fillColor: "#ef4444" },
        label: { text: "84", style: { color: "#fff", background: "#ef4444" } }
      }]
    }
  };

  // Donut Chart
  public donutChart: any = {
    series: [70, 45, 26],
    chart: { type: "donut", height: 150 },
    labels: ["OS Issues", "BIOS Issues", "Network Issues"],
    colors: ["#f43f5e", "#f59e0b", "#3b82f6"],
    plotOptions: { pie: { donut: { size: '60%' } } },
    dataLabels: { enabled: false },
    legend: { show: false }
  };

  // Donut Legend
  donutLegend = [
    { label: 'OS Issues', value: 70 },
    { label: 'BIOS Issues', value: 45 },
    { label: 'Network Issues', value: 26 }
  ];

  osBreakdown = [
    { name: 'Win 10 (19041)', count: 84, risk: 'Critical', color: '#ef4444' },
    { name: 'Legacy BIOS', count: 60, risk: 'High', color: '#f97316' },
    { name: 'Win 10 Latest', count: 42, risk: 'Medium', color: '#eab308' },
    { name: 'Win 11', count: 5, risk: 'Low', color: '#10b981' }
  ];

  // Financial Data
  revenueBreakdown = [
    { entity: 'KKM', amount: 720, percentage: 60 },
    { entity: 'PETRONAS', amount: 400, percentage: 33 },
    { entity: 'MOE', amount: 80, percentage: 7 }
  ];

  costBreakdown = [
    { entity: 'KKM', amount: 270, percentage: 60 },
    { entity: 'PETRONAS', amount: 150, percentage: 33 },
    { entity: 'MOE', amount: 30, percentage: 7 }
  ];

  trendDirection = 'up';
  trendPercentage = 12;

  constructor(
    private router: Router,
    private location: Location,
    private loadingService: LoadingService  // <-- INJECT LOADING SERVICE
  ) {}

  ngOnInit(): void {
    // Show loading
    this.loadingService.show();
    
    // Simulate data loading
    setTimeout(() => {
      this.filteredRiskData = [...this.riskData];
      this.loadingService.hide();
      console.log('Risk data loaded');
    }, 1000);
  }

  filterTable() {
    if (!this.searchQuery) {
      this.filteredRiskData = [...this.riskData];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredRiskData = this.riskData.filter(item => 
        item.client.toLowerCase().includes(q) ||
        item.osVersion.toLowerCase().includes(q) ||
        item.biosAge.toLowerCase().includes(q)
      );
    }
  }

  getRiskColor(level: string) {
    switch(level) {
      case 'Critical': return '#be123c';
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      default: return '#10b981';
    }
  }

  getSlaColor(sla: string) {
    const value = parseInt(sla);
    if (value < 80) return '#ef4444';
    if (value < 95) return '#f59e0b';
    return '#10b981';
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

  onChartClick(event: any) {
    const entity = event.config?.xaxis?.categories[event.dataPointIndex];
    if (entity) {
      this.drillDown(entity);
    }
  }

  drillDown(entity: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      this.router.navigate(['/client', entity.toLowerCase()]);
    }, 300);
  }

  navigateToEntity(entity: string) {
    this.drillDown(entity);
  }

  mitigateAll() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Mitigating all risks...');
      alert('Risk mitigation initiated!');
    }, 800);
  }

  exportChart() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Exporting chart...');
    }, 500);
  }

  expandChart() {
    console.log('Expanding chart...');
    // No loading for expand, just UI action
  }
}
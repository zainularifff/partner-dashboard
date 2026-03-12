import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-service-performance',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule, FormsModule],
  templateUrl: './service.html',
  styleUrls: ['./service.scss']
})
export class ServicePerformanceComponent implements OnInit {
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';

  // KPI Data
  slaCompliance: string = '0%';
  avgResponseTime: string = '0m';
  resolvedCount: number = 0;
  breachCount: number = 0;
  
  // Trends
  slaTrend: string = '0% vs last month';
  responseTrend: string = '0m vs last month';
  resolvedTrend: string = '0 vs last month';

  // Charts Data
  slaTrendChart: any = {
    series: [{ name: 'SLA Compliance %', data: [] }],
    chart: { type: 'line', height: 250, toolbar: { show: false } },
    xaxis: { categories: [] },
    colors: ['#3b82f6'],
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 5 },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val: number) => val + '%' } }
  };

  responseTimeChart: any = {
    series: [{ name: 'Minutes', data: [] }],
    chart: { type: 'bar', height: 250, toolbar: { show: false } },
    xaxis: { categories: [] },
    colors: ['#f59e0b'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val: number) => val + ' mins' } }
  };

  supportLevelChart: any = {
    series: [],
    chart: { type: 'donut', height: 200 },
    labels: [],
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
    plotOptions: { pie: { donut: { size: '70%' } } },
    legend: { show: false },
    dataLabels: { enabled: false }
  };

  // Support Level Data for legend
  supportLevelData: any[] = [];

  // Resolution Stats
  resolutionStats: any[] = [];

  // Resolved Incidents Table
  resolvedIncidents: any[] = [];
  filteredIncidents: any[] = [];
  paginatedIncidents: any[] = [];

  // Search & Filters
  searchQuery: string = '';

  // Sorting
  sortKey: string = 'ResolvedAt';
  sortDir: string = 'desc';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  // Last Updated
  lastUpdated: Date = new Date();

  // Percentage breach
  get breachPercentage(): number {
    if (this.resolvedCount === 0) return 0;
    return Math.round((this.breachCount / this.resolvedCount) * 100);
  }

  constructor(
    private location: Location,
    private router: Router,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadServiceData();
  }

  async loadServiceData() {
    try {
      // Load all data in parallel
      const [slaTrend, responseTime, byLevel, resolved, servicePerf] = await Promise.all([
        this.fetchData('/service/sla-trend'),
        this.fetchData('/service/response-time-by-priority'),
        this.fetchData('/service/incidents-by-level'),
        this.fetchData('/service/resolved-incidents'),
        this.fetchData('/service-performance')
      ]);

      console.log('SLA Trend:', slaTrend);
      console.log('Response Time:', responseTime);
      console.log('By Level:', byLevel);
      console.log('Resolved:', resolved);
      console.log('Service Perf:', servicePerf);

      // Process KPI from service-performance
      if (servicePerf?.success && servicePerf.data) {
        this.slaCompliance = servicePerf.data.slaCompliance;
        this.avgResponseTime = servicePerf.data.avgResponse;
        this.slaTrend = servicePerf.data.trend;
      }

      // Process SLA Trend Chart
      if (slaTrend && Array.isArray(slaTrend)) {
        this.slaTrendChart.series = [{
          name: 'SLA Compliance %',
          data: slaTrend.map(item => item.sla_percentage || 0)
        }];
        this.slaTrendChart.xaxis.categories = slaTrend.map(item => item.month);
      }

      // Process Response Time Chart
      if (responseTime && Array.isArray(responseTime)) {
        this.responseTimeChart.series = [{
          name: 'Minutes',
          data: responseTime.map(item => Math.round(item.avg_response_minutes || 0))
        }];
        this.responseTimeChart.xaxis.categories = responseTime.map(item => item.Priority || 'Unknown');
      }

      // Process Support Level Chart
      if (byLevel && Array.isArray(byLevel)) {
        this.supportLevelChart.series = byLevel.map(item => item.incident_count);
        this.supportLevelChart.labels = byLevel.map(item => item.support_level);
        
        this.supportLevelData = byLevel.map((item, index) => ({
          level: item.support_level,
          count: item.incident_count,
          percentage: item.percentage,
          color: this.supportLevelChart.colors[index % this.supportLevelChart.colors.length]
        }));
      }

      // Process Resolution Stats
      if (resolved && Array.isArray(resolved)) {
        this.resolvedCount = resolved.length;
        
        // Calculate resolution distribution
        const lessThan1 = resolved.filter(i => i.resolution_hours < 1).length;
        const oneTo4 = resolved.filter(i => i.resolution_hours >= 1 && i.resolution_hours < 4).length;
        const fourTo24 = resolved.filter(i => i.resolution_hours >= 4 && i.resolution_hours < 24).length;
        const moreThan24 = resolved.filter(i => i.resolution_hours >= 24).length;
        
        this.resolutionStats = [
          { range: '< 1 hour', count: lessThan1, percentage: Math.round((lessThan1 / this.resolvedCount) * 100), color: '#10b981' },
          { range: '1-4 hours', count: oneTo4, percentage: Math.round((oneTo4 / this.resolvedCount) * 100), color: '#3b82f6' },
          { range: '4-24 hours', count: fourTo24, percentage: Math.round((fourTo24 / this.resolvedCount) * 100), color: '#f59e0b' },
          { range: '> 24 hours', count: moreThan24, percentage: Math.round((moreThan24 / this.resolvedCount) * 100), color: '#ef4444' }
        ];

        // Count breaches
        this.breachCount = resolved.filter(i => i.sla_status === 'Breached').length;

        // Set resolved incidents table
        this.resolvedIncidents = resolved;
        this.filteredIncidents = [...resolved];
        this.updatePagination();
      }

      this.lastUpdated = new Date();
      this.loadingService.hide();

    } catch (error) {
      console.error('Error loading service data:', error);
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

  // Navigation
  goBack() {
    this.loadingService.show();
    setTimeout(() => {
      this.loadingService.hide();
      this.location.back();
    }, 300);
  }

  // Filter Table
  filterTable() {
    if (!this.searchQuery) {
      this.filteredIncidents = [...this.resolvedIncidents];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredIncidents = this.resolvedIncidents.filter(item => 
        item.IncidentID?.toLowerCase().includes(q) ||
        item.CustomerName?.toLowerCase().includes(q) ||
        item.Title?.toLowerCase().includes(q) ||
        item.AssignedTo?.toLowerCase().includes(q)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // Toggle Sort
  toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    
    this.filteredIncidents.sort((a, b) => {
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    this.updatePagination();
  }

  // Pagination
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredIncidents.length / this.pageSize) || 1;
    this.currentPage = 1;
    const start = 0;
    this.paginatedIncidents = this.filteredIncidents.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    this.paginatedIncidents = this.filteredIncidents.slice(start, start + this.pageSize);
  }

  // Export Table
  exportTable() {
    this.loadingService.show();
    
    setTimeout(() => {
      const headers = ['Incident ID', 'Client', 'Title', 'Priority', 'Resolution Time', 'SLA Status', 'Assigned To'];
      const rows = this.filteredIncidents.map(item => [
        item.IncidentID,
        item.CustomerName,
        item.Title,
        item.Priority,
        item.resolution_hours + ' hours',
        item.sla_status,
        item.AssignedTo || 'Unassigned'
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `service-performance-${new Date().getTime()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.loadingService.hide();
    }, 500);
  }
}
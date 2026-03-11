import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select'; // <-- ADD THIS
import { MatFormFieldModule } from '@angular/material/form-field'; // <-- ADD THIS
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-risk-escalation',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatSelectModule,           // <-- ADD
    MatFormFieldModule,        // <-- ADD
    NgApexchartsModule, 
    FormsModule
  ],
  templateUrl: './risk.html',
  styleUrls: ['./risk.scss']
})
export class RiskComponent implements OnInit {
  
  searchQuery: string = '';
  filteredIncidents: any[] = [];
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  // ==================== CLIENT SELECTOR ====================
  selectedClient: string = 'all';
  clientList: any[] = [];

  // ==================== REAL DATA FROM INCIDENTS.JSON ====================
  incidents = [
    { id: 'INC-1771921221797', client: 'WSSB Internal', title: 'yuuu', status: 'Resolved', created: '2026-02-24T08:20:21.797Z', daysOpen: 0, assignedTo: 'eric' },
    { id: 'INC-1771921238131', client: 'Internal', title: 'kjkjkljk', status: 'Awaiting', created: '2026-02-24T08:20:38.132Z', daysOpen: 14, assignedTo: 'eric' },
    { id: 'INC-1771921260649', client: 'Natalie', title: 'yiuiuyiu', status: 'Awaiting', created: '2026-02-24T08:21:00.650Z', daysOpen: 14, assignedTo: 'eric' },
    { id: 'INC-1771921276001', client: 'Natalie', title: 'tyyutyuty', status: 'Awaiting', created: '2026-02-24T08:21:16.001Z', daysOpen: 14, assignedTo: 'eric' },
    { id: 'INC-1771921299295', client: 'Alfred', title: 'yuiuyuiyu', status: 'Awaiting', created: '2026-02-24T08:21:39.295Z', daysOpen: 14, assignedTo: 'eric' },
    { id: 'INC-1771921312933', client: 'Alfred', title: 'hjkjhjk', status: 'Awaiting', created: '2026-02-24T08:21:52.933Z', daysOpen: 14, assignedTo: 'eric' },
    { id: 'INC-1771921327443', client: 'Alfred', title: 'yuy', status: 'Awaiting', created: '2026-02-24T08:22:07.443Z', daysOpen: 14, assignedTo: 'eric' },
    { id: 'INC-1771921546837', client: 'Sri KDU', title: 'asdsd', status: 'Awaiting', created: '2026-02-24T08:25:46.837Z', daysOpen: 14, assignedTo: 'eric' }
  ];

  // Incident by Client data
  clientIncidentData = [
    { name: 'Alfred', count: 3, percentage: 37.5, color: '#ef4444' },
    { name: 'Natalie', count: 2, percentage: 25, color: '#f59e0b' },
    { name: 'WSSB Internal', count: 1, percentage: 12.5, color: '#3b82f6' },
    { name: 'Internal', count: 1, percentage: 12.5, color: '#8b5cf6' },
    { name: 'Sri KDU', count: 1, percentage: 12.5, color: '#10b981' }
  ];

  // ==================== ASSET RISK DATA ====================
  // For different clients
  assetRiskDataAll = {
    totalAssets: 816,  // 801 + 15
    osRiskUnits: 125,  // 120 + 5
    osRiskPercentage: 15.3,
    osBreakdown: [
      { name: 'Windows 7/8/XP', count: 125 },
      { name: 'Windows 10', count: 458 },
      { name: 'Windows 11', count: 233 }
    ],
    eolUnits: 92,  // 89 + 3
    eolPercentage: 11.3,
    onlineUnits: 6,  // 4 + 2
    offlineUnits: 810,  // 797 + 13
    offlinePercentage: 99.3
  };

  assetRiskDataWSSB = {
    totalAssets: 801,
    osRiskUnits: 120,
    osRiskPercentage: 15,
    osBreakdown: [
      { name: 'Windows 7/8/XP', count: 120 },
      { name: 'Windows 10', count: 450 },
      { name: 'Windows 11', count: 231 }
    ],
    eolUnits: 89,
    eolPercentage: 11.1,
    onlineUnits: 4,
    offlineUnits: 797,
    offlinePercentage: 99.5
  };

  assetRiskDataNatalie = {
    totalAssets: 15,
    osRiskUnits: 5,
    osRiskPercentage: 33.3,
    osBreakdown: [
      { name: 'Windows 7/8/XP', count: 5 },
      { name: 'Windows 10', count: 8 },
      { name: 'Windows 11', count: 2 }
    ],
    eolUnits: 3,
    eolPercentage: 20,
    onlineUnits: 2,
    offlineUnits: 13,
    offlinePercentage: 86.7
  };

  assetRiskDataSUKS = {
    totalAssets: 0,
    osRiskUnits: 0,
    osRiskPercentage: 0,
    osBreakdown: [
      { name: 'Windows 7/8/XP', count: 0 },
      { name: 'Windows 10', count: 0 },
      { name: 'Windows 11', count: 0 }
    ],
    eolUnits: 0,
    eolPercentage: 0,
    onlineUnits: 0,
    offlineUnits: 0,
    offlinePercentage: 0
  };

  // Current selected asset risk data
  assetRiskData: any = this.assetRiskDataAll;

  // ==================== CHARTS ====================
  
  // Incidents by Client - Donut Chart
  public incidentByClient: any = {
    series: [3, 2, 1, 1, 1],
    chart: { type: 'donut', height: 250 },
    labels: ['Alfred', 'Natalie', 'WSSB Internal', 'Internal', 'Sri KDU'],
    colors: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
    plotOptions: { pie: { donut: { size: '60%' } } },
    legend: { show: false },
    dataLabels: { enabled: false }
  };

  // Incidents by Status - Donut Chart
  public incidentByStatus: any = {
    series: [7, 1],
    chart: { type: 'donut', height: 200 },
    labels: ['Awaiting', 'Resolved'],
    colors: ['#ef4444', '#10b981'],
    plotOptions: { pie: { donut: { size: '70%' } } },
    legend: { show: false },
    dataLabels: { enabled: false }
  };

  constructor(
    private router: Router,
    private location: Location,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.show();
    
    setTimeout(() => {
      this.filteredIncidents = [...this.incidents];
      this.totalPages = Math.ceil(this.filteredIncidents.length / this.pageSize);
      this.updatePaginatedData();
      
      // Load client list for dropdown
      this.loadClientList();
      
      this.loadingService.hide();
    }, 1000);
  }

  // ==================== CLIENT SELECTOR METHODS ====================
  
  loadClientList() {
    // From Assets data
    this.clientList = [
      { CustomerName: 'WSSB Internal', total_assets: 801 },
      { CustomerName: 'Natalie Internal', total_assets: 15 },
      { CustomerName: 'SUKS', total_assets: 0 }
    ];
  }

  onClientChange() {
    this.loadingService.show();
    
    setTimeout(() => {
      // Load asset risk data based on selected client
      switch(this.selectedClient) {
        case 'all':
          this.assetRiskData = this.assetRiskDataAll;
          break;
        case 'WSSB Internal':
          this.assetRiskData = this.assetRiskDataWSSB;
          break;
        case 'Natalie Internal':
          this.assetRiskData = this.assetRiskDataNatalie;
          break;
        case 'SUKS':
          this.assetRiskData = this.assetRiskDataSUKS;
          break;
        default:
          this.assetRiskData = this.assetRiskDataAll;
      }
      
      this.loadingService.hide();
    }, 300);
  }

  // ==================== FILTER METHODS ====================
  
  filterTable() {
    if (!this.searchQuery) {
      this.filteredIncidents = [...this.incidents];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredIncidents = this.incidents.filter(item => 
        item.id.toLowerCase().includes(q) ||
        item.client.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
    }
    this.totalPages = Math.ceil(this.filteredIncidents.length / this.pageSize);
    this.currentPage = 1;
    this.updatePaginatedData();
  }

  // ==================== PAGINATION ====================
  
  updatePaginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredIncidents = this.filteredIncidents.slice(start, end);
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  // ==================== UTILITY METHODS ====================
  
  getRiskColor(percentage: number): string {
    if (percentage < 10) return '#10b981';
    if (percentage < 20) return '#f59e0b';
    if (percentage < 30) return '#f97316';
    return '#ef4444';
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
}
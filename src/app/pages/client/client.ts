import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service'; // <-- IMPORT LOADING SERVICE

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule, FormsModule],
  templateUrl: './client.html',
  styleUrls: ['./client.scss']
})
export class ClientComponent implements OnInit {
  // BUANG isLoading - tak perlu lagi

  // Search
  searchQuery: string = '';
  filteredClients: any[] = [];

  // Summary Stats
  clientStats = {
    total: 4,
    healthy: 2,
    warning: 1,
    critical: 1
  };

  // Client Data
  clients = [
    { 
      name: 'KKM', 
      sector: 'Healthcare',
      contractType: 'Leasing - Phase 4A',
      status: 'Critical', 
      totalAssets: 5200, 
      deployed: 4800,
      onlineAgents: 3800,
      offlineAgents: 1000,
      leaseEnd: '30 Aug 2026', 
      remainingMonths: 5, 
      utilization: '94%',
      engineer: 'Zul + 2',
      sla: '72%',
      osCompliance: '55%',
      biosAging: '5.2 Years',
      healthScore: 76
    },
    { 
      name: 'PETRONAS', 
      sector: 'Energy / O&G',
      contractType: 'Subscription Model',
      status: 'Warning', 
      totalAssets: 2800, 
      deployed: 2300,
      onlineAgents: 2100,
      offlineAgents: 200,
      leaseEnd: '15 Dec 2027', 
      remainingMonths: 21, 
      utilization: '82%',
      engineer: 'Ahmad',
      sla: '85%',
      osCompliance: '80%',
      biosAging: '3.8 Years',
      healthScore: 82
    },
    { 
      name: 'MOE (KPM)', 
      sector: 'Education',
      contractType: 'Leasing - Phase 5',
      status: 'Healthy', 
      totalAssets: 12500, 
      deployed: 12250,
      onlineAgents: 11800,
      offlineAgents: 450,
      leaseEnd: '01 Jan 2028', 
      remainingMonths: 22, 
      utilization: '98%',
      engineer: 'Sarah',
      sla: '98%',
      osCompliance: '98%',
      biosAging: '1.2 Years',
      healthScore: 95
    },
    { 
      name: 'MINDEF', 
      sector: 'Defense',
      contractType: 'Outright Purchase',
      status: 'Healthy', 
      totalAssets: 4100, 
      deployed: 3900,
      onlineAgents: 3700,
      offlineAgents: 200,
      leaseEnd: 'N/A (Owned)', 
      remainingMonths: 36, 
      utilization: '90%',
      engineer: 'Farid',
      sla: '90%',
      osCompliance: '88%',
      biosAging: '2.5 Years',
      healthScore: 88
    }
  ];

  // Charts
  public performanceChart: any = {
    series: [
      { name: 'Utilization (%)', type: 'column', data: [] },
      { name: 'Remaining Tenure (Months)', type: 'line', data: [] }
    ],
    chart: { height: 280, type: 'line', stacked: false, toolbar: { show: false } },
    stroke: { width: [0, 4], curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
    colors: ['#3b82f6', '#f59e0b'], 
    labels: [],
    yaxis: [
      { title: { text: 'Utilization %' }, max: 100 },
      { opposite: true, title: { text: 'Months Remaining' }, max: 48 }
    ],
    legend: { position: 'top' },
    dataLabels: { enabled: false }
  };

  public agingDonut: any = {
    series: [45, 35, 20],
    chart: { type: 'donut', height: 280 },
    labels: ['New', 'Mid-Life', 'Aging','End-of-Life'],
    colors: ['#10b981', '#f9fd04', '#f7b100', , '#ef4444'],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '70%' } } }
  };

  // Modal State
  isModalOpen: boolean = false;
  selectedClient: any = null;

  // Agent List in Modal
  clientAgents: any[] = [];
  filteredAgents: any[] = [];
  agentSearchQuery: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  
  // Sorting
  sortConfig = { key: 'AssetTag', direction: 'asc' };

  constructor(
    private location: Location, 
    private router: Router,
    private loadingService: LoadingService  // <-- TAMBAH LOADING SERVICE
  ) {}

  ngOnInit(): void {
    // Show global loading
    this.loadingService.show();
    console.log('🔄 Loading started');
    
    // Simulate data fetching
    setTimeout(() => {
      // Load data
      this.filteredClients = [...this.clients];
      this.updateChartsFromData();
      
      // Hide loading
      this.loadingService.hide();
      console.log('✅ Loading finished - data loaded');
    }, 1000);
  }

  // Navigation
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

  // Filter Clients
  filterClients() {
    if (!this.searchQuery) {
      this.filteredClients = [...this.clients];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredClients = this.clients.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.sector.toLowerCase().includes(q)
      );
    }
  }

  // Update Charts from Data
  updateChartsFromData() {
    console.log('📊 Updating charts with data');
    
    // Safely update performance chart
    if (this.performanceChart && this.clients) {
      this.performanceChart.series = [
        { name: 'Utilization (%)', type: 'column', data: this.clients.map(c => parseInt(c.utilization) || 0) },
        { name: 'Remaining Tenure (Months)', type: 'line', data: this.clients.map(c => c.remainingMonths || 0) }
      ];
      this.performanceChart.labels = this.clients.map(c => c.name || '');
    }
    
    // Safely update donut chart
    if (this.agingDonut && this.clients) {
      const eol = this.clients.filter(c => parseFloat(c.biosAging) > 4).length;
      const mid = this.clients.filter(c => parseFloat(c.biosAging) > 2 && parseFloat(c.biosAging) <= 4).length;
      const new_ = this.clients.filter(c => parseFloat(c.biosAging) <= 2).length;
      
      this.agingDonut.series = [new_ * 10, mid * 10, eol * 10]; // Scale for demo
    }
    
    console.log('✅ Charts updated');
  }

  // Status Color
  getStatusColor(status: string) {
    switch(status) {
      case 'Critical': return '#ef4444';
      case 'Warning': return '#f59e0b';
      default: return '#10b981';
    }
  }

  // Modal Functions
  openClientModal(client: any) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.selectedClient = client;
      this.isModalOpen = true;
      this.currentPage = 1;
      this.agentSearchQuery = '';
      document.body.style.overflow = 'hidden';
      
      // Generate mock agents
      const brands = ['Dell Inc.', 'HP', 'Lenovo', 'Apple'];
      const models = ['Latitude 3420', 'EliteBook 840', 'ThinkPad X1', 'MacBook Pro'];
      
      this.clientAgents = Array.from({ length: client.deployed || 100 }).map((_, i) => ({
        AssetTag: `AST-${client.name}-${(i + 1).toString().padStart(4, '0')}`,
        IP: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        Brand: brands[Math.floor(Math.random() * brands.length)],
        Model: models[Math.floor(Math.random() * models.length)],
        AgentStatus: Math.random() > 0.15 ? 'On' : 'Off',
        LastSeen: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
      }));
      
      this.filteredAgents = [...this.clientAgents];
      this.loadingService.hide();
    }, 300);
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedClient = null;
    document.body.style.overflow = 'auto';
  }

  // Agent Stats
  getOnlineCount(): number {
    return this.clientAgents?.filter(a => a?.AgentStatus === 'On').length || 0;
  }

  getOfflineCount(): number {
    return this.clientAgents?.filter(a => a?.AgentStatus === 'Off').length || 0;
  }

  // Filter Agents
  filterAgents() {
    let filtered = [...(this.clientAgents || [])];
    if (this.agentSearchQuery) {
      const q = this.agentSearchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a?.AssetTag?.toLowerCase().includes(q) || 
        a?.IP?.includes(q)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valA = a?.[this.sortConfig.key];
      let valB = b?.[this.sortConfig.key];
      
      if (this.sortConfig.key === 'LastSeen') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      }
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return this.sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    this.filteredAgents = filtered;
    this.currentPage = 1;
  }

  // Sorting
  toggleSort(key: string) {
    if (this.sortConfig.key === key) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.key = key;
      this.sortConfig.direction = 'asc';
    }
    this.filterAgents();
  }

  // Pagination
  getPaginatedAgents() {
    if (!this.filteredAgents || this.filteredAgents.length === 0) return [];
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAgents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil((this.filteredAgents?.length || 0) / this.pageSize) || 1;
  }

  goToPage(page: number) {
    this.loadingService.show();
    
    setTimeout(() => {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
      this.loadingService.hide();
    }, 200);
  }

  // Export to CSV
  exportToCSV() {
    if (!this.filteredAgents || this.filteredAgents.length === 0) return;
    
    this.loadingService.show();
    
    setTimeout(() => {
      const headers = ['Asset Tag', 'IP Address', 'Brand', 'Model', 'Last Seen', 'Status'];
      const rows = this.filteredAgents.map(agent => [
        agent?.AssetTag || '',
        agent?.IP || '',
        agent?.Brand || '',
        agent?.Model || '',
        agent?.LastSeen ? new Date(agent.LastSeen).toLocaleString() : '',
        agent?.AgentStatus === 'On' ? 'Online' : 'Offline'
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Export_${this.selectedClient?.name || 'Client'}_${new Date().getTime()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.loadingService.hide();
      console.log('CSV exported');
    }, 300);
  }
}
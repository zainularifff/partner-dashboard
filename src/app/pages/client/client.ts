import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule, FormsModule],
  templateUrl: './client.html',
  styleUrls: ['./client.scss']
})
export class ClientComponent implements OnInit {
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';

  // Search
  searchQuery: string = '';
  filteredClients: any[] = [];

  // Summary Stats
  clientStats = {
    total: 0,
    healthy: 0,
    warning: 0,
    critical: 0
  };

  // Client Data
  clients: any[] = [];

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
    series: [0, 0, 0],
    chart: { type: 'donut', height: 280 },
    labels: ['New (≤2 yrs)', 'Mid-Life (2-4 yrs)', 'Aging (>4 yrs)'],
    colors: ['#10b981', '#f59e0b', '#ef4444'],
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
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadClientData();
  }

  async loadClientData() {
    try {
      // Load all data in parallel
      const [portfolio, stats, maturity, performance] = await Promise.all([
        this.fetchData('/clients/portfolio'),
        this.fetchData('/clients/stats'),
        this.fetchData('/clients/hardware-maturity'),
        this.fetchData('/clients/performance')
      ]);

      console.log('Client Portfolio:', portfolio);
      console.log('Client Stats:', stats);
      console.log('Hardware Maturity:', maturity);
      console.log('Performance:', performance);

      // Set clients data
      if (portfolio && Array.isArray(portfolio)) {
        this.clients = portfolio.map(c => ({
          name: c.name || 'Unknown',
          sector: c.sector || 'Other',
          contractType: c.contractType || 'Standard',
          status: c.status || 'Healthy',
          totalAssets: c.totalAssets || 0,
          deployed: c.deployed || 0,
          onlineAgents: c.onlineAgents || 0,
          offlineAgents: c.offlineAgents || 0,
          leaseEnd: c.leaseEnd ? new Date(c.leaseEnd).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }) : 'N/A',
          remainingMonths: c.remainingMonths || this.calculateRemainingMonths(c.leaseEnd),
          utilization: c.utilization ? c.utilization + '%' : '0%',
          engineer: 'Assigned',
          sla: '98%',
          osCompliance: c.avgPcAge ? (100 - Math.min(c.avgPcAge * 10, 100)).toFixed(0) + '%' : '85%',
          biosAging: c.avgPcAge ? c.avgPcAge.toFixed(1) + ' Years' : '2.5 Years',
          healthScore: c.healthScore || 85
        }));
        
        this.filteredClients = [...this.clients];
      }

      // Set client stats
      if (stats) {
        this.clientStats = {
          total: stats.total || 0,
          healthy: stats.healthy || 0,
          warning: stats.warning || 0,
          critical: stats.critical || 0
        };
      }

      // Set hardware maturity
      if (maturity) {
        this.agingDonut.series = [
          maturity.new || 0,
          maturity.mid || 0,
          maturity.aging || 0
        ];
      }

      // Update performance chart
      if (performance && Array.isArray(performance)) {
        this.performanceChart.series = [
          { 
            name: 'Utilization (%)', 
            type: 'column', 
            data: performance.map(p => p.utilization || 0) 
          },
          { 
            name: 'Remaining Tenure (Months)', 
            type: 'line', 
            data: performance.map(p => p.remainingMonths || 0) 
          }
        ];
        this.performanceChart.labels = performance.map(p => p.name || '');
      }

      this.loadingService.hide();
      console.log('✅ Client data loaded from API');

    } catch (error) {
      console.error('Error loading client data:', error);
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

  private calculateRemainingMonths(leaseEnd: string): number {
    if (!leaseEnd || leaseEnd === 'N/A') return 36;
    const end = new Date(leaseEnd);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths > 0 ? diffMonths : 0;
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

  // Status Color
  getStatusColor(status: string) {
    switch(status?.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#10b981';
    }
  }

  // Modal Functions
  async openClientModal(client: any) {
    this.loadingService.show();
    
    this.selectedClient = client;
    this.isModalOpen = true;
    this.currentPage = 1;
    this.agentSearchQuery = '';
    document.body.style.overflow = 'hidden';
    
    try {
      // Load real agents for this client
      const agents = await this.fetchData(`/projects/${encodeURIComponent(client.name)}/agents`);
      
      if (agents && Array.isArray(agents)) {
        this.clientAgents = agents.map(a => ({
          ...a,
          LastSeen: a.ConnectionTime || a.LastSeen || new Date().toISOString()
        }));
      } else {
        this.clientAgents = [];
      }
      
      this.filteredAgents = [...this.clientAgents];
      
    } catch (error) {
      console.error('Error loading agents:', error);
      this.clientAgents = [];
      this.filteredAgents = [];
    }
    
    this.loadingService.hide();
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
      
      if (this.sortConfig.key === 'LastSeen' || this.sortConfig.key === 'ConnectionTime') {
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
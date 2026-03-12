import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-risk-escalation',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatSelectModule,
    MatFormFieldModule,
    NgApexchartsModule, 
    FormsModule
  ],
  templateUrl: './risk.html',
  styleUrls: ['./risk.scss']
})
export class RiskComponent implements OnInit {
  
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';

  searchQuery: string = '';
  filteredIncidents: any[] = [];
  allIncidents: any[] = [];
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  // ==================== CLIENT SELECTOR ====================
  selectedClient: string = 'all';
  clientList: any[] = [];

  // ==================== KPI DATA ====================
  totalIncidents: number = 0;
  awaitingCount: number = 0;
  resolvedCount: number = 0;
  affectedClientsCount: number = 0;
  affectedClientsList: string = '';
  avgResolutionTime: string = '0 days';

  // ==================== RiskComponent class ====================

  get openTicketsPercentage(): number {
    if (this.totalIncidents === 0) return 0;
    return Math.round((this.awaitingCount / this.totalIncidents) * 100);
  }

  get awaitingPercentage(): number {
    if (this.totalIncidents === 0) return 0;
    return Math.round((this.awaitingCount / this.totalIncidents) * 100);
  }

  get resolvedPercentage(): number {
    if (this.totalIncidents === 0) return 0;
    return Math.round((this.resolvedCount / this.totalIncidents) * 100);
  }

  // ==================== CHART DATA ====================
  clientIncidentData: any[] = [];
  
  public incidentByClient: any = {
    series: [],
    chart: { type: 'donut', height: 250 },
    labels: [],
    colors: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#6366f1', '#ec4899'],
    plotOptions: { pie: { donut: { size: '60%' } } },
    legend: { show: false },
    dataLabels: { enabled: false }
  };

  public incidentByStatus: any = {
    series: [0, 0],
    chart: { type: 'donut', height: 200 },
    labels: ['Awaiting', 'Resolved'],
    colors: ['#ef4444', '#10b981'],
    plotOptions: { pie: { donut: { size: '70%' } } },
    legend: { show: false },
    dataLabels: { enabled: false }
  };

  // ==================== ASSET RISK DATA ====================
  // For different clients
  assetRiskDataAll: any = {
    totalAssets: 0,
    osRiskUnits: 0,
    osRiskPercentage: 0,
    osBreakdown: [],
    eolUnits: 0,
    eolPercentage: 0,
    onlineUnits: 0,
    offlineUnits: 0,
    offlinePercentage: 0
  };

  assetRiskDataPerClient: any = {};

  // Current selected asset risk data
  assetRiskData: any = this.assetRiskDataAll;

  constructor(
    private router: Router,
    private location: Location,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadRiskData();
  }

  async loadRiskData() {
    try {
      // Load all data in parallel
      const [incidents, incidentsStats, osRisk, clients, assets] = await Promise.all([
        this.fetchData('/incidents'),
        this.fetchData('/incidents/stats'),
        this.fetchData('/os-risk'),
        this.fetchData('/clients'),
        this.fetchData('/assets')
      ]);

      console.log('Incidents:', incidents);
      console.log('Incidents Stats:', incidentsStats);
      console.log('OS Risk:', osRisk);
      console.log('Clients:', clients);
      console.log('Assets:', assets);

      // ========== PROCESS INCIDENTS DATA ==========
      if (incidents && Array.isArray(incidents)) {
        this.allIncidents = incidents.map((inc: any) => ({
          id: inc.IncidentID || inc.incident_id,
          client: inc.CustomerName || inc.customer_name,
          title: inc.Title || inc.title,
          status: inc.Status || inc.status,
          created: inc.CreatedAt || inc.created_at,
          daysOpen: this.calculateDaysOpen(inc.CreatedAt || inc.created_at, inc.ResolvedAt),
          assignedTo: inc.AssignedTo || inc.assigned_to || 'Unassigned'
        }));
        
        this.filteredIncidents = [...this.allIncidents];
        this.totalPages = Math.ceil(this.filteredIncidents.length / this.pageSize);
        this.updatePaginatedData();
      }

      // ========== PROCESS STATS DATA ==========
      if (incidentsStats) {
        this.totalIncidents = incidentsStats.totalIncidents || 0;
        
        // By status
        const byStatus = incidentsStats.byStatus || [];
        this.awaitingCount = byStatus.find((s: any) => s.status === 'Awaiting')?.total || 0;
        this.resolvedCount = byStatus.find((s: any) => s.status === 'Resolved')?.total || 0;
        
        // Update status chart
        this.incidentByStatus.series = [this.awaitingCount, this.resolvedCount];
      }

      // ========== PROCESS CLIENT DATA ==========
      if (clients && Array.isArray(clients)) {
        // Count affected clients (clients with incidents)
        const uniqueClients = [...new Set(this.allIncidents.map(i => i.client))];
        this.affectedClientsCount = uniqueClients.length;
        this.affectedClientsList = uniqueClients.slice(0, 5).join(' · ');
        
        // Build client list for dropdown
        this.clientList = clients.map((c: any) => ({
          CustomerName: c.CompanyName || c.name,
          total_assets: this.countAssetsForClient(c.CompanyName || c.name, assets)
        }));
      }

      // ========== PROCESS INCIDENT BY CLIENT ==========
      const clientMap = new Map();
      this.allIncidents.forEach(inc => {
        const client = inc.client;
        clientMap.set(client, (clientMap.get(client) || 0) + 1);
      });
      
      const total = this.allIncidents.length;
      this.clientIncidentData = Array.from(clientMap.entries()).map(([name, count], index) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        color: this.incidentByClient.colors[index % this.incidentByClient.colors.length]
      }));
      
      this.incidentByClient.series = this.clientIncidentData.map(d => d.count);
      this.incidentByClient.labels = this.clientIncidentData.map(d => d.name);

      // ========== PROCESS ASSET RISK DATA ==========
      await this.processAssetRiskData(assets, osRisk, clients);

      // ========== CALCULATE AVG RESOLUTION TIME ==========
      await this.calculateAvgResolutionTime();

      this.loadingService.hide();

    } catch (error) {
      console.error('Error loading risk data:', error);
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

  private calculateDaysOpen(createdAt: string, resolvedAt?: string): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    const diffTime = Math.abs(end.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  private countAssetsForClient(clientName: string, assets: any[]): number {
    if (!assets || !Array.isArray(assets)) return 0;
    return assets.filter((a: any) => a.CustomerName === clientName).length;
  }

  private async processAssetRiskData(assets: any[], osRisk: any, clients: any[]) {
    if (!assets || !Array.isArray(assets)) return;

    // Overall data
    const totalAssets = assets.length;
    const onlineUnits = assets.filter(a => a.AgentStatus === 'On').length;
    const offlineUnits = assets.filter(a => a.AgentStatus === 'Off').length;
    
    // OS Risk from API
    let osRiskUnits = 0;
    let osBreakdown: any[] = [];
    
    if (osRisk?.breakdown) {
      osRiskUnits = osRisk.summary?.totalOutdated || 0;
      osBreakdown = osRisk.breakdown.map((item: any) => ({
        name: item.os_name,
        count: item.count
      }));
    } else if (osRisk?.data?.breakdown) {
      osRiskUnits = osRisk.data.summary?.totalOutdated || 0;
      osBreakdown = osRisk.data.breakdown.map((item: any) => ({
        name: item.os_category || item.os_name,
        count: item.count
      }));
    }

    // EOL units (PCAge > 5)
    const eolUnits = assets.filter(a => a.PCAge > 5).length;

    this.assetRiskDataAll = {
      totalAssets,
      osRiskUnits,
      osRiskPercentage: totalAssets > 0 ? Math.round((osRiskUnits / totalAssets) * 100) : 0,
      osBreakdown,
      eolUnits,
      eolPercentage: totalAssets > 0 ? Math.round((eolUnits / totalAssets) * 100) : 0,
      onlineUnits,
      offlineUnits,
      offlinePercentage: totalAssets > 0 ? Math.round((offlineUnits / totalAssets) * 100) : 0
    };

    // Per client data
    if (clients && Array.isArray(clients)) {
      for (const client of clients) {
        const clientName = client.CompanyName || client.name;
        const clientAssets = assets.filter((a: any) => a.CustomerName === clientName);
        const clientTotal = clientAssets.length;
        
        if (clientTotal > 0) {
          const clientOnline = clientAssets.filter(a => a.AgentStatus === 'On').length;
          const clientOffline = clientAssets.filter(a => a.AgentStatus === 'Off').length;
          const clientOsRisk = clientAssets.filter(a => 
            (a.OS?.includes('Windows 7') || a.OS?.includes('XP') || a.OS?.includes('Windows 8')) ||
            (a.OS?.includes('Windows 10') && a.PCAge > 5)
          ).length;
          const clientEol = clientAssets.filter(a => a.PCAge > 5).length;

          this.assetRiskDataPerClient[clientName] = {
            totalAssets: clientTotal,
            osRiskUnits: clientOsRisk,
            osRiskPercentage: clientTotal > 0 ? Math.round((clientOsRisk / clientTotal) * 100) : 0,
            osBreakdown: [
              { name: 'Windows 7/8/XP', count: clientAssets.filter(a => a.OS?.includes('Windows 7') || a.OS?.includes('XP') || a.OS?.includes('Windows 8')).length },
              { name: 'Windows 10 (Outdated)', count: clientAssets.filter(a => a.OS?.includes('Windows 10') && a.PCAge > 5).length }
            ],
            eolUnits: clientEol,
            eolPercentage: clientTotal > 0 ? Math.round((clientEol / clientTotal) * 100) : 0,
            onlineUnits: clientOnline,
            offlineUnits: clientOffline,
            offlinePercentage: clientTotal > 0 ? Math.round((clientOffline / clientTotal) * 100) : 0
          };
        }
      }
    }

    // Set initial data
    this.assetRiskData = this.assetRiskDataAll;
  }

  private async calculateAvgResolutionTime() {
    const resolvedIncidents = this.allIncidents.filter(i => i.status === 'Resolved');
    if (resolvedIncidents.length === 0) {
      this.avgResolutionTime = 'N/A';
      return;
    }

    const totalDays = resolvedIncidents.reduce((sum, inc) => sum + inc.daysOpen, 0);
    const avg = totalDays / resolvedIncidents.length;
    this.avgResolutionTime = avg.toFixed(1) + ' days';
  }

  // ==================== CLIENT SELECTOR METHODS ====================
  
  onClientChange() {
    this.loadingService.show();
    
    setTimeout(() => {
      if (this.selectedClient === 'all') {
        this.assetRiskData = this.assetRiskDataAll;
      } else if (this.assetRiskDataPerClient[this.selectedClient]) {
        this.assetRiskData = this.assetRiskDataPerClient[this.selectedClient];
      }
      
      this.loadingService.hide();
    }, 300);
  }

  // ==================== FILTER METHODS ====================
  
  filterTable() {
    if (!this.searchQuery) {
      this.filteredIncidents = [...this.allIncidents];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredIncidents = this.allIncidents.filter(item => 
        item.id?.toLowerCase().includes(q) ||
        item.client?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q)
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
    this.filteredIncidents = this.allIncidents.slice(start, end);
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
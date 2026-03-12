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
  selector: 'app-os-risk',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule, FormsModule],
  templateUrl: './os-risk.html',
  styleUrls: ['./os-risk.scss'] 
})
export class OsRiskComponent implements OnInit {
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';
  
  // Tab state
  activeTab: string = 'overview';
  
  // Summary KPI - akan diisi dari API
  totalAtRisk: number = 0;
  financialImpact: string = 'RM 0k';
  criticalUnits: number = 0;
  eolDeadline: string = '6 months'; // Default

  // OS Risk Data Table
  osRiskData: any[] = [];
  lastUpdated: Date = new Date();

  // Financial Impact Data
  financialImpactData: any[] = [];

  // EOL Timeline Data
  timelineData: any[] = [];

  // Entities for selector
  entities: any[] = [];

  // Selected entity for By Entity tab
  selectedEntity: string = '';
  selectedEntityData: any = null;

  // OS Distribution Chart
  osDistributionChart: any = {
    series: [
      { name: 'Win 7/XP/8', data: [] },
      { name: 'Win10 (Out)', data: [] },
      { name: 'Win10 (Ok)', data: [] },
      { name: 'Win11', data: [] }
    ],
    chart: { 
      type: 'bar', 
      height: 300, 
      stacked: true, 
      toolbar: { show: false },
      background: 'transparent'
    },
    xaxis: { 
      categories: [],
      labels: { style: { colors: '#94a3b8' } }
    },
    colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
    plotOptions: { bar: { borderRadius: 4, horizontal: false } },
    dataLabels: { enabled: false },
    legend: { 
      show: true,
      labels: { colors: '#cbd5e1' }
    }
  };

  // Asset List for Assets tab
  allAssets: any[] = [];
  filteredAssets: any[] = [];
  paginatedAssets: any[] = [];
  
  // Filters
  assetSearchQuery: string = '';
  osFilter: string = 'all';
  entityFilter: string = 'all';
  
  // Sorting
  sortKey: string = 'assetId';
  sortDir: string = 'asc';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 15;
  totalPages: number = 1;

  // All data from API
  private allAssetsFromAPI: any[] = [];
  private allClients: any[] = [];

  constructor(
    private location: Location, 
    private router: Router,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadOsRiskData();
  }

  async loadOsRiskData() {
    try {
      // Load all data in parallel
      const [assets, osRisk, clients] = await Promise.all([
        this.fetchData('/assets'),
        this.fetchData('/os-risk'),
        this.fetchData('/clients')
      ]);

      console.log('Assets:', assets);
      console.log('OS Risk:', osRisk);
      console.log('Clients:', clients);

      // Store data
      if (assets && Array.isArray(assets)) {
        this.allAssetsFromAPI = assets;
        this.processAssetsData(assets);
      }

      if (clients && Array.isArray(clients)) {
        this.allClients = clients;
        this.processClientsData(clients);
      }

      // Set KPI from OS Risk API
      if (osRisk?.summary) {
        this.totalAtRisk = osRisk.summary.totalOutdated || 0;
        this.financialImpact = osRisk.summary.riskExposure || 'RM 0k';
        
        // Critical units adalah yang >5 tahun (EOL)
        if (osRisk.breakdown) {
          const win7Data = osRisk.breakdown.find((item: any) => item.os_name === 'Windows 7' || item.os_name?.includes('7'));
          const win10OutData = osRisk.breakdown.find((item: any) => item.os_name === 'Windows 10' && item.end_of_life > 0);
          this.criticalUnits = (win7Data?.end_of_life || 0) + (win10OutData?.end_of_life || 0);
        }
      }

      // Process OS Risk Table data
      this.processOsRiskTable();

      // Process Financial Impact
      this.processFinancialImpact();

      // Process Timeline
      this.processTimelineData();

      // Update chart
      this.updateOsDistributionChart();

      // Generate mock assets for demonstration (akan diganti dengan data real)
      this.generateMockAssets();

      this.loadingService.hide();
      console.log('OS Risk data loaded from API');

    } catch (error) {
      console.error('Error loading OS Risk data:', error);
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

  private processAssetsData(assets: any[]) {
    // Group by customer
    const customerMap = new Map();
    
    assets.forEach((asset: any) => {
      const customer = asset.CustomerName || 'Unknown';
      if (!customerMap.has(customer)) {
        customerMap.set(customer, {
          win7: 0,
          win10out: 0,
          win10ok: 0,
          win11: 0,
          total: 0
        });
      }
      
      const data = customerMap.get(customer);
      data.total++;
      
      // Klasifikasi OS berdasarkan umur (>5 tahun = outdated)
      if (asset.OS?.includes('Windows 7') || asset.OS?.includes('XP') || asset.OS?.includes('Windows 8')) {
        data.win7++;
      } else if (asset.OS?.includes('Windows 10')) {
        if (asset.PCAge > 5) {
          data.win10out++;
        } else {
          data.win10ok++;
        }
      } else if (asset.OS?.includes('Windows 11')) {
        data.win11++;
      }
    });

    // Convert to array for table
    this.osRiskData = Array.from(customerMap.entries()).map(([name, data]: [string, any]) => {
      const totalAtRisk = data.win7 + data.win10out;
      const financialImpact = totalAtRisk * 500; // RM500 per unit
      
      let riskLevel = 'LOW';
      let riskColor = '#10b981';
      
      if (totalAtRisk > 100) {
        riskLevel = 'CRITICAL';
        riskColor = '#ef4444';
      } else if (totalAtRisk > 50) {
        riskLevel = 'HIGH';
        riskColor = '#f59e0b';
      } else if (totalAtRisk > 20) {
        riskLevel = 'MEDIUM';
        riskColor = '#fbbf24';
      }
      
      return {
        entity: name,
        win7: data.win7,
        win10out: data.win10out,
        win10ok: data.win10ok,
        win11: data.win11,
        total: data.total,
        riskLevel,
        riskColor,
        financialImpact: `RM ${(financialImpact / 1000).toFixed(0)}k`
      };
    }).sort((a, b) => (b.win7 + b.win10out) - (a.win7 + a.win10out));
  }

  private processClientsData(clients: any[]) {
    this.entities = clients.map((c: any) => ({
      code: c.CompanyName,
      name: c.CompanyName
    }));
    
    if (this.entities.length > 0) {
      this.selectedEntity = this.entities[0].code;
      this.updateSelectedEntityData();
    }
  }

  private processOsRiskTable() {
    // Already done in processAssetsData
  }

  private processFinancialImpact() {
    const total = this.osRiskData.reduce((sum, item) => {
      const value = parseInt(item.financialImpact.replace(/[^0-9]/g, '')) || 0;
      return sum + value;
    }, 0);
    
    this.financialImpactData = this.osRiskData.map(item => {
      const value = parseInt(item.financialImpact.replace(/[^0-9]/g, '')) || 0;
      const percent = total > 0 ? Math.round((value / total) * 100) : 0;
      
      let color = '#10b981';
      if (item.riskLevel === 'CRITICAL') color = '#ef4444';
      else if (item.riskLevel === 'HIGH') color = '#f59e0b';
      else if (item.riskLevel === 'MEDIUM') color = '#fbbf24';
      
      return {
        entity: item.entity,
        amount: item.financialImpact,
        percent,
        color
      };
    });
  }

  private processTimelineData() {
    this.timelineData = this.osRiskData.slice(0, 4).map(item => {
      const critical = item.win7 + item.win10out;
      const progress = Math.min(Math.round((critical / 100) * 100), 100);
      
      return {
        entity: item.entity,
        critical,
        progress
      };
    });
  }

  private updateOsDistributionChart() {
    const entities = this.osRiskData.map(item => item.entity).slice(0, 4);
    
    this.osDistributionChart.series = [
      { name: 'Win 7/XP/8', data: this.osRiskData.slice(0, 4).map(item => item.win7) },
      { name: 'Win10 (Out)', data: this.osRiskData.slice(0, 4).map(item => item.win10out) },
      { name: 'Win10 (Ok)', data: this.osRiskData.slice(0, 4).map(item => item.win10ok) },
      { name: 'Win11', data: this.osRiskData.slice(0, 4).map(item => item.win11) }
    ];
    
    this.osDistributionChart.xaxis.categories = entities;
  }

  // Navigation
  goBack() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      this.location.back();
    }, 300);
  }

  // Generate mock assets for demonstration
  generateMockAssets() {
    const entities = this.osRiskData.map(item => item.entity);
    const osVersions = [
      { name: 'Windows 7', category: 'win7', risk: 'Critical', eol: 'EOL' },
      { name: 'Windows XP', category: 'win7', risk: 'Critical', eol: 'EOL' },
      { name: 'Windows 8', category: 'win7', risk: 'Critical', eol: 'EOL' },
      { name: 'Windows 10 (Old)', category: 'win10out', risk: 'High', eol: '6 months' },
      { name: 'Windows 10', category: 'win10ok', risk: 'Low', eol: '24 months' },
      { name: 'Windows 11', category: 'win11', risk: 'Low', eol: '48 months' }
    ];

    for (let i = 1; i <= 200; i++) {
      const entity = entities[Math.floor(Math.random() * entities.length)] || 'Unknown';
      const os = osVersions[Math.floor(Math.random() * osVersions.length)];
      const installDate = new Date();
      installDate.setMonth(installDate.getMonth() - Math.floor(Math.random() * 60));
      
      this.allAssets.push({
        id: i,
        assetId: `AST-${entity}-${i.toString().padStart(4, '0')}`,
        entity: entity,
        osVersion: os.name,
        osCategory: os.category,
        installDate: installDate,
        eolStatus: os.eol,
        eolMonths: os.eol !== 'EOL' ? parseInt(os.eol) : 0,
        risk: os.risk,
        riskColor: os.risk === 'Critical' ? '#ef4444' : os.risk === 'High' ? '#f59e0b' : '#10b981'
      });
    }
    
    this.filterAssets();
  }

  // Filter assets based on search and filters
  filterAssets() {
    let filtered = [...this.allAssets];

    // Search query
    if (this.assetSearchQuery) {
      const q = this.assetSearchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.assetId.toLowerCase().includes(q) || 
        a.entity.toLowerCase().includes(q) ||
        a.osVersion.toLowerCase().includes(q)
      );
    }

    // OS Filter
    if (this.osFilter !== 'all') {
      filtered = filtered.filter(a => a.osCategory === this.osFilter);
    }

    // Entity Filter
    if (this.entityFilter !== 'all') {
      filtered = filtered.filter(a => a.entity === this.entityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];

      if (this.sortKey === 'installDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredAssets = filtered;
    this.totalPages = Math.ceil(this.filteredAssets.length / this.pageSize) || 1;
    this.currentPage = 1;
    this.updatePaginatedAssets();
  }

  // Update paginated assets
  updatePaginatedAssets() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedAssets = this.filteredAssets.slice(start, start + this.pageSize);
  }

  // Change page
  changePage(page: number) {
    this.loadingService.show();
    
    setTimeout(() => {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.updatePaginatedAssets();
      }
      this.loadingService.hide();
    }, 200);
  }

  // Toggle sort
  toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.filterAssets();
  }

  // Get risk color
  getRiskColor(level: string): string {
    switch(level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#fbbf24';
      default: return '#10b981';
    }
  }

  // Get risk dot color
  getRiskDotColor(risk: string): string {
    switch(risk) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f59e0b';
      default: return '#10b981';
    }
  }

  // Get OS class for badge
  getOsClass(osVersion: string): string {
    if (osVersion.includes('7') || osVersion.includes('XP') || osVersion.includes('8')) {
      return 'critical';
    } else if (osVersion.includes('10 (Old)')) {
      return 'warning';
    } else if (osVersion.includes('11')) {
      return 'current';
    }
    return '';
  }

  // Update selected entity data for By Entity tab
  updateSelectedEntityData() {
    const entityData = this.osRiskData.find(item => item.entity === this.selectedEntity);
    
    if (entityData) {
      this.selectedEntityData = {
        code: entityData.entity,
        name: entityData.entity,
        totalAssets: entityData.total,
        atRisk: entityData.win7 + entityData.win10out,
        financialImpact: entityData.financialImpact,
        riskLevel: entityData.riskLevel,
        riskColor: entityData.riskColor,
        osBreakdown: [
          { name: 'Win 7/XP/8', count: entityData.win7, percentage: Math.round((entityData.win7 / entityData.total) * 100) || 0, color: '#ef4444' },
          { name: 'Win10 (Out)', count: entityData.win10out, percentage: Math.round((entityData.win10out / entityData.total) * 100) || 0, color: '#f59e0b' },
          { name: 'Win10 (Ok)', count: entityData.win10ok, percentage: Math.round((entityData.win10ok / entityData.total) * 100) || 0, color: '#3b82f6' },
          { name: 'Win11', count: entityData.win11, percentage: Math.round((entityData.win11 / entityData.total) * 100) || 0, color: '#10b981' }
        ]
      };
    }
  }

  // Select entity in By Entity tab
  selectEntity(entityCode: string) {
    this.selectedEntity = entityCode;
    this.updateSelectedEntityData();
  }

  // View entity detail
  viewEntityDetail(entity: string) {
    this.selectEntity(entity);
    this.activeTab = 'byentity';
  }

  // View entity assets
  viewEntityAssets(entityCode: string) {
    this.entityFilter = entityCode;
    this.activeTab = 'assets';
    this.filterAssets();
  }

  // View asset detail
  viewAssetDetail(assetId: number) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      // Navigate to asset detail
    }, 300);
  }

  // Schedule upgrade for entity
  scheduleUpgrade(data: any) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert(`Upgrade scheduled for ${data.entity || data.assetId}`);
    }, 500);
  }

  // Schedule upgrade for specific asset
  scheduleEntityUpgrade(entity: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert(`Upgrade scheduled for ${entity}`);
    }, 500);
  }

  // Bulk schedule upgrades
  bulkScheduleUpgrade() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('Bulk upgrade scheduling initiated');
    }, 800);
  }

  // Export functions
  exportTable() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('Table exported successfully');
    }, 500);
  }

  exportAssetList() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('Asset list exported successfully');
    }, 500);
  }

  exportEntityReport(entityCode: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert(`Report for ${entityCode} exported`);
    }, 500);
  }

  // Generate report
  generateReport() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('Risk report generated');
    }, 800);
  }

  // Create mitigation plan
  createMitigationPlan() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('Mitigation plan created');
    }, 800);
  }

  // Notify clients
  notifyClients() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      alert('Clients notified successfully');
    }, 600);
  }
}
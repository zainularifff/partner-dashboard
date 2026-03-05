import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-os-risk',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule, FormsModule],
  templateUrl: './os-risk.html',
  styleUrls: ['./os-risk.scss'] 
})

export class OsRiskComponent implements OnInit {
  // Tab state
  activeTab: string = 'overview';
  
  // Summary KPI
  totalAtRisk: number = 1150;
  financialImpact: string = 'RM 575k';
  criticalUnits: number = 500;
  eolDeadline: string = '6 months';

  // OS Risk Data Table
  osRiskData = [
    { 
      entity: 'KKM', 
      win7: 320, 
      win10out: 45, 
      win10ok: 380, 
      win11: 0, 
      total: 745,
      riskLevel: 'CRITICAL',
      financialImpact: 'RM 360k'
    },
    { 
      entity: 'PETRONAS', 
      win7: 180, 
      win10out: 20, 
      win10ok: 250, 
      win11: 50, 
      total: 500,
      riskLevel: 'HIGH',
      financialImpact: 'RM 160k'
    },
    { 
      entity: 'MOE', 
      win7: 50, 
      win10out: 5, 
      win10ok: 800, 
      win11: 400, 
      total: 1255,
      riskLevel: 'LOW',
      financialImpact: 'RM 40k'
    },
    { 
      entity: 'MINDEF', 
      win7: 100, 
      win10out: 30, 
      win10ok: 300, 
      win11: 70, 
      total: 500,
      riskLevel: 'MEDIUM',
      financialImpact: 'RM 55k'
    }
  ];

  // Financial Impact Data
  financialImpactData = [
    { entity: 'KKM', amount: 'RM 360k', percent: 63, color: '#ef4444' },
    { entity: 'PETRONAS', amount: 'RM 160k', percent: 28, color: '#f59e0b' },
    { entity: 'MINDEF', amount: 'RM 55k', percent: 9, color: '#fbbf24' },
    { entity: 'MOE', amount: 'RM 40k', percent: 7, color: '#10b981' }
  ];

  // EOL Timeline Data
  timelineData = [
    { entity: 'KKM', critical: 45, progress: 75 },
    { entity: 'PETRONAS', critical: 20, progress: 60 },
    { entity: 'MINDEF', critical: 30, progress: 45 },
    { entity: 'MOE', critical: 5, progress: 20 }
  ];

  // Entities for selector
  entities = [
    { code: 'KKM', name: 'Kementerian Kesihatan' },
    { code: 'PETRONAS', name: 'Petronas' },
    { code: 'MOE', name: 'Kementerian Pendidikan' },
    { code: 'MINDEF', name: 'Kementerian Pertahanan' }
  ];

  // Selected entity for By Entity tab
  selectedEntity: string = 'KKM';
  selectedEntityData: any = null;

  // OS Distribution Chart
  osDistributionChart: any = {
    series: [
      { name: 'Win 7/XP/8', data: [320, 180, 50, 100] },
      { name: 'Win10 (Out)', data: [45, 20, 5, 30] },
      { name: 'Win10 (Ok)', data: [380, 250, 800, 300] },
      { name: 'Win11', data: [0, 50, 400, 70] }
    ],
    chart: { type: 'bar', height: 300, stacked: true, toolbar: { show: false } },
    xaxis: { categories: ['KKM', 'PETRONAS', 'MOE', 'MINDEF'] },
    colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
    plotOptions: { bar: { borderRadius: 4, horizontal: false } },
    dataLabels: { enabled: false }
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

  constructor(private location: Location, private router: Router) {}

  ngOnInit(): void {
    this.generateMockAssets();
    this.filterAssets();
    this.updateSelectedEntityData();
  }

  // Navigation
  goBack() {
    this.location.back();
  }

  // Generate mock assets for demonstration
  generateMockAssets() {
    const entities = ['KKM', 'PETRONAS', 'MOE', 'MINDEF'];
    const osVersions = [
      { name: 'Windows 7', category: 'win7', risk: 'Critical', eol: 'EOL' },
      { name: 'Windows XP', category: 'win7', risk: 'Critical', eol: 'EOL' },
      { name: 'Windows 8', category: 'win7', risk: 'Critical', eol: 'EOL' },
      { name: 'Windows 10 19041', category: 'win10out', risk: 'High', eol: '6 months' },
      { name: 'Windows 10 21H2', category: 'win10ok', risk: 'Low', eol: '24 months' },
      { name: 'Windows 10 22H2', category: 'win10ok', risk: 'Low', eol: '30 months' },
      { name: 'Windows 11 23H2', category: 'win11', risk: 'Low', eol: '48 months' }
    ];

    for (let i = 1; i <= 200; i++) {
      const entity = entities[Math.floor(Math.random() * entities.length)];
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
        risk: os.risk
      });
    }
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
    this.totalPages = Math.ceil(this.filteredAssets.length / this.pageSize);
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
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedAssets();
    }
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
    } else if (osVersion.includes('19041')) {
      return 'warning';
    } else if (osVersion.includes('11')) {
      return 'current';
    }
    return '';
  }

  // Update selected entity data for By Entity tab
  updateSelectedEntityData() {
    const entityMap: any = {
      'KKM': {
        code: 'KKM',
        name: 'Kementerian Kesihatan',
        totalAssets: 5200,
        atRisk: 365,
        financialImpact: 'RM 360k',
        riskLevel: 'CRITICAL',
        osBreakdown: [
          { name: 'Win 7/XP/8', count: 320, percentage: 43, color: '#ef4444' },
          { name: 'Win10 (Out)', count: 45, percentage: 6, color: '#f59e0b' },
          { name: 'Win10 (Ok)', count: 380, percentage: 51, color: '#3b82f6' },
          { name: 'Win11', count: 0, percentage: 0, color: '#10b981' }
        ]
      },
      'PETRONAS': {
        code: 'PETRONAS',
        name: 'Petronas',
        totalAssets: 3500,
        atRisk: 200,
        financialImpact: 'RM 160k',
        riskLevel: 'HIGH',
        osBreakdown: [
          { name: 'Win 7/XP/8', count: 180, percentage: 36, color: '#ef4444' },
          { name: 'Win10 (Out)', count: 20, percentage: 4, color: '#f59e0b' },
          { name: 'Win10 (Ok)', count: 250, percentage: 50, color: '#3b82f6' },
          { name: 'Win11', count: 50, percentage: 10, color: '#10b981' }
        ]
      },
      'MOE': {
        code: 'MOE',
        name: 'Kementerian Pendidikan',
        totalAssets: 4300,
        atRisk: 55,
        financialImpact: 'RM 40k',
        riskLevel: 'LOW',
        osBreakdown: [
          { name: 'Win 7/XP/8', count: 50, percentage: 4, color: '#ef4444' },
          { name: 'Win10 (Out)', count: 5, percentage: 0.4, color: '#f59e0b' },
          { name: 'Win10 (Ok)', count: 800, percentage: 64, color: '#3b82f6' },
          { name: 'Win11', count: 400, percentage: 32, color: '#10b981' }
        ]
      },
      'MINDEF': {
        code: 'MINDEF',
        name: 'Kementerian Pertahanan',
        totalAssets: 4100,
        atRisk: 130,
        financialImpact: 'RM 55k',
        riskLevel: 'MEDIUM',
        osBreakdown: [
          { name: 'Win 7/XP/8', count: 100, percentage: 20, color: '#ef4444' },
          { name: 'Win10 (Out)', count: 30, percentage: 6, color: '#f59e0b' },
          { name: 'Win10 (Ok)', count: 300, percentage: 60, color: '#3b82f6' },
          { name: 'Win11', count: 70, percentage: 14, color: '#10b981' }
        ]
      }
    };

    this.selectedEntityData = entityMap[this.selectedEntity];
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
    this.router.navigate(['/asset-detail', assetId]);
  }

  // Schedule upgrade for entity
  scheduleUpgrade(data: any) {
    console.log('Schedule upgrade for:', data);
    // Navigate to scheduling page or open modal
  }

  // Schedule upgrade for specific asset
  scheduleEntityUpgrade(entity: string) {
    console.log('Schedule upgrade for entity:', entity);
  }

  // Bulk schedule upgrades
  bulkScheduleUpgrade() {
    console.log('Bulk schedule upgrades');
  }

  // Export functions
  exportTable() {
    console.log('Exporting table...');
  }

  exportAssetList() {
    console.log('Exporting asset list...');
  }

  exportEntityReport(entityCode: string) {
    console.log('Exporting report for:', entityCode);
  }

  // Generate report
  generateReport() {
    console.log('Generating risk report...');
  }

  // Create mitigation plan
  createMitigationPlan() {
    console.log('Creating mitigation plan...');
  }

  // Notify clients
  notifyClients() {
    console.log('Notifying clients...');
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { LoadingService } from '../../services/loading.service'; // <-- IMPORT LOADING SERVICE

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, DragDropModule, NgApexchartsModule],
  templateUrl: './project.html',
  styleUrls: ['./project.scss']
})
export class ProjectComponent implements OnInit {
  Math = Math;

  selectedSector: string = 'ALL';
  searchQuery: string = '';
  // BUANG loading variable - tak perlu lagi
  groupedProjectsData: { key: string, value: any[] }[] = [];

  totalOnlineAll: number = 0;
  totalOfflineAll: number = 0;

  isModalOpen: boolean = false;
  selectedProject: any = null;
  allAgents: any[] = [];
  filteredAgents: any[] = [];
  agentSearchQuery: string = '';

  currentPage: number = 1;
  pageSize: number = 10;
  sortConfig = { key: 'AssetTag', direction: 'asc' };

  showFilters: boolean = false;

  // Sector Chart Data
  sectorChartSeries: any[] = [];
  sectorCategories: string[] = [];
  sectorChartOptions: any = {
    chart: { type: 'bar', height: 250, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
    colors: ['#2563eb', '#10b981'],
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: '#f1f5f9' },
    tooltip: { y: { formatter: (val: number) => val.toLocaleString() + ' units' } }
  };

  // Project Data
  projects = [
    { id: 1, name: 'FGV', client: 'MOE', sector: 'EDU', assets: 5500, deployed: 4200, balance: 1300, onlineAgents: 3800, offlineAgents: 400, status: 'Active' },
    { id: 2, name: 'FGV', client: 'MINDEF', sector: 'GOV', assets: 1500, deployed: 1150, balance: 350, onlineAgents: 1100, offlineAgents: 50, status: 'Active' },
    { id: 3, name: 'WSSB', client: 'KKM', sector: 'GOV', assets: 3200, deployed: 800, balance: 2400, onlineAgents: 750, offlineAgents: 50, status: 'Active' },
    { id: 4, name: 'WSSB', client: 'MBB', sector: 'FIN', assets: 850, deployed: 800, balance: 50, onlineAgents: 790, offlineAgents: 10, status: 'Completed' },
    { id: 5, name: 'FGV', client: 'CIMB', sector: 'FIN', assets: 1600, deployed: 600, balance: 1000, onlineAgents: 550, offlineAgents: 50, status: 'Active' },
    { id: 6, name: 'WSSB', client: 'PETRONAS', sector: 'GLC', assets: 1600, deployed: 600, balance: 1000, onlineAgents: 580, offlineAgents: 20, status: 'Active' }
  ];

  constructor(
    // BUANG ChangeDetectorRef - tak perlu
    private location: Location,
    private router: Router,
    private loadingService: LoadingService  // <-- TAMBAH LOADING SERVICE
  ) { }

  ngOnInit(): void {
    // Show loading
    this.loadingService.show();
    
    // Simulate data fetching
    setTimeout(() => {
      this.updateGroups();
      this.calculateOverallStats();
      this.calculateSectorChart();
      
      // Hide loading lepas data siap
      this.loadingService.hide();
      console.log('Project data loaded');
    }, 1000);
  }

  // Calculate Sector Chart Data
  calculateSectorChart() {
    const sectors = ['EDU', 'GOV', 'FIN', 'GLC'];
    const sectorMap = new Map();
    
    sectors.forEach(s => sectorMap.set(s, { assets: 0, deployed: 0 }));
    
    this.projects.forEach(p => {
      if (sectorMap.has(p.sector)) {
        const data = sectorMap.get(p.sector);
        data.assets += p.assets;
        data.deployed += p.deployed;
      }
    });
    
    this.sectorCategories = Array.from(sectorMap.keys());
    const assetsData = Array.from(sectorMap.values()).map(d => d.assets);
    const deployedData = Array.from(sectorMap.values()).map(d => d.deployed);
    
    this.sectorChartSeries = [
      { name: 'Total Assets', data: assetsData },
      { name: 'Deployed Agents', data: deployedData }
    ];
    
    this.sectorChartOptions.xaxis = { categories: this.sectorCategories };
  }

  // Calculate Overall Stats (Online/Offline)
  calculateOverallStats() {
    this.totalOnlineAll = 0;
    this.totalOfflineAll = 0;
    const activeProjects = this.projects.filter(p => 
      (this.selectedSector === 'ALL' || p.sector === this.selectedSector)
    );
    activeProjects.forEach(p => {
      this.totalOnlineAll += (p.onlineAgents || 0);
      this.totalOfflineAll += (p.offlineAgents || 0);
    });
  }

  // Health Rate Formatter for Donut Chart
  getHealthRate = (w: any) => {
    const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
    const online = w.globals.seriesTotals[0];
    return total > 0 ? Math.floor((online / total) * 100) + '%' : '0%';
  }

  // Sector Filter
  setSector(sector: string) {
    this.selectedSector = sector;
    this.updateGroups();
    this.calculateOverallStats();
  }

  // Update Project Groups based on filter
  updateGroups() {
    const filtered = this.projects.filter(p =>
      (this.selectedSector === 'ALL' || p.sector === this.selectedSector) &&
      (p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
       p.client.toLowerCase().includes(this.searchQuery.toLowerCase()))
    );
    const groupsObj = filtered.reduce((groups: any, project) => {
      const s = project.sector;
      if (!groups[s]) groups[s] = [];
      groups[s].push(project);
      return groups;
    }, {});
    this.groupedProjectsData = Object.keys(groupsObj).map(k => ({
      key: k,
      value: groupsObj[k]
    }));
  }

  // Sector Stats for KPI Cards
  get sectorStats(): any {
    return {
      ALL: this.projects.length,
      EDU: this.projects.filter(p => p.sector === 'EDU').length,
      GOV: this.projects.filter(p => p.sector === 'GOV').length,
      FIN: this.projects.filter(p => p.sector === 'FIN').length,
      GLC: this.projects.filter(p => p.sector === 'GLC').length
    };
  }

  // Open Modal with Agent List
  openProjectModal(project: any) {
    this.selectedProject = project;
    this.isModalOpen = true;
    this.currentPage = 1;
    this.agentSearchQuery = '';
    document.body.style.overflow = 'hidden';

    const brands = ['Dell Inc.', 'HP', 'Lenovo', 'Apple'];
    const models = ['Latitude 3420', 'EliteBook 840', 'ThinkPad X1', 'MacBook Pro'];

    this.allAgents = Array.from({ length: project.deployed }).map((_, i) => ({
      AssetTag: `WTECH-${project.client}-${(i + 1).toString().padStart(4, '0')}`,
      IP: `10.22.${Math.floor(i / 254) + 1}.${(i % 254) + 1}`,
      Brand: brands[Math.floor(Math.random() * brands.length)],
      Model: models[Math.floor(Math.random() * models.length)],
      AgentStatus: Math.random() > 0.1 ? 'On' : 'Off',
      ConnectionTime: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
    }));
    this.applyFiltersAndSort();
  }

  // Modal Helper Functions
  getOnlineCount(): number {
    return this.filteredAgents.filter(a => a.AgentStatus === 'On').length;
  }

  getOfflineCount(): number {
    return this.filteredAgents.filter(a => a.AgentStatus === 'Off').length;
  }

  getOnlineRate(): number {
    if (this.filteredAgents.length === 0) return 0;
    return Math.round((this.getOnlineCount() / this.filteredAgents.length) * 100);
  }

  // Apply Filters and Sorting
  applyFiltersAndSort() {
    let data = [...this.allAgents];
    if (this.agentSearchQuery) {
      const q = this.agentSearchQuery.toLowerCase();
      data = data.filter(a =>
        a.AssetTag?.toLowerCase().includes(q) || 
        a.IP?.includes(q) || 
        a.Model?.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      let valA = a[this.sortConfig.key as keyof typeof a];
      let valB = b[this.sortConfig.key as keyof typeof b];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA < valB) return this.sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    this.filteredAgents = data;
    this.currentPage = 1;
  }

  // Pagination
  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  get totalPages() {
    return Math.ceil(this.filteredAgents.length / this.pageSize) || 1;
  }

  getPaginatedAgents() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAgents.slice(start, start + this.pageSize);
  }

  // Sorting
  toggleSort(key: string) {
    if (this.sortConfig.key === key) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.key = key;
      this.sortConfig.direction = 'asc';
    }
    this.applyFiltersAndSort();
  }

  // Export to CSV
  exportToCSV() {
    if (this.filteredAgents.length === 0) return;
    const headers = ['Hostname', 'IP Address', 'Brand', 'Model', 'Last Seen', 'Status'];
    const rows = this.filteredAgents.map(agent => [
      agent.AssetTag, agent.IP, agent.Brand, agent.Model, 
      new Date(agent.ConnectionTime).toLocaleString(),
      agent.AgentStatus === 'On' ? 'Online' : 'Offline'
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Export_${this.selectedProject?.name}_${new Date().getTime()}.csv`);
    link.click();
  }

  // Close Modal
  closeModal() {
    this.isModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  // Go Back with referrer check
  goBack() { 
    this.loadingService.show(); // <-- SHOW LOADING
    
    setTimeout(() => {
      this.loadingService.hide();
      
      if (document.referrer.includes('login')) {
        this.router.navigate(['/management']);
      } else {
        this.location.back();
      }
    }, 300);
  }

  // DRAG & DROP FUNCTION
  drop(event: CdkDragDrop<any[]>, groupIndex: number) {
    moveItemInArray(this.groupedProjectsData[groupIndex].value, event.previousIndex, event.currentIndex);
  }
}
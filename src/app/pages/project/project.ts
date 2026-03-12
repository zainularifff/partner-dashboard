import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgApexchartsModule } from "ng-apexcharts";
import { Router } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

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
  
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';
  
  // Data dari API
  projects: any[] = [];
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

  constructor(
    private location: Location,
    private router: Router,
    private loadingService: LoadingService,
    private http: HttpClient
  ) { }

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadProjectData();
  }

  async loadProjectData() {
    try {
      // Load all data in parallel
      const [projects, sectors, overall] = await Promise.all([
        this.fetchData('/projects'),
        this.fetchData('/sectors/stats'),
        this.fetchData('/overall/stats')
      ]);

      console.log('Projects:', projects);
      console.log('Sectors:', sectors);
      console.log('Overall:', overall);

      // Map projects data
      if (projects && Array.isArray(projects)) {
        this.projects = projects.map(p => ({
          id: p.name,
          name: p.project || p.name,
          client: p.name,
          sector: p.sector || 'Other',
          assets: p.assets || 0,
          deployed: p.deployed || 0,
          balance: (p.assets || 0) - (p.deployed || 0),
          onlineAgents: p.onlineAgents || 0,
          offlineAgents: p.offlineAgents || 0,
          status: p.status || 'Active'
        }));
      }

      // Set overall stats
      if (overall) {
        this.totalOnlineAll = overall.total_online || 0;
        this.totalOfflineAll = overall.total_offline || 0;
      }

      // Update groups and charts
      this.updateGroups();
      this.calculateSectorChart();

      this.loadingService.hide();
      console.log('Project data loaded from API');

    } catch (error) {
      console.error('Error loading project data:', error);
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

  // Calculate Sector Chart Data
  calculateSectorChart() {
    const sectors = ['EDU', 'GOV', 'FIN', 'GLC', 'Other'];
    const sectorMap = new Map();
    
    sectors.forEach(s => sectorMap.set(s, { assets: 0, deployed: 0 }));
    
    this.projects.forEach(p => {
      const sector = p.sector || 'Other';
      if (sectorMap.has(sector)) {
        const data = sectorMap.get(sector);
        data.assets += p.assets;
        data.deployed += p.deployed;
      }
    });
    
    this.sectorCategories = Array.from(sectorMap.keys()).filter(k => 
      sectorMap.get(k).assets > 0 || sectorMap.get(k).deployed > 0
    );
    
    const assetsData = this.sectorCategories.map(k => sectorMap.get(k).assets);
    const deployedData = this.sectorCategories.map(k => sectorMap.get(k).deployed);
    
    this.sectorChartSeries = [
      { name: 'Total Assets', data: assetsData },
      { name: 'Deployed Agents', data: deployedData }
    ];
    
    this.sectorChartOptions.xaxis = { categories: this.sectorCategories };
  }

  // Calculate Overall Stats (Online/Offline) - guna dari API
  calculateOverallStats() {
    // Already set from API
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
    const stats: any = { ALL: this.projects.length };
    this.projects.forEach(p => {
      const sector = p.sector || 'Other';
      stats[sector] = (stats[sector] || 0) + 1;
    });
    return stats;
  }

  // Open Modal with Agent List
  async openProjectModal(project: any) {
    this.selectedProject = project;
    this.isModalOpen = true;
    this.currentPage = 1;
    this.agentSearchQuery = '';
    document.body.style.overflow = 'hidden';

    try {
      // Load agents for this project
      const agents = await this.fetchData(`/projects/${encodeURIComponent(project.client)}/agents`);
      
      if (agents && Array.isArray(agents)) {
        this.allAgents = agents;
      } else {
        this.allAgents = [];
      }
      
      this.applyFiltersAndSort();
    } catch (error) {
      console.error('Error loading agents:', error);
      this.allAgents = [];
      this.applyFiltersAndSort();
    }
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

  // DRAG & DROP FUNCTION
  drop(event: CdkDragDrop<any[]>, groupIndex: number) {
    moveItemInArray(this.groupedProjectsData[groupIndex].value, event.previousIndex, event.currentIndex);
  }
}
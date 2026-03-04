import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgApexchartsModule } from "ng-apexcharts";

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
  loading: boolean = true;
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

  // DATA UPDATED: Ditambah leaseStart & leaseDuration (Level 2 & 3 Support)
  projects = [
    { id: 1, name: 'FGV', client: 'MOE', sector: 'EDU', assets: 5500, deployed: 4200, balance: 1300, onlineAgents: 3800, offlineAgents: 400, status: 'Active', leaseStart: '2023-01-01', leaseDuration: 36 },
    { id: 2, name: 'FGV', client: 'MINDEF', sector: 'GOV', assets: 1500, deployed: 1150, balance: 350, onlineAgents: 1100, offlineAgents: 50, status: 'Active', leaseStart: '2024-06-01', leaseDuration: 24 },
    { id: 3, name: 'WSSB', client: 'KKM', sector: 'GOV', assets: 3200, deployed: 800, balance: 2400, onlineAgents: 750, offlineAgents: 50, status: 'Active', leaseStart: '2022-10-15', leaseDuration: 36 },
    { id: 4, name: 'WSSB', client: 'MBB', sector: 'FIN', assets: 850, deployed: 800, balance: 50, onlineAgents: 790, offlineAgents: 10, status: 'Completed', leaseStart: '2021-05-01', leaseDuration: 48 },
    { id: 5, name: 'FGV', client: 'CIMB', sector: 'FIN', assets: 1600, deployed: 600, balance: 1000, onlineAgents: 550, offlineAgents: 50, status: 'Active', leaseStart: '2023-03-01', leaseDuration: 24 },
    { id: 6, name: 'WSSB', client: 'PETRONAS', sector: 'GLC', assets: 1600, deployed: 600, balance: 1000, onlineAgents: 580, offlineAgents: 20, status: 'Active', leaseStart: '2024-01-01', leaseDuration: 36 }
  ];

  constructor(private cdr: ChangeDetectorRef, private location: Location) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.loading = false;
      this.updateGroups();
      this.calculateOverallStats();
      this.cdr.detectChanges();
    }, 1000);
  }

  // --- LEASING UTILS ---
  getRemainingLease(startDate: string, durationMonths: number): number {
    const start = new Date(startDate);
    const end = new Date(start.setMonth(start.getMonth() + durationMonths));
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths > 0 ? diffMonths : 0;
  }

  getLeaseMaturity(startDate: string, durationMonths: number): number {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const monthsPassed = diffTime / (1000 * 60 * 60 * 24 * 30);
    const percentage = (monthsPassed / durationMonths) * 100;
    return percentage > 100 ? 100 : Math.floor(percentage);
  }

  // --- EXPORT TO CSV ---
  exportToCSV() {
    if (this.filteredAgents.length === 0) return;
    const headers = ['Hostname', 'IP Address', 'Brand', 'Model', 'Last Seen', 'Status'];
    const rows = this.filteredAgents.map(agent => [
      agent.AssetTag, agent.IP, agent.Brand, agent.Model, agent.ConnectionTime,
      agent.AgentStatus === 'On' ? 'Online' : 'Offline'
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Export_${this.selectedProject.name}_${new Date().getTime()}.csv`);
    link.click();
  }

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

  getHealthRate = (w: any) => {
    const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
    const online = w.globals.seriesTotals[0];
    return total > 0 ? Math.floor((online / total) * 100) + '%' : '0%';
  }

  setSector(sector: string) {
    this.selectedSector = sector;
    this.updateGroups();
    this.calculateOverallStats();
  }

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

  get sectorStats(): any {
    return {
      ALL: this.projects.length,
      EDU: this.projects.filter(p => p.sector === 'EDU').length,
      GOV: this.projects.filter(p => p.sector === 'GOV').length,
      FIN: this.projects.filter(p => p.sector === 'FIN').length,
      GLC: this.projects.filter(p => p.sector === 'GLC').length
    };
  }

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

  applyFiltersAndSort() {
    let data = [...this.allAgents];
    if (this.agentSearchQuery) {
      const q = this.agentSearchQuery.toLowerCase();
      data = data.filter(a =>
        a.AssetTag?.toLowerCase().includes(q) || a.IP?.includes(q) || a.Model?.toLowerCase().includes(q)
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
  }

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

  toggleSort(key: string) {
    if (this.sortConfig.key === key) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.key = key;
      this.sortConfig.direction = 'asc';
    }
    this.applyFiltersAndSort();
  }

  closeModal() {
    this.isModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  goBack() { this.location.back(); }

  drop(event: CdkDragDrop<any[]>, groupIndex: number) {
    moveItemInArray(this.groupedProjectsData[groupIndex].value, event.previousIndex, event.currentIndex);
  }
}
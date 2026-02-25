import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IncidentApi } from '../../services/dashboard.api';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './incident-detail.html',
  styleUrls: ['./incident-detail.scss'],
})
export class IncidentComponent implements OnInit {
  serverStats: { label: string; count: number; color: string; sourceKey: string }[] = [];

  type: string = '';
  allData: any[] = [];
  filteredData: any[] = [];
  tickets: any[] = [];
  isFocused: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  isLoading: boolean = false;
  searchTerm: string = '';

  selectedServers: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: IncidentApi,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.type = params.get('type') || '';
      this.loadData();
    });
  }

  loadData() {
    this.isLoading = true;
    this.api.getFullList().subscribe({
      next: (rows: any[]) => {
        const nowInSeconds = Math.floor(Date.now() / 1000);

        this.allData = rows.map((x) => {
          const reqTime = Number(x.request_time);
          const endTime = x.completed_time && Number(x.completed_time) > 0
              ? Number(x.completed_time)
              : nowInSeconds;

          const diffDays = Math.floor((endTime - reqTime) / 86400);

          let status = 'healthy';
          if (diffDays > 7) status = 'critical';
          else if (diffDays >= 3) status = 'warning';

          return {
            id: x.request_no,
            title: x.user_summary || 'No Summary Available',
            requestBy: x.user_name || 'Unknown',
            statusCode: Number(x.request_status),
            source: x.serverId ? x.serverId.toString() : 'N/A',
            date: new Date(reqTime * 1000).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            }),
            daysElapsed: diffDays > 0 ? diffDays : 0,
            ageStatus: status
          };
        });

        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ FIX: Fungsi yang kau cari untuk setelkan TS2339
  onSearchChange(): void {
    this.currentPage = 1; // Balik ke page 1 bila cari benda baru
    this.applyFilter();
  }

  calculateDynamicStats() {
    const serverMap = new Map<string, number>();

    const baseDataByType = this.allData.filter((x) => {
      if (this.type === 'open') return x.statusCode === 0;
      if (this.type === 'pending') return x.statusCode === 13;
      if (this.type === 'solved') return x.statusCode === 2;
      if (this.type === 'lapsed') return x.statusCode !== 2 && x.daysElapsed > 7;
      return true;
    });

    baseDataByType.forEach((ticket) => {
      const name = ticket.source;
      serverMap.set(name, (serverMap.get(name) || 0) + 1);
    });

    this.serverStats = Array.from(serverMap.entries()).map(([name, count]) => {
      const lowerName = name.toLowerCase();
      let colorClass = 'blue'; 

      if (lowerName.includes('client')) {
        colorClass = 'orange'; 
      }

      return {
        label: name === 'N/A' ? 'Unknown' : `SERVER .${name}`,
        sourceKey: name,
        count: count,
        color: colorClass,
      };
    });
  }

  toggleServerFilter(sourceKey: string) {
    const index = this.selectedServers.indexOf(sourceKey);
    if (index > -1) this.selectedServers.splice(index, 1);
    else this.selectedServers.push(sourceKey);
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    this.filteredData = this.allData.filter((x) => {
      let matchType = false;
      if (this.type === 'open') matchType = x.statusCode === 0;
      else if (this.type === 'pending') matchType = x.statusCode === 13;
      else if (this.type === 'solved') matchType = x.statusCode === 2;
      else if (this.type === 'lapsed') matchType = x.statusCode !== 2 && x.daysElapsed > 7;
      else matchType = true;

      const search = this.searchTerm.toLowerCase();
      const matchSearch = x.id.toString().includes(search) ||
        x.title.toLowerCase().includes(search) ||
        x.source.toLowerCase().includes(search) ||
        x.requestBy.toLowerCase().includes(search);

      const matchServer = this.selectedServers.length > 0 ? this.selectedServers.includes(x.source) : true;
      return matchType && matchSearch && matchServer;
    });

    this.calculateDynamicStats();
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    this.tickets = this.filteredData.slice(start, start + this.pageSize);
    this.cdr.detectChanges();
  }

  onPageSizeChange(e: any) { this.pageSize = Number(e.target.value); this.currentPage = 1; this.updatePagination(); }
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); } }
  goBack() { this.router.navigate(['/dashboard']); }
  firstPage() { this.currentPage = 1; this.updatePagination(); }
  lastPage() { this.currentPage = this.totalPages; this.updatePagination(); }
}
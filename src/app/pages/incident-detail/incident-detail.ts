import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IncidentApi } from '../../services/dashboard.api';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

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
    RouterLink,
    BaseChartDirective,
  ],
  templateUrl: './incident-detail.html',
  styleUrls: ['./incident-detail.scss'],
})
export class IncidentComponent implements OnInit {
  // ================= DATA PROPERTIES =================
  serverStats: { label: string; count: number; color: string; sourceKey: string }[] = [];
  type: string = 'open';
  allData: any[] = [];
  filteredData: any[] = [];
  tickets: any[] = [];

  // ================= UI STATE =================
  isFocused = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  
  // ✅ FIXED: Gunakan isLoading secara konsisten dngn HTML kau
  isLoading = false; 
  
  searchTerm = '';
  selectedServers: string[] = [];

  // ================= TREND CONFIG =================
  public selectedType: string = 'open';
  public years: string[] = ['All Year'];
  public selectedYear: string = 'All Year';
  public selectedMonth: string = 'All';

  // ================= CHART CONFIGURATION =================
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{ data: [], label: 'Tickets', fill: true, tension: 0.4 }],
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { usePointStyle: true, boxWidth: 10, font: { size: 12, weight: 'bold' } },
      },
      tooltip: { enabled: true },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Total Tickets', color: '#64748b', font: { size: 12, weight: 'bold' } },
        ticks: { precision: 0 },
      },
      x: {
        title: { display: true, text: 'Timeline', color: '#64748b', font: { size: 12, weight: 'bold' } },
        grid: { display: false },
      },
    },
  };

  public lineChartType: 'line' = 'line';

  constructor(
    private router: Router,
    private api: IncidentApi,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const navState = history.state;
    if (navState && navState.type) {
      this.type = navState.type;
      this.selectedType = navState.type;
      this.selectedServers = navState.activeFilter ? navState.activeFilter.split(',') : [];
    }

    this.loadYears(); 
    this.loadData();
    this.loadTrend();
  }

  loadYears() {
    this.api.getAvailableYears().subscribe({
      next: (res: string[]) => {
        this.years = ['All Year', ...res];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading years:', err),
    });
  }

  loadData() {
    // 🚀 Mula Loading
    this.isLoading = true; 
    this.api.getFullList().subscribe({
      next: (rows: any[]) => {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        this.allData = rows.map((x) => {
          const reqTime = Number(x.request_time);
          const statusNum = Number(x.request_status);
          const endTime = statusNum === 2 && x.completed_time > 0 ? Number(x.completed_time) : nowInSeconds;
          const diffDays = Math.floor((endTime - reqTime) / 86400);

          return {
            uuid: x.uuid,
            id: x.request_no,
            title: x.user_summary || 'No Summary Available',
            requestBy: x.user_name || 'Unknown',
            statusCode: statusNum,
            source: x.serverId ? x.serverId.toString() : 'N/A',
            date: new Date(reqTime * 1000).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            }),
            daysElapsed: diffDays > 0 ? diffDays : 0,
          };
        });
        this.applyFilter();
        
        // ✅ Selesai Loading (Data dari semua server termasuk .70 dah masuk)
        this.isLoading = false; 
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTrend() {
    const clientFilter = this.selectedServers.join(',');
    this.api.getIncidentTrend(this.selectedType, clientFilter, this.selectedYear, this.selectedMonth)
      .subscribe((res: any[]) => {
        if (!res || res.length === 0) {
          this.lineChartData = { labels: [], datasets: [] };
          this.cdr.detectChanges();
          return;
        }

        const labels = res.map((r) => r.date);
        const data = res.map((r) => r.count);

        let dynamicLabel = `${this.selectedType.toUpperCase()} Tickets`;
        if (this.selectedYear !== 'All Year') {
          dynamicLabel += ` (${this.selectedYear})`;
          if (this.selectedMonth !== 'All') {
            dynamicLabel = `${this.selectedType.toUpperCase()} in ${this.selectedMonthName} ${this.selectedYear}`;
          }
        }

        this.lineChartData = {
          labels: labels,
          datasets: [{
            data: data,
            label: dynamicLabel,
            fill: true,
            tension: 0.4,
            borderColor: this.getChartColor(this.selectedType),
            backgroundColor: this.getChartColor(this.selectedType, 0.2),
            pointRadius: 5,
            pointBackgroundColor: '#fff',
            borderWidth: 3,
          }],
        };
        this.cdr.detectChanges();
      });
  }

  onYearChange() {
    this.selectedMonth = 'All'; 
    this.loadTrend();
  }

  get selectedMonthName(): string {
    const months = ['None', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(this.selectedMonth);
    return months[monthIndex] || '';
  }

  getChartColor(type: string, alpha: number = 1): string {
    const colors: any = {
      open: `rgba(59, 130, 246, ${alpha})`,
      pending: `rgba(245, 158, 11, ${alpha})`,
      solved: `rgba(16, 185, 129, ${alpha})`,
      lapsed: `rgba(239, 68, 68, ${alpha})`,
    };
    return colors[type] || `rgba(148, 163, 184, ${alpha})`;
  }

  private checkStatusMatch(ticketStatus: number, filterType: string): boolean {
    if (filterType === 'open') return ticketStatus === 0;
    if (filterType === 'pending') return [1, 10, 11, 12, 13].includes(ticketStatus);
    if (filterType === 'solved') return ticketStatus === 2;
    if (filterType === 'lapsed') return ticketStatus !== 2 && ticketStatus !== 14;
    return true;
  }

  applyFilter() {
    this.filteredData = this.allData.filter((x) => {
      let matchType = this.checkStatusMatch(x.statusCode, this.type);
      if (this.type === 'lapsed') matchType = x.statusCode !== 2 && x.statusCode !== 14 && x.daysElapsed > 7;
      const search = this.searchTerm.toLowerCase();
      const matchSearch = x.id.toString().includes(search) || x.title.toLowerCase().includes(search) || x.source.toLowerCase().includes(search) || x.requestBy.toLowerCase().includes(search);
      const matchServer = this.selectedServers.length > 0 ? this.selectedServers.includes(x.source) : true;
      return matchType && matchSearch && matchServer;
    });
    this.calculateDynamicStats();
    this.updatePagination();
  }

  calculateDynamicStats() {
    const serverMap = new Map<string, number>();
    const baseDataByType = this.allData.filter((x) => {
      if (this.type === 'lapsed') return x.statusCode !== 2 && x.statusCode !== 14 && x.daysElapsed > 7;
      return this.checkStatusMatch(x.statusCode, this.type);
    });
    baseDataByType.forEach((ticket) => {
      const name = ticket.source;
      serverMap.set(name, (serverMap.get(name) || 0) + 1);
    });
    this.serverStats = Array.from(serverMap.entries()).map(([name, count]) => ({
      label: name === 'N/A' ? 'Unknown' : `SERVER .${name}`,
      sourceKey: name, count: count,
      color: name.toLowerCase().includes('client') ? 'orange' : 'blue',
    }));
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.tickets = this.filteredData.slice(start, start + this.pageSize);
    this.cdr.detectChanges();
  }

  toggleServerFilter(sourceKey: string) {
    const index = this.selectedServers.indexOf(sourceKey);
    if (index > -1) this.selectedServers.splice(index, 1);
    else this.selectedServers.push(sourceKey);
    this.currentPage = 1;
    this.applyFilter();
    this.loadTrend();
  }

  onSearchChange() { this.currentPage = 1; this.applyFilter(); }
  onPageSizeChange(e: any) { this.pageSize = Number(e.target.value); this.currentPage = 1; this.updatePagination(); }
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); } }
  firstPage() { this.currentPage = 1; this.updatePagination(); }
  lastPage() { this.currentPage = this.totalPages; this.updatePagination(); }
  goBack() { this.router.navigate(['/dashboard']); }
}
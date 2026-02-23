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

// Main component class for incident details
export class IncidentComponent implements OnInit {
  serverStats: { label: string; count: number; color: string }[] = [];

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: IncidentApi,
    private cdr: ChangeDetectorRef,
  ) {}

  // Initialize component and load data based on route parameter
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.type = params.get('type') || '';
      this.loadData();
    });
  }

  // Load data from API and transform it for display
  loadData() {
    this.isLoading = true;
    this.api.getFullList().subscribe({
      next: (rows: any[]) => {
        const nowInSeconds = Math.floor(Date.now() / 1000);

        this.allData = rows.map((x) => {
          const reqTime = Number(x.request_time);

          // If completed_time is missing or zero, use current time to calculate elapsed days
          const endTime =
            x.completed_time && Number(x.completed_time) > 0
              ? Number(x.completed_time)
              : nowInSeconds;

          // Calculate elapsed days, ensuring it doesn't go negative
          const diffSeconds = endTime - reqTime;
          const diffDays = Math.floor(diffSeconds / 86400);

          return {
            id: x.request_no,
            title: x.user_summary || 'No Summary Available',
            requestBy: x.user_name || 'Unknown',
            statusCode: Number(x.request_status),
            source: x.origin_server_id || 'N/A',
            date: new Date(reqTime * 1000).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            daysElapsed: diffDays > 0 ? diffDays : 0,
          };
        });

        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Calculate dynamic stats for server distribution
  calculateDynamicStats() {
    const serverMap = new Map<string, number>();
    const colors = ['blue', 'orange', 'purple', 'green', 'cyan'];

    this.filteredData.forEach((ticket) => {
      const name = ticket.source;
      serverMap.set(name, (serverMap.get(name) || 0) + 1);
    });

    this.serverStats = Array.from(serverMap.entries()).map(([name, count], index) => {
      return {
        label: `SERVER ${name}`,
        count: count,
        color: colors[index % colors.length],
      };
    });
  }

  // Handler for search input change
  onSearchChange() {
    this.currentPage = 1;
    this.applyFilter();
  }

  // Filter data based on type and search term
  applyFilter() {
    this.filteredData = this.allData.filter((x) => {
      let matchType = false;

      if (this.type === 'open') matchType = x.statusCode === 0;
      else if (this.type === 'pending') matchType = x.statusCode === 13;
      else if (this.type === 'solved') matchType = x.statusCode === 2;
      // ✅ FIX LOGIK LAPSED:
      // Tiket dikira LAPSED hanya jika:
      // 1. Belum Solved (x.statusCode !== 2)
      // 2. DAN sudah lebih dari 7 hari (x.daysElapsed > 7)
      else if (this.type === 'lapsed') {
        matchType = x.statusCode !== 2 && x.daysElapsed > 7;
      } else {
        matchType = true;
      }

      const search = this.searchTerm.toLowerCase();

      return (
        matchType &&
        (x.id.toString().includes(search) ||
          x.title.toLowerCase().includes(search) ||
          x.source.toLowerCase().includes(search) ||
          x.requestBy.toLowerCase().includes(search))
      );
    });

    // Susun data (Sorting)
    if (this.type === 'lapsed' || this.type === 'pending') {
      this.filteredData.sort((a, b) => b.daysElapsed - a.daysElapsed);
    } else if (this.type === 'solved') {
      this.filteredData.sort((a, b) => a.daysElapsed - b.daysElapsed);
    }

    this.calculateDynamicStats();
    this.updatePagination();
  }

  // Update pagination based on filtered data
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    this.tickets = this.filteredData.slice(start, start + this.pageSize);

    this.cdr.detectChanges();
  }

  // Handler for page size change
  onPageSizeChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination controls
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // Go to first page of results
  firstPage() {
    this.currentPage = 1;
    this.updatePagination();
  }

  // Go to last page of results
  lastPage() {
    this.currentPage = this.totalPages;
    this.updatePagination();
  }
}

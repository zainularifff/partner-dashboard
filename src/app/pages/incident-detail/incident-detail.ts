import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IncidentApi } from '../../services/dashboard.api';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './incident-detail.html',
  styleUrls: ['./incident-detail.scss']
})
export class IncidentComponent implements OnInit {
  // Fix TS2339 by declaring these:
  openCount70: number = 0;
  openCount51: number = 0;

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

  constructor(private route: ActivatedRoute, private router: Router, private api: IncidentApi) {
    // Extract counts from Dashboard navigation if available
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { counts: any };
    if (state && state.counts) {
      this.openCount70 = state.counts.count70 || 0;
      this.openCount51 = state.counts.count51 || 0;
    }
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.type = params.get('type') || '';
      this.loadData();
    });
  }

  loadData() {
    this.isLoading = true;
    this.api.getFullList().subscribe({
      next: (rows: any[]) => {
        this.allData = rows.map(x => ({
          id: x.request_no,
          title: x.title,
          requestBy: x.user_name || 'Unknown',
          statusCode: Number(x.request_status),
          source: x.origin_ip || 'N/A', 
          date: new Date(Number(x.request_time) * 1000).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        }));

        // If counts weren't passed, calculate them from live data
        if (this.openCount70 === 0 && this.openCount51 === 0) {
          this.openCount70 = this.allData.filter(x => x.source.includes('.70') && x.statusCode === 0).length;
          this.openCount51 = this.allData.filter(x => x.source.includes('.51') && x.statusCode === 0).length;
        }

        this.applyFilter();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    this.filteredData = this.allData.filter(x => {
      let matchType = false;
      if (this.type === 'open') matchType = x.statusCode === 0;
      else if (this.type === 'pending') matchType = x.statusCode === 13;
      else if (this.type === 'solved') matchType = x.statusCode === 2;
      else if (this.type === 'lapsed') matchType = x.statusCode !== 2; // Simplified logic
      else matchType = true;

      const search = this.searchTerm.toLowerCase();
      return matchType && (
        x.id.toString().includes(search) || 
        x.title.toLowerCase().includes(search) ||
        x.source.toLowerCase().includes(search)
      );
    });
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    this.tickets = this.filteredData.slice(start, start + this.pageSize);
  }

  onPageSizeChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.updatePagination();
  }

  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); } }
  goBack() { this.router.navigate(['/dashboard']); }
}

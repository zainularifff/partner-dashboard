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
  // Array to hold the dynamic status pills (e.g., Client_A: 5, Client_B: 22)
  serverStats: { label: string, count: number, color: string }[] = [];

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

  constructor(private route: ActivatedRoute, private router: Router, private api: IncidentApi) {}

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
          // ✅ MATCH BACKEND: Use origin_server_id from your new db.js
          source: x.origin_server_id || 'N/A', 
          date: new Date(Number(x.request_time) * 1000).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        }));

        // Generate the counts per server name
        this.calculateDynamicStats();
        
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  calculateDynamicStats() {
    const serverMap = new Map<string, number>();
    const colors = ['blue', 'orange', 'purple', 'green', 'cyan'];

    // Group only 'Open' (status 0) tickets by their Client Name
    this.allData.forEach(ticket => {
      if (ticket.statusCode === 0) {
        const name = ticket.source; // This is now "Client_A" or "Client_B"
        serverMap.set(name, (serverMap.get(name) || 0) + 1);
      }
    });

    // Convert map to array for the *ngFor loop in HTML
    this.serverStats = Array.from(serverMap.entries()).map(([name, count], index) => {
      return {
        // ✅ SIMPLIFIED: No more IP splitting logic needed
        label: `SERVER ${name}`,
        count: count,
        color: colors[index % colors.length]
      };
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
      else if (this.type === 'lapsed') matchType = x.statusCode !== 2;
      else matchType = true;

      const search = this.searchTerm.toLowerCase();
      return matchType && (
        x.id.toString().includes(search) || 
        x.title.toLowerCase().includes(search) ||
        x.source.toLowerCase().includes(search) // Matches search against Client Name
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

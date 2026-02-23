import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ 1. ADDED FOR [(ngModel)]
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IncidentApi } from '../../services/dashboard.api';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  // ✅ 2. ADDED FormsModule TO IMPORTS
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
  type: string = '';
  allData: any[] = [];
  filteredData: any[] = [];
  isFocused: boolean = false;  
  // ✅ 3. RENAMED TO 'tickets' TO MATCH YOUR HTML *ngFor="let t of tickets"
  tickets: any[] = []; 
  
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
          statusCode: Number(x.request_status),
          // ✅ 4. RENAMED 'origin' to 'source' TO MATCH HTML {{t.source}}
          source: x.origin_ip || 'N/A', 
          // Change 'Short' to 'short'
            date: new Date(Number(x.request_time) * 1000).toLocaleDateString('en-GB', {
            day: '2-digit', 
            month: 'short', // ✅ Fix: lowercase 'short'
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
            })
        }));
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  // ✅ 5. UPDATED SEARCH TO WORK WITH [(ngModel)]
  onSearchChange() {
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter() {
    const now = new Date();
    this.filteredData = this.allData.filter(x => {
      let matchType = false;
      if (this.type === 'open') matchType = x.statusCode === 0;
      else if (this.type === 'pending') matchType = x.statusCode === 13;
      else if (this.type === 'solved') matchType = x.statusCode === 2;
      else if (this.type === 'lapsed') {
        // Simple logic for items older than 7 days
        const itemDate = new Date(x.date);
        const diff = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        matchType = x.statusCode !== 2 && diff > 7;
      } else {
        matchType = true; // Show all if no type
      }

      const search = this.searchTerm.toLowerCase();
      const matchSearch = x.id.toString().includes(search) || 
                          x.title.toLowerCase().includes(search);
      
      return matchType && matchSearch;
    });
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    this.tickets = this.filteredData.slice(start, start + this.pageSize);
  }

  onPageSizeChange(event: any) {
  // Update the pageSize variable with the new selection
  this.pageSize = Number(event.target.value);
  
  // Reset to the first page to avoid "out of bounds" errors
  this.currentPage = 1;
  
  // Refresh the table view
  this.updatePagination();
    }


  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); } }
  goBack() { this.router.navigate(['/dashboard']); }
}

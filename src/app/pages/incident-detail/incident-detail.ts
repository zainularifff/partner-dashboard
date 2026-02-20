import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { IncidentApi } from '../../services/dashboard.api';


@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './incident-detail.html',
  styleUrls: ['./incident-detail.scss']
})
export class IncidentComponent implements OnInit {

  type: string = '';
  filteredData: any[] = [];
  allData: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private api: IncidentApi
  ) {}

  ngOnInit() {
    // 1️⃣ Subscribe to paramMap to catch every route change
    this.route.paramMap.subscribe(params => {
      this.type = params.get('type') || '';
      console.log('ACTIVE TYPE:', this.type);

      // 2️⃣ Load or re-filter data
      this.loadData();
    });
  }

  loadData() {
    this.api.list().subscribe(rows => {
      this.allData = rows.map(x => ({
        id: x.request_no,
        title: x.title,
        statusCode: Number(x.request_status),
        created: new Date(Number(x.request_time) * 1000),
        origin: x.origin_ip
      }));

      this.applyFilter();
    });
  }

  applyFilter() {

    const now = new Date();

    switch (this.type) {
      case 'open':
        this.filteredData = this.allData.filter(x => x.statusCode === 0);
        break;

      case 'pending':
        this.filteredData = this.allData.filter(x => x.statusCode === 13);
        break;

      case 'solved':
        this.filteredData = this.allData.filter(x => x.statusCode === 2);
        break;

      case 'lapsed':
        this.filteredData = this.allData.filter(x => {
          if (x.statusCode === 2) return false;
          const diffDays =
            (now.getTime() - x.created.getTime()) / (1000 * 3600 * 24);
          return diffDays > 7;
        });
        break;

      default:
        this.filteredData = [];
    }

    console.log('Filtered Count:', this.filteredData.length);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

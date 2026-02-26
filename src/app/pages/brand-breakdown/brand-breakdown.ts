import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink, Router, RouterModule } from '@angular/router'; // ✅ Added RouterModule
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface ModelDetail {
  clientName: string;
  machineType: string;
  brandName: string;
  total: number;
  new: number;
  optimal: number;
  aging: number;
  critical: number;
}

interface ProjectGroup {
  projectName: string;
  totalInProject: number;
  models: ModelDetail[];
}

@Component({
  selector: 'app-brand-breakdown',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    RouterLink, 
    RouterModule, // ✅ Essential for router.navigate to work
    MatTooltipModule, 
    BaseChartDirective
  ],
  templateUrl: './brand-breakdown.html',
  styleUrl: './brand-breakdown.scss',
})
export class BrandBreakdownComponent implements OnInit {
  selectedBrand: string | null = '';
  loading = false;
  rawAssets: any[] = [];
  groupedProjects: ProjectGroup[] = [];

  totalAssetsAll = 0;
  totalNew = 0;
  totalStd = 0;
  totalAging = 0;
  totalCrit = 0;

  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['New', 'Optimal', 'Aging', 'Critical'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    plugins: { legend: { display: false } },
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location,
    private router: Router,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    // Get brand from URL or default to ASUS
    this.selectedBrand = this.route.snapshot.paramMap.get('brandName') || 'ASUS';
    this.fetchDataFromBackend();
  }

  goBack(): void {
    this.location.back();
  }

  fetchDataFromBackend() {
    this.loading = true;
    const apiUrl = `http://localhost:3000/api/assets/brand-hierarchy-new?brand=${this.selectedBrand}`;

    this.http.get<any[]>(apiUrl).subscribe({
      next: (data) => {
        try {
          if (data && data.length > 0) {
            this.rawAssets = data.map((item) => ({
              project: item.projectName || 'UNKNOWN',
              machine: item.machineType || 'DEVICES',
              // ✅ FIXED: Use selectedBrand instead of hardcoded 'ASUS'
              brand: item.brandGroup || this.selectedBrand, 
              age: item.Age ?? 0,
            }));
            this.processProjectMapping();
          } else {
            console.warn('⚠️ No data returned for brand:', this.selectedBrand);
            this.groupedProjects = [];
            this.totalAssetsAll = 0;
          }
        } catch (e) {
          console.error('❌ Logic Error in mapping:', e);
        } finally {
          this.loading = false;
          this.cdr.detectChanges(); 
        }
      },
      error: (err) => {
        console.error('❌ API Error:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  mapAgeToStatus(age: number): string {
    if (age < 1) return 'new';
    if (age <= 2) return 'optimal';
    if (age === 3) return 'aging';
    return 'critical';
  }

  processProjectMapping() {
    const projectMap = new Map<string, any>();
    
    this.totalAssetsAll = this.rawAssets.length;
    this.totalNew = 0;
    this.totalStd = 0;
    this.totalAging = 0;
    this.totalCrit = 0;

    this.rawAssets.forEach((asset) => {
      const status = this.mapAgeToStatus(asset.age);

      if (status === 'new') this.totalNew++;
      else if (status === 'optimal') this.totalStd++;
      else if (status === 'aging') this.totalAging++;
      else if (status === 'critical') this.totalCrit++;

      if (!projectMap.has(asset.project)) {
        projectMap.set(asset.project, {
          projectName: asset.project,
          totalInProject: 0,
          models: new Map<string, any>(),
        });
      }

      const projectObj = projectMap.get(asset.project);
      projectObj.totalInProject++;

      const combinedKey = `${asset.project}-${asset.machine}-${asset.brand}`;

      if (!projectObj.models.has(combinedKey)) {
        projectObj.models.set(combinedKey, {
          clientName: asset.project,
          machineType: asset.machine,
          brandName: asset.brand,
          total: 0,
          new: 0,
          optimal: 0,
          aging: 0,
          critical: 0,
        });
      }

      const modelObj = projectObj.models.get(combinedKey);
      modelObj.total++;

      if (status === 'new') modelObj.new++;
      else if (status === 'optimal') modelObj.optimal++;
      else if (status === 'aging') modelObj.aging++;
      else if (status === 'critical') modelObj.critical++;
    });

    this.doughnutChartData = {
      labels: ['New', 'Optimal', 'Aging', 'Critical'],
      datasets: [
        {
          data: [this.totalNew, this.totalStd, this.totalAging, this.totalCrit],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };

    this.groupedProjects = Array.from(projectMap.values()).map((p) => ({
      ...p,
      models: Array.from(p.models.values()),
    }));
  }

  // brand-breakdown.ts
  goToLevel3(m: any) {
    console.log('🚀 Klik dikesan!'); // Tengok dkt Console (F12)
    this.router.navigate(['/asset-detail']); // ✅ Pergi terus ke page detail
  }

  getPercent(val: number, total: number): number {
    return total > 0 ? (val / total) * 100 : 0;
  }
}
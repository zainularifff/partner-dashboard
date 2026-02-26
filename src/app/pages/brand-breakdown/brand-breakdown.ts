import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// --- GRAF IMPORTS ---
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

// Interface untuk struktur data baru
interface ModelDetail {
  Clientwithmodel: string;
  total: number;
  new: number;
  standard: number;
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
  imports: [CommonModule, MatIconModule, RouterLink, MatTooltipModule, BaseChartDirective],
  templateUrl: './brand-breakdown.html',
  styleUrl: './brand-breakdown.scss'
})
export class BrandBreakdownComponent implements OnInit {
  selectedBrand: string | null = '';
  
  // 1. DATA SUMBER (Pastikan ada field 'project' dan 'client')
  rawAssets: any[] = [
    { project: 'MBSA', client: 'WSSB', name: 'Vivobook', status: 'new' },
    { project: 'MBSA', client: 'BSN', name: 'Vivobook', status: 'standard' },
    { project: 'FGV', client: 'Shell', name: 'Zenbook', status: 'aging' },
    { project: 'FGV', client: 'Maybank', name: 'ExpertBook', status: 'critical' },
  ];

  // VARIABEL UNTUK HTML
  groupedProjects: ProjectGroup[] = [];
  totalAssetsAll = 0;
  totalNew = 0;
  totalStd = 0;
  totalAging = 0;
  totalCrit = 0;

  // KONFIGURASI GRAF
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['New', 'Standard', 'Aging', 'Critical'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    plugins: { legend: { display: false } }
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.selectedBrand = this.route.snapshot.paramMap.get('brandName') || 'ASUS';
    this.processProjectMapping(); 
  }

  processProjectMapping() {
    const projectMap = new Map<string, any>();

    // 2. KIRA GLOBAL STATS UNTUK GRAF & SUMMARY
    this.totalAssetsAll = this.rawAssets.length;
    this.totalNew = this.rawAssets.filter(a => a.status === 'new').length;
    this.totalStd = this.rawAssets.filter(a => a.status === 'standard').length;
    this.totalAging = this.rawAssets.filter(a => a.status === 'aging').length;
    this.totalCrit = this.rawAssets.filter(a => a.status === 'critical').length;

    // Masukkan data ke dalam graf
    this.doughnutChartData.datasets[0].data = [this.totalNew, this.totalStd, this.totalAging, this.totalCrit];

    // 3. LOGIC GROUPING: PROJECT > CLIENT
    this.rawAssets.forEach(asset => {
      // Create Project Group if not exists
      if (!projectMap.has(asset.project)) {
        projectMap.set(asset.project, {
          projectName: asset.project,
          totalInProject: 0,
          models: new Map<string, any>()
        });
      }
      
      const projectObj = projectMap.get(asset.project);
      projectObj.totalInProject++;

      // Combine Model + Client Name (Contoh: "ASUS Vivobook - Petronas")
      const combinedKey = `${asset.client} - ${this.selectedBrand} ${asset.name}`;

      // Create Model Group inside Project
      if (!projectObj.models.has(combinedKey)) {
        projectObj.models.set(combinedKey, {
          Clientwithmodel: combinedKey,
          total: 0, new: 0, standard: 0, aging: 0, critical: 0
        });
      }

      const modelObj = projectObj.models.get(combinedKey);
      modelObj.total++;

      // Increment stats dlm card
      if (asset.status === 'new') modelObj.new++;
      else if (asset.status === 'standard') modelObj.standard++;
      else if (asset.status === 'aging') modelObj.aging++;
      else if (asset.status === 'critical') modelObj.critical++;
    });

    // 4. TRANSFORMA SI MAP KEPADA ARRAY UNTUK HTML (*ngFor)
    this.groupedProjects = Array.from(projectMap.values()).map(p => ({
      ...p,
      models: Array.from(p.models.values())
    }));
  }

  getPercent(val: number, total: number): number {
    return total > 0 ? (val / total) * 100 : 0;
  }
}
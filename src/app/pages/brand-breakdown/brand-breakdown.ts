import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// --- GRAF IMPORTS ---
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-brand-breakdown',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, MatTooltipModule, BaseChartDirective],
  templateUrl: './brand-breakdown.html',
  styleUrl: './brand-breakdown.scss'
})
export class BrandBreakdownComponent implements OnInit {
  selectedBrand: string | null = '';
  
  // DATA SUMBER (Pastikan ada field 'client')
  clientRows: any[] = [
    { client: 'Client A', name: 'Asus Vivobook', total: 450, new: 180, standard: 100, aging: 150, critical: 20 },
    { client: 'Client A', name: 'Asus Zenbook', total: 320, new: 50, standard: 150, aging: 100, critical: 20 },
    { client: 'Client B', name: 'Asus ExpertBook', total: 110, new: 10, standard: 30, aging: 40, critical: 30 },
    { client: 'Client C', name: 'Asus ROG', total: 159, new: 60, standard: 70, aging: 29, critical: 0 }
  ];

  // VARIABEL UNTUK HTML
  groupedClients: any[] = [];
  totalAssetsAllClients = 0;
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
    this.selectedBrand = this.route.snapshot.paramMap.get('brandName');
    this.processAllData(); // Panggil fungsi utama
  }

  processAllData() {
    // 1. KIRA TOTAL UNTUK GRAF & STATS GRID
    this.totalNew = this.clientRows.reduce((sum, item) => sum + item.new, 0);
    this.totalStd = this.clientRows.reduce((sum, item) => sum + item.standard, 0);
    this.totalAging = this.clientRows.reduce((sum, item) => sum + item.aging, 0);
    this.totalCrit = this.clientRows.reduce((sum, item) => sum + item.critical, 0);
    this.totalAssetsAllClients = this.totalNew + this.totalStd + this.totalAging + this.totalCrit;

    // Masukkan data ke dalam graf
    this.doughnutChartData.datasets[0].data = [this.totalNew, this.totalStd, this.totalAging, this.totalCrit];

    // 2. PROSES GROUPING UNTUK TABLE
    const groups = this.clientRows.reduce((acc, obj) => {
      const key = obj.client;
      if (!acc[key]) acc[key] = [];
      acc[key].push(obj);
      return acc;
    }, {});

    this.groupedClients = Object.keys(groups).map(client => ({
      clientName: client,
      models: groups[client],
      totalInGroup: groups[client].reduce((sum: number, m: any) => sum + m.total, 0)
    }));
  }

  getPercent(val: number, total: number): number {
    return total > 0 ? (val / total) * 100 : 0;
  }
}

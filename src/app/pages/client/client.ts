import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from "ng-apexcharts"; // Pastikan import ni ada

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, NgApexchartsModule],
  templateUrl: './client.html',
  styleUrls: ['./client.scss']
})
export class ClientComponent implements OnInit {
  searchQuery: string = '';

  clients = [
    { id: 1, name: 'MOE (KPM)', industry: 'Education', totalAssets: 5500, healthScore: 94, slaPerf: 98, highRiskAging: 12, activeTickets: 15, status: 'Healthy' },
    { id: 2, name: 'KKM', industry: 'Healthcare', totalAssets: 3200, healthScore: 65, slaPerf: 72, highRiskAging: 45, activeTickets: 84, status: 'Critical' },
    { id: 3, name: 'MINDEF', industry: 'Government', totalAssets: 1500, healthScore: 88, slaPerf: 90, highRiskAging: 5, activeTickets: 8, status: 'Healthy' },
    { id: 4, name: 'PETRONAS', industry: 'GLC / Energy', totalAssets: 1600, healthScore: 82, slaPerf: 85, highRiskAging: 22, activeTickets: 42, status: 'Warning' }
  ];

  filteredClients = [...this.clients];

  // --- CHART CONFIGURATION ---
  
  // 1. Portfolio Health (Donut)
  public healthChart: any = {
    series: [2, 1, 1], // Healthy, Warning, Critical
    chart: { type: "donut", height: 250 },
    labels: ["Healthy", "Warning", "Critical"],
    colors: ["#22c55e", "#eab308", "#ef4444"],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '70%' } } }
  };

  // 2. Incident vs SLA (Bar)
  public incidentChart: any = {
    series: [
      { name: "Tickets", data: [15, 84, 8, 42] },
      { name: "SLA %", data: [98, 72, 90, 85] }
    ],
    chart: { type: "bar", height: 250, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 5 } },
    xaxis: { categories: ["MOE", "KKM", "MINDEF", "PETRONAS"] },
    colors: ["#6366f1", "#10b981"],
    dataLabels: { enabled: false }
  };

  ngOnInit(): void {}

  filterClients() {
    this.filteredClients = this.clients.filter(c => 
      c.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  getRiskClass(health: number) {
    if (health >= 90) return 'risk-low';
    if (health >= 75) return 'risk-med';
    return 'risk-high';
  }
}
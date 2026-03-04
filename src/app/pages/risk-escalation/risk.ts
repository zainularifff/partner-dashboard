import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from "ng-apexcharts";

@Component({
  selector: 'app-risk-escalation',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgApexchartsModule],
  templateUrl: './risk.html',
  styleUrls: ['./risk.scss']
})
export class RiskComponent implements OnInit {

  // Data Risk per Client
  riskData = [
    { 
      client: 'KKM', 
      osRisk: 'High', osVersion: 'Win 10 (Build 19041)', 
      biosRisk: 'Critical', biosAge: '5.2 Years',
      openTickets: 84, slaStatus: '72%',
      trend: 'up'
    },
    { 
      client: 'MOE', 
      osRisk: 'Low', osVersion: 'Win 11 (23H2)', 
      biosRisk: 'Low', biosAge: '1.5 Years',
      openTickets: 15, slaStatus: '98%',
      trend: 'down'
    },
    { 
      client: 'PETRONAS', 
      osRisk: 'Medium', osVersion: 'Win 10 (Latest)', 
      biosRisk: 'Medium', biosAge: '3.8 Years',
      openTickets: 42, slaStatus: '85%',
      trend: 'stable'
    }
  ];

  // Chart: OS Compliance vs BIOS Aging
  public riskChart: any = {
    series: [
      { name: "Outdated OS %", data: [45, 5, 20] },
      { name: "Legacy BIOS %", data: [60, 10, 35] }
    ],
    chart: { type: "bar", height: 300, stacked: true },
    xaxis: { categories: ["KKM", "MOE", "PETRONAS"] },
    colors: ["#f43f5e", "#fbbf24"], // Red & Amber
    plotOptions: { bar: { horizontal: true } },
    legend: { position: 'top' }
  };

  constructor() {}

  ngOnInit(): void {}

  getRiskColor(level: string) {
    switch(level) {
      case 'Critical': return '#be123c';
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      default: return '#10b981';
    }
  }
}
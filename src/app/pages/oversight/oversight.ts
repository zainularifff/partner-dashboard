import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-oversight',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './oversight.html',
  styleUrl: './oversight.scss'
})
export class OversightComponent implements OnInit {
  
  // --- EXECUTIVE SCORECARDS DATA ---
  totalAssets = 13989;
  activeProjects = 12;
  systemHealth = 95;
  slaCompliance = 98;
  criticalIssues = 2;

  // --- AI OPERATIONAL INSIGHT ---
  aiSummary = "Operasi hari ini stabil dengan 95% aset berada dalam keadaan sihat. Tindakan Diperlukan: Sektor EDU memerlukan perhatian segera kerana terdapat 2 isu kritikal dan SLA pembaikan telah melepasi 24 jam.";

  // --- SECTOR HEALTH (TRAFFIC LIGHT SYSTEM) ---
  sectorHealth = [
    { name: 'GOV (Government)', status: 'Healthy', color: 'green', icon: 'check_circle', desc: 'SLA > 98% | No aging risk' },
    { name: 'GLC (Gov Linked)', status: 'Attention', color: 'orange', icon: 'warning', desc: '5 units reaching critical aging' },
    { name: 'EDU (Education)', status: 'Critical', color: 'red', icon: 'error', desc: '2 Critical tickets overdue' },
    { name: 'FSI (Financial)', status: 'Healthy', color: 'green', icon: 'check_circle', desc: 'All systems operational' }
  ];

  constructor() {}

  ngOnInit(): void {}
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-oversight',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './oversight.html',
  styleUrl: './oversight.scss'
})
export class OversightComponent implements OnInit {
  
  // --- [HELPDESK + ENDPOINT DATA] ---
  totalAssets = 13989; // Dari Endpoint
  systemHealth = 95;   // Dari Endpoint (Active vs Offline/Faulty)
  slaCompliance = 98;  // Dari Helpdesk (Tiket diselesaikan dalam masa)
  companyMttr = "1.8 Hari"; // Dari Helpdesk
  criticalIssues = 2;  // Dari Helpdesk (Tiket P1/P2)

  // --- [CRM DATA] ---
  activeProjects = 12;
  totalCapexExposure = "RM 2.45M"; // Pengiraan: (Aset Aging dari Endpoint) x (Nilai Kontrak dari CRM)

  // ✅ --- AI SUMMARY (ANIMATION STATE) ---
  isLoadingAi = true; // Bermula dengan keadaan loading (Skeleton animation)
  aiSummary = "";     // Dikosongkan sementara menunggu AI berfikir

  // --- [CRM + HELPDESK]: SECTOR HEALTH ---
  sectorHealth = [
    { name: 'GOV (Government)', status: 'Healthy', color: 'green', icon: 'check_circle', desc: 'SLA > 98% | No aging risk' },
    { name: 'GLC (Gov Linked)', status: 'Attention', color: 'orange', icon: 'warning', desc: '5 units reaching critical aging' },
    { name: 'EDU (Education)', status: 'Critical', color: 'red', icon: 'error', desc: '2 Critical tickets overdue' },
    { name: 'FSI (Financial)', status: 'Healthy', color: 'green', icon: 'check_circle', desc: 'All systems operational' }
  ];

  // --- [CRM + HELPDESK]: STRATEGIC PARTNER PERFORMANCE ---
  topPartners = [
    { name: 'FGV Global', value: 'RM 1.2M', sla: 99.2, risk: 'Low', color: 'green' },
    { name: 'Edaran Solutions', value: 'RM 850K', sla: 94.5, risk: 'Medium', color: 'orange' },
    { name: 'Ventrade Corp', value: 'RM 400K', sla: 88.0, risk: 'High', color: 'red' }
  ];

  // --- [ENDPOINT DATA]: ENDPOINT LIFECYCLE ---
  endpointStats = [
    { label: 'Active & Secured', value: '11,250', desc: 'Healthy Endpoints', icon: 'verified_user', color: 'green' },
    { label: 'Pending Updates', value: '890', desc: 'OS / Patch Required', icon: 'system_update', color: 'blue' },
    { label: 'End of Life (EOL)', value: '430', desc: 'Needs Replacement', icon: 'event_busy', color: 'orange' },
    { label: 'Offline / Missing', value: '12', desc: 'Not seen > 30 days', icon: 'wifi_off', color: 'red' }
  ];

  // --- [CRM + ENDPOINT]: MULTI-CLIENT OPERATION ---
  multiClientOps = [
    { client: 'KPM (Ministry of Education)', nodes: '4,500', sla: 98.2, status: 'Optimal', color: 'green' },
    { client: 'KKM (Ministry of Health)', nodes: '3,200', sla: 94.5, status: 'Warning', color: 'orange' },
    { client: 'JKR (Public Works)', nodes: '1,100', sla: 99.1, status: 'Optimal', color: 'green' }
  ];

  // --- [CRM DATA]: CLIENT PROJECTS ---
  clientProjects = [
    { name: 'Phase 1: Laptop Refresh', client: 'KPM', progress: 85, budget: 'RM 1.5M', status: 'On Track', color: 'green' },
    { name: 'Datacenter Migration', client: 'KKM', progress: 40, budget: 'RM 3.2M', status: 'Delayed', color: 'orange' },
    { name: 'Network Infrastructure', client: 'JKR', progress: 15, budget: 'RM 800K', status: 'Started', color: 'blue' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // ✅ Simulasi AI sedang menganalisis data selama 3 saat
    setTimeout(() => {
      this.aiSummary = "Data Endpoint menunjukkan 95% aset sihat. Walau bagaimanapun, analisis CRM & Helpdesk mendapati Sektor EDU memerlukan perhatian kerana 2 tiket kritikal melepasi SLA. Anggaran CapEx untuk 800 PC yang menghampiri 'End-of-Life' adalah RM2.45M.";
      this.isLoadingAi = false; // Matikan animasi loading selepas 3 saat dan paparkan teks
    }, 3000); 
  }
}
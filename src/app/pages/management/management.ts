import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './management.html',
  styleUrls: ['./management.scss'],
})
export class ManagementComponent implements OnInit, OnDestroy {
  // Loading states
  isLoading: boolean = true;
  isLoadingAi: boolean = true;
  
  // Timestamp
  liveTimestamp: string = '';
  private timer: any;

  // API Base URL
  private apiUrl = 'http://localhost:3000/api';

  // === KPI CARDS ===
  totalActiveProjects: number = 0;
  projectTrend: string = '0%';
  
  managedClientEntities: number = 0;
  clientLabel: string = 'Client';
  
  technicalEscalations: number = 0;
  escalationRate: string = '0%';
  
  utilizationRate: string = '0%';
  deployedUnits: number = 0;
  
  totalCapexExposure: string = 'RM 0M';

  // === STRATEGIC CARDS ===
  criticalAssetValue: string = 'RM 0M';
  criticalAssetEntities: number = 0;
  criticalAssetUnits: number = 0;
  criticalAssetStatus: string = '-';
  
  replacementCost: string = 'RM 0M';
  replacementTrend: string = '0% vs last month';

  // === INSIGHT CARDS ===
  osRiskLevel: string = '-';
  osRiskExposure: string = 'RM 0k';
  osRiskWin7: number = 0;
  osRiskWin7Percent: number = 0;
  osRiskWin10: number = 0;
  osRiskWin10Percent: number = 0;
  osRiskTrend: string = '0% from last month';
  
  slaCompliance: string = '0%';
  avgResponseTime: string = '0m';
  resolvedL1: number = 0;
  serviceTrend: string = '0% vs last month';

  // AI Briefing
  aiSummary: string = '';
  keyAction: string = '';

  constructor(
    private cdr: ChangeDetectorRef, 
    private router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.startLiveTimestamp();
    await this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  startLiveTimestamp() {
    this.updateTimestamp();
    this.timer = setInterval(() => this.updateTimestamp(), 1000);
  }

  updateTimestamp() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    this.liveTimestamp = `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
    this.cdr.detectChanges();
  }

  async loadDashboardData() {
    try {
      this.isLoading = true;
      
      // Panggil endpoints yang ADA dalam server.js
      const [
        dashboard,
        clients,
        utilization,
        capex,
        criticalAsset,
        replacement,
        osRisk,
        servicePerf,
        incidents
      ] = await Promise.all([
        this.fetchData('/dashboard'),
        this.fetchData('/clients'),
        this.fetchData('/utilization'),
        this.fetchData('/capex'),
        this.fetchData('/critical-asset-value'),
        this.fetchData('/replacement-cost'),
        this.fetchData('/os-risk'),
        this.fetchData('/service-performance'),
        this.fetchData('/incidents/stats')
      ]);

      console.log('=== API RESPONSES ===');
      console.log('OS Risk Response:', osRisk);
      console.log('Service Perf Response:', servicePerf);
      console.log('====================');

      // === KPI CARDS ===
      
      // Total Active Projects & Technical Escalations - dari dashboard
      if (dashboard?.success && dashboard.data) {
        this.totalActiveProjects = dashboard.data.total_clients || 0;
        this.technicalEscalations = dashboard.data.open_incidents || 0;
      }

      // Managed Client Entities - dari clients
      if (clients && Array.isArray(clients)) {
        this.managedClientEntities = clients.length || 0;
      }

      // Asset Utilization - dari utilization
      if (utilization?.overall) {
        this.utilizationRate = utilization.overall.rate || '0%';
        this.deployedUnits = utilization.overall.total || 0;
      }

      // CAPEX Exposure - dari capex
      if (capex?.summary) {
        this.totalCapexExposure = capex.summary.totalValue || 'RM 0M';
      }

      // === STRATEGIC CARDS ===
      
      // Critical Asset Value
      if (criticalAsset?.success && criticalAsset.data) {
        this.criticalAssetValue = criticalAsset.data.critical_value || 'RM 0M';
        
        // Parse entities dan units dari details string
        const details = criticalAsset.data.details || '0 entities • 0 units';
        const matches = details.match(/(\d+).*?(\d+)/);
        if (matches) {
          this.criticalAssetEntities = parseInt(matches[1]) || 0;
          this.criticalAssetUnits = parseInt(matches[2]) || 0;
        }
        
        this.criticalAssetStatus = criticalAsset.data.status || '-';
      }

      // Replacement Cost
      if (replacement?.success && replacement.data) {
        this.replacementCost = replacement.data.replacement_cost || 'RM 0M';
        
        // Kira trend berdasarkan jumlah units
        const totalUnits = (replacement.data.desktop_count || 0) + 
                          (replacement.data.laptop_count || 0) + 
                          (replacement.data.server_count || 0);
        this.replacementTrend = totalUnits > 0 ? '+12.5% vs last month' : '0% vs last month';
      }

      // === INSIGHT CARDS ===
      
      // OS Risk Analysis - berdasarkan response dari server.js
      if (osRisk && osRisk.breakdown && osRisk.summary) {
        console.log('Mapping OS Risk Data...');
        
        // Summary
        this.osRiskExposure = osRisk.summary.riskExposure || 'RM 0k';
        this.osRiskLevel = osRisk.summary.riskLevel || 'LOW';
        this.osRiskTrend = osRisk.summary.totalOutdated > 0 ? '+8% from last month' : '0% from last month';
        
        // Breakdown - cari Windows 10 dan Other
        const breakdown = osRisk.breakdown || [];
        
        // Windows 10 data
        const win10Data = breakdown.find((item: any) => item.os_name === 'Windows 10');
        
        // Untuk Win 7/XP/8 - dalam API kau takde, jadi 0
        this.osRiskWin7 = 0;
        this.osRiskWin7Percent = 0;
        
        // Win 10 (Out) - guna end_of_life
        this.osRiskWin10 = win10Data?.end_of_life || 0;
        
        // Kira percentage
        const totalAssets = this.deployedUnits || 805;
        this.osRiskWin10Percent = this.osRiskWin10 > 0 
          ? Math.round((this.osRiskWin10 / totalAssets) * 100) 
          : 0;
        
        console.log('OS Risk Mapped:', {
          exposure: this.osRiskExposure,
          level: this.osRiskLevel,
          win10: this.osRiskWin10,
          win10Percent: this.osRiskWin10Percent
        });
      }

      // Service Performance
      if (servicePerf?.success && servicePerf.data) {
        console.log('Service Perf Data:', servicePerf.data);
        this.slaCompliance = servicePerf.data.slaCompliance || '0%';
        this.avgResponseTime = servicePerf.data.avgResponse || '0m';
        this.resolvedL1 = servicePerf.data.resolvedL1 || 0;
        this.serviceTrend = servicePerf.data.trend || '0% vs last month';
      }

      // Technical Risk Escalations - dari incidents stats
      if (incidents) {
        this.technicalEscalations = incidents.totalIncidents || 0;
        this.escalationRate = this.technicalEscalations > 0 ? '+2.2% Rate' : '0% Rate';
      }

      // Project Trend
      this.projectTrend = this.totalActiveProjects > 0 ? '+12.5%' : '0%';

      // Generate AI Briefing
      this.generateAiBriefing();

      this.isLoading = false;
      this.isLoadingAi = false;
      this.cdr.detectChanges();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.isLoading = false;
      this.isLoadingAi = false;
      this.cdr.detectChanges();
    }
  }

  private async fetchData(endpoint: string): Promise<any> {
    try {
      console.log(`Fetching: ${this.apiUrl}${endpoint}`);
      const response = await lastValueFrom(this.http.get(`${this.apiUrl}${endpoint}`));
      console.log(`Response from ${endpoint}:`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  private generateAiBriefing() {
    if (this.deployedUnits > 0) {
      this.aiSummary = `Executive Summary: Current operational metrics show ${this.totalActiveProjects} active projects with ${this.managedClientEntities} clients. Asset utilization at ${this.utilizationRate} with ${this.deployedUnits} deployed units. ${this.osRiskLevel} OS risk identified with ${this.osRiskExposure} potential impact.`;
      
      this.keyAction = `Monitor ${this.osRiskWin10} at-risk Windows 10 units and address ${this.criticalAssetUnits} critical assets valued at ${this.criticalAssetValue}.`;
    } else {
      this.aiSummary = 'Loading strategic insights...';
      this.keyAction = 'Please ensure API connection is established.';
    }
  }

  onCardClick(type: string) {
    const routes: any = {
      'Project Portfolio': '/project',
      'Client Entities': '/client',
      'Risk Escalation': '/risk-escalation',
      'Asset Inventory': '/asset-utilization',
      'Capex': '/capex',
      'Revenue Risk': '/revenue-risk',
      'Monthly Revenue': '/revenue',
      'OS Risk': '/os-risk',
      'Service': '/service'
    };
    
    if (routes[type]) {
      this.router.navigate([routes[type]]);
    }
  }

  refreshBriefing() {
    this.isLoadingAi = true;
    setTimeout(() => {
      this.generateAiBriefing();
      this.isLoadingAi = false;
      this.cdr.detectChanges();
    }, 800);
  }
}
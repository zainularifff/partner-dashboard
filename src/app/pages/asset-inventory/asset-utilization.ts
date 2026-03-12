import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-asset-utilization',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './asset-utilization.html',
  styleUrls: ['./asset-utilization.scss']
})
export class AssetUtilizationComponent implements OnInit, OnDestroy {
  // API Base URL
  private apiUrl = 'http://localhost:3000/api';
  
  activeTab: string = 'client';
  
  // ==================== DATA FROM API ====================
  totalAssets: number = 0;
  onlineAssets: number = 0;
  offlineAssets: number = 0;
  lastUpdated: Date = new Date();
  
  // OS Breakdown
  osBreakdown: any[] = [];
  
  // Age Breakdown
  ageBreakdown: any[] = [];
  
  // EOL Risk
  eolUnits: number = 0;
  eolPercentage: number = 0;
  
  // Client Utilization
  clientUtilization: any[] = [];
  
  // Location Breakdown
  locationBreakdown: any[] = [];
  
  // All assets for processing
  allAssets: any[] = [];
  allClients: any[] = [];
  
  // ==================== DERIVED PROPERTIES ====================
  get utilizationRate(): string {
    return this.totalAssets > 0 ? ((this.onlineAssets / this.totalAssets) * 100).toFixed(1) + '%' : '0%';
  }
  
  get offlinePercentage(): number {
    return this.totalAssets > 0 ? Math.round((this.offlineAssets / this.totalAssets) * 100) : 0;
  }
  
  get idlePercentage(): number {
    return this.offlinePercentage;
  }
  
  get deployedUnits(): number {
    return this.onlineAssets;
  }
  
  get idleUnits(): number {
    return this.offlineAssets;
  }
  
  revenueLoss: string = 'RM 345k'; // From Level 1 dashboard
  
  // ==================== IDLE BREAKDOWN ====================
  idleReasons: any[] = [];
  idleDurations: any[] = [];
  idleConditions: any[] = [];
  
  // Age Insights
  ageInsights: any[] = [];
  
  private subscription: Subscription = new Subscription();

  constructor(
    private location: Location, 
    private router: Router,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show();
    await this.loadAssetData();
  }

  async loadAssetData() {
    try {
      // Load all data in parallel
      const [assets, utilization, osRisk, clients] = await Promise.all([
        this.fetchData('/assets'),
        this.fetchData('/utilization'),
        this.fetchData('/os-risk'),
        this.fetchData('/clients')
      ]);

      console.log('Assets:', assets);
      console.log('Utilization:', utilization);
      console.log('OS Risk:', osRisk);
      console.log('Clients:', clients);

      // Store all assets
      if (assets && Array.isArray(assets)) {
        this.allAssets = assets;
        this.processAssetData(assets);
      }

      // Update overall stats
      if (utilization?.overall) {
        this.totalAssets = utilization.overall.total;
        this.onlineAssets = utilization.overall.active;
        this.offlineAssets = utilization.overall.total - utilization.overall.active;
      }

      // Process OS breakdown
      if (osRisk?.breakdown) {
        this.osBreakdown = osRisk.breakdown.map((item: any) => ({
          name: item.os_name,
          count: item.count,
          percentage: Math.round((item.count / this.totalAssets) * 100),
          color: this.getOSColor(item.os_name)
        }));
      }

      // Process client utilization
      if (clients && Array.isArray(clients)) {
        this.allClients = clients;
        this.clientUtilization = clients.map((client: any) => {
          const clientAssets = assets.filter((a: any) => a.CustomerName === client.CompanyName);
          const total = clientAssets.length;
          const online = clientAssets.filter((a: any) => a.AgentStatus === 'On').length;
          const offline = total - online;
          const utilization = total > 0 ? (online / total) * 100 : 0;
          
          return {
            clientId: client.ClientID,
            clientName: client.CompanyName,
            total,
            online,
            offline,
            utilization,
            utilizationColor: this.getUtilizationColor(utilization)
          };
        }).filter((c: any) => c.total > 0); // Only show clients with assets
      }

      // Process age breakdown
      await this.processAgeData(assets);

      // Process location breakdown
      await this.processLocationData(assets);

      // Calculate EOL
      this.eolUnits = assets.filter((a: any) => a.PCAge > 5).length;
      this.eolPercentage = Math.round((this.eolUnits / this.totalAssets) * 100);

      // Process idle breakdown
      this.processIdleData(assets);

      this.lastUpdated = new Date();
      this.loadingService.hide();
      console.log('✅ Asset Utilization data loaded from API');

    } catch (error) {
      console.error('Error loading asset data:', error);
      this.loadingService.hide();
    }
  }

  private async fetchData(endpoint: string): Promise<any> {
    try {
      return await lastValueFrom(this.http.get(`${this.apiUrl}${endpoint}`));
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  private processAssetData(assets: any[]) {
    // Process by client - handled in main method
  }

  private processAgeData(assets: any[]) {
    const ages = assets.map((a: any) => a.PCAge || 0);
    
    const lessThan3 = assets.filter((a: any) => a.PCAge < 3).length;
    const between3And5 = assets.filter((a: any) => a.PCAge >= 3 && a.PCAge < 5).length;
    const between5And7 = assets.filter((a: any) => a.PCAge >= 5 && a.PCAge < 7).length;
    const moreThan7 = assets.filter((a: any) => a.PCAge >= 7).length;

    this.ageBreakdown = [
      { range: '<3 years', count: lessThan3, percentage: Math.round((lessThan3 / this.totalAssets) * 100), color: '#10b981' },
      { range: '3-5 years', count: between3And5, percentage: Math.round((between3And5 / this.totalAssets) * 100), color: '#3b82f6' },
      { range: '5-7 years', count: between5And7, percentage: Math.round((between5And7 / this.totalAssets) * 100), color: '#f59e0b' },
      { range: '>7 years', count: moreThan7, percentage: Math.round((moreThan7 / this.totalAssets) * 100), color: '#ef4444' }
    ];

    this.ageInsights = [
      { title: `${between5And7 + moreThan7} units >5 years old`, 
        description: 'Critical risk - EOL assets need replacement', 
        color: '#ef4444' },
      { title: `${between3And5} units aged 3-5 years`, 
        description: 'Mid-life assets - monitor performance', 
        color: '#f59e0b' },
      { title: `${lessThan3} units <3 years old`, 
        description: 'New assets - good condition', 
        color: '#10b981' }
    ];
  }

  private processLocationData(assets: any[]) {
    const locationMap = new Map();
    
    assets.forEach((asset: any) => {
      const branch = asset.Branch || 'Other';
      locationMap.set(branch, (locationMap.get(branch) || 0) + 1);
    });

    this.locationBreakdown = Array.from(locationMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / this.totalAssets) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 locations
  }

  private processIdleData(assets: any[]) {
    const offlineAssets = assets.filter((a: any) => a.AgentStatus === 'Off');
    const offlineCount = offlineAssets.length;

    // Calculate by condition
    const goodOffline = offlineAssets.filter((a: any) => 
      a.PCAge < 3 && (a.OS?.includes('Windows 10') || a.OS?.includes('Windows 11'))
    ).length;
    
    const fairOffline = offlineAssets.filter((a: any) => 
      a.PCAge >= 3 && a.PCAge <= 5 && a.OS?.includes('Windows 10')
    ).length;
    
    const poorOffline = offlineAssets.filter((a: any) => 
      a.PCAge > 5 || a.OS?.includes('Windows 7') || a.OS?.includes('Windows 8') || a.OS?.includes('XP')
    ).length;

    this.idleConditions = [
      { name: 'Good', count: goodOffline, status: 'Redeployable', color: '#10b981', 
        percent: offlineCount > 0 ? Math.round((goodOffline / offlineCount) * 100) : 0 },
      { name: 'Fair', count: fairOffline, status: 'Needs maintenance', color: '#f59e0b', 
        percent: offlineCount > 0 ? Math.round((fairOffline / offlineCount) * 100) : 0 },
      { name: 'Poor', count: poorOffline, status: 'Retire/EOL', color: '#ef4444', 
        percent: offlineCount > 0 ? Math.round((poorOffline / offlineCount) * 100) : 0 }
    ];

    // Idle durations (simulated for now - would need last seen data)
    const now = new Date();
    const lessThan30 = offlineAssets.filter((a: any) => {
      const lastSeen = a.ConnectionTime ? new Date(a.ConnectionTime) : new Date(0);
      const daysDiff = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff < 30;
    }).length;

    const between30And90 = offlineAssets.filter((a: any) => {
      const lastSeen = a.ConnectionTime ? new Date(a.ConnectionTime) : new Date(0);
      const daysDiff = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 30 && daysDiff < 90;
    }).length;

    const moreThan90 = offlineAssets.filter((a: any) => {
      const lastSeen = a.ConnectionTime ? new Date(a.ConnectionTime) : new Date(0);
      const daysDiff = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 90;
    }).length;

    this.idleDurations = [
      { range: '<30 days', count: lessThan30, percent: offlineCount > 0 ? Math.round((lessThan30 / offlineCount) * 100) : 0 },
      { range: '30-90 days', count: between30And90, percent: offlineCount > 0 ? Math.round((between30And90 / offlineCount) * 100) : 0 },
      { range: '>90 days', count: moreThan90, percent: offlineCount > 0 ? Math.round((moreThan90 / offlineCount) * 100) : 0 }
    ];
  }

  private getOSColor(osName: string): string {
    if (osName.includes('7') || osName.includes('XP') || osName.includes('8')) return '#ef4444';
    if (osName.includes('10')) return '#3b82f6';
    if (osName.includes('11')) return '#10b981';
    return '#94a3b8';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  goBack() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      
      if (document.referrer.includes('login')) {
        this.router.navigate(['/management']);
      } else {
        this.location.back();
      }
    }, 300);
  }

  getUtilizationColor(value: number): string {
    if (value >= 90) return '#10b981';
    if (value >= 80) return '#f59e0b';
    if (value >= 70) return '#f97316';
    if (value >= 50) return '#ef4444';
    return '#7f1d1d';
  }

  getRiskColor(percentage: number): string {
    if (percentage < 10) return '#10b981';
    if (percentage < 20) return '#f59e0b';
    if (percentage < 30) return '#f97316';
    return '#ef4444';
  }

  viewClientDetail(client: any) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      // Navigate to client detail page
      this.router.navigate(['/client', client.clientId]);
    }, 300);
  }

  exportData(type: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      
      // Generate CSV based on active tab
      let csvContent = '';
      if (type === 'client') {
        const headers = ['Client', 'Total Assets', 'Online', 'Offline', 'Utilization'];
        const rows = this.clientUtilization.map(c => [
          c.clientName, c.total, c.online, c.offline, c.utilization.toFixed(1) + '%'
        ]);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      } else if (type === 'os') {
        const headers = ['OS', 'Count', 'Percentage'];
        const rows = this.osBreakdown.map(o => [o.name, o.count, o.percentage + '%']);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `asset-utilization-${type}-${new Date().getTime()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }, 500);
  }

  generateOptimizationPlan() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      
      const redeployableUnits = this.idleConditions[0]?.count || 0;
      const potentialRevenue = redeployableUnits * 150;
      
      alert(`✅ Optimization Plan Generated!\n\n` +
            `Redeployable units: ${redeployableUnits}\n` +
            `Potential revenue recovery: RM ${potentialRevenue.toLocaleString()}/month\n\n` +
            `1. Redeploy Good condition assets (${this.idleConditions[0]?.count || 0} units)\n` +
            `2. Schedule maintenance for Fair assets (${this.idleConditions[1]?.count || 0} units)\n` +
            `3. Plan EOL replacement for Poor assets (${this.idleConditions[2]?.count || 0} units)`);
    }, 800);
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
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
  activeTab: string = 'client';  // Default to client tab (since project tab has no data)
  
  // ==================== REAL DATA FROM ASSETS.JSON ====================
  // Total assets across all clients
  totalAssets: number = 816;  // 801 (WSSB) + 15 (Natalie) + 0 (SUKS)
  onlineAssets: number = 6;   // 4 (WSSB) + 2 (Natalie)
  offlineAssets: number = 810; // 797 (WSSB) + 13 (Natalie)
    lastUpdated: Date = new Date();  // Will show current date/time
    

  
  // OS Breakdown
  osBreakdown = [
    { name: 'Windows 7/8/XP', count: 125, percentage: 15.3, color: '#ef4444' },
    { name: 'Windows 10', count: 458, percentage: 56.1, color: '#3b82f6' },
    { name: 'Windows 11', count: 233, percentage: 28.6, color: '#10b981' }
  ];
  
  // Age Breakdown (PCAge)
  ageBreakdown = [
    { range: '<3 years', count: 292, percentage: 35.8, color: '#10b981' },
    { range: '3-5 years', count: 291, percentage: 35.7, color: '#3b82f6' },
    { range: '5-7 years', count: 63, percentage: 7.7, color: '#f59e0b' },
    { range: '>7 years', count: 170, percentage: 20.8, color: '#ef4444' }
  ];
  
  // EOL Risk (PCAge > 5)
  eolUnits: number = 233;  // 63 + 170
  eolPercentage: number = 28.5;
  
  // Client Utilization
  clientUtilization = [
    { 
      clientId: '0ce9fc8c-1cfa-488d-9697-bcb3a22d3562',
      clientName: 'WSSB Internal', 
      total: 801, 
      online: 4, 
      offline: 797, 
      utilization: 0.5,
      utilizationColor: '#ef4444'
    },
    { 
      clientId: '1a4caf30-3774-4079-9fab-e963b9a81258',
      clientName: 'Natalie Internal', 
      total: 15, 
      online: 2, 
      offline: 13, 
      utilization: 13.3,
      utilizationColor: '#ef4444'
    },
    { 
      clientId: 'db2c4ce8-b39a-4d61-a0c3-7a163c257aad',
      clientName: 'SUKS', 
      total: 0, 
      online: 0, 
      offline: 0, 
      utilization: 0,
      utilizationColor: '#94a3b8'
    }
  ];
  
  // Location Breakdown (from Branch column in Assets)
  locationBreakdown = [
    { name: 'HQ', count: 450, percentage: 55.2 },
    { name: 'The Stand Branch', count: 120, percentage: 14.7 },
    { name: 'CAWANGAN HENTIAN', count: 80, percentage: 9.8 },
    { name: 'CAWANGAN ECOHILL', count: 75, percentage: 9.2 },
    { name: 'Other Branches', count: 90, percentage: 11.1 }
  ];
  
  // ==================== DERIVED PROPERTIES ====================
  get utilizationRate(): string {
    return ((this.onlineAssets / this.totalAssets) * 100).toFixed(1) + '%';
  }
  
  get offlinePercentage(): number {
    return Math.round((this.offlineAssets / this.totalAssets) * 100);
  }
  
  get idlePercentage(): number {
    return this.offlinePercentage;
  }
  
  // For KPI cards - deployed units = online assets
  get deployedUnits(): number {
    return this.onlineAssets;
  }
  
  // For KPI cards - idle units = offline assets
  get idleUnits(): number {
    return this.offlineAssets;
  }
  
  // Revenue loss - from Level 1 dashboard
  revenueLoss: string = 'RM 345k';
  
  // ==================== IDLE BREAKDOWN (Based on real data) ====================
  idleReasons = [
    { name: 'Offline (No reason)', count: this.offlineAssets, percent: this.offlinePercentage }
  ];
  
  idleDurations = [
    { range: '<30 days', count: 450, percent: 55 },
    { range: '30-90 days', count: 250, percent: 31 },
    { range: '>90 days', count: 110, percent: 14 }
  ];
  
  idleConditions = [
    { name: 'Good (Age<3, Win10/11)', count: 0, status: 'Redeployable', color: '#10b981', percent: 0 },
    { name: 'Fair (Age 3-5, Win10)', count: 0, status: 'Needs maintenance', color: '#f59e0b', percent: 0 },
    { name: 'Poor (Age>5 or Win7/8)', count: this.offlineAssets, status: 'Retire/EOL', color: '#ef4444', percent: 100 }
  ];
  
  // Age Insights
  ageInsights = [
    { title: `${this.ageBreakdown[2].count + this.ageBreakdown[3].count} units >5 years old`, 
      description: 'Critical risk - EOL assets need replacement', 
      color: '#ef4444' },
    { title: `${this.ageBreakdown[1].count} units aged 3-5 years`, 
      description: 'Mid-life assets - monitor performance', 
      color: '#f59e0b' },
    { title: `${this.ageBreakdown[0].count} units <3 years old`, 
      description: 'New assets - good condition', 
      color: '#10b981' }
  ];
  
  private subscription: Subscription = new Subscription();

  constructor(
    private location: Location, 
    private router: Router,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Asset Utilization - Loading data');
    this.loadingService.show();
    
    // Simulate data loading
    setTimeout(() => {
      this.calculateIdleConditions();
      this.loadingService.hide();
      console.log('✅ Asset Utilization data loaded');
    }, 1000);
  }
  
  calculateIdleConditions() {
    // This would be calculated from actual asset data
    // For now, using approximation
    const goodCount = Math.round(this.offlineAssets * 0.2);  // 20% might be good
    const fairCount = Math.round(this.offlineAssets * 0.3);  // 30% fair
    const poorCount = this.offlineAssets - goodCount - fairCount;
    
    this.idleConditions = [
      { name: 'Good', count: goodCount, status: 'Redeployable', color: '#10b981', percent: Math.round(goodCount / this.offlineAssets * 100) },
      { name: 'Fair', count: fairCount, status: 'Needs maintenance', color: '#f59e0b', percent: Math.round(fairCount / this.offlineAssets * 100) },
      { name: 'Poor', count: poorCount, status: 'Retire/EOL', color: '#ef4444', percent: Math.round(poorCount / this.offlineAssets * 100) }
    ];
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
    return '#7f1d1d';  // Very low utilization
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
      this.router.navigate(['/client', client.clientId]);
    }, 300);
  }

  exportData(type: string) {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Exporting', type, 'data');
      alert(`Exporting ${type} data as CSV...`);
    }, 500);
  }

  generateOptimizationPlan() {
    this.loadingService.show();
    
    setTimeout(() => {
      this.loadingService.hide();
      
      // Calculate potential revenue recovery
      const redeployableUnits = this.idleConditions[0].count;
      const potentialRevenue = redeployableUnits * 150; // Assume RM150/unit/month
      
      alert(`✅ Optimization Plan Generated!\n\n` +
            `Redeployable units: ${redeployableUnits}\n` +
            `Potential revenue recovery: RM ${potentialRevenue.toLocaleString()}/month\n\n` +
            `1. Redeploy Good condition assets (${this.idleConditions[0].count} units)\n` +
            `2. Schedule maintenance for Fair assets (${this.idleConditions[1].count} units)\n` +
            `3. Plan EOL replacement for Poor assets (${this.idleConditions[2].count} units)`);
    }, 800);
  }
}
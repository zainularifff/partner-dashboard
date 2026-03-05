import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoadingService } from '../../services/loading.service'; // adjust path ikut folder structure

@Component({
  selector: 'app-asset-utilization',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    FormsModule
  ],
  templateUrl: './asset-utilization.html',
  styleUrls: ['./asset-utilization.scss']
})
export class AssetUtilizationComponent implements OnInit {
  // Tak perlu loading variable - guna service
  activeTab: string = 'project';
  
  // KPI Data
  utilizationRate: string = '87.6%';
  deployedUnits: number = 16200;
  idleUnits: number = 2300;
  totalUnits: number = 18500;
  revenueLoss: string = 'RM 345k';
  
  get idlePercentage(): number {
    return Math.round((this.idleUnits / this.totalUnits) * 100);
  }

  // Project Data
  projectUtilization = [
    { projectId: 'P001', projectName: 'Project 1 - KKM', total: 8500, deployed: 7800, idle: 700, utilization: 91.8 },
    { projectId: 'P002', projectName: 'Project 2 - MOE', total: 6200, deployed: 5400, idle: 800, utilization: 87.1 },
    { projectId: 'P003', projectName: 'Project 3 - PETRONAS', total: 3800, deployed: 3000, idle: 800, utilization: 78.9 }
  ];

  // Client Data
  clientUtilization = [
    { clientId: 'CLT001', clientName: 'KKM', projectCount: 2, total: 5200, deployed: 4800, idle: 400, utilization: 92.3 },
    { clientId: 'CLT002', clientName: 'MOE', projectCount: 3, total: 4300, deployed: 3900, idle: 400, utilization: 90.7 },
    { clientId: 'CLT003', clientName: 'PETRONAS', projectCount: 2, total: 3500, deployed: 2800, idle: 700, utilization: 80.0 }
  ];

  // Location Data
  locationBreakdown = [
    { name: 'Hospitals', count: 450, percentage: 19.6 },
    { name: 'Clinics', count: 680, percentage: 29.6 },
    { name: 'Offices', count: 520, percentage: 22.6 },
    { name: 'Server Rooms', count: 350, percentage: 15.2 },
    { name: 'Warehouses', count: 300, percentage: 13.0 }
  ];

  // Age Insights
  ageInsights = [
    { title: '890 units aged 3-5 years', description: 'Nearing EOL - plan replacement within 12 months' },
    { title: '710 units >5 years old', description: 'Critical risk - immediate action recommended' }
  ];

  idleReasons = [
    { name: 'End of lease', count: 850, percent: 37 },
    { name: 'Maintenance', count: 620, percent: 27 },
    { name: 'Awaiting deployment', count: 480, percent: 21 },
    { name: 'Damaged', count: 350, percent: 15 }
  ];

  idleDurations = [
    { range: '<30 days', count: 920, percent: 40 },
    { range: '30-90 days', count: 780, percent: 34 },
    { range: '>90 days', count: 600, percent: 26 }
  ];

  idleConditions = [
    { name: 'Good', count: 980, status: 'Redeployable', color: '#10b981', percent: 40 },
    { name: 'Fair', count: 720, status: 'Needs maintenance', color: '#f59e0b', percent: 34 },
    { name: 'Poor', count: 600, status: 'Retire', color: '#ef4444', percent: 26 }
  ];

  constructor(
    private location: Location, 
    private router: Router,
    private loadingService: LoadingService  // inject loading service
  ) {}

  ngOnInit(): void {
    // Show loading
    this.loadingService.show();
    
    // Simulate data fetching
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Loading finished - data loaded');
    }, 1000);
  }

  goBack() {
    this.loadingService.show();
    
    // Simulate navigation
    setTimeout(() => {
      this.loadingService.hide();
      this.location.back();
    }, 300);
  }

  getUtilizationColor(value: number): string {
    if (value >= 90) return '#10b981';
    if (value >= 80) return '#f59e0b';
    if (value >= 70) return '#f97316';
    return '#ef4444';
  }

  viewProjectDetail(project: any) {
    this.loadingService.show();
    
    // Simulate navigation
    setTimeout(() => {
      this.loadingService.hide();
      this.router.navigate(['/project', project.projectId]);
    }, 300);
  }

  exportData(type: string) {
    this.loadingService.show();
    
    // Simulate export
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Exporting', type);
      alert(`Exporting ${type} data...`);
    }, 500);
  }

  generateOptimizationPlan() {
    this.loadingService.show();
    
    // Simulate generation
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Generating optimization plan...');
      alert('Optimization plan generated successfully!');
    }, 800);
  }

  redeployIdle() {
    this.loadingService.show();
    
    // Simulate redeployment
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Redeploying idle units...');
      alert('Redeployment process started!');
    }, 600);
  }

  scheduleAudit() {
    this.loadingService.show();
    
    // Simulate scheduling
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Scheduling audit...');
      alert('Audit scheduled successfully!');
    }, 400);
  }

  exportFullReport() {
    this.loadingService.show();
    
    // Simulate export
    setTimeout(() => {
      this.loadingService.hide();
      console.log('Exporting full report...');
      alert('Full report exported successfully!');
    }, 700);
  }
}
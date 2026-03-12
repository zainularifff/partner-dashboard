import { Routes } from '@angular/router';
import { LoginComponent } from './pages/landing-page/login';
import { ManagementComponent } from './pages/management/management'; 
import { ProjectComponent } from './pages/project/project';
import { ClientComponent } from './pages/client/client';
import { RiskComponent } from './pages/risk-escalation/risk';
import { AssetUtilizationComponent } from './pages/asset-inventory/asset-utilization';
import { OsRiskComponent } from './pages/os-risk/os-risk';
import { CapexComponent } from './pages/capex/capex';
import { ReportComponent } from './pages/report/report';
import { ServicePerformanceComponent } from './pages/service-performance/service';  

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'management', component: ManagementComponent },
  { path: 'project', component: ProjectComponent }, 
  { path: 'client', component: ClientComponent }, 
  { path: 'risk-escalation', component: RiskComponent }, 
  { path: 'asset-utilization', component: AssetUtilizationComponent }, 
  { path: 'capex', component: CapexComponent }, 
  { path: 'os-risk', component: OsRiskComponent },
  { path: 'report', component: ReportComponent },
  { path: 'service', component: ServicePerformanceComponent }, 
  { path: '**', redirectTo: 'management' }
];
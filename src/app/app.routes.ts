import { Routes } from '@angular/router';
import { LoginComponent } from './pages/landing-page/login';
import { ManagementComponent } from './pages/management/management'; 
import { ProjectComponent } from './pages/project/project';
import { ClientComponent } from './pages/client/client';
import { RiskComponent } from './pages/risk-escalation/risk';
import { OversightComponent } from './pages/oversight/oversight';
import { AssetUtilizationComponent } from './pages/asset-inventory/asset-utilization';  // <-- PATH INI MESTI BETUL
import { OsRiskComponent } from './pages/os-risk/os-risk';
import { ReportComponent } from './pages/report/report';
import { CapexComponent } from './pages/capex/capex';

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
  { path: 'oversight', component: OversightComponent },
  { path: 'report', component: ReportComponent },
  { path: '**', redirectTo: 'management' }
];
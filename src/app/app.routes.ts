import { Routes } from '@angular/router';
import { LoginComponent } from './pages/landing-page/login';
import { ManagementComponent } from './pages/management/management'; 
import { ProjectComponent } from './pages/project/project';
import { ClientComponent } from './pages/client/client';
import { RiskComponent } from './pages/risk-escalation/risk';
import { OversightComponent } from './pages/oversight/oversight';
import { DashboardComponent } from './pages/tactical-dashboard/dashboard';
import { PartnerComponent } from './pages/partner/partner';
import { BrandBreakdownComponent } from './pages/brand-breakdown/brand-breakdown';
import { IncidentComponent } from './pages/incident-detail/incident-detail';
import { BrandSelectorComponent } from './pages/brand-selector/brand-selector'; 
import { AssetDetailComponent } from './pages/asset-detail/asset-detail'; 



export const routes: Routes = [
  // 1. Landing & Authentication
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // 2. Level 1 - Executive Strategic (First view after login)
  { path: 'management', component: ManagementComponent },

  // 3. Level 2 - Information Breakdown
  { path: 'project', component: ProjectComponent }, 
  { path: 'client', component: ClientComponent }, 
  { path: 'risk-escalation', component: RiskComponent }, 

  // 4. Level 3 - Operational Oversight (Drill-down dari Management)
  { path: 'oversight', component: OversightComponent },

  // 5. Level 4 - Tactical & Technical Details
  // { path: 'dashboard', component: DashboardComponent },
  // { path: 'partner', component: PartnerComponent },
  // { path: 'incident-detail', component: IncidentComponent },
  // { path: 'brand-breakdown/:brandName', component: BrandBreakdownComponent },
  // { path: 'ticket-view/:uuid', component: IncidentComponent }, 
  // { path: 'brand-selector', component: BrandSelectorComponent }, 
  // { path: 'asset-detail', component: AssetDetailComponent },

  // 6. Wildcard (Opsional: Jika user taip URL salah, hantar balik ke Management)
  { path: '**', redirectTo: 'management' }
];
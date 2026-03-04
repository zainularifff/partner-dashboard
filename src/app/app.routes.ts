import { Routes } from '@angular/router';
import { ManagementComponent } from './pages/management/management'; // Import fail baru anda
import { OversightComponent } from './pages/oversight/oversight';
import { DashboardComponent } from './pages/tactical-dashboard/dashboard';
import { PartnerComponent } from './pages/partner/partner';
import { BrandBreakdownComponent } from './pages/brand-breakdown/brand-breakdown';
import { IncidentComponent } from './pages/incident-detail/incident-detail';
import { BrandSelectorComponent } from './pages/brand-selector/brand-selector'; 
import { AssetDetailComponent } from './pages/asset-detail/asset-detail'; 
import { LoginComponent } from './pages/landing-page/login';
import { ProjectComponent } from './pages/project/project';

export const routes: Routes = [
  // 1. Landing & Authentication
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // 2. Level 1 - Executive Strategic (First view after login)
  { path: 'management', component: ManagementComponent },

  // 3. Level 2 - Operational Oversight (Drill-down dari Management)
  { path: 'oversight', component: OversightComponent },
  
  // --- AKU TAMBAH CRM KAT SINI ---
  { path: 'project', component: ProjectComponent }, 

  // 4. Level 3 - Tactical & Technical Details
  { path: 'dashboard', component: DashboardComponent },
  { path: 'partner', component: PartnerComponent },
  { path: 'incident-detail', component: IncidentComponent },
  { path: 'brand-breakdown/:brandName', component: BrandBreakdownComponent },
  { path: 'ticket-view/:uuid', component: IncidentComponent }, 
  { path: 'brand-selector', component: BrandSelectorComponent }, 
  { path: 'asset-detail', component: AssetDetailComponent },

  // Wildcard (Opsional: Jika user taip URL salah, hantar balik ke Management)
  { path: '**', redirectTo: 'management' }
];
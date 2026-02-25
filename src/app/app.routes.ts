import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { OversightComponent } from './pages/oversight/oversight';
import { PartnerComponent } from './pages/partner/partner'; 
import { BrandBreakdownComponent } from './pages/brand-breakdown/brand-breakdown'

// Update this import to match the class name in your .ts file
import { IncidentComponent } from './pages/incident-detail/incident-detail'; 

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'oversight', component: OversightComponent },
  { path: 'partner', component: PartnerComponent },
  { path: 'incident-detail/:type', component: IncidentComponent },
  { path: 'brand-breakdown/:brandName', component: BrandBreakdownComponent },
];

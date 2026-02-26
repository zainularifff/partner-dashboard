// app.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { OversightComponent } from './pages/oversight/oversight';
import { PartnerComponent } from './pages/partner/partner';
import { BrandBreakdownComponent } from './pages/brand-breakdown/brand-breakdown';
import { IncidentComponent } from './pages/incident-detail/incident-detail';
import { BrandSelectorComponent } from './pages/brand-selector/brand-selector'; 

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'oversight', component: OversightComponent },
  { path: 'partner', component: PartnerComponent },
  { path: 'incident-detail', component: IncidentComponent },
  { path: 'brand-breakdown/:brandName', component: BrandBreakdownComponent },
  { path: 'ticket-view/:uuid', component: IncidentComponent }, 
  { path: 'brand-selector', component: BrandSelectorComponent }
];
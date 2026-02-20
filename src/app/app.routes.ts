import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { OversightComponent } from './pages/oversight/oversight';
import { PartnerComponent } from './pages/partner/partner'; 

export const routes: Routes = [
  // Default route
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Sidebar link: routerLink="/dashboard"
  { path: 'dashboard', component: DashboardComponent },

  // Sidebar link: routerLink="/oversight"
  { path: 'oversight', component: OversightComponent },

  // Sidebar link: routerLink="/partner"
  { path: 'partner', component: PartnerComponent } 
];

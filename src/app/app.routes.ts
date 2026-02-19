import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { OversightComponent } from './oversight/oversight';
// 1. Ensure this path points exactly to where your PartnerComponent is defined
// import { PartnerComponent } from './partner/partner'; 

export const routes: Routes = [
  // Default route
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Sidebar link: routerLink="/dashboard"
  { path: 'dashboard', component: DashboardComponent },

  // Sidebar link: routerLink="/oversight"
  { path: 'oversight', component: OversightComponent },

  // Sidebar link: routerLink="/partner"
  // 2. Fixed: Changed component from OversightComponent to PartnerComponent
  // { path: 'partner', component: PartnerComponent } 
];

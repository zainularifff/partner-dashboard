import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentApi } from '../../services/incident.api';
// 1. Import the MatIconModule
import { MatIconModule } from '@angular/material/icon'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Add this
import { MatProgressBarModule } from '@angular/material/progress-bar';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  // 2. Add MatIconModule here so the template recognizes <mat-icon>
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatProgressBarModule ], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {

  incidents: any[] = [];

  openCount = 0;
  pendingCount = 0;
  solvedCount = 0;
  lapsedCount = 0;

  constructor(private api: IncidentApi) {}

  ngOnInit() {
    this.api.list().subscribe((rows: any[]) => {
      // map data dari API → table model
      this.incidents = rows.map(x => ({
        id: x.request_no,
        title: x.title,
        user: x.user_name,
        status: x.status_name,
        created: x.created_time_my,
        statusCode: Number(x.request_status)
      }));

      this.calcKpi();
    });
  }

  calcKpi() {
    // status 2,3,14 = solved / closed / rejected
    this.solvedCount = this.incidents.filter(x =>
      [2,3,14].includes(x.statusCode)
    ).length;

    this.pendingCount = this.incidents.filter(x =>
      [10,11,12,13].includes(x.statusCode)
    ).length;

    this.openCount = this.incidents.filter(x =>
      ![2,3,14].includes(x.statusCode)
    ).length;

    // SLA LAPSED = >7 hari belum closed
    const now = new Date();

    this.lapsedCount = this.incidents.filter(x => {
      if ([2,3,14].includes(x.statusCode)) return false;
      const d = new Date(x.created);
      const diff = (now.getTime() - d.getTime()) / 86400000;
      return diff > 7;
    }).length;
  }

  brandRows = [
    { name:'Apple',  category:'Premium Fleet', total:1240, new:45, young:30, mid:15, mature:7, legacy:3 },
    { name:'Dell',   category:'Workstation',   total:2850, new:20, young:35, mid:25, mature:12, legacy:8 },
    { name:'Lenovo', category:'Enterprise',    total:1920, new:18, young:28, mid:32, mature:14, legacy:8 },
    { name:'HP',     category:'Legacy Infra',  total:3100, new:10, young:20, mid:30, mature:25, legacy:15 }
  ];

  assetTotal = 4821;

  topFault = [
    { name:'Dell Latitude 5420', rate:14 },
    { name:'MacBook Pro M1', rate:8 },
    { name:'HP EliteBook 840', rate:5 },
    { name:'Lenovo T14s', rate:3 },
    { name:'Dell 7490', rate:2 }
  ];

  vendorHealth = [
    { label:'FGV HEALTH', percent:95, color:'green' },
    { label:'EDARAN HEALTH', percent:72, color:'orange' },
    { label:'VENTRADE HEALTH', percent:35, color:'red' }
  ];

  vendorRows = [
    { partner:'FGV Global', mttr:'2.4h', fcr:92, color:'green' },
    { partner:'Edaran Solutions', mttr:'4.8h', fcr:78, color:'orange' },
    { partner:'Ventrade Corp', mttr:'8.2h', fcr:65, color:'red' }
  ];
}

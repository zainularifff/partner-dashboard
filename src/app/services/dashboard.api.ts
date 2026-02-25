import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IncidentApi {
  // ✅ Pastikan port ini sama dengan server.js anda
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // 1. Dashboard Boxes (KPI Summary)
  // Tambah parameter 'client' untuk Master Filter
  getSummary(client: string = ''): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary?client=${client}`);
  }

  // 2. Full List (Table Data)
  getFullList(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard?client=${client}`);
  }

  // 3. Asset Total (TCO Database)
  getAssetTotal(client: string = ''): Observable<{ totalAssets: number }> {
    return this.http.get<{ totalAssets: number }>(`${this.baseUrl}/assets/total?client=${client}`);
  }

  // 4. Top Faults (Cross-DB Query)
  getTopFaults(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assets/top-faults?client=${client}`);
  }

  // 5. Brand Aging (Bios Date Analysis)
  getBrandAging(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assets/brand-aging?client=${client}`);
  }

  // 6. Clients List (Untuk populate Dropdown Filter)
  // Nota: URL di bawah diselaraskan dengan server.js anda (/api/dashboard/clients)
  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard/clients`);
  }
}


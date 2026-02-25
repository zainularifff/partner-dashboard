import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // ✅ Tambah HttpHeaders
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IncidentApi {
  private baseUrl = 'http://localhost:3000/api';
  
  // ✅ Guna token yang kau sebut tadi
  private systemToken = '4b6f0e7d8a9c1f2e3d4c5b6a7e8f9d0c';

  constructor(private http: HttpClient) {}

  // 🛡️ Fungsi pembantu untuk hantar header
  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-system-token': this.systemToken // ✅ Hantar token ke pagar middleware
      })
    };
  }

  // 1. Dashboard Boxes (KPI Summary)
  getSummary(client: string = ''): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary?client=${client}`, this.getHeaders());
  }

  // 2. Full List (Table Data)
  getFullList(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard?client=${client}`, this.getHeaders());
  }

  // 3. Asset Total (TCO Database)
  getAssetTotal(client: string = ''): Observable<{ totalAssets: number }> {
    return this.http.get<{ totalAssets: number }>(`${this.baseUrl}/assets/total?client=${client}`, this.getHeaders());
  }

  // 4. Top Faults (Cross-DB Query)
  getTopFaults(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assets/top-faults?client=${client}`, this.getHeaders());
  }

  // 5. Brand Aging (Bios Date Analysis)
  getBrandAging(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assets/brand-aging?client=${client}`, this.getHeaders());
  }

  // 6. Clients List (Dropdown Filter)
  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard/clients`, this.getHeaders());
  }

  // 7. Asset Summary
  getAssetSummary(clientId: string = ''): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/assets/summary?client=${clientId}`, this.getHeaders());
  }
}
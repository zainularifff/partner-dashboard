import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IncidentApi {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Interceptor akan uruskan 'x-system-token' secara automatik. Tidak perlu set manual.

  getSummary(client: string = ''): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary?client=${client}`);
  }

  getFullList(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard?client=${client}`);
  }

  getAssetTotal(client: string = ''): Observable<{ totalAssets: number }> {
    return this.http.get<{ totalAssets: number }>(`${this.baseUrl}/assets/total?client=${client}`);
  }

  getTopFaults(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assets/top-faults?client=${client}`);
  }

  getBrandAging(client: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assets/brand-aging?client=${client}`);
  }

  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard/clients`);
  }

  getAssetSummary(clientId: string = ''): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/assets/summary?client=${clientId}`);
  }

  getIncidentTrend(type: string, client: string, year: string, month: string): Observable<any[]> {
    const url = `${this.baseUrl}/incidents/trend?type=${type}&client=${client}&year=${year}&month=${month}`;
    return this.http.get<any[]>(url);
  }

  getAvailableYears(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/incidents/years`);
  }

  getManagementStats(clientId: string = ''): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/stats-summary?client=${clientId}`);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IncidentApi {
  private baseUrl = 'http://localhost:3000/api'; // Tukar ke 3005

  constructor(private http: HttpClient) {}

  // 1. Dashboard Boxes (Fast Summary)
  getSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary`);
  }

  // 2. Detail Table (Full List - Ensure route is UNCOMMENTED in server.js)
  getFullList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboard`);
  }

  // 3. Inside IncidentApi class
  getAssetTotal(): Observable<{ totalAssets: number }> {
    return this.http.get<{ totalAssets: number }>(`${this.baseUrl}/assets/total`);
  }
}

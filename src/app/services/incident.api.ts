import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class IncidentApi {

  base = 'http://localhost:4000/api/incidents';

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<any[]>(this.base);
  }

  kpi() {
    return this.http.get<any>(this.base + '/kpi');
  }
}

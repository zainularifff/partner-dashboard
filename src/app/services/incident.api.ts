import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IncidentApi {
  // Point this to your Node.js API
  private apiUrl = 'http://localhost:3000/api/incidents';

  constructor(private http: HttpClient) {}

  list(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}

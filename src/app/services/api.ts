import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  baseUrl = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  testApi() {
    console.log("SERVICE CALL API");
    return this.http.get<{ message: string }>(this.baseUrl, {
      cache: 'no-store' as any
    });
  }

}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Retrospective, Stats } from '../models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.baseUrl}/stats`);
  }

  getRetrospectiveYears(): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/stats/retrospective-years`);
  }

  getRetrospective(year: number): Observable<Retrospective> {
    return this.http.get<Retrospective>(`${this.baseUrl}/stats/retrospective/${year}`);
  }
}

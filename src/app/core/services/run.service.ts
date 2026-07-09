import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Run, RunRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class RunService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getByGame(gameId: number): Observable<Run[]> {
    return this.http.get<Run[]>(`${this.baseUrl}/games/${gameId}/runs`);
  }

  create(gameId: number, payload: RunRequest): Observable<Run> {
    return this.http.post<Run>(`${this.baseUrl}/games/${gameId}/runs`, payload);
  }

  update(runId: number, payload: RunRequest): Observable<Run> {
    return this.http.put<Run>(`${this.baseUrl}/runs/${runId}`, payload);
  }

  delete(runId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/runs/${runId}`);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SavePoint, SavePointRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SavePointService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getByRun(runId: number): Observable<SavePoint[]> {
    return this.http.get<SavePoint[]>(`${this.baseUrl}/runs/${runId}/savepoints`);
  }

  create(runId: number, payload: SavePointRequest): Observable<SavePoint> {
    return this.http.post<SavePoint>(`${this.baseUrl}/runs/${runId}/savepoints`, payload);
  }

  update(id: number, payload: SavePointRequest): Observable<SavePoint> {
    return this.http.put<SavePoint>(`${this.baseUrl}/savepoints/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/savepoints/${id}`);
  }
}

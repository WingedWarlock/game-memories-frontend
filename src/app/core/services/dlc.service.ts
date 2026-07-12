import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dlc, DlcRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class DlcService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getByGame(gameId: number): Observable<Dlc[]> {
    return this.http.get<Dlc[]>(`${this.baseUrl}/games/${gameId}/dlcs`);
  }

  create(gameId: number, payload: DlcRequest): Observable<Dlc> {
    return this.http.post<Dlc>(`${this.baseUrl}/games/${gameId}/dlcs`, payload);
  }

  update(id: number, payload: DlcRequest): Observable<Dlc> {
    return this.http.put<Dlc>(`${this.baseUrl}/dlcs/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/dlcs/${id}`);
  }
}

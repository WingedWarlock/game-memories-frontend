import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Achievement, AchievementRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getByGame(gameId: number): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.baseUrl}/games/${gameId}/achievements`);
  }

  create(gameId: number, payload: AchievementRequest): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.baseUrl}/games/${gameId}/achievements`, payload);
  }

  update(id: number, payload: AchievementRequest): Observable<Achievement> {
    return this.http.put<Achievement>(`${this.baseUrl}/achievements/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/achievements/${id}`);
  }
}

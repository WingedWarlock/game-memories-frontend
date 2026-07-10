import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameCover } from '../models';

@Injectable({ providedIn: 'root' })
export class GameCoverService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  findByGame(gameId: number): Observable<GameCover[]> {
    return this.http.get<GameCover[]>(`${this.baseUrl}/games/${gameId}/covers`);
  }

  upload(gameId: number, formData: FormData): Observable<GameCover> {
    return this.http.post<GameCover>(`${this.baseUrl}/games/${gameId}/covers`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/covers/${id}`);
  }
}

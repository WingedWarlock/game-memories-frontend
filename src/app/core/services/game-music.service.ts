import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameMusic } from '../models';

@Injectable({ providedIn: 'root' })
export class GameMusicService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  findByGame(gameId: number): Observable<GameMusic[]> {
    return this.http.get<GameMusic[]>(`${this.baseUrl}/games/${gameId}/music`);
  }

  upload(gameId: number, formData: FormData): Observable<GameMusic> {
    return this.http.post<GameMusic>(`${this.baseUrl}/games/${gameId}/music`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/music/${id}`);
  }
}

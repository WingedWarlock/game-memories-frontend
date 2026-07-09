import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameMemory, GameMemoryRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class GameMemoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getByGame(gameId: number): Observable<GameMemory[]> {
    return this.http.get<GameMemory[]>(`${this.baseUrl}/games/${gameId}/memories`);
  }

  create(gameId: number, payload: GameMemoryRequest): Observable<GameMemory> {
    return this.http.post<GameMemory>(`${this.baseUrl}/games/${gameId}/memories`, payload);
  }

  update(id: number, payload: GameMemoryRequest): Observable<GameMemory> {
    return this.http.put<GameMemory>(`${this.baseUrl}/memories/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/memories/${id}`);
  }
}

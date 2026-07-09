import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Game, GameRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/games`;

  getAll(): Observable<Game[]> {
    return this.http.get<Game[]>(this.baseUrl);
  }

  getById(id: number): Observable<Game> {
    return this.http.get<Game>(`${this.baseUrl}/${id}`);
  }

  create(payload: GameRequest): Observable<Game> {
    return this.http.post<Game>(this.baseUrl, payload);
  }

  update(id: number, payload: GameRequest): Observable<Game> {
    return this.http.put<Game>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

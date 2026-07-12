import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mod, ModRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ModService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getByGame(gameId: number): Observable<Mod[]> {
    return this.http.get<Mod[]>(`${this.baseUrl}/games/${gameId}/mods`);
  }

  create(gameId: number, payload: ModRequest): Observable<Mod> {
    return this.http.post<Mod>(`${this.baseUrl}/games/${gameId}/mods`, payload);
  }

  update(id: number, payload: ModRequest): Observable<Mod> {
    return this.http.put<Mod>(`${this.baseUrl}/mods/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/mods/${id}`);
  }
}

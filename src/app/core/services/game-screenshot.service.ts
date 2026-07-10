import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameScreenshot } from '../models';

@Injectable({ providedIn: 'root' })
export class GameScreenshotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  findByGame(gameId: number): Observable<GameScreenshot[]> {
    return this.http.get<GameScreenshot[]>(`${this.baseUrl}/games/${gameId}/screenshots`);
  }

  upload(gameId: number, formData: FormData): Observable<GameScreenshot> {
    return this.http.post<GameScreenshot>(`${this.baseUrl}/games/${gameId}/screenshots`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/screenshots/${id}`);
  }
}

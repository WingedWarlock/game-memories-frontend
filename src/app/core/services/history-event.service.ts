import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistoryEvent } from '../models';

@Injectable({ providedIn: 'root' })
export class HistoryEventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAll(): Observable<HistoryEvent[]> {
    return this.http.get<HistoryEvent[]>(`${this.baseUrl}/history`);
  }
}

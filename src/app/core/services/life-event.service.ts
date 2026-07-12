import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LifeEvent, LifeEventRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class LifeEventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAll(): Observable<LifeEvent[]> {
    return this.http.get<LifeEvent[]>(`${this.baseUrl}/life-events`);
  }

  create(payload: LifeEventRequest): Observable<LifeEvent> {
    return this.http.post<LifeEvent>(`${this.baseUrl}/life-events`, payload);
  }

  update(id: number, payload: LifeEventRequest): Observable<LifeEvent> {
    return this.http.put<LifeEvent>(`${this.baseUrl}/life-events/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/life-events/${id}`);
  }
}

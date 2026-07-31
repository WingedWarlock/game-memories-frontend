import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Saga, SagaRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SagaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAll(): Observable<Saga[]> {
    return this.http.get<Saga[]>(`${this.baseUrl}/sagas`);
  }

  getById(id: number): Observable<Saga> {
    return this.http.get<Saga>(`${this.baseUrl}/sagas/${id}`);
  }

  create(payload: SagaRequest): Observable<Saga> {
    return this.http.post<Saga>(`${this.baseUrl}/sagas`, payload);
  }

  update(id: number, payload: SagaRequest): Observable<Saga> {
    return this.http.put<Saga>(`${this.baseUrl}/sagas/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sagas/${id}`);
  }
}

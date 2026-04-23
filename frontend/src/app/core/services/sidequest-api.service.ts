import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, of, tap } from 'rxjs';

export interface DiscoverSidequestResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  maxParticipants: number | null;
  status: string;
  creatorId: string;
  updatedAt: string;
  createdAt: string;
}

export interface DiscoverSidequestQuery {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSidequestRequest {
  title: string;
  description: string;
  category: string;
  locationName: string;
  latitude?: number | null;
  longitude?: number | null;
  maxParticipants?: number | null;
}

export interface SidequestResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  maxParticipants: number | null;
  status: string;
  creatorId: string;
  participantUserIds: string[];
  participantDisplayNames: string[];
  updatedAt: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SidequestApiService {
  private readonly http = inject(HttpClient);
  private readonly discoverCache = new Map<string, { expiresAt: number; data: DiscoverSidequestResponse[] }>();
  private readonly detailCache = new Map<string, { expiresAt: number; data: SidequestResponse }>();
  private readonly sidequestUpdatedSubject = new Subject<void>();

  readonly sidequestUpdated$ = this.sidequestUpdatedSubject.asObservable();

  private readonly discoverTtlMs = 20_000;
  private readonly detailTtlMs = 20_000;

  discover(query: DiscoverSidequestQuery = {}): Observable<DiscoverSidequestResponse[]> {
    let params = new HttpParams();

    if (query.search && query.search.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.category && query.category.trim()) {
      params = params.set('category', query.category.trim());
    }

    if (query.limit !== undefined) {
      params = params.set('limit', query.limit.toString());
    }

    if (query.offset !== undefined) {
      params = params.set('offset', query.offset.toString());
    }

    const cacheKey = params.toString();
    const now = Date.now();
    const cached = this.discoverCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return of(cached.data);
    }

    return this.http.get<DiscoverSidequestResponse[]>('/sidequests/discover', { params }).pipe(
      tap((data) => {
        this.discoverCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + this.discoverTtlMs
        });
      })
    );
  }

  getById(sidequestId: string): Observable<SidequestResponse> {
    const now = Date.now();
    const cached = this.detailCache.get(sidequestId);
    if (cached && cached.expiresAt > now) {
      return of(cached.data);
    }

    return this.http.get<SidequestResponse>(`/sidequests/${sidequestId}`).pipe(
      tap((data) => {
        this.detailCache.set(sidequestId, {
          data,
          expiresAt: Date.now() + this.detailTtlMs
        });
      })
    );
  }

  create(request: CreateSidequestRequest): Observable<SidequestResponse> {
    return this.http.post<SidequestResponse>('/sidequests', request).pipe(
      tap((data) => {
        this.detailCache.set(data.id, {
          data,
          expiresAt: Date.now() + this.detailTtlMs
        });
        this.discoverCache.clear();
        this.sidequestUpdatedSubject.next();
      })
    );
  }

  join(sidequestId: string): Observable<SidequestResponse> {
    return this.http.post<SidequestResponse>(`/sidequests/${sidequestId}/join`, {}).pipe(
      tap((data) => {
        this.detailCache.set(sidequestId, {
          data,
          expiresAt: Date.now() + this.detailTtlMs
        });
        this.discoverCache.clear();
        this.sidequestUpdatedSubject.next();
      })
    );
  }
}

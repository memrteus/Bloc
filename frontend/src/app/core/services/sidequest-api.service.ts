import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

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
  distanceMiles: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface DiscoverSidequestQuery {
  search?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
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
  distanceMiles: number | null;
  creatorId: string;
  participantUserIds: string[];
  participantDisplayNames: string[];
  updatedAt: string;
  createdAt: string;
}

export interface SidequestUserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface SidequestParticipantSummary extends SidequestUserSummary {
  joinedAt: string | null;
}

export interface SidequestDetailResponse {
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
  distanceMiles: number | null;
  updatedAt: string;
  createdAt: string;
  creator: SidequestUserSummary;
  participants: SidequestParticipantSummary[];
  participantCount: number;
  currentUserIsCreator: boolean;
  currentUserHasJoined: boolean;
}

@Injectable({ providedIn: 'root' })
export class SidequestApiService {
  private readonly http = inject(HttpClient);
  private readonly discoverCache = new Map<string, { expiresAt: number; data: DiscoverSidequestResponse[] }>();
  private readonly detailCache = new Map<string, { expiresAt: number; data: SidequestDetailResponse }>();

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

    if (query.lat !== undefined && query.lng !== undefined) {
      params = params.set('lat', query.lat.toString());
      params = params.set('lng', query.lng.toString());
    }

    if (query.radiusMiles !== undefined) {
      params = params.set('radiusMiles', query.radiusMiles.toString());
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

  getById(sidequestId: string): Observable<SidequestDetailResponse> {
    const now = Date.now();
    const cached = this.detailCache.get(sidequestId);
    if (cached && cached.expiresAt > now) {
      return of(cached.data);
    }

    return this.http.get<SidequestDetailResponse>(`/sidequests/${sidequestId}`).pipe(
      tap((data) => {
        this.detailCache.set(sidequestId, {
          data,
          expiresAt: Date.now() + this.detailTtlMs
        });
      })
    );
  }

  getMyJoined(): Observable<DiscoverSidequestResponse[]> {
    return this.http.get<DiscoverSidequestResponse[]>('/sidequests/my-joined');
  }

  create(request: CreateSidequestRequest): Observable<SidequestResponse> {
    return this.http.post<SidequestResponse>('/sidequests', request).pipe(
      tap(() => {
        this.discoverCache.clear();
        this.detailCache.clear();
      })
    );
  }

  join(sidequestId: string): Observable<SidequestResponse> {
    return this.http.post<SidequestResponse>(`/sidequests/${sidequestId}/join`, {}).pipe(
      tap(() => {
        this.discoverCache.clear();
        this.detailCache.delete(sidequestId);
      })
    );
  }
}

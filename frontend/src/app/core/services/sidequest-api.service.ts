import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class SidequestApiService {
  private readonly http = inject(HttpClient);

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

    return this.http.get<DiscoverSidequestResponse[]>('/sidequests/discover', { params });
  }
}

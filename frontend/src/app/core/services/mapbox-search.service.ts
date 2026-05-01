import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of } from 'rxjs';

import { AppConfigService } from './app-config.service';

export interface MapboxLocationSuggestion {
  mapboxId: string;
  name: string;
  placeFormatted: string | null;
  fullAddress: string | null;
  displayLabel: string;
}

export interface SelectedMapboxLocation {
  locationName: string;
  placeLabel: string | null;
  latitude: number;
  longitude: number;
}

interface MapboxSuggestResponse {
  suggestions?: Array<{
    mapbox_id?: string;
    name?: string;
    place_formatted?: string;
    full_address?: string;
  }>;
}

interface MapboxRetrieveResponse {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
    properties?: {
      name?: string;
      place_formatted?: string;
      full_address?: string;
    };
  }>;
}

@Injectable({ providedIn: 'root' })
export class MapboxSearchService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private sessionToken = this.createSessionToken();

  suggest(query: string): Observable<MapboxLocationSuggestion[]> {
    const normalizedQuery = query.trim();
    const accessToken = this.mapboxAccessToken();

    if (!accessToken || normalizedQuery.length < 3) {
      return of([]);
    }

    const params = new HttpParams()
      .set('q', normalizedQuery)
      .set('access_token', accessToken)
      .set('session_token', this.sessionToken)
      .set('country', 'US')
      .set('language', 'en')
      .set('limit', '5')
      .set('proximity', '-72.5199,42.3732');

    return this.http.get<MapboxSuggestResponse>('https://api.mapbox.com/search/searchbox/v1/suggest', { params }).pipe(
      map((response) =>
        (response.suggestions ?? [])
          .filter((suggestion) => Boolean(suggestion.mapbox_id && suggestion.name))
          .map((suggestion) => this.toLocationSuggestion(suggestion))
      ),
      catchError(() => of([]))
    );
  }

  retrieve(suggestion: MapboxLocationSuggestion): Observable<SelectedMapboxLocation | null> {
    const accessToken = this.mapboxAccessToken();
    if (!accessToken) {
      return of(null);
    }

    const params = new HttpParams()
      .set('access_token', accessToken)
      .set('session_token', this.sessionToken);

    return this.http
      .get<MapboxRetrieveResponse>(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapboxId)}`, {
        params
      })
      .pipe(
        map((response) => this.toSelectedLocation(response)),
        catchError(() => of(null)),
        finalize(() => {
          this.sessionToken = this.createSessionToken();
        })
      );
  }

  private mapboxAccessToken(): string | null {
    const accessToken = this.config.environment.mapboxAccessToken.trim();
    return accessToken.startsWith('pk.') ? accessToken : null;
  }

  private toLocationSuggestion(suggestion: NonNullable<MapboxSuggestResponse['suggestions']>[number]): MapboxLocationSuggestion {
    const name = suggestion.name ?? 'Unknown location';
    const placeFormatted = suggestion.place_formatted ?? null;
    const fullAddress = suggestion.full_address ?? null;
    const displayLabel = fullAddress || [name, placeFormatted].filter(Boolean).join(', ') || name;

    return {
      mapboxId: suggestion.mapbox_id ?? '',
      name,
      placeFormatted,
      fullAddress,
      displayLabel
    };
  }

  private toSelectedLocation(response: MapboxRetrieveResponse): SelectedMapboxLocation | null {
    const feature = response.features?.[0];
    const coordinates = feature?.geometry?.coordinates;

    if (!coordinates || coordinates.length < 2) {
      return null;
    }

    const [longitude, latitude] = coordinates;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const name = feature?.properties?.name?.trim() || 'Selected location';
    const placeLabel = feature?.properties?.full_address || feature?.properties?.place_formatted || null;

    return {
      locationName: name,
      placeLabel,
      latitude,
      longitude
    };
  }

  private createSessionToken(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

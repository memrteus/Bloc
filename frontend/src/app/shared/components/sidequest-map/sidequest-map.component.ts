import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

import { AppConfigService } from '../../../core/services/app-config.service';

export interface SidequestMapItem {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  locationName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  distanceMiles?: number | string | null;
}

export interface MapUserLocation {
  latitude: number;
  longitude: number;
}

export interface SelectedMapLocation {
  latitude: number;
  longitude: number;
  locationName: string;
}

interface MapboxGeocodingResponse {
  features?: Array<{
    place_name?: string;
    text?: string;
  }>;
}

@Component({
  selector: 'app-sidequest-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-shell">
      <button type="button" class="locate-btn" (click)="requestCurrentLocation()" [disabled]="locating">
        {{ locating ? 'Locating...' : 'Use my location' }}
      </button>
      <div #mapContainer class="map-canvas" aria-label="Sidequest map"></div>
      <p class="map-message" *ngIf="mapMessage">{{ mapMessage }}</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 360px;
    }

    .map-shell {
      position: relative;
      height: 100%;
      min-height: 360px;
      overflow: hidden;
      border: 1px solid rgba(98, 122, 142, 0.35);
      border-radius: 8px;
      background: #d9e9ef;
    }

    .locate-btn {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      z-index: 2;
      border: 1px solid rgba(15, 85, 105, 0.22);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.94);
      color: #0f5569;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0.46rem 0.62rem;
    }

    .locate-btn[disabled] {
      cursor: wait;
      opacity: 0.72;
    }

    .map-canvas {
      width: 100%;
      min-height: 360px;
      height: 100%;
    }

    .map-message {
      position: absolute;
      inset: auto 1rem 1rem 1rem;
      margin: 0;
      padding: 0.75rem 0.9rem;
      border: 1px solid rgba(98, 122, 142, 0.28);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      color: #334155;
      font-size: 0.95rem;
      font-weight: 600;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.13);
    }

    :host ::ng-deep .sidequest-marker {
      width: 22px;
      height: 22px;
      border: 3px solid #ffffff;
      border-radius: 50%;
      background: #0f766e;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
      cursor: pointer;
    }

    :host ::ng-deep .sidequest-marker.closest {
      background: #db2777;
      transform: scale(1.18);
    }

    :host ::ng-deep .user-location-marker {
      width: 18px;
      height: 18px;
      border: 3px solid #ffffff;
      border-radius: 50%;
      background: #2563eb;
      box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.2), 0 8px 18px rgba(15, 23, 42, 0.28);
    }

    :host ::ng-deep .selected-location-marker {
      width: 24px;
      height: 24px;
      border: 3px solid #ffffff;
      border-radius: 50%;
      background: #f97316;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
    }

    :host ::ng-deep .sidequest-popup {
      min-width: 210px;
      max-width: 260px;
      color: #172033;
    }

    :host ::ng-deep .sidequest-popup h3 {
      margin: 0 0 0.35rem;
      font-size: 1rem;
      line-height: 1.25;
    }

    :host ::ng-deep .sidequest-popup p {
      margin: 0 0 0.45rem;
      font-size: 0.88rem;
      line-height: 1.35;
    }

    :host ::ng-deep .sidequest-popup .location {
      color: #475569;
      font-weight: 700;
    }

    :host ::ng-deep .sidequest-popup .distance {
      color: #0f766e;
      font-weight: 700;
    }

    :host ::ng-deep .sidequest-popup .directions {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
      padding-top: 0.2rem;
    }

    :host ::ng-deep .sidequest-popup a {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 0.35rem 0.55rem;
      border-radius: 6px;
      background: #0f766e;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
    }

    :host ::ng-deep .sidequest-popup .join-map-btn {
      width: 100%;
      min-height: 34px;
      margin-top: 0.45rem;
      border: 0;
      border-radius: 6px;
      background: #123345;
      color: #ffffff;
      cursor: pointer;
      font-size: 0.84rem;
      font-weight: 700;
    }

    :host ::ng-deep .sidequest-popup .join-map-btn[disabled] {
      cursor: not-allowed;
      opacity: 0.66;
    }
  `]
})
export class SidequestMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) private readonly mapContainer!: ElementRef<HTMLDivElement>;

  @Input() sidequests: readonly SidequestMapItem[] | null = [];
  @Input() initialCenter: [number, number] = [-72.5199, 42.3732];
  @Input() initialZoom = 12;
  @Input() mapStyle = 'mapbox://styles/mapbox/streets-v12';
  @Input() requestLocationOnInit = false;
  @Input() selectableLocationMode = false;
  @Input() joinedSidequestIds: readonly (string | number)[] = [];
  @Input() joiningSidequestIds: readonly (string | number)[] = [];

  @Output() userLocationChange = new EventEmitter<MapUserLocation>();
  @Output() joinSidequest = new EventEmitter<SidequestMapItem>();
  @Output() locationSelected = new EventEmitter<SelectedMapLocation>();

  protected mapMessage = '';
  protected locating = false;

  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private mapbox: typeof import('mapbox-gl')['default'] | null = null;
  private map: MapboxMap | null = null;
  private markers: MapboxMarker[] = [];
  private userLocationMarker: MapboxMarker | null = null;
  private selectedLocationMarker: MapboxMarker | null = null;
  private userLocation: MapUserLocation | null = null;
  private mapLoaded = false;
  private destroyed = false;
  private initialLocationRequested = false;

  ngAfterViewInit(): void {
    void this.initializeMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['sidequests'] ||
      changes['initialCenter'] ||
      changes['initialZoom'] ||
      changes['joinedSidequestIds'] ||
      changes['joiningSidequestIds']
    ) {
      this.syncMarkers();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearMarkers();
    this.userLocationMarker?.remove();
    this.selectedLocationMarker?.remove();
    this.map?.remove();
  }

  private async initializeMap(): Promise<void> {
    const accessToken = this.config.environment.mapboxAccessToken.trim();

    if (!accessToken.startsWith('pk.')) {
      this.mapMessage = 'Add a public Mapbox token to the Angular environment config to load the map.';
      return;
    }

    const mapboxgl = (await import('mapbox-gl')).default;
    if (this.destroyed) {
      return;
    }

    this.mapbox = mapboxgl;
    mapboxgl.accessToken = accessToken;

    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: this.mapStyle,
      center: this.initialCenter,
      zoom: this.initialZoom
    });

    this.map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('click', (event) => {
      if (!this.selectableLocationMode) {
        return;
      }

      this.selectMapLocation(event.lngLat.lat, event.lngLat.lng);
    });

    this.map.on('load', () => {
      this.mapLoaded = true;
      this.syncMarkers();

      if (this.requestLocationOnInit && !this.initialLocationRequested) {
        this.initialLocationRequested = true;
        this.requestCurrentLocation();
      }
    });
  }

  protected requestCurrentLocation(): void {
    if (!this.map || !this.mapbox || this.locating) {
      return;
    }

    if (!navigator.geolocation) {
      this.mapMessage = 'Location is not available in this browser. Showing the default Amherst view.';
      return;
    }

    this.locating = true;
    this.mapMessage = 'Finding your location...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (this.destroyed) {
          return;
        }

        this.locating = false;
        this.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        this.userLocationChange.emit(this.userLocation);
        this.mapMessage = '';
        this.upsertUserLocationMarker();
        this.syncMarkers();
        this.map?.easeTo({
          center: [this.userLocation.longitude, this.userLocation.latitude],
          zoom: Math.max(this.initialZoom, 14),
          duration: 500
        });
      },
      () => {
        if (this.destroyed) {
          return;
        }

        this.locating = false;
        this.mapMessage = 'Location permission was not granted. Showing the default Amherst view.';
        this.map?.setCenter(this.initialCenter);
        this.map?.setZoom(this.initialZoom);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000
      }
    );
  }

  private syncMarkers(): void {
    if (!this.map || !this.mapbox || !this.mapLoaded) {
      return;
    }

    this.clearMarkers();

    const sidequestsWithCoordinates = (this.sidequests ?? [])
      .map((sidequest) => ({
        sidequest,
        latitude: this.toCoordinate(sidequest.latitude),
        longitude: this.toCoordinate(sidequest.longitude)
      }))
      .filter((item): item is { sidequest: SidequestMapItem; latitude: number; longitude: number } =>
        item.latitude !== null && item.longitude !== null
      );

    if (sidequestsWithCoordinates.length === 0) {
      this.mapMessage = this.selectableLocationMode ? 'Click the map to choose a location.' : 'No sidequests with coordinates yet.';
      this.map.setCenter(this.initialCenter);
      this.map.setZoom(this.initialZoom);
      return;
    }

    this.mapMessage = '';
    const bounds = new this.mapbox.LngLatBounds();
    const closestSidequestId = this.findClosestSidequestId(sidequestsWithCoordinates);

    for (const item of sidequestsWithCoordinates) {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = item.sidequest.id === closestSidequestId ? 'sidequest-marker closest' : 'sidequest-marker';
      markerElement.setAttribute('aria-label', item.sidequest.title ? `Open ${item.sidequest.title}` : 'Open sidequest');

      const popup = new this.mapbox.Popup({ offset: 18 }).setDOMContent(
        this.createPopupContent(item.sidequest, item.latitude, item.longitude)
      );

      const marker = new this.mapbox.Marker({ element: markerElement })
        .setLngLat([item.longitude, item.latitude])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
      bounds.extend([item.longitude, item.latitude]);
    }

    if (sidequestsWithCoordinates.length === 1) {
      const onlySidequest = sidequestsWithCoordinates[0];
      this.map.setCenter([onlySidequest.longitude, onlySidequest.latitude]);
      this.map.setZoom(Math.max(this.initialZoom, 14));
      return;
    }

    this.map.fitBounds(bounds, {
      padding: 72,
      maxZoom: 15,
      duration: 500
    });
  }

  private clearMarkers(): void {
    for (const marker of this.markers) {
      marker.remove();
    }

    this.markers = [];
  }

  private upsertUserLocationMarker(): void {
    if (!this.map || !this.mapbox || !this.userLocation) {
      return;
    }

    if (this.userLocationMarker) {
      this.userLocationMarker.setLngLat([this.userLocation.longitude, this.userLocation.latitude]);
      return;
    }

    const markerElement = document.createElement('div');
    markerElement.className = 'user-location-marker';
    markerElement.setAttribute('aria-label', 'Your location');

    this.userLocationMarker = new this.mapbox.Marker({ element: markerElement })
      .setLngLat([this.userLocation.longitude, this.userLocation.latitude])
      .addTo(this.map);
  }

  private selectMapLocation(latitude: number, longitude: number): void {
    this.upsertSelectedLocationMarker(latitude, longitude);
    this.locationSelected.emit({
      latitude,
      longitude,
      locationName: 'Selected map location'
    });
    this.reverseGeocodeSelectedLocation(latitude, longitude);
  }

  private upsertSelectedLocationMarker(latitude: number, longitude: number): void {
    if (!this.map || !this.mapbox) {
      return;
    }

    if (this.selectedLocationMarker) {
      this.selectedLocationMarker.setLngLat([longitude, latitude]);
      return;
    }

    const markerElement = document.createElement('div');
    markerElement.className = 'selected-location-marker';
    markerElement.setAttribute('aria-label', 'Selected sidequest location');

    this.selectedLocationMarker = new this.mapbox.Marker({ element: markerElement })
      .setLngLat([longitude, latitude])
      .addTo(this.map);
  }

  private reverseGeocodeSelectedLocation(latitude: number, longitude: number): void {
    const accessToken = this.config.environment.mapboxAccessToken.trim();
    if (!accessToken.startsWith('pk.')) {
      return;
    }

    const params = new HttpParams()
      .set('access_token', accessToken)
      .set('limit', '1');

    this.http
      .get<MapboxGeocodingResponse>(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${longitude},${latitude}`)}.json`,
        { params }
      )
      .subscribe({
        next: (response) => {
          const feature = response.features?.[0];
          this.locationSelected.emit({
            latitude,
            longitude,
            locationName: feature?.place_name || feature?.text || 'Selected map location'
          });
        },
        error: () => {
          this.locationSelected.emit({
            latitude,
            longitude,
            locationName: 'Selected map location'
          });
        }
      });
  }

  private toCoordinate(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const coordinate = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  }

  private createPopupContent(sidequest: SidequestMapItem, latitude: number, longitude: number): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'sidequest-popup';

    const title = document.createElement('h3');
    title.textContent = sidequest.title || 'Untitled sidequest';
    wrapper.append(title);

    if (sidequest.locationName) {
      const location = document.createElement('p');
      location.className = 'location';
      location.textContent = sidequest.locationName;
      wrapper.append(location);
    }

    if (sidequest.description) {
      const description = document.createElement('p');
      description.textContent = this.shortDescription(sidequest.description);
      wrapper.append(description);
    }

    const distanceMiles = this.toCoordinate(sidequest.distanceMiles) ?? this.distanceFromUser(latitude, longitude);
    if (distanceMiles !== null) {
      const distance = document.createElement('p');
      distance.className = 'distance';
      distance.textContent = `${this.formatDistance(distanceMiles)} away`;
      wrapper.append(distance);
    }

    const directions = document.createElement('div');
    directions.className = 'directions';
    directions.append(
      this.createDirectionsLink('Google Maps', `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`),
      this.createDirectionsLink('Apple Maps', `https://maps.apple.com/?daddr=${latitude},${longitude}`)
    );
    wrapper.append(directions);

    const joinButton = document.createElement('button');
    joinButton.type = 'button';
    joinButton.className = 'join-map-btn';
    joinButton.textContent = this.joinButtonText(sidequest);
    joinButton.disabled = this.isJoined(sidequest) || this.isJoining(sidequest);
    joinButton.addEventListener('click', () => {
      if (!joinButton.disabled) {
        this.joinSidequest.emit(sidequest);
      }
    });
    wrapper.append(joinButton);

    return wrapper;
  }

  private createDirectionsLink(label: string, href: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    return link;
  }

  private shortDescription(description: string): string {
    const normalized = description.trim();
    return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
  }

  private findClosestSidequestId(
    sidequests: Array<{ sidequest: SidequestMapItem; latitude: number; longitude: number }>
  ): string | number | null {
    if (!this.userLocation) {
      return null;
    }

    return sidequests.reduce<{ id: string | number | null; distance: number }>(
      (closest, item) => {
        const distance = calculateHaversineDistanceMiles(
          this.userLocation!.latitude,
          this.userLocation!.longitude,
          item.latitude,
          item.longitude
        );

        return distance < closest.distance ? { id: item.sidequest.id ?? null, distance } : closest;
      },
      { id: null, distance: Number.POSITIVE_INFINITY }
    ).id;
  }

  private distanceFromUser(latitude: number, longitude: number): number | null {
    if (!this.userLocation) {
      return null;
    }

    return calculateHaversineDistanceMiles(this.userLocation.latitude, this.userLocation.longitude, latitude, longitude);
  }

  private formatDistance(distanceMiles: number): string {
    if (distanceMiles < 0.1) {
      return 'less than 0.1 mi';
    }

    if (distanceMiles < 10) {
      return `${distanceMiles.toFixed(1)} mi`;
    }

    return `${Math.round(distanceMiles)} mi`;
  }

  private isJoined(sidequest: SidequestMapItem): boolean {
    return sidequest.id !== null && sidequest.id !== undefined && this.joinedSidequestIds.includes(sidequest.id);
  }

  private isJoining(sidequest: SidequestMapItem): boolean {
    return sidequest.id !== null && sidequest.id !== undefined && this.joiningSidequestIds.includes(sidequest.id);
  }

  private joinButtonText(sidequest: SidequestMapItem): string {
    if (this.isJoined(sidequest)) {
      return 'Joined';
    }

    if (this.isJoining(sidequest)) {
      return 'Joining...';
    }

    return 'Join sidequest';
  }
}

export function calculateHaversineDistanceMiles(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
): number {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

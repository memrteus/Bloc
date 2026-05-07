import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize, switchMap, tap } from 'rxjs';

import { MapboxLocationSuggestion, MapboxSearchService } from '../../core/services/mapbox-search.service';
import { SidequestApiService, SidequestDetailResponse, UpdateSidequestRequest } from '../../core/services/sidequest-api.service';
import { SelectedMapLocation, SidequestMapComponent, SidequestMapItem } from '../../shared/components/sidequest-map/sidequest-map.component';

interface EditSidequestForm {
  title: string;
  description: string;
  locationName: string;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  maxParticipants: number | null;
  expiresAt: string;
}

type ConfirmationAction = 'complete' | 'delete' | 'leave';

@Component({
  selector: 'app-sidequest-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidequestMapComponent],
  template: `
    <section class="detail-page">
      <a class="back-link" routerLink="/home">Back to groups</a>

      <p class="state" *ngIf="loading">Loading sidequest...</p>
      <p class="state error" *ngIf="!loading && notFound">Sidequest not found.</p>
      <p class="state error" *ngIf="!loading && !notFound && errorMessage">{{ errorMessage }}</p>

      <article class="detail-card" *ngIf="!loading && sidequest as quest">
        <header class="detail-header">
          <div>
            <p class="mono-title">{{ quest.category || 'Sidequest' }}</p>
            <h1>{{ quest.title }}</h1>
            <p class="meta">{{ quest.locationName || 'Campus' }}</p>
          </div>
          <span class="status" [class.expired]="isExpired(quest)" [class.completed]="isCompleted(quest)">
            {{ statusLabel(quest.status) }}
          </span>
        </header>

        <p class="description">{{ quest.description }}</p>

        <section class="info-grid">
          <div>
            <p class="info-label">Creator</p>
            <p class="info-value">{{ quest.creator.displayName }}</p>
          </div>
          <div>
            <p class="info-label">Expires</p>
            <p class="info-value">{{ formatDate(quest.expiresAt) }}</p>
          </div>
          <div>
            <p class="info-label">Participants</p>
            <p class="info-value">{{ quest.participantCount }}{{ quest.maxParticipants ? ' / ' + quest.maxParticipants : '' }}</p>
          </div>
          <div>
            <p class="info-label">Created</p>
            <p class="info-value">{{ formatDate(quest.createdAt) }}</p>
          </div>
        </section>

        <section class="actions">
          <button
            type="button"
            class="primary-action"
            *ngIf="canJoinSidequest(quest)"
            [disabled]="joining"
            (click)="joinSidequest()"
          >
            {{ joining ? 'Joining...' : 'Join sidequest' }}
          </button>
          <button type="button" class="quiet-action" *ngIf="quest.currentUserHasJoined" disabled>
            Joined
          </button>
          <button type="button" class="leave-action" *ngIf="canLeaveSidequest(quest)" [disabled]="leaving" (click)="requestConfirmation('leave')">
            {{ leaving ? 'Leaving...' : 'Leave sidequest' }}
          </button>
          <button type="button" class="quiet-action" *ngIf="isSidequestFull(quest) && !quest.currentUserHasJoined" disabled>
            Full
          </button>

          <div class="creator-actions" *ngIf="quest.currentUserIsCreator">
            <button type="button" *ngIf="canEditSidequest(quest)" (click)="toggleEditForm()">
              {{ editing ? 'Cancel edit' : 'Edit' }}
            </button>
            <button type="button" *ngIf="canCompleteSidequest(quest)" [disabled]="completing" (click)="requestConfirmation('complete')">
              {{ completing ? 'Completing...' : 'Complete' }}
            </button>
            <button type="button" class="danger-action" *ngIf="canDeleteSidequest(quest)" [disabled]="deleting" (click)="requestConfirmation('delete')">
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </section>

        <section class="confirm-popover" *ngIf="pendingConfirmation as confirmation" [class.danger]="confirmation === 'delete'">
          <div>
            <p class="mono-title">{{ confirmationEyebrow(confirmation) }}</p>
            <h2>{{ confirmationTitle(confirmation) }}</h2>
            <p>{{ confirmationMessage(confirmation) }}</p>
          </div>
          <div class="confirm-actions">
            <button type="button" class="quiet-action" (click)="clearConfirmation()">Cancel</button>
            <button
              type="button"
              class="primary-action"
              [class.danger-confirm]="confirmation === 'delete'"
              [disabled]="confirmationBusy(confirmation)"
              (click)="confirmPendingAction(confirmation)"
            >
              {{ confirmationConfirmLabel(confirmation) }}
            </button>
          </div>
        </section>

        <p class="action-message" *ngIf="actionMessage">{{ actionMessage }}</p>

        <section class="edit-panel" *ngIf="editing">
          <div>
            <p class="mono-title">Edit sidequest</p>
            <h2>Update details</h2>
          </div>

          <form class="edit-form" (ngSubmit)="updateSidequest()">
            <label>
              Title
              <input name="title" type="text" [(ngModel)]="editForm.title" required />
            </label>

            <label>
              Description
              <textarea name="description" [(ngModel)]="editForm.description" rows="4" required></textarea>
            </label>

            <label>
              Location
              <div class="location-field">
                <input
                  name="locationName"
                  type="text"
                  [(ngModel)]="editForm.locationName"
                  (ngModelChange)="onEditLocationSearchChange($event)"
                  required
                  autocomplete="off"
                  placeholder="Search for a place or address"
                />

                <div class="location-suggestions" *ngIf="editLocationSuggestions.length > 0">
                  <button
                    type="button"
                    *ngFor="let suggestion of editLocationSuggestions"
                    (click)="selectEditLocationSuggestion(suggestion)"
                  >
                    <span>{{ suggestion.name }}</span>
                    <small *ngIf="suggestion.placeFormatted || suggestion.fullAddress">
                      {{ suggestion.fullAddress || suggestion.placeFormatted }}
                    </small>
                  </button>
                </div>
              </div>
              <p class="field-note" *ngIf="editLocationSearching">Searching locations...</p>
              <p class="field-note selected" *ngIf="hasSelectedEditLocation()">
                Selected: {{ editForm.locationLabel || editForm.locationName }}
              </p>
            </label>

            <section class="edit-map-picker">
              <p class="participant-title">Pick on map</p>
              <app-sidequest-map
                [sidequests]="editMapSidequests"
                [selectableLocationMode]="true"
                [initialCenter]="editMapCenter"
                [initialZoom]="14"
                (locationSelected)="applyEditMapSelectedLocation($event)"
              ></app-sidequest-map>
            </section>

            <div class="coordinate-grid">
              <label>
                Max participants
                <input name="maxParticipants" type="number" min="1" [(ngModel)]="editForm.maxParticipants" />
              </label>
              <label>
                Expires
                <input name="expiresAt" type="datetime-local" [(ngModel)]="editForm.expiresAt" />
              </label>
            </div>

            <div class="panel-errors" *ngIf="editErrors.length > 0">
              <p *ngFor="let error of editErrors">{{ error }}</p>
            </div>

            <button type="submit" class="primary-action" [disabled]="updating">
              {{ updating ? 'Saving...' : 'Save changes' }}
            </button>
          </form>
        </section>

        <section class="participants-panel">
          <div class="section-heading">
            <p class="mono-title">Joined users</p>
            <h2>Participants</h2>
          </div>

          <p class="meta" *ngIf="quest.participants.length === 0">No one has joined this sidequest yet.</p>
          <ul *ngIf="quest.participants.length > 0">
            <li *ngFor="let participant of quest.participants">
              <div class="avatar">{{ participant.displayName.charAt(0).toUpperCase() }}</div>
              <div>
                <p class="participant-name">{{ participant.displayName }}</p>
                <p class="meta">Joined {{ formatDate(participant.joinedAt) }}</p>
              </div>
            </li>
          </ul>
        </section>
      </article>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1.25rem 1rem 1.75rem;
    }

    .detail-page {
      max-width: 980px;
      margin: 0 auto;
      display: grid;
      gap: 0.85rem;
    }

    .back-link {
      color: #0f5569;
      font-size: 0.86rem;
      font-weight: 700;
      text-decoration: none;
    }

    .detail-card {
      border: 1px solid #c6d9e3;
      border-radius: 16px;
      background: #fafdff;
      box-shadow: 0 12px 28px rgba(10, 32, 44, 0.1);
      padding: 1.1rem;
      display: grid;
      gap: 1rem;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .mono-title {
      margin: 0;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #70b4cb;
    }

    h1,
    h2 {
      margin: 0.28rem 0 0;
      color: #122433;
    }

    h1 {
      font-size: 1.8rem;
    }

    h2 {
      font-size: 1.05rem;
    }

    .meta,
    .state,
    .action-message {
      margin: 0.3rem 0 0;
      color: #56717f;
      font-size: 0.84rem;
    }

    .error {
      color: #a33c3c;
      font-weight: 700;
    }

    .description {
      margin: 0;
      color: #34505f;
      line-height: 1.55;
      font-size: 0.95rem;
    }

    .status {
      border: 1px solid #b8deea;
      border-radius: 999px;
      background: #ddf3f9;
      color: #0f5569;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.34rem 0.68rem;
      white-space: nowrap;
    }

    .status.expired {
      border-color: #d6dee4;
      background: #edf2f5;
      color: #617482;
    }

    .status.completed {
      border-color: #b8dfc8;
      background: #e5f8ec;
      color: #177347;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.7rem;
    }

    .info-grid > div,
    .participants-panel {
      border: 1px solid #d3e4eb;
      border-radius: 12px;
      background: #f5fbfe;
      padding: 0.75rem;
    }

    .info-label {
      margin: 0;
      color: #5c7482;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .info-value {
      margin: 0.25rem 0 0;
      color: #14384a;
      font-size: 0.9rem;
      font-weight: 800;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      align-items: center;
    }

    .primary-action,
    .leave-action,
    .quiet-action,
    .creator-actions button {
      border-radius: 10px;
      min-height: 38px;
      padding: 0.5rem 0.86rem;
      font-size: 0.84rem;
      font-weight: 800;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    .primary-action {
      border: 0;
      color: #effbff;
      background: linear-gradient(145deg, #0f6378, #2887a0);
      cursor: pointer;
    }

    .primary-action:hover:not([disabled]),
    .leave-action:hover:not([disabled]),
    .quiet-action:hover:not([disabled]),
    .creator-actions button:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 9px 18px rgba(18, 36, 51, 0.14);
    }

    .quiet-action,
    .creator-actions button {
      border: 1px solid #c3d6df;
      background: #eef6fa;
      color: #56717f;
    }

    .leave-action {
      border: 1px solid #efc6c6;
      background: #fff4f4;
      color: #9b3f3f;
    }

    .danger-action {
      border-color: #efc6c6 !important;
      background: #fff4f4 !important;
      color: #9b3f3f !important;
    }

    .danger-action:hover:not([disabled]),
    .leave-action:hover:not([disabled]) {
      border-color: #da8e8e !important;
      background: #ffeaea !important;
    }

    .confirm-popover {
      position: relative;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      border: 1px solid #bdd8e2;
      border-radius: 12px;
      background: #f1fbff;
      padding: 0.8rem;
      box-shadow: 0 14px 30px rgba(15, 49, 65, 0.14);
      animation: pop-in 160ms ease both;
    }

    .confirm-popover::before {
      content: '';
      position: absolute;
      top: -7px;
      right: 2rem;
      width: 12px;
      height: 12px;
      border-top: 1px solid #bdd8e2;
      border-left: 1px solid #bdd8e2;
      background: inherit;
      transform: rotate(45deg);
    }

    .confirm-popover.danger {
      border-color: #f0b8b8;
      background: #fff7f7;
      box-shadow: 0 14px 30px rgba(127, 45, 45, 0.12);
    }

    .confirm-popover p {
      margin: 0.25rem 0 0;
      color: #496777;
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .confirm-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: flex-end;
    }

    .danger-confirm {
      background: linear-gradient(145deg, #b43c3c, #d45f5f) !important;
    }

    .primary-action[disabled],
    .leave-action[disabled],
    .creator-actions button[disabled] {
      cursor: not-allowed;
      opacity: 0.64;
    }

    .creator-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .edit-panel {
      border: 1px solid #d3e4eb;
      border-radius: 12px;
      background: #f5fbfe;
      padding: 0.85rem;
      display: grid;
      gap: 0.8rem;
    }

    .edit-form {
      display: grid;
      gap: 0.7rem;
    }

    .edit-form label {
      display: grid;
      gap: 0.34rem;
      color: #14384a;
      font-size: 0.84rem;
      font-weight: 700;
    }

    .edit-form input,
    .edit-form textarea {
      border: 1px solid #c4d6df;
      border-radius: 10px;
      padding: 0.56rem 0.68rem;
      background: #f9fdff;
      color: #123345;
      font: inherit;
    }

    .edit-form textarea {
      resize: vertical;
      min-height: 92px;
    }

    .location-field {
      position: relative;
      display: grid;
    }

    .location-suggestions {
      position: absolute;
      z-index: 5;
      top: calc(100% + 0.3rem);
      left: 0;
      right: 0;
      overflow: hidden;
      border: 1px solid #c4d6df;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
    }

    .location-suggestions button {
      width: 100%;
      border: 0;
      border-bottom: 1px solid #e1edf2;
      background: transparent;
      color: #14384a;
      cursor: pointer;
      display: grid;
      gap: 0.16rem;
      padding: 0.62rem 0.72rem;
      text-align: left;
    }

    .location-suggestions button:last-child {
      border-bottom: 0;
    }

    .location-suggestions button:hover {
      background: #eef8fc;
    }

    .location-suggestions span {
      font-size: 0.84rem;
      font-weight: 700;
    }

    .location-suggestions small,
    .field-note {
      color: #5c7482;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .field-note {
      margin: 0;
    }

    .field-note.selected {
      color: #0f766e;
      font-weight: 700;
    }

    .edit-map-picker {
      display: grid;
      gap: 0.45rem;
      border: 1px solid #d3e4eb;
      border-radius: 12px;
      background: #f5fbfe;
      padding: 0.7rem;
    }

    .participant-title {
      margin: 0;
      color: #14384a;
      font-size: 0.83rem;
      font-weight: 700;
    }

    .coordinate-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7rem;
    }

    .panel-errors {
      display: grid;
      gap: 0.24rem;
      border: 1px solid #f1c3c3;
      border-radius: 10px;
      background: #fff7f7;
      padding: 0.65rem 0.75rem;
      color: #7f2d2d;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .panel-errors p {
      margin: 0;
    }

    .participants-panel ul {
      margin: 0.75rem 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.55rem;
    }

    .participants-panel li {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: #3f5b6a;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #2f9bb8, #6db1c6);
      color: #eff9fc;
      font-weight: 800;
    }

    .participant-name {
      margin: 0;
      color: #14384a;
      font-size: 0.88rem;
      font-weight: 800;
    }

    @keyframes pop-in {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 760px) {
      .detail-header {
        flex-direction: column;
      }

      .info-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .info-grid {
        grid-template-columns: 1fr;
      }

      .confirm-popover {
        align-items: stretch;
        flex-direction: column;
      }

      .confirm-actions {
        justify-content: stretch;
      }

      .confirm-actions button {
        flex: 1;
      }

      .coordinate-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SidequestDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sidequestApi = inject(SidequestApiService);
  private readonly mapboxSearch = inject(MapboxSearchService);
  private readonly editLocationSearchInput = new Subject<string>();
  private routeSubscription?: Subscription;
  private editLocationSearchSubscription?: Subscription;

  protected sidequest: SidequestDetailResponse | null = null;
  protected loading = false;
  protected joining = false;
  protected updating = false;
  protected deleting = false;
  protected completing = false;
  protected leaving = false;
  protected editing = false;
  protected pendingConfirmation: ConfirmationAction | null = null;
  protected notFound = false;
  protected errorMessage = '';
  protected actionMessage = '';
  protected editErrors: string[] = [];
  protected editLocationSuggestions: MapboxLocationSuggestion[] = [];
  protected editLocationSearching = false;
  protected editMapCenter: [number, number] = [-72.5199, 42.3732];
  protected editMapSidequests: SidequestMapItem[] = [];
  protected editForm: EditSidequestForm = {
    title: '',
    description: '',
    locationName: '',
    locationLabel: null,
    latitude: null,
    longitude: null,
    maxParticipants: null,
    expiresAt: ''
  };

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const sidequestId = params.get('id');
      if (!sidequestId) {
        this.notFound = true;
        return;
      }

      this.loadSidequest(sidequestId);
    });
    this.editLocationSearchSubscription = this.editLocationSearchInput
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => {
          this.editLocationSearching = true;
        }),
        switchMap((query) => this.mapboxSearch.suggest(query).pipe(finalize(() => (this.editLocationSearching = false))))
      )
      .subscribe((suggestions) => {
        this.editLocationSuggestions = suggestions;
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.editLocationSearchSubscription?.unsubscribe();
  }

  protected joinSidequest(): void {
    if (!this.sidequest || this.joining || !this.canJoinSidequest(this.sidequest)) {
      return;
    }

    const sidequestId = this.sidequest.id;
    this.joining = true;
    this.actionMessage = '';

    this.sidequestApi
      .join(sidequestId)
      .pipe(finalize(() => (this.joining = false)))
      .subscribe({
        next: () => {
          this.actionMessage = 'You joined this sidequest.';
          this.loadSidequest(sidequestId);
        },
        error: () => {
          this.actionMessage = 'Unable to join this sidequest right now.';
        }
      });
  }

  protected updateSidequest(): void {
    if (!this.sidequest || this.updating || !this.canEditSidequest(this.sidequest)) {
      return;
    }

    const payload = this.buildUpdatePayload();
    if (!payload) {
      return;
    }

    const sidequestId = this.sidequest.id;
    this.updating = true;
    this.actionMessage = '';

    this.sidequestApi
      .update(sidequestId, payload)
      .pipe(finalize(() => (this.updating = false)))
      .subscribe({
        next: (response) => {
          this.sidequest = response;
          this.editing = false;
          this.actionMessage = 'Sidequest updated.';
        },
        error: (error: unknown) => {
          this.editErrors = [this.extractErrorMessage(error) || 'Unable to update this sidequest right now.'];
        }
      });
  }

  protected requestConfirmation(action: ConfirmationAction): void {
    this.pendingConfirmation = this.pendingConfirmation === action ? null : action;
    this.actionMessage = '';
  }

  protected clearConfirmation(): void {
    this.pendingConfirmation = null;
  }

  protected confirmPendingAction(action: ConfirmationAction): void {
    if (this.confirmationBusy(action)) {
      return;
    }

    this.pendingConfirmation = null;
    if (action === 'complete') {
      this.completeSidequest();
      return;
    }

    if (action === 'delete') {
      this.deleteSidequest();
      return;
    }

    this.leaveSidequest();
  }

  protected confirmationBusy(action: ConfirmationAction): boolean {
    if (action === 'complete') {
      return this.completing;
    }

    if (action === 'delete') {
      return this.deleting;
    }

    return this.leaving;
  }

  protected confirmationEyebrow(action: ConfirmationAction): string {
    if (action === 'delete') {
      return 'Delete sidequest';
    }

    if (action === 'complete') {
      return 'Mark complete';
    }

    return 'Leave sidequest';
  }

  protected confirmationTitle(action: ConfirmationAction): string {
    if (action === 'delete') {
      return 'Hide this sidequest?';
    }

    if (action === 'complete') {
      return 'Mark this as complete?';
    }

    return 'Leave this sidequest?';
  }

  protected confirmationMessage(action: ConfirmationAction): string {
    if (action === 'delete') {
      return 'It will be removed from normal views, including after completion.';
    }

    if (action === 'complete') {
      return 'Participants will see it as completed instead of active.';
    }

    return 'You can join again later if it is still active and has room.';
  }

  protected confirmationConfirmLabel(action: ConfirmationAction): string {
    if (action === 'delete') {
      return this.deleting ? 'Deleting...' : 'Delete';
    }

    if (action === 'complete') {
      return this.completing ? 'Completing...' : 'Complete';
    }

    return this.leaving ? 'Leaving...' : 'Leave';
  }

  protected onEditLocationSearchChange(value: string): void {
    this.editForm.locationName = value;
    this.editForm.locationLabel = null;
    this.editForm.latitude = null;
    this.editForm.longitude = null;
    this.editMapSidequests = [];

    if (value.trim().length < 3) {
      this.editLocationSuggestions = [];
      this.editLocationSearching = false;
      return;
    }

    this.editLocationSearchInput.next(value);
  }

  protected selectEditLocationSuggestion(suggestion: MapboxLocationSuggestion): void {
    this.editLocationSuggestions = [];
    this.editLocationSearching = true;

    this.mapboxSearch
      .retrieve(suggestion)
      .pipe(finalize(() => (this.editLocationSearching = false)))
      .subscribe((selectedLocation) => {
        if (!selectedLocation) {
          this.editErrors = ['Unable to read coordinates for that location. Try another result.'];
          return;
        }

        this.editErrors = [];
        this.editForm.locationName = selectedLocation.placeLabel
          ? `${selectedLocation.locationName}, ${selectedLocation.placeLabel}`
          : selectedLocation.locationName;
        this.editForm.locationLabel = selectedLocation.placeLabel;
        this.editForm.latitude = selectedLocation.latitude;
        this.editForm.longitude = selectedLocation.longitude;
        this.syncEditMapPreview();
      });
  }

  protected applyEditMapSelectedLocation(location: SelectedMapLocation): void {
    this.editErrors = [];
    this.editForm.locationName = location.locationName;
    this.editForm.locationLabel = location.locationName;
    this.editForm.latitude = location.latitude;
    this.editForm.longitude = location.longitude;
    this.editLocationSuggestions = [];
    this.editLocationSearching = false;
    this.syncEditMapPreview();
  }

  protected hasSelectedEditLocation(): boolean {
    return this.editForm.latitude !== null && this.editForm.longitude !== null;
  }

  protected completeSidequest(): void {
    if (!this.sidequest || this.completing || !this.canCompleteSidequest(this.sidequest)) {
      return;
    }

    const sidequestId = this.sidequest.id;
    this.completing = true;
    this.actionMessage = '';

    this.sidequestApi
      .complete(sidequestId)
      .pipe(finalize(() => (this.completing = false)))
      .subscribe({
        next: (response) => {
          this.sidequest = response;
          this.editing = false;
          this.actionMessage = 'Sidequest completed.';
        },
        error: (error: unknown) => {
          this.actionMessage = this.extractErrorMessage(error) || 'Unable to complete this sidequest right now.';
        }
      });
  }

  protected deleteSidequest(): void {
    if (!this.sidequest || this.deleting || !this.canDeleteSidequest(this.sidequest)) {
      return;
    }

    const sidequestId = this.sidequest.id;
    this.deleting = true;
    this.actionMessage = '';

    this.sidequestApi
      .delete(sidequestId)
      .pipe(finalize(() => (this.deleting = false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/home');
        },
        error: (error: unknown) => {
          this.actionMessage = this.extractErrorMessage(error) || 'Unable to delete this sidequest right now.';
        }
      });
  }

  protected leaveSidequest(): void {
    if (!this.sidequest || this.leaving || !this.canLeaveSidequest(this.sidequest)) {
      return;
    }

    const sidequestId = this.sidequest.id;
    this.leaving = true;
    this.actionMessage = '';

    this.sidequestApi
      .leave(sidequestId)
      .pipe(finalize(() => (this.leaving = false)))
      .subscribe({
        next: () => {
          this.actionMessage = 'You left this sidequest.';
          this.loadSidequest(sidequestId);
        },
        error: (error: unknown) => {
          this.actionMessage = this.extractErrorMessage(error) || 'Unable to leave this sidequest right now.';
        }
      });
  }

  protected toggleEditForm(): void {
    if (!this.sidequest) {
      return;
    }

    this.editing = !this.editing;
    this.editErrors = [];
    this.clearConfirmation();
    if (this.editing) {
      this.populateEditForm(this.sidequest);
    }
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Not set';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }

  protected statusLabel(status: string): string {
    if (!status) {
      return 'ACTIVE';
    }

    return status.toUpperCase();
  }

  protected canJoinSidequest(sidequest: SidequestDetailResponse): boolean {
    return !sidequest.currentUserIsCreator
      && !sidequest.currentUserHasJoined
      && this.isActive(sidequest)
      && !this.isSidequestFull(sidequest);
  }

  protected canLeaveSidequest(sidequest: SidequestDetailResponse): boolean {
    return sidequest.currentUserHasJoined && !sidequest.currentUserIsCreator;
  }

  protected isSidequestFull(sidequest: SidequestDetailResponse): boolean {
    return sidequest.maxParticipants !== null && sidequest.participantCount >= sidequest.maxParticipants;
  }

  protected canEditSidequest(sidequest: SidequestDetailResponse): boolean {
    return sidequest.currentUserIsCreator && !this.isDeleted(sidequest);
  }

  protected canCompleteSidequest(sidequest: SidequestDetailResponse): boolean {
    return sidequest.currentUserIsCreator && this.isActive(sidequest);
  }

  protected canDeleteSidequest(sidequest: SidequestDetailResponse): boolean {
    return sidequest.currentUserIsCreator && !this.isDeleted(sidequest);
  }

  protected isActive(sidequest: SidequestDetailResponse): boolean {
    return this.normalizedStatus(sidequest) === 'active';
  }

  protected isCompleted(sidequest: SidequestDetailResponse): boolean {
    return this.normalizedStatus(sidequest) === 'completed';
  }

  protected isExpired(sidequest: SidequestDetailResponse): boolean {
    return this.normalizedStatus(sidequest) === 'expired';
  }

  protected isDeleted(sidequest: SidequestDetailResponse): boolean {
    return this.normalizedStatus(sidequest) === 'deleted';
  }

  private loadSidequest(sidequestId: string): void {
    this.loading = true;
    this.notFound = false;
    this.errorMessage = '';

    this.sidequestApi
      .getById(sidequestId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.sidequest = response;
          if (this.editing) {
            this.populateEditForm(response);
          }
        },
        error: (error: unknown) => {
          this.sidequest = null;
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.notFound = true;
            return;
          }

          this.errorMessage = 'Unable to load this sidequest right now.';
        }
      });
  }

  private populateEditForm(sidequest: SidequestDetailResponse): void {
    this.editForm = {
      title: sidequest.title,
      description: sidequest.description,
      locationName: sidequest.locationName,
      locationLabel: sidequest.locationName,
      latitude: sidequest.latitude,
      longitude: sidequest.longitude,
      maxParticipants: sidequest.maxParticipants,
      expiresAt: this.toDatetimeLocalValue(sidequest.expiresAt)
    };
    this.editLocationSuggestions = [];
    this.editLocationSearching = false;
    this.syncEditMapPreview();
  }

  private buildUpdatePayload(): UpdateSidequestRequest | null {
    this.editErrors = [];
    const title = this.editForm.title.trim();
    const description = this.editForm.description.trim();
    const locationName = this.editForm.locationName.trim();

    if (!title) {
      this.editErrors.push('Title is required.');
    }

    if (!description) {
      this.editErrors.push('Description is required.');
    }

    if (!locationName) {
      this.editErrors.push('Location is required.');
    }

    if (this.editForm.latitude === null || this.editForm.longitude === null) {
      this.editErrors.push('Select a location from the suggestions or map so this sidequest stays mapped correctly.');
    }

    if (this.editForm.maxParticipants !== null && this.editForm.maxParticipants < 1) {
      this.editErrors.push('Max participants must be at least 1.');
    }

    if (this.editErrors.length > 0) {
      return null;
    }

    return {
      title,
      description,
      locationName,
      latitude: this.editForm.latitude,
      longitude: this.editForm.longitude,
      maxParticipants: this.editForm.maxParticipants,
      expiresAt: this.editForm.expiresAt ? new Date(this.editForm.expiresAt).toISOString() : null
    };
  }

  private normalizedStatus(sidequest: SidequestDetailResponse): string {
    return sidequest.status.toLowerCase();
  }

  private syncEditMapPreview(): void {
    if (this.editForm.latitude === null || this.editForm.longitude === null) {
      this.editMapSidequests = [];
      return;
    }

    this.editMapCenter = [this.editForm.longitude, this.editForm.latitude];
    this.editMapSidequests = [
      {
        id: this.sidequest?.id ?? 'editing-sidequest',
        title: this.editForm.title || this.sidequest?.title || 'Editing sidequest',
        description: this.editForm.description || this.sidequest?.description || null,
        locationName: this.editForm.locationName,
        latitude: this.editForm.latitude,
        longitude: this.editForm.longitude,
        status: this.sidequest?.status ?? 'active'
      }
    ];
  }

  private toDatetimeLocalValue(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const errorValue = error as { error?: { message?: string }; message?: string };
    if (errorValue.error?.message && errorValue.error.message.trim()) {
      return errorValue.error.message.trim();
    }

    if (errorValue.message && errorValue.message.trim()) {
      return errorValue.message.trim();
    }

    return null;
  }
}

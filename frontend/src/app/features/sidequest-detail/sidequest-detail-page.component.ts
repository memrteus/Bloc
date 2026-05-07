import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import { SidequestApiService, SidequestDetailResponse } from '../../core/services/sidequest-api.service';

@Component({
  selector: 'app-sidequest-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
          <span class="status" [class.expired]="quest.status === 'expired'" [class.completed]="quest.status === 'completed'">
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
          <button type="button" class="leave-action" *ngIf="canLeaveSidequest(quest)" disabled>
            Leave sidequest
          </button>
          <button type="button" class="quiet-action" *ngIf="isSidequestFull(quest) && !quest.currentUserHasJoined" disabled>
            Full
          </button>

          <div class="creator-actions" *ngIf="quest.currentUserIsCreator">
            <button type="button" disabled>Edit</button>
            <button type="button" disabled>Complete</button>
            <button type="button" disabled>Delete</button>
          </div>
        </section>

        <p class="action-message" *ngIf="actionMessage">{{ actionMessage }}</p>

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
    }

    .primary-action {
      border: 0;
      color: #effbff;
      background: linear-gradient(145deg, #0f6378, #2887a0);
      cursor: pointer;
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
    }
  `]
})
export class SidequestDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly sidequestApi = inject(SidequestApiService);
  private routeSubscription?: Subscription;

  protected sidequest: SidequestDetailResponse | null = null;
  protected loading = false;
  protected joining = false;
  protected notFound = false;
  protected errorMessage = '';
  protected actionMessage = '';

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const sidequestId = params.get('id');
      if (!sidequestId) {
        this.notFound = true;
        return;
      }

      this.loadSidequest(sidequestId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
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
      return 'Active';
    }

    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  protected canJoinSidequest(sidequest: SidequestDetailResponse): boolean {
    return !sidequest.currentUserIsCreator && !sidequest.currentUserHasJoined && !this.isSidequestFull(sidequest);
  }

  protected canLeaveSidequest(sidequest: SidequestDetailResponse): boolean {
    return sidequest.currentUserHasJoined && !sidequest.currentUserIsCreator;
  }

  protected isSidequestFull(sidequest: SidequestDetailResponse): boolean {
    return sidequest.maxParticipants !== null && sidequest.participantCount >= sidequest.maxParticipants;
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
}

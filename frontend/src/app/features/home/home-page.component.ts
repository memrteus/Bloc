import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize, switchMap, tap } from 'rxjs';

import { AuthApiService } from '../../core/services/auth-api.service';
import { MapboxLocationSuggestion, MapboxSearchService } from '../../core/services/mapbox-search.service';
import {
  CreateSidequestRequest,
  DiscoverSidequestResponse,
  SidequestApiService,
  SidequestResponse
} from '../../core/services/sidequest-api.service';
import {
  MapUserLocation,
  SelectedMapLocation,
  SidequestMapItem,
  SidequestMapComponent
} from '../../shared/components/sidequest-map/sidequest-map.component';

interface CreateSidequestForm {
  title: string;
  description: string;
  category: string;
  locationName: string;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  maxParticipants: number | null;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidequestMapComponent],
  template: `
    <section class="dashboard-wrap">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">B</div>
          <div>
            <p class="brand-name">Bloc</p>
            <p class="brand-sub">Amherst campus</p>
          </div>
        </div>

        <nav class="menu">
          <button type="button" class="menu-item" [class.active]="activeMainTab === 'discover'" (click)="showDiscoverTab()">Browse groups</button>
          <button type="button" class="menu-item" [class.active]="mapDrawerOpen" (click)="openMapDrawer()">Map</button>
          <button type="button" class="menu-item" [class.active]="activeMainTab === 'create'" (click)="showCreateTab()">Create sidequest</button>
          <a class="menu-item" routerLink="/profile">Profile</a>
        </nav>

        <div class="sidebar-panel">
          <p class="mono-title">My Sidequests</p>
          <p *ngIf="myJoinedLoading">Loading...</p>
          <p class="sidebar-error" *ngIf="!myJoinedLoading && myJoinedError">{{ myJoinedError }}</p>
          <button
            type="button"
            class="sidebar-quest"
            *ngFor="let sidequest of myJoinedPreview"
            (click)="openSidequestDetails(sidequest)"
          >
            {{ sidequest.title }}
          </button>
          <p *ngIf="!myJoinedLoading && !myJoinedError && myJoinedSidequests.length === 0">No quests yet</p>
          <button
            type="button"
            class="sidebar-link"
            *ngIf="!myJoinedLoading && myJoinedSidequests.length > 5"
            (click)="showMySidequestsTab()"
          >
            View all
          </button>
        </div>

        <div class="user-card">
          <div class="avatar">{{ userInitial }}</div>
          <div>
            <p class="name">{{ displayName }}</p>
            <p class="status">Online now · Profile</p>
          </div>
        </div>

        <button type="button" class="logout-btn" (click)="logout()">Log out</button>
      </aside>

      <main class="dashboard-main">
        <header class="main-header">
          <div>
            <p class="mono-title">{{ mainEyebrow() }}</p>
            <h1>{{ mainTitle() }}</h1>
          </div>
          <div class="header-actions" *ngIf="activeMainTab === 'discover'">
            <input
              class="search-input"
              type="search"
              placeholder="Search groups..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange()"
            />
            <button type="button" class="ghost-btn" (click)="openMapDrawer()">Map</button>
            <button type="button" class="primary-btn" (click)="showCreateTab()">Create sidequest</button>
          </div>
          <div class="header-actions" *ngIf="activeMainTab === 'create'">
            <button type="button" class="primary-btn" (click)="showDiscoverTab()">Back to discovery</button>
          </div>
          <div class="header-actions" *ngIf="activeMainTab === 'my'">
            <button type="button" class="primary-btn" (click)="showDiscoverTab()">Browse groups</button>
          </div>
        </header>

        <ng-container *ngIf="activeMainTab === 'discover'; else createTabContent">
          <div class="filters">
            <button
              type="button"
              [class.active]="selectedCategory === null"
              (click)="applyCategoryFilter(null)"
            >
              All
            </button>
            <button
              type="button"
              *ngFor="let category of discoveredCategories"
              [class.active]="selectedCategory === category"
              (click)="applyCategoryFilter(category)"
            >
              {{ category }}
            </button>
          </div>

          <article class="banner">
            <div *ngIf="featuredSidequest as featured; else noFeaturedSidequest">
              <p class="mono-title">Sidequest nearby</p>
              <h2>{{ featured.title }}</h2>
              <p class="meta">
                {{ featured.locationName || 'Campus' }} | {{ featured.category || 'General' }} | {{ getRelativeTime(featured.createdAt) }}
              </p>
            </div>
            <ng-template #noFeaturedSidequest>
              <div>
                <p class="mono-title">Sidequest nearby</p>
                <h2>No active sidequests yet</h2>
                <p class="meta">Create one to get discovery started.</p>
              </div>
            </ng-template>
            <button type="button" class="ghost-btn" (click)="openMapDrawer()">View map</button>
          </article>

          <p class="meta" *ngIf="isLoading">Loading sidequests...</p>
          <p class="meta" *ngIf="errorMessage">{{ errorMessage }}</p>

          <section class="group-grid">
            <article
              class="group-card"
              *ngFor="let sidequest of sidequests; index as i"
              [style.--delay.ms]="i * 45"
              role="button"
              tabindex="0"
              (click)="openSidequestDetails(sidequest)"
              (keydown.enter)="openSidequestDetails(sidequest)"
            >
              <div class="card-top">
                <div class="icon-chip">{{ getCategoryInitial(sidequest.category) }}</div>
                <div>
                  <h3>{{ sidequest.title }}</h3>
                  <p>{{ sidequest.maxParticipants ?? 0 }} max participants</p>
                </div>
              </div>
              <p class="desc">{{ sidequest.description }}</p>
              <div class="card-foot">
                <span class="tag">{{ sidequest.category || 'General' }}</span>
                <span [class]="isSidequestActive(sidequest) ? 'status active' : 'status quiet'">
                  {{ isSidequestActive(sidequest) ? 'Active' : 'Closed' }}
                </span>
              </div>
            </article>
          </section>
        </ng-container>

        <ng-template #createTabContent>
          <ng-container *ngIf="activeMainTab === 'my'; else createFormContent">
            <section class="my-sidequests-tab">
              <p class="meta" *ngIf="myJoinedLoading">Loading your sidequests...</p>
              <p class="meta error-text" *ngIf="!myJoinedLoading && myJoinedError">{{ myJoinedError }}</p>
              <p class="meta" *ngIf="!myJoinedLoading && !myJoinedError && myJoinedSidequests.length === 0">
                You haven't joined any sidequests yet.
              </p>

              <div
                class="my-sidequest-scroll"
                [class.compact]="myJoinedSidequests.length > 4"
                *ngIf="!myJoinedLoading && !myJoinedError && myJoinedSidequests.length > 0"
              >
                <section class="my-sidequest-section" *ngIf="myParticipantSidequests.length > 0">
                  <p class="participant-title">Joined</p>
                  <section class="group-grid my-sidequest-grid">
                    <article
                      class="group-card"
                      *ngFor="let sidequest of myParticipantSidequests; index as i"
                      [style.--delay.ms]="i * 45"
                      role="button"
                      tabindex="0"
                      (click)="openSidequestDetails(sidequest)"
                      (keydown.enter)="openSidequestDetails(sidequest)"
                    >
                      <div class="card-top">
                        <div class="icon-chip">{{ getCategoryInitial(sidequest.category) }}</div>
                        <div>
                          <h3>{{ sidequest.title }}</h3>
                          <p>{{ sidequest.maxParticipants ?? 0 }} max participants</p>
                        </div>
                      </div>
                      <p class="desc">{{ sidequest.description }}</p>
                      <div class="card-foot">
                        <span class="tag">{{ sidequest.category || 'General' }}</span>
                        <span [class]="isSidequestActive(sidequest) ? 'status active' : 'status quiet'">
                          {{ isSidequestActive(sidequest) ? 'Active' : 'Closed' }}
                        </span>
                      </div>
                    </article>
                  </section>
                </section>

                <section class="my-sidequest-section" *ngIf="myCreatedSidequests.length > 0">
                  <p class="participant-title">Created by you</p>
                  <section class="group-grid my-sidequest-grid">
                    <article
                      class="group-card"
                      *ngFor="let sidequest of myCreatedSidequests; index as i"
                      [style.--delay.ms]="(myParticipantSidequests.length + i) * 45"
                      role="button"
                      tabindex="0"
                      (click)="openSidequestDetails(sidequest)"
                      (keydown.enter)="openSidequestDetails(sidequest)"
                    >
                      <div class="card-top">
                        <div class="icon-chip">{{ getCategoryInitial(sidequest.category) }}</div>
                        <div>
                          <h3>{{ sidequest.title }}</h3>
                          <p>{{ sidequest.maxParticipants ?? 0 }} max participants</p>
                        </div>
                      </div>
                      <p class="desc">{{ sidequest.description }}</p>
                      <div class="card-foot">
                        <span class="tag">{{ sidequest.category || 'General' }}</span>
                        <span [class]="isSidequestActive(sidequest) ? 'status active' : 'status quiet'">
                          {{ isSidequestActive(sidequest) ? 'Active' : 'Closed' }}
                        </span>
                      </div>
                    </article>
                  </section>
                </section>
              </div>
            </section>
          </ng-container>

          <ng-template #createFormContent>
          <section class="create-tab-card">
            <p class="mono-title">Create sidequest</p>
            <h2>Create a new group</h2>

            <form class="simple-create-form" (ngSubmit)="submitCreateSidequest()">
              <label>
                Title
                <input name="title" type="text" [(ngModel)]="createForm.title" required minlength="3" placeholder="Soccer pickup game" />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  [(ngModel)]="createForm.description"
                  required
                  minlength="10"
                  rows="4"
                  placeholder="Meet at the rec field for a quick game."
                ></textarea>
              </label>

              <label>
                Category
                <input name="category" type="text" [(ngModel)]="createForm.category" required placeholder="Sports" />
              </label>

              <label>
                Location
                <div class="location-field">
                  <input
                    name="locationName"
                    type="text"
                    [(ngModel)]="createForm.locationName"
                    (ngModelChange)="onLocationSearchChange($event)"
                    required
                    autocomplete="off"
                    placeholder="Search for a place or address"
                  />

                  <div class="location-suggestions" *ngIf="locationSuggestions.length > 0">
                    <button
                      type="button"
                      *ngFor="let suggestion of locationSuggestions"
                      (click)="selectLocationSuggestion(suggestion)"
                    >
                      <span>{{ suggestion.name }}</span>
                      <small *ngIf="suggestion.placeFormatted || suggestion.fullAddress">
                        {{ suggestion.fullAddress || suggestion.placeFormatted }}
                      </small>
                    </button>
                  </div>
                </div>
                <p class="field-note" *ngIf="locationSearching">Searching locations...</p>
                <p class="field-note selected" *ngIf="hasSelectedLocation()">
                  Selected: {{ createForm.locationLabel || createForm.locationName }}
                </p>
              </label>

              <section class="create-map-picker">
                <p class="participant-title">Pick on map</p>
                <app-sidequest-map
                  [sidequests]="[]"
                  [selectableLocationMode]="true"
                  (locationSelected)="applyMapSelectedLocation($event)"
                ></app-sidequest-map>
              </section>

              <label>
                Max participants
                <input name="maxParticipants" type="number" min="1" [(ngModel)]="createForm.maxParticipants" />
              </label>

              <div class="panel-errors" *ngIf="createErrors.length > 0">
                <p class="participant-title">Please fix these fields:</p>
                <ul>
                  <li *ngFor="let error of createErrors">{{ error }}</li>
                </ul>
              </div>

              <button type="submit" class="join-btn" [disabled]="creatingSidequest">{{ creatingSidequest ? 'Creating...' : 'Create sidequest' }}</button>
              <p class="meta" *ngIf="createMessage">{{ createMessage }}</p>
            </form>
          </section>
          </ng-template>
        </ng-template>

        <section class="quest-panel-backdrop" *ngIf="selectedSidequest || detailsLoading" (click)="closeSidequestDetails()">
          <article class="quest-panel" (click)="$event.stopPropagation()">
            <button type="button" class="panel-close" (click)="closeSidequestDetails()">Close</button>

            <ng-container *ngIf="selectedSidequest as details; else detailsLoadingOrError">
              <p class="mono-title">Sidequest details</p>
              <h2>{{ details.title }}</h2>
              <p class="meta">{{ details.locationName || 'Campus' }} | {{ details.category || 'General' }}</p>

              <p class="panel-description">{{ details.description }}</p>

              <div class="participant-block">
                <p class="participant-title">People in this quest ({{ details.participantDisplayNames.length }})</p>
                <ul *ngIf="details.participantDisplayNames.length > 0; else noParticipants">
                  <li *ngFor="let participantName of details.participantDisplayNames">{{ participantName }}</li>
                </ul>
                <ng-template #noParticipants>
                  <p class="meta">No participants yet.</p>
                </ng-template>
              </div>

              <button
                type="button"
                class="join-btn"
                [disabled]="joiningSidequest || hasJoinedSelectedSidequest() || !isDetailSidequestActive()"
                (click)="joinSelectedSidequest()"
              >
                {{ joinButtonLabel() }}
              </button>
              <p class="meta" *ngIf="joinMessage">{{ joinMessage }}</p>
            </ng-container>

            <ng-template #detailsLoadingOrError>
              <p class="meta" *ngIf="detailsLoading">Loading sidequest details...</p>
              <p class="meta" *ngIf="detailsError">{{ detailsError }}</p>
            </ng-template>
          </article>
        </section>

        <div class="map-drawer-backdrop" *ngIf="mapDrawerOpen" (click)="closeMapDrawer()"></div>
        <aside class="map-drawer" *ngIf="mapDrawerOpen" aria-label="Sidequest map drawer">
          <header class="map-drawer-header">
            <div>
              <p class="mono-title">Nearby map</p>
              <h2>Sidequests near you</h2>
            </div>
            <button type="button" class="panel-close" (click)="closeMapDrawer()">Close</button>
          </header>

          <section class="radius-control">
            <label for="map-radius">Showing sidequests within {{ mapRadiusMiles }} miles</label>
            <input
              id="map-radius"
              type="range"
              min="1"
              max="100"
              step="1"
              [ngModel]="mapRadiusMiles"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="onMapRadiusChange($event)"
            />
            <p class="field-note" *ngIf="!mapUserLocation">Use your location to filter sidequests by radius.</p>
            <p class="field-note" *ngIf="mapLoading">Loading nearby sidequests...</p>
            <p class="field-note error" *ngIf="mapMessage">{{ mapMessage }}</p>
          </section>

          <app-sidequest-map
            class="drawer-map"
            [sidequests]="mapSidequests"
            [requestLocationOnInit]="true"
            [joinedSidequestIds]="joinedMapSidequestIds"
            [joiningSidequestIds]="joiningMapSidequestIds"
            [currentUserId]="currentUserId"
            (userLocationChange)="onMapUserLocation($event)"
            (joinSidequest)="joinSidequestFromMap($event)"
            (openSidequest)="openSidequestDetails($event)"
          ></app-sidequest-map>
        </aside>
      </main>
    </section>
  `,
  styles: [`
    :host {
      display: grid;
      min-height: calc(100vh - 2rem);
      align-content: center;
      padding: 1.25rem 1rem 1.75rem;
    }

    .dashboard-wrap {
      max-width: 1220px;
      width: 100%;
      margin: 0 auto;
      border: 1px solid rgba(167, 182, 194, 0.46);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(8px);
      box-shadow: 0 24px 56px rgba(14, 31, 45, 0.14);
      display: grid;
      grid-template-columns: 248px 1fr;
      overflow: hidden;
    }

    .sidebar {
      background: linear-gradient(180deg, #143142 0%, #102534 100%);
      color: #d6e8f0;
      border-right: 1px solid rgba(159, 183, 195, 0.24);
      padding: 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0 0.4rem 0.35rem;
    }

    .mark {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(145deg, #2f9bb8, #6db1c6);
      color: #f4fcff;
      font-weight: 700;
      display: grid;
      place-items: center;
    }

    .brand-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .brand-sub {
      margin: 0.12rem 0 0;
      color: #8eb1c0;
      font-size: 0.74rem;
    }

    .menu {
      display: grid;
      gap: 0.35rem;
    }

    .menu-item {
      text-decoration: none;
      color: #b7d1dc;
      border: 0;
      border-radius: 10px;
      padding: 0.58rem 0.7rem;
      font-size: 0.9rem;
      transition: background 0.15s ease, color 0.15s ease;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }

    .menu-item:hover {
      color: #eff9fd;
      background: rgba(132, 184, 204, 0.15);
    }

    .menu-item.active {
      color: #f3fbff;
      background: rgba(132, 184, 204, 0.22);
    }

    .sidebar-panel {
      margin-top: 0.4rem;
      border: 1px solid rgba(183, 209, 220, 0.2);
      border-radius: 12px;
      padding: 0.8rem 0.8rem 0.65rem;
      background: rgba(18, 48, 64, 0.58);
    }

    .sidebar-panel p {
      margin: 0 0 0.5rem;
      font-size: 0.84rem;
      color: #c3dae4;
    }

    .sidebar-panel .sidebar-error {
      color: #f1b7b7;
    }

    .sidebar-quest,
    .sidebar-link {
      border: 0;
      background: transparent;
      color: #8ed5e7;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0;
      cursor: pointer;
    }

    .sidebar-quest {
      width: 100%;
      display: block;
      margin: 0 0 0.5rem;
      color: #c3dae4;
      font-size: 0.84rem;
      font-weight: 600;
      overflow: hidden;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-quest:hover {
      color: #eff9fd;
    }

    .mono-title {
      margin: 0;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #70b4cb;
    }

    .user-card {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      border-top: 1px solid rgba(183, 209, 220, 0.2);
      padding-top: 0.95rem;
    }

    .logout-btn {
      border: 1px solid rgba(183, 209, 220, 0.35);
      border-radius: 10px;
      background: rgba(16, 37, 52, 0.72);
      color: #d6e8f0;
      padding: 0.5rem 0.7rem;
      font-size: 0.82rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .logout-btn:hover {
      background: rgba(132, 184, 204, 0.2);
      color: #eff9fd;
    }

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #2f9bb8, #6db1c6);
      font-weight: 700;
      color: #eff9fc;
    }

    .name {
      margin: 0;
      font-size: 0.84rem;
      font-weight: 600;
    }

    .status {
      margin: 0.12rem 0 0;
      color: #88d8a5;
      font-size: 0.7rem;
    }

    .dashboard-main {
      position: relative;
      padding: 1.25rem 1.35rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .main-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .main-header h1 {
      margin: 0.28rem 0 0;
      font-size: clamp(1.55rem, 2.6vw, 2rem);
      color: #122433;
      letter-spacing: -0.02em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .search-input {
      border: 1px solid #c4d4dc;
      background: #f4fafc;
      color: #68818f;
      border-radius: 999px;
      padding: 0.48rem 0.86rem;
      font-size: 0.84rem;
      min-width: 180px;
      outline: none;
    }

    .search-input:focus {
      border-color: #2f9bb8;
      box-shadow: 0 0 0 2px rgba(47, 155, 184, 0.15);
    }

    .primary-btn,
    .ghost-btn {
      border-radius: 10px;
      text-decoration: none;
      font-size: 0.84rem;
      font-weight: 700;
      padding: 0.5rem 0.86rem;
    }

    .primary-btn {
      color: #effbff;
      background: linear-gradient(145deg, #0f6378, #2887a0);
    }

    .filters {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .filters button {
      border: 1px solid #cad8df;
      cursor: pointer;
      font-size: 0.75rem;
      border-radius: 999px;
      padding: 0.37rem 0.7rem;
      color: #5d7583;
      background: #f3f8fb;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    .filters button.active {
      border-color: #2f9bb8;
      color: #0f5569;
      background: #ddf3f9;
    }

    .filters button:hover {
      border-color: #76b6c9;
      color: #1c6277;
      background: #e8f6fb;
    }

    .banner {
      border: 1px solid rgba(47, 155, 184, 0.35);
      background: linear-gradient(90deg, rgba(47, 155, 184, 0.12) 0%, rgba(47, 155, 184, 0.04) 100%);
      border-radius: 14px;
      padding: 0.9rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .banner h2 {
      margin: 0.26rem 0 0;
      color: #123345;
      font-size: 1.05rem;
    }

    .meta {
      margin: 0.3rem 0 0;
      color: #56717f;
      font-size: 0.83rem;
    }

    .ghost-btn {
      color: #0f5569;
      border: 1px solid #66aec5;
      background: #f1faff;
      white-space: nowrap;
      cursor: pointer;
    }

    .group-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.72rem;
    }

    .group-card {
      border: 1px solid #cfdbe1;
      background: linear-gradient(180deg, #fcfeff 0%, #f6fbfd 100%);
      border-radius: 14px;
      padding: 0.9rem;
      animation: card-rise 0.42s ease both;
      animation-delay: var(--delay, 0ms);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .group-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(17, 59, 77, 0.14);
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.55rem;
    }

    .icon-chip {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #dff2f9;
      color: #0f6378;
      display: grid;
      place-items: center;
      font-weight: 700;
    }

    .group-card h3 {
      margin: 0;
      font-size: 0.92rem;
      color: #122b39;
    }

    .group-card p {
      margin: 0.14rem 0 0;
      color: #5c7482;
      font-size: 0.75rem;
    }

    .desc {
      margin: 0.25rem 0 0.72rem;
      color: #4e6674;
      font-size: 0.8rem;
      line-height: 1.5;
      min-height: 2.35rem;
    }

    .card-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tag {
      border-radius: 999px;
      padding: 0.24rem 0.55rem;
      font-size: 0.68rem;
      color: #0f5569;
      background: #ddf3f9;
      border: 1px solid #b8deea;
    }

    .status {
      font-size: 0.68rem;
      font-weight: 600;
    }

    .status.active {
      color: #159562;
    }

    .status.quiet {
      color: #778c99;
    }

    .quest-panel-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(7, 19, 27, 0.44);
      display: grid;
      place-items: center;
      z-index: 60;
      padding: 1rem;
    }

    .map-drawer-backdrop {
      position: absolute;
      inset: 0;
      z-index: 45;
      background: rgba(7, 19, 27, 0.22);
    }

    .map-drawer {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      width: min(520px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      border-left: 1px solid #c6d9e3;
      background: #fafdff;
      box-shadow: -20px 0 42px rgba(10, 32, 44, 0.22);
      padding: 1rem;
    }

    .map-drawer-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .map-drawer-header h2 {
      margin: 0.28rem 0 0;
      color: #122433;
      font-size: 1.18rem;
    }

    .radius-control {
      display: grid;
      gap: 0.38rem;
      border: 1px solid #d3e4eb;
      border-radius: 10px;
      background: #f5fbfe;
      padding: 0.7rem;
    }

    .radius-control label {
      color: #14384a;
      font-size: 0.84rem;
      font-weight: 700;
    }

    .radius-control input {
      width: 100%;
      accent-color: #0f766e;
    }

    .drawer-map {
      min-height: 0;
      flex: 1;
    }

    .quest-panel {
      width: min(680px, 96vw);
      max-height: 88vh;
      overflow-y: auto;
      border-radius: 18px;
      background: #fafdff;
      border: 1px solid #c6d9e3;
      box-shadow: 0 22px 50px rgba(10, 32, 44, 0.28);
      padding: 1.1rem 1.2rem 1.2rem;
    }

    .panel-close {
      border: 1px solid #b8d2df;
      background: #edf8fc;
      color: #0f5569;
      border-radius: 10px;
      padding: 0.35rem 0.6rem;
      font-size: 0.78rem;
      font-weight: 700;
      margin-left: auto;
      display: block;
      cursor: pointer;
    }

    .panel-description {
      margin: 0.7rem 0 0;
      color: #34505f;
      line-height: 1.5;
      font-size: 0.93rem;
    }

    .create-tab-card {
      border: 1px solid #c6d9e3;
      border-radius: 16px;
      background: #fafdff;
      box-shadow: 0 12px 28px rgba(10, 32, 44, 0.1);
      padding: 1rem 1rem 1.1rem;
    }

    .my-sidequests-tab {
      display: grid;
      gap: 0.85rem;
    }

    .my-sidequest-scroll {
      display: grid;
      gap: 1rem;
    }

    .my-sidequest-section {
      display: grid;
      gap: 0.55rem;
    }

    .error-text {
      color: #a33c3c;
      font-weight: 700;
    }

    .my-sidequest-scroll.compact {
      max-height: 500px;
      overflow-y: auto;
      padding-right: 0.35rem;
    }

    .my-sidequest-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .simple-create-form {
      margin-top: 0.8rem;
      display: grid;
      gap: 0.65rem;
    }

    .simple-create-form label {
      display: grid;
      gap: 0.35rem;
      color: #14384a;
      font-size: 0.84rem;
      font-weight: 600;
    }

    .simple-create-form input,
    .simple-create-form textarea {
      border: 1px solid #c4d6df;
      border-radius: 10px;
      padding: 0.56rem 0.68rem;
      background: #f9fdff;
      color: #123345;
      font: inherit;
    }

    .location-field {
      position: relative;
    }

    .location-field input {
      width: 100%;
    }

    .location-suggestions {
      position: absolute;
      top: calc(100% + 0.35rem);
      left: 0;
      right: 0;
      z-index: 35;
      overflow: hidden;
      border: 1px solid #c4d6df;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 16px 34px rgba(10, 32, 44, 0.18);
    }

    .location-suggestions button {
      width: 100%;
      border: 0;
      border-bottom: 1px solid #e2edf2;
      background: #ffffff;
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

    .field-note.error {
      color: #a33c3c;
      font-weight: 700;
    }

    .simple-create-form textarea {
      resize: vertical;
      min-height: 92px;
    }

    .create-map-picker {
      display: grid;
      gap: 0.45rem;
      border: 1px solid #d3e4eb;
      border-radius: 12px;
      background: #f5fbfe;
      padding: 0.7rem;
    }

    .panel-errors {
      border: 1px solid #f1c3c3;
      border-radius: 12px;
      background: #fff7f7;
      padding: 0.65rem 0.75rem;
    }

    .panel-errors ul {
      margin: 0.45rem 0 0;
      padding-left: 1rem;
      display: grid;
      gap: 0.22rem;
      color: #7f2d2d;
      font-size: 0.8rem;
    }

    .participant-block {
      margin-top: 0.85rem;
      border: 1px solid #d3e4eb;
      border-radius: 12px;
      background: #f5fbfe;
      padding: 0.75rem;
    }

    .participant-title {
      margin: 0;
      color: #14384a;
      font-size: 0.83rem;
      font-weight: 700;
    }

    .participant-block ul {
      margin: 0.55rem 0 0;
      padding-left: 1rem;
      display: grid;
      gap: 0.32rem;
    }

    .participant-block li {
      color: #3f5b6a;
      font-size: 0.82rem;
    }

    .join-btn {
      margin-top: 0.9rem;
      width: 100%;
      border: none;
      border-radius: 11px;
      padding: 0.7rem 0.8rem;
      font-size: 0.92rem;
      font-weight: 700;
      color: #f2fbff;
      background: linear-gradient(145deg, #0f6378, #2887a0);
      cursor: pointer;
    }

    .join-btn[disabled] {
      opacity: 0.65;
      cursor: not-allowed;
    }

    @keyframes card-rise {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 1080px) {
      .group-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      :host {
        min-height: auto;
        align-content: start;
        padding: 0.75rem 0.75rem 1rem;
      }

      .dashboard-wrap {
        grid-template-columns: 1fr;
      }

      .sidebar {
        border-right: none;
        border-bottom: 1px solid rgba(159, 183, 195, 0.24);
      }

      .main-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .search-input {
        flex: 1;
        min-width: 0;
      }

      .group-grid {
        grid-template-columns: 1fr;
      }

      .my-sidequest-grid {
        grid-template-columns: 1fr;
      }

      .map-drawer {
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .dashboard-main {
        padding: 1rem;
      }

      .banner {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class HomePageComponent implements OnInit, OnDestroy {
  private readonly sidequestApi = inject(SidequestApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly mapboxSearch = inject(MapboxSearchService);
  private readonly router = inject(Router);
  private readonly locationSearchInput = new Subject<string>();
  private readonly mapRadiusInput = new Subject<number>();
  private refreshTimer?: ReturnType<typeof setInterval>;
  private locationSearchSubscription?: Subscription;
  private mapRadiusSubscription?: Subscription;

  private allSidequests: DiscoverSidequestResponse[] = [];
  protected sidequests: DiscoverSidequestResponse[] = [];
  protected featuredSidequest: DiscoverSidequestResponse | null = null;
  protected discoveredCategories: string[] = [];
  protected myJoinedSidequests: DiscoverSidequestResponse[] = [];
  protected myJoinedPreview: DiscoverSidequestResponse[] = [];
  protected myCreatedSidequests: DiscoverSidequestResponse[] = [];
  protected myParticipantSidequests: DiscoverSidequestResponse[] = [];
  protected activeMainTab: 'discover' | 'create' | 'my' = 'discover';
  protected selectedCategory: string | null = null;
  protected searchTerm = '';
  protected displayName = 'Profile';
  protected userInitial = 'P';
  protected currentUserId: string | null = null;
  protected selectedSidequest: SidequestResponse | null = null;
  protected detailsLoading = false;
  protected detailsError = '';
  protected joiningSidequest = false;
  protected joinMessage = '';
  protected creatingSidequest = false;
  protected createErrors: string[] = [];
  protected createMessage = '';
  protected isLoading = false;
  protected errorMessage = '';
  protected myJoinedLoading = false;
  protected myJoinedError = '';
  protected mapDrawerOpen = false;
  protected mapRadiusMiles = 25;
  protected mapUserLocation: MapUserLocation | null = null;
  protected mapSidequests: DiscoverSidequestResponse[] = [];
  protected mapLoading = false;
  protected mapMessage = '';
  protected joinedMapSidequestIds: string[] = [];
  protected joiningMapSidequestIds: string[] = [];
  protected locationSuggestions: MapboxLocationSuggestion[] = [];
  protected locationSearching = false;
  protected createForm: CreateSidequestForm = {
    title: '',
    description: '',
    category: '',
    locationName: '',
    locationLabel: null,
    latitude: null,
    longitude: null,
    maxParticipants: 8
  };

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadSidequests(true);
    this.loadMyJoinedSidequests(true);
    this.locationSearchSubscription = this.locationSearchInput
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => {
          this.locationSearching = true;
        }),
        switchMap((query) => this.mapboxSearch.suggest(query).pipe(finalize(() => (this.locationSearching = false))))
      )
      .subscribe((suggestions) => {
        this.locationSuggestions = suggestions;
      });
    this.mapRadiusSubscription = this.mapRadiusInput
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => this.loadNearbySidequests());
    this.refreshTimer = setInterval(() => {
      this.loadSidequests(false);
      this.loadMyJoinedSidequests(false);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.locationSearchSubscription?.unsubscribe();
    this.mapRadiusSubscription?.unsubscribe();
  }

  protected applyCategoryFilter(category: string | null): void {
    this.selectedCategory = category;
    this.applyClientFilters();
    if (this.mapDrawerOpen && this.mapUserLocation) {
      this.loadNearbySidequests();
    }
  }

  protected onSearchChange(): void {
    this.applyClientFilters();
    if (this.mapDrawerOpen && this.mapUserLocation) {
      this.loadNearbySidequests();
    }
  }

  protected onLocationSearchChange(value: string): void {
    this.createForm.locationName = value;
    this.createForm.locationLabel = null;
    this.createForm.latitude = null;
    this.createForm.longitude = null;

    if (value.trim().length < 3) {
      this.locationSuggestions = [];
      this.locationSearching = false;
      return;
    }

    this.locationSearchInput.next(value);
  }

  protected selectLocationSuggestion(suggestion: MapboxLocationSuggestion): void {
    this.locationSuggestions = [];
    this.locationSearching = true;

    this.mapboxSearch
      .retrieve(suggestion)
      .pipe(finalize(() => (this.locationSearching = false)))
      .subscribe((selectedLocation) => {
        if (!selectedLocation) {
          this.createErrors = ['Unable to read coordinates for that location. Try another result.'];
          return;
        }

        this.createErrors = [];
        this.createForm.locationName = selectedLocation.placeLabel
          ? `${selectedLocation.locationName}, ${selectedLocation.placeLabel}`
          : selectedLocation.locationName;
        this.createForm.locationLabel = selectedLocation.placeLabel;
        this.createForm.latitude = selectedLocation.latitude;
        this.createForm.longitude = selectedLocation.longitude;
      });
  }

  protected applyMapSelectedLocation(location: SelectedMapLocation): void {
    this.createErrors = [];
    this.createForm.locationName = location.locationName;
    this.createForm.locationLabel = location.locationName;
    this.createForm.latitude = location.latitude;
    this.createForm.longitude = location.longitude;
    this.locationSuggestions = [];
    this.locationSearching = false;
  }

  protected hasSelectedLocation(): boolean {
    return this.createForm.latitude !== null && this.createForm.longitude !== null;
  }

  protected getCategoryInitial(category: string | null | undefined): string {
    if (!category || !category.trim()) {
      return 'SQ';
    }

    return category.trim().slice(0, 2).toUpperCase();
  }

  protected isSidequestActive(sidequest: DiscoverSidequestResponse): boolean {
    return sidequest.status.toLowerCase() === 'active';
  }

  protected getRelativeTime(isoTime: string): string {
    const eventTime = new Date(isoTime).getTime();
    const deltaMinutes = Math.max(0, Math.floor((Date.now() - eventTime) / 60000));

    if (deltaMinutes < 1) {
      return 'just now';
    }

    if (deltaMinutes < 60) {
      return `${deltaMinutes} min ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) {
      return `${deltaHours} hr ago`;
    }

    const deltaDays = Math.floor(deltaHours / 24);
    return `${deltaDays} day${deltaDays > 1 ? 's' : ''} ago`;
  }

  protected mainEyebrow(): string {
    if (this.activeMainTab === 'my') {
      return 'Joined sidequests';
    }

    return this.activeMainTab === 'discover' ? 'Community feed' : 'Create sidequest';
  }

  protected mainTitle(): string {
    if (this.activeMainTab === 'my') {
      return 'My Sidequests';
    }

    return this.activeMainTab === 'discover' ? 'Browse groups' : 'Create sidequest';
  }

  protected openSidequestDetails(sidequest: { id?: string | number | null }): void {
    const sidequestId = sidequest.id?.toString();
    if (!sidequestId) {
      return;
    }

    void this.router.navigate(['/sidequests', sidequestId]);
  }

  protected showDiscoverTab(): void {
    this.activeMainTab = 'discover';
    this.mapDrawerOpen = false;
  }

  protected showCreateTab(): void {
    this.activeMainTab = 'create';
    this.mapDrawerOpen = false;
    this.closeSidequestDetails();
    this.createErrors = [];
    this.createMessage = '';
  }

  protected showMySidequestsTab(): void {
    this.activeMainTab = 'my';
    this.mapDrawerOpen = false;
    this.closeSidequestDetails();
    if (this.myJoinedSidequests.length === 0 && !this.myJoinedLoading) {
      this.loadMyJoinedSidequests(true);
    }
  }

  protected openMapDrawer(): void {
    this.activeMainTab = 'discover';
    this.closeSidequestDetails();
    this.mapSidequests = this.filterMapSidequests(this.allSidequests);
    this.mapMessage = '';
    this.mapDrawerOpen = true;
  }

  protected closeMapDrawer(): void {
    this.mapDrawerOpen = false;
  }

  protected onMapUserLocation(location: MapUserLocation): void {
    this.mapUserLocation = location;
    this.loadNearbySidequests();
  }

  protected onMapRadiusChange(radiusMiles: number | string): void {
    this.mapRadiusMiles = Number(radiusMiles);
    if (this.mapUserLocation) {
      this.mapRadiusInput.next(this.mapRadiusMiles);
    }
  }

  protected joinSidequestFromMap(sidequest: SidequestMapItem): void {
    const sidequestId = sidequest.id?.toString();
    if (!sidequestId || this.joiningMapSidequestIds.includes(sidequestId) || this.joinedMapSidequestIds.includes(sidequestId)) {
      return;
    }

    this.mapMessage = '';
    this.joiningMapSidequestIds = [...this.joiningMapSidequestIds, sidequestId];

    this.sidequestApi
      .join(sidequestId)
      .pipe(
        finalize(() => {
          this.joiningMapSidequestIds = this.joiningMapSidequestIds.filter((id) => id !== sidequestId);
        })
      )
      .subscribe({
        next: () => {
          this.joinedMapSidequestIds = [...new Set([...this.joinedMapSidequestIds, sidequestId])];
          this.mapMessage = 'Joined sidequest.';
          this.loadMyJoinedSidequests(false);
          this.loadNearbySidequests();
          this.loadSidequests(false);
        },
        error: (error: unknown) => {
          this.mapMessage = this.extractErrorMessage(error) || 'Unable to join this sidequest from the map.';
        }
      });
  }

  protected logout(): void {
    this.authApi
      .logout()
      .pipe(
        finalize(() => {
          this.authApi.clearSession();
          void this.router.navigateByUrl('/login');
        })
      )
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }

  protected closeSidequestDetails(): void {
    this.selectedSidequest = null;
    this.detailsError = '';
    this.joinMessage = '';
    this.detailsLoading = false;
  }

  protected joinSelectedSidequest(): void {
    if (!this.selectedSidequest || this.joiningSidequest || this.hasJoinedSelectedSidequest()) {
      return;
    }

    this.joiningSidequest = true;
    this.joinMessage = '';

    this.sidequestApi
      .join(this.selectedSidequest.id)
      .pipe(finalize(() => (this.joiningSidequest = false)))
      .subscribe({
        next: (response) => {
          this.selectedSidequest = response;
          this.joinMessage = 'You joined this quest.';
          this.joinedMapSidequestIds = [...new Set([...this.joinedMapSidequestIds, response.id])];
          this.loadMyJoinedSidequests(false);
          this.loadSidequests(false);
        },
        error: () => {
          this.joinMessage = 'Unable to join this quest right now.';
        }
      });
  }

  protected submitCreateSidequest(): void {
    if (this.creatingSidequest) {
      return;
    }

    const payload = this.buildCreateSidequestPayload();
    if (!payload) {
      return;
    }

    this.creatingSidequest = true;
    this.createMessage = '';

    this.sidequestApi
      .create(payload)
      .pipe(finalize(() => (this.creatingSidequest = false)))
      .subscribe({
        next: (response) => {
          this.createMessage = 'Sidequest created.';
          this.activeMainTab = 'discover';
          this.resetCreateForm();
          this.selectedSidequest = response;
          this.detailsError = '';
          this.detailsLoading = false;
          this.joinMessage = '';
          this.loadSidequests(false);
          this.loadMyJoinedSidequests(false);
          if (this.mapDrawerOpen && this.mapUserLocation) {
            this.loadNearbySidequests();
          }
        },
        error: (error: unknown) => {
          const fallbackMessage = 'Unable to create sidequest right now.';
          const message = this.extractErrorMessage(error) || fallbackMessage;
          this.createErrors = [message];
        }
      });
  }

  protected hasJoinedSelectedSidequest(): boolean {
    if (!this.selectedSidequest || !this.currentUserId) {
      return false;
    }

    return this.selectedSidequest.participantUserIds.includes(this.currentUserId);
  }

  protected isDetailSidequestActive(): boolean {
    if (!this.selectedSidequest) {
      return false;
    }

    return this.selectedSidequest.status.toLowerCase() === 'active';
  }

  protected joinButtonLabel(): string {
    if (this.joiningSidequest) {
      return 'Joining...';
    }

    if (!this.selectedSidequest) {
      return 'Join quest';
    }

    if (!this.isDetailSidequestActive()) {
      return 'Quest closed';
    }

    if (this.hasJoinedSelectedSidequest()) {
      return 'Joined';
    }

    return 'Join quest';
  }

  private buildCreateSidequestPayload(): CreateSidequestRequest | null {
    this.createErrors = [];

    const title = this.createForm.title.trim();
    const description = this.createForm.description.trim();
    const category = this.createForm.category.trim();
    const locationName = this.createForm.locationName.trim();
    const latitude = this.createForm.latitude;
    const longitude = this.createForm.longitude;
    const maxParticipants = this.createForm.maxParticipants;

    if (!title) {
      this.createErrors.push('Title is required.');
    }

    if (!description) {
      this.createErrors.push('Description is required.');
    }

    if (!category) {
      this.createErrors.push('Category is required.');
    }

    if (!locationName) {
      this.createErrors.push('Location is required.');
    }

    if (latitude === null || longitude === null) {
      this.createErrors.push('Select a location from the suggestions so this sidequest can appear on the map.');
    }

    if (maxParticipants !== null && maxParticipants !== undefined && maxParticipants < 1) {
      this.createErrors.push('Max participants must be at least 1.');
    }

    if (this.createErrors.length > 0) {
      return null;
    }

    return {
      title,
      description,
      category,
      locationName,
      latitude,
      longitude,
      maxParticipants: maxParticipants ?? null
    };
  }

  private resetCreateForm(): void {
    this.createForm = {
      title: '',
      description: '',
      category: '',
      locationName: '',
      locationLabel: null,
      latitude: null,
      longitude: null,
      maxParticipants: 8
    };
    this.locationSuggestions = [];
    this.locationSearching = false;
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

  private loadSidequests(showLoader: boolean): void {
    if (showLoader) {
      this.isLoading = true;
    }

    this.errorMessage = '';

    this.sidequestApi
      .discover({
        limit: 120,
        offset: 0
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.allSidequests = response;

          const categories = new Set<string>(
            response
              .map((sidequest) => this.normalizeCategory(sidequest.category))
              .filter((category): category is string => Boolean(category))
          );
          this.discoveredCategories = Array.from(categories).slice(0, 5);
          this.applyClientFilters();
        },
        error: () => {
          this.errorMessage = 'Unable to load sidequests right now.';
          this.allSidequests = [];
          this.sidequests = [];
          this.featuredSidequest = null;
          this.discoveredCategories = [];
        }
      });
  }

  private loadMyJoinedSidequests(showLoader: boolean): void {
    if (showLoader) {
      this.myJoinedLoading = true;
    }

    this.myJoinedError = '';

    this.sidequestApi
      .getMyJoined()
      .pipe(finalize(() => (this.myJoinedLoading = false)))
      .subscribe({
        next: (response) => {
          this.myJoinedSidequests = response;
          this.myJoinedPreview = response.slice(0, 5);
          this.updateMySidequestGroups();
          this.joinedMapSidequestIds = response.map((sidequest) => sidequest.id);
          this.applyClientFilters();
        },
        error: () => {
          this.myJoinedError = 'Unable to load your sidequests right now.';
          this.myJoinedSidequests = [];
          this.myJoinedPreview = [];
          this.updateMySidequestGroups();
          this.joinedMapSidequestIds = [];
          this.applyClientFilters();
        }
      });
  }

  private loadNearbySidequests(): void {
    if (!this.mapUserLocation) {
      this.mapSidequests = this.filterMapSidequests(this.allSidequests);
      return;
    }

    this.mapLoading = true;
    this.mapMessage = '';

    this.sidequestApi
      .discover({
        search: this.searchTerm,
        category: this.selectedCategory ?? undefined,
        lat: this.mapUserLocation.latitude,
        lng: this.mapUserLocation.longitude,
        radiusMiles: this.mapRadiusMiles,
        limit: 120,
        offset: 0
      })
      .pipe(finalize(() => (this.mapLoading = false)))
      .subscribe({
        next: (response) => {
          this.mapSidequests = response;
        },
        error: (error: unknown) => {
          this.mapMessage = this.extractErrorMessage(error) || 'Unable to load nearby sidequests right now.';
          this.mapSidequests = [];
        }
      });
  }

  private applyClientFilters(): void {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();
    const normalizedCategory = this.selectedCategory?.trim().toLowerCase() ?? null;

    this.sidequests = this.filterDiscoverableSidequests(this.allSidequests).filter((sidequest) => {
      const sidequestCategory = sidequest.category?.trim().toLowerCase() ?? '';
      const matchesCategory = !normalizedCategory || sidequestCategory === normalizedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [sidequest.title, sidequest.description, sidequest.category, sidequest.locationName]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    this.featuredSidequest = this.sidequests.length > 0 ? this.sidequests[0] : null;

    if (!this.mapUserLocation) {
      this.mapSidequests = this.filterMapSidequests(this.allSidequests);
    }
  }

  private filterMapSidequests(sidequests: DiscoverSidequestResponse[]): DiscoverSidequestResponse[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();
    const normalizedCategory = this.selectedCategory?.trim().toLowerCase() ?? null;

    return sidequests.filter((sidequest) => {
      const sidequestCategory = sidequest.category?.trim().toLowerCase() ?? '';
      const matchesCategory = !normalizedCategory || sidequestCategory === normalizedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [sidequest.title, sidequest.description, sidequest.category, sidequest.locationName]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }

  private filterDiscoverableSidequests(sidequests: DiscoverSidequestResponse[]): DiscoverSidequestResponse[] {
    const joinedSidequestIds = new Set(this.myJoinedSidequests.map((sidequest) => sidequest.id));

    return sidequests.filter((sidequest) => sidequest.creatorId !== this.currentUserId && !joinedSidequestIds.has(sidequest.id));
  }

  private loadCurrentUser(): void {
    this.authApi.getCurrentUser().subscribe({
      next: (user) => {
        const preferredName = user.fullName || user.username || user.email || 'Profile';
        this.displayName = preferredName;
        this.userInitial = preferredName.charAt(0).toUpperCase();
        this.currentUserId = user.userId;
        this.updateMySidequestGroups();
        this.applyClientFilters();
      },
      error: () => {
        const fallbackEmail = localStorage.getItem('bloc.userEmail') || 'Profile';
        this.displayName = fallbackEmail;
        this.userInitial = this.displayName.charAt(0).toUpperCase();
        this.currentUserId = localStorage.getItem('bloc.userId');
        this.updateMySidequestGroups();
        this.applyClientFilters();
      }
    });
  }

  private updateMySidequestGroups(): void {
    if (!this.currentUserId) {
      this.myCreatedSidequests = [];
      this.myParticipantSidequests = this.myJoinedSidequests;
      return;
    }

    this.myCreatedSidequests = this.myJoinedSidequests.filter((sidequest) => sidequest.creatorId === this.currentUserId);
    this.myParticipantSidequests = this.myJoinedSidequests.filter((sidequest) => sidequest.creatorId !== this.currentUserId);
  }

  private normalizeCategory(category: string | null | undefined): string | null {
    if (!category || !category.trim()) {
      return null;
    }

    const trimmed = category.trim().toLowerCase();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
}

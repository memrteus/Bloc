import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { DiscoverSidequestResponse, SidequestApiService } from '../../core/services/sidequest-api.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
          <a class="menu-item active" routerLink="/home">Browse groups</a>
          <a class="menu-item" routerLink="/map">Map</a>
          <a class="menu-item" routerLink="/create-sidequest">Create sidequest</a>
          <a class="menu-item" routerLink="/profile">Profile</a>
        </nav>

        <div class="sidebar-panel">
          <p class="mono-title">My groups</p>
          <p>CS 377 study group</p>
          <p>Pickup soccer</p>
          <p>Late night gaming</p>
        </div>

        <div class="user-card">
          <div class="avatar">M</div>
          <div>
            <p class="name">Mateus</p>
            <p class="status">Online now</p>
          </div>
        </div>
      </aside>

      <main class="dashboard-main">
        <header class="main-header">
          <div>
            <p class="mono-title">Community feed</p>
            <h1>Browse groups</h1>
          </div>
          <div class="header-actions">
            <div class="search-pill">Search groups...</div>
            <a routerLink="/create-sidequest" class="primary-btn">+ Sidequest</a>
          </div>
        </header>

        <div class="filters">
          <span class="active">All</span>
          <span *ngFor="let category of discoveredCategories">{{ category }}</span>
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
          <a routerLink="/map" class="ghost-btn">View</a>
        </article>

        <p class="meta" *ngIf="isLoading">Loading sidequests...</p>
        <p class="meta" *ngIf="errorMessage">{{ errorMessage }}</p>

        <section class="group-grid">
          <article class="group-card" *ngFor="let sidequest of sidequests; index as i" [style.--delay.ms]="i * 45">
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

        <footer class="env-strip">
          <p>
            API: <strong>{{ config.environment.apiBaseUrl }}</strong>
          </p>
          <p>
            Supabase: <strong>{{ config.environment.supabaseUrl }}</strong>
          </p>
        </footer>
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
      border-radius: 10px;
      padding: 0.58rem 0.7rem;
      font-size: 0.9rem;
      transition: background 0.15s ease, color 0.15s ease;
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

    .search-pill {
      border: 1px solid #c4d4dc;
      background: #f4fafc;
      color: #68818f;
      border-radius: 999px;
      padding: 0.48rem 0.86rem;
      font-size: 0.84rem;
      min-width: 180px;
      text-align: center;
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

    .filters span {
      font-size: 0.75rem;
      border-radius: 999px;
      border: 1px solid #cad8df;
      padding: 0.37rem 0.7rem;
      color: #5d7583;
      background: #f3f8fb;
    }

    .filters span.active {
      border-color: #2f9bb8;
      color: #0f5569;
      background: #ddf3f9;
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

    .env-strip {
      margin-top: 0.1rem;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .env-strip p {
      margin: 0;
      font-size: 0.74rem;
      padding: 0.52rem 0.62rem;
      border-radius: 9px;
      border: 1px solid #cfdde4;
      background: #f8fcfd;
      color: #58707f;
      word-break: break-all;
    }

    .env-strip strong {
      color: #19384a;
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

      .search-pill {
        flex: 1;
        min-width: 0;
      }

      .group-grid {
        grid-template-columns: 1fr;
      }

      .env-strip {
        grid-template-columns: 1fr;
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
export class HomePageComponent implements OnInit {
  protected readonly config = inject(AppConfigService);
  private readonly sidequestApi = inject(SidequestApiService);

  protected sidequests: DiscoverSidequestResponse[] = [];
  protected featuredSidequest: DiscoverSidequestResponse | null = null;
  protected discoveredCategories: string[] = [];
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit(): void {
    this.loadSidequests();
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

  private loadSidequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.sidequestApi
      .discover({ limit: 12, offset: 0 })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.sidequests = response;
          this.featuredSidequest = response.length > 0 ? response[0] : null;

          const categories = new Set(
            response
              .map((sidequest) => sidequest.category?.trim())
              .filter((category): category is string => Boolean(category))
          );
          this.discoveredCategories = Array.from(categories).slice(0, 5);
        },
        error: () => {
          this.errorMessage = 'Unable to load sidequests right now.';
          this.sidequests = [];
          this.featuredSidequest = null;
          this.discoveredCategories = [];
        }
      });
  }
}

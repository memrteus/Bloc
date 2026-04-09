import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="top-nav">
      <a class="brand" routerLink="/">Bloc</a>
      <nav class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/map" routerLinkActive="active">Map</a>
        <a routerLink="/login" routerLinkActive="active">Login</a>
        <a routerLink="/signup" routerLinkActive="active">Signup</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
      </nav>
    </header>
  `,
  styles: [`
    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1rem;
      margin: 0.85rem 1rem 0;
      border-radius: 14px;
      border: 1px solid rgba(163, 179, 190, 0.5);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      color: #132938;
      flex-wrap: wrap;
      box-shadow: 0 10px 24px rgba(16, 30, 45, 0.08);
    }

    .brand {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-decoration: none;
      color: #0f5b70;
    }

    .nav-links {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .nav-links a {
      text-decoration: none;
      padding: 0.4rem 0.68rem;
      border-radius: 999px;
      color: #4f6876;
      font-size: 0.87rem;
    }

    .nav-links a.active,
    .nav-links a:hover {
      background: #d9edf5;
      color: #0f566b;
    }
  `]
})
export class TopNavComponent {}

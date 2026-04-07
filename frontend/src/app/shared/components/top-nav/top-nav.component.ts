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
        <a routerLink="/create-sidequest" routerLinkActive="active">Create Sidequest</a>
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
      padding: 1rem 1.25rem;
      background: #0f172a;
      color: #f8fafc;
      flex-wrap: wrap;
    }

    .brand {
      font-size: 1.1rem;
      font-weight: 700;
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .nav-links a {
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: 999px;
      color: #cbd5e1;
    }

    .nav-links a.active,
    .nav-links a:hover {
      background: #1e293b;
      color: #ffffff;
    }
  `]
})
export class TopNavComponent {}

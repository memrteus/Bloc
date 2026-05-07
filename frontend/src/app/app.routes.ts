import { Routes } from '@angular/router';

import { HomePageComponent } from './features/home/home-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { SignupPageComponent } from './features/auth/signup-page.component';
import { MapPageComponent } from './features/map/map-page.component';
import { ProfilePageComponent } from './features/profile/profile-page.component';
import { SidequestDetailPageComponent } from './features/sidequest-detail/sidequest-detail-page.component';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'home', component: HomePageComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'map', component: MapPageComponent },
  { path: 'sidequests/:id', component: SidequestDetailPageComponent, canActivate: [authGuard] },
  { path: 'create-sidequest', redirectTo: 'home', pathMatch: 'full' },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

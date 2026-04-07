import { Routes } from '@angular/router';

import { HomePageComponent } from './features/home/home-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { SignupPageComponent } from './features/auth/signup-page.component';
import { MapPageComponent } from './features/map/map-page.component';
import { CreateSidequestPageComponent } from './features/sidequests/create-sidequest-page.component';
import { ProfilePageComponent } from './features/profile/profile-page.component';

export const appRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'map', component: MapPageComponent },
  { path: 'create-sidequest', component: CreateSidequestPageComponent },
  { path: 'profile', component: ProfilePageComponent },
  { path: '**', redirectTo: '' }
];

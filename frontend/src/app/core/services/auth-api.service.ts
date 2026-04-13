import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  userId: string | null;
  email: string | null;
}

export interface SignupRequest {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}

export interface SignupResponse {
  message: string;
  userId: string | null;
  email: string | null;
  emailConfirmationRequired: boolean;
  profileCreated: boolean;
}

export interface CurrentUserResponse {
  userId: string;
  email: string;
  username: string | null;
  fullName: string | null;
  umassEmail: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  logout(): Observable<void> {
    return this.http.post<void>('/auth/logout', {});
  }

  clearSession(): void {
    localStorage.removeItem('bloc.accessToken');
    localStorage.removeItem('bloc.refreshToken');
    localStorage.removeItem('bloc.userEmail');
    localStorage.removeItem('bloc.userId');
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/login', payload).pipe(
      tap((response) => {
        if (response.accessToken) {
          localStorage.setItem('bloc.accessToken', response.accessToken);
        }

        if (response.refreshToken) {
          localStorage.setItem('bloc.refreshToken', response.refreshToken);
        }

        if (response.email) {
          localStorage.setItem('bloc.userEmail', response.email);
        }

        if (response.userId) {
          localStorage.setItem('bloc.userId', response.userId);
        }
      })
    );
  }

  signup(payload: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>('/auth/signup', payload);
  }

  getCurrentUser(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>('/auth/me');
  }
}

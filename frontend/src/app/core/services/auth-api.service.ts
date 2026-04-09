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

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/login', payload).pipe(
      tap((response) => {
        if (response.accessToken) {
          localStorage.setItem('bloc.accessToken', response.accessToken);
        }

        if (response.refreshToken) {
          localStorage.setItem('bloc.refreshToken', response.refreshToken);
        }
      })
    );
  }

  signup(payload: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>('/auth/signup', payload);
  }
}

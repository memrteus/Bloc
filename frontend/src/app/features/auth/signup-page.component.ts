import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../core/services/auth-api.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="signup-scene">
      <div class="aurora aurora-one"></div>
      <div class="aurora aurora-two"></div>

      <div class="signup-frame">
        <div class="brand-panel">
          <div class="sky-art">
            <div class="sun"></div>
            <div class="moon"></div>
            <span class="cloud cloud-one"></span>
            <span class="cloud cloud-two"></span>
          </div>

          <div class="logo-box">Bloc</div>
          <h1>Create your Bloc account</h1>
          <p>Join classmates and discover sidequests.</p>
        </div>

        <div class="auth-panel">
          <p class="kicker">Get started</p>
          <h2>Sign up</h2>
          <p class="subtext">Use your UMass email and pick a secure password.</p>

          <form class="auth-form" (ngSubmit)="onSubmit()" novalidate>
            <label for="fullName">Username</label>
            <input id="fullName" name="fullName" type="text" placeholder="Mateus" [(ngModel)]="fullName" required />

            <label for="email">UMass email</label>
            <input id="email" name="email" type="email" placeholder="you@umass.edu" [(ngModel)]="email" required />

            <label for="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Create a password" [(ngModel)]="password" required />

            <label for="confirmPassword">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repeat password" [(ngModel)]="confirmPassword" required />

            <button type="submit" class="cta" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Creating account...' : 'Create account' }}
            </button>
            <a class="cta alt" routerLink="/login">Back to login</a>
            <p class="status success" *ngIf="successMessage">{{ successMessage }}</p>
            <p class="status error" *ngIf="errorMessage">{{ errorMessage }}</p>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .signup-scene {
      position: relative;
      min-height: calc(100vh - 92px);
      padding: 2rem 1.2rem 2.6rem;
      overflow: hidden;
    }

    .aurora {
      position: absolute;
      border-radius: 999px;
      filter: blur(24px);
      opacity: 0.55;
      pointer-events: none;
    }

    .aurora-one {
      width: 360px;
      height: 360px;
      background: radial-gradient(circle, rgba(0, 196, 180, 0.45) 0%, rgba(0, 196, 180, 0) 68%);
      top: -120px;
      left: -100px;
    }

    .aurora-two {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(255, 146, 43, 0.45) 0%, rgba(255, 146, 43, 0) 68%);
      right: -140px;
      bottom: -180px;
    }

    .signup-frame {
      position: relative;
      max-width: 1080px;
      margin: 0 auto;
      border-radius: 22px;
      border: 1px solid rgba(190, 199, 210, 0.4);
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      display: grid;
      grid-template-columns: 1fr 1fr;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(13, 22, 38, 0.15);
      animation: frame-in 0.55s ease;
    }

    .brand-panel {
      position: relative;
      background:
        radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.24), transparent 40%),
        linear-gradient(145deg, #0f3443 0%, #24586b 45%, #3a788f 100%);
      color: #eff8fb;
      padding: clamp(2rem, 3.2vw, 3.25rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.8rem;
    }

    .sky-art {
      position: absolute;
      right: 1rem;
      top: 1rem;
      width: 116px;
      height: 60px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(255, 255, 255, 0.14);
      overflow: hidden;
    }

    .sun,
    .moon {
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      top: 10px;
      left: 45px;
      transition: transform 0.35s ease, opacity 0.35s ease;
    }

    .sun {
      background: radial-gradient(circle at 35% 35%, #fff1ad 0%, #ffc857 58%, #f9a826 100%);
      box-shadow: 0 0 0 5px rgba(255, 200, 87, 0.2);
      opacity: 1;
      transform: translateX(0);
    }

    .moon {
      background: radial-gradient(circle at 30% 30%, #f8f9fd 0%, #cfd7ec 70%, #adb8d5 100%);
      opacity: 0;
      transform: translateX(40px);
    }

    .cloud {
      position: absolute;
      height: 13px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.82);
      bottom: 7px;
    }

    .cloud-one {
      width: 34px;
      left: 14px;
    }

    .cloud-two {
      width: 26px;
      right: 14px;
    }

    .logo-box {
      width: 88px;
      height: 58px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.14);
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      margin-bottom: 0.8rem;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.8rem, 3vw, 2.5rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .brand-panel p {
      margin: 0;
      max-width: 35ch;
      color: rgba(239, 248, 251, 0.9);
      line-height: 1.6;
    }

    .auth-panel {
      padding: clamp(2rem, 3.1vw, 3.1rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .kicker {
      margin: 0;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #56717f;
    }

    h2 {
      margin: 0.2rem 0 0;
      font-size: clamp(1.6rem, 2.8vw, 2rem);
      letter-spacing: -0.02em;
      color: #0f2230;
    }

    .subtext {
      margin: 0.6rem 0 1.2rem;
      color: #48606f;
    }

    .auth-form {
      display: grid;
      gap: 0.6rem;
      max-width: 360px;
    }

    label {
      font-family: 'IBM Plex Mono', monospace;
      text-transform: uppercase;
      font-size: 0.67rem;
      letter-spacing: 0.14em;
      color: #4d6574;
    }

    input {
      border: 1px solid #c8d5dd;
      background: #f7fbfd;
      color: #142734;
      border-radius: 10px;
      padding: 0.74rem 0.86rem;
      font-size: 0.96rem;
      font: inherit;
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    input:focus {
      outline: none;
      border-color: #2f9bb8;
      box-shadow: 0 0 0 3px rgba(47, 155, 184, 0.16);
    }

    .cta {
      margin-top: 0.35rem;
      border: none;
      text-align: center;
      text-decoration: none;
      border-radius: 10px;
      background: linear-gradient(145deg, #0f6378 0%, #2887a0 100%);
      color: #f5fcff;
      font-size: 0.96rem;
      font-weight: 700;
      padding: 0.78rem 0.9rem;
      cursor: pointer;
      transition: transform 0.14s ease, box-shadow 0.14s ease;
    }

    .cta.alt {
      background: #e2f3f8;
      border: 1px solid #a2cfde;
      color: #0f5f74;
    }

    .cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(17, 82, 102, 0.3);
    }

    .cta.alt:hover {
      box-shadow: none;
      background: #d5ecf4;
    }

    .cta[disabled] {
      opacity: 0.8;
      cursor: wait;
      transform: none;
      box-shadow: none;
    }

    .status {
      margin: 0.45rem 0 0;
      font-size: 0.84rem;
    }

    .status.success {
      color: #047857;
    }

    .status.error {
      color: #b91c1c;
    }

    :host-context(body.theme-night) .brand-panel {
      background:
        radial-gradient(circle at 85% 15%, rgba(177, 191, 255, 0.16), transparent 40%),
        linear-gradient(145deg, #141a38 0%, #1e2b5c 45%, #30447b 100%);
    }

    :host-context(body.theme-night) .sky-art {
      background: rgba(18, 24, 57, 0.75);
      border-color: rgba(188, 199, 240, 0.35);
    }

    :host-context(body.theme-night) .sun {
      opacity: 0;
      transform: translateX(-40px);
    }

    :host-context(body.theme-night) .moon {
      opacity: 1;
      transform: translateX(0);
      box-shadow: -5px -5px 0 rgba(10, 14, 33, 0.25) inset;
    }

    :host-context(body.theme-night) .cloud {
      background: rgba(80, 94, 141, 0.82);
    }

    @keyframes frame-in {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 920px) {
      .signup-scene {
        min-height: auto;
        padding-top: 1.2rem;
      }

      .signup-frame {
        grid-template-columns: 1fr;
      }

      .brand-panel,
      .auth-panel {
        padding: 1.55rem;
      }
    }
  `]
})
export class SignupPageComponent {
  protected fullName = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';

  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected onSubmit(): void {
    const normalizedEmail = this.email.trim();

    if (!this.fullName || !normalizedEmail || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Fill out all fields to create an account.';
      this.successMessage = '';
      return;
    }

    if (!this.isAllowedUmassEmail(normalizedEmail)) {
      this.errorMessage = 'Use a valid UMass email address to sign up.';
      this.successMessage = '';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.successMessage = '';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const username = normalizedEmail.split('@')[0] || this.fullName.trim().replace(/\s+/g, '').toLowerCase();

    this.authApi.signup({
      email: normalizedEmail,
      password: this.password,
      fullName: this.fullName,
      username
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'Account created successfully.';
        setTimeout(() => {
          void this.router.navigateByUrl('/login');
        }, 1200);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = this.resolveErrorMessage(error);
      }
    });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const backendMessage =
      typeof error.error === 'string' ? error.error : error.error?.message ? String(error.error.message) : '';

    if (backendMessage.includes('profiles_umass_email_check')) {
      return 'Use a valid UMass email address to sign up.';
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.message) {
      return String(error.error.message);
    }

    return 'Signup failed. Please try again.';
  }

  private isAllowedUmassEmail(email: string): boolean {
    return /@([a-z0-9-]+\.)*umass\.edu$/i.test(email);
  }
}

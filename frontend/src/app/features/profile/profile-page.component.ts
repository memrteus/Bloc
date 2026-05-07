import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthApiService, CurrentUserResponse } from '../../core/services/auth-api.service';
import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Profile"
      title="Your profile"
      description="View and edit your account details, bio, and profile picture."
    >
      <div class="profile-actions">
        <button type="button" class="back-button" (click)="goHome()">← Back to home</button>
      </div>

      <section class="profile-page">
        <div class="panel" *ngIf="isLoading">
          <p class="meta">Loading profile...</p>
        </div>

        <div class="panel error-panel" *ngIf="!isLoading && errorMessage">
          <p>{{ errorMessage }}</p>
        </div>

        <section class="profile-card" *ngIf="!isLoading && profile">
          <div class="profile-card-top">
            <button
              type="button"
              class="avatar-button"
              (click)="openEditPanel('avatar')"
              aria-label="Edit profile picture"
            >
              <ng-container *ngIf="profilePictureUrl; else initialAvatar">
                <img
                  class="avatar image-avatar"
                  [src]="profilePictureUrl"
                  alt="Profile picture"
                />
              </ng-container>
              <ng-template #initialAvatar>
                <div class="avatar">{{ initials }}</div>
              </ng-template>
              <span class="edit-badge">✎</span>
            </button>

            <div>
              <p class="mono-title">Welcome back</p>
              <h2>{{ displayName }}</h2>
              <p class="meta">{{ profile.email }}</p>
            </div>
          </div>

          <div class="profile-detail-row">
            <span>Username</span>
            <strong>{{ profile.username || 'Not set' }}</strong>
          </div>
          <div class="profile-detail-row">
            <span>Full name</span>
            <strong>{{ profile.fullName || 'Not set' }}</strong>
          </div>
          <div class="profile-detail-row">
            <span>UMass email</span>
            <strong>{{ profile.umassEmail || 'Not set' }}</strong>
          </div>
          <div class="profile-detail-row bio-row">
            <span>Bio</span>
            <div class="bio-value">
              <strong>{{ profile.bio || 'No biography available yet.' }}</strong>
              <button
                type="button"
                class="icon-button"
                aria-label="Edit bio"
                (click)="openEditPanel('bio')"
              >
                <span class="icon-pen">✎</span>
              </button>
            </div>
          </div>
        </section>

        <div class="edit-overlay" *ngIf="showEditPanel">
          <div class="overlay-backdrop" (click)="closeEditPanel()"></div>
          <div class="overlay-panel">
            <div class="overlay-header">
              <div>
                <p class="mono-title">Edit profile</p>
                <p class="overlay-subtitle">
                  Update your profile picture and bio in one place.
                </p>
              </div>
              <button
                type="button"
                class="close-button"
                aria-label="Close edit panel"
                (click)="closeEditPanel()"
              >
                ✕
              </button>
            </div>

            <div class="edit-field">
              <label class="field-label">Profile picture</label>
              <div class="avatar-upload">
                <ng-container *ngIf="profilePictureUrl; else avatarPreviewInitials">
                  <img
                    class="avatar image-avatar"
                    [src]="profilePictureUrl"
                    alt="Avatar preview"
                  />
                </ng-container>
                <ng-template #avatarPreviewInitials>
                  <div class="avatar">{{ initials }}</div>
                </ng-template>
                <input type="file" accept="image/*" (change)="onAvatarSelected($event)" />
              </div>
            </div>

            <div class="edit-field">
              <label for="bio" class="field-label">Bio</label>
              <textarea
                id="bio"
                [(ngModel)]="bioDraft"
                rows="5"
                placeholder="Tell us a little about yourself..."
              ></textarea>
            </div>

            <button
              class="save-button"
              type="button"
              (click)="saveProfile()"
              [disabled]="!profile || isSaving"
            >
              {{ isSaving ? 'Saving…' : 'Save changes' }}
            </button>

            <p class="save-message" *ngIf="saveMessage">{{ saveMessage }}</p>
            <p class="note-text">
              Changes are saved to your profile and will be available the next time you visit.
            </p>
          </div>
        </div>
      </section>
    </app-page-shell>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .profile-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }

    .back-button {
      border: none;
      background: #eef2ff;
      color: #0f4f80;
      padding: 0.85rem 1.1rem;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.96rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .back-button:hover {
      background: #dbeafe;
    }

    .profile-page {
      display: grid;
      gap: 1.5rem;
    }

    .panel {
      padding: 1.5rem;
      background: #f8fafc;
      border: 1px solid #dbe3ee;
      border-radius: 18px;
    }

    .error-panel {
      color: #b91c1c;
      background: #fef2f2;
      border-color: #fecaca;
    }

    .profile-card {
      padding: 1.5rem;
      border: 1px solid #dbe3ee;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.04);
    }

    .profile-card-top {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .avatar-button {
      position: relative;
      display: inline-flex;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      outline: none;
    }

    .avatar-button:focus-visible {
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.35);
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #2563eb, #38bdf8);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .image-avatar {
      object-fit: cover;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 1px solid #dbe3ee;
      background: #f8fafc;
    }

    .edit-badge {
      position: absolute;
      right: -4px;
      bottom: -4px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #2563eb;
      color: #ffffff;
      font-size: 0.8rem;
      border: 2px solid #ffffff;
    }

    .mono-title {
      margin: 0 0 0.5rem;
      color: #2563eb;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-size: 1.8rem;
      line-height: 1.2;
    }

    .meta {
      margin: 0.35rem 0 0;
      color: #475569;
      line-height: 1.6;
    }

    .profile-detail-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      padding: 0.9rem 0;
      border-top: 1px solid #eff4fb;
    }

    .profile-detail-row:first-of-type {
      border-top: none;
    }

    .profile-detail-row span {
      color: #64748b;
      font-size: 0.9rem;
    }

    .profile-detail-row strong {
      margin: 0;
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    .bio-row .bio-value {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .icon-button {
      border: none;
      background: #eef2ff;
      color: #1d4ed8;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0;
    }

    .icon-button:hover {
      background: #dbeafe;
    }

    .edit-overlay {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      z-index: 30;
    }

    .overlay-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
    }

    .overlay-panel {
      position: relative;
      width: min(640px, calc(100% - 2rem));
      padding: 1.5rem;
      border-radius: 24px;
      background: #ffffff;
      border: 1px solid #dbe3ee;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15);
      z-index: 10;
      display: grid;
      gap: 1rem;
    }

    .overlay-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .overlay-subtitle {
      margin: 0.25rem 0 0;
      color: #64748b;
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .close-button {
      border: none;
      background: #f1f5f9;
      color: #0f172a;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
    }

    .edit-field {
      display: grid;
      gap: 0.75rem;
    }

    .field-label {
      color: #475569;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.02em;
    }

    .avatar-upload {
      display: grid;
      gap: 0.75rem;
    }

    input[type='file'] {
      padding: 0.5rem 0;
      color: #334155;
    }

    textarea {
      width: 100%;
      min-height: 130px;
      border: 1px solid #dbe3ee;
      border-radius: 14px;
      padding: 1rem;
      font-size: 0.95rem;
      color: #0f172a;
      background: #f8fafc;
      resize: vertical;
    }

    .save-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 1.25rem;
      border: none;
      border-radius: 999px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .save-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .save-button:not(:disabled):hover {
      background: #1d4ed8;
    }

    .save-message {
      margin: 0.85rem 0 0;
      color: #2563eb;
      font-size: 0.95rem;
    }

    .note-text {
      margin: 0;
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  `]
})
export class ProfilePageComponent implements OnInit {
  private readonly authApiService = inject(AuthApiService);
  private readonly router = inject(Router);

  isLoading = true;
  isSaving = false;
  errorMessage = '';
  saveMessage = '';
  profile: CurrentUserResponse | null = null;
  profilePictureUrl: string | null = null;
  bioDraft = '';
  showEditPanel = false;
  editSource: 'avatar' | 'bio' | null = null;

  ngOnInit(): void {
    this.authApiService.getCurrentUser().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profilePictureUrl = profile.avatarUrl || null;
        this.bioDraft = profile.bio || '';
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load profile data. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  openEditPanel(source: 'avatar' | 'bio' = 'avatar'): void {
    this.showEditPanel = true;
    this.editSource = source;
    this.saveMessage = '';
  }

  closeEditPanel(): void {
    this.showEditPanel = false;
    this.editSource = null;
  }

  goHome(): void {
    void this.router.navigateByUrl('/home');
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profilePictureUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    if (!this.profile) {
      return;
    }

    this.isSaving = true;
    this.saveMessage = '';
    this.errorMessage = '';

    const payload = {
      avatarUrl: this.profilePictureUrl,
      bio: this.bioDraft || null
    };

    this.authApiService.updateCurrentUser(payload).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profilePictureUrl = profile.avatarUrl || null;
        this.bioDraft = profile.bio || '';
        this.isSaving = false;
        this.saveMessage = 'Profile saved successfully.';
        this.closeEditPanel();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Unable to save profile. Please try again.';
      }
    });
  }

  get initials(): string {
    if (!this.profile) {
      return 'B';
    }

    if (this.profile.fullName) {
      return this.profile.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
    }

    if (this.profile.username) {
      return this.profile.username.slice(0, 2).toUpperCase();
    }

    return this.profile.email.charAt(0).toUpperCase();
  }

  get displayName(): string {
    if (!this.profile) {
      return 'Bloc Member';
    }

    return this.profile.fullName || this.profile.username || this.profile.email;
  }
}

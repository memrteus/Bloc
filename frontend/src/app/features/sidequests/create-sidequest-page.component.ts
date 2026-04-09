import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AppConfigService } from '../../core/services/app-config.service';
import { PageShellComponent } from '../../shared/ui/page-shell.component';

interface SidequestCategory {
  value: string;
  emoji: string;
  label: string;
}

interface SidequestForm {
  title: string;
  description: string;
  category: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  expiresAt: string;
  maxParticipants: number | null;
}

@Component({
  selector: 'app-create-sidequest-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Sidequests"
      title="Create a sidequest"
      description="Create a short-lived campus activity with a title, details, category, location, and scheduled time."
    >
      <form class="sidequest-form" (ngSubmit)="submitForm()" #form="ngForm">
        <div class="field-grid">
          <label>
            Title
            <input
              name="title"
              type="text"
              [(ngModel)]="model.title"
              required
              minlength="3"
              placeholder="Soccer pickup game"
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              rows="4"
              [(ngModel)]="model.description"
              required
              minlength="10"
              placeholder="Meet at the rec field for a quick pickup game. Everyone welcome."
            ></textarea>
          </label>

          <div>
            <div class="category-label">Choose an icon</div>
            <div class="category-grid">
              <button
                type="button"
                class="category-button"
                *ngFor="let category of categories"
                [class.selected]="model.category === category.value"
                (click)="model.category = category.value"
                [attr.aria-label]="category.label"
              >
                <span>{{ category.emoji }}</span>
              </button>
            </div>
          </div>

          <div class="icon-preview" *ngIf="selectedCategory">
            <span class="icon">{{ selectedCategory.emoji }}</span>
          </div>

          <label>
            Location name
            <input
              name="locationName"
              type="text"
              [(ngModel)]="model.locationName"
              required
              placeholder="Campus rec field"
            />
          </label>

          <label>
            Start date and time
            <input
              name="startsAt"
              type="datetime-local"
              [(ngModel)]="model.startsAt"
              required
            />
          </label>

          <label>
            End date and time
            <input
              name="expiresAt"
              type="datetime-local"
              [(ngModel)]="model.expiresAt"
              required
            />
          </label>

          <label>
            Max participants
            <input
              name="maxParticipants"
              type="number"
              min="1"
              [(ngModel)]="model.maxParticipants"
              required
            />
          </label>
        </div>

        <div class="notes">
          <p>
            Every sidequest ends 24 hours after its start time and will be removed from active discovery after that.
          </p>
        </div>

        <div class="form-status" *ngIf="errors.length">
          <p class="error-heading">Please fix these issues before submitting:</p>
          <ul>
            <li *ngFor="let error of errors">{{ error }}</li>
          </ul>
        </div>

        <div class="form-actions">
          <button type="submit" [disabled]="isSubmitting">Create sidequest</button>
          <span class="success" *ngIf="submissionMessage">{{ submissionMessage }}</span>
        </div>
      </form>
    </app-page-shell>
  `,
  styles: [`
    .sidequest-form {
      display: grid;
      gap: 1.5rem;
      max-width: 940px;
      margin: 2rem auto 0;
      padding: 2rem;
      background: #f4f9f3;
      border: 1px solid #dfe8dd;
      border-radius: 2.25rem;
      box-shadow: 0 26px 60px rgba(60, 90, 70, 0.12);
    }

    .field-grid {
      display: grid;
      gap: 1rem;
    }

    .category-label {
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: #243428;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
      gap: 0.75rem;
    }

    .category-button {
      border: 1px solid #dfe8dd;
      border-radius: 1.5rem;
      background: #f4fbf3;
      padding: 1.1rem;
      font-size: 2.15rem;
      line-height: 1;
      cursor: pointer;
      transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      display: grid;
      place-items: center;
      min-height: 88px;
      box-shadow: 0 10px 24px rgba(60, 90, 70, 0.08);
    }

    .category-button:hover,
    .category-button:focus {
      transform: translateY(-2px);
      border-color: #72c67f;
      background: #eaf8ec;
      outline: none;
      box-shadow: 0 14px 30px rgba(60, 90, 70, 0.12);
    }

    .category-button.selected {
      border-color: #72c67f;
      background: #d7f2c8;
      box-shadow: 0 16px 36px rgba(60, 90, 70, 0.14);
    }

    label,
    fieldset {
      display: grid;
      gap: 0.5rem;
      font-weight: 600;
      color: #0f172a;
    }

    input,
    select,
    textarea {
      width: 100%;
      padding: 0.75rem 0.9rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.65rem;
      font: inherit;
      color: #0f172a;
      background: #ffffff;
    }

    textarea {
      min-height: 140px;
      resize: vertical;
    }

    .icon-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.2rem;
      border-radius: 1.5rem;
      border: 1px solid #d8e7d8;
      background: #f7f9f4;
      box-shadow: 0 14px 30px rgba(60, 90, 70, 0.08);
      min-height: 116px;
    }

    .icon-preview .icon {
      font-size: 3.4rem;
      line-height: 1;
    }

    .repeat-options {
      border: 1px solid #cbd5e1;
      border-radius: 0.75rem;
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
      background: #f8fafc;
    }

    .repeat-options label {
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .notes,
    .form-status {
      color: #475569;
      background: #f9fbf7;
      border: 1px solid #dfe8dd;
      border-radius: 1.25rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 14px 30px rgba(60, 90, 70, 0.06);
    }

    .error-heading {
      margin: 0 0 0.5rem;
      font-weight: 700;
      color: #b91c1c;
    }

    .form-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    button {
      padding: 1rem 1.7rem;
      border: none;
      border-radius: 1rem;
      background: linear-gradient(135deg, #72c67f 0%, #5ab769 100%);
      color: white;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 16px 32px rgba(60, 90, 70, 0.14);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }

    button:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 18px 36px rgba(60, 90, 70, 0.18);
    }

    button:active:not([disabled]) {
      transform: translateY(0);
      box-shadow: 0 12px 24px rgba(60, 90, 70, 0.16);
    }

    button[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success {
      color: #2f855a;
      font-weight: 600;
    }

    @media (max-width: 720px) {
      .coordinate-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreateSidequestPageComponent {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  readonly categories: SidequestCategory[] = [
    { value: 'Soccer', emoji: '⚽', label: 'Soccer' },
    { value: 'Basketball', emoji: '🏀', label: 'Basketball' },
    { value: 'Volleyball', emoji: '🏐', label: 'Volleyball' },
    { value: 'Tennis', emoji: '🎾', label: 'Tennis' },
    { value: 'Running', emoji: '🏃', label: 'Running' },
    { value: 'Hiking', emoji: '🥾', label: 'Hiking' },
    { value: 'Food Run', emoji: '🍕', label: 'Food run' },
    { value: 'Study', emoji: '📚', label: 'Study' },
    { value: 'Gaming', emoji: '🎮', label: 'Gaming' },
    { value: 'Music', emoji: '🎵', label: 'Music' },
    { value: 'Movie', emoji: '🎬', label: 'Movie' },
    { value: 'Coffee', emoji: '☕', label: 'Coffee' },
    { value: 'Yoga', emoji: '🧘', label: 'Yoga' },
    { value: 'Coding', emoji: '💻', label: 'Coding' },
    { value: 'Board Games', emoji: '🎲', label: 'Board games' },
    { value: 'Frisbee', emoji: '🥏', label: 'Frisbee' },
    { value: 'Picnic', emoji: '🧺', label: 'Picnic' },
    { value: 'Dance', emoji: '💃', label: 'Dance' },
    { value: 'Football', emoji: '🏈', label: 'Football' },
    { value: 'Skate', emoji: '🛼', label: 'Skate' },
    { value: 'Climbing', emoji: '🧗', label: 'Climbing' },
    { value: 'Camping', emoji: '🏕️', label: 'Camping' }
  ];

  model: SidequestForm = {
    title: '',
    description: '',
    category: this.categories[0].value,
    locationName: '',
    latitude: 0,
    longitude: 0,
    startsAt: '',
    expiresAt: '',
    maxParticipants: 6
  };

  errors: string[] = [];
  isSubmitting = false;
  submissionMessage: string | null = null;

  get selectedCategory(): SidequestCategory | undefined {
    return this.categories.find((category) => category.value === this.model.category);
  }

  submitForm(): void {
    this.errors = [];
    this.submissionMessage = null;

    const startsAt = this.parseDate(this.model.startsAt, 'start date and time');
    const expiresAt = this.parseDate(this.model.expiresAt, 'end date and time');
    const maxParticipants = this.model.maxParticipants ?? 0;

    if (!this.model.title.trim()) {
      this.errors.push('Title is required.');
    }
    if (!this.model.description.trim()) {
      this.errors.push('Description is required.');
    }
    if (!this.model.locationName.trim()) {
      this.errors.push('Location name is required.');
    }
    if (!startsAt || !expiresAt) {
      this.errors.push('Start and end time must both be valid.');
    }
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      this.errors.push('End time must be after start time.');
    }
    if (maxParticipants < 1) {
      this.errors.push('Max participants must be at least 1.');
    }

    if (this.errors.length) {
      return;
    }

    const requestBody = {
      title: this.model.title.trim(),
      description: this.model.description.trim(),
      category: this.model.category,
      locationName: this.model.locationName.trim(),
      latitude: this.model.latitude,
      longitude: this.model.longitude,
      startsAt: startsAt!.toISOString(),
      expiresAt: expiresAt!.toISOString(),
      maxParticipants
    };

    this.isSubmitting = true;

    this.http
      .post(`${this.config.environment.apiBaseUrl}/sidequests`, requestBody)
      .subscribe({
        next: () => {
          this.submissionMessage = 'Sidequest created successfully. It will appear in active discovery until the scheduled end time.';
          this.isSubmitting = false;
        },
        error: (error: unknown) => {
          this.isSubmitting = false;
          const serverMessage =
            typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message?: string }).message)
              : 'Server error.';

          this.errors = [
            'Unable to create sidequest. Please check your network connection and make sure you are signed in.',
            serverMessage
          ];
        }
      });
  }

  private parseDate(value: string, fieldName: string): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { SidequestApiService } from '../../core/services/sidequest-api.service';
import { SidequestMapComponent, SidequestMapItem } from '../../shared/components/sidequest-map/sidequest-map.component';
import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [CommonModule, PageShellComponent, SidequestMapComponent],
  template: `
    <app-page-shell
      eyebrow="Map"
      title="Active sidequests map"
      description="Browse active sidequests with saved coordinates."
    >
      <app-sidequest-map
        [sidequests]="sidequests$ | async"
        (openSidequest)="openSidequestDetails($event)"
      ></app-sidequest-map>
    </app-page-shell>
  `
})
export class MapPageComponent {
  private readonly sidequestApi = inject(SidequestApiService);
  private readonly router = inject(Router);

  protected readonly sidequests$ = this.sidequestApi.discover({ limit: 100 }).pipe(
    catchError(() => of([]))
  );

  protected openSidequestDetails(sidequest: SidequestMapItem): void {
    const sidequestId = sidequest.id?.toString();
    if (!sidequestId) {
      return;
    }

    void this.router.navigate(['/sidequests', sidequestId]);
  }
}

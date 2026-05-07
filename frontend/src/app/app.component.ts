import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="app-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-content {
      width: 100%;
      padding: 0;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private themeTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.applyThemeClass();
    this.themeTimer = setInterval(() => this.applyThemeClass(), 60000);
  }

  ngOnDestroy(): void {
    if (this.themeTimer) {
      clearInterval(this.themeTimer);
    }
  }

  private applyThemeClass(): void {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;

    document.body.classList.toggle('theme-day', isDay);
    document.body.classList.toggle('theme-night', !isDay);
  }
}

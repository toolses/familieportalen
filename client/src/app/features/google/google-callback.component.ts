import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleCalendarService } from '../../shared/services/google-calendar.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center py-20">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-gray-500 text-sm">Kobler til Google...</p>
      </div>
    </div>
  `,
})
export class GoogleCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private google = inject(GoogleCalendarService);

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (!code) {
      this.router.navigate(['/innstillinger']);
      return;
    }

    const isPersonal = state === 'personal';
    const callbackFn = isPersonal
      ? () => this.google.handlePersonalCallback(code)
      : () => this.google.handleCallback(code);
    const successParam = isPersonal ? 'personal-connected' : 'connected';

    callbackFn()
      .then(() => this.router.navigate(['/innstillinger'], { queryParams: { google: successParam } }))
      .catch(() => this.router.navigate(['/innstillinger'], { queryParams: { google: 'error' } }));
  }
}

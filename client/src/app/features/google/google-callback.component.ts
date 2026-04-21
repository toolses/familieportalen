import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  private http = inject(HttpClient);

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.http.post<{ success: boolean }>('/api/auth/google/callback', { code }).subscribe({
        next: () => this.router.navigate(['/innstillinger'], { queryParams: { google: 'connected' } }),
        error: () => this.router.navigate(['/innstillinger'], { queryParams: { google: 'error' } }),
      });
    } else {
      this.router.navigate(['/innstillinger']);
    }
  }
}

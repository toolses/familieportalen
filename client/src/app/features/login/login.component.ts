import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div class="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Familieportalen</h1>
          <p class="mt-2 text-gray-500">Logg inn for å komme i gang</p>
        </div>

        @if (error()) {
          <div class="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
            {{ error() }}
          </div>
        }

        <button (click)="signIn()"
                [disabled]="signingIn()"
                class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50">
          @if (signingIn()) {
            <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Logger inn...
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Logg inn med Google
          }
        </button>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  signingIn = signal(false);
  error = signal<string | null>(null);

  async signIn() {
    this.signingIn.set(true);
    this.error.set(null);
    try {
      await this.auth.signInWithGoogle();
      this.router.navigate(['/']);
    } catch (err: any) {
      console.error('Login failed:', err);
      this.error.set('Innlogging feilet. Prøv igjen.');
    } finally {
      this.signingIn.set(false);
    }
  }
}

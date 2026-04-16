import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <header class="bg-blue-600 text-white px-4 py-3">
      <h1 class="text-xl font-bold">Familieportalen</h1>
    </header>
    <main class="py-4">
      <router-outlet />
    </main>
  `,
})
export class App {}

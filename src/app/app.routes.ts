import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'games/:id',
    loadComponent: () =>
      import('./features/game-detail/game-detail.page').then((m) => m.GameDetailPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

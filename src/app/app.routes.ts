import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/timeline/timeline.page').then((m) => m.TimelinePage),
  },
  {
    path: 'biblioteca',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'games/:id',
    loadComponent: () =>
      import('./features/game-detail/game-detail.page').then((m) => m.GameDetailPage),
  },
  {
    path: 'estatisticas',
    loadComponent: () => import('./features/stats/stats.page').then((m) => m.StatsPage),
  },
  {
    path: 'historico',
    loadComponent: () => import('./features/history/history.page').then((m) => m.HistoryPage),
  },
  {
    path: 'retrospectiva',
    loadComponent: () => import('./features/retrospective/retrospective.page').then((m) => m.RetrospectivePage),
  },
  {
    path: 'momentos',
    loadComponent: () => import('./features/life-events/life-events.page').then((m) => m.LifeEventsPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

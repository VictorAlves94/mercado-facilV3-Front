import { Routes } from '@angular/router';
import { authGuard } from './core/interceptors/auth.interceptor';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./shared/components/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'produtos',   loadComponent: () => import('./features/produtos/produtos.component').then(m => m.ProdutosComponent) },
      { path: 'caixa',      loadComponent: () => import('./features/caixa/caixa.component').then(m => m.CaixaComponent) },
      { path: 'financeiro', loadComponent: () => import('./features/financeiro/financeiro.component').then(m => m.FinanceiroComponent) },
      { path: 'fiado',      loadComponent: () => import('./features/fiado/fiado.component').then(m => m.FiadoComponent) },
      { path: 'relatorios', loadComponent: () => import('./features/relatorios/relatorios.component').then(m => m.RelatoriosComponent) },
      { path: 'auditoria',  loadComponent: () => import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent) }, 
    ]
  },
  { path: '**', redirectTo: '' }
];

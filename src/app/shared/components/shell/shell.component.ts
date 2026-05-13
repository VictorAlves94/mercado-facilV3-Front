import { TokenHelper } from '../../../core/interceptors/auth.interceptor';
import { Component, signal, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
  roles?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
<div class="shell" [class.collapsed]="sidebarCollapsed()">

  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">🛒</div>
        <span class="logo-text">CAIXA<strong>BSB</strong></span>
      </div>

      <button mat-icon-button (click)="toggleSidebar()" class="collapse-btn" matTooltip="Recolher menu">
        <mat-icon>{{ sidebarCollapsed() ? 'menu' : 'menu_open' }}</mat-icon>
      </button>
    </div>

    <nav class="nav-list">
      @for (item of navItems(); track item.path) {
        <a
          class="nav-item"
          [routerLink]="item.path"
          routerLinkActive="active"
          [matTooltip]="sidebarCollapsed() ? item.label : ''"
          matTooltipPosition="right">

          <span class="material-symbols-rounded nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>

          @if (item.badge) {
            <span class="nav-badge">{{ item.badge }}</span>
          }
        </a>
      }
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">{{ userInitial() }}</div>

        <div class="user-details">
          <div class="user-name">{{ userName() }}</div>
          <div class="user-role">{{ userRole() }}</div>
        </div>
      </div>

      <button mat-icon-button (click)="logout()" matTooltip="Sair" class="logout-btn">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  </aside>

  <div class="main-area">

    @if (!isCaixaRoute()) {
      <header class="topbar">
        <div class="topbar-left">
          <button mat-icon-button class="mobile-menu-btn" (click)="toggleSidebar()">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="topbar-title">{{ currentTitle() }}</span>
        </div>

        <div class="topbar-right">
          <div class="status-chip" [class.open]="caixaAberto()" [class.closed]="!caixaAberto()">
            <span class="status-dot"></span>
            {{ caixaAberto() ? 'Caixa Aberto' : 'Caixa Fechado' }}
          </div>
        </div>
      </header>
    }

    <main class="content">
      <router-outlet />
    </main>

  </div>
</div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      --sb: var(--mf-sidebar-w);
      transition: --sb .25s;
    }

    .shell.collapsed {
      --sb: var(--mf-sidebar-mini);
    }

    .sidebar {
      width: var(--mf-sidebar-w);
      min-width: var(--mf-sidebar-w);
      background: var(--mf-gray-900);
      display: flex;
      flex-direction: column;
      transition: width .25s, min-width .25s;
      overflow: hidden;
      z-index: 100;
    }

    .shell.collapsed .sidebar {
      width: var(--mf-sidebar-mini);
      min-width: var(--mf-sidebar-mini);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      height: var(--mf-topbar-h);
      border-bottom: 1px solid rgba(255,255,255,.06);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: .65rem;
      overflow: hidden;
    }

    .logo-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: .95rem;
      color: white;
      white-space: nowrap;
      letter-spacing: -.01em;
    }

    .logo-text strong {
      color: #818cf8;
    }

    .shell.collapsed .logo-text {
      display: none;
    }

    .collapse-btn {
      color: var(--mf-gray-400) !important;
    }

    .nav-list {
      flex: 1;
      padding: .5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .65rem .75rem;
      border-radius: var(--mf-radius-sm);
      color: var(--mf-gray-400);
      text-decoration: none;
      transition: background .15s, color .15s;
      cursor: pointer;
      white-space: nowrap;
      min-height: 44px;
    }

    .nav-item:hover {
      background: rgba(255,255,255,.06);
      color: white;
    }

    .nav-item.active {
      background: var(--mf-blue);
      color: white;
    }

    .shell.collapsed .nav-item {
      padding: .65rem;
      justify-content: center;
    }

    .nav-icon {
      font-size: 20px;
      flex-shrink: 0;
      font-variation-settings: 'FILL' 1;
    }

    .nav-label {
      font-size: .875rem;
      font-weight: 500;
    }

    .shell.collapsed .nav-label {
      display: none;
    }

    .nav-badge {
      margin-left: auto;
      background: var(--mf-red);
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 99px;
    }

    .shell.collapsed .nav-badge {
      display: none;
    }

    .sidebar-footer {
      padding: .75rem 1rem;
      border-top: 1px solid rgba(255,255,255,.06);
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    .shell.collapsed .sidebar-footer {
      padding: .75rem;
      justify-content: center;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: .65rem;
      flex: 1;
      overflow: hidden;
    }

    .shell.collapsed .user-info {
      display: none;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--mf-blue);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-name {
      font-size: .8rem;
      color: white;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: .7rem;
      color: var(--mf-gray-500);
      text-transform: capitalize;
    }

    .logout-btn {
      color: var(--mf-gray-400) !important;
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      height: var(--mf-topbar-h);
      background: var(--mf-surface);
      border-bottom: 1px solid var(--mf-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      flex-shrink: 0;
      box-shadow: var(--mf-shadow-sm);
      z-index: 50;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    .topbar-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--mf-gray-800);
    }

    .mobile-menu-btn {
      display: none !important;
    }

    .status-chip {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .35rem .85rem;
      border-radius: 99px;
      font-size: .78rem;
      font-weight: 600;
    }

    .status-chip.open {
      background: var(--mf-green-light);
      color: var(--mf-green);
    }

    .status-chip.closed {
      background: var(--mf-gray-100);
      color: var(--mf-gray-500);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .status-chip.open .status-dot {
      background: var(--mf-green);
      animation: pulse 2s infinite;
    }

    .status-chip.closed .status-dot {
      background: var(--mf-gray-400);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .4; }
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -100%;
        z-index: 200;
        transition: left .25s;
      }

      .shell.collapsed .sidebar {
        left: 0;
      }

      .mobile-menu-btn {
        display: flex !important;
      }
    }
  `]
})
export class ShellComponent {
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  caixaAberto = signal(false);

  private navItemsAll: NavItem[] = [
    { path: 'dashboard',  label: 'Dashboard',   icon: 'grid_view',              roles: ['ADMIN', 'GERENTE'] },
    { path: 'caixa',      label: 'Caixa / PDV', icon: 'point_of_sale',          roles: ['ADMIN', 'GERENTE', 'OPERADOR'] },
    { path: 'produtos',   label: 'Produtos',    icon: 'inventory_2',            roles: ['ADMIN', 'GERENTE'] },
    { path: 'financeiro', label: 'Financeiro',  icon: 'account_balance_wallet', roles: ['ADMIN', 'GERENTE'] },
    { path: 'fiado',      label: 'Fiado',       icon: 'book_2',                 roles: ['ADMIN', 'GERENTE', 'OPERADOR'] },
    { path: 'relatorios', label: 'Relatórios',  icon: 'bar_chart',              roles: ['ADMIN', 'GERENTE'] },
    { path: 'auditoria',  label: 'Auditoria',   icon: 'manage_search',          roles: ['ADMIN'] },
    { path: 'usuarios',   label: 'Usuários',    icon: 'manage_accounts',        roles: ['ADMIN'] },
  ];

  navItems = computed(() => {
    const perfil = TokenHelper.getUser()?.perfil ?? '';
    return this.navItemsAll.filter(item => !item.roles || item.roles.includes(perfil));
  });

  titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    caixa: 'Caixa / PDV',
    produtos: 'Produtos',
    financeiro: 'Financeiro',
    fiado: 'Fiado',
    relatorios: 'Relatórios',
    auditoria: 'Auditoria',
    usuarios: 'Usuários',
  };

  currentTitle = computed(() => {
    const seg = this.router.url.split('/')[1] || 'dashboard';
    return this.titleMap[seg] ?? 'CaixaBsb G.F.';
  });

  userName = computed(() => TokenHelper.getUser()?.nome ?? 'Usuário');
  userRole = computed(() => TokenHelper.getUser()?.perfil?.toLowerCase() ?? '');
  userInitial = computed(() => (TokenHelper.getUser()?.nome?.[0] ?? 'U').toUpperCase());

  isCaixaRoute(): boolean {
    return this.router.url.includes('/caixa');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(value => !value);
  }

  logout(): void {
    TokenHelper.clear();
    this.router.navigate(['/login']);
  }
}
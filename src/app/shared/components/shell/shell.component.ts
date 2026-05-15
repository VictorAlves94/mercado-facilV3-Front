import { TokenHelper } from '../../../core/interceptors/auth.interceptor';
import { Component, signal, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CaixaService } from '../../../core/services/services';
import { Subject, takeUntil } from 'rxjs';

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
    MatTooltipModule,
    MatSnackBarModule,
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

      <button mat-icon-button (click)="tentarLogout()" matTooltip="Sair" class="logout-btn">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  </aside>

  <div class="main-area">
    <main class="content">
      <router-outlet />
    </main>
  </div>
</div>

<!-- ── Modal: caixa aberto, não pode sair ── -->
@if (modalCaixaAberto()) {
  <div class="modal-overlay" (click)="modalCaixaAberto.set(false)">
    <div class="modal-box" (click)="$event.stopPropagation()">
      <div class="modal-icon">
        <span class="material-symbols-rounded">point_of_sale</span>
      </div>
      <h2>Caixa ainda aberto</h2>
      <p>
        Não é possível sair enquanto o caixa estiver aberto.<br>
        Feche o caixa antes de deslogar ou trocar de usuário.
      </p>
      <div class="modal-acoes">
        <button class="btn-modal primary" (click)="irParaCaixa()">
          <span class="material-symbols-rounded">point_of_sale</span>
          Ir para o Caixa
        </button>
        <button class="btn-modal" (click)="modalCaixaAberto.set(false)">
          Cancelar
        </button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    .shell {
      display: flex; height: 100vh; overflow: hidden;
      --sb: var(--mf-sidebar-w); transition: --sb .25s;
    }
    .shell.collapsed { --sb: var(--mf-sidebar-mini); }

    .sidebar {
      width: var(--mf-sidebar-w); min-width: var(--mf-sidebar-w);
      background: var(--mf-gray-900); display: flex; flex-direction: column;
      transition: width .25s, min-width .25s; overflow: hidden; z-index: 100;
    }
    .shell.collapsed .sidebar { width: var(--mf-sidebar-mini); min-width: var(--mf-sidebar-mini); }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem; height: var(--mf-topbar-h);
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .logo { display: flex; align-items: center; gap: .65rem; overflow: hidden; }
    .logo-icon { font-size: 1.5rem; flex-shrink: 0; }
    .logo-text { font-size: .95rem; color: white; white-space: nowrap; letter-spacing: -.01em; }
    .logo-text strong { color: #818cf8; }
    .shell.collapsed .logo-text { display: none; }
    .collapse-btn { color: var(--mf-gray-400) !important; }

    .nav-list {
      flex: 1; padding: .5rem; display: flex; flex-direction: column;
      gap: 2px; overflow-y: auto; overflow-x: hidden;
    }
    .nav-item {
      display: flex; align-items: center; gap: .75rem; padding: .65rem .75rem;
      border-radius: var(--mf-radius-sm); color: var(--mf-gray-400);
      text-decoration: none; transition: background .15s, color .15s;
      cursor: pointer; white-space: nowrap; min-height: 44px;
    }
    .nav-item:hover { background: rgba(255,255,255,.06); color: white; }
    .nav-item.active { background: var(--mf-blue); color: white; }
    .shell.collapsed .nav-item { padding: .65rem; justify-content: center; }
    .nav-icon { font-size: 20px; flex-shrink: 0; font-variation-settings: 'FILL' 1; }
    .nav-label { font-size: .875rem; font-weight: 500; }
    .shell.collapsed .nav-label { display: none; }
    .nav-badge {
      margin-left: auto; background: var(--mf-red); color: white;
      font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 99px;
    }
    .shell.collapsed .nav-badge { display: none; }

    .sidebar-footer {
      padding: .75rem 1rem; border-top: 1px solid rgba(255,255,255,.06);
      display: flex; align-items: center; gap: .5rem;
    }
    .shell.collapsed .sidebar-footer { padding: .75rem; justify-content: center; }
    .user-info { display: flex; align-items: center; gap: .65rem; flex: 1; overflow: hidden; }
    .shell.collapsed .user-info { display: none; }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: var(--mf-blue);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: .75rem; font-weight: 700; flex-shrink: 0;
    }
    .user-name { font-size: .8rem; color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: .7rem; color: var(--mf-gray-500); text-transform: capitalize; }
    .logout-btn { color: var(--mf-gray-400) !important; }

    .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .content { flex: 1; overflow-y: auto; }

    /* ── Modal ── */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn .15s; backdrop-filter: blur(2px);
    }
    .modal-box {
      background: white; border-radius: 14px; padding: 32px; width: 420px;
      max-width: 95vw; text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,.2);
      animation: slideUp .2s ease-out;
      display: flex; flex-direction: column; gap: 14px;
      border-top: 4px solid var(--mf-amber, #f59e0b);
    }
    .modal-icon {
      width: 60px; height: 60px; border-radius: 50%; margin: 0 auto;
      background: #fef3c7; border: 2px solid #fde68a;
      display: flex; align-items: center; justify-content: center;
      .material-symbols-rounded {
        font-size: 30px; color: #d97706;
        font-variation-settings: 'FILL' 1;
      }
    }
    .modal-box h2 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .modal-box p  { font-size: 14px; color: #5a6a85; line-height: 1.6; margin: 0; }
    .modal-acoes  { display: flex; gap: 10px; }
    .btn-modal {
      flex: 1; padding: 11px 16px; border-radius: 8px; font-size: 13px; font-weight: 700;
      cursor: pointer; border: 2px solid #e2e8f0; background: #f8fafc;
      color: #5a6a85; font-family: inherit; transition: all .15s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      &:hover { border-color: var(--mf-blue); color: var(--mf-blue); background: #eef5ff; }
      &.primary {
        background: var(--mf-blue, #1346a3); border-color: var(--mf-blue, #1346a3);
        color: white;
        &:hover { filter: brightness(1.1); }
        .material-symbols-rounded { font-size: 16px; }
      }
    }

    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .sidebar { position: fixed; left: -100%; z-index: 200; transition: left .25s; }
      .shell.collapsed .sidebar { left: 0; }
    }
  `]
})
export class ShellComponent implements OnInit, OnDestroy {
  private router     = inject(Router);
  private caixaSvc   = inject(CaixaService);
  private snack      = inject(MatSnackBar);
  private destroy$   = new Subject<void>();

  sidebarCollapsed  = signal(false);
  caixaAberto       = signal(false);
  modalCaixaAberto  = signal(false);

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

  userName    = computed(() => TokenHelper.getUser()?.nome ?? 'Usuário');
  userRole    = computed(() => TokenHelper.getUser()?.perfil?.toLowerCase() ?? '');
  userInitial = computed(() => (TokenHelper.getUser()?.nome?.[0] ?? 'U').toUpperCase());

  ngOnInit(): void {
    // Verifica status do caixa ao iniciar e mantém atualizado
    this.verificarCaixa();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private verificarCaixa(): void {
    this.caixaSvc.getStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  s  => this.caixaAberto.set(s.aberto),
        error: () => this.caixaAberto.set(false),
      });
  }

  tentarLogout(): void {
    if (this.caixaAberto()) {
      // Bloqueia — mostra modal explicativo
      this.modalCaixaAberto.set(true);
      return;
    }
    this.logout();
  }

  private logout(): void {
    TokenHelper.clear();
    this.router.navigate(['/login']);
  }

  irParaCaixa(): void {
    this.modalCaixaAberto.set(false);
    this.router.navigate(['/caixa']);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  isCaixaRoute(): boolean {
    return this.router.url.includes('/caixa');
  }
}
import { Component, inject, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';

const API = '/api/v1';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
<div class="auth-overlay" (click)="onOverlayClick($event)">
  <div class="auth-modal">
    <div class="auth-header">
      <span class="material-symbols-rounded auth-icon">admin_panel_settings</span>
      <div>
        <h3>Autorização necessária</h3>
        <p>{{ descricao() }}</p>
      </div>
      <button mat-icon-button (click)="cancelar()"><mat-icon>close</mat-icon></button>
    </div>

    <div class="auth-body">
      <p class="auth-info">Informe as credenciais de um <strong>Admin</strong> ou <strong>Gerente</strong> para autorizar.</p>

      <div class="auth-field">
        <label>E-mail</label>
        <input type="email" [(ngModel)]="email" placeholder="email@exemplo.com" [disabled]="carregando()">
      </div>
      <div class="auth-field">
        <label>Senha</label>
        <div class="senha-wrap">
          <input [type]="mostrarSenha() ? 'text' : 'password'" [(ngModel)]="senha"
                 placeholder="••••••••" [disabled]="carregando()"
                 (keyup.enter)="confirmar()">
          <button mat-icon-button type="button" (click)="toggleSenha()">
            <mat-icon>{{ mostrarSenha() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </div>
      </div>

      @if (erro()) {
        <div class="auth-erro">
          <mat-icon>error</mat-icon> {{ erro() }}
        </div>
      }
    </div>

    <div class="auth-footer">
      <button mat-stroked-button (click)="cancelar()" [disabled]="carregando()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirmar()" [disabled]="carregando() || !email || !senha">
        {{ carregando() ? 'Verificando...' : 'Autorizar' }}
      </button>
    </div>
  </div>
</div>
  `,
  styles: [`
    .auth-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    }
    .auth-modal {
      background: white; border-radius: 12px; width: 420px; max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
    }
    .auth-header {
      display: flex; align-items: flex-start; gap: .75rem;
      padding: 1.25rem 1.25rem 0;
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 .2rem; }
      p  { font-size: .8rem; color: #6b7280; margin: 0; }
      button { margin-left: auto; flex-shrink: 0; }
    }
    .auth-icon {
      font-size: 28px; color: #f59e0b;
      font-variation-settings: 'FILL' 1; flex-shrink: 0; margin-top: 2px;
    }
    .auth-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
    .auth-info {
      font-size: .8rem; color: #374151; background: #fef3c7;
      border-radius: 6px; padding: .6rem .75rem; margin: 0;
    }
    .auth-field {
      display: flex; flex-direction: column; gap: .3rem;
      label { font-size: .75rem; font-weight: 600; color: #374151; }
      input {
        border: 1.5px solid #e5e7eb; border-radius: 8px; padding: .55rem .75rem;
        font-size: .9rem; outline: none; width: 100%; box-sizing: border-box;
        &:focus { border-color: #6366f1; }
        &:disabled { background: #f9fafb; }
      }
    }
    .senha-wrap {
      display: flex; align-items: center; border: 1.5px solid #e5e7eb; border-radius: 8px;
      input { border: none; flex: 1; padding: .55rem .75rem; font-size: .9rem; outline: none; background: transparent; }
      &:focus-within { border-color: #6366f1; }
    }
    .auth-erro {
      display: flex; align-items: center; gap: .4rem;
      background: #fee2e2; color: #dc2626; border-radius: 6px;
      padding: .5rem .75rem; font-size: .8rem;
      mat-icon { font-size: 16px; }
    }
    .auth-footer {
      display: flex; justify-content: flex-end; gap: .5rem;
      padding: .75rem 1.25rem 1.25rem;
    }
  `]
})
export class AuthModalComponent {
  private http = inject(HttpClient);

  descricao = input<string>('Esta ação requer autorização de um superior.');
  autorizado = output<void>();
  cancelado  = output<void>();

  email      = '';
  senha      = '';
  carregando = signal(false);
  erro       = signal('');
  mostrarSenha = signal(false);

  confirmar() {
    if (!this.email || !this.senha) return;
    this.carregando.set(true);
    this.erro.set('');

    this.http.post<any>(`${API}/auth/autorizar`, {
      email: this.email,
      senha: this.senha,
      perfisPermitidos: ['ADMIN', 'GERENTE']
    }).subscribe({
      next: () => {
        this.carregando.set(false);
        this.autorizado.emit();
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Credenciais inválidas ou sem permissão.');
      }
    });
  }
  toggleSenha() { this.mostrarSenha.set(!this.mostrarSenha()); }


  cancelar() { this.cancelado.emit(); }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('auth-overlay')) this.cancelar();
  }
}
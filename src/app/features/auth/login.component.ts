import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/services';
import { TokenHelper } from '../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="login-wrap">
  <div class="login-left">
    <div class="brand">
      <div class="brand-icon">🛒</div>
      <h1>Mercado<span>Fácil</span></h1>
      <p>Gestão simples para mercados que crescem</p>
    </div>
    <div class="features">
      @for (f of feats; track f.icon) {
        <div class="feat">
          <span class="material-symbols-rounded">{{ f.icon }}</span>
          <div>
            <strong>{{ f.title }}</strong>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      }
    </div>
  </div>

  <div class="login-right">
    <div class="login-card">
      <div class="card-header">
        <h2>Bem-vindo de volta</h2>
        <p>Faça login para continuar</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="login()" class="login-form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" placeholder="admin@mercadofacil.com">
          <mat-icon matPrefix>email</mat-icon>
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>E-mail é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Senha</mat-label>
          <input matInput [type]="showPass() ? 'text' : 'password'" formControlName="senha" autocomplete="current-password">
          <mat-icon matPrefix>lock</mat-icon>
          <button mat-icon-button matSuffix type="button" (click)="togglePassword()">
            <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (form.get('senha')?.hasError('required') && form.get('senha')?.touched) {
            <mat-error>Senha é obrigatória</mat-error>
          }
        </mat-form-field>

        @if (error()) {
          <div class="mf-alert danger">
            <mat-icon style="font-size:18px">error_outline</mat-icon>
            {{ error() }}
          </div>
        }

        <button mat-flat-button color="primary" type="submit" class="login-btn"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
          }
          {{ loading() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <div class="demo-hint">
        <span>Demo:</span> admin&#64;mercadofacil.com / admin123
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .login-wrap {
      display: flex; min-height: 100vh;
    }

    .login-left {
      flex: 1; background: var(--mf-gray-900);
      display: flex; flex-direction: column;
      justify-content: center; padding: 3rem;
      gap: 2.5rem;
      @media (max-width: 768px) { display: none; }
    }

    .brand {
      .brand-icon { font-size: 2.5rem; margin-bottom: .5rem; }
      h1 {
        font-size: 2rem; font-weight: 800; color: white;
        letter-spacing: -.03em;
        span { color: #818cf8; }
      }
      p { color: var(--mf-gray-400); margin-top: .35rem; font-size: .95rem; }
    }

    .features { display: flex; flex-direction: column; gap: 1.25rem; }

    .feat {
      display: flex; align-items: flex-start; gap: 1rem;
      span { font-size: 22px; color: #818cf8; flex-shrink: 0; font-variation-settings: 'FILL' 1; }
      strong { color: white; font-size: .9rem; display: block; margin-bottom: 2px; }
      p { color: var(--mf-gray-500); font-size: .8rem; margin: 0; }
    }

    .login-right {
      width: 440px; display: flex; align-items: center; justify-content: center;
      background: var(--mf-gray-50); padding: 2rem;
      @media (max-width: 768px) { width: 100%; }
    }

    .login-card {
      width: 100%; max-width: 380px;
      background: white; border-radius: var(--mf-radius-lg);
      padding: 2.5rem; box-shadow: var(--mf-shadow-lg);
      border: 1px solid var(--mf-border);
    }

    .card-header {
      margin-bottom: 1.75rem;
      h2 { font-size: 1.375rem; font-weight: 700; color: var(--mf-gray-900); letter-spacing: -.02em; }
      p  { color: var(--mf-gray-500); font-size: .875rem; margin-top: 4px; }
    }

    .login-form { display: flex; flex-direction: column; gap: .75rem; }
    .full { width: 100%; }

    .login-btn {
      width: 100%; height: 48px;
      font-size: .95rem !important; font-weight: 600 !important;
      letter-spacing: 0 !important; margin-top: .25rem;
    }

    .demo-hint {
      margin-top: 1.25rem; text-align: center;
      font-size: .75rem; color: var(--mf-gray-400);
      span { font-weight: 600; color: var(--mf-gray-500); }
    }
  `]
})
export class LoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['admin@mercadofacil.com', [Validators.required, Validators.email]],
    senha: ['admin123', Validators.required]
  });

  loading = signal(false);
  error   = signal('');
  showPass = signal(false);

  feats = [
    { icon: 'point_of_sale', title: 'PDV Rápido', desc: 'Registre vendas em segundos, com troco automático' },
    { icon: 'inventory_2',   title: 'Estoque Inteligente', desc: 'Alertas automáticos de estoque baixo e vencimento' },
    { icon: 'account_balance_wallet', title: 'Controle Financeiro', desc: 'Lucro diário, despesas e saldo sempre visíveis' },
    { icon: 'book_2',        title: 'Fiado Digital', desc: 'Caderninho de crédito dos seus clientes' },
  ];

  togglePassword(): void {
  this.showPass.set(!this.showPass());
  }
  
  login() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { email, senha } = this.form.value;
    this.authService.login({ email: email!, senha: senha! }).subscribe({
      next: res => {
        TokenHelper.save(res.token, res);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.error.set(err.status === 401 ? 'E-mail ou senha incorretos.' : 'Erro ao conectar. Tente novamente.');
        this.loading.set(false);
      }
    });
  }
}

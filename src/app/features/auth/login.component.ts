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
      <div class="brand-logo">
        <span class="logo-cifrao">₢</span>
      </div>
      <div class="brand-text">
        <h1>Caixa<span>BSB</span></h1>
        <small>G.F. — Gestão Financeira</small>
      </div>
    </div>

    <div class="slogan">
      <p>Seu dinheiro.</p>
      <p class="slogan-destaque">Visível.</p>
      <p>Sob controle.</p>
    </div>

    <div class="divider-azul"></div>

    <div class="features">
      @for (f of feats; track f.icon) {
        <div class="feat">
          <div class="feat-dot"></div>
          <div>
            <strong>{{ f.title }}</strong>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      }
    </div>

    <div class="left-footer">
      <span>CaixaBSB G.F.</span>
      <span class="sep">·</span>
      <span>Gestão Financeira</span>
      <span class="sep">·</span>
      <span>Brasília</span>
    </div>
  </div>


  <div class="login-right">
    <div class="login-card">
     <div class="card-header">
        <h2>Bem-vindo de volta</h2>
        <p>Entre com suas credenciais para acessar o painel</p>
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
        <span class="material-symbols-rounded" style="font-size:13px;vertical-align:middle">shield</span>
        Acesso seguro · CaixaBSB G.F. v1.0
    
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .login-wrap {
      display: flex; min-height: 100vh;
    }

    /* ── Lado esquerdo ── */
    .login-left {
      flex: 1;
      background: #080c14;
      background-image:
        radial-gradient(ellipse 80% 60% at 20% 80%, rgba(37,99,235,.18) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 80% 20%, rgba(99,102,241,.12) 0%, transparent 60%);
      display: flex; flex-direction: column;
      justify-content: center; padding: 3rem 3.5rem;
      gap: 2.25rem; position: relative; overflow: hidden;
      @media (max-width: 768px) { display: none; }

      &::before {
        content: '';
        position: absolute; inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
        background-size: 48px 48px;
        pointer-events: none;
      }
    }

    .brand {
      display: flex; align-items: center; gap: 1rem; position: relative;
    }

    .brand-logo {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 24px rgba(79,70,229,.45); flex-shrink: 0;
    }

    .logo-cifrao {
      font-size: 1.6rem; color: white; font-weight: 700; line-height: 1;
    }

    .brand-text {
      display: flex; flex-direction: column;
      h1 {
        font-size: 1.6rem; font-weight: 800; color: white;
        letter-spacing: -.03em; line-height: 1; margin: 0;
        span { color: #818cf8; }
      }
      small {
        font-size: .65rem; color: #4f46e5; font-weight: 600;
        letter-spacing: .08em; text-transform: uppercase; margin-top: 3px;
      }
    }

    .slogan {
      display: flex; flex-direction: column; gap: .1rem; position: relative;
      p {
        font-size: 2.5rem; font-weight: 800; color: rgba(255,255,255,.82);
        letter-spacing: -.04em; line-height: 1.1; margin: 0;
      }
      .slogan-destaque {
        color: transparent;
        background: linear-gradient(90deg, #2563eb, #818cf8);
        -webkit-background-clip: text; background-clip: text;
        font-style: italic;
      }
    }

    .divider-azul {
      width: 44px; height: 3px;
      background: linear-gradient(90deg, #2563eb, transparent);
      border-radius: 99px;
    }

    .features { display: flex; flex-direction: column; gap: 1rem; position: relative; }

    .feat {
      display: flex; align-items: flex-start; gap: .9rem;
      strong { color: rgba(255,255,255,.88); font-size: .875rem; display: block; margin-bottom: 1px; }
      p { color: rgba(255,255,255,.35); font-size: .775rem; margin: 0; }
    }

    .feat-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #2563eb; flex-shrink: 0; margin-top: 6px;
      box-shadow: 0 0 8px rgba(37,99,235,.6);
    }

    .left-footer {
      display: flex; align-items: center; gap: .6rem;
      font-size: .68rem; color: rgba(255,255,255,.18);
      letter-spacing: .04em; position: relative;
      .sep { color: rgba(255,255,255,.1); }
    }

    /* ── Lado direito ── */
    .login-right {
      width: 460px; display: flex; align-items: center; justify-content: center;
      background: #0d1117; padding: 2rem;
      border-left: 1px solid rgba(255,255,255,.05);
      @media (max-width: 768px) { width: 100%; background: #080c14; border: none; }
    }

    .login-card {
      width: 100%; max-width: 360px;
      background: #131920;
      border-radius: 20px;
      padding: 2.25rem;
      box-shadow: 0 24px 60px rgba(0,0,0,.5);
      border: 1px solid rgba(255,255,255,.07);
    }

    .card-header {
      margin-bottom: 1.75rem;
      h2 { font-size: 1.25rem; font-weight: 700; color: white; letter-spacing: -.025em; margin: 0 0 .3rem; }
      p  { color: rgba(255,255,255,.35); font-size: .8rem; margin: 0; }
    }

    .login-form { display: flex; flex-direction: column; gap: .75rem; }
    .full { width: 100%; }

    /* Campos Angular Material no tema escuro */
    .full ::ng-deep .mat-mdc-text-field-wrapper {
      background: rgba(255,255,255,.04) !important;
    }
    .full ::ng-deep .mdc-text-field--outlined .mdc-notched-outline__leading,
    .full ::ng-deep .mdc-text-field--outlined .mdc-notched-outline__notch,
    .full ::ng-deep .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(255,255,255,.1) !important;
    }
    .full ::ng-deep .mdc-text-field--focused .mdc-notched-outline__leading,
    .full ::ng-deep .mdc-text-field--focused .mdc-notched-outline__notch,
    .full ::ng-deep .mdc-text-field--focused .mdc-notched-outline__trailing {
      border-color: #2563eb !important;
    }
    .full ::ng-deep input.mat-mdc-input-element { color: rgba(255,255,255,.9) !important; }
    .full ::ng-deep .mat-mdc-floating-label { color: rgba(255,255,255,.4) !important; }
    .full ::ng-deep .mat-icon { color: rgba(255,255,255,.3) !important; }

    .login-btn {
      width: 100%; height: 50px;
      background: linear-gradient(135deg, #1d4ed8, #4338ca) !important;
      font-size: .95rem !important; font-weight: 600 !important;
      letter-spacing: 0 !important; margin-top: .25rem;
      box-shadow: 0 4px 20px rgba(29,78,216,.35) !important;
      transition: opacity .15s, transform .1s !important;
      &:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
      &:disabled { opacity: .4 !important; }
    }

    .demo-hint {
      margin-top: 1.5rem; text-align: center;
      font-size: .7rem; color: rgba(255,255,255,.18);
      letter-spacing: .02em;
      .material-symbols-rounded { color: rgba(37,99,235,.5); }
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
    { title: 'Caixa em tempo real',   desc: 'Cada venda atualiza seu saldo na hora' },
    { title: 'Lucro sempre visível',  desc: 'Receitas e despesas lado a lado, sem surpresas' },
    { title: 'Estoque sob controle',  desc: 'Alertas automáticos antes de faltar produto' },
    { title: 'Fiado organizado',      desc: 'Caderninho digital para cada cliente' },
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

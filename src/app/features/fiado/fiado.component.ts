import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { FiadoService } from '../../core/services/services';
import { Fiado, LancamentoFiado } from '../../core/models/models';

@Component({
  selector: 'app-fiado',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTableModule, MatTabsModule,
    CurrencyPipe, DatePipe],
  template: `
<div class="mf-page">
  <div class="mf-section-header">
    <div>
      <h1 class="mf-page-title">Fiado</h1>
      <p class="mf-page-subtitle">Caderninho digital de crédito dos clientes</p>
    </div>
    <button mat-flat-button color="primary" (click)="showNovoFiado.set(!showNovoFiado())">
      <mat-icon>{{ showNovoFiado() ? 'close' : 'person_add' }}</mat-icon>
      {{ showNovoFiado() ? 'Cancelar' : 'Novo Cliente' }}
    </button>
  </div>

  <!-- Novo fiado form -->
  @if (showNovoFiado()) {
    <div class="mf-card form-card">
      <h3 style="font-size:.9rem;font-weight:600;margin-bottom:1rem">Cadastrar Cliente no Fiado</h3>
      <form [formGroup]="fiadoForm" (ngSubmit)="criarFiado()" style="display:flex;gap:.5rem;flex-wrap:wrap">
        <mat-form-field appearance="outline" style="flex:2;min-width:180px">
          <mat-label>Nome do Cliente *</mat-label>
          <input matInput formControlName="nomeCliente">
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex:1;min-width:150px">
          <mat-label>Telefone</mat-label>
          <input matInput formControlName="telefoneCliente" placeholder="61999999999">
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex:1;min-width:140px">
          <mat-label>Limite de Crédito</mat-label>
          <input matInput type="number" step="0.01" formControlName="limiteCredito">
          <span matTextPrefix>R$&nbsp;</span>
        </mat-form-field>
        <button mat-flat-button color="primary" type="submit" [disabled]="fiadoForm.invalid || saving()">
          {{ saving() ? 'Salvando...' : 'Cadastrar' }}
        </button>
      </form>
    </div>
  }

  <!-- Busca -->
  <div class="mf-card" style="padding:.75rem 1rem;margin-bottom:1rem">
    <input class="busca-cliente" [(ngModel)]="buscaNome" (input)="buscar()"
           placeholder="🔍  Buscar cliente pelo nome...">
  </div>

  <!-- Grid de clientes -->
  <div class="fiado-grid">
    @for (f of fiados(); track f.id) {
      <div class="fiado-card" [class]="f.status.toLowerCase()" (click)="selecionarFiado(f)">
        <div class="fc-header">
          <div class="fc-avatar">{{ f.nomeCliente[0].toUpperCase() }}</div>
          <div class="fc-info">
            <div class="fc-nome">{{ f.nomeCliente }}</div>
            @if (f.telefoneCliente) {
              <div class="fc-tel">{{ f.telefoneCliente }}</div>
            }
          </div>
          <span class="mf-badge" [class]="f.status === 'ATIVO' ? 'success' : f.status === 'BLOQUEADO' ? 'danger' : 'neutral'">
            {{ f.status }}
          </span>
        </div>
        <div class="fc-saldo">
          <span class="saldo-label">Saldo devedor</span>
          <span class="saldo-valor" [style.color]="f.saldoDevedor > 0 ? 'var(--mf-red)' : 'var(--mf-green)'">
            {{ f.saldoDevedor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
          </span>
        </div>
        @if (f.limiteCredito) {
          <div class="fc-limite">
            Limite: {{ f.limiteCredito | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
          </div>
        }
      </div>
    }

    @if (fiados().length === 0) {
      <div class="empty-fiado">
        <span class="material-symbols-rounded">book_2</span>
        <p>Nenhum cliente no fiado</p>
      </div>
    }
  </div>

  <!-- Drawer de detalhes -->
  @if (fiadoSelecionado()) {
    <div class="form-overlay" (click)="fiadoSelecionado.set(null)"></div>
    <div class="fiado-drawer">
      <div class="drawer-header">
        <div>
          <h2>{{ fiadoSelecionado()!.nomeCliente }}</h2>
          <span class="mf-badge" [class]="fiadoSelecionado()!.status === 'ATIVO' ? 'success' : 'danger'">
            {{ fiadoSelecionado()!.status }}
          </span>
        </div>
        <button mat-icon-button (click)="fiadoSelecionado.set(null)"><mat-icon>close</mat-icon></button>
      </div>

      <!-- Saldo grande -->
      <div class="drawer-saldo" [class.devendo]="fiadoSelecionado()!.saldoDevedor > 0">
        <div class="ds-label">Saldo Devedor</div>
        <div class="ds-valor">{{ fiadoSelecionado()!.saldoDevedor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        @if (fiadoSelecionado()!.limiteCredito) {
          <div class="ds-limite">Limite: {{ fiadoSelecionado()!.limiteCredito | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        }
      </div>

      <!-- Ações -->
      <div class="drawer-acoes">
        <button mat-flat-button color="primary" (click)="abrirLancamento('DEBITO')">
          <mat-icon>add</mat-icon> Lançar Débito
        </button>
        <button mat-flat-button color="accent" (click)="abrirLancamento('PAGAMENTO')"
                [disabled]="fiadoSelecionado()!.saldoDevedor === 0">
          <mat-icon>payments</mat-icon> Registrar Pagamento
        </button>
        @if (fiadoSelecionado()!.status === 'ATIVO') {
          <button mat-stroked-button color="warn" (click)="bloquear()">Bloquear</button>
        } @else if (fiadoSelecionado()!.status === 'BLOQUEADO') {
          <button mat-stroked-button (click)="desbloquear()">Desbloquear</button>
        }
        <button mat-stroked-button (click)="quitar()" [disabled]="fiadoSelecionado()!.saldoDevedor === 0">
          Quitar Tudo
        </button>
      </div>

      <!-- Form lançamento -->
      @if (tipoLancamento()) {
        <div class="lancamento-form">
          <h3>{{ tipoLancamento() === 'DEBITO' ? '📝 Lançar Débito' : '💵 Registrar Pagamento' }}</h3>
          <div style="display:flex;gap:.5rem;align-items:flex-start">
            <div class="input-money">
              <span>R$</span>
              <input type="number" step="0.01" [(ngModel)]="valorLancamento" placeholder="0,00" min="0.01">
            </div>
            <input class="desc-input" [(ngModel)]="descLancamento" placeholder="Descrição (opcional)">
            <button mat-flat-button [color]="tipoLancamento() === 'DEBITO' ? 'primary' : 'accent'"
                    (click)="confirmarLancamento()" [disabled]="valorLancamento <= 0 || saving()">
              Confirmar
            </button>
          </div>
        </div>
      }

      <!-- Histórico -->
      <div class="lancamento-lista">
        <h3>Histórico</h3>
        @if (lancamentos().length === 0) {
          <p style="color:var(--mf-gray-400);font-size:.875rem">Nenhum lançamento ainda</p>
        }
        @for (l of lancamentos(); track l.id) {
          <div class="lancamento-item" [class]="l.tipo.toLowerCase()">
            <div>
              <div class="lanc-tipo">{{ l.tipo === 'DEBITO' ? '📝 Débito' : '💵 Pagamento' }}</div>
              <div class="lanc-desc">{{ l.descricao || '—' }} · {{ l.criadoEm | date:'dd/MM HH:mm' }}</div>
            </div>
            <strong [style.color]="l.tipo === 'DEBITO' ? 'var(--mf-red)' : 'var(--mf-green)'">
              {{ l.tipo === 'DEBITO' ? '+' : '−' }}{{ l.valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </strong>
          </div>
        }
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .busca-cliente {
      width: 100%; border: none; outline: none; font-family: var(--mf-font);
      font-size: 1rem; background: transparent; color: var(--mf-gray-800);
      &::placeholder { color: var(--mf-gray-300); }
    }
    .fiado-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;
    }
    .fiado-card {
      background: white; border: 1.5px solid var(--mf-border); border-radius: var(--mf-radius);
      padding: 1.25rem; cursor: pointer; transition: transform .15s, box-shadow .15s;
      &:hover { transform: translateY(-2px); box-shadow: var(--mf-shadow); }
      &.bloqueado { opacity: .7; border-color: var(--mf-red); }
      &.quitado { border-color: var(--mf-green); }
    }
    .fc-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
    .fc-avatar {
      width: 40px; height: 40px; border-radius: 50%; background: var(--mf-blue);
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; flex-shrink: 0;
    }
    .fc-info { flex: 1; overflow: hidden; }
    .fc-nome { font-weight: 600; font-size: .9rem; color: var(--mf-gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fc-tel  { font-size: .75rem; color: var(--mf-gray-400); }
    .fc-saldo { display: flex; justify-content: space-between; align-items: center; }
    .saldo-label { font-size: .7rem; color: var(--mf-gray-400); text-transform: uppercase; letter-spacing: .06em; }
    .saldo-valor { font-family: var(--mf-mono); font-weight: 700; font-size: 1.2rem; }
    .fc-limite { font-size: .75rem; color: var(--mf-gray-400); margin-top: .25rem; }
    .empty-fiado {
      grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--mf-gray-300);
      span { font-size: 48px; } p { margin-top: .5rem; color: var(--mf-gray-400); }
    }
    /* Drawer */
    .form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 200; }
    .fiado-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: 420px;
      background: white; z-index: 201; box-shadow: var(--mf-shadow-lg);
      overflow-y: auto; padding: 0;
      animation: slideIn .2s ease;
      @media (max-width: 480px) { width: 100%; }
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--mf-border);
      h2 { font-size: 1rem; font-weight: 600; margin-bottom: .25rem; }
    }
    .drawer-saldo {
      padding: 1.5rem; background: var(--mf-gray-50); text-align: center;
      &.devendo { background: var(--mf-red-light); }
    }
    .ds-label { font-size: .75rem; color: var(--mf-gray-500); text-transform: uppercase; letter-spacing: .06em; }
    .ds-valor { font-size: 2rem; font-weight: 800; font-family: var(--mf-mono); margin: .25rem 0; }
    .ds-limite { font-size: .8rem; color: var(--mf-gray-500); }
    .drawer-acoes {
      padding: 1rem 1.5rem; display: flex; flex-wrap: wrap; gap: .5rem;
      border-bottom: 1px solid var(--mf-border);
    }
    .lancamento-form {
      padding: 1rem 1.5rem; border-bottom: 1px solid var(--mf-border);
      h3 { font-size: .9rem; font-weight: 600; margin-bottom: .75rem; }
      display: flex; flex-direction: column; gap: .75rem;
    }
    .input-money {
      display: flex; align-items: center; gap: .5rem;
      border: 1.5px solid var(--mf-border); border-radius: 8px; padding: .5rem .75rem;
      span { font-weight: 600; color: var(--mf-gray-500); }
      input { width: 100px; border: none; outline: none; font-family: var(--mf-mono); font-size: 1.1rem; font-weight: 600; }
    }
    .desc-input {
      flex: 1; border: 1.5px solid var(--mf-border); border-radius: 8px; padding: .5rem .75rem;
      font-family: var(--mf-font); outline: none;
    }
    .lancamento-lista { padding: 1rem 1.5rem; }
    .lancamento-lista h3 { font-size: .85rem; font-weight: 600; color: var(--mf-gray-600); margin-bottom: .75rem; }
    .lancamento-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: .65rem 0; border-bottom: 1px solid var(--mf-border);
      &:last-child { border: none; }
      strong { font-family: var(--mf-mono); font-weight: 700; }
    }
    .lanc-tipo { font-size: .875rem; font-weight: 500; }
    .lanc-desc { font-size: .75rem; color: var(--mf-gray-400); }
    .form-card { margin-bottom: 1rem; }
  `]
})
export class FiadoComponent implements OnInit {
  private svc = inject(FiadoService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  fiados = signal<Fiado[]>([]);
  lancamentos = signal<LancamentoFiado[]>([]);
  fiadoSelecionado = signal<Fiado | null>(null);
  showNovoFiado = signal(false);
  saving = signal(false);
  tipoLancamento = signal<'DEBITO' | 'PAGAMENTO' | null>(null);
  valorLancamento = 0;
  descLancamento = '';
  buscaNome = '';

  fiadoForm = this.fb.group({
    nomeCliente: ['', [Validators.required, Validators.minLength(2)]],
    telefoneCliente: [''],
    limiteCredito: [null]
  });

  ngOnInit() { this.carregar(); }
  carregar() { this.svc.listar().subscribe(f => this.fiados.set(f)); }
  buscar() { this.svc.listar(this.buscaNome || undefined).subscribe(f => this.fiados.set(f)); }

  criarFiado() {
    if (this.fiadoForm.invalid) return;
    this.saving.set(true);
    this.svc.criar(this.fiadoForm.value as any).subscribe({
      next: () => { this.snack.open('Cliente cadastrado!', '', { duration: 3000 }); this.showNovoFiado.set(false); this.fiadoForm.reset(); this.carregar(); this.saving.set(false); },
      error: err => { this.snack.open(err.error?.message || 'Erro', '', { duration: 4000 }); this.saving.set(false); }
    });
  }

  selecionarFiado(f: Fiado) {
    this.fiadoSelecionado.set(f);
    this.tipoLancamento.set(null);
    this.valorLancamento = 0;
    this.descLancamento = '';
    this.svc.listarLancamentos(f.id).subscribe(l => this.lancamentos.set(l));
  }

  abrirLancamento(tipo: 'DEBITO' | 'PAGAMENTO') {
    this.tipoLancamento.set(tipo);
    this.valorLancamento = 0;
  }

  confirmarLancamento() {
    const f = this.fiadoSelecionado();
    if (!f || !this.tipoLancamento() || this.valorLancamento <= 0) return;
    this.saving.set(true);
    this.svc.lancar(f.id, this.tipoLancamento()!, this.valorLancamento, this.descLancamento).subscribe({
      next: () => {
        this.snack.open('Lançamento registrado!', '', { duration: 3000 });
        this.tipoLancamento.set(null);
        this.svc.buscarPorId(f.id).subscribe(atualizado => this.fiadoSelecionado.set(atualizado));
        this.svc.listarLancamentos(f.id).subscribe(l => this.lancamentos.set(l));
        this.carregar();
        this.saving.set(false);
      },
      error: err => { this.snack.open(err.error?.message || 'Erro', '', { duration: 4000 }); this.saving.set(false); }
    });
  }

  bloquear()    { const f = this.fiadoSelecionado()!; this.svc.bloquear(f.id).subscribe(a => { this.fiadoSelecionado.set(a); this.carregar(); }); }
  desbloquear() {
    const f = this.fiadoSelecionado()!;
    // Reativa usando o endpoint de desbloquear
    this.svc.buscarPorId(f.id).subscribe(a => { this.fiadoSelecionado.set(a); this.carregar(); });
  }
  quitar() {
    const f = this.fiadoSelecionado()!;
    if (!confirm(`Quitar todo o saldo de ${f.nomeCliente}?`)) return;
    this.svc.quitar(f.id).subscribe(a => { this.fiadoSelecionado.set(a); this.carregar(); this.snack.open('Fiado quitado!', '', { duration: 3000 }); });
  }
}

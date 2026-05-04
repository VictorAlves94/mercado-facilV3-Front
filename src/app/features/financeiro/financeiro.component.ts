import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { FinanceiroService } from '../../core/services/services';
import { Despesa, TipoDespesa, SaldoDia, RelatorioFinanceiro } from '../../core/models/models';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTableModule, MatTabsModule, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
<div class="mf-page">
  <div class="mf-section-header">
    <div>
      <h1 class="mf-page-title">Financeiro</h1>
      <p class="mf-page-subtitle">Controle de despesas e análise de resultado</p>
    </div>
    <button mat-flat-button color="primary" (click)="showForm.set(!showForm())">
      <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon>
      {{ showForm() ? 'Cancelar' : 'Nova Despesa' }}
    </button>
  </div>

  <!-- Saldo do dia -->
  @if (saldo()) {
    <div class="saldo-banner" [class.positivo]="saldo()!.situacao === 'POSITIVO'" [class.negativo]="saldo()!.situacao === 'NEGATIVO'">
      <div class="saldo-item">
        <span class="material-symbols-rounded">trending_up</span>
        <div>
          <div class="saldo-label">Vendas Hoje</div>
          <div class="saldo-valor">{{ saldo()!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        </div>
      </div>
      <div class="saldo-sep">−</div>
      <div class="saldo-item">
        <span class="material-symbols-rounded">trending_down</span>
        <div>
          <div class="saldo-label">Despesas Hoje</div>
          <div class="saldo-valor">{{ saldo()!.totalDespesas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        </div>
      </div>
      <div class="saldo-sep">=</div>
      <div class="saldo-item resultado">
        <span class="material-symbols-rounded">{{ saldo()!.situacao === 'POSITIVO' ? 'sentiment_satisfied' : 'sentiment_dissatisfied' }}</span>
        <div>
          <div class="saldo-label">Resultado</div>
          <div class="saldo-valor">{{ saldo()!.saldo | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        </div>
      </div>
    </div>
  }

  <!-- Form nova despesa -->
  @if (showForm()) {
    <div class="mf-card form-card">
      <h3 style="font-size:.95rem;font-weight:600;margin-bottom:1rem">Lançar Despesa</h3>
      <form [formGroup]="despesaForm" (ngSubmit)="salvarDespesa()" class="despesa-form">
        <mat-form-field appearance="outline">
          <mat-label>Tipo *</mat-label>
          <mat-select formControlName="tipoDespesaId">
            @for (t of tipos(); track t.id) {
              <mat-option [value]="t.id">{{ t.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Descrição *</mat-label>
          <input matInput formControlName="descricao" placeholder="Ex: Conta de luz de março">
        </mat-form-field>
        <div class="form-row-3">
          <mat-form-field appearance="outline">
            <mat-label>Valor *</mat-label>
            <input matInput type="number" step="0.01" formControlName="valor">
            <span matTextPrefix>R$&nbsp;</span>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Data *</mat-label>
            <input matInput type="date" formControlName="dataDespesa">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pagamento</mat-label>
            <mat-select formControlName="formaPagamento">
              <mat-option value="DINHEIRO">Dinheiro</mat-option>
              <mat-option value="PIX">Pix</mat-option>
              <mat-option value="BOLETO">Boleto</mat-option>
              <mat-option value="TRANSFERENCIA">Transferência</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button mat-stroked-button type="button" (click)="showForm.set(false)">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="despesaForm.invalid || saving()">
            {{ saving() ? 'Salvando...' : 'Lançar Despesa' }}
          </button>
        </div>
      </form>
    </div>
  }

  <mat-tab-group>
    <!-- Despesas de hoje -->
    <mat-tab label="Despesas de Hoje">
      <div style="padding:1rem 0">
        @if (despesas().length === 0) {
          <div class="empty-state">
            <mat-icon>receipt_long</mat-icon>
            <p>Nenhuma despesa registrada hoje</p>
          </div>
        } @else {
          <table mat-table [dataSource]="despesaSource" style="width:100%">
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let d">
                <span class="mf-badge info">{{ d.tipoDespesaNome }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="descricao">
              <th mat-header-cell *matHeaderCellDef>Descrição</th>
              <td mat-cell *matCellDef="let d">{{ d.descricao }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let d">
                <strong style="font-family:var(--mf-mono);color:var(--mf-red)">
                  {{ d.valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </strong>
              </td>
            </ng-container>
            <ng-container matColumnDef="pagamento">
              <th mat-header-cell *matHeaderCellDef>Pagamento</th>
              <td mat-cell *matCellDef="let d">{{ d.formaPagamento || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="hora">
              <th mat-header-cell *matHeaderCellDef>Hora</th>
              <td mat-cell *matCellDef="let d">{{ d.criadoEm | date:'HH:mm' }}</td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let d">
                <button mat-icon-button color="warn" (click)="excluir(d)">
                  <mat-icon style="font-size:18px">delete_outline</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colsDespesa"></tr>
            <tr mat-row *matRowDef="let r; columns:colsDespesa"></tr>
          </table>
        }
      </div>
    </mat-tab>

    <!-- Relatório do mês -->
    <mat-tab label="Relatório do Mês">
      <div style="padding:1rem 0">
        @if (relatorio()) {
          <div class="mf-stat-grid" style="margin-bottom:1rem">
            <div class="mf-stat-card blue">
              <div class="stat-label">Receita</div>
              <div class="stat-value">{{ relatorio()!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
              <div class="stat-sub">{{ relatorio()!.quantidadeVendas }} vendas</div>
            </div>
            <div class="mf-stat-card red">
              <div class="stat-label">Despesas</div>
              <div class="stat-value">{{ relatorio()!.totalDespesas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
            </div>
            <div class="mf-stat-card" [class]="relatorio()!.lucroLiquido >= 0 ? 'mf-stat-card green' : 'mf-stat-card red'">
              <div class="stat-label">Lucro Líquido</div>
              <div class="stat-value">{{ relatorio()!.lucroLiquido | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
              <div class="stat-sub">Margem: {{ relatorio()!.margemLucro | number:'1.1-1' }}%</div>
            </div>
          </div>

          @if (relatorio()!.despesasPorCategoria.length > 0) {
            <div class="mf-card">
              <h3 style="font-size:.9rem;font-weight:600;margin-bottom:1rem">Despesas por Categoria</h3>
              @for (c of relatorio()!.despesasPorCategoria; track c.tipoDespesa) {
                <div class="categoria-row">
                  <span>{{ c.tipoDespesa }}</span>
                  <div class="cat-bar-wrap">
                    <div class="cat-bar" [style.width.%]="(c.total / relatorio()!.totalDespesas) * 100"></div>
                  </div>
                  <strong>{{ c.total | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                </div>
              }
            </div>
          }
        }
      </div>
    </mat-tab>
  </mat-tab-group>
</div>
  `,
  styles: [`
    .saldo-banner {
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
      padding: 1.25rem 1.5rem; border-radius: var(--mf-radius);
      margin-bottom: 1.25rem; border: 1px solid;
      &.positivo { background: var(--mf-green-light); border-color: #bbf7d0; }
      &.negativo { background: var(--mf-red-light);   border-color: #fecaca; }
    }
    .saldo-item {
      display: flex; align-items: center; gap: .75rem;
      span { font-size: 28px; font-variation-settings: 'FILL' 1; }
    }
    .saldo-label { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; opacity: .7; }
    .saldo-valor { font-family: var(--mf-mono); font-size: 1.3rem; font-weight: 700; }
    .saldo-sep   { font-size: 1.5rem; color: var(--mf-gray-400); font-weight: 300; }
    .saldo-item.resultado .saldo-valor { font-size: 1.6rem; }

    .form-card { margin-bottom: 1rem; }
    .despesa-form { display: flex; flex-direction: column; gap: .1rem; mat-form-field { width: 100%; } }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .5rem;
                  @media (max-width: 600px) { grid-template-columns: 1fr; } }

    .empty-state {
      text-align: center; padding: 3rem; color: var(--mf-gray-300);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { margin-top: .5rem; color: var(--mf-gray-400); }
    }

    .categoria-row {
      display: flex; align-items: center; gap: 1rem; padding: .5rem 0;
      span { min-width: 140px; font-size: .875rem; color: var(--mf-gray-600); }
      strong { min-width: 100px; text-align: right; font-family: var(--mf-mono); }
    }
    .cat-bar-wrap { flex: 1; background: var(--mf-gray-100); border-radius: 99px; height: 8px; }
    .cat-bar { height: 8px; background: var(--mf-red); border-radius: 99px; transition: width .4s; }
  `]
})
export class FinanceiroComponent implements OnInit {
  private svc = inject(FinanceiroService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  saldo     = signal<SaldoDia | null>(null);
  despesas  = signal<Despesa[]>([]);
  tipos     = signal<TipoDespesa[]>([]);
  relatorio = signal<RelatorioFinanceiro | null>(null);
  showForm  = signal(false);
  saving    = signal(false);

  despesaSource = new MatTableDataSource<Despesa>();
  colsDespesa = ['tipo', 'descricao', 'valor', 'pagamento', 'hora', 'acoes'];

  despesaForm = this.fb.group({
    tipoDespesaId: [null as number | null, Validators.required],
    descricao: ['', [Validators.required, Validators.minLength(3)]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    dataDespesa: [new Date().toISOString().substring(0, 10), Validators.required],
    formaPagamento: ['DINHEIRO']
  });

  ngOnInit() {
    this.carregar();
    this.svc.listarTiposDespesa().subscribe(t => this.tipos.set(t));
    this.svc.getRelatorioMes().subscribe(r => this.relatorio.set(r));
  }

  carregar() {
    this.svc.getSaldoHoje().subscribe(s => this.saldo.set(s));
    this.svc.listarDespesasHoje().subscribe(d => {
      this.despesas.set(d);
      this.despesaSource.data = d;
    });
  }

  salvarDespesa() {
    if (this.despesaForm.invalid) return;
    this.saving.set(true);
    this.svc.lancarDespesa(this.despesaForm.value as any).subscribe({
      next: () => {
        this.snack.open('Despesa lançada!', '', { duration: 3000 });
        this.despesaForm.reset({ dataDespesa: new Date().toISOString().substring(0, 10), formaPagamento: 'DINHEIRO' });
        this.showForm.set(false);
        this.carregar();
        this.svc.getRelatorioMes().subscribe(r => this.relatorio.set(r));
        this.saving.set(false);
      },
      error: err => { this.snack.open(err.error?.message || 'Erro', '', { duration: 4000 }); this.saving.set(false); }
    });
  }

  excluir(d: Despesa) {
    if (!confirm(`Excluir despesa "${d.descricao}"?`)) return;
    this.svc.excluirDespesa(d.id).subscribe({
      next: () => { this.snack.open('Despesa excluída', '', { duration: 3000 }); this.carregar(); },
      error: err => this.snack.open(err.error?.message || 'Erro', '', { duration: 4000 })
    });
  }
}

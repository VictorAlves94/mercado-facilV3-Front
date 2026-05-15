import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, takeUntil } from 'rxjs';
import { FinanceiroService, VendaService, LojaService } from '../../core/services/services';
import { RelatorioFinanceiro, Venda } from '../../core/models/models';
import { LojaSelectorComponent } from '../loja-selector/loja-selector.component';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, CurrencyPipe, DecimalPipe, DatePipe, LojaSelectorComponent],
  template: `
<div class="mf-page">
    <div class="mf-section-header">
    <div>
      <h1 class="mf-page-title">Relatórios</h1>
      <p class="mf-page-subtitle">Análise de desempenho do negócio</p>
    </div>
    <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap">
      <app-loja-selector></app-loja-selector>
      <div class="periodo-selector">
        <button class="period-btn" [class.active]="periodo() === 'hoje'" (click)="setPeriodo('hoje')">Hoje</button>
        <button class="period-btn" [class.active]="periodo() === 'semana'" (click)="setPeriodo('semana')">Semana</button>
        <button class="period-btn" [class.active]="periodo() === 'mes'" (click)="setPeriodo('mes')">Mês</button>
        <button class="period-btn" [class.active]="periodo() === 'custom'" (click)="setPeriodo('custom')">Período</button>
      </div>
    </div>
  </div>

  @if (periodo() === 'custom') {
    <div class="mf-card custom-period">
      <input type="date" [(ngModel)]="dataInicio">
      <span>até</span>
      <input type="date" [(ngModel)]="dataFim">
      <button mat-flat-button color="primary" (click)="buscarCustom()">Buscar</button>
    </div>
  }

  @if (loading()) {
    <div class="skeleton-grid">
      @for (i of [1,2,3]; track i) { <div class="mf-skeleton" style="height:120px"></div> }
    </div>
  } @else if (relatorio()) {
    <!-- KPIs principais -->
    <div class="mf-stat-grid" style="margin-bottom:1.5rem">
      <div class="mf-stat-card blue">
        <div class="stat-icon"><span class="material-symbols-rounded">payments</span></div>
        <div class="stat-label">Receita</div>
        <div class="stat-value">{{ relatorio()!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        <div class="stat-sub">{{ relatorio()!.quantidadeVendas }} vendas</div>
      </div>
      <div class="mf-stat-card red">
        <div class="stat-icon"><span class="material-symbols-rounded">trending_down</span></div>
        <div class="stat-label">Despesas</div>
        <div class="stat-value">{{ relatorio()!.totalDespesas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
      </div>
      <div class="mf-stat-card" [class]="relatorio()!.lucroLiquido >= 0 ? 'mf-stat-card green' : 'mf-stat-card red'">
        <div class="stat-icon"><span class="material-symbols-rounded">account_balance</span></div>
        <div class="stat-label">Lucro Líquido</div>
        <div class="stat-value">{{ relatorio()!.lucroLiquido | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        <div class="stat-sub">Margem {{ relatorio()!.margemLucro | number:'1.1-1' }}%</div>
      </div>
    </div>

    <div class="relatorio-grid">
      <!-- Formas de pagamento -->
      <div class="mf-card">
        <h3 class="card-title">Formas de Pagamento</h3>
        @for (fp of formasPagamento(); track fp.label) {
          <div class="fp-row">
            <div class="fp-info">
              <span>{{ fp.icon }} {{ fp.label }}</span>
              <span class="fp-pct">{{ fp.pct | number:'1.1-1' }}%</span>
            </div>
            <div class="fp-bar-wrap">
              <div class="fp-bar" [style.width.%]="fp.pct" [style.background]="fp.cor"></div>
            </div>
            <strong>{{ fp.valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
        }
      </div>

      <!-- Despesas por categoria -->
      <div class="mf-card">
        <h3 class="card-title">Despesas por Categoria</h3>
        @if (relatorio()!.despesasPorCategoria.length === 0) {
          <p style="color:var(--mf-gray-300);font-size:.875rem">Sem despesas no período</p>
        }
        @for (c of relatorio()!.despesasPorCategoria; track c.tipoDespesa) {
          <div class="cat-row">
            <span class="cat-nome">{{ c.tipoDespesa }}</span>
            <div class="cat-bar-wrap">
              <div class="cat-bar" [style.width.%]="relatorio()!.totalDespesas > 0 ? (c.total / relatorio()!.totalDespesas) * 100 : 0"></div>
            </div>
            <strong>{{ c.total | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
        }
      </div>
    </div>

    <!-- Resumo diário (se período) -->
    @if (relatorio()!.resumoDiario.length > 0) {
      <div class="mf-card" style="margin-top:1rem">
        <h3 class="card-title">Resultado por Dia</h3>
        <div class="diario-lista">
          @for (d of relatorio()!.resumoDiario; track d.data) {
            <div class="dia-row">
              <div class="dia-data">{{ d.data | date:'EEE dd/MM':'':'pt-BR' }}</div>
              <div class="dia-bars">
                <div class="dia-venda" [style.width.%]="maxVenda > 0 ? (d.totalVendas / maxVenda) * 100 : 0">
                  {{ d.totalVendas | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}
                </div>
              </div>
              <div class="dia-lucro" [style.color]="d.lucro >= 0 ? 'var(--mf-green)' : 'var(--mf-red)'">
                {{ d.lucro | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Vendas recentes -->
    <div class="mf-card" style="margin-top:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h3 class="card-title" style="margin:0">Vendas Recentes</h3>
      </div>
      @if (vendasHoje().length === 0) {
        <p style="color:var(--mf-gray-300);font-size:.875rem">Nenhuma venda hoje</p>
      }
      <div class="vendas-lista">
        @for (v of vendasHoje(); track v.id) {
          <div class="venda-row" [class.cancelada]="v.status === 'CANCELADA'">
            <div>
              <div class="venda-num">{{ v.numeroVenda }}</div>
              <div class="venda-hora">{{ v.criadoEm | date:'HH:mm' }} · {{ v.operadorNome }}</div>
            </div>
            <div class="venda-mid">
              <span class="mf-badge" [class]="v.status === 'FINALIZADA' ? 'success' : 'danger'">
                {{ v.status }}
              </span>
              <span class="mf-badge neutral">{{ v.formaPagamento }}</span>
            </div>
            <strong class="venda-valor">{{ v.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
        }
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .periodo-selector {
      display: flex; border: 1px solid var(--mf-border); border-radius: var(--mf-radius-sm); overflow: hidden;
    }
    .period-btn {
      padding: .45rem 1rem; border: none; background: white; cursor: pointer;
      font-family: var(--mf-font); font-size: .8rem; font-weight: 500;
      color: var(--mf-gray-500); transition: background .15s, color .15s;
      &.active { background: var(--mf-blue); color: white; }
      &:hover:not(.active) { background: var(--mf-gray-50); }
    }
    .custom-period {
      display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem;
      input[type=date] {
        border: 1px solid var(--mf-border); border-radius: 8px; padding: .45rem .75rem;
        font-family: var(--mf-font); outline: none; color: var(--mf-gray-700);
      }
      span { color: var(--mf-gray-400); }
    }
    .relatorio-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
      @media (max-width: 700px) { grid-template-columns: 1fr; }
    }
    .card-title { font-size: .9rem; font-weight: 600; color: var(--mf-gray-700); margin-bottom: 1rem; }
    .fp-row { margin-bottom: .75rem; }
    .fp-info { display: flex; justify-content: space-between; font-size: .8rem; color: var(--mf-gray-600); margin-bottom: .3rem; }
    .fp-pct { font-weight: 600; }
    .fp-bar-wrap { background: var(--mf-gray-100); border-radius: 99px; height: 6px; margin-bottom: .3rem; }
    .fp-bar { height: 6px; border-radius: 99px; transition: width .4s; }
    .fp-row strong { font-family: var(--mf-mono); font-size: .85rem; }
    .cat-row { display: flex; align-items: center; gap: .75rem; margin-bottom: .65rem; }
    .cat-nome { font-size: .8rem; color: var(--mf-gray-600); min-width: 120px; }
    .cat-bar-wrap { flex: 1; background: var(--mf-gray-100); border-radius: 99px; height: 6px; }
    .cat-bar { height: 6px; background: var(--mf-red); border-radius: 99px; transition: width .4s; }
    .cat-row strong { font-family: var(--mf-mono); font-size: .8rem; min-width: 80px; text-align: right; }
    .diario-lista { display: flex; flex-direction: column; gap: .4rem; }
    .dia-row { display: flex; align-items: center; gap: 1rem; }
    .dia-data { font-size: .75rem; color: var(--mf-gray-500); min-width: 70px; text-transform: capitalize; }
    .dia-bars { flex: 1; }
    .dia-venda {
      background: var(--mf-blue-light); color: var(--mf-blue);
      border-radius: 4px; height: 20px; display: flex; align-items: center;
      padding: 0 .5rem; font-size: .7rem; font-weight: 600; min-width: 60px; transition: width .4s;
    }
    .dia-lucro { font-family: var(--mf-mono); font-size: .8rem; font-weight: 600; min-width: 90px; text-align: right; }
    .vendas-lista { display: flex; flex-direction: column; gap: .4rem; }
    .venda-row {
      display: flex; align-items: center; gap: 1rem; padding: .6rem .75rem;
      background: var(--mf-gray-50); border-radius: 8px;
      &.cancelada { opacity: .6; }
    }
    .venda-num  { font-size: .8rem; font-weight: 600; font-family: var(--mf-mono); }
    .venda-hora { font-size: .7rem; color: var(--mf-gray-400); }
    .venda-mid  { display: flex; gap: .35rem; margin-left: auto; }
    .venda-valor { font-family: var(--mf-mono); font-size: .9rem; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
  `]
})


export class RelatoriosComponent implements OnInit, OnDestroy {
  private finSvc      = inject(FinanceiroService);
  private vendaSvc    = inject(VendaService);
  private lojaService = inject(LojaService);
  private destroy$    = new Subject<void>();

  relatorio  = signal<RelatorioFinanceiro | null>(null);
  vendasHoje = signal<Venda[]>([]);
  loading    = signal(true);
  periodo    = signal<'hoje' | 'semana' | 'mes' | 'custom'>('mes');
  dataInicio = new Date().toISOString().substring(0, 10);
  dataFim    = new Date().toISOString().substring(0, 10);
  maxVenda   = 0;

  formasPagamento = signal<{ label: string; icon: string; valor: number; pct: number; cor: string }[]>([]);

  ngOnInit() {
    this.lojaService.lojaSelecionadaId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id !== null) {
          this.carregarVendasHoje();
          this.setPeriodo(this.periodo());
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarVendasHoje(): void {
    this.vendaSvc.listarHoje().subscribe(v => {
      this.vendasHoje.set(v);
      if (this.relatorio()) this.processarRelatorio(this.relatorio()!);
    });
  }

  setPeriodo(p: 'hoje' | 'semana' | 'mes' | 'custom') {
    this.periodo.set(p);
    if (p === 'custom') return;
    this.loading.set(true);
    const obs = p === 'hoje' ? this.finSvc.getRelatorioHoje()
              : p === 'mes'  ? this.finSvc.getRelatorioMes()
              : this.finSvc.getRelatorioPeriodo(
                  new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10),
                  new Date().toISOString().substring(0, 10));
    obs.subscribe({
      next:  r  => { this.processarRelatorio(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  buscarCustom() {
    this.loading.set(true);
    this.finSvc.getRelatorioPeriodo(this.dataInicio, this.dataFim).subscribe({
      next:  r  => { this.processarRelatorio(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private processarRelatorio(r: RelatorioFinanceiro) {
    this.relatorio.set(r);

    const mapa: Record<string, number> = {
      DINHEIRO: 0, PIX: 0, CARTAO_DEBITO: 0, CARTAO_CREDITO: 0
    };

    this.vendasHoje().forEach(v => {
      const tipo = (v.formaPagamento || '').toUpperCase();
      if (tipo in mapa) mapa[tipo] += Number(v.valorTotal) || 0;
    });

    const totalPagamentos = Object.values(mapa).reduce((a, b) => a + b, 0) || 1;

    this.formasPagamento.set([
      { label: 'Dinheiro', icon: '💵', valor: mapa['DINHEIRO'],       pct: (mapa['DINHEIRO']       / totalPagamentos) * 100, cor: '#4ade80' },
      { label: 'Pix',      icon: '📱', valor: mapa['PIX'],            pct: (mapa['PIX']            / totalPagamentos) * 100, cor: '#60a5fa' },
      { label: 'Débito',   icon: '💳', valor: mapa['CARTAO_DEBITO'],  pct: (mapa['CARTAO_DEBITO']  / totalPagamentos) * 100, cor: '#f59e0b' },
      { label: 'Crédito',  icon: '💳', valor: mapa['CARTAO_CREDITO'], pct: (mapa['CARTAO_CREDITO'] / totalPagamentos) * 100, cor: '#a78bfa' },
    ]);

    if (r.resumoDiario.length > 0) {
      this.maxVenda = Math.max(...r.resumoDiario.map(d => d.totalVendas));
    }
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DashboardService } from '../../core/services/services';
import { DashboardData } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, CurrencyPipe, DecimalPipe],
  template: `
<div class="mf-page">
  <div class="mf-section-header">
    <div>
      <h1 class="mf-page-title">Dashboard</h1>
      <p class="mf-page-subtitle">{{ today | date:"EEEE, d 'de' MMMM" : '' : 'pt-BR' }}</p>
    </div>
    <div style="display:flex;gap:.5rem">
      <a mat-stroked-button routerLink="/caixa">
        <mat-icon>point_of_sale</mat-icon> Ir para o Caixa
      </a>
    </div>
  </div>

  @if (loading()) {
    <div class="mf-stat-grid">
      @for (i of [1,2,3,4,5]; track i) {
        <div class="mf-skeleton" style="height:120px"></div>
      }
    </div>
  } @else if (data()) {
    <!-- ── Alertas críticos ── -->
    @if (data()!.totalAlertas > 0) {
      <div class="mf-alert warning" style="margin-bottom:1rem">
        <mat-icon>warning</mat-icon>
        <span>
          <strong>{{ data()!.totalAlertas }} alerta(s) de estoque</strong> —
          {{ data()!.produtosEstoqueZerado }} zerado(s),
          {{ data()!.produtosEstoqueBaixo }} abaixo do mínimo,
          {{ data()!.produtosVencidos }} vencido(s).
          <a routerLink="/produtos" style="font-weight:600;margin-left:4px">Ver produtos →</a>
        </span>
      </div>
    }

    <!-- ── Status do caixa ── -->
    @if (!data()!.caixaAberto) {
      <div class="mf-alert info" style="margin-bottom:1rem">
        <mat-icon>point_of_sale</mat-icon>
        <span>Caixa fechado. <a routerLink="/caixa" style="font-weight:600">Abrir caixa →</a></span>
      </div>
    }

    <!-- ── KPI Cards ── -->
    <div class="mf-stat-grid" style="margin-bottom:1.5rem">

      <div class="mf-stat-card blue">
        <div class="stat-icon"><span class="material-symbols-rounded">payments</span></div>
        <div class="stat-label">Vendas Hoje</div>
        <div class="stat-value">{{ data()!.totalVendasHoje | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        <div class="stat-sub">{{ data()!.quantidadeVendasHoje }} venda(s)</div>
      </div>

      <div class="mf-stat-card green">
        <div class="stat-icon"><span class="material-symbols-rounded">trending_up</span></div>
        <div class="stat-label">Lucro Estimado</div>
        <div class="stat-value"
             [style.color]="data()!.lucroEstimadoHoje >= 0 ? 'var(--mf-green)' : 'var(--mf-red)'">
          {{ data()!.lucroEstimadoHoje | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
        </div>
        <div class="stat-sub">Receita − Despesas</div>
      </div>

      <div class="mf-stat-card amber">
        <div class="stat-icon"><span class="material-symbols-rounded">receipt_long</span></div>
        <div class="stat-label">Despesas Hoje</div>
        <div class="stat-value">{{ data()!.totalDespesasHoje | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        <div class="stat-sub">
          <a routerLink="/financeiro" style="color:inherit">Lançar despesa →</a>
        </div>
      </div>

      <div class="mf-stat-card" [class.blue]="data()!.caixaAberto" [class]="data()!.caixaAberto ? 'mf-stat-card blue' : 'mf-stat-card'">
        <div class="stat-icon">
          <span class="material-symbols-rounded">{{ data()!.caixaAberto ? 'lock_open' : 'lock' }}</span>
        </div>
        <div class="stat-label">Caixa</div>
        <div class="stat-value" style="font-size:1.1rem">
          {{ data()!.caixaAberto ? 'Aberto' : 'Fechado' }}
        </div>
        @if (data()!.caixaAtual) {
          <div class="stat-sub">
            Total: {{ data()!.caixaAtual!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
          </div>
        }
      </div>

      <div class="mf-stat-card" [class]="data()!.totalAlertas > 0 ? 'mf-stat-card red' : 'mf-stat-card green'">
        <div class="stat-icon"><span class="material-symbols-rounded">inventory</span></div>
        <div class="stat-label">Alertas Estoque</div>
        <div class="stat-value">{{ data()!.totalAlertas }}</div>
        <div class="stat-sub">
          <a routerLink="/produtos" style="color:inherit">Ver produtos →</a>
        </div>
      </div>

    </div>

    <!-- ── Ações rápidas ── -->
    <div class="mf-section-header">
      <h2 style="font-size:1rem;font-weight:600;color:var(--mf-gray-700)">Ações Rápidas</h2>
    </div>

    <div class="quick-actions">
      @for (a of actions; track a.path) {
        <a class="quick-card" [routerLink]="a.path">
          <div class="quick-icon" [style.background]="a.bg" [style.color]="a.color">
            <span class="material-symbols-rounded">{{ a.icon }}</span>
          </div>
          <div>
            <div class="quick-title">{{ a.title }}</div>
            <div class="quick-desc">{{ a.desc }}</div>
          </div>
        </a>
      }
    </div>

    <!-- ── Caixa detalhado (se aberto) ── -->
    @if (data()!.caixaAtual) {
      <div class="mf-card" style="margin-top:1.5rem">
        <h3 style="font-size:.95rem;font-weight:600;margin-bottom:1rem;color:var(--mf-gray-700)">
          Resumo do Caixa Atual
        </h3>
        <div class="caixa-grid">
          <div class="caixa-row">
            <span>💵 Dinheiro</span>
            <strong>{{ data()!.caixaAtual!.totalDinheiro | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
          <div class="caixa-row">
            <span>📱 Pix</span>
            <strong>{{ data()!.caixaAtual!.totalPix | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
          <div class="caixa-row">
            <span>💳 Débito</span>
            <strong>{{ data()!.caixaAtual!.totalCartaoDebito | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
          <div class="caixa-row">
            <span>💳 Crédito</span>
            <strong>{{ data()!.caixaAtual!.totalCartaoCredito | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
          <div class="caixa-row total">
            <span>Total Geral</span>
            <strong>{{ data()!.caixaAtual!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
        </div>
      </div>
    }
  }
</div>
  `,
  styles: [`
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: .75rem;
    }
    .quick-card {
      display: flex; align-items: center; gap: 1rem;
      background: var(--mf-surface); border: 1px solid var(--mf-border);
      border-radius: var(--mf-radius); padding: 1rem 1.25rem;
      text-decoration: none; box-shadow: var(--mf-shadow-sm);
      transition: transform .15s, box-shadow .15s;
      &:hover { transform: translateY(-2px); box-shadow: var(--mf-shadow); }
    }
    .quick-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      span { font-size: 22px; font-variation-settings: 'FILL' 1; }
    }
    .quick-title { font-size: .875rem; font-weight: 600; color: var(--mf-gray-800); }
    .quick-desc  { font-size: .75rem; color: var(--mf-gray-400); margin-top: 2px; }

    .caixa-grid { display: flex; flex-direction: column; gap: .5rem; }
    .caixa-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: .5rem .75rem; border-radius: var(--mf-radius-sm);
      background: var(--mf-gray-50); font-size: .875rem; color: var(--mf-gray-600);
      strong { color: var(--mf-gray-800); font-family: var(--mf-mono); }
      &.total {
        background: var(--mf-blue-light); font-weight: 600;
        color: var(--mf-blue-dark);
        strong { color: var(--mf-blue); font-size: 1.1rem; }
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private svc = inject(DashboardService);
  data    = signal<DashboardData | null>(null);
  loading = signal(true);
  today   = new Date();

  actions = [
    { path: '/caixa',      icon: 'point_of_sale',         title: 'Nova Venda',       desc: 'Registrar venda no PDV',     bg: '#e0e7ff', color: 'var(--mf-blue)' },
    { path: '/financeiro', icon: 'add_card',               title: 'Lançar Despesa',   desc: 'Registrar saída de caixa',   bg: '#fef3c7', color: 'var(--mf-amber)' },
    { path: '/produtos',   icon: 'inventory_2',            title: 'Produtos',         desc: 'Estoque e cadastro',         bg: '#dcfce7', color: 'var(--mf-green)' },
    { path: '/fiado',      icon: 'book_2',                 title: 'Fiado',            desc: 'Caderninho de clientes',     bg: '#fce7f3', color: '#be185d' },
    { path: '/relatorios', icon: 'bar_chart',              title: 'Relatórios',       desc: 'Vendas e lucro do período',  bg: '#f3e8ff', color: '#7c3aed' },
  ];

  ngOnInit() {
    this.svc.getResumo().subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: ()  => this.loading.set(false)
    });
  }
}

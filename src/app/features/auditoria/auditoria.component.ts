import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditoriaService } from '../../core/services/services';
import { AuditLog } from '../../core/models/models';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatTableModule, MatPaginatorModule, MatTabsModule,
    MatTooltipModule, DatePipe
  ],
  template: `
<div class="mf-page">

  <!-- Cabeçalho -->
  <div class="mf-section-header">
    <div>
      <h1 class="mf-page-title">Auditoria</h1>
      <p class="mf-page-subtitle">Histórico completo de ações do sistema</p>
    </div>
  </div>

  <mat-tab-group (selectedIndexChange)="onTabChange($event)">

    <!-- ── Aba 1: Feed completo ── -->
    <mat-tab label="Todas as ações">

      <!-- Filtros -->
      <div class="mf-card filtros-card">
        <div class="filtros-row">
          <mat-form-field appearance="outline" class="filtro-field">
            <mat-label>Entidade</mat-label>
            <mat-select [(ngModel)]="filtroEntidade" (selectionChange)="aplicarFiltros()">
              <mat-option value="">Todas</mat-option>
              <mat-option value="Venda">Venda</mat-option>
              <mat-option value="Produto">Produto</mat-option>
              <mat-option value="Caixa">Caixa</mat-option>
              <mat-option value="Despesa">Despesa</mat-option>
              <mat-option value="Fiado">Fiado</mat-option>
              <mat-option value="Auth">Login</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filtro-field">
            <mat-label>Data início</mat-label>
            <input matInput type="date" [(ngModel)]="filtroInicio"
                   (change)="aplicarFiltros()">
          </mat-form-field>

          <mat-form-field appearance="outline" class="filtro-field">
            <mat-label>Data fim</mat-label>
            <input matInput type="date" [(ngModel)]="filtroFim"
                   (change)="aplicarFiltros()">
          </mat-form-field>

          <button mat-stroked-button (click)="limparFiltros()">
            <mat-icon>clear</mat-icon> Limpar
          </button>
        </div>
      </div>

      <!-- Tabela de logs -->
      <div class="mf-card" style="padding:0;overflow:hidden;margin-top:1rem">
        <table mat-table [dataSource]="dataSource" style="width:100%">

          <ng-container matColumnDef="criadoEm">
            <th mat-header-cell *matHeaderCellDef>Data/Hora</th>
            <td mat-cell *matCellDef="let log">
              <span class="log-data">
                {{ log.criadoEm | date:'dd/MM/yyyy' }}
              </span>
              <span class="log-hora">
                {{ log.criadoEm | date:'HH:mm:ss' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="usuarioNome">
            <th mat-header-cell *matHeaderCellDef>Usuário</th>
            <td mat-cell *matCellDef="let log">
              <div class="usuario-chip">
                <div class="usuario-avatar">{{ log.usuarioNome[0] }}</div>
                <span>{{ log.usuarioNome }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="acao">
            <th mat-header-cell *matHeaderCellDef>Ação</th>
            <td mat-cell *matCellDef="let log">
              <span class="mf-badge" [class]="getBadgeClass(log.acao)">
                {{ formatarAcao(log.acao) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="descricao">
            <th mat-header-cell *matHeaderCellDef>Descrição</th>
            <td mat-cell *matCellDef="let log">
              <span class="log-descricao" [matTooltip]="log.descricao">
                {{ log.descricao }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="valores">
            <th mat-header-cell *matHeaderCellDef>Alteração</th>
            <td mat-cell *matCellDef="let log">
              @if (log.valorAnterior || log.valorPosterior) {
                <div class="valores-wrap">
                  @if (log.valorAnterior) {
                    <span class="valor-antes">{{ log.valorAnterior }}</span>
                    <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--mf-gray-400)">
                      arrow_forward
                    </mat-icon>
                  }
                  @if (log.valorPosterior) {
                    <span class="valor-depois">{{ log.valorPosterior }}</span>
                  }
                </div>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas"
              class="log-row"></tr>
        </table>

        @if (loading()) {
          <div class="estado-vazio">Carregando...</div>
        }
        @if (!loading() && dataSource.data.length === 0) {
          <div class="estado-vazio">
            <mat-icon>manage_search</mat-icon>
            <p>Nenhum registro encontrado</p>
          </div>
        }

        <mat-paginator
          [length]="totalElementos()"
          [pageSize]="50"
          [pageSizeOptions]="[25, 50, 100]"
          (page)="onPage($event)"
          showFirstLastButtons>
        </mat-paginator>
      </div>
    </mat-tab>

    <!-- ── Aba 2: Ações suspeitas ── -->
    <mat-tab label="⚠️ Ações Suspeitas">
      <div style="padding:1rem 0">

        @if (suspeitas().length === 0 && !loadingSuspeitas()) {
          <div class="estado-vazio">
            <mat-icon style="color:var(--mf-green)">verified_user</mat-icon>
            <p>Nenhuma ação suspeita hoje</p>
          </div>
        }

        @for (log of suspeitas(); track log.id) {
          <div class="suspeita-card">
            <div class="suspeita-icone">
              <mat-icon>{{ getIconeSuspeita(log.acao) }}</mat-icon>
            </div>
            <div class="suspeita-info">
              <div class="suspeita-desc">{{ log.descricao }}</div>
              <div class="suspeita-meta">
                {{ log.criadoEm | date:'HH:mm' }} ·
                <span class="mf-badge" [class]="getBadgeClass(log.acao)">
                  {{ formatarAcao(log.acao) }}
                </span>
              </div>
            </div>
            @if (log.valorAnterior) {
              <div class="suspeita-diff">
                <span class="valor-antes">{{ log.valorAnterior }}</span>
                <mat-icon style="font-size:14px">arrow_forward</mat-icon>
                <span class="valor-depois">{{ log.valorPosterior }}</span>
              </div>
            }
          </div>
        }
      </div>
    </mat-tab>

    <!-- ── Aba 3: Cancelamentos por operador ── -->
    <mat-tab label="Cancelamentos por Operador">
      <div style="padding:1rem 0">

        @if (cancelamentos().length === 0) {
          <div class="estado-vazio">
            <mat-icon style="color:var(--mf-green)">check_circle</mat-icon>
            <p>Nenhum cancelamento hoje</p>
          </div>
        }

        @for (item of cancelamentos(); track item.operador) {
          <div class="cancelamento-card">
            <div class="cancel-avatar">{{ item.operador[0] }}</div>
            <div class="cancel-info">
              <div class="cancel-nome">{{ item.operador }}</div>
              <div class="cancel-sub">cancelamentos hoje</div>
            </div>
            <div class="cancel-count"
                 [class.alto]="item.totalCancelamentos >= 3">
              {{ item.totalCancelamentos }}
            </div>
          </div>
        }
      </div>
    </mat-tab>

  </mat-tab-group>
</div>
  `,
  styles: [`
    .filtros-card {
      margin-top: 1rem;
      padding: 1rem 1.25rem;
    }

    .filtros-row {
      display: flex;
      align-items: center;
      gap: .75rem;
      flex-wrap: wrap;
    }

    .filtro-field {
      min-width: 160px;
      margin-bottom: -1.25em;
    }

    /* Tabela */
    .log-data {
      display: block;
      font-size: .8rem;
      font-weight: 600;
      color: var(--mf-gray-700);
    }

    .log-hora {
      display: block;
      font-size: .72rem;
      color: var(--mf-gray-400);
      font-family: var(--mf-mono);
    }

    .usuario-chip {
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    .usuario-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--mf-blue);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .7rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .log-descricao {
      font-size: .82rem;
      color: var(--mf-gray-700);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 380px;
    }

    .valores-wrap {
      display: flex;
      align-items: center;
      gap: .35rem;
      flex-wrap: wrap;
    }

    .valor-antes {
      font-size: .75rem;
      background: var(--mf-red-light);
      color: var(--mf-red);
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--mf-mono);
      text-decoration: line-through;
    }

    .valor-depois {
      font-size: .75rem;
      background: var(--mf-green-light);
      color: var(--mf-green);
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--mf-mono);
    }

    .log-row:hover { background: var(--mf-gray-50); }

    .estado-vazio {
      padding: 3rem;
      text-align: center;
      color: var(--mf-gray-300);
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: .5rem;
      }
      p { color: var(--mf-gray-400); margin-top: .5rem; }
    }

    /* Aba Suspeitas */
    .suspeita-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: .9rem 1rem;
      background: white;
      border: 1px solid var(--mf-border);
      border-left: 3px solid var(--mf-red);
      border-radius: var(--mf-radius-sm);
      margin-bottom: .5rem;
    }

    .suspeita-icone {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--mf-red-light);
      color: var(--mf-red);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .suspeita-info { flex: 1; }

    .suspeita-desc {
      font-size: .875rem;
      font-weight: 500;
      color: var(--mf-gray-800);
    }

    .suspeita-meta {
      font-size: .75rem;
      color: var(--mf-gray-400);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: .4rem;
    }

    .suspeita-diff {
      display: flex;
      align-items: center;
      gap: .35rem;
    }

    /* Aba Cancelamentos */
    .cancelamento-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: white;
      border: 1px solid var(--mf-border);
      border-radius: var(--mf-radius);
      margin-bottom: .5rem;
    }

    .cancel-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--mf-blue);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }

    .cancel-info { flex: 1; }
    .cancel-nome { font-weight: 600; font-size: .9rem; }
    .cancel-sub  { font-size: .75rem; color: var(--mf-gray-400); }

    .cancel-count {
      font-size: 1.75rem;
      font-weight: 800;
      font-family: var(--mf-mono);
      color: var(--mf-gray-400);
      &.alto { color: var(--mf-red); }
    }
  `]
})
export class AuditoriaComponent implements OnInit {
  private svc = inject(AuditoriaService);

  // ── Estado ──────────────────────────────────────────────────
  dataSource     = new MatTableDataSource<AuditLog>();
  loading        = signal(false);
  loadingSuspeitas = signal(false);
  totalElementos = signal(0);
  suspeitas      = signal<AuditLog[]>([]);
  cancelamentos  = signal<{ operador: string; totalCancelamentos: number }[]>([]);

  colunas = ['criadoEm', 'usuarioNome', 'acao', 'descricao', 'valores'];

  // ── Filtros ─────────────────────────────────────────────────
  filtroEntidade = '';
  filtroInicio   = '';
  filtroFim      = '';
  paginaAtual    = 0;

  ngOnInit() {
    this.carregarLogs();
    this.carregarSuspeitas();
    this.carregarCancelamentos();
  }

  // ── Carregar dados ──────────────────────────────────────────

  carregarLogs() {
    this.loading.set(true);
    this.svc.listar(this.paginaAtual, 50, {
      entidade: this.filtroEntidade || undefined,
      inicio:   this.filtroInicio  || undefined,
      fim:      this.filtroFim     || undefined
    }).subscribe({
      next: page => {
        this.dataSource.data = page.content;
        this.totalElementos.set(page.totalElementos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  carregarSuspeitas() {
    this.loadingSuspeitas.set(true);
    this.svc.listarSuspeitas().subscribe({
      next: logs => { this.suspeitas.set(logs); this.loadingSuspeitas.set(false); },
      error: ()   => this.loadingSuspeitas.set(false)
    });
  }

  carregarCancelamentos() {
    this.svc.cancelamentosPorOperador().subscribe(
      dados => this.cancelamentos.set(dados)
    );
  }

  // ── Eventos ─────────────────────────────────────────────────

  onTabChange(index: number) {
    if (index === 1) this.carregarSuspeitas();
    if (index === 2) this.carregarCancelamentos();
  }

  aplicarFiltros() {
    this.paginaAtual = 0;
    this.carregarLogs();
  }

  limparFiltros() {
    this.filtroEntidade = '';
    this.filtroInicio   = '';
    this.filtroFim      = '';
    this.aplicarFiltros();
  }

  onPage(event: PageEvent) {
    this.paginaAtual = event.pageIndex;
    this.carregarLogs();
  }

  // ── Helpers de exibição ─────────────────────────────────────

  formatarAcao(acao: string): string {
    const mapa: Record<string, string> = {
      VENDA_CRIADA:       'Venda',
      VENDA_CANCELADA:    'Cancelamento',
      PRODUTO_CRIADO:     'Novo produto',
      PRODUTO_EDITADO:    'Produto editado',
      PRODUTO_DESATIVADO: 'Produto removido',
      ESTOQUE_ENTRADA:    'Entrada estoque',
      ESTOQUE_AJUSTE:     'Ajuste estoque',
      CAIXA_ABERTO:       'Caixa aberto',
      CAIXA_FECHADO:      'Caixa fechado',
      DESPESA_LANCADA:    'Despesa',
      DESPESA_EXCLUIDA:   'Despesa removida',
      FIADO_DEBITO:       'Fiado',
      FIADO_PAGAMENTO:    'Pgto fiado',
      LOGIN_REALIZADO:    'Login',
      LOGIN_FALHOU:       'Login falhou',
    };
    return mapa[acao] ?? acao;
  }

  getBadgeClass(acao: string): string {
    if (['VENDA_CANCELADA', 'DESPESA_EXCLUIDA',
         'PRODUTO_DESATIVADO', 'LOGIN_FALHOU',
         'ESTOQUE_AJUSTE'].includes(acao)) {
      return 'danger';
    }
    if (['VENDA_CRIADA', 'PRODUTO_CRIADO',
         'CAIXA_ABERTO', 'LOGIN_REALIZADO'].includes(acao)) {
      return 'success';
    }
    if (['CAIXA_FECHADO', 'FIADO_DEBITO'].includes(acao)) {
      return 'warning';
    }
    return 'info';
  }

  getIconeSuspeita(acao: string): string {
    const mapa: Record<string, string> = {
      VENDA_CANCELADA:    'remove_shopping_cart',
      DESPESA_EXCLUIDA:   'delete',
      ESTOQUE_AJUSTE:     'tune',
      PRODUTO_DESATIVADO: 'inventory_2',
    };
    return mapa[acao] ?? 'warning';
  }
}
import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ProdutoService, CategoriaService } from '../../core/services/services';
import { Produto, Categoria, AlertasEstoque } from '../../core/models/models';
import { LojaSelectorComponent } from '../../shared/components/loja-selector/loja-selector.component';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatSelectModule, MatSnackBarModule, MatChipsModule,
    MatTabsModule, MatTooltipModule, CurrencyPipe, DatePipe ,LojaSelectorComponent ],
  template: `
<div class="mf-page">
  <div class="mf-section-header">
    <div>
      <h1 class="mf-page-title">Produtos</h1>
      <p class="mf-page-subtitle">{{ totalElementos() }} produto(s) cadastrado(s)</p>
    </div>
    <button mat-flat-button color="primary" (click)="abrirForm()">
      <mat-icon>add</mat-icon> Novo Produto
    </button>
  </div>

  <!-- Alertas -->
  @if (alertas() && alertas()!.totalAlertas > 0) {
    <mat-tab-group class="alertas-tabs" style="margin-bottom:1rem">
      @if (alertas()!.estoqueZerado.length) {
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon color="warn">block</mat-icon>&nbsp;
            Zerados ({{ alertas()!.estoqueZerado.length }})
          </ng-template>
          <div class="alerta-list">
            @for (p of alertas()!.estoqueZerado; track p.id) {
              <div class="alerta-item danger">
                <strong>{{ p.nome }}</strong>
                <span class="mf-badge danger">Sem estoque</span>
              </div>
            }
          </div>
        </mat-tab>
      }
      @if (alertas()!.estoqueBaixo.length) {
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="color:var(--mf-amber)">warning</mat-icon>&nbsp;
            Estoque Baixo ({{ alertas()!.estoqueBaixo.length }})
          </ng-template>
          <div class="alerta-list">
            @for (p of alertas()!.estoqueBaixo; track p.id) {
              <div class="alerta-item warning">
                <strong>{{ p.nome }}</strong>
                <span>{{ p.quantidadeEstoque }} un</span>
              </div>
            }
          </div>
        </mat-tab>
      }
      @if (alertas()!.vencidos.length) {
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon color="warn">event_busy</mat-icon>&nbsp;
            Vencidos ({{ alertas()!.vencidos.length }})
          </ng-template>
          <div class="alerta-list">
            @for (p of alertas()!.vencidos; track p.id) {
              <div class="alerta-item danger">
                <strong>{{ p.nome }}</strong>
                <span>{{ p.dataValidade | date:'dd/MM/yyyy' }}</span>
              </div>
            }
          </div>
        </mat-tab>
      }
    </mat-tab-group>
  }

  <!-- Busca -->
  <div class="mf-card" style="margin-bottom:1rem;padding:1rem">
    <div style="display:flex;gap:.75rem;flex-wrap:wrap">
      <mat-form-field appearance="outline" style="flex:1;min-width:200px;margin-bottom:-1.25em">
        <mat-label>Buscar produto</mat-label>
        <input matInput (input)="onBusca($event)" placeholder="Nome ou código de barras">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline" style="min-width:160px;margin-bottom:-1.25em">
        <mat-label>Categoria</mat-label>
        <mat-select (selectionChange)="onCategoria($event.value)">
          <mat-option [value]="null">Todas</mat-option>
          @for (c of categorias(); track c.id) {
            <mat-option [value]="c.id">{{ c.nome }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
            <app-loja-selector (lojaChange)="onLojaChange($event)"></app-loja-selector>
    </div>
  </div>

  <!-- Tabela -->
  <div class="mf-card" style="padding:0;overflow:hidden">
    <table mat-table [dataSource]="dataSource" class="w-full">

      <ng-container matColumnDef="nome">
        <th mat-header-cell *matHeaderCellDef>Produto</th>
        <td mat-cell *matCellDef="let p">
          <div class="prod-nome">{{ p.nome }}</div>
          <div class="prod-cat">{{ p.categoriaNome }}</div>
        </td>
      </ng-container>

      <ng-container matColumnDef="codigoBarras">
        <th mat-header-cell *matHeaderCellDef>Código</th>
        <td mat-cell *matCellDef="let p">
          <code style="font-size:.75rem;color:var(--mf-gray-500)">{{ p.codigoBarras || '—' }}</code>
        </td>
      </ng-container>

      <ng-container matColumnDef="estoque">
        <th mat-header-cell *matHeaderCellDef>Estoque</th>
        <td mat-cell *matCellDef="let p">
          <span [class]="p.estoqueZerado ? 'mf-badge danger' : p.estoqueBaixo ? 'mf-badge warning' : 'mf-badge success'">
            {{ p.quantidadeEstoque }} un
          </span>
        </td>
      </ng-container>

      <ng-container matColumnDef="precos">
        <th mat-header-cell *matHeaderCellDef>Custo / Venda</th>
        <td mat-cell *matCellDef="let p">
          <div class="preco-custo">{{ p.precoCusto | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
          <div class="preco-venda">{{ p.precoVenda | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
        </td>
      </ng-container>

      <ng-container matColumnDef="margem">
        <th mat-header-cell *matHeaderCellDef>Margem</th>
        <td mat-cell *matCellDef="let p">
          <span [style.color]="p.margem > 20 ? 'var(--mf-green)' : 'var(--mf-amber)'"
                style="font-weight:600;font-family:var(--mf-mono)">
            {{ p.margem | number:'1.1-1' }}%
          </span>
        </td>
      </ng-container>

      <ng-container matColumnDef="validade">
        <th mat-header-cell *matHeaderCellDef>Validade</th>
        <td mat-cell *matCellDef="let p">
          @if (p.dataValidade) {
            <span [class]="p.vencido ? 'mf-badge danger' : p.validadeProxima ? 'mf-badge warning' : 'mf-badge neutral'">
              {{ p.dataValidade | date:'dd/MM/yyyy' }}
            </span>
          } @else { <span style="color:var(--mf-gray-300)">—</span> }
        </td>
      </ng-container>

      <ng-container matColumnDef="acoes">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let p">
          <div style="display:flex;gap:4px;justify-content:flex-end">
            <button mat-icon-button (click)="abrirForm(p)" matTooltip="Editar">
              <mat-icon style="font-size:18px">edit</mat-icon>
            </button>
            <button mat-icon-button (click)="abrirAjuste(p)" matTooltip="Ajustar estoque">
              <mat-icon style="font-size:18px">tune</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="desativar(p)" matTooltip="Desativar">
              <mat-icon style="font-size:18px">delete_outline</mat-icon>
            </button>
          </div>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;" class="produto-row"></tr>
    </table>

    @if (loading()) {
      <div style="padding:3rem;text-align:center;color:var(--mf-gray-400)">
        Carregando produtos...
      </div>
    }
    @if (!loading() && dataSource.data.length === 0) {
      <div style="padding:3rem;text-align:center;color:var(--mf-gray-400)">
        <mat-icon style="font-size:48px;width:48px;height:48px;margin-bottom:.5rem">inventory_2</mat-icon>
        <p>Nenhum produto encontrado</p>
      </div>
    }

    <mat-paginator [length]="totalElementos()" [pageSize]="20"
                   (page)="onPage($event)" showFirstLastButtons></mat-paginator>
  </div>

  <!-- Form inline -->
  @if (showForm()) {
    <div class="form-overlay" (click)="fecharForm()"></div>
    <div class="form-drawer">
      <div class="drawer-header">
        <h2>{{ editingId() ? 'Editar Produto' : 'Novo Produto' }}</h2>
        <button mat-icon-button (click)="fecharForm()"><mat-icon>close</mat-icon></button>
      </div>
      <form [formGroup]="produtoForm" (ngSubmit)="salvar()" class="drawer-form">
        <mat-form-field appearance="outline" floatLabel="always"><mat-label>Nome</mat-label>
          <input matInput formControlName="nome">
        </mat-form-field>
        <mat-form-field appearance="outline" floatLabel="always"><mat-label>Código de Barras</mat-label>
          <input matInput formControlName="codigoBarras">
        </mat-form-field>
        <mat-form-field appearance="outline" floatLabel="always"><mat-label>Categoria</mat-label>
          <mat-select formControlName="categoriaId">
            <mat-option [value]="null">Sem categoria</mat-option>
            @for (c of categorias(); track c.id) {
              <mat-option [value]="c.id">{{ c.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="form-row">
          <mat-form-field appearance="outline" floatLabel="always"><mat-label>Preço de Custo *</mat-label>
            <input matInput type="number" step="0.01" formControlName="precoCusto">
            <span matTextPrefix>R$&nbsp;</span>
          </mat-form-field>
          <mat-form-field appearance="outline" floatLabel="always"><mat-label>Preço de Venda *</mat-label>
            <input matInput type="number" step="0.01" formControlName="precoVenda">
            <span matTextPrefix>R$&nbsp;</span>
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" floatLabel="always"><mat-label>Qtd Estoque</mat-label>
            <input matInput type="number" formControlName="quantidadeEstoque">
          </mat-form-field>
          <mat-form-field appearance="outline" floatLabel="always"><mat-label>Estoque Mínimo</mat-label>
            <input matInput type="number" formControlName="estoqueMinimo">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" floatLabel="always"><mat-label>Data de Validade</mat-label>
          <input matInput type="date" formControlName="dataValidade">
        </mat-form-field>
        <mat-form-field appearance="outline" floatLabel="always"><mat-label>Descrição</mat-label>
          <textarea matInput formControlName="descricao" rows="2"></textarea>
        </mat-form-field>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem">
          <button mat-stroked-button type="button" (click)="fecharForm()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="produtoForm.invalid || saving()">
            {{ saving() ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </form>
    </div>
  }
</div>
  `,
  styles: [`
    .prod-nome { font-weight: 500; color: var(--mf-gray-800); }
    .prod-cat  { font-size: .75rem; color: var(--mf-gray-400); }
    .preco-custo { font-size: .75rem; color: var(--mf-gray-400); font-family: var(--mf-mono); }
    .preco-venda { font-size: .9rem; font-weight: 600; color: var(--mf-gray-800); font-family: var(--mf-mono); }
    .produto-row:hover { background: var(--mf-gray-50); }

    .alerta-list { padding: .75rem 1rem; display: flex; flex-direction: column; gap: .5rem; }
    .alerta-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: .5rem .75rem; border-radius: 6px; font-size: .875rem;
      &.danger  { background: var(--mf-red-light); color: var(--mf-red); }
      &.warning { background: var(--mf-amber-light); color: var(--mf-amber); }
    }

    .form-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 200;
    }
    .form-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: 420px;
      background: white; z-index: 201; box-shadow: var(--mf-shadow-lg);
      display: flex; flex-direction: column;
      animation: slideIn .2s ease;
      @media (max-width: 480px) { width: 100%; }
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--mf-border);
      h2 { font-size: 1rem; font-weight: 600; }
    }
    .drawer-form {
      padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1;
      display: flex; flex-direction: column; gap: .1rem;
      mat-form-field { width: 100%; }
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
    .alertas-tabs ::ng-deep .mat-mdc-tab-body-wrapper { padding: 0; }
    .w-full { width: 100%; }
  `]
})
export class ProdutosComponent implements OnInit {
  private produtoSvc  = inject(ProdutoService);
  private categoriaSvc = inject(CategoriaService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  cols = ['nome', 'codigoBarras', 'estoque', 'precos', 'margem', 'validade', 'acoes'];
  dataSource = new MatTableDataSource<Produto>();

  loading      = signal(true);
  saving       = signal(false);
  showForm     = signal(false);
  editingId    = signal<number | null>(null);
  totalElementos = signal(0);
  categorias   = signal<Categoria[]>([]);
  alertas      = signal<AlertasEstoque | null>(null);

  private busca$ = new Subject<string>();
  private buscaAtual = '';
  private categoriaAtual: number | null = null;
   private lojaAtual: number | null = null;
  private paginaAtual = 0;

  produtoForm = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    codigoBarras: [''], descricao: [''], categoriaId: this.fb.control<number | null>(null),
    quantidadeEstoque: [0, [Validators.required, Validators.min(0)]],
    estoqueMinimo: [10], precoCusto: [0, [Validators.required, Validators.min(0.01)]],
    precoVenda:   [0, [Validators.required, Validators.min(0.01)]],
    dataValidade: ['']
  });

  ngOnInit() {
    this.carregarProdutos();
    this.carregarCategorias();
    this.carregarAlertas();
    this.busca$.pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(b => { this.buscaAtual = b; this.paginaAtual = 0; this.carregarProdutos(); });
  }

 carregarProdutos() {
    this.loading.set(true);
    this.produtoSvc.listar(this.buscaAtual || undefined, this.categoriaAtual ?? undefined, this.paginaAtual, 20, this.lojaAtual ?? undefined)
      .subscribe({ next: p => { this.dataSource.data = p.content; this.totalElementos.set(p.totalElementos); this.loading.set(false); },
                   error: () => this.loading.set(false) });
  }
  carregarCategorias() { this.categoriaSvc.listar().subscribe(c => this.categorias.set(c)); }
  carregarAlertas()    { this.produtoSvc.getAlertas().subscribe(a => this.alertas.set(a)); }

  onBusca(e: Event) { this.busca$.next((e.target as HTMLInputElement).value); }
  onCategoria(id: number | null) { this.categoriaAtual = id; this.paginaAtual = 0; this.carregarProdutos(); }
  onLojaChange(lojaId: number | null) { this.lojaAtual = lojaId; this.paginaAtual = 0; this.carregarProdutos(); }
  onPage(e: any) { this.paginaAtual = e.pageIndex; this.carregarProdutos(); }

  abrirForm(p?: Produto) {
    this.editingId.set(p?.id ?? null);
    if (p) {
      this.produtoForm.patchValue({ ...p, dataValidade: p.dataValidade?.substring(0, 10) ?? '' });
    } else {
      this.produtoForm.reset({ quantidadeEstoque: 0, estoqueMinimo: 10 });
    }
    this.showForm.set(true);
  }
  fecharForm() { this.showForm.set(false); }

  salvar() {
    if (this.produtoForm.invalid) return;
    this.saving.set(true);
    const req = { ...this.produtoForm.value } as any;
    const obs = this.editingId()
      ? this.produtoSvc.atualizar(this.editingId()!, req)
      : this.produtoSvc.criar(req);
    obs.subscribe({
      next: () => { this.snack.open('Produto salvo com sucesso!', '', { duration: 3000 }); this.fecharForm(); this.carregarProdutos(); this.carregarAlertas(); this.saving.set(false); },
      error: err => { this.snack.open(err.error?.message || 'Erro ao salvar produto', '', { duration: 4000 }); this.saving.set(false); }
    });
  }

  abrirAjuste(p: Produto) {
    const qtd = parseInt(prompt(`Ajustar estoque de "${p.nome}" (atual: ${p.quantidadeEstoque})\nNova quantidade:`) ?? '', 10);
    if (isNaN(qtd) || qtd < 0) return;
    const motivo = prompt('Motivo do ajuste:') ?? 'Ajuste manual';
    this.produtoSvc.ajustarEstoque(p.id, { quantidade: qtd, tipo: 'AJUSTE_INVENTARIO', motivo }).subscribe({
      next: () => { this.snack.open('Estoque ajustado!', '', { duration: 3000 }); this.carregarProdutos(); this.carregarAlertas(); },
      error: err => this.snack.open(err.error?.message || 'Erro ao ajustar', '', { duration: 4000 })
    });
  }

  desativar(p: Produto) {
    if (!confirm(`Desativar "${p.nome}"?`)) return;
    this.produtoSvc.desativar(p.id).subscribe({
      next: () => { this.snack.open('Produto desativado', '', { duration: 3000 }); this.carregarProdutos(); },
      error: err => this.snack.open(err.error?.message || 'Erro', '', { duration: 4000 })
    });
  }
}

import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { CaixaService, VendaService, ProdutoService } from '../../core/services/services';
import { Caixa, Venda, Produto, FormaPagamento, ItemVendaRequest } from '../../core/models/models';

interface CarrinhoItem { produto: Produto; quantidade: number; subtotal: number; }

@Component({
  selector: 'app-caixa',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatDialogModule, MatTabsModule, CurrencyPipe],
  template: `
<div class="mf-page mf-pdv">

  <!-- Status do caixa -->
  @if (!caixaAberto()) {
    <div class="caixa-fechado">
      <div class="fechado-icon"><span class="material-symbols-rounded">point_of_sale</span></div>
      <h2>Caixa Fechado</h2>
      <p>Informe o valor inicial para abrir o caixa</p>
      <div class="abertura-form">
        <div class="input-money">
          <span>R$</span>
          <input type="number" step="0.01" [(ngModel)]="valorAbertura" placeholder="0,00" min="0">
        </div>
        <button mat-flat-button color="primary" class="mf-pdv-btn" (click)="abrirCaixa()" [disabled]="abrindo()">
          <mat-icon>lock_open</mat-icon>
          {{ abrindo() ? 'Abrindo...' : 'Abrir Caixa' }}
        </button>
      </div>
    </div>
  } @else {
    <div class="pdv-layout">

      <!-- ── Lado esquerdo: Busca + Carrinho ── -->
      <div class="pdv-left">

        <!-- Busca de produto -->
        <div class="busca-card">
          <div class="busca-input-wrap">
            <span class="material-symbols-rounded">qr_code_scanner</span>
            <input class="busca-input" [(ngModel)]="buscaInput"
                   (keyup.enter)="buscarProduto()"
                   (input)="onBuscaInput($event)"
                   placeholder="Código de barras ou nome do produto..." autofocus>
            <button mat-icon-button (click)="buscarProduto()">
              <mat-icon>search</mat-icon>
            </button>
          </div>
          <!-- Resultados de busca -->
          @if (resultadosBusca().length > 0) {
            <div class="busca-resultados">
              @for (p of resultadosBusca(); track p.id) {
                <div class="busca-item" (click)="adicionarProduto(p)">
                  <div>
                    <strong>{{ p.nome }}</strong>
                    <span class="busca-estoque" [class.low]="p.estoqueBaixo">
                      {{ p.quantidadeEstoque }} em estoque
                    </span>
                  </div>
                  <span class="busca-preco">{{ p.precoVenda | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Carrinho -->
        <div class="carrinho-card">
          <div class="carrinho-header">
            <h2>Carrinho</h2>
            @if (carrinho().length) {
              <button mat-button color="warn" (click)="limparCarrinho()">
                <mat-icon>delete_sweep</mat-icon> Limpar
              </button>
            }
          </div>

          @if (carrinho().length === 0) {
            <div class="carrinho-vazio">
              <span class="material-symbols-rounded">shopping_cart</span>
              <p>Carrinho vazio</p>
              <small>Busque um produto para adicionar</small>
            </div>
          } @else {
            <div class="carrinho-items">
              @for (item of carrinho(); track item.produto.id) {
                <div class="carrinho-item">
                  <div class="item-info">
                    <div class="item-nome">{{ item.produto.nome }}</div>
                    <div class="item-preco">{{ item.produto.precoVenda | currency:'BRL':'symbol':'1.2-2':'pt-BR' }} un</div>
                  </div>
                  <div class="item-qty">
                    <button mat-icon-button (click)="alterarQtd(item, -1)">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span>{{ item.quantidade }}</span>
                    <button mat-icon-button (click)="alterarQtd(item, 1)" [disabled]="item.quantidade >= item.produto.quantidadeEstoque">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                  <div class="item-subtotal">{{ item.subtotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
                  <button mat-icon-button color="warn" (click)="removerItem(item)">
                    <mat-icon style="font-size:18px">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- ── Lado direito: Pagamento ── -->
      <div class="pdv-right">
        <!-- Total -->
        <div class="total-card">
          <div class="total-row"><span>Subtotal</span><strong>{{ totalCarrinho() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          <div class="total-divider"></div>
          <div class="total-row total-main"><span>TOTAL</span><strong>{{ totalCarrinho() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
        </div>

        <!-- Forma de pagamento -->
        <div class="pagamento-card">
          <p class="pagamento-label">Forma de pagamento</p>
          <div class="pagamento-btns">
            @for (fp of formasPagamento; track fp.value) {
              <button class="fp-btn" [class.active]="formaPagamento() === fp.value"
                      (click)="formaPagamento.set(fp.value)">
                <span>{{ fp.icon }}</span>
                <span>{{ fp.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Valor recebido (dinheiro) -->
        @if (formaPagamento() === 'DINHEIRO') {
          <div class="troco-card">
            <div class="input-money large">
              <span>R$</span>
              <input type="number" step="0.01" [(ngModel)]="valorRecebido" placeholder="0,00" (input)="calcularTroco()">
            </div>
            @if (valorRecebido > 0) {
              <div class="troco" [class.ok]="troco() >= 0" [class.insuf]="troco() < 0">
                <span>{{ troco() >= 0 ? 'Troco' : 'Faltam' }}</span>
                <strong>{{ (troco() < 0 ? troco() * -1 : troco()) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
              </div>
            }
          </div>
        }

        <!-- Finalizar -->
        <button mat-flat-button color="primary" class="mf-pdv-btn finalizar-btn"
                (click)="finalizarVenda()"
                [disabled]="carrinho().length === 0 || registrando()">
          <mat-icon>check_circle</mat-icon>
          {{ registrando() ? 'Registrando...' : 'Finalizar Venda' }}
        </button>

        <!-- Último comprovante -->
        @if (ultimaVenda()) {
          <div class="comprovante">
            <div class="comp-header">
              <mat-icon style="color:var(--mf-green)">check_circle</mat-icon>
              Venda registrada!
            </div>
            <div class="comp-row"><span>Nº</span><strong>{{ ultimaVenda()!.numeroVenda }}</strong></div>
            <div class="comp-row"><span>Total</span><strong>{{ ultimaVenda()!.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
            @if (ultimaVenda()!.valorTroco > 0) {
              <div class="comp-row"><span>Troco</span><strong style="color:var(--mf-green)">{{ ultimaVenda()!.valorTroco | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
            }
          </div>
        }

        <div class="caixa-divider"></div>

        <!-- Caixa info + fechar -->
        @if (caixaInfo()) {
          <div class="caixa-info-card">
            <div class="ci-row"><span>Total do caixa</span><strong>{{ caixaInfo()!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
            <div class="ci-row"><span>Aberto por</span><strong>{{ caixaInfo()!.abertoPorNome }}</strong></div>
          </div>
        }

        <button mat-stroked-button color="warn" class="fechar-btn" (click)="fecharCaixa()">
          <mat-icon>lock</mat-icon> Fechar Caixa
        </button>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    /* ── Caixa fechado ─────────────────────────────────────── */
    .caixa-fechado {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 60vh; gap: 1.25rem; text-align: center;
    }
    .fechado-icon {
      width: 80px; height: 80px; border-radius: 50%; background: var(--mf-blue-light);
      display: flex; align-items: center; justify-content: center;
      span { font-size: 40px; color: var(--mf-blue); font-variation-settings: 'FILL' 1; }
    }
    .caixa-fechado h2 { font-size: 1.5rem; font-weight: 700; }
    .caixa-fechado p  { color: var(--mf-gray-500); }
    .abertura-form { display: flex; flex-direction: column; gap: .75rem; align-items: center; width: 280px; }

    /* ── Layout PDV ────────────────────────────────────────── */
    .pdv-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1rem; height: calc(100vh - var(--mf-topbar-h) - 3rem);
      @media (max-width: 900px) { grid-template-columns: 1fr; height: auto; }
    }
    .pdv-left  { display: flex; flex-direction: column; gap: 1rem; overflow: hidden; }
    .pdv-right { display: flex; flex-direction: column; gap: .75rem; overflow-y: auto; }

    /* ── Busca ─────────────────────────────────────────────── */
    .busca-card { background: white; border: 1px solid var(--mf-border); border-radius: var(--mf-radius); }
    .busca-input-wrap {
      display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem;
      span { font-size: 20px; color: var(--mf-gray-400); }
    }
    .busca-input {
      flex: 1; border: none; outline: none; font-family: var(--mf-font);
      font-size: 1rem; color: var(--mf-gray-800);
      &::placeholder { color: var(--mf-gray-300); }
    }
    .busca-resultados { border-top: 1px solid var(--mf-border); }
    .busca-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: .65rem 1rem; cursor: pointer; transition: background .1s;
      &:hover { background: var(--mf-gray-50); }
      strong { display: block; font-size: .9rem; }
    }
    .busca-estoque { font-size: .75rem; color: var(--mf-gray-400); &.low { color: var(--mf-red); } }
    .busca-preco { font-family: var(--mf-mono); font-weight: 600; color: var(--mf-blue); }

    /* ── Carrinho ──────────────────────────────────────────── */
    .carrinho-card {
      flex: 1; background: white; border: 1px solid var(--mf-border);
      border-radius: var(--mf-radius); display: flex; flex-direction: column;
      overflow: hidden;
    }
    .carrinho-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--mf-border);
      h2 { font-size: .95rem; font-weight: 600; }
    }
    .carrinho-vazio {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: .5rem; color: var(--mf-gray-300);
      padding: 2rem;
      span { font-size: 48px; font-variation-settings: 'FILL' 0; }
      p { font-weight: 500; color: var(--mf-gray-400); }
      small { font-size: .8rem; }
    }
    .carrinho-items { flex: 1; overflow-y: auto; }
    .carrinho-item {
      display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem;
      border-bottom: 1px solid var(--mf-border);
      &:last-child { border-bottom: none; }
    }
    .item-info { flex: 1; }
    .item-nome { font-weight: 500; font-size: .875rem; }
    .item-preco { font-size: .75rem; color: var(--mf-gray-400); }
    .item-qty { display: flex; align-items: center; gap: 4px; span { width: 24px; text-align: center; font-weight: 600; } }
    .item-subtotal { font-family: var(--mf-mono); font-weight: 600; min-width: 70px; text-align: right; }

    /* ── Painel direito ────────────────────────────────────── */
    .total-card {
      background: var(--mf-gray-900); border-radius: var(--mf-radius); padding: 1.25rem;
    }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      color: var(--mf-gray-400); font-size: .875rem;
      strong { color: white; font-family: var(--mf-mono); }
      &.total-main { margin-top: .5rem; strong { font-size: 1.75rem; color: #a5f3fc; } }
    }
    .total-divider { border-top: 1px solid rgba(255,255,255,.1); margin: .75rem 0; }

    .pagamento-card { background: white; border: 1px solid var(--mf-border); border-radius: var(--mf-radius); padding: 1rem; }
    .pagamento-label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--mf-gray-400); margin-bottom: .75rem; }
    .pagamento-btns { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
    .fp-btn {
      border: 1.5px solid var(--mf-border); background: white;
      border-radius: var(--mf-radius-sm); padding: .6rem .5rem;
      cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px;
      font-family: var(--mf-font); font-size: .75rem; font-weight: 500;
      transition: border-color .15s, background .15s;
      &.active { border-color: var(--mf-blue); background: var(--mf-blue-light); color: var(--mf-blue); }
    }

    .troco-card { background: white; border: 1px solid var(--mf-border); border-radius: var(--mf-radius); padding: 1rem; }
    .input-money {
      display: flex; align-items: center; gap: .5rem;
      border: 2px solid var(--mf-border); border-radius: var(--mf-radius-sm); padding: .5rem .75rem;
      span { font-weight: 600; color: var(--mf-gray-500); }
      input { flex: 1; border: none; outline: none; font-family: var(--mf-mono); font-size: 1.1rem; font-weight: 600; }
      &.large input { font-size: 1.4rem; }
    }
    .troco {
      display: flex; justify-content: space-between; margin-top: .75rem;
      padding: .5rem .75rem; border-radius: 6px; font-size: .875rem;
      &.ok   { background: var(--mf-green-light); color: var(--mf-green); }
      &.insuf { background: var(--mf-red-light);  color: var(--mf-red); }
      strong { font-family: var(--mf-mono); font-size: 1.1rem; }
    }

    .finalizar-btn { width: 100%; height: 56px; font-size: 1.05rem !important; }
    .fechar-btn { width: 100%; }

    .comprovante {
      background: var(--mf-green-light); border-radius: var(--mf-radius);
      padding: 1rem; border: 1px solid #bbf7d0;
    }
    .comp-header { display: flex; align-items: center; gap: .5rem; font-weight: 600; color: var(--mf-green); margin-bottom: .75rem; }
    .comp-row { display: flex; justify-content: space-between; font-size: .875rem; padding: .2rem 0; strong { font-family: var(--mf-mono); } }

    .caixa-divider { border-top: 1px solid var(--mf-border); }
    .caixa-info-card { background: var(--mf-gray-50); border-radius: var(--mf-radius-sm); padding: .75rem 1rem; }
    .ci-row { display: flex; justify-content: space-between; font-size: .8rem; color: var(--mf-gray-500); padding: .15rem 0; strong { color: var(--mf-gray-700); font-family: var(--mf-mono); } }
  `]
})
export class CaixaComponent implements OnInit {
  private caixaSvc  = inject(CaixaService);
  private vendaSvc  = inject(VendaService);
  private produtoSvc = inject(ProdutoService);
  private snack = inject(MatSnackBar);

  caixaAberto  = signal(false);
  caixaInfo    = signal<Caixa | null>(null);
  carrinho     = signal<CarrinhoItem[]>([]);
  formaPagamento = signal<FormaPagamento>('DINHEIRO');
  ultimaVenda  = signal<Venda | null>(null);
  resultadosBusca = signal<Produto[]>([]);

  abrindo    = signal(false);
  registrando = signal(false);

  valorAbertura = 0;
  valorRecebido = 0;
  buscaInput   = '';
  private buscaTimer: any;

  formasPagamento = [
    { value: 'DINHEIRO' as FormaPagamento, label: 'Dinheiro', icon: '💵' },
    { value: 'PIX' as FormaPagamento, label: 'Pix', icon: '📱' },
    { value: 'CARTAO_DEBITO' as FormaPagamento, label: 'Débito', icon: '💳' },
    { value: 'CARTAO_CREDITO' as FormaPagamento, label: 'Crédito', icon: '💳' },
  ];

  totalCarrinho = computed(() => this.carrinho().reduce((s, i) => s + i.subtotal, 0));
  troco = computed(() => this.valorRecebido - this.totalCarrinho());

  ngOnInit() { this.verificarCaixa(); }

  verificarCaixa() {
    this.caixaSvc.getStatus().subscribe(s => {
      this.caixaAberto.set(s.aberto);
      this.caixaInfo.set(s.caixa ?? null);
    });
  }

  abrirCaixa() {
    this.abrindo.set(true);
    this.caixaSvc.abrir(this.valorAbertura).subscribe({
      next: c => { this.caixaInfo.set(c); this.caixaAberto.set(true); this.abrindo.set(false); },
      error: err => { this.snack.open(err.error?.message || 'Erro ao abrir caixa', '', { duration: 4000 }); this.abrindo.set(false); }
    });
  }

  onBuscaInput(e: Event) {
    clearTimeout(this.buscaTimer);
    const v = (e.target as HTMLInputElement).value;
    if (v.length < 2) { this.resultadosBusca.set([]); return; }
    this.buscaTimer = setTimeout(() => this.buscarProduto(), 400);
  }

  buscarProduto() {
    if (!this.buscaInput.trim()) return;
    // Tenta código de barras primeiro
    this.produtoSvc.buscarPorCodigoBarras(this.buscaInput.trim()).subscribe({
      next: p => { this.adicionarProduto(p); this.buscaInput = ''; this.resultadosBusca.set([]); },
      error: () => {
        // fallback: busca por nome
        this.produtoSvc.listar(this.buscaInput, undefined, 0, 8).subscribe(
          page => this.resultadosBusca.set(page.content)
        );
      }
    });
  }

  adicionarProduto(p: Produto) {
    if (p.quantidadeEstoque === 0) { this.snack.open('Produto sem estoque!', '', { duration: 3000 }); return; }
    const carr = [...this.carrinho()];
    const idx = carr.findIndex(i => i.produto.id === p.id);
    if (idx >= 0) {
      if (carr[idx].quantidade >= p.quantidadeEstoque) {
        this.snack.open('Quantidade máxima em estoque!', '', { duration: 2000 }); return;
      }
      carr[idx].quantidade++;
      carr[idx].subtotal = carr[idx].quantidade * carr[idx].produto.precoVenda;
    } else {
      carr.push({ produto: p, quantidade: 1, subtotal: p.precoVenda });
    }
    this.carrinho.set(carr);
    this.resultadosBusca.set([]);
    this.buscaInput = '';
  }

  alterarQtd(item: CarrinhoItem, delta: number) {
    const carr = [...this.carrinho()];
    const idx = carr.findIndex(i => i.produto.id === item.produto.id);
    if (idx < 0) return;
    const novaQtd = carr[idx].quantidade + delta;
    if (novaQtd <= 0) { carr.splice(idx, 1); }
    else { carr[idx].quantidade = novaQtd; carr[idx].subtotal = novaQtd * carr[idx].produto.precoVenda; }
    this.carrinho.set(carr);
  }

  removerItem(item: CarrinhoItem) {
    this.carrinho.update(c => c.filter(i => i.produto.id !== item.produto.id));
  }

  limparCarrinho() { this.carrinho.set([]); this.ultimaVenda.set(null); }

  calcularTroco() { /* computed já faz */ }

  finalizarVenda() {
    if (this.carrinho().length === 0) return;
    this.registrando.set(true);

    const itens: ItemVendaRequest[] = this.carrinho().map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade }));
    const req: any = { formaPagamento: this.formaPagamento(), itens };
    if (this.formaPagamento() === 'DINHEIRO' && this.valorRecebido > 0) req.valorRecebido = this.valorRecebido;

    this.vendaSvc.registrar(req).subscribe({
      next: v => {
        this.ultimaVenda.set(v);
        this.limparCarrinho();
        this.valorRecebido = 0;
        this.verificarCaixa();
        this.registrando.set(false);
        this.snack.open(`Venda ${v.numeroVenda} registrada!`, '', { duration: 3000 });
      },
      error: err => {
        this.snack.open(err.error?.message || 'Erro ao registrar venda', '', { duration: 5000 });
        this.registrando.set(false);
      }
    });
  }

  fecharCaixa() {
    const vlr = parseFloat(prompt('Informe o valor contado no caixa (R$):') ?? '');
    if (isNaN(vlr)) return;
    this.caixaSvc.fechar(vlr).subscribe({
      next: r => {
        this.caixaAberto.set(false); this.caixaInfo.set(null);
        const dif = r.diferenca >= 0 ? `+R$ ${r.diferenca.toFixed(2)}` : `-R$ ${Math.abs(r.diferenca).toFixed(2)}`;
        this.snack.open(`Caixa fechado. ${r.quantidadeVendas} vendas. Diferença: ${dif}`, '', { duration: 6000 });
      },
      error: err => this.snack.open(err.error?.message || 'Erro ao fechar caixa', '', { duration: 4000 })
    });
  }
}

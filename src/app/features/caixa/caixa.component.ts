import {
  Component, inject, signal, OnInit, computed,
  ViewChild, ElementRef, HostListener, OnDestroy
} from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { CaixaService, VendaService, ProdutoService } from '../../core/services/services';
import { AuthModalComponent } from '../../shared/components/auth-modal/auth-modal.component';
import { TokenHelper } from '../../core/interceptors/auth.interceptor';
import { Caixa, Venda, Produto, FormaPagamento, ItemVendaRequest, MovimentacaoCaixa } from '../../core/models/models';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

interface CarrinhoItem { produto: Produto; quantidade: number; subtotal: number; }

@Component({
  selector: 'app-caixa',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatDialogModule, MatTabsModule, CurrencyPipe, AuthModalComponent,
    MatTooltipModule
  ],
  template: `
<div class="pdv-root">

  <!-- ══════════════════════════════════════════════════════
       TOPBAR
  ══════════════════════════════════════════════════════ -->
  <header class="pdv-topbar">
    <div class="topbar-brand">
      <span class="brand-hex">⬡</span>
      <span class="brand-name">CaixaBsb <em>G.F.</em></span>
      <span class="brand-pdv">PDV-01</span>
    </div>

    <div class="topbar-status" [class.aberto]="caixaAberto()" [class.fechado]="!caixaAberto()">
      <span class="dot"></span>
      {{ caixaAberto() ? 'CAIXA ABERTO' : 'CAIXA FECHADO' }}
    </div>

    <div class="topbar-meta">
      <span class="meta-op">
        <span class="material-symbols-rounded" style="font-size:15px">person</span>
        {{ operador }}
      </span>
      <!-- Badge do perfil do usuário logado -->
      <span class="meta-perfil" [class]="'perfil-' + perfilUsuario().toLowerCase()">
        {{ perfilUsuario() }}
      </span>
      <span class="meta-hora">{{ horaAtual }}</span>
      <span class="meta-data">{{ dataAtual }}</span>
    </div>

    @if (caixaAberto()) {
      <!-- GERENTE / ADMIN: botão ativo -->
      @if (podeFecharCaixa()) {
        <button class="btn-fechar-caixa" (click)="abrirModalFecharCaixa()">
          <span class="material-symbols-rounded">lock</span> Fechar Caixa [F9]
        </button>
      } @else {
        <!-- OPERADOR: botão desabilitado com tooltip -->
        <div class="btn-fechar-caixa desabilitado"
             matTooltip="Apenas Gerentes e Administradores podem fechar o caixa"
             matTooltipPosition="below">
          <span class="material-symbols-rounded">lock</span>
          <span>Fechar Caixa</span>
          <span class="sem-perm-badge">Sem permissão</span>
        </div>
      }
    }
  </header>

  <!-- ══════════════════════════════════════════════════════
       CAIXA FECHADO
  ══════════════════════════════════════════════════════ -->
  @if (!caixaAberto()) {
    <div class="tela-abertura">
      <div class="abertura-card">
        <div class="abertura-icon">
          <span class="material-symbols-rounded">point_of_sale</span>
        </div>
        <h2>Caixa Fechado</h2>
        <p>Informe o saldo inicial para abrir o caixa</p>
        <div class="abertura-form">
          <label>VALOR DE ABERTURA</label>
          <div class="input-money">
            <span>R$</span>
            <input type="number" step="0.01" [(ngModel)]="valorAbertura" placeholder="0,00">
          </div>
          <button mat-flat-button color="primary" class="btn-abrir" (click)="abrirCaixa()" [disabled]="abrindo()">
            <mat-icon>lock_open</mat-icon>
            {{ abrindo() ? 'Abrindo...' : 'Abrir Caixa' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ══════════════════════════════════════════════════════
       PDV ABERTO
  ══════════════════════════════════════════════════════ -->
  @if (caixaAberto()) {
  <div class="pdv-workspace">

    <!-- ── COLUNA ESQUERDA: Bipar + Carrinho ── -->
    <div class="pdv-left">

      <div class="loja-pdv-card">
        <div class="loja-logo-box">
          <img [src]="lojaConfig.logo" [alt]="lojaConfig.nome" class="loja-logo" (error)="usarLogoPadrao($event)" />
        </div>
        <div class="loja-dados">
          <span class="loja-label">PDV PERSONALIZADO</span>
          <strong>{{ lojaConfig.nome }}</strong>
          <small>{{ lojaConfig.descricao }}</small>
        </div>
      </div>

      <!-- BIPAR -->
      <div class="bipar-zone" [class.erro]="erroBipar" [class.buscando]="buscando">
        <div class="bipar-label">CÓDIGO DE BARRAS / PRODUTO</div>
        <div class="bipar-row">
          <span class="material-symbols-rounded bipar-icon">qr_code_scanner</span>
          <input
            #inputBipar
            class="bipar-input"
            type="text"
            [(ngModel)]="buscaInput"
            (ngModelChange)="onBuscaInput()"
            (keydown.enter)="onEnter()"
            (keydown.arrowdown)="moverSugestao(1)"
            (keydown.arrowup)="moverSugestao(-1)"
            placeholder="Bipe ou digite o produto..."
            autocomplete="off" spellcheck="false" autofocus
          />
          @if (buscando) { <div class="bipar-spinner"></div> }
          <div class="bipar-info">
            @if (ultimoProduto) {
              <span class="ultimo-produto">{{ ultimoProduto }}</span>
            }
          </div>
          <kbd class="bipar-kbd">ENTER</kbd>
        </div>

        @if (erroBipar) {
          <div class="bipar-erro-msg">
            <span class="material-symbols-rounded">error</span> {{ msgErro }}
          </div>
        }

        @if (resultadosBusca().length > 0) {
          <div class="sugestoes-drop">
            @for (p of resultadosBusca(); track p.id; let i = $index) {
              <div class="sug-item" [class.ativo]="i === sugestaoIndex" (mousedown)="adicionarProduto(p)">
                <span class="sug-seq">{{ i + 1 }}</span>
                <span class="sug-codigo">{{ p.codigoBarras }}</span>
                <span class="sug-nome">{{ p.nome }}</span>
                <span class="sug-estq" [class.baixo]="p.estoqueBaixo">{{ p.quantidadeEstoque }} un</span>
                <span class="sug-preco">{{ p.precoVenda | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- LISTA DE PRODUTOS (carrinho) -->
      <div class="lista-zone">
        <div class="lista-header">
          <div class="lh-nitem">N°</div>
          <div class="lh-codigo">Código</div>
          <div class="lh-desc">Descrição do Produto</div>
          <div class="lh-qty">Qtd</div>
          <div class="lh-unit">Vlr. Unit.</div>
          <div class="lh-total">Total</div>
          <div class="lh-del"></div>
        </div>

        <div class="lista-body" #carrinhoBody>
          @if (carrinho().length === 0) {
            <div class="lista-vazia">
              <span class="material-symbols-rounded">receipt_long</span>
              <p>Nenhum produto adicionado</p>
              <small>Bipe o código de barras ou pesquise pelo nome</small>
            </div>
          }

          @for (item of carrinho(); track item.produto.id; let i = $index) {
            <div
              class="lista-item"
              [class.sel]="itemSelecionadoIndex === i"
              [class.novo]="ultimoAdicionadoId === item.produto.id"
              (click)="itemSelecionadoIndex = i"
            >
              <div class="lh-nitem seq">{{ i + 1 }}</div>
              <div class="lh-codigo cod">{{ item.produto.codigoBarras }}</div>
              <div class="lh-desc nome">{{ item.produto.nome }}</div>
              <div class="lh-qty">
                <div class="qty-ctrl">
                  <button class="qty-btn" (click)="alterarQtd(item,-1);$event.stopPropagation()">−</button>
                  <span class="qty-val">{{ item.quantidade }}</span>
                  <button class="qty-btn" (click)="alterarQtd(item,1);$event.stopPropagation()"
                    [disabled]="item.quantidade >= item.produto.quantidadeEstoque">+</button>
                </div>
              </div>
              <div class="lh-unit unit">{{ item.produto.precoVenda | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
              <div class="lh-total sub">{{ item.subtotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
              <div class="lh-del">
                <button class="btn-del" (click)="removerItemIdx(i);$event.stopPropagation()">
                  <span class="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>
          }
        </div>

        <div class="lista-footer">
          <span class="lf-itens">{{ totalItens() }} {{ totalItens() === 1 ? 'item' : 'itens' }}</span>
          @if (carrinho().length > 0) {
            <button class="btn-limpar-lista" (click)="confirmarLimpar()">
              <span class="material-symbols-rounded">delete_sweep</span> Limpar [Ctrl+Del]
            </button>
          }
          <div class="lf-subtotal">
            <span>SUBTOTAL</span>
            <strong>{{ totalCarrinho() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- ── COLUNA DIREITA: Totais + Pagamento ── -->
    <div class="pdv-right">

      <div class="total-block">
        <span class="total-lbl">TOTAL DA VENDA</span>
        <span class="total-val" [class.pulsando]="ultimoAdicionadoId !== null">
          {{ totalCarrinho() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
        </span>
        @if (carrinho().length > 0) {
          <span class="total-sub">{{ totalItens() }} {{ totalItens() === 1 ? 'item' : 'itens' }}</span>
        }
      </div>

      <div class="pag-block">
        <div class="block-label">FORMA DE PAGAMENTO</div>
        <div class="pag-grid">
          @for (fp of formasPagamento; track fp.value) {
            <button class="fp-btn" [class.active]="formaPagamento() === fp.value"
              (click)="selecionarPagamento(fp.value)" [title]="fp.key">
              <span class="fp-icon">{{ fp.icon }}</span>
              <span class="fp-label">{{ fp.label }}</span>
              <kbd>{{ fp.key }}</kbd>
            </button>
          }
        </div>
      </div>

      @if (formaPagamento() === 'DINHEIRO') {
        <div class="recebido-block">
          <div class="block-label">TOTAL RECEBIDO</div>
          <div class="input-money large">
            <span>R$</span>
            <input #inputRecebido type="number" step="0.01"
              [ngModel]="valorRecebido()" (ngModelChange)="valorRecebido.set(+$event)"
              placeholder="0,00" />
          </div>
        </div>

        <div class="troco-block" [class.ok]="troco() >= 0 && valorRecebido() > 0" [class.insuf]="troco() < 0">
          <div class="block-label">TROCO</div>
          <div class="troco-val">
            @if (valorRecebido() > 0) {
              {{ (troco() < 0 ? troco() * -1 : troco()) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            } @else {
              R$ 0,00
            }
          </div>
          @if (troco() < 0 && valorRecebido() > 0) {
            <div class="troco-alerta">⚠ Valor insuficiente</div>
          }
        </div>
      }

      <button class="btn-finalizar" [class.pronto]="podeFinalizarVenda()"
        [disabled]="!podeFinalizarVenda() || registrando()" (click)="finalizarVenda()">
        @if (registrando()) {
          <div class="spin-btn"></div> PROCESSANDO...
        } @else {
          <span class="material-symbols-rounded">check_circle</span>
          FINALIZAR VENDA [F8]
        }
      </button>

      <div class="acoes-sec">
        <button class="btn-sec" (click)="confirmarLimpar()">
          <span class="material-symbols-rounded">add_circle</span>
          Nova Venda<br><kbd>F4</kbd>
        </button>
        <button class="btn-sec sangria" (click)="abrirModalMov('SANGRIA')">
          <span class="material-symbols-rounded">arrow_circle_down</span>
          Sangria
        </button>
        <button class="btn-sec suprimento" (click)="abrirModalMov('SUPRIMENTO')">
          <span class="material-symbols-rounded">arrow_circle_up</span>
          Suprimento
        </button>
      </div>

      @if (ultimaVenda()) {
        <div class="comprovante">
          <div class="comp-header">
            <span class="material-symbols-rounded">check_circle</span> Venda Registrada!
          </div>
          <div class="comp-row"><span>Cupom</span><strong>{{ ultimaVenda()!.numeroVenda }}</strong></div>
          <div class="comp-row"><span>Total</span><strong>{{ ultimaVenda()!.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          @if (ultimaVenda()!.valorTroco > 0) {
            <div class="comp-row troco-ok"><span>Troco</span><strong>{{ ultimaVenda()!.valorTroco | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          }
        </div>
      }

      @if (caixaInfo()) {
        <div class="caixa-info">
          <div class="ci-row"><span>Total vendas</span><strong>{{ caixaInfo()!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          <div class="ci-row"><span>Operador</span><strong>{{ caixaInfo()!.abertoPorNome }}</strong></div>
        </div>
      }

      @if (mostrarAuthMov()) {
        <app-auth-modal
          [descricao]="'Autorizar ' + (tipoMov() === 'SANGRIA' ? 'sangria' : 'suprimento') + ' no caixa'"
          (autorizado)="onMovAutorizado()" (cancelado)="onMovCancelado()" />
      }
      @if (modalMovAberto()) {
        <div class="modal-mov">
          <div class="modal-mov-header">
            <span>{{ tipoMov() === 'SANGRIA' ? '💸 Sangria' : '💰 Suprimento' }}</span>
            <button mat-icon-button (click)="fecharModalMov()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="input-money">
            <span>R$</span>
            <input type="number" step="0.01" [(ngModel)]="valorMov" placeholder="0,00" min="0.01">
          </div>
          <input class="motivo-input" [(ngModel)]="motivoMov" placeholder="Motivo (obrigatório)" maxlength="255">
          <button mat-flat-button [color]="tipoMov() === 'SANGRIA' ? 'warn' : 'primary'"
            class="btn-abrir" (click)="confirmarMov()" [disabled]="salvandoMov()">
            <mat-icon>check</mat-icon>
            {{ salvandoMov() ? 'Salvando...' : 'Confirmar ' + (tipoMov() === 'SANGRIA' ? 'Sangria' : 'Suprimento') }}
          </button>
        </div>
      }
      @if (movimentacoes().length > 0) {
        <div class="mov-lista">
          <div class="block-label" style="margin-bottom:6px">MOVIMENTAÇÕES</div>
          @for (m of movimentacoes(); track m.id) {
            <div class="mov-item" [class.sangria]="m.tipo==='SANGRIA'" [class.suprimento]="m.tipo==='SUPRIMENTO'">
              <div><strong>{{ m.tipo === 'SANGRIA' ? '↓ Sangria' : '↑ Suprimento' }}</strong><small>{{ m.motivo }}</small></div>
              <span>{{ m.valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
            </div>
          }
        </div>
      }
    </div>
  </div>

  <footer class="pdv-atalhos-bar">
    <div class="atalho"><kbd>F1</kbd><span>Dinheiro</span></div>
    <div class="atalho"><kbd>F2</kbd><span>Focar campo</span></div>
    <div class="atalho"><kbd>F4</kbd><span>Nova venda</span></div>
    <div class="atalho"><kbd>F5</kbd><span>Pix</span></div>
    <div class="atalho"><kbd>F6</kbd><span>Débito</span></div>
    <div class="atalho"><kbd>F7</kbd><span>Crédito</span></div>
    <div class="atalho"><kbd>F8</kbd><span>Finalizar</span></div>
    <div class="atalho"><kbd>F9</kbd><span>Fechar caixa</span></div>
    <div class="atalho"><kbd>Del</kbd><span>Remover item</span></div>
    <div class="atalho"><kbd>Ctrl+Del</kbd><span>Limpar tudo</span></div>
    <div class="atalho"><kbd>Esc</kbd><span>Cancelar</span></div>
  </footer>
  }

  <!-- ══════════════════════════════════════════════════════
       MODAL FECHAR CAIXA (substitui o prompt() nativo)
  ══════════════════════════════════════════════════════ -->
  @if (modalFecharAberto()) {
    <div class="modal-overlay" (click)="modalFecharAberto.set(false); focarInput()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-icon fechar">
          <span class="material-symbols-rounded">lock</span>
        </div>
        <h2>Fechar Caixa</h2>
        <p>Informe o valor que você <strong>contou fisicamente</strong> no caixa.</p>

        <div class="input-money" style="width:100%">
          <span>R$</span>
          <input
            type="number" step="0.01" min="0"
            [(ngModel)]="valorContagemCaixa"
            placeholder="0,00"
            style="font-size:1.4rem"
          />
        </div>

        <!-- Resumo do caixa atual -->
        @if (caixaInfo()) {
          <div class="resumo-caixa">
            <div class="rc-row">
              <span>Total de vendas no sistema</span>
              <strong>{{ caixaInfo()!.totalVendas | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
            </div>
            <div class="rc-row">
              <span>Saldo de abertura</span>
              <strong>{{ caixaInfo()!.valorAbertura | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
            </div>
          </div>
        }

        <div class="modal-acoes">
          <button class="btn-modal danger" (click)="confirmarFechamentoCaixa()">
            <span class="material-symbols-rounded" style="font-size:15px;vertical-align:middle;margin-right:4px">lock</span>
            Confirmar Fechamento
          </button>
          <button class="btn-modal" (click)="modalFecharAberto.set(false); focarInput()">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ══════════════════════════════════════════════════════
       MODAL CANCELAR VENDA
  ══════════════════════════════════════════════════════ -->
  @if (showModalCancelar) {
    <div class="modal-overlay" (click)="showModalCancelar=false;focarInput()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-icon warn">
          <span class="material-symbols-rounded">warning</span>
        </div>
        <h2>Cancelar venda?</h2>
        <p>{{ totalItens() }} {{ totalItens()===1?'item':'itens' }} ·
          <strong>{{ totalCarrinho() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong> serão perdidos.</p>
        <div class="modal-acoes">
          <button class="btn-modal danger" (click)="limparCarrinho()">Sim, cancelar</button>
          <button class="btn-modal" (click)="showModalCancelar=false;focarInput()">Continuar venda</button>
        </div>
      </div>
    </div>
  }

</div>
  `,
  styles: [`
    :host {
      --p-navy    : #1a3a5c;
      --p-navy2   : #0f2540;
      --p-blue    : #1e5fac;
      --p-blue2   : #2176d2;
      --p-blue-lt : #ddeeff;
      --p-blue-bg : #eef5ff;
      --p-white   : #ffffff;
      --p-gray50  : #f5f7fb;
      --p-gray100 : #e8edf5;
      --p-gray200 : #cdd6e8;
      --p-gray400 : #7a90b0;
      --p-gray600 : #3d5270;
      --p-gray900 : #1a2640;
      --p-text    : #1a2640;
      --p-text2   : #3d5270;
      --p-text3   : #7a90b0;
      --p-green   : #0a7c4e;
      --p-green-bg: #e6f7ef;
      --p-red     : #c0392b;
      --p-red-bg  : #fdf0ee;
      --p-yellow  : #b07d00;
      --p-yellow-bg:#fffbea;
      --p-accent  : #2176d2;
      --p-glow    : rgba(33,118,210,.15);
      display: block; height: 100vh; overflow: hidden;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .pdv-root {
      display: grid; grid-template-rows: 46px 1fr 32px;
      height: 100vh; background: var(--p-gray50);
      color: var(--p-text); font-family: 'Roboto Mono', 'Consolas', monospace;
      overflow: hidden;
    }

    /* ── TOPBAR ── */
    .pdv-topbar {
      display: flex; align-items: center; gap: 12px; padding: 0 16px;
      background: var(--p-navy2); border-bottom: 2px solid var(--p-blue);
      z-index: 10; flex-shrink: 0;
    }
    .topbar-brand {
      display: flex; align-items: center; gap: 7px;
      .brand-hex  { font-size: 18px; color: #5bc8ff; }
      .brand-name { font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap;
        em { color: #5bc8ff; font-style: normal; font-size: 12px; } }
      .brand-pdv  { font-size: 10px; font-weight: 700; color: #7ab0d8;
        background: rgba(255,255,255,.08); padding: 2px 6px;
        border-radius: 3px; border: 1px solid rgba(255,255,255,.15); }
    }
    .topbar-status {
      display: flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 3px;
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      .dot { width: 6px; height: 6px; border-radius: 50%; }
      &.aberto  { background: rgba(10,124,78,.25); color: #4ade80;
        .dot { background: #4ade80; animation: pulse-dot 2s infinite; } }
      &.fechado { background: rgba(192,57,43,.25); color: #f87171;
        .dot { background: #f87171; } }
    }
    .topbar-meta {
      display: flex; align-items: center; gap: 10px; margin-left: auto;
      .meta-op   { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #a8c4df; font-weight: 500; }
      .meta-hora { font-size: 15px; font-weight: 700; color: #5bc8ff; letter-spacing: 1px; }
      .meta-data { font-size: 11px; color: #7ab0d8; }
    }

    /* Badge de perfil na topbar */
    .meta-perfil {
      font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
      padding: 2px 7px; border-radius: 3px;
      &.perfil-admin    { background: rgba(192,57,43,.25);  color: #f87171; }
      &.perfil-gerente  { background: rgba(176,125,0,.25);  color: #fbbf24; }
      &.perfil-operador { background: rgba(33,118,210,.25); color: #5bc8ff; }
    }

    /* Botão fechar caixa — ativo */
    .btn-fechar-caixa {
      display: flex; align-items: center; gap: 5px;
      background: rgba(192,57,43,.2); color: #f87171;
      border: 1px solid rgba(248,113,113,.3); border-radius: 4px;
      padding: 5px 11px; font-size: 11px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: all .15s;
      .material-symbols-rounded { font-size: 15px; }
      &:hover { background: rgba(192,57,43,.35); }
    }
    /* Botão fechar caixa — sem permissão */
    .btn-fechar-caixa.desabilitado {
      display: flex; align-items: center; gap: 5px;
      background: rgba(120,120,120,.1); color: #7a90b0;
      border: 1px solid rgba(120,120,120,.2); border-radius: 4px;
      padding: 5px 11px; font-size: 11px; font-weight: 700; cursor: not-allowed;
      font-family: inherit;
      .material-symbols-rounded { font-size: 15px; }
    }
    .sem-perm-badge {
      font-size: 9px; padding: 1px 5px;
      background: rgba(192,57,43,.15); color: #f87171;
      border-radius: 3px; border: 1px solid rgba(248,113,113,.2);
    }

    /* ── TELA ABERTURA ── */
    .tela-abertura {
      grid-row: 1 / 4; display: flex; align-items: center; justify-content: center;
      background: var(--p-gray50);
    }
    .abertura-card {
      background: var(--p-white); border-radius: 12px; padding: 40px;
      box-shadow: 0 4px 32px rgba(0,0,0,.1); text-align: center; width: 360px;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      border-top: 4px solid var(--p-navy);
    }
    .abertura-icon {
      width: 72px; height: 72px; border-radius: 50%;
      background: var(--p-blue-bg); border: 2px solid var(--p-blue-lt);
      display: flex; align-items: center; justify-content: center;
      span { font-size: 36px; color: var(--p-blue); font-variation-settings:'FILL' 1; }
    }
    .abertura-card h2 { font-size: 1.4rem; font-weight: 700; color: var(--p-navy2); }
    .abertura-card p  { font-size: .875rem; color: var(--p-text2); }
    .abertura-form { display: flex; flex-direction: column; gap: 10px; width: 100%;
      label { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: var(--p-text3); text-transform: uppercase; text-align: left; }
    }
    .btn-abrir { width: 100%; height: 46px; font-size: 14px !important; font-weight: 700 !important; letter-spacing: .5px; border-radius: 6px !important; }

    /* ── WORKSPACE ── */
    .pdv-workspace { display: grid; grid-template-columns: 1fr 320px; gap: 0; overflow: hidden; }

    /* ── COLUNA ESQUERDA ── */
    .pdv-left { display: flex; flex-direction: column; overflow: hidden; border-right: 2px solid var(--p-gray200); }

    .loja-pdv-card {
      display: grid; grid-template-columns: 150px 1fr; align-items: center;
      gap: 16px; padding: 12px 16px;
      background: linear-gradient(135deg, #ffffff 0%, #eef5ff 100%);
      border-bottom: 2px solid var(--p-gray200); flex-shrink: 0;
    }
    .loja-logo-box {
      height: 110px; background: #fff; border: 2px solid var(--p-gray200);
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      overflow: hidden; box-shadow: 0 4px 12px rgba(15,37,64,.08);
    }
    .loja-logo { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
    .loja-dados { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .loja-label { font-size: 10px; font-weight: 900; letter-spacing: 1.5px; color: var(--p-blue); text-transform: uppercase; }
    .loja-dados strong { font-size: 24px; line-height: 1.1; color: var(--p-navy2); font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .loja-dados small  { font-size: 12px; color: var(--p-text3); font-weight: 600; }

    /* BIPAR */
    .bipar-zone {
      background: var(--p-navy); padding: 10px 16px 8px; flex-shrink: 0;
      border-bottom: 2px solid var(--p-blue); position: relative; transition: background .2s;
      &.erro     { background: #3d0f0a; border-bottom-color: #e74c3c; }
      &.buscando { background: #0f2040; border-bottom-color: #5bc8ff; }
    }
    .bipar-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #7ab0d8; text-transform: uppercase; margin-bottom: 6px; }
    .bipar-row {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,.07); border: 2px solid rgba(255,255,255,.15);
      border-radius: 6px; padding: 0 14px; transition: all .15s;
      &:focus-within { border-color: #5bc8ff; background: rgba(255,255,255,.1); box-shadow: 0 0 0 3px rgba(91,200,255,.15); }
      .bipar-icon { font-size: 20px; color: #7ab0d8; flex-shrink: 0; }
    }
    .bipar-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #fff; font-size: 20px; font-weight: 700; font-family: inherit;
      padding: 13px 0; letter-spacing: .5px;
      &::placeholder { color: rgba(255,255,255,.3); font-weight: 400; font-size: 16px; }
    }
    .bipar-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.2); border-top-color: #5bc8ff; border-radius: 50%; animation: spin .6s linear infinite; }
    .ultimo-produto { font-size: 11px; color: #5bc8ff; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
    .bipar-info { flex: 0 0 auto; }
    .bipar-kbd { font-size: 11px; padding: 3px 8px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); border-radius: 3px; color: #a8c4df; font-family: inherit; flex-shrink: 0; }
    .bipar-erro-msg { display: flex; align-items: center; gap: 6px; color: #f87171; font-size: 12px; font-weight: 600; padding: 5px 0 0; animation: fadeIn .15s; }
    .sugestoes-drop {
      position: absolute; left: 0; right: 0; top: 100%;
      background: var(--p-white); border: 2px solid var(--p-navy); border-top: none;
      z-index: 200; max-height: 240px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.15);
    }
    .sug-item {
      display: grid; grid-template-columns: 28px 110px 1fr 70px 100px;
      align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer;
      border-bottom: 1px solid var(--p-gray100); font-size: 13px; transition: background .1s;
      &:last-child { border-bottom: none; }
      &:hover, &.ativo { background: var(--p-blue-bg); }
      .sug-seq    { color: var(--p-text3); font-size: 11px; text-align: center; }
      .sug-codigo { color: var(--p-text3); font-size: 11px; }
      .sug-nome   { color: var(--p-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sug-estq   { font-size: 11px; color: var(--p-text3); text-align: right; &.baixo { color: #e67e22; } }
      .sug-preco  { color: var(--p-blue); font-weight: 700; text-align: right; }
    }

    /* LISTA */
    .lista-zone { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--p-white); }
    .lista-header {
      display: grid; grid-template-columns: 44px 110px 1fr 110px 100px 110px 36px;
      padding: 0 12px; background: var(--p-navy); border-bottom: 2px solid var(--p-blue);
      font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #a8c4df;
      text-transform: uppercase; height: 32px; align-items: center; flex-shrink: 0;
    }
    .lista-body { flex: 1; overflow-y: auto; &::-webkit-scrollbar { width: 5px; } &::-webkit-scrollbar-track { background: var(--p-gray50); } &::-webkit-scrollbar-thumb { background: var(--p-gray200); border-radius: 3px; } }
    .lista-vazia { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100%; color: var(--p-text3); .material-symbols-rounded { font-size: 48px; opacity: .25; } p { font-weight: 600; font-size: 14px; } small { font-size: 12px; } }
    .lista-item {
      display: grid; grid-template-columns: 44px 110px 1fr 110px 100px 110px 36px;
      align-items: center; padding: 0 12px; height: 46px;
      border-bottom: 1px solid var(--p-gray100); cursor: pointer; transition: background .1s; font-size: 13px;
      &:hover { background: var(--p-gray50); }
      &.sel   { background: var(--p-blue-bg); border-left: 3px solid var(--p-blue); }
      &.novo  { animation: flashItem .9s ease-out; }
      .seq  { color: var(--p-text3); font-size: 11px; text-align: center; }
      .cod  { color: var(--p-text3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .nome { color: var(--p-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
      .unit { color: var(--p-text2); }
      .sub  { color: var(--p-navy2); font-weight: 800; font-size: 14px; }
    }
    .qty-ctrl { display: flex; align-items: center; gap: 2px; }
    .qty-btn { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: var(--p-gray100); border: 1px solid var(--p-gray200); border-radius: 3px; color: var(--p-text2); font-size: 15px; cursor: pointer; transition: all .1s; &:hover { background: var(--p-blue-lt); border-color: var(--p-accent); color: var(--p-navy); } &:disabled { opacity: .3; cursor: not-allowed; } }
    .qty-val { min-width: 28px; text-align: center; font-size: 14px; font-weight: 800; color: var(--p-navy2); }
    .btn-del { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 3px; color: var(--p-gray400); cursor: pointer; transition: all .12s; .material-symbols-rounded { font-size: 17px; } &:hover { background: var(--p-red-bg); color: var(--p-red); } }
    .lista-footer { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: var(--p-navy); border-top: 2px solid var(--p-blue); flex-shrink: 0; .lf-itens { font-size: 12px; color: #a8c4df; } }
    .btn-limpar-lista { display: flex; align-items: center; gap: 4px; background: rgba(192,57,43,.2); border: 1px solid rgba(248,113,113,.3); border-radius: 4px; color: #f87171; font-size: 11px; padding: 4px 9px; cursor: pointer; font-family: inherit; transition: all .15s; .material-symbols-rounded { font-size: 14px; } &:hover { background: rgba(192,57,43,.35); } }
    .lf-subtotal { margin-left: auto; display: flex; align-items: center; gap: 14px; span { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #7ab0d8; text-transform: uppercase; } strong { font-size: 22px; font-weight: 800; color: #fff; font-family: 'Roboto Mono', monospace; } }

    /* ── COLUNA DIREITA ── */
    .pdv-right { display: flex; flex-direction: column; gap: 0; overflow-y: auto; background: var(--p-gray50); &::-webkit-scrollbar { width: 4px; } &::-webkit-scrollbar-thumb { background: var(--p-gray200); border-radius: 2px; } }
    .block-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: var(--p-text3); text-transform: uppercase; margin-bottom: 8px; }
    .total-block { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 14px; background: var(--p-navy2); gap: 4px; flex-shrink: 0; border-bottom: 3px solid var(--p-blue); .total-lbl { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #7ab0d8; text-transform: uppercase; } .total-val { font-size: 40px; font-weight: 900; color: #5bc8ff; line-height: 1; letter-spacing: -1px; font-family: 'Roboto Mono', monospace; text-shadow: 0 0 24px rgba(91,200,255,.25); &.pulsando { animation: pulsoTotal .4s ease-out; } } .total-sub { font-size: 12px; color: #7ab0d8; } }
    .pag-block { padding: 12px; border-bottom: 1px solid var(--p-gray200); background: var(--p-white); }
    .pag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .fp-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 6px; background: var(--p-gray50); border: 2px solid var(--p-gray200); border-radius: 6px; color: var(--p-text2); cursor: pointer; font-family: inherit; position: relative; transition: all .15s; .fp-icon { font-size: 18px; } .fp-label { font-size: 11px; font-weight: 700; } kbd { position: absolute; top: 4px; right: 4px; font-size: 8px; padding: 1px 3px; background: var(--p-gray100); border: 1px solid var(--p-gray200); border-radius: 2px; color: var(--p-text3); font-family: inherit; } &:hover { background: var(--p-blue-bg); border-color: var(--p-accent); color: var(--p-navy); } &.active { background: var(--p-navy); border-color: var(--p-navy); color: #fff; box-shadow: 0 2px 8px rgba(26,58,92,.25); } }
    .recebido-block { padding: 10px 12px 0; background: var(--p-white); }
    .input-money { display: flex; align-items: center; gap: 8px; border: 2px solid var(--p-gray200); border-radius: 5px; padding: .4rem .75rem; background: var(--p-gray50); transition: border-color .15s; &:focus-within { border-color: var(--p-accent); background: var(--p-white); } span { font-size: 14px; font-weight: 700; color: var(--p-text3); flex-shrink: 0; } input { flex: 1; border: none; outline: none; background: transparent; color: var(--p-text); font-family: 'Roboto Mono', monospace; font-size: 1rem; font-weight: 700; } &.large { padding: .5rem .75rem; input { font-size: 1.5rem; } } }
    .troco-block { margin: 6px 12px 0; padding: 10px 14px; border-radius: 6px; background: var(--p-gray100); border: 2px solid var(--p-gray200); display: flex; flex-direction: column; gap: 2px; transition: all .2s; .troco-val { font-size: 28px; font-weight: 900; font-family: 'Roboto Mono', monospace; color: var(--p-text3); } .troco-alerta { font-size: 11px; color: var(--p-red); font-weight: 600; } &.ok { background: var(--p-green-bg); border-color: rgba(10,124,78,.25); .block-label { color: rgba(10,124,78,.7); } .troco-val { color: var(--p-green); } } &.insuf { background: var(--p-red-bg); border-color: rgba(192,57,43,.25); .block-label { color: rgba(192,57,43,.7); } .troco-val { color: var(--p-red); } } }
    .btn-finalizar { margin: 10px 12px 0; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--p-gray200); border: 2px solid var(--p-gray200); border-radius: 8px; color: var(--p-text3); font-size: 14px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; cursor: not-allowed; transition: all .2s; font-family: inherit; .material-symbols-rounded { font-size: 20px; font-variation-settings: 'FILL' 1; } &.pronto { background: var(--p-green); border-color: var(--p-green); color: #fff; cursor: pointer; box-shadow: 0 4px 16px rgba(10,124,78,.3); animation: glowBtn 2.5s infinite; &:hover { background: #0b9461; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(10,124,78,.4); } &:active { transform: translateY(0); } } &:disabled:not(.pronto) { opacity: .5; } }
    .acoes-sec { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 8px 12px 0; }
    .btn-sec { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 8px 4px; background: var(--p-white); border: 1px solid var(--p-gray200); border-radius: 5px; color: var(--p-text2); font-size: 10px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; text-align: center; line-height: 1.3; .material-symbols-rounded { font-size: 18px; } kbd { font-size: 8px; padding: 1px 3px; background: var(--p-gray100); border: 1px solid var(--p-gray200); border-radius: 2px; color: var(--p-text3); } &:hover { background: var(--p-blue-bg); border-color: var(--p-accent); color: var(--p-navy); } &.sangria:hover { background: var(--p-red-bg); border-color: var(--p-red); color: var(--p-red); } &.suprimento:hover { background: var(--p-green-bg); border-color: var(--p-green); color: var(--p-green); } }
    .comprovante { margin: 8px 12px 0; background: var(--p-green-bg); border-radius: 6px; padding: 10px 12px; border: 1px solid rgba(10,124,78,.2); .comp-header { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--p-green); margin-bottom: 6px; font-size: 13px; .material-symbols-rounded { font-size: 18px; font-variation-settings:'FILL' 1; } } .comp-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; color: var(--p-text2); strong { font-family: 'Roboto Mono', monospace; color: var(--p-text); } } .troco-ok strong { color: var(--p-green); } }
    .caixa-info { margin: 8px 12px 0; background: var(--p-white); border-radius: 5px; padding: 8px 12px; border: 1px solid var(--p-gray200); .ci-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--p-text3); padding: 2px 0; strong { color: var(--p-text); font-family: 'Roboto Mono', monospace; } } }
    .mov-lista { margin: 6px 12px 0; display: flex; flex-direction: column; gap: 4px; }
    .mov-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 9px; border-radius: 4px; font-size: .8rem; div { display: flex; flex-direction: column; gap: 1px; } strong { font-size: .82rem; } small { color: var(--p-text3); font-size: .72rem; } span { font-family: 'Roboto Mono', monospace; font-weight: 700; } &.sangria { background: var(--p-red-bg); color: var(--p-red); } &.suprimento { background: var(--p-green-bg); color: var(--p-green); } }
    .modal-mov { margin: 6px 12px 0; background: var(--p-white); border: 1px solid var(--p-gray200); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .modal-mov-header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: .9rem; color: var(--p-text); }
    .motivo-input { border: 2px solid var(--p-gray200); border-radius: 5px; padding: .55rem .75rem; font-family: inherit; font-size: .875rem; outline: none; width: 100%; background: var(--p-gray50); color: var(--p-text); &:focus { border-color: var(--p-accent); } }

    /* ── BARRA DE ATALHOS ── */
    .pdv-atalhos-bar { display: flex; align-items: center; gap: 0; padding: 0 10px; background: var(--p-navy2); border-top: 1px solid var(--p-blue); overflow-x: auto; flex-shrink: 0; &::-webkit-scrollbar { display: none; } }
    .atalho { display: flex; align-items: center; gap: 5px; padding: 0 10px; border-right: 1px solid rgba(255,255,255,.08); flex-shrink: 0; height: 32px; &:last-child { border-right: none; } kbd { font-size: 9px; padding: 2px 5px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); border-radius: 3px; color: #5bc8ff; font-family: inherit; white-space: nowrap; } span { font-size: 10px; color: #7ab0d8; white-space: nowrap; } }

    /* ── MODAIS ── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn .15s; backdrop-filter: blur(2px); }
    .modal-box { background: var(--p-white); border-radius: 12px; padding: 28px; width: 420px; max-width: 95vw; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.2); animation: slideUp .2s ease-out; display: flex; flex-direction: column; gap: 14px; border-top: 4px solid var(--p-navy); h2 { font-size: 18px; font-weight: 700; color: var(--p-navy2); } p { font-size: 13px; color: var(--p-text2); strong { color: var(--p-text); } } }
    .modal-icon { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; .material-symbols-rounded { font-size: 28px; font-variation-settings: 'FILL' 1; } &.warn  { background: var(--p-yellow-bg); color: var(--p-yellow); border: 2px solid rgba(176,125,0,.2); } &.fechar { background: #fff5f5; color: var(--p-red); border: 2px solid rgba(192,57,43,.2); } }
    .modal-acoes { display: flex; gap: 10px; }
    .btn-modal { flex: 1; padding: 10px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; border: 2px solid var(--p-gray200); background: var(--p-gray50); color: var(--p-text2); font-family: inherit; transition: all .15s; &:hover { border-color: var(--p-accent); color: var(--p-navy); background: var(--p-blue-bg); } &.danger { background: var(--p-red-bg); border-color: rgba(192,57,43,.3); color: var(--p-red); &:hover { background: rgba(192,57,43,.15); } } }

    /* Resumo do caixa no modal de fechar */
    .resumo-caixa { background: var(--p-gray50); border-radius: 8px; padding: 10px 14px; width: 100%; border: 1px solid var(--p-gray200); }
    .rc-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--p-text2); border-bottom: 1px solid var(--p-gray100); &:last-child { border-bottom: none; } strong { font-family: 'Roboto Mono', monospace; color: var(--p-text); } }

    .spin-btn { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }

    /* ── ANIMAÇÕES ── */
    @keyframes spin       { to { transform: rotate(360deg); } }
    @keyframes fadeIn     { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes flashItem  { 0% { background: #ddeeff; } 50% { background: #eef8ff; } 100% { background: transparent; } }
    @keyframes pulsoTotal { 0% { transform: scale(1); } 40% { transform: scale(1.05); } 100% { transform: scale(1); } }
    @keyframes glowBtn    { 0%,100% { box-shadow: 0 4px 16px rgba(10,124,78,.3); } 50% { box-shadow: 0 4px 24px rgba(10,124,78,.5); } }
    @keyframes pulse-dot  { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

    @media (max-height: 768px) {
      .total-block .total-val { font-size: 32px; }
      .lista-item { height: 40px; }
      .bipar-input { font-size: 17px; padding: 10px 0; }
      .loja-pdv-card { grid-template-columns: 120px 1fr; padding: 8px 12px; }
      .loja-logo-box { height: 78px; }
      .loja-dados strong { font-size: 19px; }
    }
  `]
})
export class CaixaComponent implements OnInit, OnDestroy {

  @ViewChild('inputBipar')    inputBipar!  : ElementRef<HTMLInputElement>;
  @ViewChild('inputRecebido') inputRecebido!: ElementRef<HTMLInputElement>;
  @ViewChild('carrinhoBody')  carrinhoBody!: ElementRef<HTMLElement>;

  private caixaSvc   = inject(CaixaService);
  private vendaSvc   = inject(VendaService);
  private produtoSvc = inject(ProdutoService);
  private snack      = inject(MatSnackBar);

  // ── Estado do caixa ──
  caixaAberto  = signal(false);
  caixaInfo    = signal<Caixa | null>(null);
  abrindo      = signal(false);
  valorAbertura = 0;

  // ── Perfil do usuário logado ──
  perfilUsuario = signal<string>('OPERADOR');

  // ── Modal de fechar caixa (substitui o prompt() nativo) ──
  modalFecharAberto  = signal(false);
  valorContagemCaixa = 0;

  // ── Carrinho ──
  carrinho             = signal<CarrinhoItem[]>([]);
  itemSelecionadoIndex : number | null = null;
  ultimoAdicionadoId   : number | null = null;
  ultimoProduto        = '';

  // ── Busca ──
  buscaInput      = '';
  resultadosBusca = signal<Produto[]>([]);
  sugestaoIndex   = -1;
  buscando        = false;
  erroBipar       = false;
  msgErro         = '';

  // ── Pagamento ──
  formaPagamento = signal<FormaPagamento>('DINHEIRO');
  valorRecebido  = signal(0);
  registrando    = signal(false);
  ultimaVenda    = signal<Venda | null>(null);

  // ── Movimentações ──
  movimentacoes  = signal<MovimentacaoCaixa[]>([]);
  modalMovAberto = signal(false);
  tipoMov        = signal<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  salvandoMov    = signal(false);
  mostrarAuthMov = signal(false);
  acaoPendente   : (() => void) | null = null;
  valorMov       = 0;
  motivoMov      = '';

  showModalCancelar = false;
  operador = ''; horaAtual = ''; dataAtual = '';

  lojaConfig = {
    nome: 'Bira & Naite Distribuidora',
    descricao: 'Sistema de caixa personalizado para a loja',
    logo: 'assets/loja/logo.png',
    logoPadrao: 'assets/loja/logo-padrao.png'
  };

  formasPagamento = [
    { value: 'DINHEIRO'       as FormaPagamento, label: 'Dinheiro', icon: '💵', key: 'F1' },
    { value: 'PIX'            as FormaPagamento, label: 'Pix',      icon: '📱', key: 'F5' },
    { value: 'CARTAO_DEBITO'  as FormaPagamento, label: 'Débito',   icon: '💳', key: 'F6' },
    { value: 'CARTAO_CREDITO' as FormaPagamento, label: 'Crédito',  icon: '💳', key: 'F7' },
  ];

  // ── Computed ──
  totalCarrinho = computed(() => this.carrinho().reduce((s, i) => s + i.subtotal, 0));
  totalItens    = computed(() => this.carrinho().reduce((s, i) => s + i.quantidade, 0));
  troco         = computed(() => this.valorRecebido() - this.totalCarrinho());

  /** Apenas GERENTE e ADMIN podem fechar o caixa */
  podeFecharCaixa = computed(() =>
    ['GERENTE', 'ADMIN'].includes(this.perfilUsuario())
  );

  podeFinalizarVenda = computed(() => {
    if (this.carrinho().length === 0 || this.registrando()) return false;
    if (this.formaPagamento() === 'DINHEIRO')
      return this.valorRecebido() >= this.totalCarrinho() && this.valorRecebido() > 0;
    return true;
  });

  private destroy$   = new Subject<void>();
  private clockTimer : any;
  private busca$     = new Subject<string>();

  ngOnInit(): void {
    this.carregarOperador();
    this.iniciarRelogio();
    this.configurarBusca();
    this.verificarCaixa();
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.showModalCancelar = false;
      this.modalFecharAberto.set(false);
      this.resultadosBusca.set([]);
      this.erroBipar = false;
      this.focarInput();
      return;
    }
    if (this.resultadosBusca().length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.sugestaoIndex = Math.min(this.sugestaoIndex + 1, this.resultadosBusca().length - 1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); this.sugestaoIndex = Math.max(this.sugestaoIndex - 1, 0); return; }
    }
    if (this.showModalCancelar || this.mostrarAuthMov() || this.modalMovAberto() || this.modalFecharAberto()) return;
    switch (e.key) {
      case 'F1': e.preventDefault(); this.selecionarPagamento('DINHEIRO'); break;
      case 'F2': e.preventDefault(); this.focarInput(); break;
      case 'F4': e.preventDefault(); this.carrinho().length > 0 ? this.showModalCancelar = true : this.novaVenda(); break;
      case 'F5': e.preventDefault(); this.selecionarPagamento('PIX'); break;
      case 'F6': e.preventDefault(); this.selecionarPagamento('CARTAO_DEBITO'); break;
      case 'F7': e.preventDefault(); this.selecionarPagamento('CARTAO_CREDITO'); break;
      case 'F8': e.preventDefault(); if (this.podeFinalizarVenda()) this.finalizarVenda(); break;
      case 'F9': e.preventDefault(); this.abrirModalFecharCaixa(); break;
      case 'Delete': e.preventDefault(); e.ctrlKey ? this.confirmarLimpar() : this.removerItemSelecionado(); break;
    }
  }

  usarLogoPadrao(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.lojaConfig.logoPadrao;
  }

  private carregarOperador(): void {
    try {
      const u = TokenHelper.getUser();
      this.operador     = u?.nome || u?.email || 'Operador';
      // Lê o perfil do token para controle de permissões
      this.perfilUsuario.set(u?.perfil || u?.role || 'OPERADOR');
    } catch {
      this.operador = 'Operador';
      this.perfilUsuario.set('OPERADOR');
    }
  }

  private iniciarRelogio(): void {
    const tick = () => {
      const now = new Date();
      this.horaAtual = now.toLocaleTimeString('pt-BR');
      this.dataAtual = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    };
    tick(); this.clockTimer = setInterval(tick, 1000);
  }

  private configurarBusca(): void {
    this.busca$.pipe(debounceTime(320), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(t => {
        if (t.length < 2) { this.resultadosBusca.set([]); return; }
        this.produtoSvc.listar(t, undefined, 0, 8).subscribe({
          next : p => { this.resultadosBusca.set(p.content); this.sugestaoIndex = -1; },
          error: ()  => this.resultadosBusca.set([]),
        });
      });
  }

  focarInput(): void { setTimeout(() => this.inputBipar?.nativeElement?.focus(), 60); }

  verificarCaixa(): void {
    this.caixaSvc.getStatus().pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.caixaAberto.set(s.aberto); this.caixaInfo.set(s.caixa ?? null);
      if (s.aberto && s.caixa?.id) this.carregarMovimentacoes(s.caixa.id);
      setTimeout(() => this.focarInput(), 200);
    });
  }

  abrirCaixa(): void {
    this.abrindo.set(true);
    this.caixaSvc.abrir(this.valorAbertura).subscribe({
      next : c => { this.caixaInfo.set(c); this.caixaAberto.set(true); this.abrindo.set(false); setTimeout(() => this.focarInput(), 200); },
      error: err => { this.snack.open(err.error?.message || 'Erro ao abrir caixa', '', { duration: 4000 }); this.abrindo.set(false); },
    });
  }

  /** Abre o modal de fechar — bloqueia para OPERADOR */
  abrirModalFecharCaixa(): void {
    if (!this.podeFecharCaixa()) {
      this.snack.open(
        '🔒 Apenas Gerentes e Administradores podem fechar o caixa.',
        'Entendi',
        { duration: 5000 }
      );
      return;
    }
    this.valorContagemCaixa = 0;
    this.modalFecharAberto.set(true);
  }

  /** Confirma o fechamento com o valor contado */
  confirmarFechamentoCaixa(): void {
    if (this.valorContagemCaixa < 0) {
      this.snack.open('Informe um valor válido (≥ 0)', '', { duration: 3000 });
      return;
    }
    this.modalFecharAberto.set(false);
    this.caixaSvc.fechar(this.valorContagemCaixa).subscribe({
      next: r => {
        this.caixaAberto.set(false);
        this.caixaInfo.set(null);
        this.movimentacoes.set([]);
        const sinal = r.diferenca >= 0 ? '+' : '-';
        const abs   = Math.abs(r.diferenca).toFixed(2);
        this.snack.open(
          `✓ Caixa fechado · ${r.quantidadeVendas} vendas · Diferença: ${sinal}R$ ${abs}`,
          '',
          { duration: 6000 }
        );
      },
      error: err => {
        // 403 = sem permissão no backend
        if (err.status === 403) {
          this.snack.open(
            '🔒 Sem permissão para fechar o caixa. Solicite a um Gerente ou Administrador.',
            'Fechar',
            { duration: 6000 }
          );
        } else {
          this.snack.open(
            err.error?.message || 'Erro ao fechar caixa',
            'Fechar',
            { duration: 4000 }
          );
        }
      },
    });
  }

  onBuscaInput(): void {
    this.erroBipar = false;
    const v = this.buscaInput.trim();
    if (/^\d+$/.test(v)) { this.resultadosBusca.set([]); return; }
    this.busca$.next(v);
  }

  moverSugestao(delta: number): void {
    if (!this.resultadosBusca().length) return;
    this.sugestaoIndex = Math.max(-1, Math.min(this.sugestaoIndex + delta, this.resultadosBusca().length - 1));
  }

  onEnter(): void {
    if (this.resultadosBusca().length > 0 && this.sugestaoIndex >= 0) {
      this.adicionarProduto(this.resultadosBusca()[this.sugestaoIndex]); return;
    }
    const codigo = this.buscaInput.trim();
    if (!codigo) return;
    this.resultadosBusca.set([]);
    this.executarBusca(codigo);
  }

  private executarBusca(codigoOuNome: string): void {
    if (this.buscando) return;
    this.buscando = true;
    this.produtoSvc.buscarPorCodigoBarras(codigoOuNome).pipe(takeUntil(this.destroy$)).subscribe({
      next : p => { this.buscando = false; this.adicionarProduto(p); this.buscaInput = ''; this.focarInput(); },
      error: () => {
        this.produtoSvc.listar(codigoOuNome, undefined, 0, 1).pipe(takeUntil(this.destroy$)).subscribe({
          next : page => {
            this.buscando = false;
            if (page.content.length > 0) { this.adicionarProduto(page.content[0]); this.buscaInput = ''; this.focarInput(); }
            else this.mostrarErro('Produto não encontrado');
          },
          error: () => { this.buscando = false; this.mostrarErro('Produto não encontrado'); },
        });
      },
    });
  }

  adicionarProduto(p: Produto): void {
    if (p.quantidadeEstoque === 0) { this.mostrarErro('Produto sem estoque!'); return; }
    const lista = [...this.carrinho()];
    const idx   = lista.findIndex(i => i.produto.id === p.id);
    if (idx >= 0) {
      if (lista[idx].quantidade >= p.quantidadeEstoque) { this.mostrarErro('Quantidade máxima em estoque!'); return; }
      lista[idx].quantidade++;
      lista[idx].subtotal = lista[idx].quantidade * this.toNumber(lista[idx].produto.precoVenda);
      this.itemSelecionadoIndex = idx;
    } else {
      lista.push({ produto: p, quantidade: 1, subtotal: this.toNumber(p.precoVenda) });
      this.itemSelecionadoIndex = lista.length - 1;
    }
    this.carrinho.set(lista);
    this.ultimoAdicionadoId = p.id;
    this.ultimoProduto = p.nome;
    this.resultadosBusca.set([]);
    this.buscaInput = '';
    this.audioBeepOk();
    setTimeout(() => { this.carrinhoBody?.nativeElement && (this.carrinhoBody.nativeElement.scrollTop = this.carrinhoBody.nativeElement.scrollHeight); }, 50);
    setTimeout(() => { this.ultimoAdicionadoId = null; this.ultimoProduto = ''; }, 1200);
  }

  alterarQtd(item: CarrinhoItem, delta: number): void {
    const lista = [...this.carrinho()];
    const idx   = lista.findIndex(i => i.produto.id === item.produto.id);
    if (idx < 0) return;
    const novaQtd = lista[idx].quantidade + delta;
    if (novaQtd <= 0) lista.splice(idx, 1);
    else { lista[idx].quantidade = novaQtd; lista[idx].subtotal = novaQtd * this.toNumber(lista[idx].produto.precoVenda); }
    this.carrinho.set(lista); this.focarInput();
  }

  removerItemIdx(idx: number): void {
    const lista = [...this.carrinho()]; lista.splice(idx, 1); this.carrinho.set(lista);
    this.itemSelecionadoIndex = lista.length > 0 ? Math.min(idx, lista.length - 1) : null;
    this.focarInput();
  }

  private removerItemSelecionado(): void {
    if (this.itemSelecionadoIndex !== null) this.removerItemIdx(this.itemSelecionadoIndex);
    else if (this.carrinho().length > 0)    this.removerItemIdx(this.carrinho().length - 1);
  }

  confirmarLimpar(): void { if (this.carrinho().length > 0) this.showModalCancelar = true; else this.novaVenda(); }

  limparCarrinho(): void {
    this.carrinho.set([]); this.ultimaVenda.set(null); this.valorRecebido.set(0);
    this.itemSelecionadoIndex = null; this.showModalCancelar = false; this.focarInput();
  }

  novaVenda(): void { this.limparCarrinho(); this.formaPagamento.set('DINHEIRO'); }

  selecionarPagamento(forma: FormaPagamento): void {
    this.formaPagamento.set(forma);
    if (forma !== 'DINHEIRO') this.valorRecebido.set(0);
    this.focarInput();
  }

  finalizarVenda(): void {
    if (!this.podeFinalizarVenda()) return;
    this.registrando.set(true);
    const itens: ItemVendaRequest[] = this.carrinho().map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade }));
    const req: any = { formaPagamento: this.formaPagamento(), itens };
    if (this.formaPagamento() === 'DINHEIRO' && this.valorRecebido() > 0) req.valorRecebido = this.valorRecebido();
    this.vendaSvc.registrar(req).pipe(takeUntil(this.destroy$)).subscribe({
      next: v => {
        this.ultimaVenda.set(v); this.limparCarrinho(); this.valorRecebido.set(0);
        this.registrando.set(false); this.audioBeepVenda(); this.verificarCaixa();
        this.snack.open(`✓ Venda ${v.numeroVenda} registrada!`, '', { duration: 3000 });
      },
      error: err => { this.snack.open(err.error?.message || 'Erro ao registrar venda', '', { duration: 5000 }); this.registrando.set(false); },
    });
  }

  carregarMovimentacoes(caixaId: number): void {
    this.caixaSvc.listarMovimentacoes(caixaId).subscribe({ next: m => this.movimentacoes.set(m), error: () => {} });
  }

  abrirModalMov(tipo: 'SANGRIA' | 'SUPRIMENTO'): void {
    this.tipoMov.set(tipo); this.valorMov = 0; this.motivoMov = '';
    if (this.perfilUsuario() === 'OPERADOR') {
      this.acaoPendente = () => this.modalMovAberto.set(true); this.mostrarAuthMov.set(true);
    } else this.modalMovAberto.set(true);
  }

  onMovAutorizado(): void { this.mostrarAuthMov.set(false); this.acaoPendente?.(); this.acaoPendente = null; }
  onMovCancelado():  void { this.mostrarAuthMov.set(false); this.acaoPendente = null; }
  fecharModalMov():  void { this.modalMovAberto.set(false); }

  confirmarMov(): void {
    if (!this.valorMov || this.valorMov <= 0) { this.snack.open('Informe um valor maior que zero', '', { duration: 3000 }); return; }
    if (!this.motivoMov.trim())               { this.snack.open('Informe o motivo', '', { duration: 3000 }); return; }
    this.salvandoMov.set(true);
    this.caixaSvc.registrarMovimentacao({ tipo: this.tipoMov(), valor: this.valorMov, motivo: this.motivoMov.trim() })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snack.open(`✓ ${this.tipoMov() === 'SANGRIA' ? 'Sangria' : 'Suprimento'} registrado!`, '', { duration: 3000 });
          this.fecharModalMov(); this.salvandoMov.set(false);
          const id = this.caixaInfo()?.id;
          if (id) this.carregarMovimentacoes(id);
          this.verificarCaixa(); this.focarInput();
        },
        error: err => { this.snack.open(err.error?.message || 'Erro ao registrar', '', { duration: 4000 }); this.salvandoMov.set(false); },
      });
  }

  private mostrarErro(msg: string): void {
    this.erroBipar = true; this.msgErro = msg; this.audioBeepErro();
    setTimeout(() => { this.erroBipar = false; this.focarInput(); }, 2500);
  }

  private toNumber(v: any): number {
    if (typeof v === 'number') return v;
    return Number(String(v).replace('R$', '').replace(/\s/g, '').replace(',', '.')) || 0;
  }

  private audioCtx: AudioContext | null = null;
  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.audioCtx;
  }
  private beep(freq: number, type: OscillatorType, gain: number, dur: number): void {
    try {
      const ctx = this.getAudioCtx(); const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type; osc.frequency.value = freq; g.gain.value = gain;
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  }
  private audioBeepOk()   : void { this.beep(880, 'sine', 0.08, 0.1); }
  private audioBeepErro() : void { this.beep(220, 'square', 0.15, 0.15); setTimeout(() => this.beep(180, 'square', 0.15, 0.15), 180); }
  private audioBeepVenda(): void {
    this.beep(660, 'sine', 0.1, 0.08);
    setTimeout(() => this.beep(880,  'sine', 0.1, 0.08), 100);
    setTimeout(() => this.beep(1100, 'sine', 0.1, 0.15), 200);
  }
}
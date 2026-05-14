import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

import {
  AuthResponse, LoginRequest, Usuario,AuditLog ,
  Produto, ProdutoRequest, Page, AlertasEstoque, Movimentacao, AjusteEstoqueRequest,
  Categoria, Caixa, ResumoFechamento, Venda, VendaRequest,
  Despesa, DespesaRequest, TipoDespesa, SaldoDia, RelatorioFinanceiro,
  Fiado, LancamentoFiado, DashboardData, Loja, MovimentacaoCaixa 
} from '../models/models';

const API = 'https://mercado-facilv3-production.up.railway.app/api/v1';

// ─── Auth Service ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, req);
  }
  me(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${API}/auth/me`);
  }
}

// ─── Produto Service ─────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private http = inject(HttpClient);

listar(busca?: string, categoriaId?: number, pagina = 0, tamanho = 20, lojaId?: number): Observable<Page<Produto>> {
  let params = new HttpParams().set('pagina', pagina).set('tamanho', tamanho);
  if (busca)       params = params.set('busca', busca);
  if (categoriaId) params = params.set('categoriaId', categoriaId);
  if (lojaId)      params = params.set('lojaId', lojaId);
  return this.http.get<Page<Produto>>(`${API}/produtos`, { params });
}

  buscarPorId(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${API}/produtos/${id}`);
  }
  buscarPorCodigoBarras(codigo: string): Observable<Produto> {
    return this.http.get<Produto>(`${API}/produtos/codigo-barras/${codigo}`);
  }  
  criar(req: ProdutoRequest): Observable<Produto> {
    return this.http.post<Produto>(`${API}/produtos`, req);
  }
  atualizar(id: number, req: ProdutoRequest): Observable<Produto> {
    return this.http.put<Produto>(`${API}/produtos/${id}`, req);
  }
  desativar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/produtos/${id}`);
  }
  ajustarEstoque(id: number, req: AjusteEstoqueRequest): Observable<Produto> {
    return this.http.patch<Produto>(`${API}/produtos/${id}/estoque`, req);
  }
  listarMovimentacoes(id: number, pagina = 0): Observable<Page<Movimentacao>> {
    return this.http.get<Page<Movimentacao>>(`${API}/produtos/${id}/movimentacoes`, {
      params: new HttpParams().set('pagina', pagina)
    });
  }
  getAlertas(): Observable<AlertasEstoque> {
    return this.http.get<AlertasEstoque>(`${API}/produtos/alertas`);
  }
}

// ─── Categoria Service ───────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private http = inject(HttpClient);
  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${API}/categorias`);
  }
  criar(nome: string, descricao: string): Observable<Categoria> {
    return this.http.post<Categoria>(`${API}/categorias`, { nome, descricao });
  }
}

// ─── Caixa Service ───────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CaixaService {
  private http = inject(HttpClient);

  getStatus(): Observable<{ aberto: boolean; caixa?: Caixa }> {
    return this.http.get<{ aberto: boolean; caixa?: Caixa }>(`${API}/caixa/status`);
  }
  getCaixaAtual(): Observable<Caixa> {
    return this.http.get<Caixa>(`${API}/caixa/atual`);
  }
  listarHistorico(): Observable<Caixa[]> {
    return this.http.get<Caixa[]>(`${API}/caixa/historico`);
  }
  abrir(valorAbertura: number): Observable<Caixa> {
    return this.http.post<Caixa>(`${API}/caixa/abrir`, { valorAbertura });
  }
  fechar(valorFechamento: number, observacao?: string): Observable<ResumoFechamento> {
    return this.http.post<ResumoFechamento>(`${API}/caixa/fechar`, { valorFechamento, observacao });
  }
  registrarMovimentacao(req: { tipo: 'SANGRIA' | 'SUPRIMENTO'; valor: number; motivo: string }) {
  return this.http.post<any>(`${API}/caixa/movimentacao`, req);
}

listarMovimentacoes(caixaId: number) {
  return this.http.get<MovimentacaoCaixa[]>(`${API}/caixa/${caixaId}/movimentacoes`);
}
}

// ─── Venda Service ───────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VendaService {
  private http = inject(HttpClient);

  registrar(req: VendaRequest): Observable<Venda> {
    return this.http.post<Venda>(`${API}/vendas`, req);
  }
  buscarPorId(id: number): Observable<Venda> {
    return this.http.get<Venda>(`${API}/vendas/${id}`);
  }
  listarHoje(): Observable<Venda[]> {
    return this.http.get<Venda[]>(`${API}/vendas/hoje`);
  }
  listarPorCaixa(caixaId: number, pagina = 0): Observable<Page<Venda>> {
    return this.http.get<Page<Venda>>(`${API}/vendas/caixa/${caixaId}`, {
      params: new HttpParams().set('pagina', pagina)
    });
  }
  cancelar(id: number, motivo: string): Observable<Venda> {
    return this.http.post<Venda>(`${API}/vendas/${id}/cancelar`, { motivo });
  }
}

// ─── Financeiro Service ──────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private http = inject(HttpClient);

  listarTiposDespesa(): Observable<TipoDespesa[]> {
    return this.http.get<TipoDespesa[]>(`${API}/financeiro/tipos-despesa`);
  }
  listarDespesasHoje(): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(`${API}/financeiro/despesas`);
  }
  listarDespesasPorPeriodo(inicio: string, fim: string): Observable<Despesa[]> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<Despesa[]>(`${API}/financeiro/despesas`, { params });
  }
  lancarDespesa(req: DespesaRequest): Observable<Despesa> {
    return this.http.post<Despesa>(`${API}/financeiro/despesas`, req);
  }
  excluirDespesa(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/financeiro/despesas/${id}`);
  }
  getSaldoHoje(): Observable<SaldoDia> {
    return this.http.get<SaldoDia>(`${API}/financeiro/saldo-hoje`);
  }
  getRelatorioHoje(): Observable<RelatorioFinanceiro> {
    return this.http.get<RelatorioFinanceiro>(`${API}/financeiro/relatorio/hoje`);
  }
  getRelatorioMes(): Observable<RelatorioFinanceiro> {
    return this.http.get<RelatorioFinanceiro>(`${API}/financeiro/relatorio/mes`);
  }
  getRelatorioPeriodo(inicio: string, fim: string): Observable<RelatorioFinanceiro> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<RelatorioFinanceiro>(`${API}/financeiro/relatorio/periodo`, { params });
  }
}

// ─── Fiado Service ───────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class FiadoService {
  private http = inject(HttpClient);

  listar(nome?: string): Observable<Fiado[]> {
    let params = new HttpParams();
    if (nome) params = params.set('nome', nome);
    return this.http.get<Fiado[]>(`${API}/fiado`, { params });
  }
  buscarPorId(id: number): Observable<Fiado> {
    return this.http.get<Fiado>(`${API}/fiado/${id}`);
  }
  criar(req: { nomeCliente: string; telefoneCliente?: string; limiteCredito?: number }): Observable<Fiado> {
    return this.http.post<Fiado>(`${API}/fiado`, req);
  }
  listarLancamentos(id: number): Observable<LancamentoFiado[]> {
    return this.http.get<LancamentoFiado[]>(`${API}/fiado/${id}/lancamentos`);
  }
  lancar(id: number, tipo: 'DEBITO' | 'PAGAMENTO', valor: number, descricao?: string): Observable<LancamentoFiado> {
    return this.http.post<LancamentoFiado>(`${API}/fiado/${id}/lancamentos`, { tipo, valor, descricao });
  }
  bloquear(id: number): Observable<Fiado> {
    return this.http.post<Fiado>(`${API}/fiado/${id}/bloquear`, {});
  }
  quitar(id: number): Observable<Fiado> {
    return this.http.post<Fiado>(`${API}/fiado/${id}/quitar`, {});
  }
  atualizarLimite(id: number, limiteCredito: number): Observable<Fiado> {
  return this.http.patch<Fiado>(`${API}/fiado/${id}/limite`, { limiteCredito });
}
}

// ─── Dashboard Service ───────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  getResumo(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${API}/dashboard/resumo`);
  }
}

// ─── Auditoria Service ───────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);

  listar(pagina = 0, tamanho = 50, filtros?: {
    usuarioId?: number;
    entidade?: string;
    inicio?: string;
    fim?: string;
  }): Observable<Page<AuditLog>> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanho', tamanho);

    if (filtros?.usuarioId) params = params.set('usuarioId', filtros.usuarioId);
    if (filtros?.entidade)  params = params.set('entidade',  filtros.entidade);
    if (filtros?.inicio)    params = params.set('inicio',    filtros.inicio);
    if (filtros?.fim)       params = params.set('fim',       filtros.fim);

    return this.http.get<Page<AuditLog>>(`/api/v1/auditoria`, { params });
  }

  listarSuspeitas(data?: string): Observable<AuditLog[]> {
    let params = new HttpParams();
    if (data) params = params.set('data', data);
    return this.http.get<AuditLog[]>(`/api/v1/auditoria/suspeitas`, { params });
  }

  cancelamentosPorOperador(data?: string): Observable<{ operador: string; totalCancelamentos: number }[]> {
    let params = new HttpParams();
    if (data) params = params.set('data', data);
    return this.http.get<any[]>(`/api/v1/auditoria/cancelamentos-por-operador`, { params });
  }

  historicoEntidade(entidade: string, id: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`/api/v1/auditoria/entidade/${entidade}/${id}`);
  }
}

// ─── Loja Service ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class LojaService {
  private http = inject(HttpClient);

  private readonly STORAGE_KEY = 'lojaSelecionadaId';

  private lojaSelecionadaId$$ = new BehaviorSubject<number | null>(
    this.carregarLojaSelecionada()
  );

  lojaSelecionadaId$ = this.lojaSelecionadaId$$.asObservable();

  listar(): Observable<Loja[]> {
    return this.http.get<Loja[]>(`${API}/lojas`);
  }

  criar(req: { nome: string; codigo: string; endereco?: string; telefone?: string; cnpj?: string }): Observable<Loja> {
    return this.http.post<Loja>(`${API}/lojas`, req);
  }

  atualizar(id: number, req: { nome: string; codigo: string; endereco?: string; telefone?: string; cnpj?: string }): Observable<Loja> {
    return this.http.put<Loja>(`${API}/lojas/${id}`, req);
  }

  alterarStatus(id: number, ativa: boolean): Observable<void> {
    return this.http.patch<void>(`${API}/lojas/${id}/status`, { ativa });
  }

  setLojaSelecionada(id: number | null): void {
    if (id === null) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, String(id));
    }

    this.lojaSelecionadaId$$.next(id);
  }

  getLojaSelecionadaId(): number | null {
    return this.lojaSelecionadaId$$.getValue();
  }

  getLojaIdHeader(): string | null {
    const id = this.getLojaSelecionadaId();
    return id !== null ? String(id) : null;
  }

  limparLojaSelecionada(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.lojaSelecionadaId$$.next(null);
  }

  private carregarLojaSelecionada(): number | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);

    if (!raw) return null;

    const id = Number(raw);

    return Number.isNaN(id) ? null : id;
  }
}

  // ─── Usuario Service ─────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);

  listar(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/usuarios`);
  }

  criar(req: { nome: string; email: string; senha: string; perfil: string; lojaId?: number }): Observable<any> {
    return this.http.post<any>(`${API}/usuarios`, req);
  }

  atualizar(id: number, req: { nome: string; email: string; senha?: string; perfil: string; lojaId?: number }): Observable<any> {
    return this.http.put<any>(`${API}/usuarios/${id}`, req);
  }

  alterarStatus(id: number, ativo: boolean): Observable<any> {
    return this.http.patch<any>(`${API}/usuarios/${id}/status`, { ativo });
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  MercadoFácil — Core Models / Interfaces                ║
// ╚══════════════════════════════════════════════════════════╝

// ─── Auth ────────────────────────────────────────────────────
export interface LoginRequest { email: string; senha: string; }
export interface AuthResponse {
  token: string; tipo: string;
  usuarioId: number; nome: string; email: string; perfil: string;
}
export interface Usuario {
  id: number; nome: string; email: string;
  perfil: 'ADMIN' | 'GERENTE' | 'OPERADOR'; ativo: boolean; criadoEm: string;
}

// ─── Produto / Estoque ───────────────────────────────────────
export interface Categoria { id: number; nome: string; descricao: string; }

export interface Produto {
  id: number; codigoBarras: string; nome: string; descricao: string;
  categoriaId: number; categoriaNome: string;
  quantidadeEstoque: number; estoqueMinimo: number;
  precoCusto: number; precoVenda: number; margem: number;
  dataValidade: string;
  ativo: boolean; estoqueBaixo: boolean; estoqueZerado: boolean;
  validadeProxima: boolean; vencido: boolean;
  criadoEm: string; atualizadoEm: string;
}

export interface ProdutoRequest {
  codigoBarras?: string; nome: string; descricao?: string;
  categoriaId?: number; quantidadeEstoque: number; estoqueMinimo?: number;
  precoCusto: number; precoVenda: number; dataValidade?: string;
}

export interface AlertasEstoque {
  estoqueBaixo: Produto[]; estoqueZerado: Produto[];
  validadeProxima: Produto[]; vencidos: Produto[]; totalAlertas: number;
}

export interface Movimentacao {
  id: number; produtoId: number; produtoNome: string;
  tipo: string; quantidade: number;
  quantidadeAnterior: number; quantidadePosterior: number;
  motivo: string; usuario: string; criadoEm: string;
}

export interface AjusteEstoqueRequest {
  quantidade: number;
  tipo: 'ENTRADA' | 'AJUSTE_INVENTARIO' | 'SAIDA_AJUSTE';
  motivo: string;
}

// ─── Caixa ───────────────────────────────────────────────────
export interface Caixa {
  id: number; status: 'ABERTO' | 'FECHADO';
  valorAbertura: number; valorFechamento: number;
  totalDinheiro: number; totalPix: number;
  totalCartaoDebito: number; totalCartaoCredito: number;
  totalVendas: number; totalGeral: number;
  observacaoFechamento: string;
  abertoPorNome: string; fechadoPorNome: string;
  abertoEm: string; fechadoEm: string;
}

export interface ResumoFechamento {
  caixa: Caixa; totalEsperado: number; totalInformado: number;
  diferenca: number; quantidadeVendas: number; ticketMedio: number;
}

// ─── Vendas ──────────────────────────────────────────────────
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'MISTO';

export interface ItemVenda {
  id: number; produtoId: number; produtoNome: string; produtoCodigoBarras: string;
  quantidade: number; precoUnitario: number; desconto: number;
  subtotal: number; lucroItem: number; status: string;
}

export interface Venda {
  id: number; numeroVenda: string; caixaId: number; operadorNome: string;
  formaPagamento: FormaPagamento; status: 'ABERTA' | 'FINALIZADA' | 'CANCELADA';
  valorSubtotal: number; valorDesconto: number; valorTotal: number;
  valorRecebido: number; valorTroco: number;
  motivoCancelamento: string; itens: ItemVenda[];
  criadoEm: string; canceladoEm: string;
}

export interface ItemVendaRequest { produtoId: number; quantidade: number; desconto?: number; }
export interface VendaRequest {
  formaPagamento: FormaPagamento;
  itens: ItemVendaRequest[];
  descontoGeral?: number;
  valorRecebido?: number;
}

// ─── Financeiro ──────────────────────────────────────────────
export interface TipoDespesa { id: number; nome: string; descricao: string; ativo: boolean; }

export interface Despesa {
  id: number; tipoDespesaId: number; tipoDespesaNome: string;
  descricao: string; valor: number; dataDespesa: string;
  formaPagamento: string; observacao: string;
  registradoPorNome: string; criadoEm: string;
}

export interface DespesaRequest {
  tipoDespesaId: number; descricao: string; valor: number;
  dataDespesa: string; formaPagamento?: string; observacao?: string;
}

export interface SaldoDia {
  data: string; totalVendas: number; totalDespesas: number;
  saldo: number; situacao: 'POSITIVO' | 'NEGATIVO';
}

export interface RelatorioFinanceiro {
  dataInicio: string; dataFim: string;
  totalVendas: number; quantidadeVendas: number;
  totalDespesas: number;
  despesasPorCategoria: { tipoDespesa: string; total: number; quantidade: number }[];
  lucroLiquido: number; margemLucro: number;
  totalFiadoEmAberto: number; clientesFiadoAtivos: number;
  resumoDiario: { data: string; totalVendas: number; totalDespesas: number; lucro: number }[];
}

// ─── Fiado ───────────────────────────────────────────────────
export interface Fiado {
  id: number; nomeCliente: string; telefoneCliente: string;
  saldoDevedor: number; limiteCredito: number;
  status: 'ATIVO' | 'QUITADO' | 'BLOQUEADO';
  dataUltimoLancamento: string; registradoPorNome: string; criadoEm: string;
}

export interface LancamentoFiado {
  id: number; fiadoId: number; nomeCliente: string;
  tipo: 'DEBITO' | 'PAGAMENTO'; valor: number;
  descricao: string; vendaId: number;
  registradoPorNome: string; criadoEm: string;
}

// ─── Dashboard ───────────────────────────────────────────────
export interface DashboardData {
  totalVendasHoje: number; quantidadeVendasHoje: number; ticketMedioHoje: number;
  totalDespesasHoje: number; lucroEstimadoHoje: number;
  caixaAberto: boolean; caixaAtual: Caixa | null;
  produtosEstoqueBaixo: number; produtosEstoqueZerado: number;
  produtosValidadeProxima: number; produtosVencidos: number; totalAlertas: number;
}

// ─── Paginação ───────────────────────────────────────────────
export interface Page<T> {
  content: T[]; pagina: number; tamanhoPagina: number;
  totalElementos: number; totalPaginas: number;
  primeira: boolean; ultima: boolean;
}
// ─── Auditoria ───────────────────────────────────────────────
export interface AuditLog {
  id: number;
  usuarioNome: string;
  acao: string;
  descricao: string;
  entidade: string;
  entidadeId: number;
  entidadeReferencia: string;
  valorAnterior: string;
  valorPosterior: string;
  criadoEm: string;
}

// ─── Loja ────────────────────────────────────────────────────
export interface Loja {
  id: number;
  nome: string;
  codigo: string;
  endereco: string;
  telefone: string;
  cnpj: string;
  ativa: boolean;
  criadoEm: string;
}
// ─── sangria /suprimento ────────────────────────────────────────────────────
export interface MovimentacaoCaixa {
  id: number;
  tipo: 'SANGRIA' | 'SUPRIMENTO';
  valor: number;
  motivo: string;
  operadorNome: string;
  criadoEm: string;
}
export type UsuarioId = string;

export type CategoriaId = string;

export type DivisaoTipo = '50/50' | string; // '50/50' ou UID/Nome do parceiro correspondente

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coupleId?: string;
  createdAt?: string;
  tetoPessoalCentavos?: number; // Teto orçamentário pessoal mensal (ex: 250000 = R$ 2.500,00)
  categoriasIndividuais?: CategoriaMeta[]; // Categorias personalizadas do espaço individual
}

export interface CoupleSpace {
  id: string;
  inviteCode: string;
  members: string[];
  partner1Uid: string;
  partner1Name: string;
  partner1Email?: string;
  partner1PhotoURL?: string;
  partner2Uid?: string;
  partner2Name?: string;
  partner2Email?: string;
  partner2PhotoURL?: string;
  createdAt: string;
  categories?: CategoriaMeta[];
  defaultSplit?: string; // ex: '50/50', '70/30', '30/70', '60/40', etc.
  createdBy?: string;
}

export interface Compra {
  id: string;
  coupleId?: string;
  nome: string; // Estabelecimento
  valor: number; // Total em reais
  valorCentavos?: number; // Total em centavos inteiros
  pagoPorUid?: string;
  pagoPorNome?: string;
  pagoPor?: string; // Compatibilidade / Nome de exibição
  cadastradoPorUid?: string;
  cadastradoPorNome?: string;
  cadastradoPor?: string; // Compatibilidade / Nome de exibição
  divisao: DivisaoTipo; // '50/50' ou o UID/Nome da pessoa a quem a despesa pertence
  categoria: CategoriaId;
  dataCompra?: string; // 'AAAA-MM-DD' - Data em que a compra foi realizada
  dataPrimeiroPagamento: string; // 'AAAA-MM-DD' - Data do 1º pagamento / vencimento da fatura
  numeroDeParcelas: number;
  ultimaParcelaAtiva: number; // Número ordinal inclusivo
  descricao?: string;
  createdAt?: string;

  // Campos para Espaço Individual & Cofre Privado:
  privada?: boolean; // Se true, lançamento é 100% individual e não entra nas contas do casal
  segredoCasal?: boolean; // Badge "Segredo do Casal 🤫" (ex: presente surpresa para parceiro)
  formaPagamentoNome?: string; // Ex: 'Cartão Nubank Vinicius', 'Amazon Kindle Store', 'VR / Cartão Refeição'
  assinatura?: boolean; // Se é assinatura / renovação periódica
}

export interface LancamentoMensal {
  compraId: string;
  numeroParcela: number;
  totalParcelas: number;
  mesReferencia: string; // 'AAAA-MM'
  dataReferencia: string; // 'AAAA-MM-DD' - Data do pagamento da parcela no mês
  dataCompra?: string; // 'AAAA-MM-DD' - Data em que a compra foi realizada
  valorCentavos: number;
  nome: string;
  categoria: CategoriaId;
  descricao?: string;
  pagoPorUid?: string;
  pagoPorNome?: string;
  pagoPor?: string;
  cadastradoPorUid?: string;
  cadastradoPorNome?: string;
  cadastradoPor?: string;
  divisao: DivisaoTipo;
  minhaParteCentavos: number; // Cota individual do usuário ativo
  privada?: boolean;
  segredoCasal?: boolean;
  formaPagamentoNome?: string;
  assinatura?: boolean;
}

export interface CategoriaMeta {
  id: CategoriaId;
  nome: string;
  icone: string;
  imagemUrl?: string; // Link direto de imagem hospedada na CDN do usuário
  tetoEstimadoCentavos: number;
  divisaoPadrao: string;
  descricao: string;
  isFixo: boolean;
}

export interface PagamentoAcerto {
  id: string;
  dataPagamento: string; // 'AAAA-MM-DD'
  valorCentavos: number;
  formaPagamento: 'pix' | 'ted' | 'dinheiro';
  pagador?: string;
  pagadorUid?: string;
  pagadorNome?: string;
  recebedor?: string;
  recebedorUid?: string;
  recebedorNome?: string;
  observacoes?: string;
  comprovanteNome?: string;
}

export interface FechamentoMensal {
  id: string;
  coupleId?: string;
  mesReferencia: string; // 'AAAA-MM'
  dataFechamento: string;
  conciliadoPor?: string;
  conciliadoPorUid?: string;
  conciliadoPorNome?: string;
  totalCompartilhadoCentavos: number;
  totalPagoP1Centavos?: number;
  totalPagoP2Centavos?: number;
  totalPagoViniciusCentavos?: number;
  totalPagoSilviaCentavos?: number;
  saldoOriginalCentavos: number; // positivo: Parceiro 2 paga Parceiro 1; negativo: Parceiro 1 paga Parceiro 2
  devedor?: string;
  devedorUid?: string;
  devedorNome?: string;
  credor?: string;
  credorUid?: string;
  credorNome?: string;
  status: 'quitado' | 'parcial' | 'retroativo';
  pagamentos: PagamentoAcerto[];
  notaRetroativa?: string;
  saldoResidualCentavos?: number;
}

export interface ResumoAcerto {
  mesReferencia: string;
  temLancamentos: boolean;
  totalCasalCentavos: number;
  totalPagoP1Centavos: number;
  totalPagoP2Centavos: number;
  totalPagoViniciusCentavos: number;
  totalPagoSilviaCentavos: number;
  devidoAP1Centavos: number;
  devidoAP2Centavos: number;
  saldoCentavos: number; // positivo = P2 paga P1, negativo = P1 paga P2
  devedor: string;
  devedorUid?: string;
  devedorNome?: string;
  credor: string;
  credorUid?: string;
  credorNome?: string;
  valorAcertoCentavos: number;
  p1Name?: string;
  p2Name?: string;
  p1Uid?: string;
  p2Uid?: string;
  cotaSilviaEm5050Centavos: number;
  cotaViniciusEm5050Centavos: number;
  cotaP2Em5050Centavos: number;
  cotaP1Em5050Centavos: number;
  cotaP1EsperadaCentavos?: number;
  cotaP2EsperadaCentavos?: number;
  detalhesExclusivosCentavos: {
    p1PagouParaP2: number;
    p2PagouParaP1: number;
    viniciusPagouParaSilvia?: number;
    silviaPagouParaVinicius?: number;
  };
  totalCompartilhadoCentavos: number;
}

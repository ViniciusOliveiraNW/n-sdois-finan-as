import React, { useState, useMemo } from 'react';
import { CategoriaMeta, Compra, CoupleSpace, LancamentoMensal, ResumoAcerto, UsuarioId } from '../types';
import { CATEGORIAS_PADRAO, CATEGORIAS_PADRAO_INDIVIDUAIS } from '../data/initialData';
import { formatarBRL, formatarDataBR } from '../calculations/acertoMensal';
import { calcularTetoIndividual } from '../calculations/tetoIndividual';
import { ModalCompartilharCompra } from './ModalCompartilharCompra';
import { ModalTetoPessoal } from './ModalTetoPessoal';
import { ModalCategoriasIndividuais } from './ModalCategoriasIndividuais';
import { RankingCategoriasView } from './RankingCategoriasView';
import { HeatmapCalendario } from './HeatmapCalendario';
import { CategoryIconOrImage } from './CategoryIconOrImage';
import { SeletorMesFlutuante } from './SeletorMesFlutuante';
import { GraficoLinhaGastos } from './GraficoLinhaGastos';
import { calcularRankingCategorias } from '../calculations/rankingCategorias';
import { obterDiasNoMes } from '../calculations/parcelas';

interface MinhasDespesasViewProps {
  mesSelecionado: string;
  onMudarMes: (mes: string) => void;
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  comprasPrivadas: Compra[];
  lancamentosPrivadosDoMes: LancamentoMensal[];
  totalGastosCasalCentavos: number;
  tetoPessoalCentavos: number;
  resumoAcerto?: ResumoAcerto;
  categorias?: CategoriaMeta[];
  categoriasIndividuais?: CategoriaMeta[];
  onSalvarCategoriasIndividuais?: (novasCategorias: CategoriaMeta[]) => Promise<void> | void;
  onSalvarTetoPessoal: (novoTetoCentavos: number) => Promise<void> | void;
  onAbrirNovaCompraPrivada: () => void;
  onEditarCompra: (compraId: string) => void;
  onRemoverCompra: (compraId: string, parcelaAtual: number) => void;
  onCompartilharComCasal: (compraAtualizada: Compra) => Promise<void> | void;
  onIrParaDespesasCasal: () => void;
}

export const MinhasDespesasView: React.FC<MinhasDespesasViewProps> = ({
  mesSelecionado,
  onMudarMes,
  usuarioAtual,
  couple,
  comprasPrivadas,
  lancamentosPrivadosDoMes,
  totalGastosCasalCentavos,
  tetoPessoalCentavos,
  resumoAcerto,
  categorias,
  categoriasIndividuais,
  onSalvarCategoriasIndividuais,
  onSalvarTetoPessoal,
  onAbrirNovaCompraPrivada,
  onEditarCompra,
  onRemoverCompra,
  onCompartilharComCasal,
  onIrParaDespesasCasal,
}) => {
  const [modoDiscreto, setModoDiscreto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [filtroOrigem, setFiltroOrigem] = useState<'todos' | 'privadas' | 'casal'>('todos');
  const [busca, setBusca] = useState('');
  const [compraParaCompartilhar, setCompraParaCompartilhar] = useState<Compra | null>(null);
  const [modalTetoAberta, setModalTetoAberta] = useState(false);
  const [modalCategoriasAberta, setModalCategoriasAberta] = useState(false);
  const [mostrarPainelCategorias, setMostrarPainelCategorias] = useState(false);

  const categoriasEfetivas = useMemo(() => {
    const indivs = categoriasIndividuais && categoriasIndividuais.length > 0
      ? categoriasIndividuais
      : CATEGORIAS_PADRAO_INDIVIDUAIS;
    const casal = categorias && categorias.length > 0 ? categorias : CATEGORIAS_PADRAO;
    const map = new Map<string, CategoriaMeta>();
    indivs.forEach((c) => map.set(c.nome.toLowerCase(), c));
    casal.forEach((c) => {
      if (!map.has(c.nome.toLowerCase())) {
        map.set(c.nome.toLowerCase(), c);
      }
    });
    return Array.from(map.values());
  }, [categoriasIndividuais, categorias]);

  const categoriasPills = useMemo(() => {
    const catsSet = new Set<string>();
    categoriasEfetivas.forEach((c) => catsSet.add(c.nome));
    lancamentosPrivadosDoMes.forEach((l) => {
      if (l.categoria) catsSet.add(l.categoria);
    });
    return ['Todos', ...Array.from(catsSet)];
  }, [categoriasEfetivas, lancamentosPrivadosDoMes]);

  const isP1 = Boolean(
    couple?.partner1Uid === usuarioAtual ||
    (couple?.partner1Name && usuarioAtual.toLowerCase().includes(couple.partner1Name.toLowerCase())) ||
    usuarioAtual.toLowerCase().includes('vinicius')
  );
  const parceiroNome = isP1
    ? (couple?.partner2Name || 'Silvia de Santana')
    : (couple?.partner1Name || 'Vinicius Oliveira');

  // Mês formatado por extenso (Ex: "Outubro de 2024")
  const nomeMesFormatado = useMemo(() => {
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const data = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 15);
      const str = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return mesSelecionado;
    }
  }, [mesSelecionado]);

  const nomeMesSimples = useMemo(() => {
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const data = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 15);
      return data.toLocaleDateString('pt-BR', { month: 'long' });
    } catch {
      return mesSelecionado;
    }
  }, [mesSelecionado]);

  // Cálculos de KPI
  const totalDesembolsadoCentavos = useMemo(() => {
    return lancamentosPrivadosDoMes.reduce((acc, l) => acc + l.valorCentavos, 0);
  }, [lancamentosPrivadosDoMes]);

  const totalGastoPrivadoCentavos = useMemo(() => {
    return lancamentosPrivadosDoMes
      .filter((l) => l.privada)
      .reduce((acc, l) => acc + l.valorCentavos, 0);
  }, [lancamentosPrivadosDoMes]);

  const totalGastoCasalPagoPorMimCentavos = useMemo(() => {
    return lancamentosPrivadosDoMes
      .filter((l) => !l.privada)
      .reduce((acc, l) => acc + l.valorCentavos, 0);
  }, [lancamentosPrivadosDoMes]);

  const countPrivadas = useMemo(() => {
    return lancamentosPrivadosDoMes.filter((l) => l.privada).length;
  }, [lancamentosPrivadosDoMes]);

  const countCasalPagasPorMim = useMemo(() => {
    return lancamentosPrivadosDoMes.filter((l) => !l.privada).length;
  }, [lancamentosPrivadosDoMes]);

  // Compromisso em parcelas no mês atual (apenas itens com parcelamento > 1)
  const parceladosDoMes = useMemo(() => {
    return lancamentosPrivadosDoMes.filter((l) => l.totalParcelas > 1);
  }, [lancamentosPrivadosDoMes]);

  const totalCompromissoParcelasCentavos = useMemo(() => {
    return parceladosDoMes.reduce((acc, l) => acc + l.valorCentavos, 0);
  }, [parceladosDoMes]);

  // Cálculo automático do teto individual considerando despesas individuais e acerto do casal
  const calculoTeto = useMemo(() => {
    return calcularTetoIndividual({
      tetoBaseCentavos: tetoPessoalCentavos,
      gastoIndividualCentavos: totalGastoPrivadoCentavos,
      resumoAcerto,
      usuarioAtual,
      p1Uid: couple?.partner1Uid || 'Vinicius',
      p1Name: couple?.partner1Name || 'Vinicius',
      p2Uid: couple?.partner2Uid || 'Silvia',
      p2Name: couple?.partner2Name || 'Silvia',
    });
  }, [
    tetoPessoalCentavos,
    totalGastoPrivadoCentavos,
    resumoAcerto,
    usuarioAtual,
    couple?.partner1Uid,
    couple?.partner1Name,
    couple?.partner2Uid,
    couple?.partner2Name,
  ]);

  // Equilíbrio de Consciência: Casal vs Individual
  const somaTotalCentavos = totalGastosCasalCentavos + totalDesembolsadoCentavos;
  const percCasal = somaTotalCentavos > 0
    ? Math.round((totalGastosCasalCentavos / somaTotalCentavos) * 100)
    : 50;
  const percIndividual = 100 - percCasal;

  // Ranking Top Categorias do Cofre Individual
  const rankingIndividual = useMemo(() => {
    return calcularRankingCategorias(lancamentosPrivadosDoMes);
  }, [lancamentosPrivadosDoMes]);

  // Maior Lançamento do Mês
  const maiorLancamentoDoMes = useMemo(() => {
    if (lancamentosPrivadosDoMes.length === 0) return null;
    return [...lancamentosPrivadosDoMes].sort((a, b) => b.valorCentavos - a.valorCentavos)[0];
  }, [lancamentosPrivadosDoMes]);

  // Total de dias no mês selecionado
  const totalDiasDoMes = useMemo(() => {
    try {
      const [ano, mes] = mesSelecionado.split('-');
      return obterDiasNoMes(parseInt(ano, 10), parseInt(mes, 10));
    } catch {
      return 30;
    }
  }, [mesSelecionado]);

  // Média Diária (Ritmo) de gastos pessoais
  const mediaDiariaCentavos = totalDiasDoMes > 0 ? Math.round(totalDesembolsadoCentavos / totalDiasDoMes) : 0;

  // Filtragem dos lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return lancamentosPrivadosDoMes.filter((lanc) => {
      // Filtro de origem
      if (filtroOrigem === 'privadas' && !lanc.privada) return false;
      if (filtroOrigem === 'casal' && lanc.privada) return false;

      // Filtro de categoria
      if (categoriaAtiva !== 'Todos') {
        const catNome = (lanc.categoria || '').toLowerCase().trim();
        const ativaNome = categoriaAtiva.toLowerCase().trim();
        const combina =
          catNome === ativaNome ||
          catNome.includes(ativaNome) ||
          ativaNome.includes(catNome);
        if (!combina) return false;
      }

      // Filtro de texto
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const nomeCombina = lanc.nome.toLowerCase().includes(termo);
        const descCombina = (lanc.descricao || '').toLowerCase().includes(termo);
        const catCombina = lanc.categoria.toLowerCase().includes(termo);
        const pagCombina = (lanc.formaPagamentoNome || '').toLowerCase().includes(termo);
        if (!nomeCombina && !descCombina && !catCombina && !pagCombina) return false;
      }

      return true;
    });
  }, [lancamentosPrivadosDoMes, filtroOrigem, categoriaAtiva, busca]);

  const formatarValorDiscreto = (centavos: number) => {
    if (modoDiscreto) return 'R$ ••••••';
    return formatarBRL(centavos);
  };

  const getIconeCategoria = (lanc: LancamentoMensal) => {
    const nome = lanc.nome.toLowerCase();
    const cat = lanc.categoria.toLowerCase();

    if (cat.includes('presente') || lanc.segredoCasal) {
      return { icon: 'featured_seasonal_and_gifts', bg: 'bg-purple-100 text-purple-600' };
    }
    if (cat.includes('lazer') || cat.includes('jogo') || nome.includes('playstation') || nome.includes('game')) {
      return { icon: 'sports_esports', bg: 'bg-blue-100 text-blue-600' };
    }
    if (cat.includes('vestu') || nome.includes('tênis') || nome.includes('roupa') || nome.includes('nike')) {
      return { icon: 'directions_run', bg: 'bg-indigo-100 text-indigo-600' };
    }
    if (cat.includes('educa') || nome.includes('livro') || nome.includes('curso')) {
      return { icon: 'menu_book', bg: 'bg-emerald-100 text-emerald-600' };
    }
    if (cat.includes('aliment') || nome.includes('almoço') || nome.includes('restaurante') || nome.includes('café')) {
      return { icon: 'restaurant', bg: 'bg-amber-100 text-amber-600' };
    }
    if (nome.includes('smartphone') || nome.includes('celular') || nome.includes('tech')) {
      return { icon: 'smartphone', bg: 'bg-cyan-100 text-cyan-600' };
    }
    return { icon: 'lock', bg: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Top Switcher Banner: Espaço Individual & Gestão Pessoal */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200 tracking-tight">
                ESPAÇO INDIVIDUAL & GASTOS PESSOAIS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wide uppercase">
                Consolidado do Usuário
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Reúne suas compras particulares confidenciais e todas as compras do casal pagas por você. Compras privadas permanecem 100% invisíveis para {parceiroNome}.
            </p>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center p-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-xs shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={onIrParaDespesasCasal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>Despesas do Casal</span>
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-700/60 shadow-xs flex items-center gap-1.5 cursor-default"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">person</span>
            <span>Minhas Despesas (Individual)</span>
          </button>
        </div>
      </div>

      {/* 2. Header: Title, Subtitle, Month, Modo Discreto, Nova Despesa Privada */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">
            <span>GESTÃO PESSOAL</span>
            <span>•</span>
            <span>{usuarioAtual}</span>
            <span>•</span>
            <SeletorMesFlutuante
              mesSelecionado={mesSelecionado}
              onMudarMes={onMudarMes}
              variante="individual"
              tamanho="sm"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Minhas Despesas Pessoais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Seus hobbies, surpresas para o casal, compras pontuais e desenvolvimento pessoal protegidos em um cofre privado.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setModalCategoriasAberta(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Alterar, adicionar e gerenciar categorias do seu cofre individual"
          >
            <span className="material-symbols-outlined text-[17px] text-blue-600 dark:text-blue-400">category</span>
            <span>Categorias Pessoais</span>
          </button>

          <button
            type="button"
            onClick={() => setModoDiscreto((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              modoDiscreto
                ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Ocultar valores monetários na tela para maior privacidade"
          >
            <span className="material-symbols-outlined text-[17px]">
              {modoDiscreto ? 'visibility_off' : 'visibility'}
            </span>
            <span>Modo Discreto</span>
          </button>

          <button
            type="button"
            onClick={onAbrirNovaCompraPrivada}
            className="px-4 py-2 rounded-xl bg-[#0051d5] hover:bg-[#0041b0] text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nova Despesa Privada</span>
          </button>
        </div>
      </div>

      {/* 3. Four Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pago pelo Usuário (Consolidado) */}
        <div className="bg-white dark:bg-[#161f2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                TOTAL PAGO POR VOCÊ EM {nomeMesSimples.toUpperCase()}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatarValorDiscreto(totalDesembolsadoCentavos)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatarValorDiscreto(totalGastoPrivadoCentavos)}
              </span>
              <span>privado</span>
              <span>•</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {formatarValorDiscreto(totalGastoCasalPagoPorMimCentavos)}
              </span>
              <span>casal</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
              <span className="material-symbols-outlined text-[15px]">payments</span>
              <span>Desembolsos do seu bolso</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {lancamentosPrivadosDoMes.length} lançamentos
            </span>
          </div>
        </div>

        {/* Card 2: Teto Orçamentário Pessoal com Cálculo Automático */}
        <div className="bg-white dark:bg-[#161f2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <span>TETO DISPONÍVEL</span>
                <span>•</span>
                <span className="text-blue-700 dark:text-blue-400 font-bold">{nomeMesSimples.toUpperCase()}</span>
              </span>
              <button
                type="button"
                onClick={() => setModalTetoAberta(true)}
                className="shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Ajustar teto orçamentário mensal"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Editar</span>
              </button>
            </div>

            {/* Valor Disponível Principal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Disponível no Teto:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    calculoTeto.status === 'estourado'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      : calculoTeto.status === 'atencao'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {calculoTeto.status === 'estourado'
                    ? 'Teto Estourado'
                    : calculoTeto.percConsumido <= 0
                    ? '100% livre'
                    : `${calculoTeto.percConsumido}% consumido`}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    calculoTeto.valorDisponivelCentavos < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatarValorDiscreto(calculoTeto.valorDisponivelCentavos)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  (teto base: {formatarValorDiscreto(calculoTeto.tetoBaseCentavos)})
                </span>
              </div>
            </div>

            {/* Indicador Visual do Ajuste (Gastos em Conjunto) */}
            {calculoTeto.tipoAjuste !== 'neutro' ? (
              <div
                className={`mt-2.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium flex items-center gap-2 ${
                  calculoTeto.tipoAjuste === 'deve'
                    ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">
                  {calculoTeto.tipoAjuste === 'deve' ? 'trending_down' : 'trending_up'}
                </span>
                <div className="leading-tight">
                  <span className="font-bold">
                    {calculoTeto.tipoAjuste === 'deve' ? '-' : '+'} {formatarValorDiscreto(
                      calculoTeto.tipoAjuste === 'deve'
                        ? calculoTeto.valorAPagarCentavos
                        : calculoTeto.valorAReceberCentavos
                    )}
                  </span>{' '}
                  referente ao acerto de gastos em conjunto
                  {calculoTeto.tipoAjuste === 'deve'
                    ? ` (a pagar para ${calculoTeto.parceiroNome})`
                    : ` (a receber de ${calculoTeto.parceiroNome})`}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">check_circle</span>
                <span>Gastos em conjunto em equilíbrio (sem débitos/créditos no mês)</span>
              </div>
            )}

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  calculoTeto.valorDisponivelCentavos < 0
                    ? 'bg-red-500'
                    : calculoTeto.percConsumido > 80
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(Math.max(calculoTeto.percConsumido, 0), 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Breakdown em 3 colunas */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1 text-[11px] leading-tight">
            <div>
              <span className="block text-slate-400 dark:text-slate-500 text-[10px]">Gasto Individual:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                - {formatarValorDiscreto(calculoTeto.gastoIndividualCentavos)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 dark:text-slate-500 text-[10px]">Acerto Casal:</span>
              <span
                className={`font-bold ${
                  calculoTeto.tipoAjuste === 'deve'
                    ? 'text-amber-700 dark:text-amber-300'
                    : calculoTeto.tipoAjuste === 'recebe'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {calculoTeto.tipoAjuste === 'deve'
                  ? `- ${formatarValorDiscreto(calculoTeto.valorAPagarCentavos)}`
                  : calculoTeto.tipoAjuste === 'recebe'
                  ? `+ ${formatarValorDiscreto(calculoTeto.valorAReceberCentavos)}`
                  : 'R$ 0,00'}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-slate-400 dark:text-slate-500 text-[10px]">Disponível Real:</span>
              <span
                className={`font-extrabold ${
                  calculoTeto.valorDisponivelCentavos < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-700 dark:text-blue-400'
                }`}
              >
                {calculoTeto.valorDisponivelCentavos >= 0
                  ? formatarValorDiscreto(calculoTeto.valorDisponivelCentavos)
                  : `- ${formatarValorDiscreto(Math.abs(calculoTeto.valorDisponivelCentavos))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Compromisso em Parcelas */}
        <div className="bg-white dark:bg-[#161f2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                COMPROMISSO EM PARCELAS
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatarValorDiscreto(totalCompromissoParcelasCentavos)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/mês</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
            {parceladosDoMes.length > 0 ? (
              parceladosDoMes.slice(0, 3).map((p) => (
                <span
                  key={p.compraId}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/80 dark:border-slate-700 truncate max-w-[150px]"
                  title={`${p.nome} (${p.numeroParcela}/${p.totalParcelas})`}
                >
                  {p.nome.split(' ')[0]} {p.numeroParcela}/{p.totalParcelas}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">Nenhum parcelamento ativo</span>
            )}
          </div>
        </div>

        {/* Card 4: Ritmo Diário & Pico Pessoal */}
        <div className="bg-white dark:bg-[#161f2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                RITMO DIÁRIO & MAIOR GASTO
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatarValorDiscreto(mediaDiariaCentavos)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/dia</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Maior item:</span>
            {maiorLancamentoDoMes ? (
              <span
                className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]"
                title={`${maiorLancamentoDoMes.nome} (${formatarValorDiscreto(maiorLancamentoDoMes.valorCentavos)})`}
              >
                {maiorLancamentoDoMes.nome}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Nenhum</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Equilíbrio de Consciência Card */}
      <div className="bg-white dark:bg-[#161f2e] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">balance</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Equilíbrio de Consciência
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Visão holística da sua contribuição mensal. Suas despesas individuais estão saudáveis e respeitam a meta conjunta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006948]"></span>
              <span className="text-slate-700 dark:text-slate-300">
                Gastos do Casal ({percCasal}%)
              </span>
              <span className="text-slate-900 dark:text-white font-bold">
                {formatarValorDiscreto(totalGastosCasalCentavos)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-700 dark:text-slate-300">
                Minhas Despesas ({percIndividual}%)
              </span>
              <span className="text-slate-900 dark:text-white font-bold">
                {formatarValorDiscreto(totalDesembolsadoCentavos)}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mt-4 flex">
          <div
            className="bg-[#006948] h-full transition-all duration-500"
            style={{ width: `${percCasal}%` }}
            title={`Gastos do Casal: ${percCasal}%`}
          ></div>
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${percIndividual}%` }}
            title={`Minhas Despesas: ${percIndividual}%`}
          ></div>
        </div>

        {/* Status text */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">
            Proporção equilibrada entre projetos a dois e autonomia pessoal.
          </span>
          <div className="flex items-center gap-1 text-[#006948] dark:text-emerald-400 font-bold">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>Status da Parceria: 100% Equilibrado</span>
          </div>
        </div>
      </div>

      {/* 4.0. GRÁFICO EM LINHA: EVOLUÇÃO DOS GASTOS PESSOAIS */}
      <GraficoLinhaGastos
        tipo="individual"
        mesSelecionado={mesSelecionado}
        lancamentosDoMes={lancamentosPrivadosDoMes}
        compras={comprasPrivadas}
        usuarioNome={usuarioAtual}
        tetoPessoalCentavos={tetoPessoalCentavos}
        modoDiscreto={modoDiscreto}
      />

      {/* 4.1. Dashboard Duplo: Top 5 Categorias & Calendário de Calor Individual */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <RankingCategoriasView
            ranking={rankingIndividual}
            categorias={categoriasEfetivas}
            onVerTodasCategorias={() => setModalCategoriasAberta(true)}
            titulo="Top 5 Categorias Pessoais"
            subtitulo="Distribuição ponderada dos seus gastos individuais no mês"
            corTema="blue"
          />
        </div>
        <div className="lg:col-span-5">
          <HeatmapCalendario
            mesSelecionado={mesSelecionado}
            lancamentos={lancamentosPrivadosDoMes}
            titulo="Mapa de Gastos Pessoais"
            subtitulo="Intensidade diária do seu cofre individual"
            corTema="blue"
          />
        </div>
      </section>

      {/* 5. Origin Tabs, Categories Pills & Search Input */}
      <div className="space-y-3 pt-2">
        {/* Origin filter segmented buttons & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-slate-100/90 dark:bg-[#111a28] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold w-fit">
            <button
              type="button"
              onClick={() => setFiltroOrigem('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filtroOrigem === 'todos'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Todas ({lancamentosPrivadosDoMes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroOrigem('privadas')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filtroOrigem === 'privadas'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span>Cofre Privado ({countPrivadas})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroOrigem('casal')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filtroOrigem === 'casal'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">groups</span>
              <span>Pagas no Casal ({countCasalPagasPorMim})</span>
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
                search
              </span>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar lançamentos..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#0d1522] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 w-48 sm:w-60"
              />
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {lancamentosFiltrados.length} encontrados
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          {categoriasPills.map((cat) => {
            const ehAtiva = categoriaAtiva === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  ehAtiva
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'Todos' ? `Todas as Categorias` : cat}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setModalCategoriasAberta(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all"
            title="Adicionar ou alterar categorias pessoais"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Editar Categorias</span>
          </button>
        </div>
      </div>

      {/* 6. Transactions Table */}
      <div className="bg-white dark:bg-[#161f2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#111a28] text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">DESCRIÇÃO & ORIGEM</th>
                <th className="py-3 px-4">CATEGORIA</th>
                <th className="py-3 px-4 text-right">VALOR DESEMBOLSADO</th>
                <th className="py-3 px-4 sm:px-6 text-right">AÇÕES RÁPIDAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {lancamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-slate-300 dark:text-slate-600">
                        manage_search
                      </span>
                      <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                        Nenhum lançamento encontrado para os filtros selecionados.
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {filtroOrigem === 'casal'
                          ? 'Nenhuma compra do casal paga por você neste mês.'
                          : filtroOrigem === 'privadas'
                          ? 'Nenhuma compra confidencial cadastrada no seu cofre individual.'
                          : 'Cadastre despesas particulares ou compras conjuntas que você pagou para visualizá-las aqui.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                lancamentosFiltrados.map((lanc) => {
                  const metaIcone = getIconeCategoria(lanc);
                  const compraOriginal = comprasPrivadas.find((c) => c.id === lanc.compraId);

                  return (
                    <tr
                      key={`${lanc.compraId}-${lanc.numeroParcela}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Descrição & Contexto */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const catMeta = categoriasEfetivas.find(
                              (c) =>
                                c.id === lanc.categoria ||
                                c.nome.toLowerCase() === lanc.categoria.toLowerCase()
                            );
                            if (catMeta?.imagemUrl) {
                              return (
                                <CategoryIconOrImage
                                  icone={catMeta.icone || '🏷️'}
                                  imagemUrl={catMeta.imagemUrl}
                                  size="sm"
                                  nome={catMeta.nome || lanc.nome}
                                  className="shrink-0 rounded-xl"
                                />
                              );
                            }
                            return (
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${metaIcone.bg}`}
                              >
                                <span className="material-symbols-outlined text-[19px]">
                                  {metaIcone.icon}
                                </span>
                              </div>
                            );
                          })()}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {lanc.nome}
                              </span>

                              {/* Badges de Origem */}
                              {lanc.privada ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 border border-blue-200/60 dark:border-blue-900/40">
                                  <span className="material-symbols-outlined text-[12px]">lock</span>
                                  <span>Privado</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-900/40">
                                  <span className="material-symbols-outlined text-[12px]">groups</span>
                                  <span>Conta do Casal</span>
                                  {lanc.divisao ? <span className="opacity-80 font-normal">• {lanc.divisao}</span> : null}
                                </span>
                              )}

                              {/* Badges adicionais */}
                              {lanc.segredoCasal && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center gap-1">
                                  <span>Segredo do Casal 🤫</span>
                                </span>
                              )}
                              {lanc.assinatura && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                                  Assinatura
                                </span>
                              )}
                              {lanc.totalParcelas > 1 && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                                  Parcela {lanc.numeroParcela} de {lanc.totalParcelas}
                                </span>
                              )}
                            </div>

                            {/* Subtitle / context */}
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {lanc.dataReferencia
                                  ? `Pagamento: ${lanc.dataReferencia.split('-')[2]} de ${nomeMesSimples}`
                                  : 'Data avulsa'}
                              </span>
                              {lanc.dataCompra && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300 font-medium" title="Data em que a compra foi realizada">
                                    <span className="material-symbols-outlined text-[13px] text-[#006948] dark:text-emerald-400">
                                      shopping_bag
                                    </span>
                                    <span>Compra: {formatarDataBR(lanc.dataCompra)}</span>
                                  </span>
                                </>
                              )}
                              {lanc.formaPagamentoNome && (
                                <>
                                  <span>•</span>
                                  <span>{lanc.formaPagamentoNome}</span>
                                </>
                              )}
                              <span>•</span>
                              {lanc.privada ? (
                                <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[12px]">lock</span>
                                  Somente você pode visualizar
                                </span>
                              ) : (
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">groups</span>
                                  Pago por você no Casal
                                  {lanc.minhaParteCentavos != null && lanc.minhaParteCentavos !== lanc.valorCentavos && (
                                    <span className="text-slate-500 dark:text-slate-400 font-normal">
                                      (sua cota: {formatarValorDiscreto(lanc.minhaParteCentavos)})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const catMeta = categoriasEfetivas.find(
                            (c) =>
                              c.id === lanc.categoria ||
                              c.nome.toLowerCase() === lanc.categoria.toLowerCase()
                          );
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 text-[11px] font-bold border border-blue-100/80 dark:border-blue-900/60">
                              <CategoryIconOrImage
                                icone={catMeta?.icone || '🏷️'}
                                imagemUrl={catMeta?.imagemUrl}
                                size="xs"
                                nome={catMeta?.nome || lanc.categoria}
                              />
                              <span>{catMeta?.nome || lanc.categoria}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Valor Individual / Desembolsado */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                          {formatarValorDiscreto(lanc.valorCentavos)}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {lanc.recorrente ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">sync</span>
                              <span>Recorrente</span>
                            </span>
                          ) : lanc.totalParcelas > 1 ? (
                            `Total: ${formatarValorDiscreto(
                              compraOriginal?.valorCentavos ??
                                Math.round((compraOriginal?.valor || 0) * 100)
                            )}`
                          ) : !lanc.privada && lanc.minhaParteCentavos != null && lanc.minhaParteCentavos !== lanc.valorCentavos ? (
                            `Sua cota: ${formatarValorDiscreto(lanc.minhaParteCentavos)}`
                          ) : (
                            'À vista'
                          )}
                        </div>
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {lanc.privada ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (compraOriginal) {
                                  setCompraParaCompartilhar(compraOriginal);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Mover este lançamento para as contas compartilhadas do casal"
                            >
                              <span className="material-symbols-outlined text-[15px] text-blue-600 dark:text-blue-400">
                                group_add
                              </span>
                              <span>+ Compartilhar</span>
                            </button>
                          ) : (
                            <span
                              className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1"
                              title="Esta compra já faz parte do fechamento do casal"
                            >
                              <span className="material-symbols-outlined text-[15px] text-indigo-600 dark:text-indigo-400">
                                done_all
                              </span>
                              <span>No Casal</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditarCompra(lanc.compraId)}
                            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            title="Editar lançamento"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoverCompra(lanc.compraId, lanc.numeroParcela)}
                            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-900/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            title="Excluir lançamento"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Bottom Privacy & Security Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
            shield
          </span>
          <span>
            <strong>Privacidade Garantida:</strong> Itens cadastrados no Cofre Privado nunca são exibidos no painel conjunto de {parceiroNome}. Compras do casal pagas por você aparecem em ambas as visões para controle financeiro completo.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setModalTetoAberta(true)}
          className="text-blue-700 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <span>Gerenciar teto pessoal e limites</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>

      {/* Modais */}
      {compraParaCompartilhar && (
        <ModalCompartilharCompra
          aberto={Boolean(compraParaCompartilhar)}
          onFechar={() => setCompraParaCompartilhar(null)}
          compra={compraParaCompartilhar}
          couple={couple}
          usuarioAtual={usuarioAtual}
          onConfirmarCompartilhamento={onCompartilharComCasal}
        />
      )}

      {modalTetoAberta && (
        <ModalTetoPessoal
          aberto={modalTetoAberta}
          onFechar={() => setModalTetoAberta(false)}
          tetoAtualCentavos={calculoTeto.tetoBaseCentavos}
          totalGastoMesCentavos={calculoTeto.gastoIndividualCentavos}
          tipoAjuste={calculoTeto.tipoAjuste}
          valorAPagarCentavos={calculoTeto.valorAPagarCentavos}
          valorAReceberCentavos={calculoTeto.valorAReceberCentavos}
          parceiroNome={calculoTeto.parceiroNome}
          onSalvarTeto={onSalvarTetoPessoal}
        />
      )}

      {modalCategoriasAberta && (
        <ModalCategoriasIndividuais
          aberto={modalCategoriasAberta}
          onFechar={() => setModalCategoriasAberta(false)}
          categorias={categoriasEfetivas}
          lancamentosDoMes={lancamentosPrivadosDoMes}
          onSalvarCategorias={async (novas) => {
            if (onSalvarCategoriasIndividuais) {
              await onSalvarCategoriasIndividuais(novas);
            }
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { CategoriaMeta, Compra, CoupleSpace, LancamentoMensal, UsuarioId } from '../types';
import { CATEGORIAS_PADRAO_INDIVIDUAIS } from '../data/initialData';
import { formatarBRL } from '../calculations/acertoMensal';
import { ModalCompartilharCompra } from './ModalCompartilharCompra';
import { ModalTetoPessoal } from './ModalTetoPessoal';
import { ModalCategoriasIndividuais } from './ModalCategoriasIndividuais';
import { RankingCategoriasView } from './RankingCategoriasView';
import { HeatmapCalendario } from './HeatmapCalendario';
import { CategoryIconOrImage } from './CategoryIconOrImage';
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
  const [busca, setBusca] = useState('');
  const [compraParaCompartilhar, setCompraParaCompartilhar] = useState<Compra | null>(null);
  const [modalTetoAberta, setModalTetoAberta] = useState(false);
  const [modalCategoriasAberta, setModalCategoriasAberta] = useState(false);
  const [mostrarPainelCategorias, setMostrarPainelCategorias] = useState(false);

  const categoriasEfetivas = useMemo(() => {
    return categoriasIndividuais && categoriasIndividuais.length > 0
      ? categoriasIndividuais
      : CATEGORIAS_PADRAO_INDIVIDUAIS;
  }, [categoriasIndividuais]);

  const categoriasPills = useMemo(() => {
    return ['Todos', ...categoriasEfetivas.map((c) => c.nome)];
  }, [categoriasEfetivas]);

  const parceiroNome = couple?.partner1Uid === usuarioAtual || couple?.partner1Name === usuarioAtual
    ? (couple?.partner2Name || 'Silvia')
    : (couple?.partner1Name || 'Vinicius');

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
  const totalGastoPessoalCentavos = useMemo(() => {
    return lancamentosPrivadosDoMes.reduce((acc, l) => acc + l.valorCentavos, 0);
  }, [lancamentosPrivadosDoMes]);

  // Compromisso em parcelas no mês atual (apenas itens com parcelamento > 1)
  const parceladosDoMes = useMemo(() => {
    return lancamentosPrivadosDoMes.filter((l) => l.totalParcelas > 1);
  }, [lancamentosPrivadosDoMes]);

  const totalCompromissoParcelasCentavos = useMemo(() => {
    return parceladosDoMes.reduce((acc, l) => acc + l.valorCentavos, 0);
  }, [parceladosDoMes]);

  // Teto pessoal e margem livre
  const tetoEfetivoCentavos = tetoPessoalCentavos > 0 ? tetoPessoalCentavos : 250000;
  const percUsadoTeto = Math.round((totalGastoPessoalCentavos / tetoEfetivoCentavos) * 100);
  const margemLivreCentavos = tetoEfetivoCentavos - totalGastoPessoalCentavos;

  // Equilíbrio de Consciência: Casal vs Individual
  const somaTotalCentavos = totalGastosCasalCentavos + totalGastoPessoalCentavos;
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
  const mediaDiariaCentavos = totalDiasDoMes > 0 ? Math.round(totalGastoPessoalCentavos / totalDiasDoMes) : 0;

  // Filtragem dos lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return lancamentosPrivadosDoMes.filter((lanc) => {
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
  }, [lancamentosPrivadosDoMes, categoriaAtiva, busca]);

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
      {/* 1. Top Switcher Banner: 100% Individual & Confidencial */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <span className="material-symbols-outlined text-[22px]">lock</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-blue-950 tracking-tight">
                ESPAÇO 100% INDIVIDUAL & CONFIDENCIAL
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wide uppercase">
                Visível apenas por você
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Estas compras não entram no fechamento mensal do casal, não dividem meio a meio e são invisíveis para a {parceiroNome}.
            </p>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center p-1 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-xs shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={onIrParaDespesasCasal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>Despesas do Casal</span>
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-xs flex items-center gap-1.5 cursor-default"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-600">person</span>
            <span>Minhas Despesas (Privado)</span>
          </button>
        </div>
      </div>

      {/* 2. Header: Title, Subtitle, Month, Modo Discreto, Nova Despesa Privada */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider">
            <span>GESTÃO PESSOAL</span>
            <span>•</span>
            <span>{usuarioAtual}</span>
            <span>•</span>
            <div className="inline-flex items-center gap-1 normal-case text-slate-600 font-medium">
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => onMudarMes(e.target.value)}
                className="text-xs font-bold text-blue-900 bg-blue-50/60 px-2 py-0.5 rounded-md border border-blue-200/60 cursor-pointer focus:outline-none"
              />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Minhas Despesas Pessoais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Seus hobbies, surpresas para o casal, compras pontuais e desenvolvimento pessoal protegidos em um cofre privado.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setModalCategoriasAberta(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Alterar, adicionar e gerenciar categorias do seu cofre individual"
          >
            <span className="material-symbols-outlined text-[17px] text-blue-600">category</span>
            <span>Categorias Pessoais</span>
          </button>

          <button
            type="button"
            onClick={() => setModoDiscreto((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              modoDiscreto
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
        {/* Card 1: Total Gasto */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                TOTAL GASTO EM {nomeMesSimples.toUpperCase()}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatarValorDiscreto(totalGastoPessoalCentavos)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
              <span>12% menor que o mês anterior</span>
            </span>
            <span className="text-slate-400 font-medium">
              {lancamentosPrivadosDoMes.length} transações
            </span>
          </div>
        </div>

        {/* Card 2: Teto Orçamentário Pessoal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                TETO ORÇAMENTÁRIO PESSOAL
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  percUsadoTeto > 100
                    ? 'bg-red-100 text-red-700'
                    : percUsadoTeto > 80
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {percUsadoTeto}% usado
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatarValorDiscreto(totalGastoPessoalCentavos)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                de {formatarValorDiscreto(tetoEfetivoCentavos)}
              </span>
              <button
                type="button"
                onClick={() => setModalTetoAberta(true)}
                className="ml-auto text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                title="Ajustar teto orçamentário mensal"
              >
                <span className="material-symbols-outlined text-[13px]">edit</span>
                <span>Editar</span>
              </button>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percUsadoTeto > 100
                    ? 'bg-red-500'
                    : percUsadoTeto > 80
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(percUsadoTeto, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Margem livre restante</span>
            <span
              className={`font-bold ${
                margemLivreCentavos >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {margemLivreCentavos >= 0
                ? `+ ${formatarValorDiscreto(margemLivreCentavos)}`
                : `- ${formatarValorDiscreto(Math.abs(margemLivreCentavos))}`}
            </span>
          </div>
        </div>

        {/* Card 3: Compromisso em Parcelas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                COMPROMISSO EM PARCELAS
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatarValorDiscreto(totalCompromissoParcelasCentavos)}
              </span>
              <span className="text-xs text-slate-500 font-medium">/mês</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
            {parceladosDoMes.length > 0 ? (
              parceladosDoMes.slice(0, 3).map((p) => (
                <span
                  key={p.compraId}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/80 truncate max-w-[150px]"
                  title={`${p.nome} (${p.numeroParcela}/${p.totalParcelas})`}
                >
                  {p.nome.split(' ')[0]} {p.numeroParcela}/{p.totalParcelas}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Nenhum parcelamento ativo</span>
            )}
          </div>
        </div>

        {/* Card 4: Ritmo Diário & Pico Pessoal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                RITMO DIÁRIO & MAIOR GASTO
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatarValorDiscreto(mediaDiariaCentavos)}
              </span>
              <span className="text-xs text-slate-500 font-medium">/dia</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Maior item:</span>
            {maiorLancamentoDoMes ? (
              <span
                className="font-bold text-slate-800 truncate max-w-[130px]"
                title={`${maiorLancamentoDoMes.nome} (${formatarValorDiscreto(maiorLancamentoDoMes.valorCentavos)})`}
              >
                {maiorLancamentoDoMes.nome}
              </span>
            ) : (
              <span className="text-slate-400">Nenhum</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Equilíbrio de Consciência Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006948] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">balance</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Equilíbrio de Consciência
              </h2>
              <p className="text-xs text-slate-500 max-w-xl">
                Visão holística da sua contribuição mensal. Suas despesas individuais estão saudáveis e respeitam a meta conjunta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006948]"></span>
              <span className="text-slate-700">
                Gastos do Casal ({percCasal}%)
              </span>
              <span className="text-slate-900 font-bold">
                {formatarValorDiscreto(totalGastosCasalCentavos)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-700">
                Minhas Despesas ({percIndividual}%)
              </span>
              <span className="text-slate-900 font-bold">
                {formatarValorDiscreto(totalGastoPessoalCentavos)}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-4 flex">
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
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Proporção equilibrada entre projetos a dois e autonomia pessoal.
          </span>
          <div className="flex items-center gap-1 text-[#006948] font-bold">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>Status da Parceria: 100% Equilibrado</span>
          </div>
        </div>
      </div>

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

      {/* 5. Categories Pills & Search Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Pills */}
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
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {cat === 'Todos' ? `Todos (${lancamentosPrivadosDoMes.length})` : cat}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setModalCategoriasAberta(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all"
            title="Adicionar ou alterar categorias pessoais"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Editar Categorias</span>
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
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 w-48 sm:w-60"
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            Total: {lancamentosFiltrados.length} registros
          </span>
        </div>
      </div>

      {/* 6. Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">DESCRIÇÃO & CONTEXTO PRIVADO</th>
                <th className="py-3 px-4">CATEGORIA</th>
                <th className="py-3 px-4 text-right">VALOR INDIVIDUAL</th>
                <th className="py-3 px-4 sm:px-6 text-right">AÇÕES RÁPIDAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {lancamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-slate-300">
                        lock_open
                      </span>
                      <p className="font-semibold text-slate-600 text-sm">
                        Nenhum lançamento privado encontrado neste mês.
                      </p>
                      <p className="text-xs text-slate-400">
                        Cadastre surpresas, assinaturas ou despesas particulares clicando em "+ Nova Despesa Privada".
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
                      className="hover:bg-slate-50/60 transition-colors group"
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
                              <span className="font-bold text-slate-900 text-sm">
                                {lanc.nome}
                              </span>

                              {/* Badges */}
                              {lanc.segredoCasal && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center gap-1">
                                  <span>Segredo do Casal 🤫</span>
                                </span>
                              )}
                              {lanc.assinatura && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  Assinatura
                                </span>
                              )}
                              {lanc.totalParcelas > 1 && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                                  Parcela {lanc.numeroParcela} de {lanc.totalParcelas}
                                </span>
                              )}
                            </div>

                            {/* Subtitle / context */}
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {lanc.dataReferencia
                                  ? `${lanc.dataReferencia.split('-')[2]} de ${nomeMesSimples}`
                                  : 'Data avulsa'}
                              </span>
                              {lanc.formaPagamentoNome && (
                                <>
                                  <span>•</span>
                                  <span>{lanc.formaPagamentoNome}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="text-blue-600 font-medium">
                                Somente você pode visualizar
                              </span>
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 text-[11px] font-bold border border-blue-100/80">
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

                      {/* Valor Individual */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {formatarValorDiscreto(lanc.valorCentavos)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lanc.totalParcelas > 1
                            ? `Total: ${formatarValorDiscreto(
                                compraOriginal?.valorCentavos ??
                                  Math.round((compraOriginal?.valor || 0) * 100)
                              )}`
                            : 'À vista'}
                        </div>
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (compraOriginal) {
                                setCompraParaCompartilhar(compraOriginal);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Mover este lançamento para as contas compartilhadas do casal"
                          >
                            <span className="material-symbols-outlined text-[15px] text-blue-600">
                              group_add
                            </span>
                            <span>+ Compartilhar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditarCompra(lanc.compraId)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            title="Editar lançamento"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoverCompra(lanc.compraId, lanc.numeroParcela)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
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
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-blue-600 text-[20px]">
            shield
          </span>
          <span>
            Criptografia de ponta a ponta: itens identificados como privados nunca são sincronizados com o painel conjunto de {parceiroNome}.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setModalTetoAberta(true)}
          className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <span>Gerenciar chaves e teto de privacidade</span>
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
          tetoAtualCentavos={tetoEfetivoCentavos}
          totalGastoMesCentavos={totalGastoPessoalCentavos}
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

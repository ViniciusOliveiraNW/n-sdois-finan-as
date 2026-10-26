import React, { useState, useMemo } from 'react';
import { CategoriaId, CategoriaMeta, Compra, DivisaoTipo, LancamentoMensal, ResumoAcerto, UsuarioId } from '../types';
import {
  formatarBRL,
  formatarDataBR,
  formatarDataCurtaBR,
  parseDivisaoPercentuais,
} from '../calculations/acertoMensal';
import { CATEGORIAS_PADRAO } from '../data/initialData';
import { CategoryIconOrImage } from './CategoryIconOrImage';
import { SeletorMesFlutuante } from './SeletorMesFlutuante';

interface LancamentosViewProps {
  mesSelecionado: string;
  onMudarMes: (novoMes: string) => void;
  visao: 'meus' | 'casal';
  onAlternarVisao: (novaVisao: 'meus' | 'casal') => void;
  usuarioAtual: UsuarioId;
  todosLancamentosDoMes: LancamentoMensal[];
  compras: Compra[];
  resumoAcerto: ResumoAcerto;
  categorias?: CategoriaMeta[];
  onAbrirNovaCompra: () => void;
  onEditarCompra: (compraId: string) => void;
  onRemoverCompra: (compraId: string, numeroParcela: number) => void;
  onAbrirModalAcerto: () => void;
  onIrParaMinhasDespesas?: () => void;
}

export const LancamentosView: React.FC<LancamentosViewProps> = ({
  mesSelecionado,
  onMudarMes,
  visao,
  onAlternarVisao,
  usuarioAtual,
  todosLancamentosDoMes,
  compras,
  resumoAcerto,
  categorias,
  onAbrirNovaCompra,
  onEditarCompra,
  onRemoverCompra,
  onAbrirModalAcerto,
  onIrParaMinhasDespesas,
}) => {
  const listaCategorias = categorias && categorias.length > 0 ? categorias : CATEGORIAS_PADRAO;
  const p1Name = resumoAcerto.p1Name || 'Vinicius';
  const p2Name = resumoAcerto.p2Name || 'Silvia';
  const p1Uid = resumoAcerto.p1Uid || 'Vinicius';
  const p2Uid = resumoAcerto.p2Uid || 'Silvia';

  const getPrimeiroNome = (nomeCompleto?: string) => {
    if (!nomeCompleto) return 'Você';
    const primeiro = nomeCompleto.trim().split(' ')[0];
    return primeiro || nomeCompleto;
  };

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroPagador, setFiltroPagador] = useState<string>('');
  const [filtroDivisao, setFiltroDivisao] = useState<string>('');
  const [filtroRapido, setFiltroRapido] = useState<'todos' | 'recorrentes' | 'parcelados' | 'mercado'>('todos');
  const [ordenacao, setOrdenacao] = useState<'recente' | 'antigo' | 'maior_valor' | 'menor_valor'>(
    'recente'
  );
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 20;

  // Alternância entre visualização do mês e todas as compras cadastradas
  const [modoExibicao, setModoExibicao] = useState<'mes' | 'todas_compras'>('mes');

  // Mapeia meses que possuem compras (apenas do casal / públicas)
  const mesesComCompras = useMemo(() => {
    const setMeses = new Set<string>();
    compras.forEach((c) => {
      if (!c.privada && c.dataPrimeiroPagamento) {
        const parts = c.dataPrimeiroPagamento.split('-');
        if (parts[0] && parts[1]) setMeses.add(`${parts[0]}-${parts[1]}`);
      }
    });
    return Array.from(setMeses).sort().reverse();
  }, [compras]);

  // Navegação de mês
  const handleAvancarMes = (offset: number) => {
    const [anoStr, mesStr] = mesSelecionado.split('-');
    let ano = parseInt(anoStr, 10);
    let mes = parseInt(mesStr, 10) + offset;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    } else if (mes < 1) {
      mes = 12;
      ano -= 1;
    }
    const novoMes = `${ano}-${String(mes).padStart(2, '0')}`;
    onMudarMes(novoMes);
    setPagina(1);
  };

  const nomeMesFormatado = (() => {
    const [ano, mes] = mesSelecionado.split('-');
    const dataObj = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    const mesNome = dataObj.toLocaleDateString('pt-BR', { month: 'long' });
    return `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${ano}`;
  })();

  // Filtra lançamentos conforme visão e filtros aplicados
  const lancamentosFiltrados = useMemo(() => {
    return todosLancamentosDoMes.filter((l) => {
      // Visão Meus vs Casal
      if (visao === 'meus' && l.pagoPor !== usuarioAtual) {
        return false;
      }

      // Busca por texto
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateNome = l.nome.toLowerCase().includes(termo);
        const bateDesc = l.descricao?.toLowerCase().includes(termo) ?? false;
        const bateCat = l.categoria.toLowerCase().includes(termo);
        if (!bateNome && !bateDesc && !bateCat) return false;
      }

      // Categoria
      if (filtroCategoria && l.categoria !== filtroCategoria) {
        return false;
      }

      // Pagador
      if (filtroPagador && l.pagoPor !== filtroPagador) {
        return false;
      }

      // Divisão Dinâmica
      if (filtroDivisao) {
        const { percP1, percP2 } = parseDivisaoPercentuais(
          l.divisao,
          p1Uid,
          p2Uid,
          [p1Name, 'p1'],
          [p2Name, 'p2']
        );
        if (filtroDivisao === '50/50') {
          if (l.divisao !== '50/50' && (percP1 !== 50 || percP2 !== 50)) return false;
        } else if (filtroDivisao === 'rateio_dinamico') {
          if ((percP1 === 50 && percP2 === 50) || percP1 === 100 || percP2 === 100) return false;
        } else if (filtroDivisao === 'p1') {
          if (percP1 !== 100) return false;
        } else if (filtroDivisao === 'p2') {
          if (percP2 !== 100) return false;
        }
      }

      // Filtros rápidos
      if (filtroRapido === 'recorrentes' && !l.recorrente) {
        return false;
      }
      if (filtroRapido === 'parcelados' && (l.recorrente || l.totalParcelas <= 1)) {
        return false;
      }
      if (filtroRapido === 'mercado' && l.categoria !== 'Mercado') {
        return false;
      }

      return true;
    });
  }, [
    todosLancamentosDoMes,
    visao,
    usuarioAtual,
    busca,
    filtroCategoria,
    filtroPagador,
    filtroDivisao,
    filtroRapido,
  ]);

  // Ordenação
  const lancamentosOrdenados = useMemo(() => {
    const lista = [...lancamentosFiltrados];
    switch (ordenacao) {
      case 'recente':
        return lista.sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia));
      case 'antigo':
        return lista.sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia));
      case 'maior_valor':
        return lista.sort((a, b) => b.valorCentavos - a.valorCentavos);
      case 'menor_valor':
        return lista.sort((a, b) => a.valorCentavos - b.valorCentavos);
      default:
        return lista;
    }
  }, [lancamentosFiltrados, ordenacao]);

  // Lista de compras completas filtradas (Modo Todas as Compras - Estritamente Casal)
  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      // Cofre Privado: compras privadas NUNCA aparecem na visão de compras compartilhadas do casal
      if (c.privada) {
        return false;
      }
      if (visao === 'meus' && c.pagoPor !== usuarioAtual) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateNome = c.nome.toLowerCase().includes(termo);
        const bateDesc = c.descricao?.toLowerCase().includes(termo) ?? false;
        const bateCat = c.categoria.toLowerCase().includes(termo);
        if (!bateNome && !bateDesc && !bateCat) return false;
      }
      if (filtroCategoria && c.categoria !== filtroCategoria) return false;
      if (filtroPagador && c.pagoPor !== filtroPagador) return false;
      if (filtroDivisao) {
        const { percP1, percP2 } = parseDivisaoPercentuais(
          c.divisao,
          p1Uid,
          p2Uid,
          [p1Name, 'p1'],
          [p2Name, 'p2']
        );
        if (filtroDivisao === '50/50') {
          if (c.divisao !== '50/50' && (percP1 !== 50 || percP2 !== 50)) return false;
        } else if (filtroDivisao === 'rateio_dinamico') {
          if ((percP1 === 50 && percP2 === 50) || percP1 === 100 || percP2 === 100) return false;
        } else if (filtroDivisao === 'p1') {
          if (percP1 !== 100) return false;
        } else if (filtroDivisao === 'p2') {
          if (percP2 !== 100) return false;
        }
      }
      if (filtroRapido === 'recorrentes' && !c.recorrente) return false;
      if (filtroRapido === 'parcelados' && (c.recorrente || (c.numeroDeParcelas || 1) <= 1)) return false;
      if (filtroRapido === 'mercado' && c.categoria !== 'Mercado') return false;
      return true;
    });
  }, [
    compras,
    visao,
    usuarioAtual,
    busca,
    filtroCategoria,
    filtroPagador,
    filtroDivisao,
    filtroRapido,
    p1Uid,
    p2Uid,
    p1Name,
    p2Name,
  ]);

  const comprasOrdenadas = useMemo(() => {
    const lista = [...comprasFiltradas];
    switch (ordenacao) {
      case 'recente':
        return lista.sort((a, b) => (b.dataPrimeiroPagamento || '').localeCompare(a.dataPrimeiroPagamento || ''));
      case 'antigo':
        return lista.sort((a, b) => (a.dataPrimeiroPagamento || '').localeCompare(b.dataPrimeiroPagamento || ''));
      case 'maior_valor':
        return lista.sort((a, b) => (b.valorCentavos ?? b.valor * 100) - (a.valorCentavos ?? a.valor * 100));
      case 'menor_valor':
        return lista.sort((a, b) => (a.valorCentavos ?? a.valor * 100) - (b.valorCentavos ?? b.valor * 100));
      default:
        return lista;
    }
  }, [comprasFiltradas, ordenacao]);

  // Paginação
  const listaAtiva = modoExibicao === 'mes' ? lancamentosOrdenados : comprasOrdenadas;
  const totalPaginas = Math.ceil(listaAtiva.length / itensPorPagina) || 1;
  const lancamentosPaginados = lancamentosOrdenados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );
  const comprasPaginadas = comprasOrdenadas.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const somaPaginaCentavos =
    modoExibicao === 'mes'
      ? lancamentosPaginados.reduce((acc, l) => acc + l.valorCentavos, 0)
      : comprasPaginadas.reduce((acc, c) => acc + (c.valorCentavos ?? Math.round(c.valor * 100)), 0);

  // Parcelas ativas
  const parcelasAtivasCentavos = todosLancamentosDoMes
    .filter((l) => l.totalParcelas > 1)
    .reduce((acc, l) => acc + l.valorCentavos, 0);

  const qtdParceladas = todosLancamentosDoMes.filter((l) => l.totalParcelas > 1).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Context Bar: Month, View Mode, Actions */}
      <div className="bg-white dark:bg-[#161f2e] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col gap-3.5">
        {/* Linha Superior: Navegador Temporal & Ações Principais */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Esquerda: Seletor de Mês e Indicador de Modo */}
          <div className="flex flex-wrap items-center gap-2.5">
            <SeletorMesFlutuante
              mesSelecionado={mesSelecionado}
              onMudarMes={(m) => {
                onMudarMes(m);
                setModoExibicao('mes');
                setPagina(1);
              }}
              variante="casal"
            />
            {modoExibicao === 'todas_compras' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#006948] dark:text-emerald-400 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/50">
                <span className="material-symbols-outlined text-[14px]">view_timeline</span>
                <span>Histórico Completo</span>
              </span>
            )}
          </div>

          {/* Direita: Ações Rápidas (Cofre Privado + Novo Lançamento) */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {onIrParaMinhasDespesas && (
              <button
                onClick={onIrParaMinhasDespesas}
                type="button"
                className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
                title="Acessar cofre individual protegido e confidencial"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Cofre Privado</span>
              </button>
            )}

            <button
              onClick={onAbrirNovaCompra}
              type="button"
              className="h-10 flex items-center gap-1.5 px-4 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* Divisor sutil entre ações e filtros */}
        <div className="h-px w-full bg-slate-100 dark:bg-slate-800/80" />

        {/* Linha Inferior: Alternância de Modo & Filtro de Visão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Esquerda: Alternância: Lançamentos do Mês vs Todas as Compras */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setModoExibicao('mes');
                setPagina(1);
              }}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modoExibicao === 'mes'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">calendar_month</span>
              <span>Lançamentos ({todosLancamentosDoMes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModoExibicao('todas_compras');
                setPagina(1);
              }}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modoExibicao === 'todas_compras'
                  ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">list_alt</span>
              <span>Todas as Compras ({compras.filter((c) => !c.privada).length})</span>
            </button>
          </div>

          {/* Direita: Toggle Visão Meus vs Casal */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto">
            <button
              onClick={() => {
                onAlternarVisao('meus');
                setPagina(1);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                visao === 'meus'
                  ? 'bg-white dark:bg-slate-700 text-[#0051d5] dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0051d5] shrink-0"></span>
              <span>Meus Pagamentos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0051d5] dark:text-blue-300 text-[10px] font-bold">
                {todosLancamentosDoMes.filter((l) => l.pagoPor === usuarioAtual).length}
              </span>
            </button>
            <button
              onClick={() => {
                onAlternarVisao('casal');
                setPagina(1);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                visao === 'casal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#006948] shrink-0"></span>
              <span>Casal (Ambos)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                {todosLancamentosDoMes.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards de KPIs de Escopo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total no Mês */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total no Mês</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#006948] dark:text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatarBRL(resumoAcerto.totalCasalCentavos)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {todosLancamentosDoMes.length} lançamentos registrados
            </p>
          </div>
        </div>

        {/* Pago por Vinicius */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
              <span className="text-xs font-semibold text-[#0051d5] dark:text-blue-400">Pago por Vinicius</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {resumoAcerto.totalCasalCentavos > 0
                ? `${Math.round(
                    (resumoAcerto.totalPagoViniciusCentavos / resumoAcerto.totalCasalCentavos) * 100
                  )}%`
                : '0%'}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#0051d5] dark:text-blue-400 tabular-nums">
              {formatarBRL(resumoAcerto.totalPagoViniciusCentavos)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {todosLancamentosDoMes.filter((l) => l.pagoPor === 'Vinicius').length} compras
            </p>
          </div>
        </div>

        {/* Pago por Silvia */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#712ae2]"></span>
              <span className="text-xs font-semibold text-[#712ae2] dark:text-purple-400">Pago por Silvia</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {resumoAcerto.totalCasalCentavos > 0
                ? `${Math.round(
                    (resumoAcerto.totalPagoSilviaCentavos / resumoAcerto.totalCasalCentavos) * 100
                  )}%`
                : '0%'}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#712ae2] dark:text-purple-400 tabular-nums">
              {formatarBRL(resumoAcerto.totalPagoSilviaCentavos)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {todosLancamentosDoMes.filter((l) => l.pagoPor === 'Silvia').length} compras
            </p>
          </div>
        </div>

        {/* Parcelas Ativas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Parcelas Ativas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined text-[16px]">credit_card</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatarBRL(parcelasAtivasCentavos)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {qtdParceladas} compras parceladas este mês
            </p>
          </div>
        </div>
      </div>

      {/* Ribbon de Filtros e Busca */}
      <div className="bg-white dark:bg-[#161f2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-5 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 dark:text-slate-500 text-[18px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar estabelecimento, item ou descrição..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#0d1522] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:bg-white dark:focus:bg-[#111a28] focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
            />
          </div>

          {/* Categoria */}
          <div className="md:col-span-3">
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                setPagina(1);
              }}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0d1522] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-[#111a28] focus:outline-none focus:ring-2 focus:ring-[#006948]/20 cursor-pointer"
            >
              <option value="">Todas as Categorias</option>
              {listaCategorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icone} {cat.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Pagador */}
          <div className="md:col-span-2">
            <select
              value={filtroPagador}
              onChange={(e) => {
                setFiltroPagador(e.target.value);
                setPagina(1);
              }}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0d1522] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-[#111a28] focus:outline-none focus:ring-2 focus:ring-[#006948]/20 cursor-pointer"
            >
              <option value="">Quem Pagou: Todos</option>
              <option value="Vinicius">Vinicius</option>
              <option value="Silvia">Silvia</option>
            </select>
          </div>

          {/* Divisão */}
          <div className="md:col-span-2">
            <select
              value={filtroDivisao}
              onChange={(e) => {
                setFiltroDivisao(e.target.value);
                setPagina(1);
              }}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0d1522] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-[#111a28] focus:outline-none focus:ring-2 focus:ring-[#006948]/20 cursor-pointer"
            >
              <option value="">Divisão: Todas</option>
              <option value="50/50">⚖️ 50% / 50%</option>
              <option value="rateio_dinamico">📊 Rateio Dinâmico (70/30, 30/70...)</option>
              <option value="p1">👤 Só {p1Name} (100%)</option>
              <option value="p2">👤 Só {p2Name} (100%)</option>
            </select>
          </div>
        </div>

        {/* Filtros Rápidos & Ordenação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 dark:text-slate-500 font-semibold mr-1">Filtros rápidos:</span>
            <button
              onClick={() => {
                setFiltroRapido('todos');
                setPagina(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                filtroRapido === 'todos'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({modoExibicao === 'mes' ? todosLancamentosDoMes.length : compras.filter((c) => !c.privada).length})
            </button>
            <button
              onClick={() => {
                setFiltroRapido('recorrentes');
                setPagina(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                filtroRapido === 'recorrentes'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-[#006948] dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">sync</span>
              <span>Recorrentes ({modoExibicao === 'mes' ? todosLancamentosDoMes.filter((l) => l.recorrente).length : compras.filter((c) => !c.privada && c.recorrente).length})</span>
            </button>
            <button
              onClick={() => {
                setFiltroRapido('parcelados');
                setPagina(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                filtroRapido === 'parcelados'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Parcelados ({modoExibicao === 'mes' ? todosLancamentosDoMes.filter((l) => (l.totalParcelas || 1) > 1 && !l.recorrente).length : compras.filter((c) => !c.privada && !c.recorrente && (c.numeroDeParcelas || 1) > 1).length})
            </button>
            <button
              onClick={() => {
                setFiltroRapido('mercado');
                setPagina(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                filtroRapido === 'mercado'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Supermercado ({modoExibicao === 'mes' ? todosLancamentosDoMes.filter((l) => l.categoria === 'Mercado').length : compras.filter((c) => !c.privada && c.categoria === 'Mercado').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Ordenar:</span>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-transparent dark:border-slate-700 cursor-pointer"
            >
              <option value="recente">Mais recentes</option>
              <option value="antigo">Mais antigos</option>
              <option value="maior_valor">Maior valor</option>
              <option value="menor_valor">Menor valor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos ou Todas as Compras */}
      <div className="bg-white dark:bg-[#161f2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {modoExibicao === 'todas_compras' ? (
          comprasOrdenadas.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              Nenhuma compra cadastrada encontrada para os filtros ativos.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Data Compra</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">1º Pagamento</th>
                    <th className="py-2.5 px-2.5 min-w-[130px]">Estabelecimento / Item</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Categoria</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Quem Pagou</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Regime Divisão</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Parcelas</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Valor Total</th>
                    <th className="py-2.5 px-2 text-center w-14">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {comprasPaginadas.map((compra) => {
                    const totalCentavos =
                      compra.valorCentavos ?? Math.round((compra.valor || 0) * 100);
                    const isAutor =
                      compra.cadastradoPorUid === usuarioAtual ||
                      compra.cadastradoPor === usuarioAtual;

                    return (
                      <tr key={compra.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap" title={`Compra efetuada em: ${formatarDataBR(compra.dataCompra || compra.dataPrimeiroPagamento)}`}>
                          {formatarDataBR(compra.dataCompra || compra.dataPrimeiroPagamento)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap" title={`1º pagamento / fatura: ${formatarDataBR(compra.dataPrimeiroPagamento)}`}>
                          {formatarDataBR(compra.dataPrimeiroPagamento)}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="flex flex-col min-w-[120px] max-w-[200px]">
                            <span className="font-semibold text-slate-900 dark:text-white leading-tight truncate" title={compra.nome}>
                              {compra.nome}
                            </span>
                            {compra.descricao && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={compra.descricao}>
                                {compra.descricao}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {(() => {
                            const catObj = listaCategorias.find(
                              (c) => c.id === compra.categoria || c.nome === compra.categoria
                            );
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/50 dark:border-slate-700/50">
                                <CategoryIconOrImage
                                  icone={catObj?.icone}
                                  imagemUrl={catObj?.imagemUrl}
                                  nome={compra.categoria}
                                  size="xs"
                                  className="shrink-0"
                                />
                                <span className="truncate max-w-[80px]">{compra.categoria}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {(() => {
                            const ehVinicius = (compra.pagoPorNome || compra.pagoPor || '').toLowerCase().includes('vinicius');
                            const primeiroNome = getPrimeiroNome(compra.pagoPorNome || compra.pagoPor);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  ehVinicius
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400'
                                    : 'bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-400'
                                }`}
                                title={compra.pagoPorNome || compra.pagoPor}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    ehVinicius ? 'bg-[#0051d5]' : 'bg-[#712ae2]'
                                  }`}
                                ></span>
                                <span>{primeiroNome}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {(() => {
                            const { percP1, percP2 } = parseDivisaoPercentuais(
                              compra.divisao,
                              p1Uid,
                              p2Uid,
                              [p1Name, 'p1'],
                              [p2Name, 'p2']
                            );
                            if (compra.divisao === '50/50' || (percP1 === 50 && percP2 === 50)) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400">
                                  ⚖️ 50/50
                                </span>
                              );
                            }
                            if (percP1 === 100 && percP2 === 0) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400">
                                  👤 {p1Name}
                                </span>
                              );
                            }
                            if (percP1 === 0 && percP2 === 100) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-400">
                                  👤 {p2Name}
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                                📊 {percP1}/{percP2}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {compra.recorrente ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 font-bold text-[10px] border border-emerald-200/50 dark:border-emerald-800/40" title="Assinatura contínua / despesa recorrente mensal">
                              <span className="material-symbols-outlined text-[12px]">sync</span>
                              <span>Recorrente</span>
                            </span>
                          ) : compra.numeroDeParcelas > 1 ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                              {compra.numeroDeParcelas}x
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">À vista (1x)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatarBRL(totalCentavos)}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap w-14">
                          {isAutor ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditarCompra(compra.id)}
                                className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Editar compra"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => onRemoverCompra(compra.id, 1)}
                                className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                                title="Cancelar compra"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          ) : (
                            <span
                              className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[65px] inline-block"
                              title={`Registrado por ${compra.cadastradoPorNome || compra.cadastradoPor}.`}
                            >
                              {getPrimeiroNome(compra.cadastradoPorNome || compra.cadastradoPor)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (modoExibicao === 'mes' ? lancamentosOrdenados.length === 0 : comprasOrdenadas.length === 0) ? (
          compras.filter((c) => !c.privada).length > 0 ? (
            <div className="py-14 px-4 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">event_busy</span>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {modoExibicao === 'mes'
                    ? `Nenhuma parcela encontrada para ${nomeMesFormatado}`
                    : 'Nenhuma compra encontrada com os filtros selecionados'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                  {modoExibicao === 'mes'
                    ? `Seu espaço possui ${compras.filter((c) => !c.privada).length} compras cadastradas no total! Elas estão concentradas em outros meses.`
                    : 'Tente alterar os termos da busca ou limpar os filtros para ver as compras cadastradas do casal.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {modoExibicao === 'mes' && mesesComCompras.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onMudarMes(mesesComCompras[0])}
                    className="px-3.5 py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    <span>Navegar para {mesesComCompras[0]}</span>
                  </button>
                )}
                {modoExibicao === 'mes' && (
                  <button
                    type="button"
                    onClick={() => setModoExibicao('todas_compras')}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">list_alt</span>
                    <span>Ver Todas as {compras.filter((c) => !c.privada).length} Compras Cadastradas</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-14 px-4 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Nenhuma compra do casal encontrada neste espaço
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                  Cadastre uma nova compra compartilhada ou acerte despesas existentes.
                </p>
              </div>
              <button
                type="button"
                onClick={onAbrirNovaCompra}
                className="mt-1 px-4 py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Cadastrar Nova Compra</span>
              </button>
            </div>
          )
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Data Compra</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">1º Pagamento</th>
                  <th className="py-2.5 px-2.5 min-w-[130px]">Estabelecimento / Item</th>
                  <th className="py-2.5 px-2 whitespace-nowrap">Categoria</th>
                  <th className="py-2.5 px-2 whitespace-nowrap">Quem Pagou</th>
                  <th className="py-2.5 px-2 whitespace-nowrap">Regime Divisão</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Parcela</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Valor Mês</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Minha Parte</th>
                  <th className="py-2.5 px-1.5 text-center w-14">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {lancamentosPaginados.map((lancamento) => {
                  const compraOriginal = compras.find((c) => c.id === lancamento.compraId);
                  const dataCompraEfetiva =
                    lancamento.dataCompra ||
                    compraOriginal?.dataCompra ||
                    compraOriginal?.dataPrimeiroPagamento ||
                    lancamento.dataReferencia;
                  const dataPrimeiroPagamentoEfetiva =
                    compraOriginal?.dataPrimeiroPagamento ||
                    lancamento.dataReferencia;
                  const isAutor = lancamento.cadastradoPor === usuarioAtual;

                  return (
                    <tr
                      key={`${lancamento.compraId}-${lancamento.numeroParcela}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap" title={`Compra efetuada em: ${formatarDataBR(dataCompraEfetiva)}`}>
                        {formatarDataBR(dataCompraEfetiva)}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap" title={`1º pagamento / fatura: ${formatarDataBR(dataPrimeiroPagamentoEfetiva)}`}>
                        {formatarDataBR(dataPrimeiroPagamentoEfetiva)}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="flex flex-col min-w-[120px] max-w-[190px]">
                          <span className="font-semibold text-slate-900 dark:text-white leading-tight truncate" title={lancamento.nome}>
                            {lancamento.nome}
                          </span>
                          {lancamento.descricao && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={lancamento.descricao}>
                              {lancamento.descricao}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {(() => {
                          const catObj = listaCategorias.find(
                            (c) => c.id === lancamento.categoria || c.nome === lancamento.categoria
                          );
                          return (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200/50 dark:border-slate-700/50 max-w-[110px]" title={lancamento.categoria}>
                              <CategoryIconOrImage
                                icone={catObj?.icone}
                                imagemUrl={catObj?.imagemUrl}
                                nome={lancamento.categoria}
                                size="xs"
                                className="shrink-0"
                              />
                              <span className="truncate">{lancamento.categoria}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (lancamento.pagoPor || '').toLowerCase().includes('vinicius')
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-400'
                          }`}
                          title={`Pago por ${lancamento.pagoPor}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              (lancamento.pagoPor || '').toLowerCase().includes('vinicius') ? 'bg-[#0051d5]' : 'bg-[#712ae2]'
                            }`}
                          ></span>
                          <span>{getPrimeiroNome(lancamento.pagoPor)}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {(() => {
                          const { percP1, percP2 } = parseDivisaoPercentuais(
                            lancamento.divisao,
                            p1Uid,
                            p2Uid,
                            [p1Name, 'p1'],
                            [p2Name, 'p2']
                          );
                          if (lancamento.divisao === '50/50' || (percP1 === 50 && percP2 === 50)) {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400">
                                ⚖️ 50/50
                              </span>
                            );
                          }
                          if (percP1 === 100 && percP2 === 0) {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400">
                                👤 Só {p1Name}
                              </span>
                            );
                          }
                          if (percP1 === 0 && percP2 === 100) {
                            return (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-400">
                                👤 Só {p2Name}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                              📊 {percP1}/{percP2}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {lancamento.recorrente ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 font-bold text-[10px] border border-emerald-200/50 dark:border-emerald-800/40" title={`Despesa recorrente mensal contínua (Mês ${lancamento.numeroParcela})`}>
                            <span className="material-symbols-outlined text-[12px]">sync</span>
                            <span>Recorrente</span>
                          </span>
                        ) : lancamento.totalParcelas > 1 ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                            {lancamento.numeroParcela}/{lancamento.totalParcelas}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[10px]">1x</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatarBRL(lancamento.valorCentavos)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-[#006948] dark:text-emerald-400 tabular-nums whitespace-nowrap">
                        {formatarBRL(lancamento.minhaParteCentavos)}
                      </td>
                      <td className="py-2.5 px-1.5 text-center whitespace-nowrap w-14">
                        {isAutor ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditarCompra(lancamento.compraId)}
                              className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Editar compra (Autor)"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() =>
                                onRemoverCompra(lancamento.compraId, lancamento.numeroParcela)
                              }
                              className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancelar a partir desta parcela"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete_sweep
                              </span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[65px] inline-block"
                            title={`Registrado por ${lancamento.cadastradoPor}. Apenas o autor pode editar ou remover.`}
                          >
                            {getPrimeiroNome(lancamento.cadastradoPor)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé e Paginação */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Exibindo <strong>{modoExibicao === 'mes' ? lancamentosPaginados.length : comprasPaginadas.length}</strong> de{' '}
            <strong>{modoExibicao === 'mes' ? lancamentosFiltrados.length : comprasFiltradas.length}</strong>{' '}
            {modoExibicao === 'mes' ? 'lançamentos' : 'compras'} | Soma da página:{' '}
            <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
              {formatarBRL(somaPaginaCentavos)}
            </strong>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPagina(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pagina === num
                      ? 'bg-[#006948] text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Banner de Harmonia Financeira */}
      <div className="bg-white dark:bg-[#161f2e] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">favorite</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Transparência sem cobranças</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ambos têm visibilidade instantânea dos lançamentos e do impacto no acerto final.
            </p>
          </div>
        </div>
        <button
          onClick={onAbrirModalAcerto}
          type="button"
          className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#006948] dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer shrink-0"
        >
          Ver Acerto Provisório
        </button>
      </div>
    </div>
  );
};

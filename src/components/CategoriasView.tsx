import React, { useState } from 'react';
import { CategoriaId, CategoriaMeta, CoupleSpace, LancamentoMensal } from '../types';
import { CATEGORIAS_PADRAO } from '../data/initialData';
import { formatarBRL } from '../calculations/acertoMensal';
import { CategoryIconOrImage } from './CategoryIconOrImage';

interface CategoriasViewProps {
  mesSelecionado: string;
  lancamentosDoMes: LancamentoMensal[];
  categorias?: CategoriaMeta[];
  couple?: CoupleSpace | null;
  onSalvarCategorias?: (novasCategorias: CategoriaMeta[]) => Promise<void> | void;
}

const EMOJIS_SUGERIDOS = [
  '🛒', '💧', '⚡', '🏠', '🥖', '💊', '🛍️', '🛡️',
  '📦', '🍽️', '🚗', '✈️', '🎮', '🐾', '📚', '💡',
  '🩺', '🏋️', '📶', '🧹'
];

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  mesSelecionado,
  lancamentosDoMes,
  categorias: categoriasProps,
  couple,
  onSalvarCategorias,
}) => {
  // Se categoriasProps for fornecido, usa-o; caso contrário, usa estado interno com CATEGORIAS_PADRAO
  const [categoriasLocais, setCategoriasLocais] = useState<CategoriaMeta[]>(CATEGORIAS_PADRAO);
  const categorias = categoriasProps && categoriasProps.length > 0 ? categoriasProps : categoriasLocais;

  const p1Nome = couple?.partner1Name || 'Vinicius';
  const p2Nome = couple?.partner2Name || 'Silvia';

  // Modais de Criação e Edição
  const [modalNovaAberta, setModalNovaAberta] = useState(false);
  const [modalEditarAberta, setModalEditarAberta] = useState(false);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<CategoriaMeta | null>(null);

  // Estados dos formulários
  const [icone, setIcone] = useState('🏷️');
  const [imagemUrl, setImagemUrl] = useState('');
  const [nome, setNome] = useState('');
  const [tetoInput, setTetoInput] = useState('');
  const [descricao, setDescricao] = useState('');
  const [divisaoPadrao, setDivisaoPadrao] = useState('50% / 50%');
  const [isFixo, setIsFixo] = useState(false);

  // Filtro de visualização
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'fixos' | 'variaveis'>('todos');

  // Calcula gastos reais por categoria no mês atual
  const gastosPorCategoria: Partial<Record<CategoriaId, number>> = {};
  const pagadoresPorCategoria: Partial<
    Record<CategoriaId, { p1Centavos: number; p2Centavos: number; count: number }>
  > = {};

  for (const l of lancamentosDoMes) {
    gastosPorCategoria[l.categoria] =
      (gastosPorCategoria[l.categoria] ?? 0) + l.valorCentavos;

    if (!pagadoresPorCategoria[l.categoria]) {
      pagadoresPorCategoria[l.categoria] = {
        p1Centavos: 0,
        p2Centavos: 0,
        count: 0,
      };
    }
    const info = pagadoresPorCategoria[l.categoria]!;
    info.count += 1;
    const pagouP1 =
      l.pagoPorUid === couple?.partner1Uid ||
      l.pagoPor === p1Nome ||
      l.cadastradoPor === p1Nome;

    if (pagouP1) {
      info.p1Centavos += l.valorCentavos;
    } else {
      info.p2Centavos += l.valorCentavos;
    }
  }

  // Métricas Consolidadas
  const tetoGeralCentavos = categorias.reduce((acc, c) => acc + c.tetoEstimadoCentavos, 0);
  const gastoConsolidadoCentavos = lancamentosDoMes.reduce((acc, l) => acc + l.valorCentavos, 0);
  const margemRestanteCentavos = Math.max(0, tetoGeralCentavos - gastoConsolidadoCentavos);
  const percentualConsumido =
    tetoGeralCentavos > 0
      ? Number(((gastoConsolidadoCentavos / tetoGeralCentavos) * 100).toFixed(1))
      : 0;

  // Categorias extrapoladas
  const extrapoladas = categorias.filter((c) => {
    const gasto = gastosPorCategoria[c.id] ?? 0;
    return gasto > c.tetoEstimadoCentavos;
  });

  const categoriasFiltradas = categorias.filter((c) => {
    if (filtroTipo === 'fixos') return c.isFixo;
    if (filtroTipo === 'variaveis') return !c.isFixo;
    return true;
  });

  const categoriasFixas = categorias.filter((c) => c.isFixo);
  const reservaCat = categorias.find((c) => c.id === 'Reserva de Emergência' || c.nome.toLowerCase().includes('emergência'));

  // Helpers para salvar
  const persistirCategorias = (novas: CategoriaMeta[]) => {
    setCategoriasLocais(novas);
    if (onSalvarCategorias) {
      onSalvarCategorias(novas);
    }
  };

  // Alterna o status Fixo de uma categoria diretamente pelo card
  const handleToggleFixo = (categoriaId: string) => {
    const novas = categorias.map((c) => {
      if (c.id === categoriaId) {
        return { ...c, isFixo: !c.isFixo };
      }
      return c;
    });
    persistirCategorias(novas);
  };

  // Abre o modal de edição para uma categoria existente
  const abrirModalEditar = (cat: CategoriaMeta) => {
    setCategoriaEmEdicao(cat);
    setIcone(cat.icone);
    setImagemUrl(cat.imagemUrl || '');
    setNome(cat.nome);
    setTetoInput((cat.tetoEstimadoCentavos / 100).toFixed(2).replace('.', ','));
    setDescricao(cat.descricao || '');
    setDivisaoPadrao(cat.divisaoPadrao || '50% / 50%');
    setIsFixo(Boolean(cat.isFixo));
    setModalEditarAberta(true);
  };

  // Abre o modal para nova categoria
  const abrirModalNova = () => {
    setIcone('🏷️');
    setImagemUrl('');
    setNome('');
    setTetoInput('400,00');
    setDescricao('');
    setDivisaoPadrao('50% / 50%');
    setIsFixo(false);
    setModalNovaAberta(true);
  };

  // Salvar Edição de Categoria Existente
  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaEmEdicao || !nome.trim()) return;

    const valorLimpo = tetoInput.replace(/\./g, '').replace(',', '.');
    const tetoNum = parseFloat(valorLimpo) || 0;
    const tetoCentavos = Math.max(0, Math.round(tetoNum * 100));

    const novas = categorias.map((c) => {
      if (c.id === categoriaEmEdicao.id) {
        return {
          ...c,
          nome: nome.trim(),
          icone: icone.trim() || '🏷️',
          imagemUrl: imagemUrl.trim() || undefined,
          tetoEstimadoCentavos: tetoCentavos,
          descricao: descricao.trim() || 'Categoria personalizada do casal',
          divisaoPadrao,
          isFixo,
        };
      }
      return c;
    });

    persistirCategorias(novas);
    setModalEditarAberta(false);
    setCategoriaEmEdicao(null);
  };

  // Salvar Criação de Nova Categoria
  const handleSalvarNova = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const valorLimpo = tetoInput.replace(/\./g, '').replace(',', '.');
    const tetoNum = parseFloat(valorLimpo) || 400;
    const tetoCentavos = Math.max(0, Math.round(tetoNum * 100));

    const novoNome = nome.trim();
    // Gera ID único
    const novoId = novoNome as CategoriaId;

    const novaCat: CategoriaMeta = {
      id: novoId,
      nome: novoNome,
      icone: icone.trim() || '🏷️',
      imagemUrl: imagemUrl.trim() || undefined,
      tetoEstimadoCentavos: tetoCentavos,
      divisaoPadrao,
      descricao: descricao.trim() || 'Categoria personalizada do casal',
      isFixo,
    };

    persistirCategorias([...categorias, novaCat]);
    setModalNovaAberta(false);
  };

  // Remover Categoria com confirmação
  const handleRemoverCategoria = (cat: CategoriaMeta) => {
    if (!confirm(`Deseja realmente excluir a categoria "${cat.nome}"? Esta ação removerá sua meta de teto orçamentário.`)) {
      return;
    }
    const novas = categorias.filter((c) => c.id !== cat.id);
    persistirCategorias(novas);
    if (categoriaEmEdicao?.id === cat.id) {
      setModalEditarAberta(false);
      setCategoriaEmEdicao(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar / Context & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006948]"></span>
              Ciclo Atual: {mesSelecionado}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {categorias.length} categorias cadastradas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Categorias & Metas Orçamentárias
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Personalize os tetos de gastos, defina despesas fixas ou variáveis e configure o acompanhamento financeiro de {p1Nome} e {p2Nome}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos os Tetos ({categorias.length})
            </button>
            <button
              onClick={() => setFiltroTipo('fixos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === 'fixos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fixos do Casal ({categoriasFixas.length})
            </button>
            <button
              onClick={() => setFiltroTipo('variaveis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === 'variaveis'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Variáveis ({categorias.length - categoriasFixas.length})
            </button>
          </div>

          <button
            onClick={abrirModalNova}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* Summary Metas Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Teto Geral Estimado
            </span>
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[18px]">
              account_balance_wallet
            </span>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {formatarBRL(tetoGeralCentavos)}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Soma dos limites de todas as categorias</span>
        </div>

        <div className="bg-white dark:bg-[#161f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Gasto Consolidado
            </span>
            <span className="material-symbols-outlined text-[#006948] dark:text-emerald-400 text-[18px]">trending_up</span>
          </div>
          <span className="text-2xl font-extrabold text-[#006948] dark:text-emerald-400 tabular-nums">
            {formatarBRL(gastoConsolidadoCentavos)}
          </span>
          <span className="text-[11px] text-[#006948] dark:text-emerald-400 font-semibold">
            {percentualConsumido}% do orçamento total consumido
          </span>
        </div>

        <div className="bg-white dark:bg-[#161f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Margem Restante</span>
            <span className="material-symbols-outlined text-[#0051d5] dark:text-blue-400 text-[18px]">savings</span>
          </div>
          <span className="text-2xl font-extrabold text-[#0051d5] dark:text-blue-400 tabular-nums">
            {formatarBRL(margemRestanteCentavos)}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Ainda disponível p/ gastos no mês</span>
        </div>

        <div className="bg-white dark:bg-[#161f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Atenção & Desvios</span>
            <span className="material-symbols-outlined text-red-500 text-[18px]">warning</span>
          </div>
          <span className="text-2xl font-extrabold text-red-600 dark:text-red-400 tabular-nums">
            {extrapoladas.length} {extrapoladas.length === 1 ? 'Categoria' : 'Categorias'}
          </span>
          <span className="text-[11px] text-red-600 dark:text-red-400 font-medium truncate">
            {extrapoladas.length > 0
              ? `${extrapoladas.map((c) => c.nome).join(', ')} extrapolou`
              : 'Nenhum teto extrapolado'}
          </span>
        </div>
      </div>

      {/* Grid com os Cards das Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categoriasFiltradas.map((cat) => {
          const gastoAtualCentavos = gastosPorCategoria[cat.id] ?? 0;
          const info = pagadoresPorCategoria[cat.id];
          const totalCat = info ? info.p1Centavos + info.p2Centavos : 0;
          const percP1 =
            totalCat > 0 ? Math.round((info!.p1Centavos / totalCat) * 100) : 50;
          const percP2 = 100 - percP1;

          const proporcaoTeto =
            cat.tetoEstimadoCentavos > 0
              ? Number(((gastoAtualCentavos / cat.tetoEstimadoCentavos) * 100).toFixed(1))
              : 0;

          const estourou = gastoAtualCentavos > cat.tetoEstimadoCentavos;

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-[#161f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow group relative"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CategoryIconOrImage
                      icone={cat.icone}
                      imagemUrl={cat.imagemUrl}
                      nome={cat.nome}
                      size="lg"
                      className="group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          {cat.nome}
                        </h3>
                        {cat.imagemUrl && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800"
                            title="Imagem personalizada via CDN ativa"
                          >
                            <span className="material-symbols-outlined text-[11px]">image</span>
                            <span>CDN</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">{cat.descricao}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        estourou
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center gap-0.5'
                          : proporcaoTeto > 85
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400'
                      }`}
                    >
                      {estourou && (
                        <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
                      )}
                      {proporcaoTeto}%
                    </span>

                    {/* Botão Editar Rápido */}
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(cat)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#006948]/10 text-slate-500 dark:text-slate-400 hover:text-[#006948] dark:hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Editar categoria e teto"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                  </div>
                </div>

                {/* Spending numbers */}
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Gasto Atual</span>
                    <span
                      className={`text-lg font-extrabold tabular-nums ${
                        estourou ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatarBRL(gastoAtualCentavos)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Teto Estimado</span>
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(cat)}
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#006948] dark:hover:text-emerald-400 tabular-nums hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                      title="Clique para alterar este teto"
                    >
                      <span>{formatarBRL(cat.tetoEstimadoCentavos)}</span>
                      <span className="material-symbols-outlined text-[12px] opacity-60">edit</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      estourou ? 'bg-red-500' : proporcaoTeto > 85 ? 'bg-amber-500' : 'bg-[#006948]'
                    }`}
                    style={{ width: `${Math.min(100, proporcaoTeto)}%` }}
                  ></div>
                </div>

                {/* Details: Pagadores & Divisão */}
                <div className="pt-1 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Pagadores no mês:</span>
                    {totalCat > 0 ? (
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-[#0051d5] dark:text-blue-400">{p1Nome} ({percP1}%)</span>
                        <span className="text-[#712ae2] dark:text-purple-400">{p2Nome} ({percP2}%)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">Sem registros</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Divisão sugerida:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                      {cat.divisaoPadrao}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Lançamentos & Interativo Toggle Fixo */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-slate-400 dark:text-slate-500">receipt_long</span>
                  <span>{info?.count || 0} Lançamentos</span>
                </span>

                {/* Interactive Fixo Badge / Button */}
                <button
                  type="button"
                  onClick={() => handleToggleFixo(cat.id)}
                  title={
                    cat.isFixo
                      ? 'Despesa Fixa ativa. Clique para alterar para variável.'
                      : 'Despesa Variável. Clique para fixar no orçamento mensal.'
                  }
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    cat.isFixo
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 hover:bg-blue-100 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {cat.isFixo ? 'push_pin' : 'repeat'}
                  </span>
                  <span>{cat.isFixo ? 'Despesa Fixa' : 'Variável'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regras de Divisão Automática & Gestão de Despesas Fixas */}
      {/* Regras de Divisão Automática & Gestão de Despesas Fixas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Regras do Casal */}
        <div className="lg:col-span-7 bg-white dark:bg-[#161f2e] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">balance</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Regras de Divisão Automática
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">Configurações para agilizar o fechamento do casal</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            {/* Bloco 1: Despesas Fixas Dinâmicas */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#006948] dark:text-emerald-400 text-[18px] mt-0.5 shrink-0">
                check_circle
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 dark:text-white">
                    Despesas Fixas Compartilhadas ({categoriasFixas.length})
                  </strong>
                  <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400 font-semibold text-[10px]">
                    Automático 50/50
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {categoriasFixas.length > 0 ? (
                    <>
                      <strong className="text-slate-900 dark:text-white">{categoriasFixas.map((c) => c.nome).join(', ')}</strong> estão
                      definidas como fixas e possuem prioridade na divisão 50/50 no acerto mensal,
                      independentemente de quem tenha passado o cartão inicialmente.
                    </>
                  ) : (
                    <>
                      Nenhuma categoria está marcada como fixa no momento. Você pode clicar no botão{' '}
                      <strong className="text-slate-900 dark:text-white">"Variável"</strong> de qualquer categoria acima para transformá-la em fixa.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Bloco 2: Alimentação & Mercado */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#0051d5] dark:text-blue-400 text-[18px] mt-0.5 shrink-0">
                pie_chart
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block mb-0.5">Alimentação & Consumo Compartilhado</strong>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Mercado e Padaria</strong> adotam a sugestão padrão de 50/50, permitindo
                  ajuste para 100% pessoal em itens de consumo exclusivo de {p1Nome} ou {p2Nome}.
                </p>
              </div>
            </div>

            {/* Bloco 3: Reserva de Emergência Oficial */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/60 flex items-start gap-3">
              <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[18px] mt-0.5 shrink-0">
                shield
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 dark:text-white">Reserva de Emergência</strong>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                    {reservaCat ? `Teto: ${formatarBRL(reservaCat.tetoEstimadoCentavos)}` : 'Ativa no App'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Disponível para seleção em <strong className="text-slate-900 dark:text-white">"Nova Compra"</strong> para registrar aportes, consertos inesperados da casa ou despesas veterinárias/médicas urgentes, garantindo equalização equilibrada 50/50.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Gestão e Dicas */}
        <div className="lg:col-span-5 bg-white dark:bg-[#161f2e] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006948] dark:bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-[#006948] dark:text-emerald-400">
                  Sincronização em Tempo Real
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono">
                {couple?.id ? 'Nuvem Conectada' : 'Modo Offline'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Metas Orçamentárias Personalizadas
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Todos os tetos e categorias editados são salvos automaticamente no Espaço do Casal e
              ficam disponíveis imediatamente para {p1Nome} e {p2Nome} ao cadastrar novas compras.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">tips_and_updates</span>
                <span>Como configurar seus tetos:</span>
              </div>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 text-[11px] leading-relaxed">
                <li>Clique no ícone de lápis ou no valor do teto para editar.</li>
                <li>Marque categorias essenciais como <strong className="text-slate-900 dark:text-white">Despesa Fixa</strong> para filtrar com rapidez.</li>
                <li>Selecione <strong className="text-slate-900 dark:text-white">"Reserva de Emergência"</strong> em imprevistos pontuais.</li>
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Equilíbrio Financeiro a Dois</span>
            <span className="text-[#006948] dark:text-emerald-400 font-bold">NósDois Finanças</span>
          </div>
        </div>
      </div>

      {/* Modal Editar Categoria Existente */}
      {modalEditarAberta && categoriaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161f2e] w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Categoria & Teto</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ajuste os parâmetros orçamentários</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalEditarAberta(false);
                  setCategoriaEmEdicao(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-4 text-xs">
              <div className="flex gap-3">
                <div className="w-20 flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Ícone</label>
                  <input
                    type="text"
                    value={icone}
                    onChange={(e) => setIcone(e.target.value)}
                    maxLength={2}
                    className="h-10 text-center text-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Nome da Categoria</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              {/* Emoji Quick Picker */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Sugestões de Ícones (Emoji):</span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  {EMOJIS_SUGERIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcone(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer ${
                        icone === emoji ? 'bg-white dark:bg-slate-700 shadow-sm ring-2 ring-[#006948] dark:ring-emerald-400' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Imagem Personalizada via CDN */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">cloud_upload</span>
                    <span>Imagem da Categoria (Link da sua CDN)</span>
                  </label>
                  {imagemUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setImagemUrl('')}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remover Imagem
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <CategoryIconOrImage
                    icone={icone}
                    imagemUrl={imagemUrl}
                    nome={nome || 'Prévia'}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <input
                      type="url"
                      value={imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      placeholder="https://sua-cdn.com/categorias/mercado.png"
                      className="h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#006948]/20 dark:focus:ring-emerald-500/30 w-full"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {imagemUrl.trim()
                        ? 'Exibindo imagem da sua CDN (o emoji acima é o fallback se a imagem falhar).'
                        : 'Cole o link direto da imagem hospedada na sua CDN. Ela substituirá o emoji nas telas.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Teto Estimado Mensal */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Teto Mensal Estimado (R$)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-semibold">R$</span>
                  <input
                    type="text"
                    value={tetoInput}
                    onChange={(e) => setTetoInput(e.target.value)}
                    placeholder="500,00"
                    className="w-full h-10 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold tabular-nums focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Ajustes rápidos:</span>
                  {[50, 100, 250, 500].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => {
                        const atual = parseFloat(tetoInput.replace(/\./g, '').replace(',', '.')) || 0;
                        setTetoInput((atual + delta).toFixed(2).replace('.', ','));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                    >
                      +{delta}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Descrição / O que entra aqui</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Contas fixas, despensa do mês, medicamentos..."
                  className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                />
              </div>

              {/* Divisão Sugerida */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Divisão Padrão Recomendada</label>
                  <span className="text-[11px] font-bold text-[#006948] dark:text-emerald-400">
                    Atual: {divisaoPadrao}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: '50/50', label: '50 / 50' },
                    { id: '70/30', label: '70 / 30' },
                    { id: '30/70', label: '30 / 70' },
                    { id: '60/40', label: '60 / 40' },
                    { id: '40/60', label: '40 / 60' },
                    { id: '100/0', label: `100 / 0 (Só ${p1Nome})` },
                    { id: '0/100', label: `0 / 100 (Só ${p2Nome})` },
                  ].map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => setDivisaoPadrao(opcao.id)}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-semibold cursor-pointer transition-all ${
                        divisaoPadrao === opcao.id ||
                        divisaoPadrao === opcao.label ||
                        (opcao.id === '100/0' && (divisaoPadrao === `Só ${p1Nome}` || divisaoPadrao === '100/0')) ||
                        (opcao.id === '0/100' && (divisaoPadrao === `Só ${p2Nome}` || divisaoPadrao === '0/100'))
                          ? 'bg-[#006948] text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Despesa Fixa */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFixo ? 'bg-blue-100 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">push_pin</span>
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white block text-xs">Definir como Despesa Fixa do Casal</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Priorizada no fechamento mensal com rateio padrão 50/50
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isFixo}
                  onChange={(e) => setIsFixo(e.target.checked)}
                  className="w-5 h-5 text-[#006948] rounded focus:ring-[#006948] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleRemoverCategoria(categoriaEmEdicao)}
                  className="px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Excluir</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalEditarAberta(false);
                      setCategoriaEmEdicao(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#006948] text-white hover:bg-[#005137] font-semibold shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {modalNovaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161f2e] w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">category</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Adicionar Nova Categoria</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Defina o nome, ícone, teto e se é fixa</span>
                </div>
              </div>
              <button
                onClick={() => setModalNovaAberta(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSalvarNova} className="flex flex-col gap-4 text-xs">
              <div className="flex gap-3">
                <div className="w-20 flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Ícone</label>
                  <input
                    type="text"
                    value={icone}
                    onChange={(e) => setIcone(e.target.value)}
                    maxLength={2}
                    className="h-10 text-center text-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Nome da Categoria</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Assinaturas / Lazer / Internet"
                    className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                    required
                  />
                </div>
              </div>

              {/* Emoji Quick Picker */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Sugestões de Ícones (Emoji):</span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  {EMOJIS_SUGERIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcone(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer ${
                        icone === emoji ? 'bg-white dark:bg-slate-700 shadow-sm ring-2 ring-[#006948] dark:ring-emerald-400' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Imagem Personalizada via CDN */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">cloud_upload</span>
                    <span>Imagem da Categoria (Link da sua CDN)</span>
                  </label>
                  {imagemUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setImagemUrl('')}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remover Imagem
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <CategoryIconOrImage
                    icone={icone}
                    imagemUrl={imagemUrl}
                    nome={nome || 'Prévia'}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <input
                      type="url"
                      value={imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      placeholder="https://sua-cdn.com/categorias/internet.png"
                      className="h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#006948]/20 dark:focus:ring-emerald-500/30 w-full"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {imagemUrl.trim()
                        ? 'Exibindo imagem da sua CDN (o emoji acima é o fallback se a imagem falhar).'
                        : 'Cole o link direto da imagem hospedada na sua CDN. Ela substituirá o emoji nas telas.'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Teto Mensal Sugerido (R$)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-semibold">R$</span>
                  <input
                    type="text"
                    value={tetoInput}
                    onChange={(e) => setTetoInput(e.target.value)}
                    placeholder="400,00"
                    className="w-full h-10 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold tabular-nums focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Descrição / Finalidade</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Serviços de streaming, internet residencial..."
                  className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Divisão Padrão Recomendada</label>
                  <span className="text-[11px] font-bold text-[#006948] dark:text-emerald-400">
                    Atual: {divisaoPadrao}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: '50/50', label: '50 / 50' },
                    { id: '70/30', label: '70 / 30' },
                    { id: '30/70', label: '30 / 70' },
                    { id: '60/40', label: '60 / 40' },
                    { id: '40/60', label: '40 / 60' },
                    { id: '100/0', label: `100 / 0 (Só ${p1Nome})` },
                    { id: '0/100', label: `0 / 100 (Só ${p2Nome})` },
                  ].map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => setDivisaoPadrao(opcao.id)}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-semibold cursor-pointer transition-all ${
                        divisaoPadrao === opcao.id ||
                        divisaoPadrao === opcao.label ||
                        (opcao.id === '100/0' && (divisaoPadrao === `Só ${p1Nome}` || divisaoPadrao === '100/0')) ||
                        (opcao.id === '0/100' && (divisaoPadrao === `Só ${p2Nome}` || divisaoPadrao === '0/100'))
                          ? 'bg-[#006948] text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Despesa Fixa */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFixo ? 'bg-blue-100 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">push_pin</span>
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white block text-xs">Definir como Despesa Fixa do Casal</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Priorizada no fechamento mensal com rateio proporcional do casal
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isFixo}
                  onChange={(e) => setIsFixo(e.target.checked)}
                  className="w-5 h-5 text-[#006948] rounded focus:ring-[#006948] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovaAberta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#006948] text-white hover:bg-[#005137] font-semibold shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Salvar Categoria</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

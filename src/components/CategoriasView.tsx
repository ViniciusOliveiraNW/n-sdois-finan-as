import React, { useState } from 'react';
import { CategoriaId, CategoriaMeta, LancamentoMensal } from '../types';
import { CATEGORIAS_PADRAO } from '../data/initialData';
import { formatarBRL } from '../calculations/acertoMensal';

interface CategoriasViewProps {
  mesSelecionado: string;
  lancamentosDoMes: LancamentoMensal[];
}

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  mesSelecionado,
  lancamentosDoMes,
}) => {
  const [categorias, setCategorias] = useState<CategoriaMeta[]>(CATEGORIAS_PADRAO);
  const [modalAberta, setModalAberta] = useState(false);
  const [icone, setIcone] = useState('🏷️');
  const [nome, setNome] = useState('');
  const [tetoInput, setTetoInput] = useState('');
  const [divisaoPadrao, setDivisaoPadrao] = useState('50% / 50%');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'fixos' | 'variaveis'>('todos');

  // Calcula gastos reais por categoria no mês atual
  const gastosPorCategoria: Partial<Record<CategoriaId, number>> = {};
  const pagadoresPorCategoria: Partial<
    Record<CategoriaId, { viniciusCentavos: number; silviaCentavos: number; count: number }>
  > = {};

  for (const l of lancamentosDoMes) {
    gastosPorCategoria[l.categoria] =
      (gastosPorCategoria[l.categoria] ?? 0) + l.valorCentavos;

    if (!pagadoresPorCategoria[l.categoria]) {
      pagadoresPorCategoria[l.categoria] = {
        viniciusCentavos: 0,
        silviaCentavos: 0,
        count: 0,
      };
    }
    const info = pagadoresPorCategoria[l.categoria]!;
    info.count += 1;
    if (l.pagoPor === 'Vinicius') {
      info.viniciusCentavos += l.valorCentavos;
    } else {
      info.silviaCentavos += l.valorCentavos;
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

  const handleSalvarCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const tetoNum = parseFloat(tetoInput.replace(',', '.')) || 500;
    const novaCat: CategoriaMeta = {
      id: nome.trim() as CategoriaId,
      nome: nome.trim(),
      icone: icone || '🏷️',
      tetoEstimadoCentavos: Math.round(tetoNum * 100),
      divisaoPadrao,
      descricao: 'Categoria personalizada do casal',
      isFixo: false,
    };

    setCategorias((prev) => [...prev, novaCat]);
    setModalAberta(false);
    setNome('');
    setTetoInput('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar / Context & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006948]"></span>
              Ciclo Atual: {mesSelecionado}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {categorias.length} categorias cadastradas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Categorias & Metas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Gerencie as categorias oficiais do casal, acompanhe o teto estimado e a divisão
            histórica de despesas com transparência e harmonia.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos os Tetos
            </button>
            <button
              onClick={() => setFiltroTipo('fixos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === 'fixos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fixos do Casal
            </button>
            <button
              onClick={() => setFiltroTipo('variaveis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === 'variaveis'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Variáveis
            </button>
          </div>

          <button
            onClick={() => setModalAberta(true)}
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Teto Geral Estimado
            </span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              account_balance_wallet
            </span>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatarBRL(tetoGeralCentavos)}
          </span>
          <span className="text-[11px] text-slate-400">Soma dos limites mensais</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Gasto Consolidado
            </span>
            <span className="material-symbols-outlined text-[#006948] text-[18px]">trending_up</span>
          </div>
          <span className="text-2xl font-extrabold text-[#006948] tabular-nums">
            {formatarBRL(gastoConsolidadoCentavos)}
          </span>
          <span className="text-[11px] text-[#006948] font-semibold">
            {percentualConsumido}% do orçamento consumido
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Margem Restante</span>
            <span className="material-symbols-outlined text-[#0051d5] text-[18px]">savings</span>
          </div>
          <span className="text-2xl font-extrabold text-[#0051d5] tabular-nums">
            {formatarBRL(margemRestanteCentavos)}
          </span>
          <span className="text-[11px] text-slate-400">Ainda disponível p/ o mês</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Atenção & Desvios</span>
            <span className="material-symbols-outlined text-red-500 text-[18px]">warning</span>
          </div>
          <span className="text-2xl font-extrabold text-red-600 tabular-nums">
            {extrapoladas.length} {extrapoladas.length === 1 ? 'Categoria' : 'Categorias'}
          </span>
          <span className="text-[11px] text-red-600 font-medium">
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
          const totalCat = info ? info.viniciusCentavos + info.silviaCentavos : 0;
          const percV =
            totalCat > 0 ? Math.round((info!.viniciusCentavos / totalCat) * 100) : 50;
          const percS = 100 - percV;

          const proporcaoTeto =
            cat.tetoEstimadoCentavos > 0
              ? Number(((gastoAtualCentavos / cat.tetoEstimadoCentavos) * 100).toFixed(1))
              : 0;

          const estourou = gastoAtualCentavos > cat.tetoEstimadoCentavos;

          return (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                      {cat.icone}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {cat.nome}
                      </h3>
                      <span className="text-xs text-slate-400">{cat.descricao}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      estourou
                        ? 'bg-red-100 text-red-700 flex items-center gap-0.5'
                        : proporcaoTeto > 85
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-[#006948]'
                    }`}
                  >
                    {estourou && <span className="material-symbols-outlined text-[13px]">arrow_upward</span>}
                    {proporcaoTeto}%
                  </span>
                </div>

                {/* Spending numbers */}
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Gasto Atual</span>
                    <span
                      className={`text-lg font-extrabold tabular-nums ${
                        estourou ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatarBRL(gastoAtualCentavos)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Teto Estimado</span>
                    <span className="text-xs font-bold text-slate-600 tabular-nums">
                      {formatarBRL(cat.tetoEstimadoCentavos)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      estourou ? 'bg-red-500' : proporcaoTeto > 85 ? 'bg-amber-500' : 'bg-[#006948]'
                    }`}
                    style={{ width: `${Math.min(100, proporcaoTeto)}%` }}
                  ></div>
                </div>

                {/* Details: Pagadores & Divisão */}
                <div className="pt-1 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Pagadores no mês:</span>
                    {totalCat > 0 ? (
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-[#0051d5]">Vinicius ({percV}%)</span>
                        <span className="text-[#712ae2]">Silvia ({percS}%)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sem registros</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Divisão sugerida:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {cat.divisaoPadrao}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                  <span>{info?.count || 0} Lançamentos</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {cat.isFixo ? 'Despesa Fixa' : 'Variável'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regras de Divisão Automática & Developer Notes / Firestore Schema */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Regras do Casal */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006948] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">balance</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Regras de Divisão Automática
              </h3>
              <span className="text-xs text-slate-400">Configurações para agilizar o casal</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#006948] text-[18px] mt-0.5">
                check_circle
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">
                  Despesas Fixas Compartilhadas
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Aluguel, Luz e Água</strong> são categorizados automaticamente como{' '}
                  <strong>50/50</strong> no fechamento, independentemente de quem efetue o
                  pagamento inicial.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#0051d5] text-[18px] mt-0.5">
                pie_chart
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">Alimentação & Mercado</strong>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Mercado e Padaria</strong> adotam a sugestão padrão de 50/50, permitindo
                  ajuste manual em compras que incluam itens estritamente pessoais de Vinicius ou
                  Silvia.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#712ae2] text-[18px] mt-0.5">
                lock_reset
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">Reserva de Emergência</strong>
                <p className="text-slate-600 leading-relaxed">
                  Aportes ou saques nesta categoria exigem validação prévia de ambos no app para
                  compor o acerto final do ciclo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Notes / Firestore Schema para Vinicius */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5] animate-pulse"></span>
                <span className="text-xs font-bold text-[#0051d5]">
                  Developer Notes • Firestore
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                coleção: `categories`
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Estrutura de dados documentada para Vinicius implementar os hooks e queries no Firebase
              Firestore com tipagem estrita no TypeScript.
            </p>

            {/* Mock Document Payload */}
            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto">
              <div className="text-slate-500">// Schema Firestore Document</div>
              <div>&#123;</div>
              <div className="pl-3">
                <span className="text-emerald-400">"id"</span>: <span className="text-blue-300">"mercado"</span>,
              </div>
              <div className="pl-3">
                <span className="text-emerald-400">"nome"</span>: <span className="text-amber-200">"Mercado"</span>,
              </div>
              <div className="pl-3">
                <span className="text-emerald-400">"icone"</span>: <span className="text-amber-200">"🛒"</span>,
              </div>
              <div className="pl-3">
                <span className="text-emerald-400">"tetoEstimadoCentavos"</span>: <span className="text-purple-300">280000</span>,
              </div>
              <div className="pl-3">
                <span className="text-emerald-400">"divisaoPadrao"</span>: <span className="text-blue-300">"50/50"</span>,
              </div>
              <div className="pl-3">
                <span className="text-emerald-400">"isFixo"</span>: <span className="text-red-400">false</span>,
              </div>
              <div className="pl-3">
                <span className="text-emerald-400">"ativo"</span>: <span className="text-emerald-400">true</span>
              </div>
              <div>&#125;</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Preparado para Firebase SDK v10.x</span>
            <span className="text-[#0051d5] font-semibold">Regras Seguras RBAC</span>
          </div>
        </div>
      </div>

      {/* Modal Nova Categoria */}
      {modalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006948] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">category</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Adicionar Categoria</h3>
                  <span className="text-xs text-slate-500">Defina o nome, emoji e teto mensal</span>
                </div>
              </div>
              <button
                onClick={() => setModalAberta(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSalvarCategoria} className="flex flex-col gap-4 text-xs">
              <div className="flex gap-3">
                <div className="w-16 flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700">Ícone</label>
                  <input
                    type="text"
                    value={icone}
                    onChange={(e) => setIcone(e.target.value)}
                    maxLength={2}
                    className="h-10 text-center text-lg bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700">Nome da Categoria</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Assinaturas / Lazer"
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Teto Mensal Sugerido (R$)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-semibold">R$</span>
                  <input
                    type="text"
                    value={tetoInput}
                    onChange={(e) => setTetoInput(e.target.value)}
                    placeholder="400,00"
                    className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Divisão Padrão Recomendada</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDivisaoPadrao('50% / 50%')}
                    className={`py-2 rounded-xl text-center font-semibold cursor-pointer transition-all ${
                      divisaoPadrao === '50% / 50%'
                        ? 'bg-[#006948] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    50% / 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDivisaoPadrao('Só Vinicius')}
                    className={`py-2 rounded-xl text-center font-semibold cursor-pointer transition-all ${
                      divisaoPadrao === 'Só Vinicius'
                        ? 'bg-[#0051d5] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Só Vinicius
                  </button>
                  <button
                    type="button"
                    onClick={() => setDivisaoPadrao('Só Silvia')}
                    className={`py-2 rounded-xl text-center font-semibold cursor-pointer transition-all ${
                      divisaoPadrao === 'Só Silvia'
                        ? 'bg-[#712ae2] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Só Silvia
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#006948] text-white hover:bg-[#005137] font-semibold shadow-sm cursor-pointer"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

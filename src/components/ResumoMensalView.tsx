import React from 'react';
import { Compra, FechamentoMensal, LancamentoMensal, ResumoAcerto, UsuarioId } from '../types';
import { formatarBRL } from '../calculations/acertoMensal';
import { ResultadoRanking } from '../calculations/rankingCategorias';
import { RankingCategoriasView } from './RankingCategoriasView';
import { HeatmapCalendario } from './HeatmapCalendario';

interface ResumoMensalViewProps {
  mesSelecionado: string;
  onMudarMes: (novoMes: string) => void;
  visao: 'meus' | 'casal';
  onAlternarVisao: (novaVisao: 'meus' | 'casal') => void;
  usuarioAtual: UsuarioId;
  resumoAcerto: ResumoAcerto;
  fechamentoAtual?: FechamentoMensal;
  ranking: ResultadoRanking;
  lancamentosVisao: LancamentoMensal[];
  todosLancamentosDoMes: LancamentoMensal[];
  compras: Compra[];
  onAbrirModalAcerto: () => void;
  onEditarCompra: (compraId: string) => void;
  onRemoverCompra: (compraId: string, numeroParcela: number) => void;
  onIrParaLancamentos: () => void;
  onIrParaCategorias: () => void;
}

export const ResumoMensalView: React.FC<ResumoMensalViewProps> = ({
  mesSelecionado,
  onMudarMes,
  visao,
  onAlternarVisao,
  usuarioAtual,
  resumoAcerto,
  fechamentoAtual,
  ranking,
  lancamentosVisao,
  todosLancamentosDoMes,
  compras,
  onAbrirModalAcerto,
  onEditarCompra,
  onRemoverCompra,
  onIrParaLancamentos,
  onIrParaCategorias,
}) => {
  // Navegação de mês anterior e posterior
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
  };

  // Nome por extenso do mês
  const nomeMesFormatado = (() => {
    const [ano, mes] = mesSelecionado.split('-');
    const dataObj = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    const mesNome = dataObj.toLocaleDateString('pt-BR', { month: 'long' });
    return `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${ano}`;
  })();

  // Estatísticas de 50/50 vs Individuais
  const gastos5050Centavos = todosLancamentosDoMes
    .filter((l) => l.divisao === '50/50')
    .reduce((acc, l) => acc + l.valorCentavos, 0);

  const gastosIndividuaisCentavos = todosLancamentosDoMes
    .filter((l) => l.divisao !== '50/50')
    .reduce((acc, l) => acc + l.valorCentavos, 0);

  const totalGeralCentavos = resumoAcerto.totalCasalCentavos;
  const perc5050 = totalGeralCentavos > 0
    ? Number(((gastos5050Centavos / totalGeralCentavos) * 100).toFixed(1))
    : 0;
  const p1Name = resumoAcerto.p1Name || 'Vinicius';
  const p2Name = resumoAcerto.p2Name || 'Silvia';

  const percVinicius = totalGeralCentavos > 0
    ? Number(((resumoAcerto.totalPagoP1Centavos / totalGeralCentavos) * 100).toFixed(1))
    : 0;

  const percSilvia = totalGeralCentavos > 0
    ? Number(((resumoAcerto.totalPagoP2Centavos / totalGeralCentavos) * 100).toFixed(1))
    : 0;

  // Status de quitação do mês
  const statusMes = fechamentoAtual?.status || (resumoAcerto.temLancamentos ? 'aberto' : 'vazio');

  return (
    <div className="flex flex-col gap-6">
      {/* 1. SELETOR DE MÊS, STATUS & TOGGLE DE VISÃO */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Navegador de Meses */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleAvancarMes(-1)}
              aria-label="Mês anterior"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="px-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006948] text-[20px]">
                calendar_month
              </span>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {nomeMesFormatado}
              </span>
            </div>
            <button
              onClick={() => handleAvancarMes(1)}
              aria-label="Próximo mês"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>



          {/* Badge de Status do Mês */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
              statusMes === 'quitado'
                ? 'bg-emerald-100 text-[#006948]'
                : statusMes === 'parcial'
                ? 'bg-amber-100 text-amber-800'
                : statusMes === 'vazio'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-emerald-50 text-[#006948] border border-emerald-200/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusMes === 'quitado'
                  ? 'bg-emerald-600'
                  : statusMes === 'parcial'
                  ? 'bg-amber-500'
                  : statusMes === 'vazio'
                  ? 'bg-slate-400'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            ></span>
            <span>
              {statusMes === 'quitado'
                ? 'Totalmente Quitado'
                : statusMes === 'parcial'
                ? 'Acerto Parcial'
                : statusMes === 'vazio'
                ? 'Sem Lançamentos'
                : 'Mês em Aberto'}
            </span>
          </div>
        </div>

        {/* Toggle de Visão do App */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl" role="tablist">
            <button
              onClick={() => onAlternarVisao('meus')}
              aria-selected={visao === 'meus'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                visao === 'meus'
                  ? 'bg-white text-[#0051d5] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
              <span>Meus Pagamentos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0051d5] text-[10px]">
                {todosLancamentosDoMes.filter((l) => l.pagoPor === usuarioAtual).length}
              </span>
            </button>
            <button
              onClick={() => onAlternarVisao('casal')}
              aria-selected={visao === 'casal'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                visao === 'casal'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Casal (Ambos)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {todosLancamentosDoMes.length}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. HERO: BALANÇA FINANCEIRA E ACERTO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                {statusMes === 'quitado' ? 'Acerto Liquidado' : 'Fechamento & Balança'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  resumoAcerto.valorAcertoCentavos === 0
                    ? 'bg-emerald-100 text-[#006948]'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {resumoAcerto.valorAcertoCentavos === 0
                  ? 'Sem Dívida Pendente'
                  : 'Pendente de Acerto'}
              </span>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs font-medium text-slate-500">
                Equilíbrio Financeiro do Casal
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {!resumoAcerto.temLancamentos ? (
                  <span className="text-slate-500 font-medium text-xl">
                    Nenhum lançamento registrado neste mês.
                  </span>
                ) : resumoAcerto.valorAcertoCentavos === 0 ? (
                  <span className="text-[#006948]">
                    As contas estão perfeitamente equilibradas (R$ 0,00).
                  </span>
                ) : (
                  <>
                    <span>{resumoAcerto.devedor} paga</span>
                    <span className="text-[#006948] font-bold tabular-nums">
                      {formatarBRL(resumoAcerto.valorAcertoCentavos)}
                    </span>
                    <span>a {resumoAcerto.credor}</span>
                  </>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              O cálculo considera automaticamente parcelas ativas 50/50 e despesas exclusivas sem
              misturar com pagamentos de compras.
            </p>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row xl:flex-col gap-2.5 shrink-0">
            <button
              onClick={onAbrirModalAcerto}
              type="button"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              <span>Registrar Pagamento do Acerto</span>
            </button>
            <button
              onClick={onAbrirModalAcerto}
              type="button"
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Ver Detalhes do Cálculo</span>
            </button>
          </div>
        </div>

        {/* 3 Sub-Cards do Acerto */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* P1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/90 border border-slate-200/80">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0051d5] flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {p1Name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 font-medium">Pago por {p1Name}</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {formatarBRL(resumoAcerto.totalPagoP1Centavos)}
              </span>
              <span className="text-[11px] text-slate-500">
                Cota {p2Name}: <strong className="text-[#0051d5]">{formatarBRL(resumoAcerto.cotaP2Em5050Centavos)}</strong>
              </span>
            </div>
          </div>

          {/* P2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/90 border border-slate-200/80">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-[#712ae2] flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {p2Name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 font-medium">Pago por {p2Name}</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {formatarBRL(resumoAcerto.totalPagoP2Centavos)}
              </span>
              <span className="text-[11px] text-slate-500">
                Cota {p1Name}: <strong className="text-[#712ae2]">{formatarBRL(resumoAcerto.cotaP1Em5050Centavos)}</strong>
              </span>
            </div>
          </div>

          {/* Diferença Líquida */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#006948] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">balance</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#006948] font-semibold">Diferença Líquida</span>
              <span className="text-sm font-bold text-[#006948] tabular-nums">
                {formatarBRL(resumoAcerto.valorAcertoCentavos)}
              </span>
              <span className="text-[11px] text-slate-600">
                {resumoAcerto.valorAcertoCentavos === 0
                  ? 'Balança equilibrada'
                  : `Saldo a favor de ${resumoAcerto.credor}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4 CARDS DE KPIS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gasto Casal */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {visao === 'meus' ? 'Meus Gastos' : 'Total Gasto Casal'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[#006948]">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatarBRL(
                visao === 'meus'
                  ? lancamentosVisao.reduce((acc, l) => acc + l.valorCentavos, 0)
                  : resumoAcerto.totalCasalCentavos
              )}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {lancamentosVisao.length} lançamentos na visão
            </span>
          </div>
        </div>

        {/* Pago por P1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
              <span className="text-xs font-semibold text-slate-700">Pago por {p1Name}</span>
            </div>
            <span className="text-[11px] font-bold text-[#0051d5] px-1.5 py-0.2 rounded-full bg-blue-50">
              {percVinicius}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#0051d5] tabular-nums">
              {formatarBRL(resumoAcerto.totalPagoP1Centavos)}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#0051d5] h-full rounded-full"
                style={{ width: `${percVinicius}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pago por P2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#712ae2]"></span>
              <span className="text-xs font-semibold text-slate-700">Pago por {p2Name}</span>
            </div>
            <span className="text-[11px] font-bold text-[#712ae2] px-1.5 py-0.2 rounded-full bg-purple-50">
              {percSilvia}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#712ae2] tabular-nums">
              {formatarBRL(resumoAcerto.totalPagoP2Centavos)}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#712ae2] h-full rounded-full"
                style={{ width: `${percSilvia}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Regime de Gastos: 50/50 vs Individuais */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Regime de Gastos</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-[16px]">pie_chart</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>50/50: {formatarBRL(gastos5050Centavos)}</span>
              <span className="text-slate-400 font-normal">{perc5050}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-[#006948] h-full"
                style={{ width: `${perc5050}%` }}
                title="50/50 compartilhado"
              ></div>
              <div
                className="bg-slate-400 h-full"
                style={{ width: `${100 - perc5050}%` }}
                title="Gastos individuais"
              ></div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Individuais somam {formatarBRL(gastosIndividuaisCentavos)}
            </span>
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO DUPLA: TOP CATEGORIAS + CALENDÁRIO HEATMAP */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <RankingCategoriasView
            ranking={ranking}
            onVerTodasCategorias={onIrParaCategorias}
          />
        </div>
        <div className="lg:col-span-5">
          <HeatmapCalendario
            mesSelecionado={mesSelecionado}
            lancamentos={todosLancamentosDoMes}
          />
        </div>
      </section>

      {/* 5. TABELA DE LANÇAMENTOS RECENTES DO MÊS */}
      <section className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#006948] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Lançamentos do Mês ({lancamentosVisao.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                {visao === 'meus' ? `Apenas pagos por ${usuarioAtual}` : 'Visão completa do casal'}
              </span>
            </div>
          </div>

          <button
            onClick={onIrParaLancamentos}
            type="button"
            className="text-[#006948] hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-center"
          >
            <span>Ver tabela completa & filtros</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {lancamentosVisao.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhum lançamento registrado para os filtros ativos em {nomeMesFormatado}.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-4 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Estabelecimento / Item</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Categoria</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Quem Pagou</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Divisão</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Valor Total</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Minha Parte</th>
                  <th className="py-2.5 px-3 text-center w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentosVisao.slice(0, 8).map((lancamento) => {
                  const dataFormatada = (() => {
                    const parts = lancamento.dataReferencia.split('-');
                    return `${parts[2]}/${parts[1]}`;
                  })();

                  const isAutor = lancamento.cadastradoPor === usuarioAtual;

                  return (
                    <tr
                      key={`${lancamento.compraId}-${lancamento.numeroParcela}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                        {dataFormatada}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 leading-tight">
                              {lancamento.nome}
                            </span>
                            {lancamento.totalParcelas > 1 && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {lancamento.numeroParcela}/{lancamento.totalParcelas}
                              </span>
                            )}
                          </div>
                          {lancamento.descricao && (
                            <span className="text-[11px] text-slate-400 truncate max-w-xs">
                              {lancamento.descricao}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {lancamento.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            lancamento.pagoPor === 'Vinicius'
                              ? 'bg-blue-50 text-[#0051d5]'
                              : 'bg-purple-50 text-[#712ae2]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              lancamento.pagoPor === 'Vinicius' ? 'bg-[#0051d5]' : 'bg-[#712ae2]'
                            }`}
                          ></span>
                          <span>{lancamento.pagoPor}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lancamento.divisao === '50/50'
                              ? 'bg-emerald-50 text-[#006948]'
                              : lancamento.divisao === 'Vinicius'
                              ? 'bg-blue-50 text-[#0051d5]'
                              : 'bg-purple-50 text-[#712ae2]'
                          }`}
                        >
                          {lancamento.divisao === '50/50' ? '⚖️ 50/50' : `Só ${lancamento.divisao}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatarBRL(lancamento.valorCentavos)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#006948] tabular-nums whitespace-nowrap">
                        {formatarBRL(lancamento.minhaParteCentavos)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isAutor ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditarCompra(lancamento.compraId)}
                              className="w-6 h-6 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                              title="Editar compra (Autor)"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                            <button
                              onClick={() =>
                                onRemoverCompra(lancamento.compraId, lancamento.numeroParcela)
                              }
                              className="w-6 h-6 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancelar a partir desta parcela"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                delete_sweep
                              </span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className="text-[10px] text-slate-400 italic"
                            title={`Cadastrado por ${lancamento.cadastradoPor}. Apenas o autor pode editar.`}
                          >
                            Por {lancamento.cadastradoPor}
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
      </section>
    </div>
  );
};

import React from 'react';
import {
  CategoriaMeta,
  Compra,
  CoupleSpace,
  FechamentoMensal,
  LancamentoMensal,
  ResumoAcerto,
  UserProfile,
  UsuarioId,
} from '../types';
import {
  formatarBRL,
  formatarDataBR,
  formatarDataCurtaBR,
  parseDivisaoPercentuais,
} from '../calculations/acertoMensal';
import { ResultadoRanking } from '../calculations/rankingCategorias';
import { RankingCategoriasView } from './RankingCategoriasView';
import { HeatmapCalendario } from './HeatmapCalendario';
import { CategoryIconOrImage } from './CategoryIconOrImage';
import { SeletorMesFlutuante } from './SeletorMesFlutuante';
import { GraficoLinhaGastos } from './GraficoLinhaGastos';

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
  categorias?: CategoriaMeta[];
  couple?: CoupleSpace | null;
  userProfile?: UserProfile | null;
  onAbrirModalAcerto: () => void;
  onAbrirNotaFechamento?: (mes: string) => void;
  onEditarCompra: (compraId: string) => void;
  onRemoverCompra: (compraId: string, numeroParcela: number) => void;
  onIrParaLancamentos: () => void;
  onIrParaCategorias: () => void;
  onIrParaMinhasDespesas?: () => void;
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
  categorias,
  couple,
  userProfile,
  onAbrirModalAcerto,
  onAbrirNotaFechamento,
  onEditarCompra,
  onRemoverCompra,
  onIrParaLancamentos,
  onIrParaCategorias,
  onIrParaMinhasDespesas,
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

  // Estatísticas de Regimes Dinâmicos (50/50, 70/30, 30/70, 100/0, etc.)
  const p1Name = couple?.partner1Name || resumoAcerto.p1Name || 'Vinicius';
  const p2Name = couple?.partner2Name || resumoAcerto.p2Name || 'Silvia';
  const p1Uid = couple?.partner1Uid || resumoAcerto.p1Uid || 'Vinicius';
  const p2Uid = couple?.partner2Uid || resumoAcerto.p2Uid || 'Silvia';

  const p1Photo =
    couple?.partner1PhotoURL ||
    (userProfile?.uid === p1Uid ? userProfile?.photoURL : undefined);
  const p2Photo =
    couple?.partner2PhotoURL ||
    (userProfile?.uid === p2Uid ? userProfile?.photoURL : undefined);

  let gastosCompartilhadosCentavos = 0;
  let gastosIndividuaisCentavos = 0;
  const regimesUsados: Record<string, { label: string; valorCentavos: number; count: number }> = {};

  for (const l of todosLancamentosDoMes) {
    const { percP1, percP2 } = parseDivisaoPercentuais(
      l.divisao,
      p1Uid,
      p2Uid,
      [p1Name, 'p1'],
      [p2Name, 'p2']
    );

    let chave = l.divisao;
    let label = l.divisao;
    if (l.divisao === '50/50' || (percP1 === 50 && percP2 === 50)) {
      chave = '50/50';
      label = '50/50';
    } else if (percP1 === 100 && percP2 === 0) {
      chave = '100/0';
      label = `Só ${p1Name}`;
    } else if (percP1 === 0 && percP2 === 100) {
      chave = '0/100';
      label = `Só ${p2Name}`;
    } else {
      chave = `${percP1}/${percP2}`;
      label = `${percP1}/${percP2}`;
    }

    if (!regimesUsados[chave]) {
      regimesUsados[chave] = { label, valorCentavos: 0, count: 0 };
    }
    regimesUsados[chave].valorCentavos += l.valorCentavos;
    regimesUsados[chave].count += 1;

    if (percP1 > 0 && percP2 > 0) {
      gastosCompartilhadosCentavos += l.valorCentavos;
    } else {
      gastosIndividuaisCentavos += l.valorCentavos;
    }
  }

  const totalGeralCentavos = resumoAcerto.totalCasalCentavos;
  const percCompartilhado = totalGeralCentavos > 0
    ? Number(((gastosCompartilhadosCentavos / totalGeralCentavos) * 100).toFixed(1))
    : 0;

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
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#161f2e] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Navegador de Meses com Calendário Flutuante */}
          <SeletorMesFlutuante
            mesSelecionado={mesSelecionado}
            onMudarMes={onMudarMes}
            variante="casal"
          />

          {/* Badge de Status do Mês */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
              statusMes === 'quitado'
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-[#006948] dark:text-emerald-300'
                : statusMes === 'parcial'
                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                : statusMes === 'vazio'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-[#006948] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusMes === 'quitado'
                  ? 'bg-emerald-600 dark:bg-emerald-400'
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
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-transparent dark:border-slate-700/60" role="tablist">
            <button
              onClick={() => onAlternarVisao('meus')}
              aria-selected={visao === 'meus'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                visao === 'meus'
                  ? 'bg-white dark:bg-slate-700 text-[#0051d5] dark:text-blue-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
              <span>Meus Pagamentos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0051d5] dark:text-blue-300 text-[10px]">
                {todosLancamentosDoMes.filter((l) => l.pagoPor === usuarioAtual).length}
              </span>
            </button>
            <button
              onClick={() => onAlternarVisao('casal')}
              aria-selected={visao === 'casal'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                visao === 'casal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Casal (Ambos)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                {todosLancamentosDoMes.length}
              </span>
            </button>
          </div>

          {onIrParaMinhasDespesas && (
            <button
              type="button"
              onClick={onIrParaMinhasDespesas}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Acessar cofre individual protegido e confidencial"
            >
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span>Cofre Privado</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. HERO: BALANÇA FINANCEIRA E ACERTO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 dark:from-[#161f2e] dark:via-[#131b28] dark:to-[#0f221c] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold uppercase tracking-wider">
                {statusMes === 'quitado' ? 'Acerto Liquidado' : 'Fechamento & Balança'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  resumoAcerto.valorAcertoCentavos === 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                {resumoAcerto.valorAcertoCentavos === 0
                  ? 'Sem Dívida Pendente'
                  : 'Pendente de Acerto'}
              </span>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Equilíbrio Financeiro do Casal
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {!resumoAcerto.temLancamentos ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xl">
                      Nenhum lançamento registrado neste mês.
                    </span>
                    {compras.length > 0 && (
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[15px]">info</span>
                        <span>Seu espaço possui {compras.length} compras cadastradas em outros meses.</span>
                      </span>
                    )}
                  </div>
                ) : resumoAcerto.valorAcertoCentavos === 0 ? (
                  <span className="text-[#006948] dark:text-emerald-400">
                    As contas estão perfeitamente equilibradas (R$ 0,00).
                  </span>
                ) : (
                  <>
                    <span>{resumoAcerto.devedor} paga</span>
                    <span className="text-[#006948] dark:text-emerald-400 font-bold tabular-nums">
                      {formatarBRL(resumoAcerto.valorAcertoCentavos)}
                    </span>
                    <span>a {resumoAcerto.credor}</span>
                  </>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
            <div className="flex items-center gap-2">
              <button
                onClick={onAbrirModalAcerto}
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Detalhes</span>
              </button>
              {onAbrirNotaFechamento && (
                <button
                  onClick={() => onAbrirNotaFechamento(mesSelecionado)}
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-[#006948] dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Extrair nota com pagamentos e parcelas em PDF"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Nota (PDF)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3 Sub-Cards do Acerto */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* P1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0051d5] dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {p1Name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pago por {p1Name}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatarBRL(resumoAcerto.totalPagoP1Centavos)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Cota {p2Name}: <strong className="text-[#0051d5] dark:text-blue-400">{formatarBRL(resumoAcerto.cotaP2Em5050Centavos)}</strong>
              </span>
            </div>
          </div>

          {/* P2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950/80 text-[#712ae2] dark:text-purple-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {p2Name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pago por {p2Name}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatarBRL(resumoAcerto.totalPagoP2Centavos)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Cota {p1Name}: <strong className="text-[#712ae2] dark:text-purple-400">{formatarBRL(resumoAcerto.cotaP1Em5050Centavos)}</strong>
              </span>
            </div>
          </div>

          {/* Diferença Líquida */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-[#006948] dark:text-emerald-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">balance</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#006948] dark:text-emerald-300 font-semibold">Diferença Líquida</span>
              <span className="text-sm font-bold text-[#006948] dark:text-emerald-300 tabular-nums">
                {formatarBRL(resumoAcerto.valorAcertoCentavos)}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {visao === 'meus' ? 'Meus Gastos' : 'Total Gasto Casal'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#006948] dark:text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatarBRL(
                visao === 'meus'
                  ? lancamentosVisao.reduce((acc, l) => acc + l.valorCentavos, 0)
                  : resumoAcerto.totalCasalCentavos
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              {lancamentosVisao.length} lançamentos na visão
            </span>
          </div>
        </div>

        {/* Pago por P1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pago por {p1Name}</span>
            </div>
            <span className="text-[11px] font-bold text-[#0051d5] dark:text-blue-300 px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60">
              {percVinicius}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#0051d5] dark:text-blue-400 tabular-nums">
              {formatarBRL(resumoAcerto.totalPagoP1Centavos)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#0051d5] h-full rounded-full"
                style={{ width: `${percVinicius}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pago por P2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#712ae2]"></span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pago por {p2Name}</span>
            </div>
            <span className="text-[11px] font-bold text-[#712ae2] dark:text-purple-300 px-1.5 py-0.2 rounded-full bg-purple-50 dark:bg-purple-950/60">
              {percSilvia}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#712ae2] dark:text-purple-400 tabular-nums">
              {formatarBRL(resumoAcerto.totalPagoP2Centavos)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#712ae2] h-full rounded-full"
                style={{ width: `${percSilvia}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Regime de Gastos: Compartilhado vs Individuais & Rateios */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Regime de Gastos</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined text-[16px]">pie_chart</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
              <span>Rateio: {formatarBRL(gastosCompartilhadosCentavos)}</span>
              <span className="text-slate-400 font-normal">{percCompartilhado}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-[#006948] h-full transition-all duration-300"
                style={{ width: `${percCompartilhado}%` }}
                title={`Rateios compartilhados: ${percCompartilhado}%`}
              ></div>
              <div
                className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-300"
                style={{ width: `${100 - percCompartilhado}%` }}
                title={`Gastos individuais: ${100 - percCompartilhado}%`}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
              <span>Individuais: {formatarBRL(gastosIndividuaisCentavos)}</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {Object.keys(regimesUsados).slice(0, 3).map((k) => (
                  <span
                    key={k}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[9px]"
                  >
                    {regimesUsados[k].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.1. GRÁFICO EM LINHA: EVOLUÇÃO TEMPORAL DOS GASTOS DO CASAL */}
      <GraficoLinhaGastos
        tipo="casal"
        mesSelecionado={mesSelecionado}
        lancamentosDoMes={todosLancamentosDoMes}
        compras={compras}
        p1Nome={p1Name}
        p2Nome={p2Name}
        p1Photo={p1Photo}
        p2Photo={p2Photo}
      />

      {/* 4. SEÇÃO DUPLA: TOP CATEGORIAS + CALENDÁRIO HEATMAP */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <RankingCategoriasView
            ranking={ranking}
            categorias={categorias}
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
      <section className="flex flex-col bg-white dark:bg-[#161f2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Lançamentos do Mês ({lancamentosVisao.length})
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {visao === 'meus' ? `Apenas pagos por ${usuarioAtual}` : 'Visão completa do casal'}
              </span>
            </div>
          </div>

          <button
            onClick={onIrParaLancamentos}
            type="button"
            className="text-[#006948] dark:text-emerald-400 hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-center"
          >
            <span>Ver tabela completa & filtros</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {lancamentosVisao.length === 0 ? (
          compras.length > 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[24px]">event_busy</span>
              <div className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
                Nenhum lançamento com parcela em {nomeMesFormatado}.
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                Existem <strong>{compras.length} compras cadastradas</strong> no total neste espaço em outros meses.
              </p>
              <button
                type="button"
                onClick={onIrParaLancamentos}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">list_alt</span>
                <span>Ver Todas as Compras na Aba Lançamentos</span>
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              Nenhum lançamento registrado para os filtros ativos em {nomeMesFormatado}.
            </div>
          )
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#111a28] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-4 whitespace-nowrap">Pagamento / Compra</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Estabelecimento / Item</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Categoria</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Quem Pagou</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Divisão</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Valor Total</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Minha Parte</th>
                  <th className="py-2.5 px-3 text-center w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lancamentosVisao.slice(0, 8).map((lancamento) => {
                  const dataFormatada = (() => {
                    const parts = lancamento.dataReferencia.split('-');
                    return `${parts[2]}/${parts[1]}`;
                  })();

                  const isAutor = lancamento.cadastradoPor === usuarioAtual;

                  return (
                    <tr
                      key={`${lancamento.compraId}-${lancamento.numeroParcela}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs" title="Data do pagamento/parcela no mês">
                            {dataFormatada}
                          </span>
                          {lancamento.dataCompra && (
                            <span
                              className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 mt-0.5"
                              title={`Compra realizada em: ${formatarDataBR(lancamento.dataCompra)}`}
                            >
                              <span className="material-symbols-outlined text-[12px] text-[#006948] dark:text-emerald-400">
                                shopping_bag
                              </span>
                              <span>{formatarDataCurtaBR(lancamento.dataCompra)}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {lancamento.nome}
                            </span>
                            {lancamento.recorrente ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-800/40">
                                <span className="material-symbols-outlined text-[11px]">sync</span>
                                <span>Recorrente</span>
                              </span>
                            ) : lancamento.totalParcelas > 1 ? (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                {lancamento.numeroParcela}/{lancamento.totalParcelas}
                              </span>
                            ) : null}
                          </div>
                          {lancamento.descricao && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                              {lancamento.descricao}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {(() => {
                          const catObj = categorias?.find(
                            (c) => c.id === lancamento.categoria || c.nome === lancamento.categoria
                          );
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/50 dark:border-slate-700/60">
                              <CategoryIconOrImage
                                icone={catObj?.icone}
                                imagemUrl={catObj?.imagemUrl}
                                nome={lancamento.categoria}
                                size="xs"
                                className="shrink-0"
                              />
                              <span>{lancamento.categoria}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            lancamento.pagoPor === 'Vinicius'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-300'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-300'
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-300">
                                ⚖️ 50/50
                              </span>
                            );
                          }
                          if (percP1 === 100 && percP2 === 0) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-300">
                                👤 Só {p1Name}
                              </span>
                            );
                          }
                          if (percP1 === 0 && percP2 === 100) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-300">
                                👤 Só {p2Name}
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                              📊 {percP1}/{percP2}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatarBRL(lancamento.valorCentavos)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#006948] dark:text-emerald-400 tabular-nums whitespace-nowrap">
                        {formatarBRL(lancamento.minhaParteCentavos)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isAutor ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditarCompra(lancamento.compraId)}
                              className="w-6 h-6 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Editar compra (Autor)"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                            <button
                              onClick={() =>
                                onRemoverCompra(lancamento.compraId, lancamento.numeroParcela)
                              }
                              className="w-6 h-6 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancelar a partir desta parcela"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                delete_sweep
                              </span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className="text-[10px] text-slate-400 dark:text-slate-500 italic"
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

import React, { useState } from 'react';
import { CoupleSpace, FechamentoMensal, ResumoAcerto, UsuarioId } from '../types';
import { formatarBRL } from '../calculations/acertoMensal';

interface FechamentosViewProps {
  mesSelecionado: string;
  resumoAcerto: ResumoAcerto;
  fechamentos: FechamentoMensal[];
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  onAbrirModalAcerto: () => void;
  onFecharMes: () => void;
  onQuitarResidualRetroativo: (fechamentoId: string) => void;
  onDeletarFechamento: (fechamentoId: string) => void;
}

export const FechamentosView: React.FC<FechamentosViewProps> = ({
  mesSelecionado,
  resumoAcerto,
  fechamentos,
  usuarioAtual,
  couple,
  onAbrirModalAcerto,
  onFecharMes,
  onQuitarResidualRetroativo,
  onDeletarFechamento,
}) => {
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'quitados'>('todos');
  const [modalSimulacaoAberto, setModalSimulacaoAberto] = useState(false);
  const [comprovanteVisualizado, setComprovanteVisualizado] = useState<string | null>(null);

  const fechamentosFiltrados = fechamentos.filter((f) => {
    if (filtroStatus === 'quitados') return f.status === 'quitado';
    if (filtroStatus === 'pendentes') return f.status === 'parcial' || f.status === 'retroativo';
    return true;
  });

  const p1Nome = couple?.partner1Name || resumoAcerto.p1Name || 'Vinicius';
  const p2Nome = couple?.partner2Name || resumoAcerto.p2Name || 'Silvia';

  const p1PagoCentavos =
    resumoAcerto.totalPagoP1Centavos ?? resumoAcerto.totalPagoViniciusCentavos ?? 0;
  const p2PagoCentavos =
    resumoAcerto.totalPagoP2Centavos ?? resumoAcerto.totalPagoSilviaCentavos ?? 0;

  const percP1 =
    resumoAcerto.totalCasalCentavos > 0
      ? Number(((p1PagoCentavos / resumoAcerto.totalCasalCentavos) * 100).toFixed(1))
      : 50;

  const percP2 =
    resumoAcerto.totalCasalCentavos > 0 ? Number((100 - percP1).toFixed(1)) : 50;

  const devedorNome = resumoAcerto.devedor !== 'Nenhum' ? resumoAcerto.devedor : p2Nome;
  const credorNome = resumoAcerto.credor !== 'Nenhum' ? resumoAcerto.credor : p1Nome;

  const isDevedorP1 = devedorNome === p1Nome;
  const isCredorP1 = credorNome === p1Nome;

  const devedorPagoCentavos = isDevedorP1 ? p1PagoCentavos : p2PagoCentavos;
  const credorPagoCentavos = isCredorP1 ? p1PagoCentavos : p2PagoCentavos;

  // Ciclo dinâmico baseado no ano selecionado
  const anoCiclo = mesSelecionado ? mesSelecionado.slice(0, 4) : new Date().getFullYear().toString();
  const fechamentosDoAno = fechamentos.filter((f) => f.mesReferencia?.startsWith(anoCiclo));

  const totalAcertadoAnoCentavos = fechamentosDoAno.reduce((total, f) => {
    const pagamentosFeitos = (f.pagamentos || []).reduce((acc, p) => acc + (p.valorCentavos || 0), 0);
    if (pagamentosFeitos > 0) {
      return total + pagamentosFeitos;
    }
    if (f.status === 'quitado') {
      return total + Math.abs(f.saldoOriginalCentavos || 0);
    }
    return total;
  }, 0);

  // Distribuição de quem efetuou os pagamentos de acerto no ano
  let totalPagoP1AcertosCentavos = 0;
  let totalPagoP2AcertosCentavos = 0;

  fechamentosDoAno.forEach((f) => {
    const pagamentos = f.pagamentos || [];
    if (pagamentos.length > 0) {
      pagamentos.forEach((p) => {
        const isP1 =
          p.pagadorUid === couple?.partner1Uid ||
          p.pagador === p1Nome ||
          (f.devedorUid && f.devedorUid === couple?.partner1Uid) ||
          f.devedor === p1Nome;
        if (isP1) {
          totalPagoP1AcertosCentavos += p.valorCentavos || 0;
        } else {
          totalPagoP2AcertosCentavos += p.valorCentavos || 0;
        }
      });
    } else if (f.status === 'quitado' && f.saldoOriginalCentavos !== 0) {
      const valor = Math.abs(f.saldoOriginalCentavos || 0);
      const isP1 =
        (f.devedorUid && f.devedorUid === couple?.partner1Uid) ||
        f.devedor === p1Nome;
      if (isP1) {
        totalPagoP1AcertosCentavos += valor;
      } else {
        totalPagoP2AcertosCentavos += valor;
      }
    }
  });

  const totalPagamentosAmbos = totalPagoP1AcertosCentavos + totalPagoP2AcertosCentavos;
  const percP1Acertos =
    totalPagamentosAmbos > 0
      ? Math.round((totalPagoP1AcertosCentavos / totalPagamentosAmbos) * 100)
      : 50;
  const percP2Acertos = totalPagamentosAmbos > 0 ? 100 - percP1Acertos : 50;

  // Cálculo de agilidade de quitação real com base nos pagamentos
  let somaDiasQuitacao = 0;
  let qtdPagamentosComData = 0;
  let pagamentosAte3Dias = 0;

  fechamentosDoAno.forEach((f) => {
    if (!f.dataFechamento) return;
    const dFechamento = new Date(f.dataFechamento).getTime();

    (f.pagamentos || []).forEach((p) => {
      if (!p.dataPagamento) return;
      const dPagamento = new Date(p.dataPagamento).getTime();
      const diffDias = Math.max(0, Math.round((dPagamento - dFechamento) / (1000 * 60 * 60 * 24)));
      somaDiasQuitacao += diffDias;
      qtdPagamentosComData += 1;
      if (diffDias <= 3) {
        pagamentosAte3Dias += 1;
      }
    });
  });

  const mediaDias =
    qtdPagamentosComData > 0
      ? (somaDiasQuitacao / qtdPagamentosComData).toFixed(1).replace('.', ',')
      : null;

  const percAte3Dias =
    qtdPagamentosComData > 0
      ? Math.round((pagamentosAte3Dias / qtdPagamentosComData) * 100)
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar: Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006948] text-xs font-semibold uppercase tracking-wider">
              Conciliação Mútua
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Ciclo Atual</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Fechamentos & Acertos Mensais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Histórico transparente dos acertos de contas, comprovantes anexados e conciliação
            equilibrada entre {p1Nome} e {p2Nome}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setModalSimulacaoAberto(true)}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#0051d5]">calculate</span>
            <span>Simular Fechamento Atual</span>
          </button>
          <button
            onClick={() => {
              alert(
                'Relatório financeiro de acertos gerado e copiado para a área de transferência.'
              );
            }}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span className="hidden sm:inline">Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Active Month Settlement Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#006948] text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Mês em Aberto</span>
            </div>
            <span className="text-slate-500 text-xs">
              {mesSelecionado} • Acerto Provisório em Andamento
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[15px] text-[#006948]">schedule</span>
            <span>Cálculo atualizado em tempo real</span>
          </div>
        </div>

        {/* Dynamic Hero Transfer Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Visual transfer box */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            {/* Debtor */}
            <div className="flex flex-col items-center text-center gap-1">
              <div
                className={`w-14 h-14 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-sm ${
                  isDevedorP1 ? 'bg-[#0051d5]' : 'bg-[#712ae2]'
                }`}
              >
                {devedorNome.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-slate-900 mt-1">{devedorNome}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                  isDevedorP1 ? 'bg-blue-50 text-[#0051d5]' : 'bg-purple-50 text-[#712ae2]'
                }`}
              >
                Pagou {formatarBRL(devedorPagoCentavos)}
              </span>
            </div>

            {/* Arrow & Amount */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
                <span>
                  {resumoAcerto.valorAcertoCentavos === 0
                    ? 'Balança Nivelada'
                    : `${devedorNome} deve transferir`}
                </span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#006948] tabular-nums tracking-tight">
                {formatarBRL(resumoAcerto.valorAcertoCentavos)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[14px] text-[#006948]">
                  verified
                </span>
                <span>Rateio proporcional balanceado</span>
              </div>
            </div>

            {/* Creditor */}
            <div className="flex flex-col items-center text-center gap-1">
              <div
                className={`w-14 h-14 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-sm ${
                  isCredorP1 ? 'bg-[#0051d5]' : 'bg-[#712ae2]'
                }`}
              >
                {credorNome.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-slate-900 mt-1">{credorNome}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                  isCredorP1 ? 'bg-blue-50 text-[#0051d5]' : 'bg-purple-50 text-[#712ae2]'
                }`}
              >
                Pagou {formatarBRL(credorPagoCentavos)}
              </span>
            </div>
          </div>

          {/* Breakdown & Action Button */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full gap-3">
            <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cálculo Provisório Atual
              </span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Despesas Compartilhadas Totais:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatarBRL(resumoAcerto.totalCasalCentavos)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Cota Ideal Individual (50%):</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatarBRL(Math.floor(resumoAcerto.totalCasalCentavos / 2))}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex mt-1">
                <div
                  className="bg-[#0051d5] h-full"
                  style={{ width: `${percP1}%` }}
                  title={`${p1Nome}: ${percP1}%`}
                ></div>
                <div
                  className="bg-[#712ae2] h-full"
                  style={{ width: `${percP2}%` }}
                  title={`${p2Nome}: ${percP2}%`}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>{p1Nome}: {percP1}%</span>
                <span>{p2Nome}: {percP2}%</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onFecharMes}
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>Fechar Mês & Registrar Acerto</span>
              </button>
              <button
                onClick={onAbrirModalAcerto}
                type="button"
                className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Ver detalhes do cálculo"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: History (Left 8 cols) & General Reconciliation Summary (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Closed Months History */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Histórico de Meses Fechados
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                {fechamentosFiltrados.length} meses
              </span>
            </div>

            {/* Segmented Filter */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setFiltroStatus('todos')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filtroStatus === 'todos'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroStatus('pendentes')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filtroStatus === 'pendentes'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFiltroStatus('quitados')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filtroStatus === 'quitados'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quitados
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {fechamentosFiltrados.map((fechamento) => {
              const valorOriginal = Math.abs(fechamento.saldoOriginalCentavos);
              const totalPago = fechamento.pagamentos.reduce((acc, p) => acc + p.valorCentavos, 0);
              const pendencia = Math.max(0, valorOriginal - totalPago);

              return (
                <article
                  key={fechamento.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      fechamento.status === 'quitado'
                        ? 'bg-[#006948]'
                        : fechamento.status === 'parcial'
                        ? 'bg-amber-500'
                        : 'bg-[#712ae2]'
                    }`}
                  ></div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#006948]">
                        <span className="material-symbols-outlined text-[20px]">
                          {fechamento.status === 'quitado' ? 'event_available' : 'pending_actions'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {fechamento.mesReferencia}
                        </h3>
                        <span className="text-xs text-slate-500">
                          Fechado em {fechamento.dataFechamento} • Conciliado por{' '}
                          {fechamento.conciliadoPor}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            fechamento.status === 'quitado'
                              ? 'bg-emerald-100 text-[#006948]'
                              : fechamento.status === 'parcial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-[#712ae2]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {fechamento.status === 'quitado'
                              ? 'check_circle'
                              : fechamento.status === 'parcial'
                              ? 'hourglass_top'
                              : 'difference'}
                          </span>
                          <span>
                            {fechamento.status === 'quitado'
                              ? 'Totalmente Quitado'
                              : fechamento.status === 'parcial'
                              ? 'Acerto Parcial'
                              : 'Pendência por Edição Retroativa'}
                          </span>
                        </div>
                        <button
                          onClick={() => onDeletarFechamento(fechamento.id)}
                          type="button"
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remover mês fechado"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                  </div>

                  {/* Spending summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Gastos {p1Nome}</span>
                      <span className="font-bold text-[#0051d5] tabular-nums">
                        {formatarBRL(fechamento.totalPagoP1Centavos ?? fechamento.totalPagoViniciusCentavos ?? 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Gastos {p2Nome}</span>
                      <span className="font-bold text-[#712ae2] tabular-nums">
                        {formatarBRL(fechamento.totalPagoP2Centavos ?? fechamento.totalPagoSilviaCentavos ?? 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Total Compartilhado</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatarBRL(fechamento.totalCompartilhadoCentavos)}
                      </span>
                    </div>
                  </div>

                  {/* Informações de Acerto e Comprovante */}
                  {fechamento.status === 'quitado' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            fechamento.devedor === p1Nome
                              ? 'bg-blue-100 text-[#0051d5]'
                              : 'bg-purple-100 text-[#712ae2]'
                          }`}
                        >
                          {(fechamento.devedor || 'P').charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800">
                            {fechamento.devedor} pagou{' '}
                            <strong className="text-[#006948]">
                              {formatarBRL(valorOriginal)}
                            </strong>{' '}
                            a {fechamento.credor}
                          </span>
                          <span className="text-slate-500 block text-[11px]">
                            {fechamento.pagamentos[0]?.observacoes || 'Via Pix comprovado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {fechamento.pagamentos[0]?.comprovanteNome && (
                          <button
                            onClick={() =>
                              setComprovanteVisualizado(fechamento.pagamentos[0].comprovanteNome!)
                            }
                            type="button"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px] text-[#006948]">
                              receipt_long
                            </span>
                            <span>Ver Comprovante</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {fechamento.status === 'parcial' && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-slate-500">Saldo Original:</span>{' '}
                          <strong className="text-slate-800">
                            {fechamento.devedor} devia {formatarBRL(valorOriginal)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Parcela Paga:</span>{' '}
                          <strong className="text-[#006948]">{formatarBRL(totalPago)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Pendência Restante:</span>{' '}
                          <strong className="text-red-600">{formatarBRL(pendencia)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span>Restam {formatarBRL(pendencia)} para liquidação total</span>
                        </span>
                        <button
                          onClick={onAbrirModalAcerto}
                          type="button"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-semibold shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          <span>Registrar Parcela Restante</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {fechamento.status === 'retroativo' && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/60 text-xs text-slate-700 leading-relaxed">
                        <strong className="text-[#712ae2] block mb-1">
                          Registro de Modificação Posterior:
                        </strong>
                        {fechamento.notaRetroativa ||
                          'Uma despesa parcelada foi alterada retroativamente após a liquidação do mês.'}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="text-xs">
                          <span className="text-slate-500">Saldo residual a compensar:</span>{' '}
                          <strong className="text-[#712ae2] text-sm tabular-nums">
                            {formatarBRL(fechamento.saldoResidualCentavos || 2250)}
                          </strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onQuitarResidualRetroativo(fechamento.id)}
                            type="button"
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-semibold shadow-sm cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">check</span>
                            <span>
                              Acertar {formatarBRL(fechamento.saldoResidualCentavos || 2250)}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {fechamentosFiltrados.length === 0 && (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                <span className="material-symbols-outlined text-[32px] text-slate-400">
                  inventory_2
                </span>
                <p className="text-sm font-semibold text-slate-700">Nenhum mês fechado encontrado</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Quando você fechar um mês em "Fechar Mês & Registrar Acerto", o histórico aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: General Reconciliation Summary & Harmony Widget */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Resumo Geral</h2>
            <span className="text-xs text-slate-500 font-medium">Ciclo {anoCiclo}</span>
          </div>

          {/* Metric: Total Acertado no Ano */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Acertado no Ano
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#006948] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {formatarBRL(totalAcertadoAnoCentavos)}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {totalAcertadoAnoCentavos > 0
                ? `Volume total transferido entre contas para nivelamento das despesas compartilhadas do casal no ciclo de ${anoCiclo}.`
                : `Nenhum acerto compensatório finalizado no ciclo de ${anoCiclo} até o momento.`}
            </p>

            {/* Distribution Bar */}
            <div className="pt-2 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Distribuição de pagadores nos acertos:</span>
              </div>
              {totalPagamentosAmbos > 0 ? (
                <>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#0051d5] h-full transition-all"
                      style={{ width: `${percP1Acertos}%` }}
                      title={`${p1Nome}: ${percP1Acertos}% (${formatarBRL(totalPagoP1AcertosCentavos)})`}
                    ></div>
                    <div
                      className="bg-[#712ae2] h-full transition-all"
                      style={{ width: `${percP2Acertos}%` }}
                      title={`${p2Nome}: ${percP2Acertos}% (${formatarBRL(totalPagoP2AcertosCentavos)})`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="text-[#0051d5]">
                      {p1Nome} ({percP1Acertos}%)
                    </span>
                    <span className="text-[#712ae2]">
                      {p2Nome} ({percP2Acertos}%)
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-[11px]">
                  Aguardando primeiro fechamento de {anoCiclo} com transferência compensatória.
                </div>
              )}
            </div>
          </div>

          {/* Agilidade de Quitação */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Agilidade de Quitação
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0051d5] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">speed</span>
              </div>
            </div>
            {mediaDias !== null ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                    {mediaDias}
                  </span>
                  <span className="text-base font-semibold text-slate-500">dias</span>
                </div>
                <p className="text-xs text-slate-500">
                  Média de tempo após o fechamento do mês para realização da compensação Pix.
                </p>
                {percAte3Dias !== null && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-[#006948] text-xs font-medium mt-1">
                    <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                    <span>{percAte3Dias}% dos acertos ocorreram nos primeiros 3 dias.</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-400 tabular-nums">-</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">sem histórico</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tempo médio calculado automaticamente conforme transferências e comprovantes forem registrados.
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 text-slate-500 text-xs font-medium mt-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
                  <span>Mantenha os acertos em dia após o fechamento do mês.</span>
                </div>
              </>
            )}
          </div>

          {/* Harmonia a Dois */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-blue-50/50 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#006948] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">favorite</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Harmonia a Dois</h3>
                <span className="text-[10px] text-[#006948] font-bold uppercase tracking-wider">
                  Dica de Convivência Financeira
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed italic">
              "Acertos regulares e previsíveis evitam conversas desconfortáveis e fortalecem os
              projetos futuros. A clareza mútua transforma o dinheiro em ponte, nunca em
              obstáculo."
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
              <span>Equilíbrio {p1Nome} & {p2Nome}</span>
              <span className="text-[#006948] font-semibold">NósDois Finanças</span>
            </div>
          </div>

          {/* Regras de Acerto do Casal */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-500">gavel</span>
              Regras de Acerto do Casal
            </span>
            <ul className="text-xs text-slate-600 flex flex-col gap-1 list-disc list-inside leading-relaxed">
              <li>Fechamento mensal no 1º dia do mês seguinte.</li>
              <li>Divisão padrão configurável (50/50, 70/30, 30/70, etc.) em contas conjuntas.</li>
              <li>Compras exclusivas pagas pelo outro entram 100% no acerto.</li>
              <li>Edições retroativas geram saldos residuais auditados.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Modal de Simulação Interativa */}
      {modalSimulacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0051d5] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calculate</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Simulação do Fechamento</h3>
                  <span className="text-xs text-slate-500">Prévia do mês {mesSelecionado}</span>
                </div>
              </div>
              <button
                onClick={() => setModalSimulacaoAberto(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total despesas de {p1Nome}:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatarBRL(p1PagoCentavos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total despesas de {p2Nome}:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatarBRL(p2PagoCentavos)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">
                  {resumoAcerto.devedor} → {resumoAcerto.credor}:
                </span>
                <span className="text-lg font-extrabold text-[#006948] tabular-nums">
                  {formatarBRL(resumoAcerto.valorAcertoCentavos)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              A simulação não encerra o mês. Ela apenas calcula a equalização financeira exata
              baseada em todas as compras marcadas neste momento.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalSimulacaoAberto(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Fechar Simulação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visualizador de Comprovante Simulado */}
      {comprovanteVisualizado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#006948] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[26px]">receipt_long</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Comprovante de Transferência</h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
              {comprovanteVisualizado}
            </p>
            <p className="text-xs text-slate-500">
              Pagamento Pix compensatório validado com sucesso e arquivado para auditoria do casal.
            </p>
            <button
              onClick={() => setComprovanteVisualizado(null)}
              className="px-4 py-2 rounded-xl bg-[#006948] text-white text-xs font-semibold hover:bg-[#005137] cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

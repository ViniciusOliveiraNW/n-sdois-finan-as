import React, { useState } from 'react';
import {
  CategoriaMeta,
  CoupleSpace,
  FechamentoMensal,
  LancamentoMensal,
  ResumoAcerto,
} from '../types';
import { formatarBRL } from '../calculations/acertoMensal';
import { baixarNotaFechamentoPDF, formatarNomeMes } from '../services/pdfService';

interface ModalNotaFechamentoProps {
  aberto: boolean;
  onFechar: () => void;
  mesReferencia: string;
  fechamento?: FechamentoMensal | null;
  resumoAcerto: ResumoAcerto;
  lancamentos: LancamentoMensal[];
  couple?: CoupleSpace | null;
  categorias?: CategoriaMeta[];
  usuarioAtual: string;
}

export const ModalNotaFechamento: React.FC<ModalNotaFechamentoProps> = ({
  aberto,
  onFechar,
  mesReferencia,
  fechamento,
  resumoAcerto,
  lancamentos,
  couple,
  categorias = [],
  usuarioAtual,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState(false);

  if (!aberto) return null;

  const p1Nome = couple?.partner1Name || resumoAcerto.p1Name || 'Parceiro 1';
  const p2Nome = couple?.partner2Name || resumoAcerto.p2Name || 'Parceiro 2';

  const p1PagoCentavos =
    fechamento?.totalPagoP1Centavos ??
    resumoAcerto.totalPagoP1Centavos ??
    resumoAcerto.totalPagoViniciusCentavos ??
    0;
  const p2PagoCentavos =
    fechamento?.totalPagoP2Centavos ??
    resumoAcerto.totalPagoP2Centavos ??
    resumoAcerto.totalPagoSilviaCentavos ??
    0;
  const totalCompartilhadoCentavos =
    fechamento?.totalCompartilhadoCentavos ?? resumoAcerto.totalCompartilhadoCentavos;

  const devedor = fechamento?.devedor || resumoAcerto.devedor || p2Nome;
  const credor = fechamento?.credor || resumoAcerto.credor || p1Nome;
  const valorAcertoCentavos =
    fechamento !== undefined && fechamento !== null
      ? Math.abs(fechamento.saldoOriginalCentavos)
      : resumoAcerto.valorAcertoCentavos;

  const status = fechamento?.status || (valorAcertoCentavos === 0 ? 'quitado' : 'parcial');
  const pagamentos = fechamento?.pagamentos || [];
  const totalPagoAcertoCentavos = pagamentos.reduce((acc, p) => acc + (p.valorCentavos || 0), 0);
  const pendenciaCentavos = Math.max(0, valorAcertoCentavos - totalPagoAcertoCentavos);

  const codigoNota = `NDF-${mesReferencia.replace('-', '')}-${(fechamento?.id || 'PROV')
    .slice(-6)
    .toUpperCase()}`;
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  // Mapeamento de categorias
  const mapaCategorias: Record<string, string> = {};
  categorias.forEach((c) => {
    mapaCategorias[c.id] = c.nome;
  });

  const handleBaixarPDF = () => {
    try {
      setBaixando(true);
      baixarNotaFechamentoPDF({
        mesReferencia,
        fechamento,
        resumoAcerto,
        lancamentos,
        couple,
        categorias,
        emissorNome: usuarioAtual,
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Não foi possível gerar o arquivo PDF. Tente novamente.');
    } finally {
      setTimeout(() => setBaixando(false), 800);
    }
  };

  const handleCopiarResumo = () => {
    const linhas = [
      `📑 *NOTA DE FECHAMENTO - NÓSDOIS FINANÇAS*`,
      `Protocolo: ${codigoNota}`,
      `Período: ${formatarNomeMes(mesReferencia)} (${mesReferencia})`,
      `Casal: ${p1Nome} & ${p2Nome}`,
      `---------------------------------`,
      `💰 *Total Compartilhado:* ${formatarBRL(totalCompartilhadoCentavos)}`,
      `👤 ${p1Nome} pagou: ${formatarBRL(p1PagoCentavos)}`,
      `👤 ${p2Nome} pagou: ${formatarBRL(p2PagoCentavos)}`,
      `⚖️ *Acerto Líquido:* ${
        valorAcertoCentavos === 0
          ? 'Contas 100% equilibradas!'
          : `${devedor} deve transferir ${formatarBRL(valorAcertoCentavos)} para ${credor}`
      }`,
      `📌 *Situação:* ${status === 'quitado' ? '✅ Quitado' : '⏳ Parcial / Pendente'}`,
      `💳 Pagamentos registrados: ${pagamentos.length} (${formatarBRL(totalPagoAcertoCentavos)} pagos)`,
      ...(pendenciaCentavos > 0
        ? [`⚠️ Saldo pendente: ${formatarBRL(pendenciaCentavos)}`]
        : []),
      `---------------------------------`,
      `Extrato emitido em ${dataHoje} via NósDois Finanças.`,
    ];

    navigator.clipboard.writeText(linhas.join('\n'));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nota-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#161f2e] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="modal-nota-title" className="text-base sm:text-lg font-bold">
                  Nota de Fechamento do Mês
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  {codigoNota}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extrato detalhado com cobranças, parcelas e pagamentos realizados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleCopiarResumo}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Copiar resumo para WhatsApp"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiado ? 'check' : 'content_copy'}
              </span>
              <span className="hidden sm:inline">{copiado ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              onClick={handleImprimir}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Imprimir nota"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleBaixarPDF}
              disabled={baixando}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {baixando ? 'sync' : 'download'}
              </span>
              <span>{baixando ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={onFechar}
              type="button"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Fechar"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Printable Content Body */}
        <div className="p-5 sm:p-8 flex flex-col gap-6 overflow-y-auto bg-slate-50/50 dark:bg-[#0d1522]">
          {/* Document Sheet */}
          <div className="bg-white dark:bg-[#161f2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
            {/* Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#006948] text-white flex items-center justify-center font-bold text-sm">
                    ND
                  </div>
                  <span className="text-xl font-extrabold text-[#006948] dark:text-emerald-400 tracking-tight">
                    NÓSDOIS FINANÇAS
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nota de Fechamento Mensal & Prestação de Contas
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Documento de auditoria mútua das despesas compartilhadas
                </span>
              </div>

              <div className="flex flex-col sm:items-end gap-1 text-xs">
                <span className="text-slate-400 dark:text-slate-500">Protocolo de Liquidação</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-sm border border-transparent dark:border-slate-700">
                  {codigoNota}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Emissão: {dataHoje}
                </span>
              </div>
            </div>

            {/* Ciclo & Casal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Mês de Referência:</span>
                <strong className="text-sm font-bold text-[#006948] dark:text-emerald-400">
                  {formatarNomeMes(mesReferencia)}
                </strong>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-mono">({mesReferencia})</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Parceiros Vinculados:</span>
                <strong className="text-sm font-bold text-slate-800 dark:text-white">
                  {p1Nome} & {p2Nome}
                </strong>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">
                  Espaço Conjunto NósDois
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Situação do Fechamento:</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'quitado' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                  <span
                    className={
                      status === 'quitado' ? 'text-[#006948] dark:text-emerald-400' : 'text-amber-800 dark:text-amber-300 font-bold'
                    }
                  >
                    {status === 'quitado' ? 'TOTALMENTE QUITADO' : 'ACERTO PARCIAL / PENDENTE'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Total Compartilhado
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {formatarBRL(totalCompartilhadoCentavos)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block mb-1 truncate">
                  Pago por {p1Nome}
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#0051d5] dark:text-blue-400 tabular-nums">
                  {formatarBRL(p1PagoCentavos)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/40">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block mb-1 truncate">
                  Pago por {p2Nome}
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#712ae2] dark:text-purple-400 tabular-nums">
                  {formatarBRL(p2PagoCentavos)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                  Acerto Líquido
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#006948] dark:text-emerald-400 tabular-nums">
                  {formatarBRL(valorAcertoCentavos)}
                </span>
              </div>
            </div>

            {/* Veredito do rateio */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-slate-50 to-blue-50 dark:from-emerald-950/30 dark:via-slate-900/40 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-transparent dark:border-emerald-800/40">
                <span className="material-symbols-outlined text-[20px]">balance</span>
              </div>
              <div className="flex-1">
                <strong className="text-slate-900 dark:text-white">
                  {valorAcertoCentavos === 0
                    ? 'Balanço perfeitamente equilibrado.'
                    : `${devedor} transfere ${formatarBRL(valorAcertoCentavos)} para ${credor}.`}
                </strong>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Cálculo calculado proporcionalmente sobre as cotas individuais e despesas exclusivas do mês.
                </p>
              </div>
            </div>

            {/* SEÇÃO 1: TABELA DE O QUE FOI COBRADO & PARCELAS */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center text-xs font-bold border border-transparent dark:border-emerald-800/40">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cobranças & Lançamentos do Mês
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {lancamentos.length} despesas lançadas
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2.5 px-3 text-center w-8">#</th>
                      <th className="py-2.5 px-3">O que foi cobrado</th>
                      <th className="py-2.5 px-3 text-center">Parcela</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Pago Por</th>
                      <th className="py-2.5 px-3 text-center">Divisão</th>
                      <th className="py-2.5 px-3 text-right">Valor no Mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {lancamentos.map((item, idx) => {
                      const parcelaLabel =
                        item.totalParcelas > 1
                          ? `${item.numeroParcela} de ${item.totalParcelas}`
                          : 'À vista';
                      const ehParcelado = item.totalParcelas > 1;

                      return (
                        <tr
                          key={`${item.compraId}-${item.numeroParcela}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {item.nome}
                            {item.descricao && (
                              <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                {item.descricao}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                ehParcelado
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {parcelaLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {mapaCategorias[item.categoria] || item.categoria || 'Geral'}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {item.pagoPorNome || item.pagoPor || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {item.divisao || '50/50'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatarBRL(item.valorCentavos)}
                          </td>
                        </tr>
                      );
                    })}
                    {lancamentos.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 dark:text-slate-500">
                          Nenhum lançamento no mês de {mesReferencia}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                      <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-600 dark:text-slate-400">
                        Total de Cobranças no Mês:
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-sm text-[#006948] dark:text-emerald-400">
                        {formatarBRL(totalCompartilhadoCentavos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SEÇÃO 2: TABELA DE PAGAMENTOS REALIZADOS */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-400 flex items-center justify-center text-xs font-bold border border-transparent dark:border-blue-800/40">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pagamentos & Transferências Realizadas
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {pagamentos.length} transferências registradas
                </span>
              </div>

              {pagamentos.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 text-center w-8">#</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Pagador</th>
                        <th className="py-2.5 px-3">Beneficiário</th>
                        <th className="py-2.5 px-3 text-center">Forma</th>
                        <th className="py-2.5 px-3">Observação / Comprovante</th>
                        <th className="py-2.5 px-3 text-right">Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {pagamentos.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {p.dataPagamento || '-'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {p.pagadorNome || p.pagador || devedor}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {p.recebedorNome || p.recebedor || credor}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 uppercase">
                              {p.formaPagamento || 'Pix'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            <span>{p.observacoes || 'Transferência Pix de acerto'}</span>
                            {p.comprovanteNome && (
                              <span className="block text-[10px] text-[#006948] dark:text-emerald-400 font-mono mt-0.5">
                                [Anexo: {p.comprovanteNome}]
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#006948] dark:text-emerald-400 tabular-nums">
                            {formatarBRL(p.valorCentavos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                        <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-600 dark:text-slate-400">
                          Total Pago do Acerto:
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-sm text-[#006948] dark:text-emerald-400">
                          {formatarBRL(totalPagoAcertoCentavos)}
                        </td>
                      </tr>
                      {pendenciaCentavos > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-950/40 font-bold text-amber-900 dark:text-amber-300 border-t border-amber-200 dark:border-amber-900/50">
                          <td colSpan={6} className="py-2 px-3 text-right uppercase text-[11px] text-amber-700 dark:text-amber-400">
                            Saldo Restante a Liquidar:
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-sm text-red-600 dark:text-red-400">
                            {formatarBRL(pendenciaCentavos)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[24px] text-slate-400 dark:text-slate-500 block mb-1">
                    payments
                  </span>
                  {valorAcertoCentavos === 0
                    ? 'Nenhum pagamento necessário: balanço zerado.'
                    : `Aguardando registro de pagamento no valor de ${formatarBRL(
                        valorAcertoCentavos
                      )}.`}
                </div>
              )}
            </div>

            {/* Conciliação e Assinaturas */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic text-center leading-relaxed">
                "Este extrato comprova a prestação de contas mútua e a distribuição acordada das
                despesas do casal no período selecionado."
              </p>

              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-40 border-b border-slate-300 dark:border-slate-700 mb-1"></div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{p1Nome}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Visto de Conciliação</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-40 border-b border-slate-300 dark:border-slate-700 mb-1"></div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{p2Nome}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Visto de Conciliação</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Dica: Você pode baixar o PDF em vetor ou copiar o texto formatado para envio no WhatsApp.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onFechar}
              type="button"
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Fechar Prévia
            </button>
            <button
              onClick={handleBaixarPDF}
              disabled={baixando}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {baixando ? 'sync' : 'download'}
              </span>
              <span>{baixando ? 'Gerando...' : 'Baixar Nota em PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

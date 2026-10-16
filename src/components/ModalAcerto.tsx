import React, { useState, useEffect } from 'react';
import { FechamentoMensal, PagamentoAcerto, ResumoAcerto, UsuarioId } from '../types';
import { formatarBRL, parseBRLParaCentavos } from '../calculations/acertoMensal';

interface ModalAcertoProps {
  aberto: boolean;
  onFechar: () => void;
  resumoAcerto: ResumoAcerto;
  fechamentoAtual?: FechamentoMensal;
  usuarioAtual: UsuarioId;
  onRegistrarPagamento: (
    pagamento: Omit<PagamentoAcerto, 'id'>,
    marcarComoQuitado: boolean
  ) => void;
}

export const ModalAcerto: React.FC<ModalAcertoProps> = ({
  aberto,
  onFechar,
  resumoAcerto,
  fechamentoAtual,
  usuarioAtual,
  onRegistrarPagamento,
}) => {
  const [valorInput, setValorInput] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'ted' | 'dinheiro'>('pix');
  const [observacoes, setObservacoes] = useState('Acerto compensatório via Pix');
  const [comprovanteNome, setComprovanteNome] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  // Determina o saldo a pagar
  const valorASerPagoCentavos = (() => {
    if (fechamentoAtual) {
      const pago = fechamentoAtual.pagamentos.reduce((acc, p) => acc + p.valorCentavos, 0);
      const pendente = Math.max(0, Math.abs(fechamentoAtual.saldoOriginalCentavos) - pago);
      return pendente;
    }
    return resumoAcerto.valorAcertoCentavos;
  })();

  useEffect(() => {
    if (aberto) {
      setValorInput((valorASerPagoCentavos / 100).toFixed(2).replace('.', ','));
      setDataPagamento(new Date().toISOString().slice(0, 10));
      setObservacoes('Acerto compensatório mensal');
      setComprovanteNome(null);
      setPixCopiado(false);
    }
  }, [aberto, valorASerPagoCentavos]);

  if (!aberto) return null;

  const credor: UsuarioId =
    fechamentoAtual?.credor !== 'Nenhum' && fechamentoAtual?.credor
      ? fechamentoAtual.credor
      : resumoAcerto.credor !== 'Nenhum'
      ? resumoAcerto.credor
      : 'Vinicius';

  const devedor: UsuarioId =
    fechamentoAtual?.devedor !== 'Nenhum' && fechamentoAtual?.devedor
      ? fechamentoAtual.devedor
      : resumoAcerto.devedor !== 'Nenhum'
      ? resumoAcerto.devedor
      : 'Silvia';

  const chavePixCredor = credor === 'Vinicius' ? 'vinicius@email.com' : 'silvia@email.com';

  const handleCopiarPix = () => {
    navigator.clipboard.writeText(chavePixCredor);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  };

  const handleSalvar = (marcarComoQuitado: boolean) => {
    const valorCentavos = parseBRLParaCentavos(valorInput);
    if (valorCentavos <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    onRegistrarPagamento(
      {
        dataPagamento,
        valorCentavos,
        formaPagamento,
        pagador: devedor,
        recebedor: credor,
        observacoes,
        comprovanteNome: comprovanteNome || undefined,
      },
      marcarComoQuitado
    );
    onFechar();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-acerto-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white w-full max-w-[800px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#006948] text-white flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[26px]">balance</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="modal-acerto-title" className="text-xl font-bold text-slate-900">
                  Acerto de {resumoAcerto.mesReferencia}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    resumoAcerto.valorAcertoCentavos === 0
                      ? 'bg-emerald-100 text-[#006948]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {resumoAcerto.valorAcertoCentavos === 0
                    ? 'Totalmente Equilibrado'
                    : 'Pendente de Acerto'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detalhes do cálculo colaborativo e liquidação transparente da fatura mensal.
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            type="button"
            className="self-end sm:self-center w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-6 max-h-[calc(85vh-140px)] overflow-y-auto">
          {/* BLOCO 1: AUDITORIA MATEMÁTICA */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                1. Auditoria Matemática & Regra de Divisão
              </span>
              <span className="text-xs text-[#006948] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Rateio Dinâmico Automatizado
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Coluna Vinicius / P1 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0051d5] text-white flex items-center justify-center text-xs font-bold uppercase">
                      {(resumoAcerto.p1Name || 'V').charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-900">Total Pago por {resumoAcerto.p1Name || 'Vinicius'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0051d5] text-[10px] font-bold">
                    Pago
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {formatarBRL(resumoAcerto.totalPagoP1Centavos)}
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span>Cota proporcional de {resumoAcerto.p2Name || 'Silvia'}:</span>
                  <span className="font-bold text-[#0051d5] tabular-nums">
                    {formatarBRL(resumoAcerto.cotaP2EsperadaCentavos ?? resumoAcerto.cotaP2Em5050Centavos)}
                  </span>
                </div>
              </div>

              {/* Coluna P2 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#712ae2] text-white flex items-center justify-center text-xs font-bold uppercase">
                      {(resumoAcerto.p2Name || 'S').charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-900">Total Pago por {resumoAcerto.p2Name || 'Silvia'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#712ae2] text-[10px] font-bold">
                    Pago
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {formatarBRL(resumoAcerto.totalPagoP2Centavos)}
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span>Cota proporcional de {resumoAcerto.p1Name || 'Vinicius'}:</span>
                  <span className="font-bold text-[#712ae2] tabular-nums">
                    {formatarBRL(resumoAcerto.cotaP1EsperadaCentavos ?? resumoAcerto.cotaP1Em5050Centavos)}
                  </span>
                </div>
              </div>
            </div>

            {/* Despesas Exclusivas / Individuais */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="material-symbols-outlined text-[18px] text-slate-400">info</span>
                <span>Despesas Exclusivas / Individuais pagas pelo parceiro no ciclo:</span>
              </div>
              <div className="flex items-center gap-3 font-semibold text-slate-900 tabular-nums">
                <span>
                  {resumoAcerto.p1Name || 'Vinicius'} p/ {resumoAcerto.p2Name || 'Silvia'}:{' '}
                  {formatarBRL(
                    resumoAcerto.detalhesExclusivosCentavos.p1PagouParaP2 ??
                      resumoAcerto.detalhesExclusivosCentavos.viniciusPagouParaSilvia ??
                      0
                  )}
                </span>
                <span>•</span>
                <span>
                  {resumoAcerto.p2Name || 'Silvia'} p/ {resumoAcerto.p1Name || 'Vinicius'}:{' '}
                  {formatarBRL(
                    resumoAcerto.detalhesExclusivosCentavos.p2PagouParaP1 ??
                      resumoAcerto.detalhesExclusivosCentavos.silviaPagouParaVinicius ??
                      0
                  )}
                </span>
              </div>
            </div>

            {/* Veredito do Acerto */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-slate-50 to-blue-50 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#006948] shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[24px]">price_check</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Diferença Líquida Apurada
                  </span>
                  <div className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    {resumoAcerto.valorAcertoCentavos === 0 ? (
                      <span className="text-[#006948]">Nenhuma dívida entre o casal neste mês</span>
                    ) : (
                      <>
                        <span>{devedor} paga</span>
                        <span className="text-[#006948] font-extrabold tabular-nums">
                          {formatarBRL(resumoAcerto.valorAcertoCentavos)}
                        </span>
                        <span>a {credor}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[#006948] text-xs font-bold shadow-sm self-start sm:self-center flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Liquida o Mês</span>
              </div>
            </div>
          </section>

          {/* Divisor */}
          <div className="w-full h-px bg-slate-200"></div>

          {/* BLOCO 2: FORMULÁRIO DE QUITAÇÃO & TRANSFERÊNCIA */}
          <section className="flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              2. Formulário de Quitação & Transferência
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Valor com opção de pagamento parcial */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Valor a transferir / pago</span>
                  {valorASerPagoCentavos > 20000 && (
                    <button
                      type="button"
                      onClick={() => setValorInput('200,00')}
                      className="text-[#0051d5] hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Pagar parcial R$ 200,00 agora
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-semibold text-sm">R$</span>
                  <input
                    type="text"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30"
                  />
                </div>
              </div>

              {/* Data do Pagamento */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Data do Pagamento</label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 cursor-pointer"
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('pix')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formaPagamento === 'pix'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#006948]">qr_code_2</span>
                    <span>Pix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('ted')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formaPagamento === 'ted'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    <span>TED / Conta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formaPagamento === 'dinheiro'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Dinheiro</span>
                  </button>
                </div>
              </div>

              {/* Chave Pix do Credor com Copia e Cola */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006948] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">key</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      Chave Pix de {credor} (Destinatário)
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {chavePixCredor}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopiarPix}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-center"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {pixCopiado ? 'check' : 'content_copy'}
                  </span>
                  <span>{pixCopiado ? 'Copiado!' : 'Copiar Chave'}</span>
                </button>
              </div>

              {/* Comprovante / Anexo Simulado */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Comprovante / Anexo (Opcional)</label>
                <div className="relative p-4 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setComprovanteNome(file.name);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="material-symbols-outlined text-[24px] text-[#006948] mb-1">
                    cloud_upload
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {comprovanteNome
                      ? `Arquivo selecionado: ${comprovanteNome}`
                      : 'Clique ou arraste o comprovante aqui (PDF, PNG ou JPG)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Suporta até 5MB</span>
                </div>
              </div>

              {/* Observações */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Observações</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Acerto parcial ref. primeira quinzena"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSalvar(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Salvar Pagamento do Acerto
            </button>
            <button
              type="button"
              onClick={() => handleSalvar(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Salvar e Marcar Mês como Quitado</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

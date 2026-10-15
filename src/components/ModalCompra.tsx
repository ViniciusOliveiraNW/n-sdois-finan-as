import React, { useState, useEffect } from 'react';
import { CategoriaId, Compra, CoupleSpace, DivisaoTipo, UsuarioId } from '../types';
import { CATEGORIAS_PADRAO } from '../data/initialData';
import { calcularValoresParcelas, calcularMesesParcelas } from '../calculations/parcelas';
import { formatarBRL } from '../calculations/acertoMensal';

interface ModalCompraProps {
  aberto: boolean;
  onFechar: () => void;
  compraEmEdicao: Compra | null;
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  onSalvarCompra: (compra: Compra) => void;
}

export const ModalCompra: React.FC<ModalCompraProps> = ({
  aberto,
  onFechar,
  compraEmEdicao,
  usuarioAtual,
  couple,
  onSalvarCompra,
}) => {
  const p1Name = couple?.partner1Name || 'Vinicius';
  const p1Uid = couple?.partner1Uid || 'Vinicius';
  const p2Name = couple?.partner2Name || 'Silvia';
  const p2Uid = couple?.partner2Uid || 'Silvia';

  const [nome, setNome] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [categoria, setCategoria] = useState<CategoriaId>('Mercado');
  const [dataPrimeiroPagamento, setDataPrimeiroPagamento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tipoCobranca, setTipoCobranca] = useState<'a_vista' | 'parcelado'>('a_vista');
  const [numeroDeParcelas, setNumeroDeParcelas] = useState(1);
  const [pagoPor, setPagoPor] = useState<string>(p1Name);
  const [divisao, setDivisao] = useState<DivisaoTipo>('50/50');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Inicializa o formulário com dados da compra em edição ou padrão
  useEffect(() => {
    if (compraEmEdicao) {
      setNome(compraEmEdicao.nome);
      const valorReais = compraEmEdicao.valorCentavos
        ? compraEmEdicao.valorCentavos / 100
        : compraEmEdicao.valor;
      setValorInput(valorReais.toFixed(2).replace('.', ','));
      setCategoria(compraEmEdicao.categoria);
      setDataPrimeiroPagamento(compraEmEdicao.dataPrimeiroPagamento);
      const parcelas = compraEmEdicao.numeroDeParcelas || 1;
      setNumeroDeParcelas(parcelas);
      setTipoCobranca(parcelas > 1 ? 'parcelado' : 'a_vista');
      setPagoPor(compraEmEdicao.pagoPorNome || compraEmEdicao.pagoPor || p1Name);
      setDivisao(compraEmEdicao.divisao);
      setDescricao(compraEmEdicao.descricao || '');
    } else {
      setNome('');
      setValorInput('');
      setCategoria('Mercado');
      setDataPrimeiroPagamento(new Date().toISOString().slice(0, 10));
      setTipoCobranca('a_vista');
      setNumeroDeParcelas(1);
      // Padrão: quem está logado
      const defaultPayer =
        usuarioAtual === p2Uid || usuarioAtual === p2Name ? p2Name : p1Name;
      setPagoPor(defaultPayer);
      setDivisao('50/50');
      setDescricao('');
    }
    setErro(null);
  }, [compraEmEdicao, aberto, usuarioAtual, p1Name, p2Name, p1Uid, p2Uid]);

  if (!aberto) return null;

  // Cálculo de simulação de parcelas em tempo real
  const valorCentavosLimpo = (() => {
    const limpo = valorInput.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(limpo);
    return isNaN(parsed) || parsed <= 0 ? 0 : Math.round(parsed * 100);
  })();

  const parcelasSimuladas = (() => {
    if (valorCentavosLimpo <= 0 || numeroDeParcelas <= 0) return null;
    try {
      const valores = calcularValoresParcelas(valorCentavosLimpo, numeroDeParcelas);
      const meses = calcularMesesParcelas(dataPrimeiroPagamento, numeroDeParcelas);
      return { valores, meses };
    } catch {
      return null;
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setErro('Informe o nome do estabelecimento ou item.');
      return;
    }

    if (valorCentavosLimpo <= 0) {
      setErro('Informe um valor financeiro válido e maior que zero.');
      return;
    }

    if (!dataPrimeiroPagamento) {
      setErro('Informe a data do pagamento.');
      return;
    }

    const parcelasFinais = tipoCobranca === 'a_vista' ? 1 : numeroDeParcelas;

    let ultimaParcelaAtivaFinal = parcelasFinais;
    if (compraEmEdicao) {
      const limiteAnterior =
        compraEmEdicao.ultimaParcelaAtiva ?? compraEmEdicao.numeroDeParcelas ?? 1;
      const estavaTotalmenteAtiva = limiteAnterior >= compraEmEdicao.numeroDeParcelas;
      if (estavaTotalmenteAtiva) {
        ultimaParcelaAtivaFinal = parcelasFinais;
      } else {
        ultimaParcelaAtivaFinal = Math.min(limiteAnterior, parcelasFinais);
      }
    }

    const ehP1 = pagoPor === p1Name || pagoPor === p1Uid;
    const pagoPorNomeFinal = ehP1 ? p1Name : p2Name;
    const pagoPorUidFinal = ehP1 ? p1Uid : p2Uid;

    const cadastradoPorUidFinal =
      compraEmEdicao?.cadastradoPorUid ||
      (usuarioAtual === p1Name ? p1Uid : usuarioAtual === p2Name ? p2Uid : usuarioAtual);
    const cadastradoPorNomeFinal =
      compraEmEdicao?.cadastradoPorNome ||
      compraEmEdicao?.cadastradoPor ||
      (usuarioAtual === p2Uid ? p2Name : p1Name);

    const compraSalva: Compra = {
      id: compraEmEdicao?.id || crypto.randomUUID(),
      coupleId: couple?.id,
      nome: nomeTrim,
      valor: valorCentavosLimpo / 100,
      valorCentavos: valorCentavosLimpo,
      pagoPor: pagoPorNomeFinal,
      pagoPorNome: pagoPorNomeFinal,
      pagoPorUid: pagoPorUidFinal,
      cadastradoPor: cadastradoPorNomeFinal,
      cadastradoPorNome: cadastradoPorNomeFinal,
      cadastradoPorUid: cadastradoPorUidFinal,
      divisao,
      categoria,
      dataPrimeiroPagamento,
      numeroDeParcelas: parcelasFinais,
      ultimaParcelaAtiva: ultimaParcelaAtivaFinal,
      descricao: descricao.trim() || undefined,
    };

    onSalvarCompra(compraSalva);
    onFechar();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-compra-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white w-full max-w-[680px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006948] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">
                {compraEmEdicao ? 'edit_note' : 'receipt_long'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-compra-title" className="text-lg font-bold text-slate-900">
                  {compraEmEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006948] text-[11px] font-semibold">
                  NósDois Finanças
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {compraEmEdicao
                  ? `Criado originalmente por ${compraEmEdicao.cadastradoPorNome || compraEmEdicao.cadastradoPor}`
                  : 'Registre uma despesa e defina a divisão justa entre o casal'}
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            type="button"
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {erro && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{erro}</span>
            </div>
          )}

          {/* Row 1: Estabelecimento & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7 flex flex-col gap-1.5">
              <label htmlFor="compra-nome" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">storefront</span>
                <span>Estabelecimento ou Item</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                id="compra-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Supermercado, Farmácia, Luz, Jantar..."
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <label htmlFor="compra-valor" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">attach_money</span>
                <span>Valor Total (R$)</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-semibold text-xs">R$</span>
                <input
                  id="compra-valor"
                  type="text"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Categoria & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="compra-cat" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">category</span>
                <span>Categoria</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                id="compra-cat"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaId)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 cursor-pointer"
              >
                {CATEGORIAS_PADRAO.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icone} {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="compra-data" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">calendar_today</span>
                <span>Data do 1º Pagamento</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                id="compra-data"
                type="date"
                value={dataPrimeiroPagamento}
                onChange={(e) => setDataPrimeiroPagamento(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Row 3: Tipo de Cobrança & Parcelas */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006948]">credit_card</span>
                <span className="text-xs font-semibold text-slate-900">Tipo de Cobrança</span>
              </div>
              <div className="inline-flex p-1 bg-white rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setTipoCobranca('a_vista');
                    setNumeroDeParcelas(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    tipoCobranca === 'a_vista'
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  À vista (1x)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoCobranca('parcelado');
                    if (numeroDeParcelas <= 1) setNumeroDeParcelas(2);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    tipoCobranca === 'parcelado'
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Parcelado
                </button>
              </div>
            </div>

            {tipoCobranca === 'parcelado' && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="num-parcelas" className="text-xs text-slate-600 font-medium">
                    Número de Parcelas:
                  </label>
                  <select
                    id="num-parcelas"
                    value={numeroDeParcelas}
                    onChange={(e) => setNumeroDeParcelas(parseInt(e.target.value, 10))}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-semibold cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                      <option key={num} value={num}>
                        {num}x ({num} meses)
                      </option>
                    ))}
                  </select>
                </div>

                {parcelasSimuladas && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#006948] text-xs font-bold tabular-nums">
                      {numeroDeParcelas}x de {formatarBRL(parcelasSimuladas.valores[0])}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {parcelasSimuladas.meses[0]} até{' '}
                      {parcelasSimuladas.meses[parcelasSimuladas.meses.length - 1]}
                    </span>
                  </div>
                )}
              </div>
            )}

            {tipoCobranca === 'parcelado' && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0 mt-0.5">
                  info
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Regra de centavos:</strong> quando o valor não
                  divide igualmente, a última parcela absorve a diferença (ex: R$ 100 em 3x =
                  33,33 + 33,33 + 33,34).
                </p>
              </div>
            )}
          </div>

          {/* Row 4: Quem Pagou */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#006948]">
                account_balance_wallet
              </span>
              <span>Quem pagou a compra?</span>
              <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Parceiro 1 */}
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  pagoPor === p1Name || pagoPor === p1Uid
                    ? 'bg-blue-50/70 border-[#0051d5] shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="pagoPor"
                    value={p1Name}
                    checked={pagoPor === p1Name || pagoPor === p1Uid}
                    onChange={() => setPagoPor(p1Name)}
                    className="sr-only"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#0051d5] text-white flex items-center justify-center font-bold text-xs uppercase">
                    {p1Name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{p1Name}</span>
                      {(usuarioAtual === p1Uid || usuarioAtual === p1Name) && (
                        <span className="text-[10px] text-[#0051d5] font-semibold">(Você)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">Cartão / Pix dele(a)</span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    pagoPor === p1Name || pagoPor === p1Uid ? 'bg-[#0051d5] text-white' : 'border border-slate-300'
                  }`}
                >
                  {(pagoPor === p1Name || pagoPor === p1Uid) && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </div>
              </label>

              {/* Parceiro 2 */}
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  pagoPor === p2Name || pagoPor === p2Uid
                    ? 'bg-purple-50/70 border-[#712ae2] shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="pagoPor"
                    value={p2Name}
                    checked={pagoPor === p2Name || pagoPor === p2Uid}
                    onChange={() => setPagoPor(p2Name)}
                    className="sr-only"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#712ae2] text-white flex items-center justify-center font-bold text-xs uppercase">
                    {p2Name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{p2Name}</span>
                      {(usuarioAtual === p2Uid || usuarioAtual === p2Name) && (
                        <span className="text-[10px] text-[#712ae2] font-semibold">(Você)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">Cartão / Pix dele(a)</span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    pagoPor === p2Name || pagoPor === p2Uid ? 'bg-[#712ae2] text-white' : 'border border-slate-300'
                  }`}
                >
                  {(pagoPor === p2Name || pagoPor === p2Uid) && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Row 5: Divisão da Compra */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#006948]">pie_chart</span>
              <span>Como será dividida esta compra?</span>
              <span className="text-red-500">*</span>
            </span>

            <div className="space-y-2">
              {/* 50/50 */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                  divisao === '50/50'
                    ? 'bg-emerald-50/40 border-[#006948] ring-1 ring-[#006948]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="divisao"
                      value="50/50"
                      checked={divisao === '50/50'}
                      onChange={() => setDivisao('50/50')}
                      className="text-[#006948] focus:ring-[#006948]"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      ⚖️ 50% / 50% (Compartilhada pelo casal)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006948] text-[10px] font-bold">
                    Recomendado
                  </span>
                </div>
                {valorCentavosLimpo > 0 && divisao === '50/50' && (
                  <div className="pl-6 text-[11px] text-slate-600 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span>Cota {p1Name}: {formatarBRL(Math.floor(valorCentavosLimpo / 2))}</span>
                      <span>Cota {p2Name}: {formatarBRL(Math.floor(valorCentavosLimpo / 2))}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full flex overflow-hidden">
                      <div className="bg-[#0051d5] h-full w-1/2"></div>
                      <div className="bg-[#712ae2] h-full w-1/2"></div>
                    </div>
                    <span className="text-[#006948] font-medium mt-0.5">
                      {pagoPor === p1Name || pagoPor === p1Uid
                        ? `${p2Name} ficará devendo ${formatarBRL(
                            Math.floor(valorCentavosLimpo / 2)
                          )} para ${p1Name} no acerto.`
                        : `${p1Name} ficará devendo ${formatarBRL(
                            Math.floor(valorCentavosLimpo / 2)
                          )} para ${p2Name} no acerto.`}
                    </span>
                  </div>
                )}
              </label>

              {/* Somente P1 */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  divisao === p1Uid || divisao === p1Name || divisao === 'Vinicius'
                    ? 'bg-blue-50/50 border-[#0051d5]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="divisao"
                    value={p1Uid}
                    checked={divisao === p1Uid || divisao === p1Name || divisao === 'Vinicius'}
                    onChange={() => setDivisao(p1Uid)}
                    className="text-[#0051d5] focus:ring-[#0051d5]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      👤 Somente {p1Name} (Despesa individual dele(a))
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {pagoPor === p1Name || pagoPor === p1Uid
                        ? `${p1Name} pagou para si mesmo(a). Não cria dívida no acerto.`
                        : `${p2Name} pagou por ${p1Name}. ${p1Name} ficará devendo 100% a ${p2Name}.`}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0051d5] text-[10px] font-bold">
                  100% {p1Name}
                </span>
              </label>

              {/* Somente P2 */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  divisao === p2Uid || divisao === p2Name || divisao === 'Silvia'
                    ? 'bg-purple-50/50 border-[#712ae2]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="divisao"
                    value={p2Uid}
                    checked={divisao === p2Uid || divisao === p2Name || divisao === 'Silvia'}
                    onChange={() => setDivisao(p2Uid)}
                    className="text-[#712ae2] focus:ring-[#712ae2]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      👤 Somente {p2Name} (Despesa individual dele(a))
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {pagoPor === p2Name || pagoPor === p2Uid
                        ? `${p2Name} pagou para si mesmo(a). Não cria dívida no acerto.`
                        : `${p1Name} pagou por ${p2Name}. ${p2Name} ficará devendo 100% a ${p1Name}.`}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#712ae2] text-[10px] font-bold">
                  100% {p2Name}
                </span>
              </label>
            </div>
          </div>

          {/* Row 6: Descrição Opcional */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="compra-desc" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-400">notes</span>
              <span>Descrição / Observações</span>
              <span className="text-slate-400 text-[11px] font-normal">(opcional)</span>
            </label>
            <input
              id="compra-desc"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Frutas e itens de limpeza, ceia especial, etc."
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#006948] hover:bg-[#005137] text-white text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{compraEmEdicao ? 'Salvar Alterações' : 'Salvar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CategoriaId, CategoriaMeta, Compra, CoupleSpace, DivisaoTipo, UsuarioId } from '../types';
import { CATEGORIAS_PADRAO } from '../data/initialData';
import { calcularValoresParcelas, calcularMesesParcelas } from '../calculations/parcelas';
import { formatarBRL, parseDivisaoPercentuais } from '../calculations/acertoMensal';
import { CategoryIconOrImage } from './CategoryIconOrImage';

interface ModalCompraProps {
  aberto: boolean;
  onFechar: () => void;
  compraEmEdicao: Compra | null;
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  categorias?: CategoriaMeta[];
  onSalvarCompra: (compra: Compra) => void;
}

export const ModalCompra: React.FC<ModalCompraProps> = ({
  aberto,
  onFechar,
  compraEmEdicao,
  usuarioAtual,
  couple,
  categorias,
  onSalvarCompra,
}) => {
  const listaCategorias = categorias && categorias.length > 0 ? categorias : CATEGORIAS_PADRAO;
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
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [customP1, setCustomP1] = useState(50);
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
      const { percP1 } = parseDivisaoPercentuais(
        compraEmEdicao.divisao,
        p1Uid,
        p2Uid,
        [p1Name, 'p1'],
        [p2Name, 'p2']
      );
      setCustomP1(percP1);
      const presetsPadroes = ['50/50', '70/30', '30/70', '60/40', '40/60', '100/0', '0/100', p1Uid, p2Uid];
      setMostrarPersonalizado(!presetsPadroes.includes(compraEmEdicao.divisao));
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
      const splitPadrao = couple?.defaultSplit || '50/50';
      setDivisao(splitPadrao);
      const { percP1 } = parseDivisaoPercentuais(splitPadrao, p1Uid, p2Uid, [p1Name, 'p1'], [p2Name, 'p2']);
      setCustomP1(percP1);
      setMostrarPersonalizado(false);
      setDescricao('');
    }
    setErro(null);
  }, [compraEmEdicao, aberto, usuarioAtual, p1Name, p2Name, p1Uid, p2Uid, couple?.defaultSplit]);

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
              <label htmlFor="compra-cat" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#006948]">category</span>
                  <span>Categoria</span>
                  <span className="text-red-500">*</span>
                </span>
                {(() => {
                  const catAtual = listaCategorias.find((c) => c.id === categoria);
                  return catAtual?.imagemUrl ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                      Foto CDN
                    </span>
                  ) : null;
                })()}
              </label>
              <div className="flex items-center gap-2">
                {(() => {
                  const catAtual = listaCategorias.find((c) => c.id === categoria);
                  return (
                    <CategoryIconOrImage
                      icone={catAtual?.icone}
                      imagemUrl={catAtual?.imagemUrl}
                      nome={catAtual?.nome}
                      size="md"
                      className="shrink-0"
                    />
                  );
                })()}
                <select
                  id="compra-cat"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaId)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/30 cursor-pointer"
                >
                  {listaCategorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icone} {cat.nome} {cat.imagemUrl ? '• (CDN)' : ''}
                    </option>
                  ))}
                </select>
              </div>
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

          {/* Row 5: Divisão da Compra Dinâmica */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">pie_chart</span>
                <span>Regime de Divisão desta Compra</span>
                <span className="text-red-500">*</span>
              </span>
              <button
                type="button"
                onClick={() => setMostrarPersonalizado(!mostrarPersonalizado)}
                className="text-[11px] font-semibold text-[#006948] hover:text-[#005137] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>{mostrarPersonalizado ? 'Ocultar Personalizado' : 'Ajuste Fino (%)'}</span>
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '50/50', label: '⚖️ 50 / 50', desc: 'Meio a meio' },
                { id: '70/30', label: `📊 70 / 30`, desc: `70% ${p1Name}` },
                { id: '30/70', label: `📊 30 / 70`, desc: `70% ${p2Name}` },
                { id: '60/40', label: `📊 60 / 40`, desc: `60% ${p1Name}` },
                { id: '40/60', label: `📊 40 / 60`, desc: `60% ${p2Name}` },
                { id: '100/0', label: `👤 100 / 0`, desc: `Só ${p1Name}` },
                { id: '0/100', label: `👤 0 / 100`, desc: `Só ${p2Name}` },
                { id: 'custom', label: '⚙️ Outro %', desc: 'Customizado' },
              ].map((opcao) => {
                const ativo =
                  opcao.id === 'custom'
                    ? mostrarPersonalizado
                    : (divisao === opcao.id ||
                       (opcao.id === '100/0' && (divisao === '100/0' || divisao === p1Uid || divisao === p1Name)) ||
                       (opcao.id === '0/100' && (divisao === '0/100' || divisao === p2Uid || divisao === p2Name))) &&
                      !mostrarPersonalizado;

                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => {
                      if (opcao.id === 'custom') {
                        setMostrarPersonalizado(true);
                      } else {
                        setMostrarPersonalizado(false);
                        setDivisao(opcao.id);
                        const { percP1 } = parseDivisaoPercentuais(
                          opcao.id,
                          p1Uid,
                          p2Uid,
                          [p1Name, 'p1'],
                          [p2Name, 'p2']
                        );
                        setCustomP1(percP1);
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                      ativo
                        ? 'bg-emerald-50/70 border-[#006948] ring-1 ring-[#006948]'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {opcao.label}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate leading-tight">
                      {opcao.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Rateio Personalizado (Slider + Inputs) */}
            {mostrarPersonalizado && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">sliders</span>
                    <span>Definir Porcentagens Livres do Casal</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    {customP1}% + {100 - customP1}% = 100%
                  </span>
                </div>

                {/* Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="text-[#0051d5]">{p1Name}: {customP1}%</span>
                    <span className="text-[#712ae2]">{p2Name}: {100 - customP1}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={customP1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setCustomP1(v);
                      setDivisao(`${v}/${100 - v}`);
                    }}
                    className="w-full accent-[#006948] cursor-pointer"
                  />
                </div>

                {/* Number Inputs diretos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5] shrink-0"></span>
                    <span className="text-[11px] font-semibold text-slate-600 truncate flex-1">{p1Name}:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customP1}
                      onChange={(e) => {
                        let v = parseInt(e.target.value, 10);
                        if (isNaN(v)) v = 0;
                        v = Math.max(0, Math.min(100, v));
                        setCustomP1(v);
                        setDivisao(`${v}/${100 - v}`);
                      }}
                      className="w-12 text-right font-bold text-xs text-slate-900 border-none focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#712ae2] shrink-0"></span>
                    <span className="text-[11px] font-semibold text-slate-600 truncate flex-1">{p2Name}:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={100 - customP1}
                      onChange={(e) => {
                        let v = parseInt(e.target.value, 10);
                        if (isNaN(v)) v = 0;
                        v = Math.max(0, Math.min(100, v));
                        setCustomP1(100 - v);
                        setDivisao(`${100 - v}/${v}`);
                      }}
                      className="w-12 text-right font-bold text-xs text-slate-900 border-none focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Simulação em Tempo Real da Divisão */}
            {(() => {
              const { percP1, percP2 } = parseDivisaoPercentuais(
                divisao,
                p1Uid,
                p2Uid,
                [p1Name, 'p1'],
                [p2Name, 'p2']
              );
              const cotaP1 = Math.round((valorCentavosLimpo * percP1) / 100);
              const cotaP2 = valorCentavosLimpo - cotaP1;
              const ehPagadorP1 = pagoPor === p1Name || pagoPor === p1Uid;

              return (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 border border-slate-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#006948]">calculate</span>
                      <span>Impacto da Divisão no Acerto ({percP1}% / {percP2}%)</span>
                    </span>
                    <span className="font-bold text-[#006948]">
                      Total: {formatarBRL(valorCentavosLimpo)}
                    </span>
                  </div>

                  {/* Barra de Proporção Bi-Color */}
                  <div className="w-full bg-slate-200 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-[#0051d5] h-full transition-all duration-300"
                      style={{ width: `${percP1}%` }}
                      title={`${p1Name}: ${percP1}%`}
                    ></div>
                    <div
                      className="bg-[#712ae2] h-full transition-all duration-300"
                      style={{ width: `${percP2}%` }}
                      title={`${p2Name}: ${percP2}%`}
                    ></div>
                  </div>

                  {/* Cotas Monetárias */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 flex flex-col">
                      <span className="text-[#0051d5] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0051d5]"></span>
                        <span>Cota {p1Name} ({percP1}%)</span>
                      </span>
                      <strong className="text-slate-900 text-xs font-bold mt-0.5">
                        {formatarBRL(cotaP1)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100 flex flex-col">
                      <span className="text-[#712ae2] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#712ae2]"></span>
                        <span>Cota {p2Name} ({percP2}%)</span>
                      </span>
                      <strong className="text-slate-900 text-xs font-bold mt-0.5">
                        {formatarBRL(cotaP2)}
                      </strong>
                    </div>
                  </div>

                  {/* Explicação da Dívida e Ressarcimento */}
                  <div className="text-[11px] text-slate-600 bg-slate-100/70 p-2 rounded-lg flex items-start gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-[#006948] shrink-0 mt-0.5">
                      info
                    </span>
                    <span>
                      {ehPagadorP1 ? (
                        percP2 === 0 ? (
                          <span>
                            <strong>{p1Name}</strong> pagou 100% para si mesmo(a). Despesa individual que <strong>não cria débito</strong> no fechamento mensal.
                          </span>
                        ) : percP1 === 0 ? (
                          <span>
                            <strong>{p1Name}</strong> pagou 100% por <strong>{p2Name}</strong>. <strong>{p2Name}</strong> ficará devendo <strong>{formatarBRL(valorCentavosLimpo)}</strong> no acerto.
                          </span>
                        ) : (
                          <span>
                            Como <strong>{p1Name}</strong> pagou a conta inteira, <strong>{p2Name}</strong> ficará devendo sua cota de <strong>{formatarBRL(cotaP2)}</strong> ({percP2}%) no fechamento do mês.
                          </span>
                        )
                      ) : (
                        percP1 === 0 ? (
                          <span>
                            <strong>{p2Name}</strong> pagou 100% para si mesmo(a). Despesa individual que <strong>não cria débito</strong> no fechamento mensal.
                          </span>
                        ) : percP2 === 0 ? (
                          <span>
                            <strong>{p2Name}</strong> pagou 100% por <strong>{p1Name}</strong>. <strong>{p1Name}</strong> ficará devendo <strong>{formatarBRL(valorCentavosLimpo)}</strong> no acerto.
                          </span>
                        ) : (
                          <span>
                            Como <strong>{p2Name}</strong> pagou a conta inteira, <strong>{p1Name}</strong> ficará devendo sua cota de <strong>{formatarBRL(cotaP1)}</strong> ({percP1}%) no fechamento do mês.
                          </span>
                        )
                      )}
                    </span>
                  </div>
                </div>
              );
            })()}
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

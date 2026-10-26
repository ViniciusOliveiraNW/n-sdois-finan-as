import React, { useState, useEffect } from 'react';
import { CategoriaId, CategoriaMeta, Compra, CoupleSpace, DivisaoTipo, UsuarioId } from '../types';
import { CATEGORIAS_PADRAO, CATEGORIAS_PADRAO_INDIVIDUAIS } from '../data/initialData';
import { calcularValoresParcelas, calcularMesesParcelas } from '../calculations/parcelas';
import { formatarBRL, parseDivisaoPercentuais } from '../calculations/acertoMensal';
import { CategoryIconOrImage } from './CategoryIconOrImage';

interface ModalCompraProps {
  aberto: boolean;
  onFechar: () => void;
  compraEmEdicao: Compra | null;
  usuarioAtual: UsuarioId;
  usuarioUid?: string;
  couple?: CoupleSpace | null;
  categorias?: CategoriaMeta[];
  categoriasIndividuais?: CategoriaMeta[];
  modoPrivadoInicial?: boolean;
  onSalvarCompra: (compra: Compra) => void;
}

export const ModalCompra: React.FC<ModalCompraProps> = ({
  aberto,
  onFechar,
  compraEmEdicao,
  usuarioAtual,
  usuarioUid,
  couple,
  categorias,
  categoriasIndividuais,
  modoPrivadoInicial = false,
  onSalvarCompra,
}) => {
  const p1Name = couple?.partner1Name || 'Vinicius';
  const p1Uid = couple?.partner1Uid || 'Vinicius';
  const p2Name = couple?.partner2Name || 'Silvia';
  const p2Uid = couple?.partner2Uid || 'Silvia';

  // Identificação robusta do usuário atual entre Parceiro 1 e Parceiro 2
  const souP2 = Boolean(
    (usuarioUid && couple?.partner2Uid && usuarioUid === couple.partner2Uid) ||
    (usuarioAtual && (
      usuarioAtual === couple?.partner2Uid ||
      usuarioAtual === couple?.partner2Name ||
      usuarioAtual.toLowerCase().includes('silvia') ||
      (p2Name && usuarioAtual.toLowerCase().includes(p2Name.toLowerCase()))
    ))
  );
  const meuNome = usuarioAtual && usuarioAtual !== 'Você' ? usuarioAtual : (souP2 ? p2Name : p1Name);
  const meuUid = usuarioUid || (souP2 ? p2Uid : p1Uid);

  const [nome, setNome] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [categoria, setCategoria] = useState<CategoriaId>('Mercado');
  const [dataCompra, setDataCompra] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataPrimeiroPagamento, setDataPrimeiroPagamento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tipoCobranca, setTipoCobranca] = useState<'a_vista' | 'parcelado' | 'recorrente'>('a_vista');
  const [numeroDeParcelas, setNumeroDeParcelas] = useState(1);
  const [pagoPor, setPagoPor] = useState<string>(meuNome);
  const [divisao, setDivisao] = useState<DivisaoTipo>('50/50');
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [customP1, setCustomP1] = useState(50);
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Estados de Despesa Privada / Cofre Individual
  const [privada, setPrivada] = useState(false);
  const [segredoCasal, setSegredoCasal] = useState(false);
  const [formaPagamentoNome, setFormaPagamentoNome] = useState('');
  const [assinatura, setAssinatura] = useState(false);

  // Lista dinâmica de categorias: se privada, usa categorias individuais; senão, do casal
  const listaCategorias = privada
    ? (categoriasIndividuais && categoriasIndividuais.length > 0 ? categoriasIndividuais : CATEGORIAS_PADRAO_INDIVIDUAIS)
    : (categorias && categorias.length > 0 ? categorias : CATEGORIAS_PADRAO);

  // Inicializa o formulário com dados da compra em edição ou padrão
  useEffect(() => {
    if (compraEmEdicao) {
      setNome(compraEmEdicao.nome);
      const valorReais = compraEmEdicao.valorCentavos
        ? compraEmEdicao.valorCentavos / 100
        : compraEmEdicao.valor;
      setValorInput(valorReais.toFixed(2).replace('.', ','));
      setCategoria(compraEmEdicao.categoria);
      setDataCompra(compraEmEdicao.dataCompra || compraEmEdicao.dataPrimeiroPagamento || new Date().toISOString().slice(0, 10));
      setDataPrimeiroPagamento(compraEmEdicao.dataPrimeiroPagamento);
      
      if (compraEmEdicao.recorrente) {
        setTipoCobranca('recorrente');
        setNumeroDeParcelas(1);
      } else {
        const parcelas = compraEmEdicao.numeroDeParcelas || 1;
        setNumeroDeParcelas(parcelas);
        setTipoCobranca(parcelas > 1 ? 'parcelado' : 'a_vista');
      }

      const ehPrivada = Boolean(compraEmEdicao.privada);
      setPrivada(ehPrivada);

      if (ehPrivada) {
        // Despesa privada é obrigatoriamente paga por quem cadastrou/usuário atual
        setPagoPor(meuNome);
        setDivisao(souP2 ? '0/100' : '100/0');
      } else {
        setPagoPor(compraEmEdicao.pagoPorNome || compraEmEdicao.pagoPor || p1Name);
        setDivisao(compraEmEdicao.divisao);
      }

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
      setSegredoCasal(Boolean(compraEmEdicao.segredoCasal));
      setFormaPagamentoNome(compraEmEdicao.formaPagamentoNome || '');
      setAssinatura(Boolean(compraEmEdicao.assinatura));
    } else {
      setNome('');
      setValorInput('');
      const ehPrivada = Boolean(modoPrivadoInicial);
      setPrivada(ehPrivada);
      const catsIndiv = categoriasIndividuais && categoriasIndividuais.length > 0 ? categoriasIndividuais : CATEGORIAS_PADRAO_INDIVIDUAIS;
      const catsCasal = categorias && categorias.length > 0 ? categorias : CATEGORIAS_PADRAO;
      setCategoria(ehPrivada ? (catsIndiv[0]?.id || 'Lazer & Hobbies') : (catsCasal[0]?.id || 'Mercado'));
      const hoje = new Date().toISOString().slice(0, 10);
      setDataCompra(hoje);
      setDataPrimeiroPagamento(hoje);
      setTipoCobranca('a_vista');
      setNumeroDeParcelas(1);

      // Padrão do pagador: usuário atual
      setPagoPor(meuNome);

      if (ehPrivada) {
        setDivisao(souP2 ? '0/100' : '100/0');
      } else {
        const splitPadrao = couple?.defaultSplit || '50/50';
        setDivisao(splitPadrao);
        const { percP1 } = parseDivisaoPercentuais(splitPadrao, p1Uid, p2Uid, [p1Name, 'p1'], [p2Name, 'p2']);
        setCustomP1(percP1);
      }
      setMostrarPersonalizado(false);
      setDescricao('');
      setSegredoCasal(false);
      setFormaPagamentoNome('');
      setAssinatura(false);
    }
    setErro(null);
  }, [compraEmEdicao, aberto, usuarioAtual, p1Name, p2Name, p1Uid, p2Uid, couple?.defaultSplit, modoPrivadoInicial, meuNome, souP2]);

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

    const ehRecorrente = tipoCobranca === 'recorrente';
    const parcelasFinais = ehRecorrente ? 1 : (tipoCobranca === 'a_vista' ? 1 : numeroDeParcelas);

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
    // Se a compra for privada, o pagador é obrigatoriamente o usuário atual
    const pagoPorNomeFinal = privada ? meuNome : (ehP1 ? p1Name : p2Name);
    const pagoPorUidFinal = privada ? meuUid : (ehP1 ? p1Uid : p2Uid);
    const divisaoFinal = privada ? (souP2 ? '0/100' : '100/0') : divisao;

    const cadastradoPorUidFinal = compraEmEdicao?.cadastradoPorUid || meuUid;
    const cadastradoPorNomeFinal =
      compraEmEdicao?.cadastradoPorNome ||
      compraEmEdicao?.cadastradoPor ||
      meuNome;

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
      divisao: divisaoFinal,
      categoria,
      dataCompra: dataCompra || dataPrimeiroPagamento,
      dataPrimeiroPagamento,
      numeroDeParcelas: parcelasFinais,
      ultimaParcelaAtiva: ultimaParcelaAtivaFinal,
      descricao: descricao.trim() || undefined,
      privada,
      segredoCasal: privada ? segredoCasal : false,
      formaPagamentoNome: formaPagamentoNome.trim() || undefined,
      assinatura: ehRecorrente ? true : (privada ? assinatura : false),
      recorrente: ehRecorrente,
      dataFimRecorrencia: ehRecorrente ? compraEmEdicao?.dataFimRecorrencia : undefined,
    };

    onSalvarCompra(compraSalva);
    onFechar();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-compra-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#161f2e] w-full max-w-[680px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006948] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">
                {compraEmEdicao ? 'edit_note' : 'receipt_long'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-compra-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {compraEmEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 text-[11px] font-semibold border border-transparent dark:border-emerald-800/40">
                  NósDois Finanças
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {compraEmEdicao
                  ? `Criado originalmente por ${compraEmEdicao.cadastradoPorNome || compraEmEdicao.cadastradoPor}`
                  : 'Registre uma despesa e defina a divisão justa entre o casal'}
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            type="button"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700"
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
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{erro}</span>
            </div>
          )}

          {/* Row 1: Estabelecimento & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7 flex flex-col gap-1.5">
              <label htmlFor="compra-nome" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">storefront</span>
                <span>Estabelecimento ou Item</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                id="compra-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Supermercado, Farmácia, Luz, Jantar..."
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006948]/30 transition-all"
                required
              />
            </div>

            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <label htmlFor="compra-valor" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">attach_money</span>
                <span>Valor Total (R$)</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-semibold text-xs">R$</span>
                <input
                  id="compra-valor"
                  type="text"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-bold text-sm tabular-nums focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006948]/30 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Categoria */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="compra-cat" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">category</span>
                <span>Categoria</span>
                <span className="text-red-500">*</span>
              </span>
              {(() => {
                const catAtual = listaCategorias.find((c) => c.id === categoria);
                return catAtual?.imagemUrl ? (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
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
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006948]/30 cursor-pointer"
              >
                {listaCategorias.map((cat) => (
                  <option key={cat.id} value={cat.id} className="dark:bg-slate-800">
                    {cat.icone} {cat.nome} {cat.imagemUrl ? '• (CDN)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Datas (Data da Compra & Data do 1º Pagamento) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
            {/* Data da Compra */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="compra-data-feita" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">shopping_bag</span>
                  <span>Data da Compra</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Quando comprou</span>
              </label>
              <input
                id="compra-data-feita"
                type="date"
                value={dataCompra}
                onChange={(e) => {
                  const novaDataCompra = e.target.value;
                  setDataCompra(novaDataCompra);
                  // Se for novo cadastro e as datas estavam iguais, mantém o primeiro pagamento sugerido
                  if (!compraEmEdicao && dataPrimeiroPagamento === dataCompra) {
                    setDataPrimeiroPagamento(novaDataCompra);
                  }
                }}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006948]/30 cursor-pointer"
                required
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Dia em que a despesa foi efetuada
              </span>
            </div>

            {/* Data do 1º Pagamento */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="compra-data-pagamento" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">calendar_month</span>
                  <span>1º Pagamento / Fatura</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Impacto no Dashboard</span>
              </label>
              <input
                id="compra-data-pagamento"
                type="date"
                value={dataPrimeiroPagamento}
                onChange={(e) => setDataPrimeiroPagamento(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                required
              />
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Mês em que o valor é cobrado e entra no fechamento
              </span>
            </div>
          </div>

          {/* Row 3: Tipo de Cobrança & Parcelas */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006948] dark:text-emerald-400">credit_card</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Tipo de Cobrança</span>
              </div>
              <div className="inline-flex p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTipoCobranca('a_vista');
                    setNumeroDeParcelas(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    tipoCobranca === 'a_vista'
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Parcelado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoCobranca('recorrente');
                    setNumeroDeParcelas(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tipoCobranca === 'recorrente'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-[#006948] dark:text-emerald-400 shadow-sm font-bold border border-emerald-200/60 dark:border-emerald-800/50'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">sync</span>
                  <span>Recorrente (Infinito)</span>
                </button>
              </div>
            </div>

            {tipoCobranca === 'recorrente' && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-[#006948] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold tabular-nums flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">all_inclusive</span>
                      <span>{valorCentavosLimpo > 0 ? formatarBRL(valorCentavosLimpo) : 'R$ 0,00'}/mês</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Inicia em {dataPrimeiroPagamento || 'mês informado'} e se repete todo mês
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#006948] dark:text-emerald-400 shrink-0 mt-0.5">
                    published_with_changes
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-semibold">Repetição infinita automática:</strong> Esta despesa será lançada automaticamente a cada mês a partir da data de início informada. Ideal para assinaturas (Netflix, Spotify), planos de celular, internet, condomínio ou gastos fixos. Não é necessário recadastrar todo mês e você poderá cancelar a qualquer momento!
                  </div>
                </div>
              </div>
            )}

            {tipoCobranca === 'parcelado' && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="num-parcelas" className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Número de Parcelas:
                  </label>
                  <select
                    id="num-parcelas"
                    value={numeroDeParcelas}
                    onChange={(e) => setNumeroDeParcelas(parseInt(e.target.value, 10))}
                    className="h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                      <option key={num} value={num} className="dark:bg-slate-800">
                        {num}x ({num} meses)
                      </option>
                    ))}
                  </select>
                </div>

                {parcelasSimuladas && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 border border-transparent dark:border-emerald-800/40 text-xs font-bold tabular-nums">
                      {numeroDeParcelas}x de {formatarBRL(parcelasSimuladas.valores[0])}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {parcelasSimuladas.meses[0]} até{' '}
                      {parcelasSimuladas.meses[parcelasSimuladas.meses.length - 1]}
                    </span>
                  </div>
                )}
              </div>
            )}

            {tipoCobranca === 'parcelado' && (
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  info
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-800 dark:text-white">Regra de centavos:</strong> quando o valor não
                  divide igualmente, a última parcela absorve a diferença (ex: R$ 100 em 3x =
                  33,33 + 33,33 + 33,34).
                </p>
              </div>
            )}
          </div>

          {/* Seção: Espaço Individual & Confidencial (Cofre Privado) */}
          <div className={`p-4 rounded-xl border transition-all ${privada ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 ring-1 ring-blue-300 dark:ring-blue-700/50' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${privada ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Lançamento Individual (Cofre Privado)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Não entra no fechamento do casal, não divide 50/50 e é visível apenas por você.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={privada}
                  onChange={(e) => {
                    const novoPrivada = e.target.checked;
                    setPrivada(novoPrivada);
                    if (novoPrivada) {
                      // Regra de Integridade: despesa privada pertence exclusivamente ao usuário atual!
                      setPagoPor(meuNome);
                      setDivisao(souP2 ? '0/100' : '100/0');
                      const catsIndiv =
                        categoriasIndividuais && categoriasIndividuais.length > 0
                          ? categoriasIndividuais
                          : CATEGORIAS_PADRAO_INDIVIDUAIS;
                      if (!catsIndiv.some((c) => c.id === categoria)) {
                        setCategoria(catsIndiv[0]?.id || 'Lazer & Hobbies');
                      }
                    } else {
                      setPagoPor(meuNome);
                      const splitPadrao = couple?.defaultSplit || '50/50';
                      setDivisao(splitPadrao);
                      const { percP1 } = parseDivisaoPercentuais(
                        splitPadrao,
                        p1Uid,
                        p2Uid,
                        [p1Name, 'p1'],
                        [p2Name, 'p2']
                      );
                      setCustomP1(percP1);
                      const catsCasal =
                        categorias && categorias.length > 0 ? categorias : CATEGORIAS_PADRAO;
                      if (!catsCasal.some((c) => c.id === categoria)) {
                        setCategoria('Mercado');
                      }
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {privada && (
              <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200/80 dark:border-blue-900/50 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={segredoCasal}
                      onChange={(e) => setSegredoCasal(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Segredo do Casal 🤫 (Surpresa)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200/80 dark:border-blue-900/50 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={assinatura}
                      onChange={(e) => setAssinatura(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Assinatura Periódica
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Forma de Pagamento ou Contexto
                  </label>
                  <input
                    type="text"
                    value={formaPagamentoNome}
                    onChange={(e) => setFormaPagamentoNome(e.target.value)}
                    placeholder="Ex: Cartão Nubank Vinicius, Amazon Kindle Store, VR / Cartão Refeição"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/60 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Quem Pagou */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">
                  account_balance_wallet
                </span>
                <span>Quem pagou a compra?</span>
                <span className="text-red-500">*</span>
              </span>
              {privada && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-transparent dark:border-blue-800/40">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  <span>Restrito a você ({meuNome})</span>
                </span>
              )}
            </div>

            {privada && (
              <div className="p-2.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] shrink-0">info</span>
                <span>
                  Lançamento confidencial do seu cofre pessoal: <strong>o pagador é fixado obrigatoriamente em você ({meuNome})</strong> para garantir que nenhuma despesa particular seja cobrada do parceiro.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Parceiro 1 */}
              {(() => {
                const souEuP1 = !souP2;
                const bloqueado = privada && !souEuP1;
                const selecionado = (pagoPor === p1Name || pagoPor === p1Uid) && !bloqueado;

                return (
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      bloqueado
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed select-none pointer-events-none'
                        : selecionado
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#0051d5] dark:border-blue-500 shadow-sm cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="pagoPor"
                        value={p1Name}
                        disabled={bloqueado}
                        checked={selecionado}
                        onChange={() => {
                          if (!bloqueado) setPagoPor(p1Name);
                        }}
                        className="sr-only"
                      />
                      <div className="w-8 h-8 rounded-full bg-[#0051d5] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {p1Name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{p1Name}</span>
                          {souEuP1 && (
                            <span className="text-[10px] text-[#0051d5] dark:text-blue-400 font-semibold">(Você)</span>
                          )}
                          {bloqueado && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">(Bloqueado)</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {bloqueado ? 'Indisponível em cofre privado' : 'Cartão / Pix dele(a)'}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selecionado
                          ? 'bg-[#0051d5] text-white'
                          : bloqueado
                          ? 'border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selecionado && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                      {bloqueado && !selecionado && (
                        <span className="material-symbols-outlined text-[12px] text-slate-400">lock</span>
                      )}
                    </div>
                  </label>
                );
              })()}

              {/* Parceiro 2 */}
              {(() => {
                const souEuP2 = souP2;
                const bloqueado = privada && !souEuP2;
                const selecionado = (pagoPor === p2Name || pagoPor === p2Uid) && !bloqueado;

                return (
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      bloqueado
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed select-none pointer-events-none'
                        : selecionado
                        ? 'bg-purple-50/70 dark:bg-purple-950/40 border-[#712ae2] dark:border-purple-500 shadow-sm cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="pagoPor"
                        value={p2Name}
                        disabled={bloqueado}
                        checked={selecionado}
                        onChange={() => {
                          if (!bloqueado) setPagoPor(p2Name);
                        }}
                        className="sr-only"
                      />
                      <div className="w-8 h-8 rounded-full bg-[#712ae2] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {p2Name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{p2Name}</span>
                          {souEuP2 && (
                            <span className="text-[10px] text-[#712ae2] dark:text-purple-400 font-semibold">(Você)</span>
                          )}
                          {bloqueado && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">(Bloqueado)</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {bloqueado ? 'Indisponível em cofre privado' : 'Cartão / Pix dele(a)'}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selecionado
                          ? 'bg-[#712ae2] text-white'
                          : bloqueado
                          ? 'border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selecionado && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                      {bloqueado && !selecionado && (
                        <span className="material-symbols-outlined text-[12px] text-slate-400">lock</span>
                      )}
                    </div>
                  </label>
                );
              })()}
            </div>
          </div>

          {/* Row 5: Divisão da Compra Dinâmica */}
          {privada ? (
            <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px] shrink-0 mt-0.5">
                lock
              </span>
              <div>
                <strong className="block font-bold text-blue-950 dark:text-white mb-0.5">
                  Despesa 100% Pessoal & Confidencial
                </strong>
                Este item é atribuído integralmente ao seu cofre privado. Ele não será dividido com o parceiro, não cria dívidas e não entrará no fechamento mensal do casal.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">pie_chart</span>
                  <span>Regime de Divisão desta Compra</span>
                  <span className="text-red-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarPersonalizado(!mostrarPersonalizado)}
                  className="text-[11px] font-semibold text-[#006948] dark:text-emerald-400 hover:text-[#005137] dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
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
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-[#006948] dark:border-emerald-500 ring-1 ring-[#006948] dark:ring-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {opcao.label}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                      {opcao.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Rateio Personalizado (Slider + Inputs) */}
            {mostrarPersonalizado && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">sliders</span>
                    <span>Definir Porcentagens Livres do Casal</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                    {customP1}% + {100 - customP1}% = 100%
                  </span>
                </div>

                {/* Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span className="text-[#0051d5] dark:text-blue-400">{p1Name}: {customP1}%</span>
                    <span className="text-[#712ae2] dark:text-purple-400">{p2Name}: {100 - customP1}%</span>
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
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5] shrink-0"></span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate flex-1">{p1Name}:</span>
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
                      className="w-12 text-right font-bold text-xs text-slate-900 dark:text-white bg-transparent border-none focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#712ae2] shrink-0"></span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate flex-1">{p2Name}:</span>
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
                      className="w-12 text-right font-bold text-xs text-slate-900 dark:text-white bg-transparent border-none focus:outline-none"
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
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900/60 dark:via-slate-800/40 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#006948] dark:text-emerald-400">calculate</span>
                      <span>Impacto da Divisão no Acerto ({percP1}% / {percP2}%)</span>
                    </span>
                    <span className="font-bold text-[#006948] dark:text-emerald-400">
                      Total: {formatarBRL(valorCentavosLimpo)}
                    </span>
                  </div>

                  {/* Barra de Proporção Bi-Color */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full flex overflow-hidden">
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
                    <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex flex-col">
                      <span className="text-[#0051d5] dark:text-blue-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0051d5]"></span>
                        <span>Cota {p1Name} ({percP1}%)</span>
                      </span>
                      <strong className="text-slate-900 dark:text-white text-xs font-bold mt-0.5">
                        {formatarBRL(cotaP1)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex flex-col">
                      <span className="text-[#712ae2] dark:text-purple-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#712ae2]"></span>
                        <span>Cota {p2Name} ({percP2}%)</span>
                      </span>
                      <strong className="text-slate-900 dark:text-white text-xs font-bold mt-0.5">
                        {formatarBRL(cotaP2)}
                      </strong>
                    </div>
                  </div>

                  {/* Explicação da Dívida e Ressarcimento */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-lg flex items-start gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-[#006948] dark:text-emerald-400 shrink-0 mt-0.5">
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
          )}

          {/* Row 6: Descrição Opcional */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="compra-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006948]/30 transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-transparent dark:border-slate-700"
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

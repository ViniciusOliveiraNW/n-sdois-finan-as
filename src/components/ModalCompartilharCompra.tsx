import React, { useState } from 'react';
import { CategoriaMeta, Compra, CoupleSpace, DivisaoTipo, UsuarioId } from '../types';
import { CATEGORIAS_PADRAO } from '../data/initialData';
import { formatarBRL } from '../calculations/acertoMensal';

interface ModalCompartilharCompraProps {
  aberto: boolean;
  onFechar: () => void;
  compra: Compra | null;
  couple?: CoupleSpace | null;
  usuarioAtual: UsuarioId;
  categorias?: CategoriaMeta[];
  onConfirmarCompartilhamento: (
    compraAtualizada: Compra
  ) => Promise<void> | void;
}

export const ModalCompartilharCompra: React.FC<ModalCompartilharCompraProps> = ({
  aberto,
  onFechar,
  compra,
  couple,
  usuarioAtual,
  categorias = CATEGORIAS_PADRAO,
  onConfirmarCompartilhamento,
}) => {
  if (!aberto || !compra) return null;

  const p1Name = couple?.partner1Name || 'Vinicius';
  const p1Uid = couple?.partner1Uid || 'Vinicius';
  const p2Name = couple?.partner2Name || 'Silvia';
  const p2Uid = couple?.partner2Uid || 'Silvia';

  const [pagoPor, setPagoPor] = useState<string>(
    compra.pagoPorNome || compra.pagoPor || p1Name
  );
  const [divisao, setDivisao] = useState<DivisaoTipo>('50/50');
  const [categoria, setCategoria] = useState<string>(
    compra.categoria || 'Compras'
  );
  const [salvando, setSalvando] = useState(false);

  const valorCentavos =
    compra.valorCentavos ?? Math.round((compra.valor || 0) * 100);

  const handleConfirmar = async () => {
    setSalvando(true);
    try {
      const ehP1 = pagoPor === p1Name || pagoPor === p1Uid;
      const pagoPorNomeFinal = ehP1 ? p1Name : p2Name;
      const pagoPorUidFinal = ehP1 ? p1Uid : p2Uid;

      const compraAtualizada: Compra = {
        ...compra,
        privada: false, // Move para o espaço compartilhado do casal
        segredoCasal: false,
        pagoPor: pagoPorNomeFinal,
        pagoPorNome: pagoPorNomeFinal,
        pagoPorUid: pagoPorUidFinal,
        divisao,
        categoria,
      };

      await onConfirmarCompartilhamento(compraAtualizada);
      onFechar();
    } catch (err) {
      console.error('Erro ao compartilhar compra:', err);
      alert('Erro ao mover despesa para o casal. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#161f2e] w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">group_add</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Compartilhar com o Casal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mover do cofre individual para o painel compartilhado
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            type="button"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Item Preview Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Lançamento Selecionado
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                {compra.nome}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {compra.numeroDeParcelas > 1
                  ? `${compra.numeroDeParcelas} parcelas`
                  : 'À vista'}
                {compra.formaPagamentoNome ? ` • ${compra.formaPagamentoNome}` : ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {formatarBRL(valorCentavos)}
              </span>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-xs leading-relaxed flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] shrink-0 mt-0.5">
              info
            </span>
            <div>
              Ao compartilhar, este item passará a ser visível para{' '}
              <strong>{p1Name} & {p2Name}</strong>, dividirá conforme a regra abaixo e entrará no fechamento mensal do casal.
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* Quem pagou */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quem realizou o pagamento?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPagoPor(p1Name)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    pagoPor === p1Name
                      ? 'border-[#006948] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 shadow-sm ring-1 ring-[#006948] dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>{p1Name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPagoPor(p2Name)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    pagoPor === p2Name
                      ? 'border-[#006948] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 shadow-sm ring-1 ring-[#006948] dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>{p2Name}</span>
                </button>
              </div>
            </div>

            {/* Regra de Divisão */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Regra de divisão no casal
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDivisao('50/50')}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    divisao === '50/50'
                      ? 'border-[#006948] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 shadow-sm ring-1 ring-[#006948] dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  50% / 50%
                </button>
                <button
                  type="button"
                  onClick={() => setDivisao('70/30')}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    divisao === '70/30'
                      ? 'border-[#006948] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 shadow-sm ring-1 ring-[#006948] dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  70% / 30%
                </button>
                <button
                  type="button"
                  onClick={() => setDivisao('100/0')}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    divisao === '100/0'
                      ? 'border-[#006948] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 shadow-sm ring-1 ring-[#006948] dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  100% Pagador
                </button>
              </div>
            </div>

            {/* Categoria Compartilhada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoria no Casal
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006948]"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id} className="dark:bg-slate-800">
                    {cat.icone} {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={salvando}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">group_add</span>
            <span>{salvando ? 'Compartilhando...' : 'Confirmar e Compartilhar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

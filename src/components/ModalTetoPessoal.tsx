import React, { useState } from 'react';
import { formatarBRL } from '../calculations/acertoMensal';

interface ModalTetoPessoalProps {
  aberto: boolean;
  onFechar: () => void;
  tetoAtualCentavos: number;
  totalGastoMesCentavos: number;
  onSalvarTeto: (novoTetoCentavos: number) => Promise<void> | void;
}

export const ModalTetoPessoal: React.FC<ModalTetoPessoalProps> = ({
  aberto,
  onFechar,
  tetoAtualCentavos,
  totalGastoMesCentavos,
  onSalvarTeto,
}) => {
  if (!aberto) return null;

  const [tetoInput, setTetoInput] = useState(() =>
    (tetoAtualCentavos / 100).toFixed(2).replace('.', ',')
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valorCentavosLimpo = (() => {
    const limpo = tetoInput.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(limpo);
    return isNaN(parsed) || parsed <= 0 ? 0 : Math.round(parsed * 100);
  })();

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valorCentavosLimpo <= 0) {
      setErro('Informe um teto orçamentário positivo maior que zero.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvarTeto(valorCentavosLimpo);
      onFechar();
    } catch (err) {
      console.error('Erro ao salvar teto pessoal:', err);
      setErro('Erro ao salvar no banco.');
    } finally {
      setSalvando(false);
    }
  };

  const percUsado = valorCentavosLimpo > 0
    ? Math.round((totalGastoMesCentavos / valorCentavosLimpo) * 100)
    : 0;

  const margemRestanteCentavos = valorCentavosLimpo - totalGastoMesCentavos;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white w-full max-w-[460px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Teto Orçamentário Pessoal
              </h2>
              <p className="text-xs text-slate-500">
                Limite mensal de gastos individuais seguros
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            type="button"
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Defina seu Teto Mensal (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                R$
              </span>
              <input
                type="text"
                value={tetoInput}
                onChange={(e) => {
                  setTetoInput(e.target.value);
                  setErro(null);
                }}
                placeholder="2.500,00"
                className="w-full pl-10 pr-4 py-2.5 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sugestão: Estabeleça uma meta confortável que não comprometa seus aportes e as contas do casal.
            </p>
          </div>

          {/* Real-time simulation */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Total gasto este mês:</span>
              <span className="font-bold text-slate-900">
                {formatarBRL(totalGastoMesCentavos)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Percentual comprometido:</span>
              <span className={`font-bold ${percUsado > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                {percUsado}% usado
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
              <span className="text-slate-600 font-semibold">Margem livre restante:</span>
              <span className={`font-extrabold ${margemRestanteCentavos < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {margemRestanteCentavos >= 0 ? `+ ${formatarBRL(margemRestanteCentavos)}` : `- ${formatarBRL(Math.abs(margemRestanteCentavos))}`}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Teto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

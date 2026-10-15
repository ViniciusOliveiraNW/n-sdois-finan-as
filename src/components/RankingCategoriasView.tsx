import React from 'react';
import { ResultadoRanking } from '../calculations/rankingCategorias';
import { formatarBRL } from '../calculations/acertoMensal';

interface RankingCategoriasViewProps {
  ranking: ResultadoRanking;
  onVerTodasCategorias?: () => void;
}

const CORES_CATEGORIA: Record<string, string> = {
  Mercado: 'bg-[#006948]',
  Aluguel: 'bg-[#0051d5]',
  Farmácia: 'bg-[#712ae2]',
  Luz: 'bg-[#316bf3]',
  Água: 'bg-cyan-600',
  Padaria: 'bg-amber-600',
  Compras: 'bg-indigo-600',
  Emergência: 'bg-rose-600',
  Outros: 'bg-slate-500',
};

export const RankingCategoriasView: React.FC<RankingCategoriasViewProps> = ({
  ranking,
  onVerTodasCategorias,
}) => {
  return (
    <div className="flex flex-col justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full">
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#006948] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">category</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Top 5 Categorias</h3>
              <span className="text-[11px] text-slate-500">Distribuição ponderada de gastos</span>
            </div>
          </div>
          {onVerTodasCategorias && (
            <button
              onClick={onVerTodasCategorias}
              className="text-[#006948] hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Todas</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          )}
        </div>

        {ranking.items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhum lançamento no período para calcular o ranking.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 my-3">
            {ranking.items.map((item) => {
              const cor = CORES_CATEGORIA[item.categoria] || 'bg-slate-500';
              return (
                <div key={item.categoria} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-800 font-medium">
                      <span className={`w-2.5 h-2.5 rounded-full ${cor}`}></span>
                      {item.categoria}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="font-bold text-slate-900">
                        {formatarBRL(item.totalCentavos)}
                      </span>
                      <span className="text-[11px] text-slate-400 w-10 text-right">
                        {item.percentual}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cor} transition-all duration-500`}
                      style={{ width: `${Math.min(100, item.percentual)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ranking.items.length > 0 && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500 text-xs">
          <span>
            Top 5 somam{' '}
            <strong className="text-slate-700">{ranking.coberturaTop5Percentual}%</strong> das
            despesas.
          </span>
          <span className="font-bold text-[#006948] tabular-nums">
            {formatarBRL(ranking.totalTop5Centavos)}
          </span>
        </div>
      )}
    </div>
  );
};

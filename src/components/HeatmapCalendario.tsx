import React from 'react';
import { LancamentoMensal } from '../types';
import { formatarBRL } from '../calculations/acertoMensal';
import { obterDiasNoMes } from '../calculations/parcelas';

interface HeatmapCalendarioProps {
  mesSelecionado: string; // 'AAAA-MM'
  lancamentos: LancamentoMensal[];
  titulo?: string;
  subtitulo?: string;
  corTema?: 'emerald' | 'blue';
}

export const HeatmapCalendario: React.FC<HeatmapCalendarioProps> = ({
  mesSelecionado,
  lancamentos,
  titulo = 'Mapa de Gastos',
  subtitulo = 'Intensidade diária no mês',
  corTema = 'emerald',
}) => {
  const isBlue = corTema === 'blue';
  const [anoStr, mesStr] = mesSelecionado.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const totalDias = obterDiasNoMes(ano, mes);

  // Dia da semana do 1º dia do mês (0 = Domingo, 1 = Segunda, ...)
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();

  // Mapeia gastos por dia
  const gastosPorDia: Record<number, { totalCentavos: number; itens: LancamentoMensal[] }> = {};
  for (let d = 1; d <= totalDias; d++) {
    gastosPorDia[d] = { totalCentavos: 0, itens: [] };
  }

  let maiorGastoDiaCentavos = 0;
  let diaPico = 1;
  let itemPico: LancamentoMensal | null = null;

  for (const lancamento of lancamentos) {
    // dataReferencia: 'AAAA-MM-DD'
    const parts = lancamento.dataReferencia.split('-');
    if (parts.length === 3) {
      const dia = parseInt(parts[2], 10);
      if (gastosPorDia[dia]) {
        gastosPorDia[dia].totalCentavos += lancamento.valorCentavos;
        gastosPorDia[dia].itens.push(lancamento);

        if (gastosPorDia[dia].totalCentavos > maiorGastoDiaCentavos) {
          maiorGastoDiaCentavos = gastosPorDia[dia].totalCentavos;
          diaPico = dia;
          itemPico = lancamento;
        }
      }
    }
  }

  // Gera as células da grade
  const celulas: Array<{
    tipo: 'vazio' | 'dia';
    dia?: number;
    totalCentavos?: number;
    itens?: LancamentoMensal[];
    nivel?: number;
  }> = [];

  // Preenchimento antes do primeiro dia
  for (let i = 0; i < primeiroDiaSemana; i++) {
    celulas.push({ tipo: 'vazio' });
  }

  // Dias do mês
  for (let d = 1; d <= totalDias; d++) {
    const dados = gastosPorDia[d];
    let nivel = 0;
    if (dados.totalCentavos > 0) {
      if (maiorGastoDiaCentavos > 0) {
        const proporcao = dados.totalCentavos / maiorGastoDiaCentavos;
        if (proporcao >= 0.75) nivel = 4;
        else if (proporcao >= 0.45) nivel = 3;
        else if (proporcao >= 0.2) nivel = 2;
        else nivel = 1;
      } else {
        nivel = 1;
      }
    }
    celulas.push({
      tipo: 'dia',
      dia: d,
      totalCentavos: dados.totalCentavos,
      itens: dados.itens,
      nivel,
    });
  }

  // Obter cor de fundo pelo nível
  const getCorNivel = (nivel?: number) => {
    if (isBlue) {
      switch (nivel) {
        case 4:
          return 'bg-blue-600 text-white font-bold shadow-sm';
        case 3:
          return 'bg-blue-500 text-white font-bold';
        case 2:
          return 'bg-blue-300 dark:bg-blue-800 text-blue-950 dark:text-blue-100 font-semibold';
        case 1:
          return 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-medium';
        default:
          return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';
      }
    }

    switch (nivel) {
      case 4:
        return 'bg-[#006948] text-white font-bold shadow-sm';
      case 3:
        return 'bg-[#00855d] text-white font-bold';
      case 2:
        return 'bg-emerald-300 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 font-semibold';
      case 1:
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-medium';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';
    }
  };

  return (
    <div className="flex flex-col justify-between bg-white dark:bg-[#161f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isBlue
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">calendar_view_month</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{titulo}</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{subtitulo}</span>
            </div>
          </div>
        </div>

        {/* Matriz Heatmap: 7 colunas (D, S, T, Q, Q, S, S) */}
        <div className="flex flex-col gap-1 my-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-0.5">
            <span>D</span>
            <span>S</span>
            <span>T</span>
            <span>Q</span>
            <span>Q</span>
            <span>S</span>
            <span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {celulas.map((celula, idx) => {
              if (celula.tipo === 'vazio') {
                return (
                  <div
                    key={`vazio-${idx}`}
                    className="h-7 sm:h-8 rounded-lg bg-slate-50 dark:bg-slate-800/40 opacity-40"
                  />
                );
              }

              const diaFormatado = String(celula.dia).padStart(2, '0');
              const tooltipTexto =
                celula.totalCentavos && celula.totalCentavos > 0
                  ? `${diaFormatado}/${mesStr}: ${formatarBRL(celula.totalCentavos)} (${
                      celula.itens?.[0]?.nome || 'Despesa'
                    })`
                  : `${diaFormatado}/${mesStr}: Nenhum lançamento`;

              return (
                <div
                  key={`dia-${celula.dia}`}
                  title={tooltipTexto}
                  className={`h-7 sm:h-8 rounded-lg flex items-center justify-center text-[11px] tabular-nums transition-transform hover:scale-110 cursor-pointer ${getCorNivel(
                    celula.nivel
                  )}`}
                >
                  {celula.dia}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legenda & Pico */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Sem gasto</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800"></span>
            <span className={`w-3 h-3 rounded ${isBlue ? 'bg-blue-100 dark:bg-blue-950/70' : 'bg-emerald-100 dark:bg-emerald-950/70'}`}></span>
            <span className={`w-3 h-3 rounded ${isBlue ? 'bg-blue-300 dark:bg-blue-800' : 'bg-emerald-300 dark:bg-emerald-800'}`}></span>
            <span className={`w-3 h-3 rounded ${isBlue ? 'bg-blue-500' : 'bg-[#00855d]'}`}></span>
            <span className={`w-3 h-3 rounded ${isBlue ? 'bg-blue-600' : 'bg-[#006948]'}`}></span>
          </div>
          <span>Maior volume</span>
        </div>

        {maiorGastoDiaCentavos > 0 ? (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
            <span
              className={`material-symbols-outlined text-[16px] ${
                isBlue ? 'text-blue-600 dark:text-blue-400' : 'text-[#006948] dark:text-emerald-400'
              }`}
            >
              bolt
            </span>
            <span>
              Pico do mês:{' '}
              <strong className="text-slate-900 dark:text-white tabular-nums">
                {formatarBRL(maiorGastoDiaCentavos)}
              </strong>{' '}
              no dia{' '}
              <strong className="text-slate-900 dark:text-white">
                {String(diaPico).padStart(2, '0')}/{mesStr}
              </strong>{' '}
              ({itemPico?.nome || 'Maior despesa'}).
            </span>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 text-center">
            Nenhum lançamento no mês para gerar mapa de calor.
          </div>
        )}
      </div>
    </div>
  );
};

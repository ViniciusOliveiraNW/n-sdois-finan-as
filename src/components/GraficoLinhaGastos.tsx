import React, { useState, useMemo, useRef } from 'react';
import { Compra, LancamentoMensal } from '../types';
import { formatarBRL } from '../calculations/acertoMensal';
import { obterDiasNoMes } from '../calculations/parcelas';

interface GraficoLinhaGastosProps {
  tipo: 'casal' | 'individual';
  mesSelecionado: string; // "YYYY-MM"
  lancamentosDoMes: LancamentoMensal[];
  compras: Compra[];
  // Props para Visão Casal
  p1Nome?: string;
  p2Nome?: string;
  p1Photo?: string;
  p2Photo?: string;
  // Props para Visão Individual
  usuarioNome?: string;
  tetoPessoalCentavos?: number;
  modoDiscreto?: boolean;
}

interface PontoGrafico {
  label: string; // Ex: "01", "15", "Out"
  sublabel?: string; // Ex: "Seg", "2026"
  dataCompleta: string; // "YYYY-MM-DD" ou "YYYY-MM"
  // Séries Casal
  totalCasalCentavos: number;
  pagoP1Centavos: number;
  pagoP2Centavos: number;
  // Séries Individual
  totalIndividualCentavos: number;
  privadoCentavos: number;
  casalPagoPorMimCentavos: number;
  tetoCentavos?: number;
  // Itens do ponto para tooltip
  itens?: { nome: string; valorCentavos: number; categoria?: string; pagoPor?: string }[];
}

// Gera curva Bézier suave entre pontos
function gerarSvgPathSuave(pontos: { x: number; y: number }[]): string {
  if (pontos.length === 0) return '';
  if (pontos.length === 1) return `M ${pontos[0].x.toFixed(1)} ${pontos[0].y.toFixed(1)}`;
  let path = `M ${pontos[0].x.toFixed(1)} ${pontos[0].y.toFixed(1)}`;

  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i === 0 ? 0 : i - 1];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export const GraficoLinhaGastos: React.FC<GraficoLinhaGastosProps> = ({
  tipo,
  mesSelecionado,
  lancamentosDoMes,
  compras,
  p1Nome = 'Vinicius',
  p2Nome = 'Silvia',
  p1Photo,
  p2Photo,
  usuarioNome = 'Você',
  tetoPessoalCentavos = 0,
  modoDiscreto = false,
}) => {
  const [visaoTemporal, setVisaoTemporal] = useState<'diario' | 'semestral'>('diario');

  // Visibilidade das séries
  const [serieAtivaCasalTotal, setSerieAtivaCasalTotal] = useState(true);
  const [serieAtivaP1, setSerieAtivaP1] = useState(true);
  const [serieAtivaP2, setSerieAtivaP2] = useState(true);

  const [serieAtivaIndivTotal, setSerieAtivaIndivTotal] = useState(true);
  const [serieAtivaPrivado, setSerieAtivaPrivado] = useState(true);
  const [serieAtivaCasalPago, setSerieAtivaCasalPago] = useState(true);
  const [serieAtivaTeto, setSerieAtivaTeto] = useState(true);

  // Hover e Tooltip
  const [indiceHover, setIndiceHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const formatarValor = (centavos: number) => {
    if (modoDiscreto) return '••••••';
    return formatarBRL(centavos);
  };

  const getPrimeiroNome = (n?: string) => {
    if (!n) return '';
    return n.trim().split(' ')[0] || n;
  };

  const p1Primeiro = getPrimeiroNome(p1Nome);
  const p2Primeiro = getPrimeiroNome(p2Nome);

  // Helper para verificar pagador
  const ehP1 = (pagoPor?: string, pagoPorUid?: string) => {
    const val = (pagoPor || '').toLowerCase();
    return val === 'p1' || val === 'vinicius' || val.includes(p1Primeiro.toLowerCase());
  };

  // Decompor o mês selecionado
  const [anoAtual, mesAtualNum] = useMemo(() => {
    const [a, m] = mesSelecionado.split('-');
    return [parseInt(a, 10) || new Date().getFullYear(), parseInt(m, 10) || new Date().getMonth() + 1];
  }, [mesSelecionado]);

  // 1. Dados para Visão Diária no Mês Selecionado
  const dadosDiarios = useMemo<PontoGrafico[]>(() => {
    const totalDias = obterDiasNoMes(anoAtual, mesAtualNum);
    const pontos: PontoGrafico[] = [];

    for (let d = 1; d <= totalDias; d++) {
      const diaStr = String(d).padStart(2, '0');
      const mesStr = String(mesAtualNum).padStart(2, '0');
      const dataIso = `${anoAtual}-${mesStr}-${diaStr}`;

      const dateObj = new Date(anoAtual, mesAtualNum - 1, d);
      const diaSemana = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

      // Filtra lançamentos do dia
      const lancsDoDia = lancamentosDoMes.filter((l) => {
        return l.dataReferencia === dataIso;
      });

      let diaCasal = 0;
      let diaP1 = 0;
      let diaP2 = 0;
      let diaIndivTotal = 0;
      let diaPrivado = 0;
      let diaCasalPago = 0;

      const itens = lancsDoDia.map((l) => ({
        nome: l.nome,
        valorCentavos: l.valorCentavos,
        categoria: l.categoria,
        pagoPor: l.pagoPor,
      }));

      for (const l of lancsDoDia) {
        if (tipo === 'casal') {
          diaCasal += l.valorCentavos;
          if (ehP1(l.pagoPor, l.pagoPorUid)) {
            diaP1 += l.valorCentavos;
          } else {
            diaP2 += l.valorCentavos;
          }
        } else {
          // Individual
          diaIndivTotal += l.valorCentavos;
          if (l.privada) {
            diaPrivado += l.valorCentavos;
          } else {
            diaCasalPago += l.valorCentavos;
          }
        }
      }

      // Meta proporcional diária
      const tetoPonto = Math.round(tetoPessoalCentavos / totalDias);

      pontos.push({
        label: diaStr,
        sublabel: diaSemana,
        dataCompleta: dataIso,
        totalCasalCentavos: diaCasal,
        pagoP1Centavos: diaP1,
        pagoP2Centavos: diaP2,
        totalIndividualCentavos: diaIndivTotal,
        privadoCentavos: diaPrivado,
        casalPagoPorMimCentavos: diaCasalPago,
        tetoCentavos: tetoPonto,
        itens,
      });
    }

    return pontos;
  }, [
    anoAtual,
    mesAtualNum,
    lancamentosDoMes,
    tipo,
    tetoPessoalCentavos,
    p1Primeiro,
  ]);

  // 2. Dados para Visão Semestral (Últimos 6 meses)
  const dadosSemestrais = useMemo<PontoGrafico[]>(() => {
    const pontos: PontoGrafico[] = [];
    const nomesMesesCurto = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Gerar os últimos 6 meses até o mês selecionado
    for (let i = 5; i >= 0; i--) {
      const targetIndex = anoAtual * 12 + (mesAtualNum - 1) - i;
      const anoIter = Math.floor(targetIndex / 12);
      const mesIter = (targetIndex % 12) + 1;
      const mesRef = `${anoIter}-${String(mesIter).padStart(2, '0')}`;
      const nomeMesCurto = nomesMesesCurto[mesIter - 1];

      let totalCasal = 0;
      let totalP1 = 0;
      let totalP2 = 0;
      let totalIndiv = 0;
      let totalPrivado = 0;
      let totalCasalPago = 0;

      // Para cada compra cadastrada, calcula a parcela deste mês se houver
      compras.forEach((compra) => {
        if (!compra.dataPrimeiroPagamento) return;
        const [anoComp, mesComp] = compra.dataPrimeiroPagamento.split('-').map((v) => parseInt(v, 10));
        const inicioIndex = anoComp * 12 + (mesComp - 1);
        const fimIndex = compra.recorrente
          ? Infinity
          : inicioIndex + (compra.numeroDeParcelas || 1) - 1;

        if (targetIndex >= inicioIndex && targetIndex <= fimIndex) {
          const numParcela = targetIndex - inicioIndex + 1;
          const valorTotalCentavos = compra.valorCentavos ?? Math.round(compra.valor * 100);
          const parcelaCentavos = compra.recorrente
            ? valorTotalCentavos
            : Math.round(valorTotalCentavos / (compra.numeroDeParcelas || 1));

          if (tipo === 'casal') {
            if (!compra.privada) {
              totalCasal += parcelaCentavos;
              if (ehP1(compra.pagoPorNome || compra.pagoPor, compra.pagoPorUid)) {
                totalP1 += parcelaCentavos;
              } else {
                totalP2 += parcelaCentavos;
              }
            }
          } else {
            // Individual: compras privadas ou compras pagas pelo usuário
            const souEu = compra.privada || ehP1(compra.pagoPorNome || compra.pagoPor, compra.pagoPorUid);
            if (souEu) {
              totalIndiv += parcelaCentavos;
              if (compra.privada) {
                totalPrivado += parcelaCentavos;
              } else {
                totalCasalPago += parcelaCentavos;
              }
            }
          }
        }
      });

      pontos.push({
        label: nomeMesCurto,
        sublabel: String(anoIter).slice(-2),
        dataCompleta: mesRef,
        totalCasalCentavos: totalCasal,
        pagoP1Centavos: totalP1,
        pagoP2Centavos: totalP2,
        totalIndividualCentavos: totalIndiv,
        privadoCentavos: totalPrivado,
        casalPagoPorMimCentavos: totalCasalPago,
        tetoCentavos: tetoPessoalCentavos,
      });
    }

    return pontos;
  }, [anoAtual, mesAtualNum, compras, tipo, tetoPessoalCentavos, p1Primeiro]);

  const pontosAtivos = visaoTemporal === 'diario' ? dadosDiarios : dadosSemestrais;

  // Estatísticas do gráfico
  const stats = useMemo<{
    maiorValor: number;
    pontoMaior: PontoGrafico | null;
    somaTotal: number;
    media: number;
  }>(() => {
    let maiorValor = 0;
    let pontoMaior: PontoGrafico | null = null;
    let somaTotal = 0;

    pontosAtivos.forEach((p) => {
      const val = tipo === 'casal' ? p.totalCasalCentavos : p.totalIndividualCentavos;
      if (val > maiorValor) {
        maiorValor = val;
        pontoMaior = p;
      }
      somaTotal += val;
    });

    const divisor = pontosAtivos.length || 1;
    const media = Math.round(somaTotal / divisor);

    return {
      maiorValor,
      pontoMaior,
      somaTotal,
      media,
    };
  }, [pontosAtivos, tipo]);

  // Dimensionamento SVG
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  // Determina o valor máximo da escala Y
  const maxValorEscala = useMemo(() => {
    let max = 0;
    pontosAtivos.forEach((p) => {
      if (tipo === 'casal') {
        if (serieAtivaCasalTotal) max = Math.max(max, p.totalCasalCentavos);
        if (serieAtivaP1) max = Math.max(max, p.pagoP1Centavos);
        if (serieAtivaP2) max = Math.max(max, p.pagoP2Centavos);
      } else {
        if (serieAtivaIndivTotal) max = Math.max(max, p.totalIndividualCentavos);
        if (serieAtivaPrivado) max = Math.max(max, p.privadoCentavos);
        if (serieAtivaCasalPago) max = Math.max(max, p.casalPagoPorMimCentavos);
        if (serieAtivaTeto && p.tetoCentavos) max = Math.max(max, p.tetoCentavos);
      }
    });

    if (max === 0) return 10000; // R$ 100,00 padrão caso vazio
    return Math.ceil((max * 1.15) / 1000) * 1000; // 15% margem superior com teto arredondado
  }, [
    pontosAtivos,
    tipo,
    serieAtivaCasalTotal,
    serieAtivaP1,
    serieAtivaP2,
    serieAtivaIndivTotal,
    serieAtivaPrivado,
    serieAtivaCasalPago,
    serieAtivaTeto,
  ]);

  // Função conversora de ponto para coordenadas SVG
  const getX = (index: number) => {
    if (pontosAtivos.length <= 1) return paddingX + innerWidth / 2;
    return paddingX + (index / (pontosAtivos.length - 1)) * innerWidth;
  };

  const getY = (valorCentavos: number) => {
    const ratio = Math.min(1, Math.max(0, valorCentavos / maxValorEscala));
    return paddingTop + innerHeight - ratio * innerHeight;
  };

  // Coordenadas calculadas para as séries ativas
  const coordsCasalTotal = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.totalCasalCentavos) })),
    [pontosAtivos, maxValorEscala]
  );

  const coordsP1 = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.pagoP1Centavos) })),
    [pontosAtivos, maxValorEscala]
  );

  const coordsP2 = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.pagoP2Centavos) })),
    [pontosAtivos, maxValorEscala]
  );

  const coordsIndivTotal = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.totalIndividualCentavos) })),
    [pontosAtivos, maxValorEscala]
  );

  const coordsPrivado = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.privadoCentavos) })),
    [pontosAtivos, maxValorEscala]
  );

  const coordsCasalPago = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.casalPagoPorMimCentavos) })),
    [pontosAtivos, maxValorEscala]
  );

  const coordsTeto = useMemo(
    () => pontosAtivos.map((p, i) => ({ x: getX(i), y: getY(p.tetoCentavos || 0) })),
    [pontosAtivos, maxValorEscala]
  );

  // SVG Paths
  const pathCasalTotal = useMemo(() => gerarSvgPathSuave(coordsCasalTotal), [coordsCasalTotal]);
  const pathP1 = useMemo(() => gerarSvgPathSuave(coordsP1), [coordsP1]);
  const pathP2 = useMemo(() => gerarSvgPathSuave(coordsP2), [coordsP2]);

  const pathIndivTotal = useMemo(() => gerarSvgPathSuave(coordsIndivTotal), [coordsIndivTotal]);
  const pathPrivado = useMemo(() => gerarSvgPathSuave(coordsPrivado), [coordsPrivado]);
  const pathCasalPago = useMemo(() => gerarSvgPathSuave(coordsCasalPago), [coordsCasalPago]);
  const pathTeto = useMemo(() => gerarSvgPathSuave(coordsTeto), [coordsTeto]);

  // Área preenchida com gradiente para a linha principal
  const areaPrincipal = useMemo(() => {
    const coords = tipo === 'casal' ? coordsCasalTotal : coordsIndivTotal;
    const linePath = tipo === 'casal' ? pathCasalTotal : pathIndivTotal;
    if (coords.length === 0) return '';
    const bottomY = paddingTop + innerHeight;
    return `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY} L ${coords[0].x.toFixed(1)} ${bottomY} Z`;
  }, [tipo, coordsCasalTotal, coordsIndivTotal, pathCasalTotal, pathIndivTotal, innerHeight]);

  // Interação do mouse para tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgRelativeX = (clientX / rect.width) * svgWidth;

    let nearestIndex = 0;
    let minDistance = Infinity;

    pontosAtivos.forEach((_, i) => {
      const px = getX(i);
      const dist = Math.abs(px - svgRelativeX);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    });

    setIndiceHover(nearestIndex);
  };

  const pontoHoverAtivo = indiceHover !== null ? pontosAtivos[indiceHover] : null;

  return (
    <div className="bg-white dark:bg-[#161f2e] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col gap-4">
      {/* 1. Header do Gráfico: Título, Badge de Tipo e Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              tipo === 'casal'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {tipo === 'casal' ? 'show_chart' : 'monitoring'}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {tipo === 'casal' ? 'Curva de Gastos do Casal' : 'Evolução dos Seus Gastos Pessoais'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  tipo === 'casal'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-[#006948] dark:text-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                }`}
              >
                {visaoTemporal === 'diario' ? 'Diário no Mês' : 'Semestral (6M)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tipo === 'casal'
                ? 'Acompanhamento contínuo dos desembolsos e divisão de despesas entre os parceiros.'
                : 'Ritmo financeiro das suas despesas protegidas e despesas conjuntas pagas por você.'}
            </p>
          </div>
        </div>

        {/* Controles de Visualização: Mês Diário vs 6 Meses */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setVisaoTemporal('diario');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                visaoTemporal === 'diario'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">calendar_view_day</span>
              <span>No Mês</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVisaoTemporal('semestral');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                visaoTemporal === 'semestral'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">view_timeline</span>
              <span>6 Meses</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Destaques Rápidos (KPIs do Gráfico) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total do Período
          </span>
          <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {formatarValor(stats.somaTotal)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {visaoTemporal === 'diario' ? 'Média Diária' : 'Média Mensal'}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-[#006948] dark:text-emerald-400 tabular-nums mt-0.5">
            {formatarValor(stats.media)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Pico de Gastos
          </span>
          <span className="text-base sm:text-lg font-extrabold text-[#0051d5] dark:text-blue-400 tabular-nums mt-0.5">
            {formatarValor(stats.maiorValor)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Dia / Mês de Pico
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-1">
            {stats.pontoMaior
              ? visaoTemporal === 'diario'
                ? `Dia ${stats.pontoMaior.label} (${stats.pontoMaior.sublabel})`
                : `${stats.pontoMaior.label}/${stats.pontoMaior.sublabel}`
              : 'Nenhum'}
          </span>
        </div>
      </div>

      {/* 3. Legenda e Filtro de Séries */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          Linhas visíveis (clique para alternar):
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {tipo === 'casal' ? (
            <>
              {/* Série Total Casal */}
              <button
                type="button"
                onClick={() => setSerieAtivaCasalTotal((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  serieAtivaCasalTotal
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#006948] dark:bg-emerald-400 shrink-0"></span>
                <span>Total Casal</span>
              </button>

              {/* Série Pago por P1 */}
              <button
                type="button"
                onClick={() => setSerieAtivaP1((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  serieAtivaP1
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-300 border-blue-300 dark:border-blue-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                }`}
              >
                {p1Photo ? (
                  <img
                    src={p1Photo}
                    alt={p1Nome}
                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-blue-500"
                  />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5] dark:bg-blue-400 shrink-0"></span>
                )}
                <span>Pago por {p1Primeiro}</span>
              </button>

              {/* Série Pago por P2 */}
              <button
                type="button"
                onClick={() => setSerieAtivaP2((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  serieAtivaP2
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-[#712ae2] dark:text-purple-300 border-purple-300 dark:border-purple-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                }`}
              >
                {p2Photo ? (
                  <img
                    src={p2Photo}
                    alt={p2Nome}
                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-purple-500"
                  />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#712ae2] dark:bg-purple-400 shrink-0"></span>
                )}
                <span>Pago por {p2Primeiro}</span>
              </button>
            </>
          ) : (
            <>
              {/* Individual: Total */}
              <button
                type="button"
                onClick={() => setSerieAtivaIndivTotal((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  serieAtivaIndivTotal
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0051d5] dark:text-blue-300 border-blue-300 dark:border-blue-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5] dark:bg-blue-400 shrink-0"></span>
                <span>Total Desembolsado</span>
              </button>

              {/* Individual: Privado */}
              <button
                type="button"
                onClick={() => setSerieAtivaPrivado((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  serieAtivaPrivado
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span>Cofre Privado</span>
              </button>

              {/* Individual: Casal Pago por Mim */}
              <button
                type="button"
                onClick={() => setSerieAtivaCasalPago((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  serieAtivaCasalPago
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#006948] dark:bg-emerald-400 shrink-0"></span>
                <span>Casal (Você pagou)</span>
              </button>

              {/* Individual: Meta/Teto */}
              {tetoPessoalCentavos > 0 && (
                <button
                  type="button"
                  onClick={() => setSerieAtivaTeto((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    serieAtivaTeto
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent opacity-60'
                  }`}
                >
                  <span className="w-2.5 h-0.5 bg-amber-500 shrink-0 border-b border-dashed border-amber-600"></span>
                  <span>Teto Orçamentário</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. Canvas SVG do Gráfico em Linha */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIndiceHover(null)}
          onTouchMove={(e) => {
            if (!svgRef.current || !e.touches[0]) return;
            const rect = svgRef.current.getBoundingClientRect();
            const clientX = e.touches[0].clientX - rect.left;
            const svgRelativeX = (clientX / rect.width) * svgWidth;
            let nearestIndex = 0;
            let minDistance = Infinity;
            pontosAtivos.forEach((_, i) => {
              const px = getX(i);
              const dist = Math.abs(px - svgRelativeX);
              if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = i;
              }
            });
            setIndiceHover(nearestIndex);
          }}
        >
          <defs>
            {/* Gradiente Casal Total */}
            <linearGradient id="gradienteCasalTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006948" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#006948" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradiente Individual Total */}
            <linearGradient id="gradienteIndivTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0051d5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0051d5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade Horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = paddingTop + innerHeight - pct * innerHeight;
            const valorNaLinha = Math.round(pct * maxValorEscala);
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  className="stroke-slate-200/70 dark:stroke-slate-800 stroke-[1]"
                  strokeDasharray={pct === 0 ? undefined : '3 3'}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium tabular-nums select-none"
                >
                  {formatarValor(valorNaLinha)}
                </text>
              </g>
            );
          })}

          {/* Área preenchida sob a curva principal */}
          {((tipo === 'casal' && serieAtivaCasalTotal) ||
            (tipo === 'individual' && serieAtivaIndivTotal)) && (
            <path
              d={areaPrincipal}
              fill={tipo === 'casal' ? 'url(#gradienteCasalTotal)' : 'url(#gradienteIndivTotal)'}
            />
          )}

          {/* Linha Meta/Teto (Dashed) */}
          {tipo === 'individual' && serieAtivaTeto && tetoPessoalCentavos > 0 && (
            <path
              d={pathTeto}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="opacity-80"
            />
          )}

          {/* Linhas Casal */}
          {tipo === 'casal' && (
            <>
              {/* Linha P1 (Vinicius) */}
              {serieAtivaP1 && (
                <path
                  d={pathP1}
                  fill="none"
                  stroke="#0051d5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}

              {/* Linha P2 (Silvia) */}
              {serieAtivaP2 && (
                <path
                  d={pathP2}
                  fill="none"
                  stroke="#712ae2"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}

              {/* Linha Total Casal */}
              {serieAtivaCasalTotal && (
                <path
                  d={pathCasalTotal}
                  fill="none"
                  stroke="#006948"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}
            </>
          )}

          {/* Linhas Individual */}
          {tipo === 'individual' && (
            <>
              {/* Linha Cofre Privado */}
              {serieAtivaPrivado && (
                <path
                  d={pathPrivado}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}

              {/* Linha Casal Pago por Mim */}
              {serieAtivaCasalPago && (
                <path
                  d={pathCasalPago}
                  fill="none"
                  stroke="#006948"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}

              {/* Linha Total Desembolsado */}
              {serieAtivaIndivTotal && (
                <path
                  d={pathIndivTotal}
                  fill="none"
                  stroke="#0051d5"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}
            </>
          )}

          {/* Marcadores nos pontos (na visualização semestral ou em dias com gastos) */}
          {pontosAtivos.map((p, i) => {
            const px = getX(i);
            const valTotal = tipo === 'casal' ? p.totalCasalCentavos : p.totalIndividualCentavos;
            const py = getY(valTotal);
            const temGasto = valTotal > 0;
            const isHovered = indiceHover === i;

            if (!temGasto && visaoTemporal === 'diario' && !isHovered) return null;

            return (
              <g key={i}>
                <circle
                  cx={px}
                  cy={py}
                  r={isHovered ? 5.5 : visaoTemporal === 'semestral' ? 4 : 3}
                  className={`${
                    tipo === 'casal'
                      ? 'fill-[#006948] stroke-white dark:stroke-[#161f2e]'
                      : 'fill-[#0051d5] stroke-white dark:stroke-[#161f2e]'
                  } stroke-2 transition-all`}
                />
              </g>
            );
          })}

          {/* Rótulos do Eixo X */}
          {pontosAtivos.map((p, i) => {
            const px = getX(i);
            const y = paddingTop + innerHeight + 16;
            // Para visualização diária, exibe apenas dias estratégicos (a cada 3-5 dias) para não poluir
            const deveMostrarLabel =
              visaoTemporal === 'semestral' ||
              i === 0 ||
              i === pontosAtivos.length - 1 ||
              (parseInt(p.label, 10) % 5 === 0 && i > 1 && i < pontosAtivos.length - 2);

            if (!deveMostrarLabel) return null;

            return (
              <g key={`lbl-${i}`}>
                <text
                  x={px}
                  y={y}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-bold select-none"
                >
                  {p.label}
                </text>
                {p.sublabel && (
                  <text
                    x={px}
                    y={y + 11}
                    textAnchor="middle"
                    className="fill-slate-400 dark:fill-slate-500 text-[8px] uppercase select-none"
                  >
                    {p.sublabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Linha vertical e destaque de Hover */}
          {indiceHover !== null && pontoHoverAtivo && (
            <g className="transition-all duration-75">
              <line
                x1={getX(indiceHover)}
                y1={paddingTop}
                x2={getX(indiceHover)}
                y2={paddingTop + innerHeight}
                className="stroke-slate-400 dark:stroke-slate-500 stroke-[1.5]"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(indiceHover)}
                cy={getY(
                  tipo === 'casal'
                    ? pontoHoverAtivo.totalCasalCentavos
                    : pontoHoverAtivo.totalIndividualCentavos
                )}
                r="7"
                className="fill-white dark:fill-slate-900 stroke-[#006948] dark:stroke-emerald-400 stroke-3 shadow-md"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {indiceHover !== null && pontoHoverAtivo && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-100 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(getX(indiceHover) / svgWidth) * 100}%`,
              top: `${Math.max(
                30,
                (getY(
                  tipo === 'casal'
                    ? pontoHoverAtivo.totalCasalCentavos
                    : pontoHoverAtivo.totalIndividualCentavos
                ) /
                  svgHeight) *
                  100 -
                  12
              )}%`,
            }}
          >
            <div className="bg-slate-900/95 dark:bg-[#0c131d]/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[190px] max-w-[260px]">
              {/* Header do Tooltip */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-300">
                <span>
                  {visaoTemporal === 'diario'
                    ? `Dia ${pontoHoverAtivo.label} (${pontoHoverAtivo.sublabel})`
                    : `${pontoHoverAtivo.label} ${pontoHoverAtivo.sublabel}`}
                </span>
                <span className="text-[10px] text-emerald-400 font-extrabold tabular-nums">
                  {formatarValor(
                    tipo === 'casal'
                      ? pontoHoverAtivo.totalCasalCentavos
                      : pontoHoverAtivo.totalIndividualCentavos
                  )}
                </span>
              </div>

              {/* Breakdown de Séries no Tooltip */}
              <div className="flex flex-col gap-1 text-[11px]">
                {tipo === 'casal' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>{p1Primeiro}:</span>
                      </span>
                      <strong className="text-blue-300 tabular-nums">
                        {formatarValor(pontoHoverAtivo.pagoP1Centavos)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span>{p2Primeiro}:</span>
                      </span>
                      <strong className="text-purple-300 tabular-nums">
                        {formatarValor(pontoHoverAtivo.pagoP2Centavos)}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span>Cofre Privado:</span>
                      </span>
                      <strong className="text-indigo-300 tabular-nums">
                        {formatarValor(pontoHoverAtivo.privadoCentavos)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Casal (Seu bolso):</span>
                      </span>
                      <strong className="text-emerald-300 tabular-nums">
                        {formatarValor(pontoHoverAtivo.casalPagoPorMimCentavos)}
                      </strong>
                    </div>

                    {tetoPessoalCentavos > 0 && pontoHoverAtivo.tetoCentavos && (
                      <div className="flex items-center justify-between text-amber-300 pt-0.5 border-t border-slate-800">
                        <span>Teto de Referência:</span>
                        <strong className="tabular-nums">
                          {formatarValor(pontoHoverAtivo.tetoCentavos)}
                        </strong>
                      </div>
                    )}
                  </>
                )}

                {/* Lista de itens que ocorreram nesse ponto */}
                {pontoHoverAtivo.itens && pontoHoverAtivo.itens.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-300">Compras no dia:</span>
                    {pontoHoverAtivo.itens.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 truncate">
                        <span className="truncate">{item.nome}</span>
                        <span className="tabular-nums font-semibold shrink-0">
                          {formatarValor(item.valorCentavos)}
                        </span>
                      </div>
                    ))}
                    {pontoHoverAtivo.itens.length > 3 && (
                      <span className="text-[9px] text-slate-500 italic">
                        + {pontoHoverAtivo.itens.length - 3} outra(s)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

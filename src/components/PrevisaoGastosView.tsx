import React, { useState, useMemo } from 'react';
import { CategoriaMeta, Compra, CoupleSpace, UserProfile, UsuarioId } from '../types';
import { formatarBRL } from '../calculations/acertoMensal';
import {
  calcularPrevisaoGastos,
  ConfiguracaoPrevisao,
  MetodoPrevisao,
} from '../calculations/timeSeriesForecasting';
import { CategoryIconOrImage } from './CategoryIconOrImage';
import { SeletorMesFlutuante } from './SeletorMesFlutuante';
import { ModalComoFuncionaPrevisao } from './ModalComoFuncionaPrevisao';

interface PrevisaoGastosViewProps {
  mesSelecionado: string;
  onMudarMes: (novoMes: string) => void;
  comprasCasal: Compra[];
  comprasIndividuais: Compra[];
  categorias?: CategoriaMeta[];
  usuarioAtual: UsuarioId;
  couple?: CoupleSpace | null;
  userProfile?: UserProfile | null;
  onIrParaLancamentos: () => void;
  onIrParaResumoMensal: () => void;
}

export const PrevisaoGastosView: React.FC<PrevisaoGastosViewProps> = ({
  mesSelecionado,
  onMudarMes,
  comprasCasal,
  comprasIndividuais,
  categorias = [],
  usuarioAtual,
  couple,
  userProfile,
  onIrParaLancamentos,
  onIrParaResumoMensal,
}) => {
  // Controle de escopo: Casal vs Individual
  const [escopo, setEscopo] = useState<'casal' | 'individual'>('casal');

  // Configuração do modelo preditivo
  const [metodo, setMetodo] = useState<MetodoPrevisao>('wma');
  const [janelaMeses, setJanelaMeses] = useState<number>(3);
  const [mostrarPainelAvancado, setMostrarPainelAvancado] = useState(false);
  const [modalComoFuncionaAberta, setModalComoFuncionaAberta] = useState(false);
  const [guiaExpandido, setGuiaExpandido] = useState(false);

  // Pesos para WMA (do mais recente para o mais antigo)
  const pesosWMA = useMemo(() => {
    if (janelaMeses === 3) return [3, 2, 1];
    if (janelaMeses === 6) return [6, 5, 4, 3, 2, 1];
    return Array.from({ length: janelaMeses }, (_, i) => janelaMeses - i);
  }, [janelaMeses]);

  const config: ConfiguracaoPrevisao = useMemo(
    () => ({
      metodo,
      janelaMeses,
      pesosPersonalizados: metodo === 'wma' ? pesosWMA : undefined,
    }),
    [metodo, janelaMeses, pesosWMA]
  );

  const p1Uid = couple?.partner1Uid || 'Vinicius';
  const p2Uid = couple?.partner2Uid || 'Silvia';
  const p1Nome = couple?.partner1Name || 'Vinicius';
  const p2Nome = couple?.partner2Name || 'Silvia';

  // Conjunto de compras ativas para o cálculo preditivo
  const comprasAtivas = escopo === 'casal' ? comprasCasal : comprasIndividuais;

  // Executa o motor estatístico de forecasting
  const resultado = useMemo(() => {
    return calcularPrevisaoGastos(
      comprasAtivas,
      mesSelecionado,
      config,
      escopo,
      userProfile?.uid || usuarioAtual,
      p1Uid,
      p2Uid
    );
  }, [comprasAtivas, mesSelecionado, config, escopo, userProfile?.uid, usuarioAtual, p1Uid, p2Uid]);

  // Dimensionamento do Gráfico SVG de Previsão
  const svgWidth = 840;
  const svgHeight = 260;
  const paddingX = 55;
  const paddingTop = 30;
  const paddingBottom = 45;
  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxGrafico = useMemo(() => {
    let max = 0;
    resultado.pontosGrafico.forEach((p) => {
      max = Math.max(max, p.valorCentavos, p.faixaMaximaCentavos || 0);
    });
    if (max === 0) return 10000;
    return Math.ceil((max * 1.2) / 1000) * 1000;
  }, [resultado.pontosGrafico]);

  const getX = (index: number) => {
    const total = resultado.pontosGrafico.length;
    if (total <= 1) return paddingX + innerWidth / 2;
    return paddingX + (index / (total - 1)) * innerWidth;
  };

  const getY = (valorCentavos: number) => {
    const ratio = Math.min(1, Math.max(0, valorCentavos / maxGrafico));
    return paddingTop + innerHeight - ratio * innerHeight;
  };

  // Coordenadas dos pontos
  const pontosCoords = useMemo(() => {
    return resultado.pontosGrafico.map((p, idx) => ({
      ...p,
      x: getX(idx),
      y: getY(p.valorCentavos),
      yMin: p.faixaMinimaCentavos !== undefined ? getY(p.faixaMinimaCentavos) : undefined,
      yMax: p.faixaMaximaCentavos !== undefined ? getY(p.faixaMaximaCentavos) : undefined,
    }));
  }, [resultado.pontosGrafico, maxGrafico]);

  // Divide entre série histórica real e projeção/previsão
  const pontosHistoricos = pontosCoords.filter(
    (p) => p.tipo === 'historico_completo' || p.tipo === 'mes_atual_realizado'
  );

  const pontoAtual = pontosCoords.find((p) => p.tipo === 'mes_atual_projetado');
  const pontoPrevisao = pontosCoords.find((p) => p.tipo === 'previsao_futura');

  // SVG Paths
  const pathHistorico = useMemo(() => {
    if (pontosHistoricos.length === 0) return '';
    let d = `M ${pontosHistoricos[0].x.toFixed(1)} ${pontosHistoricos[0].y.toFixed(1)}`;
    for (let i = 1; i < pontosHistoricos.length; i++) {
      d += ` L ${pontosHistoricos[i].x.toFixed(1)} ${pontosHistoricos[i].y.toFixed(1)}`;
    }
    return d;
  }, [pontosHistoricos]);

  // Path conectando o último ponto histórico ao mês atual projetado e previsão futura
  const pathPrevisaoTracejado = useMemo(() => {
    const ultHistorico = pontosHistoricos[pontosHistoricos.length - 1];
    if (!ultHistorico) return '';

    let d = `M ${ultHistorico.x.toFixed(1)} ${ultHistorico.y.toFixed(1)}`;
    if (pontoAtual) {
      d += ` L ${pontoAtual.x.toFixed(1)} ${pontoAtual.y.toFixed(1)}`;
    }
    if (pontoPrevisao) {
      d += ` L ${pontoPrevisao.x.toFixed(1)} ${pontoPrevisao.y.toFixed(1)}`;
    }
    return d;
  }, [pontosHistoricos, pontoAtual, pontoPrevisao]);

  // Área sombreada do intervalo de confiança para a previsão
  const areaIncerteza = useMemo(() => {
    if (!pontoAtual || !pontoPrevisao || pontoPrevisao.yMin === undefined || pontoPrevisao.yMax === undefined) {
      return '';
    }
    return `M ${pontoAtual.x.toFixed(1)} ${pontoAtual.y.toFixed(1)}
            L ${pontoPrevisao.x.toFixed(1)} ${pontoPrevisao.yMax.toFixed(1)}
            L ${pontoPrevisao.x.toFixed(1)} ${pontoPrevisao.yMin.toFixed(1)} Z`;
  }, [pontoAtual, pontoPrevisao]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Header de Contexto da Previsão */}
      <section className="bg-white dark:bg-[#161f2e] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#006948] to-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">insights</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Previsão Financeira & Inteligência Preditiva
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-[#006948] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Time Series Forecasting
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Análise estatística sobre o histórico real dos lançamentos para antecipar desembolsos,
                planejar o fechamento do mês atual e prever o orçamento do próximo período com faixas de confiança.
              </p>
            </div>
          </div>

          {/* Navegador de Mês & Toggle de Escopo (Casal vs Individual) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-start lg:self-auto">
            <SeletorMesFlutuante
              mesSelecionado={mesSelecionado}
              onMudarMes={onMudarMes}
              variante={escopo}
              tamanho="sm"
            />

            {/* Toggle de Escopo */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setEscopo('casal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  escopo === 'casal'
                    ? 'bg-white dark:bg-slate-700 text-[#006948] dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#006948] shrink-0"></span>
                <span>Casal</span>
              </button>
              <button
                type="button"
                onClick={() => setEscopo('individual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  escopo === 'individual'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                <span>Individual</span>
              </button>
            </div>

            {/* Botão Como Funciona a Previsão */}
            <button
              type="button"
              onClick={() => setModalComoFuncionaAberta(true)}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/80 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#006948] dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Entenda como os cálculos e modelos estatísticos são processados"
            >
              <span className="material-symbols-outlined text-[17px]">help_outline</span>
              <span>Como Funciona?</span>
            </button>
          </div>
        </div>

        {/* Diagnóstico de Suficiência de Dados Banner */}
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 ${
            resultado.suficienciaDados === 'completa'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
              : resultado.suficienciaDados === 'moderada'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
              : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {resultado.suficienciaDados === 'completa'
                ? 'verified'
                : resultado.suficienciaDados === 'moderada'
                ? 'info'
                : 'history_toggle_drop_down'}
            </span>
            <span className="font-medium">{resultado.mensagemSuficiencia}</span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarPainelAvancado((p) => !p)}
            className="text-xs font-bold underline cursor-pointer shrink-0 hover:opacity-80"
          >
            {mostrarPainelAvancado ? 'Ocultar Parâmetros' : 'Ajustar Modelo & Pesos'}
          </button>
        </div>

        {/* Guia Explicativo Rápido Integrado (Com expansão interativa) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#006948] dark:text-emerald-400">
                lightbulb
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Como esta previsão é calculada?
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                (Dados reais de compras, parcelas e assinaturas)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuiaExpandido((prev) => !prev)}
                className="text-xs font-bold text-[#006948] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{guiaExpandido ? 'Recolher Explicação' : 'Ver Explicação Rápida'}</span>
                <span className="material-symbols-outlined text-[16px]">
                  {guiaExpandido ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setModalComoFuncionaAberta(true)}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                Abrir Guia Completo
              </button>
            </div>
          </div>

          {/* Cards Rápidos Explicativos quando expandido */}
          {guiaExpandido && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs animate-in fade-in duration-150">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 flex flex-col gap-1">
                <span className="font-bold text-[#006948] dark:text-emerald-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">database</span>
                  1. Dados Reais
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                  Calculado exclusivamente a partir das compras do espaço. Parcelas e assinaturas entram na data de competência correta sem duplicidades.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 flex flex-col gap-1">
                <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  2. Projeção Mês Atual
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                  Combina os <strong>gastos realizados até hoje</strong> + <strong>ritmo diário</strong> para os dias restantes + <strong>parcelas/assinaturas agendadas</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 flex flex-col gap-1">
                <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">query_stats</span>
                  3. Previsão Próximo Mês
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                  Usa Média Ponderada (WMA) com pesos maiores aos meses recentes + Cone de Incerteza (Mínimo, Esperado e Máximo) pela volatilidade.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 flex flex-col gap-1">
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">account_tree</span>
                  4. Conciliação Categorias
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                  Cada categoria tem sua projeção própria calibrada proporcionalmente de modo que a soma de todas seja <strong>rigorosamente igual a 100%</strong> do total previsto.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Painel de Configurações Avançadas de Forecasting */}
        {mostrarPainelAvancado && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Parâmetros do Modelo Estatístico
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Seletor de Método */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Método de Previsão:
                </label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value as MetodoPrevisao)}
                  className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <option value="wma">Média Móvel Ponderada (WMA) — Recomendado</option>
                  <option value="sma">Média Móvel Simples (SMA)</option>
                  <option value="tendencia">Tendência Linear com Amortecimento (Holt)</option>
                </select>
              </div>

              {/* Janela de Histórico */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Janela de Meses Considerados:
                </label>
                <div className="inline-flex w-full p-0.5 bg-slate-200/70 dark:bg-slate-900 rounded-lg">
                  {[3, 6, 12].map((meses) => (
                    <button
                      key={meses}
                      type="button"
                      onClick={() => setJanelaMeses(meses)}
                      className={`flex-1 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        janelaMeses === meses
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {meses} Meses
                    </button>
                  ))}
                </div>
              </div>

              {/* Informação sobre Pesos */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Ponderação Aplicada:
                </label>
                <div className="h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {metodo === 'wma'
                    ? `Pesos [${pesosWMA.join(', ')}] (Mais recente tem peso ${pesosWMA[0]})`
                    : metodo === 'sma'
                    ? `Pesos iguais (1/${janelaMeses} para cada mês)`
                    : 'Regressão de Mínimos Quadrados'}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Os 3 Resultados Principais: Cards de Destaque */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card A: Previsão do Próximo Mês com Faixa de Incerteza */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/40 dark:via-[#161f2e] dark:to-[#161f2e] border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#006948] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">event_upcoming</span>
                <span>Previsão Próximo Mês ({resultado.nomeMesAlvo})</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#006948] dark:text-emerald-300 text-[10px] font-extrabold">
                {resultado.direcaoTendencia === 'alta'
                  ? '↑ Tendência Alta'
                  : resultado.direcaoTendencia === 'baixa'
                  ? '↓ Tendência Queda'
                  : '→ Estável'}
              </span>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
              {formatarBRL(resultado.previsaoTotalCentavos)}
            </div>

            {/* Faixa de Incerteza (Intervalo de Confiança) */}
            <div className="mt-2.5 p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                <span>Faixa Estimada (Incerteza):</span>
                <span className="font-bold text-[#006948] dark:text-emerald-300 tabular-nums">
                  ± {formatarBRL(resultado.intervaloConfianca.margemCentavos)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                <span>Mín: {formatarBRL(resultado.intervaloConfianca.minimoCentavos)}</span>
                <span>Máx: {formatarBRL(resultado.intervaloConfianca.maximoCentavos)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Fixos Agendados: <strong>{formatarBRL(resultado.compromissosFixosAgendadosCentavos)}</strong></span>
            <span>Variável Est.: <strong>{formatarBRL(resultado.gastoVariavelPrevistoCentavos)}</strong></span>
          </div>
        </div>

        {/* Card B: Projeção de Fechamento do Mês Atual */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
                <span>Projeção para o Final do Mês</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                Dia {resultado.projecaoMesAtual.diasDecorridos} de {resultado.projecaoMesAtual.totalDiasNoMes}
              </span>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
              {formatarBRL(resultado.projecaoMesAtual.projecaoFinalCentavos)}
            </div>

            {/* Ritmo Diário & Gastos Realizados */}
            <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                <span>Já Realizado no Mês:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatarBRL(resultado.projecaoMesAtual.gastoRealizadoAteHojeCentavos)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                <span>Ritmo Variável Médio:</span>
                <span>{formatarBRL(resultado.projecaoMesAtual.ritmoDiarioCentavos)}/dia</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {resultado.projecaoMesAtual.observacao}
          </div>
        </div>

        {/* Card C: Comparação com Histórico & Desempenho */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161f2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">compare_arrows</span>
                <span>Comparação com Histórico</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Média {resultado.janelaUtilizada}M
              </span>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-1">
              {formatarBRL(resultado.mediaHistoricaCentavos)}
            </div>

            {/* Variações percentuais */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Vs Média Histórica</span>
                <span
                  className={`font-extrabold text-xs tabular-nums ${
                    resultado.variacaoVsMediaHistoricaPercentual > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {resultado.variacaoVsMediaHistoricaPercentual > 0 ? '+' : ''}
                  {resultado.variacaoVsMediaHistoricaPercentual}%
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Vs Último Mês</span>
                <span
                  className={`font-extrabold text-xs tabular-nums ${
                    resultado.variacaoVsUltimoMesPercentual > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {resultado.variacaoVsUltimoMesPercentual > 0 ? '+' : ''}
                  {resultado.variacaoVsUltimoMesPercentual}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Método: {resultado.nomeMetodo.split(' ')[0]}</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {resultado.historicoMeses.filter((m) => m.ehMesCompleto).length} meses completos
            </span>
          </div>
        </div>
      </section>

      {/* 3. Gráfico Temporal Integrado: Histórico Real + Projeção + Previsão */}
      <section className="bg-white dark:bg-[#161f2e] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Trajetória Histórica e Linha de Previsão
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Gráfico Temporal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              A linha sólida representa gastos consolidados passados; a linha tracejada e o cone sombreado
              indicam a projeção do mês em curso e a estimativa futura com incerteza.
            </p>
          </div>

          {/* Legenda visual do gráfico */}
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-3 h-0.5 bg-[#006948] dark:bg-emerald-400"></span>
              <span>Histórico Real</span>
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-3 h-0.5 border-b border-dashed border-blue-500"></span>
              <span>Projeção Mês Atual</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rotate-45 bg-[#006948] dark:bg-emerald-400"></span>
              <span>Previsão Próximo Mês</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 bg-emerald-500/20 rounded-xs"></span>
              <span>Faixa de Incerteza</span>
            </span>
          </div>
        </div>

        {/* Canvas SVG do Gráfico de Previsão */}
        <div className="w-full overflow-hidden select-none">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="gradienteFaixaIncerteza" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade Horizontais */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = paddingTop + innerHeight - pct * innerHeight;
              const valLinha = Math.round(pct * maxGrafico);
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
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium tabular-nums"
                  >
                    {formatarBRL(valLinha)}
                  </text>
                </g>
              );
            })}

            {/* Cone de Incerteza da Previsão */}
            {areaIncerteza && (
              <path d={areaIncerteza} fill="url(#gradienteFaixaIncerteza)" className="transition-all" />
            )}

            {/* Linha Contínua: Histórico Real Consolidado */}
            {pathHistorico && (
              <path
                d={pathHistorico}
                fill="none"
                stroke="#006948"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all"
              />
            )}

            {/* Linha Tracejada: Projeção Mês Atual e Previsão Futura */}
            {pathPrevisaoTracejado && (
              <path
                d={pathPrevisaoTracejado}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeDasharray="5 4"
                strokeLinecap="round"
                className="transition-all"
              />
            )}

            {/* Marcadores dos Pontos */}
            {pontosCoords.map((p, idx) => {
              const ehHistorico = p.tipo === 'historico_completo';
              const ehAtual = p.tipo === 'mes_atual_projetado';
              const ehFuturo = p.tipo === 'previsao_futura';

              return (
                <g key={idx}>
                  {/* Ponto Futuro: Marcador em Diamante */}
                  {ehFuturo ? (
                    <g transform={`translate(${p.x}, ${p.y}) rotate(45)`}>
                      <rect
                        x="-6"
                        y="-6"
                        width="12"
                        height="12"
                        className="fill-emerald-500 stroke-white dark:stroke-[#161f2e] stroke-2 shadow-lg"
                      />
                    </g>
                  ) : ehAtual ? (
                    /* Ponto Mês Atual Projetado: Círculo duplo */
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      className="fill-blue-500 stroke-white dark:stroke-[#161f2e] stroke-2 shadow-md animate-pulse"
                    />
                  ) : (
                    /* Ponto Histórico: Círculo padrão */
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      className="fill-[#006948] stroke-white dark:stroke-[#161f2e] stroke-2"
                    />
                  )}

                  {/* Valor monetário flutuante sobre os pontos */}
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className={`text-[10px] font-extrabold tabular-nums select-none ${
                      ehFuturo
                        ? 'fill-emerald-600 dark:fill-emerald-400 font-black'
                        : ehAtual
                        ? 'fill-blue-600 dark:fill-blue-400'
                        : 'fill-slate-700 dark:fill-slate-300'
                    }`}
                  >
                    {formatarBRL(p.valorCentavos)}
                  </text>

                  {/* Rótulo de Mês no Eixo X */}
                  <text
                    x={p.x}
                    y={paddingTop + innerHeight + 18}
                    textAnchor="middle"
                    className={`text-[10px] font-bold select-none ${
                      ehFuturo
                        ? 'fill-emerald-600 dark:fill-emerald-400 uppercase tracking-wider'
                        : ehAtual
                        ? 'fill-blue-600 dark:fill-blue-400'
                        : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* 4. Previsão por Categoria (Hierárquica e Conciliada) */}
      <section className="bg-white dark:bg-[#161f2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#006948] dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">category</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Previsão Detalhada por Categoria
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Estimativas individuais ponderadas por categoria, com conciliação proporcional para bater
              exatamente o total previsto de {formatarBRL(resultado.previsaoTotalCentavos)}.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-start sm:self-auto">
            {resultado.categorias.length} categorias analisadas
          </span>
        </div>

        {resultado.categorias.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhuma categoria com histórico registrado.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#111a28] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Média Histórica</th>
                  <th className="py-3 px-4 text-right">Previsão Conciliada</th>
                  <th className="py-3 px-4 text-center">Peso no Total</th>
                  <th className="py-3 px-4 text-center">Tendência</th>
                  <th className="py-3 px-4 text-center">Confiabilidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resultado.categorias.map((cat) => {
                  const metaCat = categorias.find(
                    (c) => c.id === cat.categoriaId || c.nome.toLowerCase() === cat.nome.toLowerCase()
                  );

                  return (
                    <tr
                      key={cat.categoriaId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CategoryIconOrImage
                            icone={metaCat?.icone}
                            imagemUrl={metaCat?.imagemUrl}
                            nome={cat.nome}
                            size="sm"
                          />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {cat.nome}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatarBRL(cat.historicoMedioCentavos)}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-[#006948] dark:text-emerald-400 tabular-nums whitespace-nowrap text-sm">
                        {formatarBRL(cat.previsaoConciliadaCentavos)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                          {cat.percentualDoTotal}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            cat.tendencia === 'alta'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : cat.tendencia === 'baixa'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {cat.tendencia === 'alta'
                              ? 'trending_up'
                              : cat.tendencia === 'baixa'
                              ? 'trending_down'
                              : 'trending_flat'}
                          </span>
                          <span>
                            {cat.tendencia === 'alta'
                              ? 'Subindo'
                              : cat.tendencia === 'baixa'
                              ? 'Em Queda'
                              : 'Estável'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.confiabilidade === 'alta'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#006948] dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
                              : cat.confiabilidade === 'moderada'
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50'
                          }`}
                          title={cat.motivoConfiabilidade}
                        >
                          {cat.confiabilidade === 'alta'
                            ? 'Alta Certeza'
                            : cat.confiabilidade === 'moderada'
                            ? 'Moderada'
                            : 'Esporádica'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Painel de Validação Temporal & Backtesting */}
      {resultado.validacao && (
        <section className="bg-white dark:bg-[#161f2e] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Validação de Qualidade do Modelo (Backtesting)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                  resultado.validacao.superouBenchmark
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-[#006948] dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {resultado.validacao.superouBenchmark ? 'check_circle' : 'info'}
                </span>
                <span>
                  {resultado.validacao.superouBenchmark
                    ? 'Superou Benchmark Naive'
                    : 'Desempenho Similar ao Naive'}
                </span>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Testado iterativamente contra os meses consolidados passados utilizando metodologia walk-forward temporal.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                MAE (Erro Médio Absoluto)
              </span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                {formatarBRL(resultado.validacao.maeCentavos)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                WAPE (Erro Ponderado %)
              </span>
              <span className="text-base font-extrabold text-purple-600 dark:text-purple-400 tabular-nums mt-0.5 block">
                {resultado.validacao.wapePercentual}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                MAE Benchmark Naive
              </span>
              <span className="text-base font-extrabold text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 block">
                {formatarBRL(resultado.validacao.maeNaiveCentavos)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Meses Testados
              </span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                {resultado.validacao.pontosAvaliados} meses
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Modal Explicativo da Metodologia de Previsão */}
      <ModalComoFuncionaPrevisao
        aberto={modalComoFuncionaAberta}
        onFechar={() => setModalComoFuncionaAberta(false)}
      />
    </div>
  );
};

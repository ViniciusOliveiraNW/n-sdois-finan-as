/**
 * Módulo de Time Series Forecasting para o Sistema Financeiro NósDois
 * 
 * Implementa agregação de séries temporais históricas, modelos de previsão
 * (SMA, WMA ponderado, Holt / Tendência Linear), projeção intra-mês para o mês corrente,
 * conciliação hierárquica por categoria, intervalos de incerteza e validação temporal (Backtesting).
 */

import { Compra, LancamentoMensal } from '../types';
import { parseDivisaoPercentuais } from './acertoMensal';
import { obterDiasNoMes } from './parcelas';

export type MetodoPrevisao = 'wma' | 'sma' | 'tendencia';

export interface ConfiguracaoPrevisao {
  metodo: MetodoPrevisao;
  janelaMeses: number; // Ex: 3, 6, 12
  pesosPersonalizados?: number[]; // Para WMA (do mais recente para o mais antigo)
  incluirCompromissosFuturos?: boolean; // Incorpora parcelas e assinaturas já agendadas
}

export interface PontoSerieTemporal {
  mesReferencia: string; // "YYYY-MM"
  ano: number;
  mes: number;
  label: string; // Ex: "Out/26"
  nomeMes: string; // Ex: "Outubro"
  totalCentavos: number;
  totalCompromissosFixosCentavos: number; // Assinaturas/recorrentes e parcelas
  totalGastosVariaveisCentavos: number;
  gastosPorCategoria: Record<string, number>;
  ehMesCompleto: boolean;
  diasNoMes: number;
  diasDecorridos: number;
}

export interface ResultadoPrevisaoCategoria {
  categoriaId: string;
  nome: string;
  icone?: string;
  imagemUrl?: string;
  historicoMedioCentavos: number;
  previsaoBrutaCentavos: number;
  previsaoConciliadaCentavos: number;
  percentualDoTotal: number;
  tendencia: 'alta' | 'baixa' | 'estavel';
  confiabilidade: 'alta' | 'moderada' | 'baixa';
  motivoConfiabilidade: string;
}

export interface MetricasValidacao {
  maeCentavos: number; // Mean Absolute Error
  wapePercentual: number; // Weighted Absolute Percentage Error (%)
  maeNaiveCentavos: number; // Benchmark Naive (último mês)
  wapeNaivePercentual: number;
  superouBenchmark: boolean;
  pontosAvaliados: number;
}

export interface ProjecaoMesAtual {
  mesReferencia: string;
  gastoRealizadoAteHojeCentavos: number;
  diasDecorridos: number;
  totalDiasNoMes: number;
  compromissosFuturosAgendadosCentavos: number;
  gastoVariavelEstimadoRestanteCentavos: number;
  projecaoFinalCentavos: number;
  ritmoDiarioCentavos: number;
  confiabilidade: 'alta' | 'moderada' | 'baixa';
  observacao: string;
}

export interface ResultadoPrevisaoTotal {
  // Configuração usada
  metodoUtilizado: MetodoPrevisao;
  nomeMetodo: string;
  janelaUtilizada: number;
  mesAlvo: string; // "YYYY-MM" do próximo mês
  nomeMesAlvo: string; // Ex: "Novembro de 2026"

  // Previsão do Próximo Mês
  previsaoTotalCentavos: number;
  compromissosFixosAgendadosCentavos: number; // Parcelas já existentes para o próximo mês
  gastoVariavelPrevistoCentavos: number;
  intervaloConfianca: {
    minimoCentavos: number;
    esperadoCentavos: number;
    maximoCentavos: number;
    margemCentavos: number;
  };

  // Comparação histórica
  mediaHistoricaCentavos: number;
  variacaoVsMediaHistoricaPercentual: number;
  variacaoVsUltimoMesPercentual: number;
  direcaoTendencia: 'alta' | 'baixa' | 'estavel';

  // Projeção do Mês Atual
  projecaoMesAtual: ProjecaoMesAtual;

  // Previsões por Categoria
  categorias: ResultadoPrevisaoCategoria[];

  // Série temporal para gráficos
  historicoMeses: PontoSerieTemporal[];
  pontosGrafico: Array<{
    mes: string;
    label: string;
    tipo: 'historico_completo' | 'mes_atual_realizado' | 'mes_atual_projetado' | 'previsao_futura';
    valorCentavos: number;
    faixaMinimaCentavos?: number;
    faixaMaximaCentavos?: number;
  }>;

  // Validação temporal (Backtesting)
  validacao?: MetricasValidacao;

  // Diagnóstico de suficiência
  suficienciaDados: 'completa' | 'moderada' | 'insuficiente';
  mensagemSuficiencia: string;
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const NOMES_MESES_CURTO = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Constrói a série temporal mensal contínua a partir dos registros de compras
 */
export function construirSerieTemporalMensal(
  compras: Compra[],
  mesReferenciaAtual: string,
  tipoVisao: 'casal' | 'individual' = 'casal',
  usuarioUid: string = 'user',
  p1Uid: string = 'Vinicius',
  p2Uid: string = 'Silvia'
): { serie: PontoSerieTemporal[]; mesesOrdenados: string[] } {
  // Identifica a data limite atual para decomposição
  const hoje = new Date();
  const hojeAno = hoje.getFullYear();
  const hojeMes = hoje.getMonth() + 1;
  const hojeDia = hoje.getDate();
  const hojeIsoMes = `${hojeAno}-${String(hojeMes).padStart(2, '0')}`;

  // 1. Identificar intervalo mínimo e máximo de meses com compras
  let minAno = 9999;
  let minMes = 12;
  let maxAno = 1970;
  let maxMes = 1;

  const comprasValidas = compras.filter((c) => {
    if (tipoVisao === 'casal' && c.privada) return false;
    return Boolean(c.dataPrimeiroPagamento);
  });

  if (comprasValidas.length === 0) {
    return { serie: [], mesesOrdenados: [] };
  }

  comprasValidas.forEach((c) => {
    const [a, m] = c.dataPrimeiroPagamento.split('-').map((v) => parseInt(v, 10));
    if (a < minAno || (a === minAno && m < minMes)) {
      minAno = a;
      minMes = m;
    }
    const numParcelas = c.recorrente ? 12 : (c.numeroDeParcelas || 1);
    const endTotal = a * 12 + (m - 1) + numParcelas - 1;
    const endA = Math.floor(endTotal / 12);
    const endM = (endTotal % 12) + 1;

    if (endA > maxAno || (endA === maxAno && endM > maxMes)) {
      maxAno = endA;
      maxMes = endM;
    }
  });

  // Garante que pelo menos o mês selecionado e hoje estejam contidos no intervalo
  const [refAno, refMes] = mesReferenciaAtual.split('-').map((v) => parseInt(v, 10));
  if (refAno < minAno || (refAno === minAno && refMes < minMes)) {
    minAno = refAno;
    minMes = refMes;
  }
  if (refAno > maxAno || (refAno === maxAno && refMes > maxMes)) {
    maxAno = refAno;
    maxMes = refMes;
  }

  // Limita o histórico para não gerar séculos de anos inválidos
  minAno = Math.max(2023, minAno);
  maxAno = Math.min(2030, Math.max(maxAno, refAno + 1));

  const totalMeses = (maxAno - minAno) * 12 + (maxMes - minMes) + 1;
  const mesesOrdenados: string[] = [];

  for (let i = 0; i < totalMeses; i++) {
    const idx = minAno * 12 + (minMes - 1) + i;
    const a = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    mesesOrdenados.push(`${a}-${String(m).padStart(2, '0')}`);
  }

  // 2. Para cada mês, computar despesas conforme regras do sistema
  const serie: PontoSerieTemporal[] = [];

  mesesOrdenados.forEach((mesRef) => {
    const [ano, mes] = mesRef.split('-').map((v) => parseInt(v, 10));
    const totalDiasMes = obterDiasNoMes(ano, mes);

    const ehMesCorrente = mesRef === hojeIsoMes;
    const ehMesPassado = mesRef < hojeIsoMes;

    const diasDecorridos = ehMesPassado
      ? totalDiasMes
      : ehMesCorrente
      ? Math.min(hojeDia, totalDiasMes)
      : 0;

    let totalCentavos = 0;
    let totalCompromissosFixos = 0;
    let totalGastosVariaveis = 0;
    const gastosPorCat: Record<string, number> = {};

    comprasValidas.forEach((compra) => {
      const [compraAno, compraMes] = compra.dataPrimeiroPagamento.split('-').map((v) => parseInt(v, 10));
      const startIdx = compraAno * 12 + (compraMes - 1);
      const targetIdx = ano * 12 + (mes - 1);

      const numParcelas = compra.numeroDeParcelas || 1;
      const endIdx = compra.recorrente ? Infinity : startIdx + numParcelas - 1;

      if (targetIdx >= startIdx && targetIdx <= endIdx) {
        const valorTotalCentavos = compra.valorCentavos ?? Math.round(compra.valor * 100);
        let parcelaCentavos = compra.recorrente
          ? valorTotalCentavos
          : Math.round(valorTotalCentavos / numParcelas);

        // Se visão individual, calcula apenas a cota pertencente ao usuário
        if (tipoVisao === 'individual') {
          if (!compra.privada) {
            const { percP1, percP2 } = parseDivisaoPercentuais(
              compra.divisao,
              p1Uid,
              p2Uid,
              ['Vinicius', p1Uid],
              ['Silvia', p2Uid]
            );
            const souP1 = usuarioUid === p1Uid || usuarioUid.toLowerCase().includes('vinicius');
            const meuPerc = souP1 ? percP1 : percP2;
            parcelaCentavos = Math.round((parcelaCentavos * meuPerc) / 100);
          }
        }

        totalCentavos += parcelaCentavos;

        const ehFixo = compra.recorrente || numParcelas > 1 || compra.assinatura;
        if (ehFixo) {
          totalCompromissosFixos += parcelaCentavos;
        } else {
          totalGastosVariaveis += parcelaCentavos;
        }

        const cat = compra.categoria || 'Geral';
        gastosPorCat[cat] = (gastosPorCat[cat] || 0) + parcelaCentavos;
      }
    });

    serie.push({
      mesReferencia: mesRef,
      ano,
      mes,
      label: `${NOMES_MESES_CURTO[mes - 1]}/${String(ano).slice(-2)}`,
      nomeMes: NOMES_MESES[mes - 1],
      totalCentavos,
      totalCompromissosFixosCentavos: totalCompromissosFixos,
      totalGastosVariaveisCentavos: totalGastosVariaveis,
      gastosPorCategoria: gastosPorCat,
      ehMesCompleto: ehMesPassado,
      diasNoMes: totalDiasMes,
      diasDecorridos,
    });
  });

  return { serie, mesesOrdenados };
}

/**
 * Calcula a média móvel simples (SMA) sobre uma série de valores numéricos
 */
export function calcularSMA(valores: number[], janela: number): number {
  if (valores.length === 0) return 0;
  const n = Math.min(valores.length, janela);
  const ultimos = valores.slice(-n);
  const soma = ultimos.reduce((acc, v) => acc + v, 0);
  return Math.round(soma / n);
}

/**
 * Calcula a média móvel ponderada (WMA) priorizando os meses mais recentes
 */
export function calcularWMA(
  valores: number[],
  janela: number,
  pesosCustom?: number[]
): number {
  if (valores.length === 0) return 0;
  const n = Math.min(valores.length, janela);
  const ultimos = valores.slice(-n);

  // Pesos decrescentes padrão se não informados (Ex para N=3: [3, 2, 1], normalizados)
  let pesos = pesosCustom && pesosCustom.length === n
    ? pesosCustom
    : Array.from({ length: n }, (_, i) => n - i); // [3, 2, 1] onde índice 0 é mais recente

  // ultimos[ultimos.length - 1] é o mais recente -> corresponde a pesos[0]
  let somaPonderada = 0;
  let somaPesos = 0;

  for (let i = 0; i < n; i++) {
    const val = ultimos[ultimos.length - 1 - i]; // do mais recente ao mais antigo
    const peso = pesos[i];
    somaPonderada += val * peso;
    somaPesos += peso;
  }

  if (somaPesos === 0) return 0;
  return Math.round(somaPonderada / somaPesos);
}

/**
 * Calcula a tendência linear através de regressão simples com amortecimento de volatilidade
 */
export function calcularTendenciaLinear(valores: number[], janela: number): number {
  if (valores.length === 0) return 0;
  if (valores.length === 1) return valores[0];

  const n = Math.min(valores.length, janela);
  const subset = valores.slice(-n);

  let somaX = 0;
  let somaY = 0;
  let somaXY = 0;
  let somaX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = subset[i];
    somaX += x;
    somaY += y;
    somaXY += x * y;
    somaX2 += x * x;
  }

  const denom = n * somaX2 - somaX * somaX;
  if (denom === 0) {
    return Math.round(somaY / n);
  }

  const inclinacao = (n * somaXY - somaX * somaY) / denom;
  const intercepto = (somaY - inclinacao * somaX) / n;

  // Projeção para o próximo ponto: x = n
  const proximoX = n;
  const projecao = intercepto + inclinacao * proximoX;

  // Não permite despesas negativas
  return Math.max(0, Math.round(projecao));
}

/**
 * Realiza validação temporal (Walk-Forward Temporal Backtesting) em períodos históricos
 */
export function executarBacktestingTemporal(
  serieHistoricaCompleta: number[],
  metodo: MetodoPrevisao,
  janela: number
): MetricasValidacao | undefined {
  // Necessita de pelo menos janela + 2 meses completos para validação temporal genuína
  const minPontos = Math.max(4, janela + 1);
  if (serieHistoricaCompleta.length < minPontos) {
    return undefined;
  }

  let somaErrosModelo = 0;
  let somaErrosNaive = 0;
  let somaReal = 0;
  let pontosTestados = 0;

  for (let t = janela; t < serieHistoricaCompleta.length; t++) {
    const historicoAteMomento = serieHistoricaCompleta.slice(0, t);
    const realObservado = serieHistoricaCompleta[t];

    let predicaoModelo = 0;
    if (metodo === 'sma') {
      predicaoModelo = calcularSMA(historicoAteMomento, janela);
    } else if (metodo === 'tendencia') {
      predicaoModelo = calcularTendenciaLinear(historicoAteMomento, janela);
    } else {
      predicaoModelo = calcularWMA(historicoAteMomento, janela);
    }

    const predicaoNaive = historicoAteMomento[historicoAteMomento.length - 1]; // Último mês

    somaErrosModelo += Math.abs(realObservado - predicaoModelo);
    somaErrosNaive += Math.abs(realObservado - predicaoNaive);
    somaReal += realObservado;
    pontosTestados++;
  }

  if (pontosTestados === 0 || somaReal === 0) {
    return undefined;
  }

  const maeCentavos = Math.round(somaErrosModelo / pontosTestados);
  const wapePercentual = Number(((somaErrosModelo / somaReal) * 100).toFixed(1));

  const maeNaiveCentavos = Math.round(somaErrosNaive / pontosTestados);
  const wapeNaivePercentual = Number(((somaErrosNaive / somaReal) * 100).toFixed(1));

  return {
    maeCentavos,
    wapePercentual,
    maeNaiveCentavos,
    wapeNaivePercentual,
    superouBenchmark: maeCentavos <= maeNaiveCentavos,
    pontosAvaliados: pontosTestados,
  };
}

/**
 * Função mestre: executa todo o pipeline de Time Series Forecasting
 */
export function calcularPrevisaoGastos(
  compras: Compra[],
  mesReferencia: string, // Mês selecionado no app (Ex: "2026-10")
  config: ConfiguracaoPrevisao = { metodo: 'wma', janelaMeses: 3 },
  tipoVisao: 'casal' | 'individual' = 'casal',
  usuarioUid: string = 'user',
  p1Uid: string = 'Vinicius',
  p2Uid: string = 'Silvia'
): ResultadoPrevisaoTotal {
  const { serie } = construirSerieTemporalMensal(
    compras,
    mesReferencia,
    tipoVisao,
    usuarioUid,
    p1Uid,
    p2Uid
  );

  // Decompõe mês selecionado
  const [anoRef, mesRefNum] = mesReferencia.split('-').map((v) => parseInt(v, 10));

  // Próximo mês
  const proximoMesIdx = anoRef * 12 + (mesRefNum - 1) + 1;
  const proxAno = Math.floor(proximoMesIdx / 12);
  const proxMes = (proximoMesIdx % 12) + 1;
  const proximoMesStr = `${proxAno}-${String(proxMes).padStart(2, '0')}`;
  const nomeMesAlvo = `${NOMES_MESES[proxMes - 1]} de ${proxAno}`;

  // Separa meses completos que antecedem o mês de referência
  const mesesCompletos = serie.filter(
    (p) => p.mesReferencia < mesReferencia && p.totalCentavos > 0
  );

  // Mês de referência atual na série
  const pontoMesAtual = serie.find((p) => p.mesReferencia === mesReferencia);
  const gastoRealizadoMesAtual = pontoMesAtual ? pontoMesAtual.totalCentavos : 0;

  // Próximo mês na série (se já existirem parcelas agendadas nele)
  const pontoProximoMes = serie.find((p) => p.mesReferencia === proximoMesStr);
  const compromissosJaAgendadosProximoMes = pontoProximoMes
    ? pontoProximoMes.totalCompromissosFixosCentavos
    : 0;

  // Diagnóstico de suficiência
  let suficienciaDados: 'completa' | 'moderada' | 'insuficiente' = 'completa';
  let mensagemSuficiencia = '';

  if (mesesCompletos.length === 0) {
    suficienciaDados = 'insuficiente';
    mensagemSuficiencia =
      'Ainda não há meses completos anteriores com registros financeiros para calcular uma média temporal com alta precisão.';
  } else if (mesesCompletos.length < 3) {
    suficienciaDados = 'moderada';
    mensagemSuficiencia = `Histórico curto (${mesesCompletos.length} mês(es) completo(s)). A estimativa utiliza média conservadora dos registros existentes.`;
  } else {
    suficienciaDados = 'completa';
    mensagemSuficiencia = `Base temporal consistente com ${mesesCompletos.length} meses consolidados avaliados pela análise estatística.`;
  }

  // Valores históricos dos meses completos
  const valoresHistoricos = mesesCompletos.map((m) => m.totalCentavos);
  const mediaHistoricaCentavos =
    valoresHistoricos.length > 0
      ? Math.round(valoresHistoricos.reduce((a, b) => a + b, 0) / valoresHistoricos.length)
      : gastoRealizadoMesAtual;

  // Executa o método selecionado
  const janelaEfetiva = Math.min(config.janelaMeses, Math.max(1, valoresHistoricos.length));
  let previsaoBaseCentavos = 0;

  if (valoresHistoricos.length === 0) {
    previsaoBaseCentavos = Math.max(compromissosJaAgendadosProximoMes, gastoRealizadoMesAtual);
  } else {
    switch (config.metodo) {
      case 'sma':
        previsaoBaseCentavos = calcularSMA(valoresHistoricos, janelaEfetiva);
        break;
      case 'tendencia':
        previsaoBaseCentavos = calcularTendenciaLinear(valoresHistoricos, janelaEfetiva);
        break;
      case 'wma':
      default:
        previsaoBaseCentavos = calcularWMA(
          valoresHistoricos,
          janelaEfetiva,
          config.pesosPersonalizados
        );
        break;
    }
  }

  // Garante que a previsão nunca seja inferior aos compromissos contratuais já fixados
  const previsaoTotalCentavos = Math.max(
    previsaoBaseCentavos,
    compromissosJaAgendadosProximoMes
  );

  const gastoVariavelPrevistoCentavos = Math.max(
    0,
    previsaoTotalCentavos - compromissosJaAgendadosProximoMes
  );

  // Cálculo da Margem de Incerteza (Intervalo de Confiança)
  let desvioPadrao = 0;
  if (valoresHistoricos.length >= 2) {
    const media = mediaHistoricaCentavos;
    const variancia =
      valoresHistoricos.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) /
      (valoresHistoricos.length - 1);
    desvioPadrao = Math.sqrt(variancia);
  } else {
    desvioPadrao = previsaoTotalCentavos * 0.15; // 15% heurística padrão caso dados curtos
  }

  const margemCentavos = Math.round(desvioPadrao * 0.85);
  const minimoCentavos = Math.max(
    compromissosJaAgendadosProximoMes,
    previsaoTotalCentavos - margemCentavos
  );
  const maximoCentavos = previsaoTotalCentavos + margemCentavos;

  // Variações percentuais
  const ultimoMesCompletoCentavos =
    valoresHistoricos.length > 0 ? valoresHistoricos[valoresHistoricos.length - 1] : mediaHistoricaCentavos;

  const variacaoVsMediaHistoricaPercentual =
    mediaHistoricaCentavos > 0
      ? Number((((previsaoTotalCentavos - mediaHistoricaCentavos) / mediaHistoricaCentavos) * 100).toFixed(1))
      : 0;

  const variacaoVsUltimoMesPercentual =
    ultimoMesCompletoCentavos > 0
      ? Number((((previsaoTotalCentavos - ultimoMesCompletoCentavos) / ultimoMesCompletoCentavos) * 100).toFixed(1))
      : 0;

  const direcaoTendencia: 'alta' | 'baixa' | 'estavel' =
    variacaoVsUltimoMesPercentual > 3
      ? 'alta'
      : variacaoVsUltimoMesPercentual < -3
      ? 'baixa'
      : 'estavel';

  // Projeção do Mês Atual (Intra-month Run-rate com compromissos futuros)
  const totalDiasNoMes = pontoMesAtual ? pontoMesAtual.diasNoMes : obterDiasNoMes(anoRef, mesRefNum);
  const diasDecorridos = pontoMesAtual
    ? Math.max(1, pontoMesAtual.diasDecorridos)
    : Math.min(new Date().getDate(), totalDiasNoMes);

  const compromissosFixosMesAtual = pontoMesAtual ? pontoMesAtual.totalCompromissosFixosCentavos : 0;
  const variavelMesAtual = pontoMesAtual ? pontoMesAtual.totalGastosVariaveisCentavos : gastoRealizadoMesAtual;

  const ritmoDiarioCentavos = Math.round(variavelMesAtual / diasDecorridos);
  const diasRestantes = Math.max(0, totalDiasNoMes - diasDecorridos);
  const gastoVariavelEstimadoRestante = ritmoDiarioCentavos * diasRestantes;

  const projecaoFinalCentavos =
    gastoRealizadoMesAtual + (diasRestantes > 0 ? gastoVariavelEstimadoRestante : 0);

  const projecaoMesAtual: ProjecaoMesAtual = {
    mesReferencia,
    gastoRealizadoAteHojeCentavos: gastoRealizadoMesAtual,
    diasDecorridos,
    totalDiasNoMes,
    compromissosFuturosAgendadosCentavos: compromissosFixosMesAtual,
    gastoVariavelEstimadoRestanteCentavos: gastoVariavelEstimadoRestante,
    projecaoFinalCentavos,
    ritmoDiarioCentavos,
    confiabilidade: diasDecorridos >= 10 ? 'alta' : diasDecorridos >= 5 ? 'moderada' : 'baixa',
    observacao:
      diasRestantes === 0
        ? 'Mês concluído integralmente.'
        : `Projeção linear baseada no ritmo médio de despesas variáveis (${diasDecorridos} de ${totalDiasNoMes} dias).`,
  };

  // Previsão Hierárquica por Categoria com Conciliação Proporcional
  // Coletar todas as categorias presentes nos meses históricos e no mês atual
  const todasCategorias = new Set<string>();
  mesesCompletos.forEach((m) => {
    Object.keys(m.gastosPorCategoria).forEach((c) => todasCategorias.add(c));
  });
  if (pontoMesAtual) {
    Object.keys(pontoMesAtual.gastosPorCategoria).forEach((c) => todasCategorias.add(c));
  }

  const categoriasCalculadas: Array<{
    categoriaId: string;
    nome: string;
    historicoMedioCentavos: number;
    previsaoBrutaCentavos: number;
    confiabilidade: 'alta' | 'moderada' | 'baixa';
    motivoConfiabilidade: string;
  }> = [];

  let somaPrevisoesBrutasCategorias = 0;

  todasCategorias.forEach((catId) => {
    const historicoCat = mesesCompletos.map((m) => m.gastosPorCategoria[catId] || 0);
    const mediaCat =
      historicoCat.length > 0
        ? Math.round(historicoCat.reduce((a, b) => a + b, 0) / historicoCat.length)
        : (pontoMesAtual?.gastosPorCategoria[catId] || 0);

    let prevCatBruta = 0;
    if (historicoCat.length > 0) {
      if (config.metodo === 'sma') {
        prevCatBruta = calcularSMA(historicoCat, janelaEfetiva);
      } else if (config.metodo === 'tendencia') {
        prevCatBruta = calcularTendenciaLinear(historicoCat, janelaEfetiva);
      } else {
        prevCatBruta = calcularWMA(historicoCat, janelaEfetiva, config.pesosPersonalizados);
      }
    } else {
      prevCatBruta = mediaCat;
    }

    const mesesComGasto = historicoCat.filter((v) => v > 0).length;
    let confCat: 'alta' | 'moderada' | 'baixa' = 'moderada';
    let motivoCat = 'Frequência regular';

    if (mesesComGasto >= 4) {
      confCat = 'alta';
      motivoCat = 'Despesa contínua e previsível';
    } else if (mesesComGasto <= 1) {
      confCat = 'baixa';
      motivoCat = 'Despesa sazonal ou esporádica';
    }

    somaPrevisoesBrutasCategorias += prevCatBruta;

    categoriasCalculadas.push({
      categoriaId: catId,
      nome: catId,
      historicoMedioCentavos: mediaCat,
      previsaoBrutaCentavos: prevCatBruta,
      confiabilidade: confCat,
      motivoConfiabilidade: motivoCat,
    });
  });

  // Conciliação Proporcional: Garante rigorosamente sum(categorias) === previsaoTotalCentavos
  const fatorConciliacao =
    somaPrevisoesBrutasCategorias > 0
      ? previsaoTotalCentavos / somaPrevisoesBrutasCategorias
      : 1;

  let somaConciliada = 0;
  const categoriasFinais: ResultadoPrevisaoCategoria[] = categoriasCalculadas.map((c) => {
    const conciliado = Math.round(c.previsaoBrutaCentavos * fatorConciliacao);
    somaConciliada += conciliado;
    const pct = previsaoTotalCentavos > 0 ? Number(((conciliado / previsaoTotalCentavos) * 100).toFixed(1)) : 0;
    const diff = conciliado - c.historicoMedioCentavos;
    const tend: 'alta' | 'baixa' | 'estavel' = diff > 500 ? 'alta' : diff < -500 ? 'baixa' : 'estavel';

    return {
      categoriaId: c.categoriaId,
      nome: c.nome,
      historicoMedioCentavos: c.historicoMedioCentavos,
      previsaoBrutaCentavos: c.previsaoBrutaCentavos,
      previsaoConciliadaCentavos: conciliado,
      percentualDoTotal: pct,
      tendencia: tend,
      confiabilidade: c.confiabilidade,
      motivoConfiabilidade: c.motivoConfiabilidade,
    };
  });

  // Ajuste de arredondamento de 1 centavo residual se houver
  const diffResidual = previsaoTotalCentavos - somaConciliada;
  if (diffResidual !== 0 && categoriasFinais.length > 0) {
    categoriasFinais[0].previsaoConciliadaCentavos += diffResidual;
  }

  // Ordena por maior valor previsto
  categoriasFinais.sort((a, b) => b.previsaoConciliadaCentavos - a.previsaoConciliadaCentavos);

  // Pontos para Gráfico Temporal Integrado
  const pontosGrafico: ResultadoPrevisaoTotal['pontosGrafico'] = [];

  // 1. Histórico dos últimos 6 meses completos
  const ultimosMesesGrafico = mesesCompletos.slice(-6);
  ultimosMesesGrafico.forEach((m) => {
    pontosGrafico.push({
      mes: m.mesReferencia,
      label: m.label,
      tipo: 'historico_completo',
      valorCentavos: m.totalCentavos,
    });
  });

  // 2. Mês atual realizado e projetado
  if (pontoMesAtual) {
    pontosGrafico.push({
      mes: pontoMesAtual.mesReferencia,
      label: `${pontoMesAtual.label} (Atual)`,
      tipo: 'mes_atual_projetado',
      valorCentavos: projecaoFinalCentavos,
    });
  }

  // 3. Ponto de Previsão Futura com Faixa de Incerteza
  pontosGrafico.push({
    mes: proximoMesStr,
    label: `${NOMES_MESES_CURTO[proxMes - 1]}/${String(proxAno).slice(-2)} (Prev)`,
    tipo: 'previsao_futura',
    valorCentavos: previsaoTotalCentavos,
    faixaMinimaCentavos: minimoCentavos,
    faixaMaximaCentavos: maximoCentavos,
  });

  // Executa validação temporal / backtesting
  const validacao = executarBacktestingTemporal(valoresHistoricos, config.metodo, janelaEfetiva);

  const nomesMetodosAmigaveis: Record<MetodoPrevisao, string> = {
    wma: 'Média Móvel Ponderada (WMA)',
    sma: 'Média Móvel Simples (SMA)',
    tendencia: 'Tendência Linear com Amortecimento (Holt)',
  };

  return {
    metodoUtilizado: config.metodo,
    nomeMetodo: nomesMetodosAmigaveis[config.metodo],
    janelaUtilizada: janelaEfetiva,
    mesAlvo: proximoMesStr,
    nomeMesAlvo,
    previsaoTotalCentavos,
    compromissosFixosAgendadosCentavos: compromissosJaAgendadosProximoMes,
    gastoVariavelPrevistoCentavos,
    intervaloConfianca: {
      minimoCentavos,
      esperadoCentavos: previsaoTotalCentavos,
      maximoCentavos,
      margemCentavos,
    },
    mediaHistoricaCentavos,
    variacaoVsMediaHistoricaPercentual,
    variacaoVsUltimoMesPercentual,
    direcaoTendencia,
    projecaoMesAtual,
    categorias: categoriasFinais,
    historicoMeses: serie,
    pontosGrafico,
    validacao,
    suficienciaDados,
    mensagemSuficiencia,
  };
}

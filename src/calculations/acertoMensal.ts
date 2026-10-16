import { CoupleSpace, LancamentoMensal, ResumoAcerto } from '../types';

export function formatarBRL(valorCentavos: number): string {
  const reais = valorCentavos / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

export function formatarNumeroBRL(valorCentavos: number): string {
  const reais = valorCentavos / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

export function parseBRLParaCentavos(valorStr: string): number {
  if (!valorStr) return 0;
  const limpo = valorStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpo);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

export function parseDivisaoPercentuais(
  divisao: string,
  p1Identifier: string = 'Vinicius',
  p2Identifier: string = 'Silvia',
  extraP1Identifiers: string[] = [],
  extraP2Identifiers: string[] = []
): { percP1: number; percP2: number } {
  if (!divisao) {
    return { percP1: 50, percP2: 50 };
  }

  // Limpa espaços, percentuais e converte para minúsculas
  const str = String(divisao).trim();
  const limpo = str.replace(/%/g, '').replace(/\s+/g, '');

  if (limpo === '50/50') {
    return { percP1: 50, percP2: 50 };
  }
  if (limpo === '100/0') {
    return { percP1: 100, percP2: 0 };
  }
  if (limpo === '0/100') {
    return { percP1: 0, percP2: 100 };
  }

  // Padrão X/Y (ex: "70/30", "30/70", "60/40", "80/20", "35/65")
  const match = limpo.match(/^(\d{1,3})\/(\d{1,3})$/);
  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    if (!isNaN(p1) && !isNaN(p2) && p1 + p2 > 0) {
      const soma = p1 + p2;
      const percP1 = Math.round((p1 / soma) * 100);
      return {
        percP1,
        percP2: 100 - percP1,
      };
    }
  }

  // Somente P1 (100/0)
  const isP1 =
    str === p1Identifier ||
    str === 'p1' ||
    str.toLowerCase() === 'vinicius' ||
    str.toLowerCase() === p1Identifier.toLowerCase() ||
    extraP1Identifiers.some((id) => id && id.toLowerCase() === str.toLowerCase());

  if (isP1) {
    return { percP1: 100, percP2: 0 };
  }

  // Somente P2 (0/100)
  const isP2 =
    str === p2Identifier ||
    str === 'p2' ||
    str.toLowerCase() === 'silvia' ||
    str.toLowerCase() === p2Identifier.toLowerCase() ||
    extraP2Identifiers.some((id) => id && id.toLowerCase() === str.toLowerCase());

  if (isP2) {
    return { percP1: 0, percP2: 100 };
  }

  return { percP1: 50, percP2: 50 };
}

export function calcularAcertoMensal(
  lancamentosDoMes: LancamentoMensal[],
  mesReferencia: string,
  couple?: CoupleSpace | null
): ResumoAcerto {
  const p1Uid = couple?.partner1Uid || 'Vinicius';
  const p1Name = couple?.partner1Name || 'Vinicius';
  const p2Uid = couple?.partner2Uid || 'Silvia';
  const p2Name = couple?.partner2Name || 'Silvia';

  if (!lancamentosDoMes || lancamentosDoMes.length === 0) {
    return {
      mesReferencia,
      temLancamentos: false,
      totalCasalCentavos: 0,
      totalPagoP1Centavos: 0,
      totalPagoP2Centavos: 0,
      totalPagoViniciusCentavos: 0,
      totalPagoSilviaCentavos: 0,
      devidoAP1Centavos: 0,
      devidoAP2Centavos: 0,
      saldoCentavos: 0,
      devedor: 'Nenhum',
      devedorUid: '',
      devedorNome: 'Nenhum',
      credor: 'Nenhum',
      credorUid: '',
      credorNome: 'Nenhum',
      valorAcertoCentavos: 0,
      p1Name,
      p2Name,
      p1Uid,
      p2Uid,
      cotaSilviaEm5050Centavos: 0,
      cotaViniciusEm5050Centavos: 0,
      cotaP2Em5050Centavos: 0,
      cotaP1Em5050Centavos: 0,
      cotaP1EsperadaCentavos: 0,
      cotaP2EsperadaCentavos: 0,
      detalhesExclusivosCentavos: {
        p1PagouParaP2: 0,
        p2PagouParaP1: 0,
        viniciusPagouParaSilvia: 0,
        silviaPagouParaVinicius: 0,
      },
      totalCompartilhadoCentavos: 0,
    };
  }

  let totalCasalCentavos = 0;
  let totalPagoP1Centavos = 0;
  let totalPagoP2Centavos = 0;

  let devidoAP1Centavos = 0;
  let devidoAP2Centavos = 0;

  let totalCompartilhadoCentavos = 0;
  let cotaP1EsperadaCentavos = 0;
  let cotaP2EsperadaCentavos = 0;

  let p1PagouParaP2 = 0;
  let p2PagouParaP1 = 0;

  for (const lancamento of lancamentosDoMes) {
    const v = lancamento.valorCentavos;
    totalCasalCentavos += v;

    const ehP1 =
      lancamento.pagoPorUid === p1Uid ||
      lancamento.pagoPor === p1Name ||
      lancamento.pagoPor === 'Vinicius';

    if (ehP1) {
      totalPagoP1Centavos += v;
    } else {
      totalPagoP2Centavos += v;
    }

    const extraP1 = [p1Name, p1Uid, 'Vinicius', 'p1'].filter(Boolean) as string[];
    const extraP2 = [p2Name, p2Uid, 'Silvia', 'p2'].filter(Boolean) as string[];
    const { percP1, percP2 } = parseDivisaoPercentuais(
      lancamento.divisao,
      p1Uid,
      p2Uid,
      extraP1,
      extraP2
    );
    const cotaP1 = Math.round((v * percP1) / 100);
    const cotaP2 = v - cotaP1; // garante exatidão de centavos na soma

    cotaP1EsperadaCentavos += cotaP1;
    cotaP2EsperadaCentavos += cotaP2;

    if (percP1 > 0 && percP2 > 0) {
      totalCompartilhadoCentavos += v;
    }

    if (ehP1) {
      // P1 pagou a despesa inteira (v). P2 deve ressarcir sua cota (cotaP2) a P1:
      devidoAP1Centavos += cotaP2;
      if (percP1 === 0 && percP2 === 100) {
        p1PagouParaP2 += v;
      }
    } else {
      // P2 pagou a despesa inteira (v). P1 deve ressarcir sua cota (cotaP1) a P2:
      devidoAP2Centavos += cotaP1;
      if (percP1 === 100 && percP2 === 0) {
        p2PagouParaP1 += v;
      }
    }
  }

  const saldoCentavos = devidoAP1Centavos - devidoAP2Centavos;
  let devedorUid = '';
  let devedorNome = 'Nenhum';
  let credorUid = '';
  let credorNome = 'Nenhum';
  const valorAcertoCentavos = Math.abs(saldoCentavos);

  if (saldoCentavos > 0) {
    devedorUid = p2Uid;
    devedorNome = p2Name;
    credorUid = p1Uid;
    credorNome = p1Name;
  } else if (saldoCentavos < 0) {
    devedorUid = p1Uid;
    devedorNome = p1Name;
    credorUid = p2Uid;
    credorNome = p2Name;
  }

  return {
    mesReferencia,
    temLancamentos: true,
    totalCasalCentavos,
    totalPagoP1Centavos,
    totalPagoP2Centavos,
    totalPagoViniciusCentavos: totalPagoP1Centavos,
    totalPagoSilviaCentavos: totalPagoP2Centavos,
    devidoAP1Centavos,
    devidoAP2Centavos,
    saldoCentavos,
    devedor: devedorNome,
    devedorUid,
    devedorNome,
    credor: credorNome,
    credorUid,
    credorNome,
    p1Name,
    p2Name,
    p1Uid,
    p2Uid,
    cotaSilviaEm5050Centavos: cotaP2EsperadaCentavos,
    cotaViniciusEm5050Centavos: cotaP1EsperadaCentavos,
    cotaP2Em5050Centavos: cotaP2EsperadaCentavos,
    cotaP1Em5050Centavos: cotaP1EsperadaCentavos,
    cotaP1EsperadaCentavos,
    cotaP2EsperadaCentavos,
    valorAcertoCentavos,
    detalhesExclusivosCentavos: {
      p1PagouParaP2,
      p2PagouParaP1,
      viniciusPagouParaSilvia: p1PagouParaP2,
      silviaPagouParaVinicius: p2PagouParaP1,
    },
    totalCompartilhadoCentavos,
  };
}

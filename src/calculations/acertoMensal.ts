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
  let cotaP2Em5050Centavos = 0;
  let cotaP1Em5050Centavos = 0;

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

    if (lancamento.divisao === '50/50') {
      totalCompartilhadoCentavos += v;
      const cotaNaoPagador = Math.floor(v / 2);

      if (ehP1) {
        devidoAP1Centavos += cotaNaoPagador;
        cotaP2Em5050Centavos += cotaNaoPagador;
      } else {
        devidoAP2Centavos += cotaNaoPagador;
        cotaP1Em5050Centavos += cotaNaoPagador;
      }
    } else if (
      lancamento.divisao === p1Uid ||
      lancamento.divisao === p1Name ||
      lancamento.divisao === 'Vinicius'
    ) {
      // Gasto individual de P1
      if (!ehP1) {
        // P2 pagou por P1 => P1 deve 100% a P2
        devidoAP2Centavos += v;
        p2PagouParaP1 += v;
      }
    } else if (
      lancamento.divisao === p2Uid ||
      lancamento.divisao === p2Name ||
      lancamento.divisao === 'Silvia'
    ) {
      // Gasto individual de P2
      if (ehP1) {
        // P1 pagou por P2 => P2 deve 100% a P1
        devidoAP1Centavos += v;
        p1PagouParaP2 += v;
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
    cotaSilviaEm5050Centavos: cotaP2Em5050Centavos,
    cotaViniciusEm5050Centavos: cotaP1Em5050Centavos,
    cotaP2Em5050Centavos,
    cotaP1Em5050Centavos,
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

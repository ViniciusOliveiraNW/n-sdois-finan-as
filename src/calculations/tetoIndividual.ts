import { formatarBRL } from './acertoMensal';
import { ResumoAcerto } from '../types';

export interface ParametrosCalculoTeto {
  tetoBaseCentavos: number;
  gastoIndividualCentavos: number;
  resumoAcerto?: ResumoAcerto | null;
  usuarioAtual: string;
  p1Uid?: string;
  p1Name?: string;
  p2Uid?: string;
  p2Name?: string;
}

export interface ResultadoTetoIndividual {
  tetoBaseCentavos: number;
  gastoIndividualCentavos: number;
  tipoAjuste: 'deve' | 'recebe' | 'neutro';
  valorAPagarCentavos: number;
  valorAReceberCentavos: number;
  impactoConjuntoCentavos: number; // negativo se deve (-), positivo se recebe (+)
  valorDisponivelCentavos: number;
  percConsumido: number;
  parceiroNome: string;
  mensagemAjuste: string;
  textoAjusteSimples: string;
  status: 'confortavel' | 'atencao' | 'estourado';
}

/**
 * Calcula automaticamente o valor disponível no teto individual de cada pessoa,
 * considerando os gastos individuais e o saldo resultante do acerto das despesas conjuntas:
 *
 * Fórmula:
 * Valor disponível = Teto individual - Gasto individual - Valor a pagar + Valor a receber
 */
export function calcularTetoIndividual({
  tetoBaseCentavos,
  gastoIndividualCentavos,
  resumoAcerto,
  usuarioAtual,
  p1Uid = 'Vinicius',
  p1Name = 'Vinicius',
  p2Uid = 'Silvia',
  p2Name = 'Silvia',
}: ParametrosCalculoTeto): ResultadoTetoIndividual {
  const tetoEfetivo = tetoBaseCentavos > 0 ? tetoBaseCentavos : 250000;

  const souP1 =
    usuarioAtual === p1Uid ||
    usuarioAtual === p1Name ||
    usuarioAtual.toLowerCase() === 'vinicius';
  const souP2 =
    usuarioAtual === p2Uid ||
    usuarioAtual === p2Name ||
    usuarioAtual.toLowerCase() === 'silvia';

  const parceiroNome = souP1 ? p2Name : p1Name;

  let tipoAjuste: 'deve' | 'recebe' | 'neutro' = 'neutro';
  let valorAPagarCentavos = 0;
  let valorAReceberCentavos = 0;

  if (resumoAcerto && resumoAcerto.valorAcertoCentavos > 0) {
    const { devedorUid, devedorNome, credorUid, credorNome, valorAcertoCentavos } = resumoAcerto;

    const souDevedor =
      (devedorUid && (usuarioAtual === devedorUid || (souP1 && devedorUid === p1Uid) || (souP2 && devedorUid === p2Uid))) ||
      usuarioAtual === devedorNome ||
      (souP1 && devedorNome === p1Name) ||
      (souP2 && devedorNome === p2Name);

    const souCredor =
      (credorUid && (usuarioAtual === credorUid || (souP1 && credorUid === p1Uid) || (souP2 && credorUid === p2Uid))) ||
      usuarioAtual === credorNome ||
      (souP1 && credorNome === p1Name) ||
      (souP2 && credorNome === p2Name);

    if (souDevedor) {
      tipoAjuste = 'deve';
      valorAPagarCentavos = valorAcertoCentavos;
    } else if (souCredor) {
      tipoAjuste = 'recebe';
      valorAReceberCentavos = valorAcertoCentavos;
    }
  }

  // Fórmula oficial solicitada pelo usuário:
  // Valor disponível = Teto individual - Gasto individual - Valor a pagar + Valor a receber
  const valorDisponivelCentavos =
    tetoEfetivo - gastoIndividualCentavos - valorAPagarCentavos + valorAReceberCentavos;

  const impactoConjuntoCentavos = valorAReceberCentavos - valorAPagarCentavos;

  // Percentual consumido sobre o teto base:
  // (quanto foi consumido em relação ao limite)
  const consumidoCentavos = tetoEfetivo - valorDisponivelCentavos;
  const percConsumido =
    tetoEfetivo > 0 ? Math.max(0, Math.round((consumidoCentavos / tetoEfetivo) * 100)) : 0;

  let status: 'confortavel' | 'atencao' | 'estourado' = 'confortavel';
  if (valorDisponivelCentavos < 0) {
    status = 'estourado';
  } else if (percConsumido > 80) {
    status = 'atencao';
  }

  let mensagemAjuste = 'Gastos em conjunto equilibrados (sem impacto no teto)';
  let textoAjusteSimples = '';

  if (tipoAjuste === 'deve') {
    mensagemAjuste = `- ${formatarBRL(valorAPagarCentavos)} referente ao acerto de gastos em conjunto`;
    textoAjusteSimples = `- ${formatarBRL(valorAPagarCentavos)} acerto casal`;
  } else if (tipoAjuste === 'recebe') {
    mensagemAjuste = `+ ${formatarBRL(valorAReceberCentavos)} referente ao acerto de gastos em conjunto`;
    textoAjusteSimples = `+ ${formatarBRL(valorAReceberCentavos)} acerto casal`;
  }

  return {
    tetoBaseCentavos: tetoEfetivo,
    gastoIndividualCentavos,
    tipoAjuste,
    valorAPagarCentavos,
    valorAReceberCentavos,
    impactoConjuntoCentavos,
    valorDisponivelCentavos,
    percConsumido,
    parceiroNome,
    mensagemAjuste,
    textoAjusteSimples,
    status,
  };
}

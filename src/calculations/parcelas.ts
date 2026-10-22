import { Compra, LancamentoMensal } from '../types';
import { parseDivisaoPercentuais } from './acertoMensal';

export function isInteiroPositivo(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0;
}

export function calcularValoresParcelas(
  valorTotalCentavos: number,
  numeroDeParcelas: number
): number[] {
  if (!isInteiroPositivo(valorTotalCentavos)) {
    throw new Error('O valor total em centavos deve ser um número inteiro positivo maior que zero.');
  }
  if (!isInteiroPositivo(numeroDeParcelas)) {
    throw new Error('O número de parcelas deve ser um número inteiro positivo maior que zero.');
  }

  const base = Math.floor(valorTotalCentavos / numeroDeParcelas);
  const resto = valorTotalCentavos % numeroDeParcelas;

  const parcelas = Array(numeroDeParcelas).fill(base);
  parcelas[numeroDeParcelas - 1] += resto;

  return parcelas;
}

export function obterDiasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function validarEDecomporData(dataStr: string): { ano: number; mes: number; dia: number } {
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dataStr.match(regex);
  if (!match) {
    throw new Error(`Data inválida "${dataStr}". O formato esperado é AAAA-MM-DD.`);
  }

  const ano = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const dia = parseInt(match[3], 10);

  if (ano < 1900 || ano > 2100) {
    throw new Error(`Ano fora da faixa aceita (1900-2100): ${ano}`);
  }
  if (mes < 1 || mes > 12) {
    throw new Error(`Mês inválido: ${mes}`);
  }

  const maxDias = obterDiasNoMes(ano, mes);
  if (dia < 1 || dia > maxDias) {
    throw new Error(`Dia ${dia} inválido para o mês ${mes}/${ano} (máx: ${maxDias}).`);
  }

  return { ano, mes, dia };
}

export function calcularMesesParcelas(
  dataPrimeiroPagamento: string,
  numeroDeParcelas: number
): string[] {
  const { ano: anoInicial, mes: mesInicial } = validarEDecomporData(dataPrimeiroPagamento);
  if (!isInteiroPositivo(numeroDeParcelas)) {
    throw new Error('O número de parcelas deve ser um inteiro positivo.');
  }

  const meses: string[] = [];
  const baseMesIndex = anoInicial * 12 + (mesInicial - 1);

  for (let i = 0; i < numeroDeParcelas; i++) {
    const totalMeses = baseMesIndex + i;
    const anoAtual = Math.floor(totalMeses / 12);
    const mesAtual = (totalMeses % 12) + 1;
    const mesFormatado = String(mesAtual).padStart(2, '0');
    meses.push(`${anoAtual}-${mesFormatado}`);
  }

  return meses;
}

export function calcularDatasParcelas(
  dataPrimeiroPagamento: string,
  numeroDeParcelas: number
): string[] {
  const { ano: anoInicial, mes: mesInicial, dia: diaOriginal } = validarEDecomporData(dataPrimeiroPagamento);
  if (!isInteiroPositivo(numeroDeParcelas)) {
    throw new Error('O número de parcelas deve ser um inteiro positivo.');
  }

  const datas: string[] = [];
  const baseMesIndex = anoInicial * 12 + (mesInicial - 1);

  for (let i = 0; i < numeroDeParcelas; i++) {
    const totalMeses = baseMesIndex + i;
    const anoAtual = Math.floor(totalMeses / 12);
    const mesAtual = (totalMeses % 12) + 1;
    const maxDias = obterDiasNoMes(anoAtual, mesAtual);
    const diaAjustado = Math.min(diaOriginal, maxDias);

    const mesFormatado = String(mesAtual).padStart(2, '0');
    const diaFormatado = String(diaAjustado).padStart(2, '0');
    datas.push(`${anoAtual}-${mesFormatado}-${diaFormatado}`);
  }

  return datas;
}

export function gerarParcelas(
  totalCentavos: number,
  dataPrimeiroPagamento: string,
  numeroDeParcelas: number
): Array<{
  numero: number;
  mesReferencia: string;
  dataReferencia: string;
  valorCentavos: number;
}> {
  const valores = calcularValoresParcelas(totalCentavos, numeroDeParcelas);
  const meses = calcularMesesParcelas(dataPrimeiroPagamento, numeroDeParcelas);
  const datas = calcularDatasParcelas(dataPrimeiroPagamento, numeroDeParcelas);

  return valores.map((valorCentavos, index) => ({
    numero: index + 1,
    mesReferencia: meses[index],
    dataReferencia: datas[index],
    valorCentavos,
  }));
}

export function calcularMinhaParteCentavos(
  valorCentavos: number,
  divisao: Compra['divisao'],
  usuarioUid: string,
  p1Identifier: string = 'Vinicius',
  p2Identifier: string = 'Silvia',
  extraP1Identifiers: string[] = [],
  extraP2Identifiers: string[] = []
): number {
  const { percP1, percP2 } = parseDivisaoPercentuais(
    divisao,
    p1Identifier,
    p2Identifier,
    extraP1Identifiers,
    extraP2Identifiers
  );
  const souP1 =
    usuarioUid === p1Identifier ||
    usuarioUid === 'p1' ||
    usuarioUid.toLowerCase() === 'vinicius' ||
    extraP1Identifiers.some((id) => id && id.toLowerCase() === usuarioUid.toLowerCase());
  const meuPerc = souP1 ? percP1 : percP2;
  return Math.round((valorCentavos * meuPerc) / 100);
}

export function gerarLancamentosDoMes(
  compras: Compra[],
  mesSelecionado: string,
  usuarioUid: string,
  p1Identifier: string = 'Vinicius',
  p2Identifier: string = 'Silvia',
  extraP1Identifiers: string[] = [],
  extraP2Identifiers: string[] = []
): LancamentoMensal[] {
  const lancamentos: LancamentoMensal[] = [];

  for (const compra of compras) {
    const totalCentavos =
      compra.valorCentavos ?? Math.round((compra.valor ?? 0) * 100);

    if (totalCentavos <= 0) continue;

    const parcelas = gerarParcelas(
      totalCentavos,
      compra.dataPrimeiroPagamento,
      compra.numeroDeParcelas
    );

    const parcelaDoMes = parcelas.find((p) => p.mesReferencia === mesSelecionado);
    if (!parcelaDoMes) continue;

    // Respeita limite inclusivo de cancelamento com ??
    const limiteAtivo = compra.ultimaParcelaAtiva ?? compra.numeroDeParcelas ?? 1;
    if (parcelaDoMes.numero > limiteAtivo) continue;

    const minhaParteCentavos = calcularMinhaParteCentavos(
      parcelaDoMes.valorCentavos,
      compra.divisao,
      usuarioUid,
      p1Identifier,
      p2Identifier,
      extraP1Identifiers,
      extraP2Identifiers
    );

    const pagoPorNome = compra.pagoPorNome || compra.pagoPor || 'Você';
    const cadastradoPorNome = compra.cadastradoPorNome || compra.cadastradoPor || 'Você';
    const pagoPorUid = compra.pagoPorUid || compra.pagoPor || 'p1';
    const cadastradoPorUid = compra.cadastradoPorUid || compra.cadastradoPor || 'p1';

    lancamentos.push({
      compraId: compra.id,
      numeroParcela: parcelaDoMes.numero,
      totalParcelas: compra.numeroDeParcelas,
      mesReferencia: mesSelecionado,
      dataReferencia: parcelaDoMes.dataReferencia,
      valorCentavos: parcelaDoMes.valorCentavos,
      nome: compra.nome,
      categoria: compra.categoria,
      descricao: compra.descricao,
      pagoPorUid,
      pagoPorNome,
      pagoPor: pagoPorNome,
      cadastradoPorUid,
      cadastradoPorNome,
      cadastradoPor: cadastradoPorNome,
      divisao: compra.divisao,
      minhaParteCentavos,
      privada: compra.privada,
      segredoCasal: compra.segredoCasal,
      formaPagamentoNome: compra.formaPagamentoNome,
      assinatura: compra.assinatura,
    });
  }

  return lancamentos.sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia));
}

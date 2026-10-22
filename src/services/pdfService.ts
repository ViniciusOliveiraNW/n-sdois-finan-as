import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CategoriaMeta,
  CoupleSpace,
  FechamentoMensal,
  LancamentoMensal,
  PagamentoAcerto,
  ResumoAcerto,
} from '../types';
import { formatarBRL } from '../calculations/acertoMensal';

interface DadosNotaFechamento {
  mesReferencia: string;
  fechamento?: FechamentoMensal | null;
  resumoAcerto: ResumoAcerto;
  lancamentos: LancamentoMensal[];
  couple?: CoupleSpace | null;
  categorias?: CategoriaMeta[];
  emissorNome?: string;
}

export function formatarNomeMes(mesAno: string): string {
  const [ano, mes] = mesAno.split('-');
  const nomesMeses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const indice = parseInt(mes, 10) - 1;
  const nome = nomesMeses[indice] || mes;
  return `${nome} de ${ano}`;
}

export function gerarNotaFechamentoPDF(dados: DadosNotaFechamento): jsPDF {
  const {
    mesReferencia,
    fechamento,
    resumoAcerto,
    lancamentos,
    couple,
    categorias = [],
    emissorNome = 'NósDois Finanças',
  } = dados;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const p1Nome = couple?.partner1Name || resumoAcerto.p1Name || 'Parceiro 1';
  const p2Nome = couple?.partner2Name || resumoAcerto.p2Name || 'Parceiro 2';

  const p1PagoCentavos =
    fechamento?.totalPagoP1Centavos ??
    resumoAcerto.totalPagoP1Centavos ??
    resumoAcerto.totalPagoViniciusCentavos ??
    0;
  const p2PagoCentavos =
    fechamento?.totalPagoP2Centavos ??
    resumoAcerto.totalPagoP2Centavos ??
    resumoAcerto.totalPagoSilviaCentavos ??
    0;
  const totalCompartilhadoCentavos =
    fechamento?.totalCompartilhadoCentavos ?? resumoAcerto.totalCompartilhadoCentavos;

  const devedor = fechamento?.devedor || resumoAcerto.devedor || p2Nome;
  const credor = fechamento?.credor || resumoAcerto.credor || p1Nome;
  const valorAcertoCentavos =
    fechamento !== undefined && fechamento !== null
      ? Math.abs(fechamento.saldoOriginalCentavos)
      : resumoAcerto.valorAcertoCentavos;

  const statusFechamento = fechamento?.status || (valorAcertoCentavos === 0 ? 'quitado' : 'parcial');
  const pagamentos: PagamentoAcerto[] = fechamento?.pagamentos || [];
  const totalPagoAcertoCentavos = pagamentos.reduce((acc, p) => acc + (p.valorCentavos || 0), 0);
  const saldoPendenteCentavos = Math.max(0, valorAcertoCentavos - totalPagoAcertoCentavos);

  const codigoNota = `NDF-${mesReferencia.replace('-', '')}-${(fechamento?.id || 'PROV')
    .slice(-6)
    .toUpperCase()}`;
  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaEmissao = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Mapeamento de categorias
  const mapaCategorias: Record<string, string> = {};
  categorias.forEach((c) => {
    mapaCategorias[c.id] = c.nome;
  });

  // ==================== TOPO / CABEÇALHO ====================
  // Barra decorativa superior verde
  doc.setFillColor(0, 105, 72); // #006948
  doc.rect(0, 0, 210, 8, 'F');

  // Cabeçalho institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 105, 72);
  doc.text('NÓSDOIS FINANÇAS', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('NOTA DE FECHAMENTO MENSAL & PRESTAÇÃO DE CONTAS', 14, 25);

  // Caixa da Nota (Direita)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(130, 12, 66, 17, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DOCUMENTO / PROTOCOLO', 133, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(codigoNota, 133, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido em: ${dataEmissao} às ${horaEmissao}`, 133, 26.5);

  // Linha divisória
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // ==================== DADOS GERAIS DO CICLO ====================
  let cursorY = 38;

  // Caixa de Identificação
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, cursorY, 182, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, cursorY, 182, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Mês de Referência:', 18, cursorY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 105, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatarNomeMes(mesReferencia)} (${mesReferencia})`, 54, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Casal:', 18, cursorY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`${p1Nome}  &  ${p2Nome}`, 54, cursorY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Situação:', 18, cursorY + 20);

  const statusLabel =
    statusFechamento === 'quitado'
      ? 'TOTALMENTE QUITADO'
      : statusFechamento === 'parcial'
      ? 'ACERTO PARCIAL EM ANDAMENTO'
      : 'PENDÊNCIA RETROATIVA';

  if (statusFechamento === 'quitado') {
    doc.setTextColor(0, 105, 72);
  } else {
    doc.setTextColor(180, 83, 9);
  }
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, 54, cursorY + 20);

  // Conciliador no lado direito
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Responsável: ${fechamento?.conciliadoPor || emissorNome}`, 125, cursorY + 6);
  if (fechamento?.dataFechamento) {
    doc.text(`Fechado em: ${fechamento.dataFechamento}`, 125, cursorY + 13);
  }

  cursorY += 28;

  // ==================== BALANÇO CONSOLIDADO (KPIS) ====================
  const boxWidth = 43;
  const boxHeight = 18;
  const gap = 3.3;

  // Card 1: Total Compartilhado
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, cursorY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL COMPARTILHADO', 17, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatarBRL(totalCompartilhadoCentavos), 17, cursorY + 13);

  // Card 2: Pago por P1
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14 + boxWidth + gap, cursorY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 64, 175);
  doc.text(`PAGO POR ${p1Nome.toUpperCase()}`, 14 + boxWidth + gap + 3, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 81, 213);
  doc.text(formatarBRL(p1PagoCentavos), 14 + boxWidth + gap + 3, cursorY + 13);

  // Card 3: Pago por P2
  doc.setFillColor(250, 245, 255);
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(14 + (boxWidth + gap) * 2, cursorY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 33, 168);
  doc.text(`PAGO POR ${p2Nome.toUpperCase()}`, 14 + (boxWidth + gap) * 2 + 3, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(113, 42, 226);
  doc.text(formatarBRL(p2PagoCentavos), 14 + (boxWidth + gap) * 2 + 3, cursorY + 13);

  // Card 4: Compensação / Acerto
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(14 + (boxWidth + gap) * 3, cursorY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text('ACERTO LÍQUIDO', 14 + (boxWidth + gap) * 3 + 3, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 105, 72);
  doc.text(formatarBRL(valorAcertoCentavos), 14 + (boxWidth + gap) * 3 + 3, cursorY + 13);

  cursorY += boxHeight + 4;

  // Banner explicativo do acerto
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, cursorY, 182, 10, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);

  if (valorAcertoCentavos === 0) {
    doc.text('Balança nivelada: nenhuma transferência de acerto necessária entre as partes.', 18, cursorY + 6.5);
  } else {
    doc.text(
      `Conclusão do Rateio: ${devedor} deve transferir ${formatarBRL(
        valorAcertoCentavos
      )} para ${credor} para nivelamento exato.`,
      18,
      cursorY + 6.5
    );
  }

  cursorY += 15;

  // ==================== SEÇÃO 1: O QUE FOI COBRADO & PARCELAS ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Cobranças & Lançamentos do Mês (O que foi cobrado e a parcela)', 14, cursorY);

  cursorY += 3;

  // Tabela de lançamentos / cobranças
  const tabelaLancamentosData = lancamentos.map((l, index) => {
    const nomeCategoria = mapaCategorias[l.categoria] || l.categoria || 'Geral';
    const parcelaStr =
      l.totalParcelas > 1 ? `${l.numeroParcela}/${l.totalParcelas}` : 'À vista (1/1)';
    const quemPagou = l.pagoPorNome || l.pagoPor || 'Não inf.';
    const valorStr = formatarBRL(l.valorCentavos);

    return [
      String(index + 1),
      l.nome,
      parcelaStr,
      nomeCategoria,
      quemPagou,
      l.divisao || '50/50',
      valorStr,
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [['#', 'Despesa / Estabelecimento', 'Parcela', 'Categoria', 'Pago Por', 'Divisão', 'Valor Cobrado']],
    body: tabelaLancamentosData,
    foot: [
      [
        '',
        'TOTAL DE COBRANÇAS NO MÊS',
        `${lancamentos.length} itens`,
        '',
        '',
        '',
        formatarBRL(totalCompartilhadoCentavos),
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [0, 105, 72],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 24 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Obter Y após a primeira tabela
  // @ts-expect-error jspdf-autotable adds lastAutoTable to doc
  let finalY: number = doc.lastAutoTable?.finalY || cursorY + 50;

  // Se estiver muito perto do fim da página, cria nova página
  if (finalY > 215) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 10;
  }

  // ==================== SEÇÃO 2: PAGAMENTOS REALIZADOS ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Pagamentos e Transferências de Acerto Realizadas', 14, finalY);

  finalY += 3;

  if (pagamentos.length > 0) {
    const tabelaPagamentosData = pagamentos.map((p, idx) => {
      const dataStr = p.dataPagamento || '-';
      const pagadorStr = p.pagadorNome || p.pagador || devedor;
      const recebedorStr = p.recebedorNome || p.recebedor || credor;
      const formaStr = p.formaPagamento ? p.formaPagamento.toUpperCase() : 'PIX';
      const obsStr = [p.observacoes, p.comprovanteNome ? `[Anexo: ${p.comprovanteNome}]` : '']
        .filter(Boolean)
        .join(' ');
      const valorStr = formatarBRL(p.valorCentavos || 0);

      return [String(idx + 1), dataStr, pagadorStr, recebedorStr, formaStr, obsStr || 'Transferência confirmada', valorStr];
    });

    autoTable(doc, {
      startY: finalY,
      head: [['#', 'Data', 'Pagador', 'Beneficiário', 'Forma', 'Observação / Comprovante', 'Valor Pago']],
      body: tabelaPagamentosData,
      foot: [
        [
          '',
          'TOTAL PAGO ATÉ O MOMENTO',
          '',
          '',
          '',
          saldoPendenteCentavos > 0 ? `Restam ${formatarBRL(saldoPendenteCentavos)}` : 'Liquidação 100% Concluída',
          formatarBRL(totalPagoAcertoCentavos),
        ],
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: saldoPendenteCentavos > 0 ? [180, 83, 9] : [0, 105, 72],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 56 },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error jspdf-autotable adds lastAutoTable to doc
    finalY = doc.lastAutoTable?.finalY || finalY + 40;
  } else {
    // Sem pagamentos registrados ainda
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, finalY, 182, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    if (valorAcertoCentavos === 0) {
      doc.text('Não houve necessidade de transferência de compensação para este mês (balanço zero a zero).', 18, finalY + 7);
    } else {
      doc.text(
        `Nenhum pagamento registrado no sistema ainda. Pendência de transferência Pix no valor de ${formatarBRL(
          valorAcertoCentavos
        )}.`,
        18,
        finalY + 7
      );
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Os pagamentos podem ser registrados e comprovados a qualquer momento na aba de Fechamentos.', 18, finalY + 12);

    finalY += 22;
  }

  // ==================== TERMO DE CONCILIAÇÃO & ASSINATURAS ====================
  if (finalY > 230) {
    doc.addPage();
    finalY = 25;
  } else {
    finalY += 12;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, finalY, 196, finalY);
  finalY += 6;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Declaração de Conciliação Mútua: As partes reconhecem a exatidão das despesas e parcelas informadas acima para o ciclo mensal correspondente,',
    14,
    finalY
  );
  doc.text(
    'declarando quitadas ou expressamente reconhecidas as obrigações registradas neste extrato gerado pelo aplicativo NósDois Finanças.',
    14,
    finalY + 4
  );

  finalY += 18;

  // Assinaturas do casal
  const signWidth = 60;
  // Assinatura 1
  doc.setDrawColor(148, 163, 184);
  doc.line(25, finalY, 25 + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(p1Nome, 25 + signWidth / 2, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Visto de Conciliação', 25 + signWidth / 2, finalY + 7.5, { align: 'center' });

  // Assinatura 2
  doc.line(125, finalY, 125 + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(p2Nome, 125 + signWidth / 2, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Visto de Conciliação', 125 + signWidth / 2, finalY + 7.5, { align: 'center' });

  // Rodapé da página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `NósDois Finanças • Nota de Fechamento ${codigoNota} • Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

export function baixarNotaFechamentoPDF(dados: DadosNotaFechamento): void {
  const doc = gerarNotaFechamentoPDF(dados);
  const nomeArquivo = `Nota_Fechamento_${dados.mesReferencia}_NosDois.pdf`;
  doc.save(nomeArquivo);
}

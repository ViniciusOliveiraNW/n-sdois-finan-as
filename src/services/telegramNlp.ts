import { GoogleGenAI } from '@google/genai';
import { CategoriaMeta } from '../types';

export interface TelegramMessageContext {
  senderRole: 'partner1' | 'partner2';
  senderUid: string;
  senderName: string;
  partnerRole: 'partner1' | 'partner2';
  partnerUid: string;
  partnerName: string;
  partner1Name: string;
  partner2Name: string;
  categories: CategoriaMeta[];
  defaultSplit?: string;
  conversationHistory?: Array<{ role: 'user' | 'model'; text: string }>;
}

export interface InterpretedExpense {
  nome: string;
  valorCentavos: number;
  valor: number;
  categoriaId: string;
  categoriaNome: string;
  tipo: 'compartilhada' | 'individual';
  privada: boolean;
  pagoPorRole: 'partner1' | 'partner2';
  pagoPorUid: string;
  pagoPorNome: string;
  responsavelRole: 'partner1' | 'partner2' | 'casal';
  responsavelUid: string;
  responsavelNome: string;
  divisao: string;
  cotaP1Centavos: number;
  cotaP2Centavos: number;
  cotaP1Percent: number;
  cotaP2Percent: number;
  numeroDeParcelas: number;
  recorrente: boolean;
  dataCompra: string;
  dataPrimeiroPagamento: string;
  descricao?: string;
  missingFields: string[];
  perguntaAoUsuario?: string;
  resumoFormatado: string;
}

// Inicializa SDK Gemini se API Key estiver disponível no ambiente
const apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? (window as unknown as { __GEMINI_API_KEY__?: string }).__GEMINI_API_KEY__ : undefined);
const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI();

function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

/**
 * Normaliza e encontra a melhor categoria disponível para a compra.
 */
export function encontrarCategoria(texto: string, categories: CategoriaMeta[]): CategoriaMeta {
  const t = texto.toLowerCase();
  for (const cat of categories) {
    if (t.includes(cat.nome.toLowerCase()) || t.includes(cat.id.toLowerCase())) {
      return cat;
    }
  }

  // Mapeamentos comuns em português
  if (t.includes('mercado') || t.includes('compras') || t.includes('feira') || t.includes('açougue') || t.includes('padaria') || t.includes('comida') || t.includes('ifood') || t.includes('lanche') || t.includes('restaurante') || t.includes('jantar') || t.includes('almoço')) {
    const achada = categories.find((c) => c.nome.toLowerCase().includes('aliment') || c.nome.toLowerCase().includes('mercado'));
    if (achada) return achada;
  }
  if (t.includes('farmácia') || t.includes('farmacia') || t.includes('remédio') || t.includes('remedio') || t.includes('médico') || t.includes('consulta') || t.includes('dentista') || t.includes('exame')) {
    const achada = categories.find((c) => c.nome.toLowerCase().includes('saúde') || c.nome.toLowerCase().includes('saude'));
    if (achada) return achada;
  }
  if (t.includes('aluguel') || t.includes('condomínio') || t.includes('condominio') || t.includes('luz') || t.includes('água') || t.includes('internet') || t.includes('gás')) {
    const achada = categories.find((c) => c.nome.toLowerCase().includes('moradia') || c.nome.toLowerCase().includes('casa'));
    if (achada) return achada;
  }
  if (t.includes('uber') || t.includes('gasolina') || t.includes('combustível') || t.includes('estacionamento') || t.includes('pedágio') || t.includes('ônibus') || t.includes('metro')) {
    const achada = categories.find((c) => c.nome.toLowerCase().includes('transporte'));
    if (achada) return achada;
  }
  if (t.includes('cinema') || t.includes('show') || t.includes('viagem') || t.includes('passeio') || t.includes('jogo') || t.includes('steam') || t.includes('playstation') || t.includes('netflix') || t.includes('spotify')) {
    const achada = categories.find((c) => c.nome.toLowerCase().includes('lazer'));
    if (achada) return achada;
  }
  if (t.includes('roupa') || t.includes('maquiagem') || t.includes('perfume') || t.includes('sapato') || t.includes('tênis') || t.includes('cabelo') || t.includes('salão')) {
    const achada = categories.find((c) => c.nome.toLowerCase().includes('pessoal') || c.nome.toLowerCase().includes('vestuário') || c.nome.toLowerCase().includes('compras'));
    if (achada) return achada;
  }

  // Fallback padrão
  return categories[0] || {
    id: 'outros',
    nome: 'Outros',
    icone: 'receipt',
    tetoEstimadoCentavos: 100000,
    divisaoPadrao: '50/50',
    descricao: 'Despesas diversas',
    isFixo: false,
  };
}

/**
 * Parser determinístico baseado em regras e Regex para extração local.
 * Garante 100% de funcionamento instantâneo mesmo sem chamada ao Gemini ou como fallback.
 */
export function interpretarComRegex(
  texto: string,
  contexto: TelegramMessageContext
): InterpretedExpense {
  const t = texto.toLowerCase();

  // 1. Extração de valor monetário (ex: 350 reais, R$ 350, 350,00, 350.50, por 120, 250)
  let valorCentavos = 0;
  const matchMoeda = texto.match(/(?:r\$\s*|por\s+|valor\s*(?:de\s*)?|gastei\s+)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|rs)?/i);
  if (matchMoeda) {
    const rawNum = matchMoeda[1].replace(',', '.');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      valorCentavos = Math.round(parsed * 100);
    }
  }

  // 2. Extração de parcelas
  let numeroDeParcelas = 1;
  const matchParcelas = texto.match(/(\d+)\s*(?:x|vezes|parcelas)/i);
  if (matchParcelas) {
    const num = parseInt(matchParcelas[1], 10);
    if (num > 1 && num <= 60) numeroDeParcelas = num;
  }

  // 3. Extração de recorrência / assinatura
  const recorrente = Boolean(
    t.includes('recorrente') ||
    t.includes('todo mês') ||
    t.includes('todo mes') ||
    t.includes('mensal') ||
    t.includes('assinatura') ||
    t.includes('mensalidade')
  );

  // 4. Identificação do Pagador
  // Regra fundamental: remetente NÃO é automaticamente o pagador!
  let pagoPorRole: 'partner1' | 'partner2' = contexto.senderRole;
  const p1NomeNorm = contexto.partner1Name.toLowerCase();
  const p2NomeNorm = contexto.partner2Name.toLowerCase();

  if (t.includes('eu paguei') || t.includes('paguei') || t.includes('pago por mim')) {
    pagoPorRole = contexto.senderRole;
  } else if (
    t.includes('ela pagou') ||
    t.includes('ele pagou') ||
    t.includes(`${contexto.partnerName.toLowerCase()} pagou`) ||
    t.includes(`pago por ${contexto.partnerName.toLowerCase()}`)
  ) {
    pagoPorRole = contexto.partnerRole;
  } else if (t.includes(`${p1NomeNorm} pagou`) || t.includes(`pago por ${p1NomeNorm}`)) {
    pagoPorRole = 'partner1';
  } else if (t.includes(`${p2NomeNorm} pagou`) || t.includes(`pago por ${p2NomeNorm}`)) {
    pagoPorRole = 'partner2';
  }

  // 5. Tipo da despesa (Individual vs Compartilhada)
  let tipo: 'compartilhada' | 'individual' = 'compartilhada';
  let divisao = '50/50';
  let cotaP1Percent = 50;
  let cotaP2Percent = 50;
  let responsavelRole: 'partner1' | 'partner2' | 'casal' = 'casal';

  const ehIndividual = Boolean(
    t.includes('individual') ||
    t.includes('meu gasto') ||
    t.includes('gasto meu') ||
    t.includes('gasto dela') ||
    t.includes('gasto dele') ||
    t.includes('só meu') ||
    t.includes('só dela') ||
    t.includes('so meu') ||
    t.includes('so dela') ||
    t.includes('cofre privado') ||
    t.includes('privado')
  );

  if (ehIndividual) {
    tipo = 'individual';
    if (t.includes('gasto dela') || t.includes('gasto dele') || t.includes(`gasto de ${contexto.partnerName.toLowerCase()}`) || t.includes(`para ${contexto.partnerName.toLowerCase()}`)) {
      responsavelRole = contexto.partnerRole;
      if (contexto.partnerRole === 'partner1') {
        divisao = '100/0';
        cotaP1Percent = 100;
        cotaP2Percent = 0;
      } else {
        divisao = '0/100';
        cotaP1Percent = 0;
        cotaP2Percent = 100;
      }
    } else {
      responsavelRole = contexto.senderRole;
      if (contexto.senderRole === 'partner1') {
        divisao = '100/0';
        cotaP1Percent = 100;
        cotaP2Percent = 0;
      } else {
        divisao = '0/100';
        cotaP1Percent = 0;
        cotaP2Percent = 100;
      }
    }
  } else {
    // Compartilhada
    tipo = 'compartilhada';
    responsavelRole = 'casal';

    // Checa divisões customizadas (ex: 60/40, 70/30, ou "60% meu e 40% do vinicius")
    const matchPerc = texto.match(/(\d{1,2})%\s*(?:meu|pra mim|minha parte)?[^\d]*(\d{1,2})%/i);
    if (matchPerc) {
      const percA = parseInt(matchPerc[1], 10);
      const percB = parseInt(matchPerc[2], 10);
      if (percA + percB === 100) {
        if (contexto.senderRole === 'partner1') {
          cotaP1Percent = percA;
          cotaP2Percent = percB;
        } else {
          cotaP2Percent = percA;
          cotaP1Percent = percB;
        }
        divisao = `${cotaP1Percent}/${cotaP2Percent}`;
      }
    } else if (t.includes('meio a meio') || t.includes('50/50') || t.includes('metade') || t.includes('dividido')) {
      divisao = '50/50';
      cotaP1Percent = 50;
      cotaP2Percent = 50;
    }
  }

  // 6. Nome da Compra
  let nome = 'Compra';
  const palavrasIgnoradas = [
    'comprei', 'comprei no', 'comprei na', 'comprei um', 'comprei uma',
    'gastei', 'gastei no', 'gastei na', 'mercado', 'jantar', 'almoço',
    'farmácia', 'farmacia', 'remédio', 'remedio', 'maquiagem', 'uber',
    'cinema', 'roupa', 'assinatura', 'netflix', 'spotify', 'reais', 'real'
  ];

  // Extrai substantivo inicial inteligente
  const primeiraFrase = texto.split(/[,.;]/)[0].trim();
  const tokens = primeiraFrase.split(/\s+/);
  const palavraPrincipal = tokens.find(
    (w) => w.length > 2 && !/^\d+$/.test(w) && !['com', 'por', 'pra', 'para', 'de', 'da', 'do', 'em', 'no', 'na'].includes(w.toLowerCase())
  );

  if (palavraPrincipal) {
    nome = palavraPrincipal.charAt(0).toUpperCase() + palavraPrincipal.slice(1).toLowerCase();
  }

  // Encontra categoria adequada
  const cat = encontrarCategoria(texto, contexto.categories);

  // Calcula valores de cotas
  const cotaP1Centavos = Math.round((valorCentavos * cotaP1Percent) / 100);
  const cotaP2Centavos = valorCentavos - cotaP1Centavos;

  const pagoPorUid = pagoPorRole === 'partner1' ? contexto.senderRole === 'partner1' ? contexto.senderUid : contexto.partnerUid : contexto.senderRole === 'partner2' ? contexto.senderUid : contexto.partnerUid;
  const pagoPorNome = pagoPorRole === 'partner1' ? contexto.partner1Name : contexto.partner2Name;

  const responsavelUid = responsavelRole === 'partner1' ? contexto.partner1Name : responsavelRole === 'partner2' ? contexto.partner2Name : 'casal';
  const responsavelNome = responsavelRole === 'partner1' ? contexto.partner1Name : responsavelRole === 'partner2' ? contexto.partner2Name : 'Casal (Ambos)';

  const missingFields: string[] = [];
  let perguntaAoUsuario: string | undefined;

  if (valorCentavos <= 0) {
    missingFields.push('valor');
    perguntaAoUsuario = 'Qual foi o valor total dessa compra?';
  } else if (!ehIndividual && !t.includes('meio a meio') && !t.includes('compartilhad') && !t.includes('50/50') && !t.includes('dividid') && !t.includes('paguei')) {
    // Se o usuário apenas falou "Mercado 250", pergunta sobre o tipo ou quem pagou
    missingFields.push('tipo');
    perguntaAoUsuario = 'Essa compra de ' + formatarMoeda(valorCentavos) + ' será individual ou compartilhada com o casal?';
  }

  // Resumo formatado com emojis para o Telegram
  let resumoFormatado = '';
  if (tipo === 'compartilhada') {
    resumoFormatado =
      `🛒 *Confira o lançamento compartilhado:*\n\n` +
      `• *Compra:* ${nome}\n` +
      `• *Categoria:* ${cat.icone || '🏷️'} ${cat.nome}\n` +
      `• *Valor Total:* ${formatarMoeda(valorCentavos)}\n` +
      `• *Pagamento realizado por:* ${pagoPorNome}\n\n` +
      `📊 *Divisão do Casal:*\n` +
      `• ${contexto.partner1Name} (${cotaP1Percent}%): ${formatarMoeda(cotaP1Centavos)}\n` +
      `• ${contexto.partner2Name} (${cotaP2Percent}%): ${formatarMoeda(cotaP2Centavos)}\n\n` +
      (pagoPorRole === 'partner1' && cotaP2Centavos > 0
        ? `👉 *${contexto.partner2Name}* compensará *${formatarMoeda(cotaP2Centavos)}* para *${contexto.partner1Name}* no acerto mensal.\n\n`
        : pagoPorRole === 'partner2' && cotaP1Centavos > 0
        ? `👉 *${contexto.partner1Name}* compensará *${formatarMoeda(cotaP1Centavos)}* para *${contexto.partner2Name}* no acerto mensal.\n\n`
        : '') +
      (numeroDeParcelas > 1 ? `💳 Parcelamento: em ${numeroDeParcelas}x fixas\n\n` : '') +
      (recorrente ? `🔄 Despesa Recorrente (repetirá todo mês)\n\n` : '') +
      `Posso registrar no sistema financeiro?`;
  } else {
    resumoFormatado =
      `🔒 *Confira o lançamento individual (Cofre Privado):*\n\n` +
      `• *Compra:* ${nome}\n` +
      `• *Categoria:* ${cat.icone || '🏷️'} ${cat.nome}\n` +
      `• *Valor:* ${formatarMoeda(valorCentavos)}\n` +
      `• *Responsável:* ${responsavelNome}\n` +
      `• *Pagador:* ${pagoPorNome}\n` +
      `• *Tipo:* Individual (não entra no rateio 50/50 do casal)\n\n` +
      (numeroDeParcelas > 1 ? `💳 Parcelamento: em ${numeroDeParcelas}x fixas\n\n` : '') +
      (recorrente ? `🔄 Despesa Recorrente (repetirá todo mês)\n\n` : '') +
      `Posso registrar no seu cofre individual?`;
  }

  return {
    nome,
    valorCentavos,
    valor: valorCentavos / 100,
    categoriaId: cat.id,
    categoriaNome: cat.nome,
    tipo,
    privada: tipo === 'individual',
    pagoPorRole,
    pagoPorUid,
    pagoPorNome,
    responsavelRole,
    responsavelUid,
    responsavelNome,
    divisao,
    cotaP1Centavos,
    cotaP2Centavos,
    cotaP1Percent,
    cotaP2Percent,
    numeroDeParcelas,
    recorrente,
    dataCompra: hojeISO(),
    dataPrimeiroPagamento: hojeISO(),
    missingFields,
    perguntaAoUsuario,
    resumoFormatado,
  };
}

/**
 * Interpretação com Gemini API (LLM) estruturada com fallback transparente.
 */
export async function interpretarMensagemTelegram(
  mensagem: string,
  contexto: TelegramMessageContext
): Promise<InterpretedExpense> {
  const fallback = interpretarComRegex(mensagem, contexto);

  try {
    const categoriesPrompt = contexto.categories
      .map((c) => `- ID: "${c.id}", Nome: "${c.nome}", Padrão: ${c.divisaoPadrao}`)
      .join('\n');

    const prompt = `Você é o assistente inteligente de finanças do casal NósDois Finanças no Telegram.
O núcleo financeiro possui 2 usuários:
- Parceiro 1: "${contexto.partner1Name}" (UID: "${contexto.senderRole === 'partner1' ? contexto.senderUid : contexto.partnerUid}")
- Parceiro 2: "${contexto.partner2Name}" (UID: "${contexto.senderRole === 'partner2' ? contexto.senderUid : contexto.partnerUid}")

Quem está enviando a mensagem no Telegram agora é: "${contexto.senderName}" (Papel: ${contexto.senderRole}).

ATENÇÃO ÀS REGRAS:
1. O remetente da mensagem NÃO deve ser automaticamente considerado o responsável pelo pagamento ou o proprietário da despesa. Analise o texto:
   - "eu paguei" -> pagador é quem enviou (${contexto.senderName}).
   - "Silvia pagou" ou "ela pagou" -> pagador é Silvia.
   - "Vinicius pagou" ou "ele pagou" -> pagador é Vinicius.
   - "meu gasto" / "individual" -> despesa individual do remetente.
   - "gasto dela" / "gasto dele" -> despesa individual do parceiro.
   - "meio a meio" ou "compartilhada" -> despesa do casal 50/50.
2. Extraia o nome da compra (ex: "Mercado", "Maquiagem", "Jantar", "Remédios").
3. Extraia o valor total em reais e centavos inteiros (ex: R$ 350,00 -> 35000 centavos).
4. Categorias disponíveis:
${categoriesPrompt}
5. Se faltar informação essencial (por exemplo, o usuário só disse "Mercado 250" sem dizer se é individual ou compartilhada, ou quem pagou), aponte os missingFields e crie uma pergunta curta e educada em perguntaAoUsuario.

MENSAGEM DO USUÁRIO: "${mensagem}"

Responda EXCLUSIVAMENTE em formato JSON com esta estrutura exata:
{
  "nome": string,
  "valorCentavos": number,
  "categoriaId": string,
  "tipo": "compartilhada" | "individual",
  "pagoPorRole": "partner1" | "partner2",
  "responsavelRole": "partner1" | "partner2" | "casal",
  "divisao": string,
  "cotaP1Percent": number,
  "cotaP2Percent": number,
  "numeroDeParcelas": number,
  "recorrente": boolean,
  "missingFields": string[],
  "perguntaAoUsuario": string | null
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text?.trim();
    if (!text) return fallback;

    const parsed = JSON.parse(text);

    const valorCentavos = typeof parsed.valorCentavos === 'number' && parsed.valorCentavos > 0
      ? parsed.valorCentavos
      : fallback.valorCentavos;

    const cotaP1Percent = typeof parsed.cotaP1Percent === 'number' ? parsed.cotaP1Percent : fallback.cotaP1Percent;
    const cotaP2Percent = typeof parsed.cotaP2Percent === 'number' ? parsed.cotaP2Percent : fallback.cotaP2Percent;
    const cotaP1Centavos = Math.round((valorCentavos * cotaP1Percent) / 100);
    const cotaP2Centavos = valorCentavos - cotaP1Centavos;

    const catMeta = contexto.categories.find((c) => c.id === parsed.categoriaId);
    const catNome = catMeta?.nome || fallback.categoriaNome;
    const catIcone = catMeta?.icone || '🏷️';
    const pagoPorRole = parsed.pagoPorRole || fallback.pagoPorRole;
    const responsavelRole = parsed.responsavelRole || fallback.responsavelRole;
    const pagoPorNome = pagoPorRole === 'partner1' ? contexto.partner1Name : contexto.partner2Name;
    const responsavelNome = responsavelRole === 'partner1' ? contexto.partner1Name : responsavelRole === 'partner2' ? contexto.partner2Name : 'Casal (Ambos)';

    const missingFields: string[] = Array.isArray(parsed.missingFields) ? parsed.missingFields : [];
    let perguntaAoUsuario = parsed.perguntaAoUsuario || undefined;

    if (valorCentavos <= 0) {
      if (!missingFields.includes('valor')) missingFields.push('valor');
      perguntaAoUsuario = perguntaAoUsuario || 'Qual foi o valor total dessa compra?';
    }

    const tipo = parsed.tipo === 'individual' ? 'individual' : 'compartilhada';

    // Gera resumo formatado com base nas informações do Gemini
    let resumoFormatado = '';
    if (tipo === 'compartilhada') {
      resumoFormatado =
        `🛒 *Confira o lançamento compartilhado:*\n\n` +
        `• *Compra:* ${parsed.nome || fallback.nome}\n` +
        `• *Categoria:* ${catIcone} ${catNome}\n` +
        `• *Valor Total:* ${formatarMoeda(valorCentavos)}\n` +
        `• *Pagamento realizado por:* ${pagoPorNome}\n\n` +
        `📊 *Divisão do Casal:*\n` +
        `• ${contexto.partner1Name} (${cotaP1Percent}%): ${formatarMoeda(cotaP1Centavos)}\n` +
        `• ${contexto.partner2Name} (${cotaP2Percent}%): ${formatarMoeda(cotaP2Centavos)}\n\n` +
        (pagoPorRole === 'partner1' && cotaP2Centavos > 0
          ? `👉 *${contexto.partner2Name}* compensará *${formatarMoeda(cotaP2Centavos)}* para *${contexto.partner1Name}* no acerto mensal.\n\n`
          : pagoPorRole === 'partner2' && cotaP1Centavos > 0
          ? `👉 *${contexto.partner1Name}* compensará *${formatarMoeda(cotaP1Centavos)}* para *${contexto.partner2Name}* no acerto mensal.\n\n`
          : '') +
        (parsed.numeroDeParcelas > 1 ? `💳 Parcelamento: em ${parsed.numeroDeParcelas}x fixas\n\n` : '') +
        (parsed.recorrente ? `🔄 Despesa Recorrente (repetirá todo mês)\n\n` : '') +
        `Posso registrar no sistema financeiro?`;
    } else {
      resumoFormatado =
        `🔒 *Confira o lançamento individual (Cofre Privado):*\n\n` +
        `• *Compra:* ${parsed.nome || fallback.nome}\n` +
        `• *Categoria:* ${catIcone} ${catNome}\n` +
        `• *Valor:* ${formatarMoeda(valorCentavos)}\n` +
        `• *Responsável:* ${responsavelNome}\n` +
        `• *Pagador:* ${pagoPorNome}\n` +
        `• *Tipo:* Individual (não entra no rateio 50/50 do casal)\n\n` +
        (parsed.numeroDeParcelas > 1 ? `💳 Parcelamento: em ${parsed.numeroDeParcelas}x fixas\n\n` : '') +
        (parsed.recorrente ? `🔄 Despesa Recorrente (repetirá todo mês)\n\n` : '') +
        `Posso registrar no seu cofre individual?`;
    }

    return {
      nome: parsed.nome || fallback.nome,
      valorCentavos,
      valor: valorCentavos / 100,
      categoriaId: parsed.categoriaId || fallback.categoriaId,
      categoriaNome: catNome,
      tipo,
      privada: tipo === 'individual',
      pagoPorRole,
      pagoPorUid: pagoPorRole === 'partner1' ? (contexto.senderRole === 'partner1' ? contexto.senderUid : contexto.partnerUid) : (contexto.senderRole === 'partner2' ? contexto.senderUid : contexto.partnerUid),
      pagoPorNome,
      responsavelRole,
      responsavelUid: responsavelRole === 'partner1' ? contexto.partner1Name : responsavelRole === 'partner2' ? contexto.partner2Name : 'casal',
      responsavelNome,
      divisao: parsed.divisao || `${cotaP1Percent}/${cotaP2Percent}`,
      cotaP1Centavos,
      cotaP2Centavos,
      cotaP1Percent,
      cotaP2Percent,
      numeroDeParcelas: parsed.numeroDeParcelas || 1,
      recorrente: Boolean(parsed.recorrente),
      dataCompra: hojeISO(),
      dataPrimeiroPagamento: hojeISO(),
      missingFields,
      perguntaAoUsuario,
      resumoFormatado,
    };
  } catch (err) {
    console.warn('Erro ao chamar Gemini API para interpretação, utilizando parser regex:', err);
    return fallback;
  }
}

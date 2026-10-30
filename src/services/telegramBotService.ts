import {
  Compra,
  CoupleSpace,
  TelegramPairingCode,
  TelegramPendingOperation,
  UserProfile,
} from '../types';
import {
  interpretarMensagemTelegram,
  TelegramMessageContext,
} from './telegramNlp';
import { salvarCompraFirestore } from './firebaseService';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TelegramBotReply {
  text: string;
  buttons?: Array<{ text: string; callbackData: string }>;
  operationId?: string;
  status: 'info' | 'aguardando_confirmacao' | 'confirmado' | 'cancelado' | 'erro';
  purchaseData?: Partial<Compra>;
}

// Armazenamento em memória com fallback persistido para operações ativas
const operacoesPendentesMemoria = new Map<string, TelegramPendingOperation>();
const codigosVinculacaoMemoria = new Map<string, TelegramPairingCode>();

/**
 * Gera um código temporário amigável de 6 caracteres para vincular a conta do usuário
 * Exemplo: VIN-9482 ou SIL-1209
 */
export async function gerarCodigoVinculacao(
  user: UserProfile,
  couple: CoupleSpace,
  role: 'partner1' | 'partner2'
): Promise<TelegramPairingCode> {
  const prefixo = role === 'partner1' ? 'VIN' : 'SIL';
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  const code = `${prefixo}-${aleatorio}`;

  const agora = Date.now();
  const expiresAt = agora + 15 * 60 * 1000; // 15 minutos de validade

  const item: TelegramPairingCode = {
    code,
    coupleId: couple.id,
    uid: user.uid,
    userName: user.displayName || (role === 'partner1' ? couple.partner1Name : couple.partner2Name || 'Usuário'),
    role,
    expiresAt,
    used: false,
    createdAt: agora,
  };

  codigosVinculacaoMemoria.set(code, item);

  try {
    await setDoc(doc(db, 'telegram_codes', code), item);
  } catch (e) {
    console.warn('Persistência do código no Firestore (usando fallback em memória):', e);
  }

  return item;
}

/**
 * Vincula o Telegram ID ao usuário e ao casal
 */
export async function processarVinculacaoComCodigo(
  code: string,
  telegramUserId: string,
  telegramChatId: string,
  telegramUsername?: string
): Promise<{ sucesso: boolean; mensagem: string; userName?: string; coupleId?: string }> {
  const codeNorm = code.trim().toUpperCase();

  let item = codigosVinculacaoMemoria.get(codeNorm);

  if (!item) {
    try {
      const snap = await getDoc(doc(db, 'telegram_codes', codeNorm));
      if (snap.exists()) {
        item = snap.data() as TelegramPairingCode;
      }
    } catch (e) {
      console.warn('Erro ao ler código no Firestore:', e);
    }
  }

  if (!item) {
    return {
      sucesso: false,
      mensagem: '❌ Código de vinculação inválido ou não encontrado. Gere um novo código no sistema NósDois Finanças.',
    };
  }

  if (item.used) {
    return {
      sucesso: false,
      mensagem: '⚠️ Este código de vinculação já foi utilizado anteriormente. Por favor, gere um novo código no aplicativo.',
    };
  }

  if (Date.now() > item.expiresAt) {
    return {
      sucesso: false,
      mensagem: '⏳ Este código de vinculação expirou (validade de 15 minutos). Gere um novo código no aplicativo.',
    };
  }

  // Marca como usado
  item.used = true;
  codigosVinculacaoMemoria.set(codeNorm, item);

  try {
    await setDoc(doc(db, 'telegram_codes', codeNorm), { ...item, used: true });
  } catch (e) {
    console.warn('Erro ao atualizar código como usado no Firestore:', e);
  }

  // Atualiza perfil do usuário
  try {
    await setDoc(
      doc(db, 'users', item.uid),
      {
        telegramUserId,
        telegramUsername: telegramUsername || '',
        telegramChatId,
        telegramLinkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Erro ao salvar Telegram no perfil do usuário:', e);
  }

  // Atualiza espaço do casal com o mapeamento do Telegram
  try {
    const coupleRef = doc(db, 'couples', item.coupleId);
    const pairingKey = `telegramPairings.${telegramUserId}`;
    await setDoc(
      coupleRef,
      {
        telegramPairings: {
          [telegramUserId]: {
            uid: item.uid,
            displayName: item.userName,
            role: item.role,
            username: telegramUsername || '',
            chatId: telegramChatId,
            linkedAt: new Date().toISOString(),
          },
        },
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Erro ao salvar Telegram no casal:', e);
  }

  // Salva no índice telegram_users para busca rápida O(1) pelo ID do Telegram
  try {
    await setDoc(
      doc(db, 'telegram_users', telegramUserId),
      {
        telegramUserId,
        telegramChatId,
        telegramUsername: telegramUsername || '',
        uid: item.uid,
        userName: item.userName,
        coupleId: item.coupleId,
        role: item.role,
        linkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Erro ao salvar no índice telegram_users:', e);
  }

  return {
    sucesso: true,
    userName: item.userName,
    coupleId: item.coupleId,
    mensagem:
      `🎉 *Conta Vinculada com Sucesso!*\n\n` +
      `Olá, *${item.userName}*! Seu Telegram agora está oficialmente conectado ao espaço financeiro do casal no *NósDois Finanças*.\n\n` +
      `💬 *Como usar:* basta digitar os seus gastos aqui nesta conversa de forma livre e natural! Veja alguns exemplos:\n\n` +
      `• _"Mercado 350 reais, eu paguei, meio a meio"_\n` +
      `• _"Comprei maquiagem por 120 reais, gasto individual meu"_\n` +
      `• _"Silvia comprou remédio por 85 reais, despesa individual dela"_\n` +
      `• _"Jantar de 200 reais, eu paguei, 60% meu e 40% do Vinicius"_\n\n` +
      `Sempre pedirei sua confirmação antes de gravar no sistema!`,
  };
}

/**
 * Busca o casal e o perfil do usuário a partir do Telegram User ID
 */
export async function buscarCouplePorTelegramId(telegramUserId: string): Promise<{
  couple: CoupleSpace;
  user: UserProfile;
} | null> {
  try {
    // 1. Tenta buscar no índice direto telegram_users
    const tgUserSnap = await getDoc(doc(db, 'telegram_users', telegramUserId));
    if (tgUserSnap.exists()) {
      const data = tgUserSnap.data();
      const coupleSnap = await getDoc(doc(db, 'couples', data.coupleId));
      if (coupleSnap.exists()) {
        const couple = coupleSnap.data() as CoupleSpace;
        const user: UserProfile = {
          uid: data.uid,
          email: '',
          displayName: data.userName,
        };
        return { couple, user };
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar casal por Telegram ID:', e);
  }
  return null;
}

/**
 * Desvincula a conta do Telegram
 */
export async function desvincularTelegram(
  uid: string,
  coupleId: string,
  telegramUserId?: string
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        telegramUserId: '',
        telegramUsername: '',
        telegramChatId: '',
        telegramLinkedAt: '',
      },
      { merge: true }
    );

    if (coupleId && telegramUserId) {
      const coupleRef = doc(db, 'couples', coupleId);
      const coupleSnap = await getDoc(coupleRef);
      if (coupleSnap.exists()) {
        const data = coupleSnap.data() as CoupleSpace;
        if (data.telegramPairings && data.telegramPairings[telegramUserId]) {
          delete data.telegramPairings[telegramUserId];
          await setDoc(coupleRef, { telegramPairings: data.telegramPairings }, { merge: true });
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao desvincular Telegram:', e);
  }
}

/**
 * Processador principal de mensagens recebidas pelo Bot do Telegram
 */
export async function processarMensagemTelegram(
  mensagem: string,
  telegramUserId: string,
  telegramChatId: string,
  couple: CoupleSpace,
  remetenteUser: UserProfile
): Promise<TelegramBotReply> {
  const textoLimpo = mensagem.trim();

  // 1. Comandos do Bot
  if (textoLimpo.startsWith('/start')) {
    const partes = textoLimpo.split(/\s+/);
    if (partes.length > 1 && partes[1]) {
      // Deep link de vinculação com código! (ex: /start VIN-8492)
      const res = await processarVinculacaoComCodigo(partes[1], telegramUserId, telegramChatId);
      return {
        text: res.mensagem,
        status: res.sucesso ? 'info' : 'erro',
      };
    }

    return {
      text:
        `👋 *Olá! Bem-vindo ao Bot do NósDois Finanças.*\n\n` +
        `Eu sou o assistente financeiro do casal (*${couple.partner1Name} & ${couple.partner2Name || 'Parceiro'}*).\n\n` +
        `📌 *Comandos disponíveis:*\n` +
        `• /ajuda - Exemplos de como registrar gastos\n` +
        `• /status - Verifique quem está vinculado ao bot\n` +
        `• /vincular [CÓDIGO] - Conectar seu Telegram à sua conta\n` +
        `• /cancelar - Cancelar um lançamento pendente\n\n` +
        `💡 *Para cadastrar um gasto*, basta digitar normalmente! Por exemplo:\n` +
        `_"Mercado 350 reais eu paguei meio a meio"_`,
      status: 'info',
    };
  }

  if (textoLimpo.startsWith('/ajuda') || textoLimpo.startsWith('/help')) {
    return {
      text:
        `📖 *Como Registrar Despesas Pelo Telegram*\n\n` +
        `O bot compreende mensagens em linguagem natural sem formatos rígidos:\n\n` +
        `1️⃣ *Despesa Compartilhada (Meio a meio):*\n` +
        `_"Mercado 350 reais eu paguei meio a meio"_\n\n` +
        `2️⃣ *Despesa Individual (Cofre Pessoal):*\n` +
        `_"Comprei maquiagem por 120 reais, despesa individual"_\n\n` +
        `3️⃣ *Gasto pago pelo parceiro:*\n` +
        `_"Silvia comprou remédios por 85 reais, gasto individual dela"_\n\n` +
        `4️⃣ *Divisão com porcentagens customizadas:*\n` +
        `_"Jantar 200 reais eu paguei, 60% meu e 40% do Vinicius"_\n\n` +
        `5️⃣ *Compras parceladas:*\n` +
        `_"Tênis 3x de 100 reais no cartão de Vinicius compartilhado"_\n\n` +
        `Sempre enviaremos um resumo com botões para você confirmar antes de salvar!`,
      status: 'info',
    };
  }

  if (textoLimpo.startsWith('/status')) {
    const p1Vinculado = couple.telegramPairings
      ? Object.values(couple.telegramPairings).find((p) => p.role === 'partner1')
      : null;
    const p2Vinculado = couple.telegramPairings
      ? Object.values(couple.telegramPairings).find((p) => p.role === 'partner2')
      : null;

    return {
      text:
        `📊 *Status do Núcleo Financeiro no Telegram*\n\n` +
        `Casal: *${couple.partner1Name} & ${couple.partner2Name || 'Parceiro'}*\n\n` +
        `👤 *${couple.partner1Name}:* ${p1Vinculado ? `✅ Conectado (@${p1Vinculado.username || p1Vinculado.displayName})` : '⏳ Não vinculado'}\n` +
        `👤 *${couple.partner2Name || 'Parceiro'}:* ${p2Vinculado ? `✅ Conectado (@${p2Vinculado.username || p2Vinculado.displayName})` : '⏳ Não vinculado'}\n\n` +
        `Você está enviando mensagens como: *${remetenteUser.displayName || 'Usuário'}*`,
      status: 'info',
    };
  }

  if (textoLimpo.startsWith('/vincular')) {
    const partes = textoLimpo.split(/\s+/);
    if (partes.length > 1 && partes[1]) {
      const res = await processarVinculacaoComCodigo(partes[1], telegramUserId, telegramChatId);
      return {
        text: res.mensagem,
        status: res.sucesso ? 'info' : 'erro',
      };
    }
    return {
      text: '⚠️ Por favor informe o código de vinculação gerado no sistema. Exemplo: `/vincular VIN-1234`',
      status: 'erro',
    };
  }

  if (textoLimpo.startsWith('/cancelar')) {
    operacoesPendentesMemoria.delete(telegramUserId);
    try {
      await deleteDoc(doc(db, 'telegram_operations', `op-${telegramUserId}`));
    } catch (e) {
      // ignore
    }
    return {
      text: '❌ Operação cancelada com sucesso. Nenhuma alteração foi realizada nas contas.',
      status: 'cancelado',
    };
  }

  // 2. Verifica se o usuário possui operação pendente aguardando informação
  const opPendente = operacoesPendentesMemoria.get(telegramUserId);

  let mensagemParaProcessar = textoLimpo;
  if (opPendente && opPendente.status === 'aguardando_info') {
    // Mescla o contexto da mensagem anterior com a nova resposta
    mensagemParaProcessar = `${opPendente.dados.nome} ${opPendente.dados.valor} reais, ${textoLimpo}`;
  }

  // 3. Monta o contexto financeiro da mensagem
  const isP1 = remetenteUser.uid === couple.partner1Uid || couple.partner1Name.toLowerCase().includes((remetenteUser.displayName || '').toLowerCase());
  const senderRole: 'partner1' | 'partner2' = isP1 ? 'partner1' : 'partner2';
  const partnerRole: 'partner1' | 'partner2' = isP1 ? 'partner2' : 'partner1';

  const contexto: TelegramMessageContext = {
    senderRole,
    senderUid: remetenteUser.uid,
    senderName: remetenteUser.displayName || (isP1 ? couple.partner1Name : couple.partner2Name || 'Parceiro'),
    partnerRole,
    partnerUid: isP1 ? (couple.partner2Uid || 'partner-2') : couple.partner1Uid,
    partnerName: isP1 ? (couple.partner2Name || 'Silvia') : couple.partner1Name,
    partner1Name: couple.partner1Name,
    partner2Name: couple.partner2Name || 'Silvia',
    categories: couple.categories && couple.categories.length > 0 ? couple.categories : [],
    defaultSplit: couple.defaultSplit || '50/50',
  };

  // 4. Executa NLU (Interpretação Inteligente)
  const interpretado = await interpretarMensagemTelegram(mensagemParaProcessar, contexto);

  // 5. Se faltar informação crítica, salva estado e pergunta
  if (interpretado.missingFields.length > 0 && interpretado.perguntaAoUsuario) {
    const opIncompleta: TelegramPendingOperation = {
      id: `op-${telegramUserId}`,
      telegramUserId,
      telegramChatId,
      coupleId: couple.id,
      authorUid: remetenteUser.uid,
      authorName: contexto.senderName,
      status: 'aguardando_info',
      dados: {
        nome: interpretado.nome,
        valorCentavos: interpretado.valorCentavos,
        valor: interpretado.valor,
        categoria: interpretado.categoriaId,
        dataCompra: interpretado.dataCompra,
        dataPrimeiroPagamento: interpretado.dataPrimeiroPagamento,
        numeroDeParcelas: interpretado.numeroDeParcelas,
        pagoPorUid: interpretado.pagoPorUid,
        pagoPorNome: interpretado.pagoPorNome,
        cadastradoPorUid: remetenteUser.uid,
        cadastradoPorNome: contexto.senderName,
        divisao: interpretado.divisao,
        tipo: interpretado.tipo,
        privada: interpretado.privada,
        recorrente: interpretado.recorrente,
        resumoDivisao: interpretado.resumoFormatado,
      },
      missingFields: interpretado.missingFields,
      lastPrompt: interpretado.perguntaAoUsuario,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    operacoesPendentesMemoria.set(telegramUserId, opIncompleta);

    return {
      text: `🤔 ${interpretado.perguntaAoUsuario}`,
      status: 'aguardando_confirmacao',
      operationId: opIncompleta.id,
    };
  }

  // 6. Todas as informações prontas: cria operação aguardando confirmação
  const operationId = `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const opCompleta: TelegramPendingOperation = {
    id: operationId,
    telegramUserId,
    telegramChatId,
    coupleId: couple.id,
    authorUid: remetenteUser.uid,
    authorName: contexto.senderName,
    status: 'aguardando_confirmacao',
    dados: {
      nome: interpretado.nome,
      valorCentavos: interpretado.valorCentavos,
      valor: interpretado.valor,
      categoria: interpretado.categoriaId,
      dataCompra: interpretado.dataCompra,
      dataPrimeiroPagamento: interpretado.dataPrimeiroPagamento,
      numeroDeParcelas: interpretado.numeroDeParcelas,
      pagoPorUid: interpretado.pagoPorUid,
      pagoPorNome: interpretado.pagoPorNome,
      cadastradoPorUid: remetenteUser.uid,
      cadastradoPorNome: contexto.senderName,
      divisao: interpretado.divisao,
      tipo: interpretado.tipo,
      privada: interpretado.privada,
      recorrente: interpretado.recorrente,
      resumoDivisao: interpretado.resumoFormatado,
    },
    missingFields: [],
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  operacoesPendentesMemoria.set(telegramUserId, opCompleta);
  operacoesPendentesMemoria.set(operationId, opCompleta);

  try {
    await setDoc(doc(db, 'telegram_operations', operationId), opCompleta);
  } catch (e) {
    console.warn('Erro ao persistir operação pendente no Firestore:', e);
  }

  // 7. Retorna com botões interativos
  return {
    text: interpretado.resumoFormatado,
    operationId,
    buttons: [
      { text: '✅ Confirmar lançamento', callbackData: `confirm:${operationId}` },
      { text: '✏️ Editar', callbackData: `edit:${operationId}` },
      { text: '❌ Cancelar', callbackData: `cancel:${operationId}` },
    ],
    status: 'aguardando_confirmacao',
    purchaseData: {
      nome: interpretado.nome,
      valor: interpretado.valor,
      valorCentavos: interpretado.valorCentavos,
      categoria: interpretado.categoriaId,
      pagoPor: interpretado.pagoPorNome,
      divisao: interpretado.divisao,
      privada: interpretado.privada,
      recorrente: interpretado.recorrente,
    },
  };
}

/**
 * Executa a ação de clique nos botões inline de confirmação/edição/cancelamento
 */
export async function processarAcaoBotaoTelegram(
  callbackData: string,
  telegramUserId: string,
  couple: CoupleSpace
): Promise<TelegramBotReply> {
  const [acao, operationId] = callbackData.split(':');

  let op = operacoesPendentesMemoria.get(operationId) || operacoesPendentesMemoria.get(telegramUserId);

  if (!op) {
    try {
      const snap = await getDoc(doc(db, 'telegram_operations', operationId));
      if (snap.exists()) {
        op = snap.data() as TelegramPendingOperation;
      }
    } catch (e) {
      console.warn('Erro ao buscar operacao no Firestore:', e);
    }
  }

  if (!op) {
    return {
      text: '⚠️ Esta operação expirou ou não foi encontrada. Por favor, envie uma nova mensagem com a compra.',
      status: 'erro',
    };
  }

  // Proteção contra duplicação: não permite confirmar mais de uma vez
  if (op.status === 'confirmado') {
    return {
      text: '✅ Este lançamento já foi confirmado e registrado anteriormente no sistema.',
      status: 'confirmado',
    };
  }

  if (op.status === 'cancelado') {
    return {
      text: '❌ Este lançamento foi cancelado.',
      status: 'cancelado',
    };
  }

  if (acao === 'cancel') {
    op.status = 'cancelado';
    operacoesPendentesMemoria.delete(telegramUserId);
    operacoesPendentesMemoria.delete(operationId);

    try {
      await setDoc(doc(db, 'telegram_operations', operationId), { status: 'cancelado' }, { merge: true });
    } catch (e) {
      // ignore
    }

    return {
      text: '❌ Lançamento cancelado com sucesso. Nenhum registro foi inserido no sistema.',
      status: 'cancelado',
    };
  }

  if (acao === 'edit') {
    op.status = 'aguardando_info';
    operacoesPendentesMemoria.set(telegramUserId, op);

    return {
      text: `✏️ Por favor, envie a correção da despesa (ex: altere o valor, quem pagou ou a categoria):`,
      status: 'aguardando_confirmacao',
      operationId,
    };
  }

  if (acao === 'confirm') {
    // 1. Marca status como confirmado para impedir duplicações
    op.status = 'confirmado';
    operacoesPendentesMemoria.delete(telegramUserId);

    try {
      await setDoc(doc(db, 'telegram_operations', operationId), { status: 'confirmado' }, { merge: true });
    } catch (e) {
      // ignore
    }

    // 2. Monta o objeto oficial da Compra com campos idênticos ao cadastro web
    const compraId = `compra-tg-${Date.now()}`;
    const novaCompra: Compra = {
      id: compraId,
      coupleId: couple.id,
      nome: op.dados.nome,
      valor: op.dados.valor,
      valorCentavos: op.dados.valorCentavos,
      pagoPorUid: op.dados.pagoPorUid,
      pagoPorNome: op.dados.pagoPorNome,
      pagoPor: op.dados.pagoPorNome,
      cadastradoPorUid: op.authorUid,
      cadastradoPorNome: op.authorName,
      cadastradoPor: op.authorName,
      divisao: op.dados.divisao,
      categoria: op.dados.categoria,
      dataCompra: op.dados.dataCompra,
      dataPrimeiroPagamento: op.dados.dataPrimeiroPagamento,
      numeroDeParcelas: op.dados.numeroDeParcelas,
      ultimaParcelaAtiva: op.dados.numeroDeParcelas,
      privada: op.dados.privada,
      recorrente: op.dados.recorrente,
      origem: 'telegram',
      telegramMessageId: operationId,
      telegramUserId,
      createdAt: new Date().toISOString(),
    };

    // 3. Grava no Firebase Firestore
    try {
      await salvarCompraFirestore(couple.id, novaCompra);
    } catch (e) {
      console.error('Erro ao salvar compra no Firestore vinda do Telegram:', e);
      return {
        text: '❌ Ocorreu um erro ao gravar a compra no banco de dados. Tente novamente.',
        status: 'erro',
      };
    }

    // 4. Retorna mensagem de sucesso que será atualizada na conversa
    const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(op.dados.valorCentavos / 100);
    return {
      text:
        `✅ *Despesa registrada com sucesso!*\n\n` +
        `• *Item:* ${op.dados.nome}\n` +
        `• *Valor:* ${moeda}\n` +
        `• *Pagador:* ${op.dados.pagoPorNome}\n` +
        `• *Tipo:* ${op.dados.privada ? 'Cofre Individual Privado' : `Compartilhada (${op.dados.divisao})`}\n\n` +
        `O lançamento já está disponível em tempo real no NósDois Finanças! 🎉`,
      status: 'confirmado',
      purchaseData: novaCompra,
    };
  }

  return {
    text: 'Ação não reconhecida.',
    status: 'erro',
  };
}

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

import {
  processarVinculacaoComCodigo,
  processarMensagemTelegram,
  processarAcaoBotaoTelegram,
  buscarCouplePorTelegramId,
} from './src/services/telegramBotService';

// Parser para corpo JSON
app.use(express.json());

let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
let TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'NosDoisFinancasBot';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

// Status da Integração do Telegram
app.get('/api/telegram/status', async (_req: Request, res: Response) => {
  let botInfo: Record<string, unknown> | null = null;
  let webhookInfo: Record<string, unknown> | null = null;

  if (TELEGRAM_BOT_TOKEN) {
    try {
      const meResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      const meData = await meResp.json();
      if (meData.ok) {
        botInfo = meData.result;
        TELEGRAM_BOT_USERNAME = meData.result.username || TELEGRAM_BOT_USERNAME;
      }

      const whResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
      const whData = await whResp.json();
      if (whData.ok) {
        webhookInfo = whData.result;
      }
    } catch (e) {
      console.warn('Erro ao verificar status com Telegram API:', e);
    }
  }

  res.json({
    configured: Boolean(TELEGRAM_BOT_TOKEN),
    username: TELEGRAM_BOT_USERNAME,
    hasWebhookSecret: Boolean(TELEGRAM_WEBHOOK_SECRET),
    mode: isProd ? 'production' : 'development',
    botInfo,
    webhookInfo,
  });
});

// Estado da Conexão e Polling do Telegram
let pollingActive = false;
let lastUpdateId = 0;
let pollingTimer: NodeJS.Timeout | null = null;

// Endpoint para configurar Token e registrar Webhook / Polling com 1 clique
app.post('/api/telegram/set-webhook', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const { token, url, forceWebhook } = req.body || {};
  let tokenToUse = (token || TELEGRAM_BOT_TOKEN || '').trim();

  // Limpa prefixos acidentais como "bot1234..." ou aspas
  tokenToUse = tokenToUse.replace(/^bot/i, '').replace(/['"]/g, '').trim();

  if (!tokenToUse) {
    res.status(400).json({ success: false, message: 'Token do Telegram Bot é obrigatório.' });
    return;
  }

  try {
    // 1. Testa token no Telegram getMe
    const meResp = await fetch(`https://api.telegram.org/bot${tokenToUse}/getMe`);
    const meData = await meResp.json().catch(() => null);

    if (!meData || !meData.ok) {
      res.status(400).json({
        success: false,
        message: `Token inválido retornado pelo Telegram: ${meData?.description || 'Verifique o token copiado do @BotFather'}`,
      });
      return;
    }

    TELEGRAM_BOT_TOKEN = tokenToUse;
    TELEGRAM_BOT_USERNAME = meData.result.username || TELEGRAM_BOT_USERNAME;

    let mode = 'polling';
    let webhookResult = null;

    // Se o usuário solicitou explicitamente webhook com URL válida
    if (forceWebhook && url && typeof url === 'string' && url.startsWith('https://')) {
      const whResp = await fetch(
        `https://api.telegram.org/bot${tokenToUse}/setWebhook?url=${encodeURIComponent(url.trim())}`
      );
      webhookResult = await whResp.json().catch(() => null);
      mode = 'webhook';
    } else {
      // Modo Polling em Tempo Real (recomendado para Cloud Run/AI Studio sem necessidade de IP/porta aberta)
      stopTelegramPolling();
      // Remove webhook anterior para o Telegram não conflitar com getUpdates
      await fetch(`https://api.telegram.org/bot${tokenToUse}/deleteWebhook`).catch(() => null);
      startTelegramPolling();
    }

    res.json({
      success: true,
      message: `Bot @${TELEGRAM_BOT_USERNAME} (${meData.result.first_name}) conectado com sucesso! Modo: ${mode === 'polling' ? 'Tempo Real (Polling)' : 'Webhook'}.`,
      bot: meData.result,
      mode,
      webhookResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: `Erro ao conectar Telegram: ${msg}` });
  }
});

// Helper para enviar mensagens via Telegram Bot API
async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: unknown) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Simulation] Mensagem para ${chatId}: ${text}`);
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await resp.json().catch(() => null);
  } catch (err) {
    console.error('Erro ao enviar mensagem para Telegram API:', err);
    return null;
  }
}

// Helper para editar mensagem no Telegram
async function editTelegramMessage(chatId: string | number, messageId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return null;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    return await resp.json().catch(() => null);
  } catch (err) {
    console.error('Erro ao editar mensagem no Telegram API:', err);
    return null;
  }
}

// Helper para responder Callback Query
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!TELEGRAM_BOT_TOKEN) return null;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    console.error('Erro ao responder callback query no Telegram:', err);
  }
}

// Processador unificado de Updates do Telegram (usado tanto por Webhook quanto por Long Polling)
async function handleTelegramUpdate(update: any) {
  if (!update) return;

  try {
    // 1. Mensagem de Texto
    if (update.message && update.message.text) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const userId = String(msg.from.id);
      const username = msg.from.username || msg.from.first_name || '';
      const text = (msg.text || '').trim();

      // Caso 1: Comando de vinculação ou start com código (/vincular CODIGO ou /start CODIGO)
      let codigoParaVincular: string | null = null;
      if (text.startsWith('/vincular')) {
        const partes = text.split(/\s+/);
        if (partes.length > 1 && partes[1]) {
          codigoParaVincular = partes[1].trim();
        } else {
          await sendTelegramMessage(
            chatId,
            '⚠️ *Como vincular:*\nPor favor envie o comando com o seu código gerado no aplicativo NósDois Finanças.\n\nExemplo: `/vincular VIN-1234`'
          );
          return;
        }
      } else if (text.startsWith('/start')) {
        const partes = text.split(/\s+/);
        if (partes.length > 1 && partes[1] && (partes[1].startsWith('VIN-') || partes[1].startsWith('SIL-') || partes[1].length >= 6)) {
          codigoParaVincular = partes[1].trim();
        }
      }

      if (codigoParaVincular) {
        const resultado = await processarVinculacaoComCodigo(
          codigoParaVincular,
          userId,
          String(chatId),
          username
        );
        await sendTelegramMessage(chatId, resultado.mensagem);
        return;
      }

      // Caso 2: Comando /start simples
      if (text === '/start') {
        await sendTelegramMessage(
          chatId,
          `👋 *Bem-vindo ao Bot Oficial do NósDois Finanças!*\n\n` +
          `Para começar a registrar seus gastos direto pelo Telegram, você só precisa conectar sua conta:\n\n` +
          `1️⃣ Abra o aplicativo web e clique em *Bot Telegram* no seu Perfil\n` +
          `2️⃣ Clique em *Gerar Código*\n` +
          `3️⃣ Envie o comando aqui: \`/vincular SEU-CODIGO\` (ou apenas o código)\n\n` +
          `Depois disso, basta digitar seus gastos livremente! Exemplo:\n` +
          `_"Mercado 350 reais eu paguei meio a meio"_`
        );
        return;
      }

      // Caso 3: Comando /ajuda ou /help
      if (text === '/ajuda' || text === '/help') {
        await sendTelegramMessage(
          chatId,
          `📖 *Como Registrar Despesas Pelo Telegram*\n\n` +
          `Basta mandar uma mensagem em linguagem natural:\n\n` +
          `• _"Mercado 350 reais eu paguei meio a meio"_\n` +
          `• _"Comprei maquiagem por 120 reais, gasto individual"_\n` +
          `• _"Silvia comprou remédio por 85 reais, gasto individual dela"_\n` +
          `• _"Jantar 200 reais eu paguei, 60% meu e 40% do parceiro"_\n\n` +
          `Eu sempre enviarei um resumo para você conferir e confirmar com 1 clique antes de salvar!`
        );
        return;
      }

      // Caso 4: Gasto ou Mensagem Livre -> Buscar vínculo do usuário
      const vinculado = await buscarCouplePorTelegramId(userId);

      if (!vinculado) {
        await sendTelegramMessage(
          chatId,
          `👋 Olá! Sua conta do Telegram ainda não está vinculada ao *NósDois Finanças*.\n\n` +
          `Para vincular:\n` +
          `1. Acesse o sistema e abra a opção *Bot Telegram* no seu perfil\n` +
          `2. Clique em *Gerar Código*\n` +
          `3. Envie o comando aqui: \`/vincular SEU-CODIGO\`\n\n` +
          `É rápido e você só precisa fazer uma vez!`
        );
        return;
      }

      // Usuário vinculado: processa com a inteligência e regras do casal
      const reply = await processarMensagemTelegram(
        text,
        userId,
        String(chatId),
        vinculado.couple,
        vinculado.user
      );

      // Prepara botões inline caso existam
      let replyMarkup: unknown = undefined;
      if (reply.buttons && reply.buttons.length > 0) {
        replyMarkup = {
          inline_keyboard: [
            reply.buttons.map((b) => ({
              text: b.text,
              callback_data: b.callbackData,
            })),
          ],
        };
      }

      await sendTelegramMessage(chatId, reply.text, replyMarkup);
    }

    // 2. Callback Query de Botões Inline (Confirmar, Editar, Cancelar)
    if (update.callback_query) {
      const cb = update.callback_query;
      const cbId = cb.id;
      const data = cb.data;
      const chatId = cb.message?.chat.id;
      const messageId = cb.message?.message_id;
      const userId = String(cb.from.id);

      await answerCallbackQuery(cbId, 'Processando...');

      if (chatId && messageId && data) {
        const vinculado = await buscarCouplePorTelegramId(userId);
        if (vinculado) {
          const resultadoAcao = await processarAcaoBotaoTelegram(data, userId, vinculado.couple);
          await editTelegramMessage(chatId, messageId, resultadoAcao.text);
        } else {
          if (data.startsWith('confirm:')) {
            await editTelegramMessage(chatId, messageId, '✅ *Lançamento confirmado e registrado com sucesso!*');
          } else if (data.startsWith('cancel:')) {
            await editTelegramMessage(chatId, messageId, '❌ *Lançamento cancelado.*');
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro no processamento do update do Telegram:', err);
  }
}

// Inicializa Long Polling em tempo real
function startTelegramPolling() {
  if (!TELEGRAM_BOT_TOKEN) return;
  if (pollingActive) return;
  pollingActive = true;
  console.log(`📡 Receptor Telegram (Long Polling) ativo para @${TELEGRAM_BOT_USERNAME}`);

  const pollLoop = async () => {
    if (!pollingActive || !TELEGRAM_BOT_TOKEN) return;

    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data && data.ok && Array.isArray(data.result)) {
          for (const upd of data.result) {
            lastUpdateId = Math.max(lastUpdateId, upd.update_id);
            await handleTelegramUpdate(upd).catch((e) => console.error('Erro ao processar update:', e));
          }
        }
      } else if (resp.status === 409) {
        // Se houver conflito com webhook ativo, exclui o webhook
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`).catch(() => null);
      }
    } catch {
      // Ignora erro transitório de rede
    }

    if (pollingActive) {
      pollingTimer = setTimeout(pollLoop, 600);
    }
  };

  pollLoop();
}

function stopTelegramPolling() {
  pollingActive = false;
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

// Webhook endpoint oficial do Telegram (para quando utilizado com Webhook)
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  // Valida token de segredo caso configurado
  if (TELEGRAM_WEBHOOK_SECRET) {
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (headerSecret !== TELEGRAM_WEBHOOK_SECRET) {
      res.status(401).send('Unauthorized webhook secret');
      return;
    }
  }

  const update = req.body;
  if (!update) {
    res.status(400).send('No payload');
    return;
  }

  // Responde 200 rápido ao Telegram para evitar reenvios e timeouts
  res.status(200).send('OK');

  handleTelegramUpdate(update).catch((err) => {
    console.error('Erro no processamento do webhook do Telegram:', err);
  });
});

// Setup Dev vs Production
async function startServer() {
  if (!isProd) {
    // Modo de Desenvolvimento com Vite integrado em middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Modo de Produção: serve arquivos estáticos de dist/
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NósDois Finanças rodando na porta ${PORT} [${isProd ? 'produção' : 'desenvolvimento'}]`);
    console.log(`🤖 Telegram Bot Webhook disponível em: http://0.0.0.0:${PORT}/api/telegram/webhook`);
  });
}

startServer().catch((err) => {
  console.error('Erro ao iniciar servidor:', err);
});

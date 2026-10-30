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

// Endpoint para configurar Token e registrar Webhook com 1 clique
app.post('/api/telegram/set-webhook', async (req: Request, res: Response) => {
  const { token, url } = req.body;
  const tokenToUse = (token || TELEGRAM_BOT_TOKEN || '').trim();
  const webhookUrl = (url || 'https://ais-pre-z53qn5zl6kan6nzlapndbc-386416813189.us-east1.run.app/api/telegram/webhook').trim();

  if (!tokenToUse) {
    res.status(400).json({ success: false, message: 'Token do Telegram Bot é obrigatório.' });
    return;
  }

  try {
    // 1. Testa token no Telegram getMe
    const meResp = await fetch(`https://api.telegram.org/bot${tokenToUse}/getMe`);
    const meData = await meResp.json();

    if (!meData.ok) {
      res.status(400).json({
        success: false,
        message: `Token inválido retornado pelo Telegram: ${meData.description || 'Verifique o token com @BotFather'}`,
      });
      return;
    }

    TELEGRAM_BOT_TOKEN = tokenToUse;
    TELEGRAM_BOT_USERNAME = meData.result.username || TELEGRAM_BOT_USERNAME;

    // 2. Registra o Webhook no Telegram
    const whResp = await fetch(
      `https://api.telegram.org/bot${tokenToUse}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const whData = await whResp.json();

    res.json({
      success: whData.ok,
      message: whData.ok
        ? `Bot @${TELEGRAM_BOT_USERNAME} conectado com sucesso ao Webhook!`
        : `Erro ao definir webhook: ${whData.description}`,
      bot: meData.result,
      webhookResult: whData,
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
    return await resp.json();
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
    return await resp.json();
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

// Webhook endpoint oficial do Telegram
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
          `1️⃣ Abra o aplicativo web e clique em *Bot Telegram*\n` +
          `2️⃣ Na aba *Conectar Telegram Real*, clique em *Gerar Código*\n` +
          `3️⃣ Envie o comando aqui: \`/vincular SEU-CODIGO\`\n\n` +
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
          `1. Acesse o sistema e abra a opção *Bot Telegram*\n` +
          `2. Na aba *Conectar Telegram Real*, clique em *Gerar Código*\n` +
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
    console.error('Erro no processamento do webhook do Telegram:', err);
  }
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

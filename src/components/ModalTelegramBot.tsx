import React, { useState, useEffect } from 'react';
import { CoupleSpace, UserProfile } from '../types';
import {
  gerarCodigoVinculacao,
  desvincularTelegram,
} from '../services/telegramBotService';

interface ModalTelegramBotProps {
  aberto: boolean;
  onFechar: () => void;
  couple: CoupleSpace | null;
  userProfile: UserProfile | null;
  onAtualizarCouple?: () => void;
}

export const ModalTelegramBot: React.FC<ModalTelegramBotProps> = ({
  aberto,
  onFechar,
  couple,
  userProfile,
  onAtualizarCouple,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'vinculacao' | 'comandos'>('vinculacao');

  // Códigos gerados
  const [codigoVinicius, setCodigoVinicius] = useState<string | null>(null);
  const [codigoSilvia, setCodigoSilvia] = useState<string | null>(null);

  const [copiado, setCopiado] = useState<string | null>(null);
  const [carregandoAcao, setCarregandoAcao] = useState(false);

  // Estado do Bot Real (Webhook & Token)
  const [botStatus, setBotStatus] = useState<{
    configured: boolean;
    username: string;
    botInfo?: { id: number; first_name: string; username: string };
    webhookInfo?: { url: string; has_custom_certificate: boolean; pending_update_count: number };
  } | null>(null);
  const [botTokenInput, setBotTokenInput] = useState('');
  const [salvandoWebhook, setSalvandoWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{ sucesso: boolean; msg: string } | null>(null);

  // Carregar status do bot ao abrir modal
  useEffect(() => {
    if (aberto) {
      fetch('/api/telegram/status')
        .then((res) => res.json())
        .then((data) => setBotStatus(data))
        .catch((err) => console.warn('Erro ao carregar status do Telegram:', err));
    }
  }, [aberto]);

  // Função para salvar token e registrar webhook
  const handleSalvarTokenEWebhook = async () => {
    if (!botTokenInput.trim()) return;
    setSalvandoWebhook(true);
    setWebhookFeedback(null);
    try {
      const resp = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botTokenInput.trim() }),
      });
      const data = await resp.json();
      if (data.success) {
        setWebhookFeedback({ sucesso: true, msg: data.message });
        setBotStatus((prev) => ({
          ...prev,
          configured: true,
          username: data.bot?.username || prev?.username || 'NosDoisFinancasBot',
          botInfo: data.bot,
        }));
        setBotTokenInput('');
      } else {
        setWebhookFeedback({ sucesso: false, msg: data.message || 'Erro ao conectar com o Telegram.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setWebhookFeedback({ sucesso: false, msg: `Erro de conexão: ${msg}` });
    } finally {
      setSalvandoWebhook(false);
    }
  };

  const p1Nome = couple?.partner1Name || 'Vinicius';
  const p2Nome = couple?.partner2Name || 'Silvia';

  const p1Pareado = couple?.telegramPairings
    ? Object.values(couple.telegramPairings).find((p) => p.role === 'partner1')
    : null;

  const p2Pareado = couple?.telegramPairings
    ? Object.values(couple.telegramPairings).find((p) => p.role === 'partner2')
    : null;

  // Gerar código para Parceiro 1
  const handleGerarCodigoP1 = async () => {
    if (!couple || !userProfile) return;
    setCarregandoAcao(true);
    try {
      const p1User: UserProfile = {
        uid: couple.partner1Uid,
        email: couple.partner1Email || '',
        displayName: p1Nome,
      };
      const cod = await gerarCodigoVinculacao(p1User, couple, 'partner1');
      setCodigoVinicius(cod.code);
    } catch (e) {
      console.error('Erro ao gerar código:', e);
    } finally {
      setCarregandoAcao(false);
    }
  };

  // Gerar código para Parceiro 2
  const handleGerarCodigoP2 = async () => {
    if (!couple || !userProfile) return;
    setCarregandoAcao(true);
    try {
      const p2User: UserProfile = {
        uid: couple.partner2Uid || 'partner2-uid',
        email: couple.partner2Email || '',
        displayName: p2Nome,
      };
      const cod = await gerarCodigoVinculacao(p2User, couple, 'partner2');
      setCodigoSilvia(cod.code);
    } catch (e) {
      console.error('Erro ao gerar código:', e);
    } finally {
      setCarregandoAcao(false);
    }
  };

  const handleCopiar = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(label);
    setTimeout(() => setCopiado(null), 2500);
  };

  const handleDesvincular = async (role: 'partner1' | 'partner2') => {
    if (!couple) return;
    const info = role === 'partner1' ? p1Pareado : p2Pareado;
    if (!info) return;

    if (confirm(`Deseja realmente desvincular o Telegram de ${info.displayName}?`)) {
      setCarregandoAcao(true);
      try {
        await desvincularTelegram(
          info.uid,
          couple.id,
          Object.keys(couple.telegramPairings || {}).find((k) => couple.telegramPairings?.[k]?.role === role)
        );
        if (onAtualizarCouple) onAtualizarCouple();
      } catch (e) {
        console.error('Erro ao desvincular:', e);
      } finally {
        setCarregandoAcao(false);
      }
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-[#161f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#131b28]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shadow-xs shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-2.02 1.28-5.71 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.5.98-.75 3.86-1.68 6.43-2.79 7.73-3.33 3.67-1.53 4.44-1.8 4.93-1.81.11 0 .35.03.51.16.13.11.17.26.19.37-.01.07.01.23 0 .35z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Bot do Telegram
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30">
                  Integração Oficial
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Conecte seu Telegram para registrar despesas por mensagem de áudio ou texto
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-[#131b28]/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAbaAtiva('vinculacao')}
            className={`px-4 py-2 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
              abaAtiva === 'vinculacao'
                ? 'border-[#229ED9] text-[#229ED9] font-bold bg-white dark:bg-[#161f2e]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            <span>Conectar Contas & Webhook</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('comandos')}
            className={`px-4 py-2 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
              abaAtiva === 'comandos'
                ? 'border-[#229ED9] text-[#229ED9] font-bold bg-white dark:bg-[#161f2e]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Comandos & Exemplos</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs sm:text-sm">
          {/* ABA 1: VINCULAÇÃO E CONEXÃO */}
          {abaAtiva === 'vinculacao' && (
            <div className="flex flex-col gap-5">
              {/* BANNER 1: Resposta explicativa */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 dark:text-blue-200 text-sm sm:text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#229ED9]">smart_toy</span>
                    Como conectar o Bot no Telegram Real?
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#229ED9]/15 text-[#229ED9]">
                    {botStatus?.configured ? '🟢 Bot Conectado' : '🟡 Configuração Inicial'}
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong>Para você e a Silvia no Telegram: basta mandar o código!</strong> Não é preciso digitar nada além do comando ou clicar no botão direto. O bot identifica você individualmente e vincula ao cofre compartilhado do casal.
                </p>

                {/* 3 Passos Claros */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-1">
                    <span className="font-bold text-[#0051d5] flex items-center gap-1">
                      <span>1️⃣ Criar Bot</span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                      No Telegram, abra <strong>@BotFather</strong>, envie <code>/newbot</code> e copie o <strong>Token HTTP API</strong>.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-1">
                    <span className="font-bold text-[#229ED9] flex items-center gap-1">
                      <span>2️⃣ Ativar Webhook</span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Cole o token no formulário abaixo e clique em ativar com 1 clique (para o Telegram responder).
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-1">
                    <span className="font-bold text-[#006948] dark:text-emerald-400 flex items-center gap-1">
                      <span>3️⃣ Enviar o Código!</span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Gere o código abaixo e mande <code>/vincular CODIGO</code> para o seu bot (ou clique em Abrir).
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD DE CONFIGURAÇÃO DO BOT & WEBHOOK */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[#229ED9]">key</span>
                      Token do Telegram Bot (@BotFather)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {botStatus?.configured
                        ? `Bot configurado: @${botStatus.username} (Webhook online)`
                        : 'Cole o token gerado pelo @BotFather para ativar o bot no servidor'}
                    </p>
                  </div>

                  {botStatus?.configured && (
                    <a
                      href={`https://t.me/${botStatus.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#229ED9] hover:bg-[#1a80b0] text-white text-xs font-bold transition-all shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span>Conversar com @{botStatus.username}</span>
                    </a>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="password"
                    value={botTokenInput}
                    onChange={(e) => setBotTokenInput(e.target.value)}
                    placeholder={botStatus?.configured ? 'Token ativo (cole um novo para atualizar)...' : 'Ex: 7123456789:AAFlmQk...'}
                    className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#229ED9]"
                  />
                  <button
                    type="button"
                    onClick={handleSalvarTokenEWebhook}
                    disabled={salvandoWebhook || !botTokenInput.trim()}
                    className="h-10 px-4 rounded-xl bg-[#0051d5] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {salvandoWebhook ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                    )}
                    <span>{salvandoWebhook ? 'Conectando...' : 'Ativar Webhook'}</span>
                  </button>
                </div>

                {webhookFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      webhookFeedback.sucesso
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {webhookFeedback.sucesso ? 'check_circle' : 'error'}
                    </span>
                    <span>{webhookFeedback.msg}</span>
                  </div>
                )}
              </div>

              {/* CARDS INDIVIDUAIS DE VINCULAÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card Vinicius (Parceiro 1) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#0051d5]"></span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {p1Nome} (Parceiro 1)
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          p1Pareado
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {p1Pareado ? 'Conectado' : 'Aguardando Vinculação'}
                      </span>
                    </div>

                    {p1Pareado ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div>Telegram: <strong>@{p1Pareado.username || p1Pareado.displayName}</strong></div>
                        <div className="text-[11px] text-slate-500">Conectado em: {new Date(p1Pareado.linkedAt).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Gere um código de 15 minutos para conectar o Telegram de {p1Nome}.
                      </p>
                    )}

                    {codigoVinicius && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col gap-2.5">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                          Código de Vinculação:
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-wider">
                            {codigoVinicius}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar(codigoVinicius, 'p1')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                          >
                            {copiado === 'p1' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Envie <code>/vincular {codigoVinicius}</code> para o bot no Telegram.
                        </span>

                        {/* Botão de 1 clique para abrir no Telegram */}
                        <a
                          href={`https://t.me/${botStatus?.username || 'NosDoisFinancasBot'}?start=${codigoVinicius}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-[#229ED9] hover:bg-[#1a80b0] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Abrir no Telegram (Vincular Direto)</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {p1Pareado ? (
                      <button
                        type="button"
                        onClick={() => handleDesvincular('partner1')}
                        className="px-3 py-2 rounded-xl border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs cursor-pointer"
                      >
                        Desvincular
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={carregandoAcao}
                        onClick={handleGerarCodigoP1}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#0051d5] hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Gerar Código para {p1Nome}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Silvia (Parceiro 2) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#712ae2]"></span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {p2Nome} (Parceiro 2)
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          p2Pareado
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {p2Pareado ? 'Conectado' : 'Aguardando Vinculação'}
                      </span>
                    </div>

                    {p2Pareado ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div>Telegram: <strong>@{p2Pareado.username || p2Pareado.displayName}</strong></div>
                        <div className="text-[11px] text-slate-500">Conectado em: {new Date(p2Pareado.linkedAt).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Gere um código de 15 minutos para conectar o Telegram de {p2Nome}.
                      </p>
                    )}

                    {codigoSilvia && (
                      <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 flex flex-col gap-2.5">
                        <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase">
                          Código de Vinculação:
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-2xl font-black text-purple-700 dark:text-purple-300 tracking-wider">
                            {codigoSilvia}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar(codigoSilvia, 'p2')}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                          >
                            {copiado === 'p2' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Envie <code>/vincular {codigoSilvia}</code> para o bot no Telegram.
                        </span>

                        {/* Botão de 1 clique para abrir no Telegram */}
                        <a
                          href={`https://t.me/${botStatus?.username || 'NosDoisFinancasBot'}?start=${codigoSilvia}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-[#229ED9] hover:bg-[#1a80b0] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Abrir no Telegram (Vincular Direto)</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {p2Pareado ? (
                      <button
                        type="button"
                        onClick={() => handleDesvincular('partner2')}
                        className="px-3 py-2 rounded-xl border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs cursor-pointer"
                      >
                        Desvincular
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={carregandoAcao}
                        onClick={handleGerarCodigoP2}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#712ae2] hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Gerar Código para {p2Nome}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações Técnicas de Configuração do Webhook */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
                  Configuração de Webhook do Telegram
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Para utilizar seu próprio bot no Telegram via BotFather:
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                  Endpoint de Webhook: <strong>/api/telegram/webhook</strong>
                </div>
                <span className="text-[11px] text-slate-500">
                  Variáveis de ambiente requeridas: <code>TELEGRAM_BOT_TOKEN</code> e <code>TELEGRAM_BOT_USERNAME</code>.
                </span>
              </div>
            </div>
          )}

          {/* ABA 2: COMANDOS & EXEMPLOS */}
          {abaAtiva === 'comandos' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                  <span className="font-mono font-bold text-[#229ED9]">/start</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Inicia a conversa com o bot e orienta sobre o uso ou vincula via link direto.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                  <span className="font-mono font-bold text-[#229ED9]">/ajuda</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Apresenta exemplos completos de compras compartilhadas, individuais e parceladas.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                  <span className="font-mono font-bold text-[#229ED9]">/status</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Informa a situação da vinculação das contas do casal e quem está ativo.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                  <span className="font-mono font-bold text-[#229ED9]">/cancelar</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Descarta imediatamente qualquer lançamento pendente que esteja aguardando confirmação.
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex flex-col gap-2">
                <span className="font-bold text-[#006948] dark:text-emerald-300 text-xs sm:text-sm">
                  💡 Exemplos de Frases Naturais Suportadas:
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-1">
                  <li><code>"Mercado 350 reais, eu paguei, meio a meio."</code> (Divide 50/50 e credita ao pagador)</li>
                  <li><code>"Comprei maquiagem por 120 reais, despesa individual."</code> (Guarda no cofre privado sem rateio)</li>
                  <li><code>"Silvia comprou remédios por 85 reais, gasto individual dela."</code> (Identifica o responsável e pagador)</li>
                  <li><code>"Jantar de 200 reais, eu paguei, 60% meu e 40% do Vinicius."</code> (Calcula percentuais exatos)</li>
                  <li><code>"Assinatura Spotify 34,90 mensal eu paguei 50/50"</code> (Marca como recorrente para repetir)</li>
                  <li><code>"Geladeira 10x de 350 reais no cartão de Vinicius compartilhado"</code> (Registra parcelas ativas)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer com botão de fechar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131b28] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            NósDois Finanças • Integração Oficial Telegram
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

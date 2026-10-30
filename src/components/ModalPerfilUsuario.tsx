import React, { useState, useEffect } from 'react';
import { CoupleSpace, UserProfile } from '../types';
import { atualizarFotoPerfil } from '../services/firebaseService';

interface ModalPerfilUsuarioProps {
  aberto: boolean;
  onFechar: () => void;
  user: UserProfile;
  couple?: CoupleSpace | null;
  onPerfilAtualizado: () => Promise<void> | void;
  onAbrirTelegram?: () => void;
}

export const ModalPerfilUsuario: React.FC<ModalPerfilUsuarioProps> = ({
  aberto,
  onFechar,
  user,
  couple,
  onPerfilAtualizado,
  onAbrirTelegram,
}) => {
  const [nome, setNome] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [salvando, setSalvando] = useState(false);
  const [statusImagem, setStatusImagem] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    if (aberto && user) {
      setNome(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setStatusImagem(user.photoURL ? 'idle' : 'idle');
      setFeedback(null);
    }
  }, [aberto, user]);

  useEffect(() => {
    const urlLimpa = photoURL.trim();
    if (!urlLimpa) {
      setStatusImagem('idle');
      return;
    }
    setStatusImagem('loading');
  }, [photoURL]);

  if (!aberto) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFeedback({ tipo: 'erro', texto: 'Informe seu nome de exibição.' });
      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      await atualizarFotoPerfil(user.uid, photoURL.trim(), nome.trim(), couple?.id);
      await onPerfilAtualizado();
      setFeedback({ tipo: 'sucesso', texto: 'Perfil e foto atualizados com sucesso!' });
      setTimeout(() => {
        onFechar();
      }, 1200);
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setFeedback({
        tipo: 'erro',
        texto: 'Não foi possível salvar o perfil. Verifique sua conexão e tente novamente.',
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleLimparFoto = () => {
    setPhotoURL('');
    setStatusImagem('idle');
  };

  const urlLimpa = photoURL.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#161f2e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#006948] dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Meu Perfil & Foto</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure seu nome e sua foto de perfil via CDN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSalvar} className="p-6 flex flex-col gap-5 text-xs">
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[#006948] dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {feedback.tipo === 'sucesso' ? 'check_circle' : 'error'}
              </span>
              <span>{feedback.texto}</span>
            </div>
          )}

          {/* Avatar Preview Section */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {urlLimpa ? (
                  <img
                    src={urlLimpa}
                    alt={nome || 'Prévia do perfil'}
                    className="w-full h-full object-cover"
                    onLoad={() => setStatusImagem('success')}
                    onError={() => setStatusImagem('error')}
                  />
                ) : (
                  <div className="w-full h-full bg-[#006948] text-white flex items-center justify-center font-bold text-3xl uppercase">
                    {(nome.trim().charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {urlLimpa && statusImagem === 'success' && (
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm"
                  title="Imagem carregada com sucesso da sua CDN!"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              )}
              {urlLimpa && statusImagem === 'error' && (
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm"
                  title="Erro ao carregar a imagem do link"
                >
                  <span className="material-symbols-outlined text-[16px]">priority_high</span>
                </div>
              )}
            </div>

            {/* Status Text */}
            <div className="mt-2 text-center">
              {urlLimpa ? (
                statusImagem === 'success' ? (
                  <span className="text-[11px] font-semibold text-[#006948] dark:text-emerald-400 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006948] dark:bg-emerald-400"></span>
                    Imagem da CDN validada e pronta
                  </span>
                ) : statusImagem === 'error' ? (
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    Link inacessível ou inválido na CDN
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Testando link da imagem...</span>
                )
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Nenhuma imagem atribuída (usando avatar padrão com inicial)
                </span>
              )}
            </div>
          </div>

          {/* Input CDN Image Link */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="perfil-foto-url" className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">link</span>
                <span>Link da Imagem de Perfil (CDN)</span>
              </label>
              {urlLimpa && (
                <button
                  type="button"
                  onClick={handleLimparFoto}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Remover Foto
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                id="perfil-foto-url"
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://sua-cdn.com/fotos/minha-foto.png"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006948]/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Como você tem uma CDN, basta subir sua imagem para ela e colar o link direto aqui. O app exibirá sua foto no cabeçalho e nos espaços do casal.
            </p>
          </div>

          {/* Input Display Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="perfil-nome" className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#006948] dark:text-emerald-400">badge</span>
              <span>Seu Nome de Exibição</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              id="perfil-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
              required
            />
          </div>

          {/* Seção Conectar Telegram no Perfil */}
          {onAbrirTelegram && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#229ED9]/10 via-[#229ED9]/5 to-transparent border border-[#229ED9]/30 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-2.02 1.28-5.71 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.5.98-.75 3.86-1.68 6.43-2.79 7.73-3.33 3.67-1.53 4.44-1.8 4.93-1.81.11 0 .35.03.51.16.13.11.17.26.19.37-.01.07.01.23 0 .35z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        Bot do Telegram
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          user.telegramUserId
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-[#229ED9]/15 text-[#229ED9]'
                        }`}
                      >
                        {user.telegramUserId ? 'Conectado' : 'Disponível'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {user.telegramUserId
                        ? `Vinculado como @${user.telegramUsername || user.displayName}`
                        : 'Registre despesas rapidamente enviando mensagens no Telegram'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onFechar();
                    onAbrirTelegram();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1a80b0] text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {user.telegramUserId ? 'settings' : 'link'}
                  </span>
                  <span>{user.telegramUserId ? 'Gerenciar' : 'Conectar'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Email Info (read-only) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">E-mail da conta:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{user.email}</span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {salvando ? 'sync' : 'check'}
              </span>
              <span>{salvando ? 'Salvando...' : 'Salvar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CoupleSpace, UserProfile } from '../types';
import { atualizarFotoPerfil } from '../services/firebaseService';

interface ModalPerfilUsuarioProps {
  aberto: boolean;
  onFechar: () => void;
  user: UserProfile;
  couple?: CoupleSpace | null;
  onPerfilAtualizado: () => Promise<void> | void;
}

export const ModalPerfilUsuario: React.FC<ModalPerfilUsuarioProps> = ({
  aberto,
  onFechar,
  user,
  couple,
  onPerfilAtualizado,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006948] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Meu Perfil & Foto</h3>
              <p className="text-[11px] text-slate-500">Configure seu nome e sua foto de perfil via CDN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
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
                  ? 'bg-emerald-50 border-emerald-200 text-[#006948]'
                  : 'bg-red-50 border-red-200 text-red-700'
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
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center">
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
                  className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  title="Imagem carregada com sucesso da sua CDN!"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              )}
              {urlLimpa && statusImagem === 'error' && (
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm"
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
                  <span className="text-[11px] font-semibold text-[#006948] flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006948]"></span>
                    Imagem da CDN validada e pronta
                  </span>
                ) : statusImagem === 'error' ? (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    Link inacessível ou inválido na CDN
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Testando link da imagem...</span>
                )
              ) : (
                <span className="text-[11px] text-slate-400">
                  Nenhuma imagem atribuída (usando avatar padrão com inicial)
                </span>
              )}
            </div>
          </div>

          {/* Input CDN Image Link */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="perfil-foto-url" className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#006948]">link</span>
                <span>Link da Imagem de Perfil (CDN)</span>
              </label>
              {urlLimpa && (
                <button
                  type="button"
                  onClick={handleLimparFoto}
                  className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
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
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Como você tem uma CDN, basta subir sua imagem para ela e colar o link direto aqui. O app exibirá sua foto no cabeçalho e nos espaços do casal.
            </p>
          </div>

          {/* Input Display Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="perfil-nome" className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#006948]">badge</span>
              <span>Seu Nome de Exibição</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              id="perfil-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
              required
            />
          </div>

          {/* Email Info (read-only) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">E-mail da conta:</span>
            <span className="font-semibold text-slate-700 truncate max-w-[200px]">{user.email}</span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
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

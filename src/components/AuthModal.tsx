import React, { useState } from 'react';
import { UsuarioId } from '../types';
import { signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthModalProps {
  aberto: boolean;
  onFechar: () => void;
  usuarioAtual: UsuarioId;
  onTrocarUsuario: (novoUsuario: UsuarioId) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  aberto,
  onFechar,
  usuarioAtual,
  onTrocarUsuario,
}) => {
  const [modo, setModo] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(
    usuarioAtual === 'Vinicius' ? 'vinicius.731654@gmail.com' : 'silvia@email.com'
  );
  const [senha, setSenha] = useState('••••••••••••');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [codigoCasal, setCodigoCasal] = useState('AMOR-2025');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  if (!aberto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSucessoMsg(`Autenticado com sucesso no espaço do casal (${email})!`);
    setTimeout(() => {
      setSucessoMsg(null);
      onFechar();
    }, 1200);
  };

  const handleSimularGoogle = () => {
    setSucessoMsg('Conexão Firebase Auth via Google validada com sucesso.');
    setTimeout(() => {
      setSucessoMsg(null);
      onFechar();
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/80 flex flex-col items-center text-center relative">
          <button
            onClick={onFechar}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="w-12 h-12 rounded-full bg-[#006948] text-white flex items-center justify-center shadow-md mb-2.5">
            <span className="material-symbols-outlined text-[24px]">favorite</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-[#006948] text-[11px] font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
            <span>Finanças em Harmonia</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900">NósDois Finanças</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-0.5">
            Acesse sua conta do casal e mantenha a clareza financeira a dois com serenidade e parceria.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Alternância Rápida para Testes Locais */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-[#0051d5] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">people</span>
              <span>Alternar Usuário Local Ativo (Para Testes da Mentoria)</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onTrocarUsuario('Vinicius');
                  setEmail('vinicius.731654@gmail.com');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  usuarioAtual === 'Vinicius'
                    ? 'bg-[#0051d5] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-blue-100'
                }`}
              >
                <span>Vinicius (Você)</span>
                {usuarioAtual === 'Vinicius' && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  onTrocarUsuario('Silvia');
                  setEmail('silvia@email.com');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  usuarioAtual === 'Silvia'
                    ? 'bg-[#712ae2] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-purple-100'
                }`}
              >
                <span>Silvia (Parceira)</span>
                {usuarioAtual === 'Silvia' && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="p-1 bg-slate-100 rounded-xl flex">
            <button
              type="button"
              onClick={() => setModo('login')}
              className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'login' ? 'bg-white text-[#006948] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">login</span>
              <span>Entrar na Conta</span>
            </button>
            <button
              type="button"
              onClick={() => setModo('signup')}
              className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'signup' ? 'bg-white text-[#006948] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">group_add</span>
              <span>Criar Conta do Casal</span>
            </button>
          </div>

          {sucessoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#006948] text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{sucessoMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
            {modo === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Código de Parceria (Opcional)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                    link
                  </span>
                  <input
                    type="text"
                    value={codigoCasal}
                    onChange={(e) => setCodigoCasal(e.target.value)}
                    placeholder="Ex: AMOR-2025 ou deixe vazio"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-400">
                  Insira o código compartilhado pelo seu amor ou crie um espaço do zero.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700">E-mail</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Senha</label>
                <button
                  type="button"
                  onClick={() => alert('Instruções de recuperação foram enviadas ao seu e-mail.')}
                  className="text-[#006948] hover:underline text-[11px] cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                  lock
                </span>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {mostrarSenha ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 mt-1 rounded-xl bg-[#006948] hover:bg-[#005137] text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>{modo === 'login' ? 'Entrar no NósDois' : 'Criar Espaço do Casal'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-1 text-slate-400 text-[11px]">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="px-3">ou continue com</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={() => signInWithRedirect(auth, googleProvider)}
            className="w-full h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Entrar com Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
